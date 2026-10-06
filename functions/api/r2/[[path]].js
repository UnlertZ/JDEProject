/**
 * functions/api/r2/[[path]].js — Cloudflare Pages Functions for R2 Storage Management & Retention
 */

function parseBase64Image(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1];
  const base64Data = match[2];
  try {
    const binaryStr = atob(base64Data);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return { mimeType, buffer: bytes.buffer };
  } catch (e) {
    console.error('parseBase64Image decode error:', e);
    return null;
  }
}

function getYearMonthFromDate(dateInput) {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth() + 1;

  if (dateInput) {
    if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
      y = dateInput.getFullYear();
      m = dateInput.getMonth() + 1;
    } else if (typeof dateInput === 'string') {
      const s = dateInput.trim();
      if (/^(\d{4})-(\d{2})/.test(s)) {
        const match = s.match(/^(\d{4})-(\d{2})/);
        y = parseInt(match[1], 10);
        m = parseInt(match[2], 10);
      } else if (/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.test(s)) {
        const match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        m = parseInt(match[2], 10);
        y = parseInt(match[3], 10);
      } else if (/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/.test(s)) {
        const match = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
        y = parseInt(match[1], 10);
        m = parseInt(match[2], 10);
      }
    }
  }

  return {
    year: String(y),
    month: String(m).padStart(2, '0')
  };
}

async function saveImageToR2(env, imageInput, subFolder, tankId, dateInput) {
  if (!imageInput || typeof imageInput !== 'string') return imageInput || null;
  const trimmed = imageInput.trim();
  if (!trimmed || trimmed === '-' || trimmed === '—') return null;
  if (!trimmed.startsWith('data:')) return trimmed;
  if (!env.R2) return trimmed;

  const parsed = parseBase64Image(trimmed);
  if (!parsed) return trimmed;

  const { year, month } = getYearMonthFromDate(dateInput);

  let ext = 'jpg';
  if (parsed.mimeType.includes('png')) ext = 'png';
  else if (parsed.mimeType.includes('webp')) ext = 'webp';

  const safeTank = String(tankId || 'TANK').replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = Date.now();
  const key = `${year}/${month}/${subFolder}/${safeTank}_${timestamp}.${ext}`;

  await env.R2.put(key, parsed.buffer, {
    httpMetadata: {
      contentType: parsed.mimeType,
      cacheControl: 'public, max-age=31536000, immutable'
    }
  });

  return `/r2/${key}`;
}

function getRetentionYears() {
  const curYear = new Date().getFullYear();
  const minKeepYear = curYear - 2;
  const keepYears = [];
  for (let y = minKeepYear; y <= curYear; y++) {
    keepYears.push(y);
  }
  return { curYear, minKeepYear, keepYears, deleteBeforeYear: minKeepYear };
}

async function purgeExpiredRetention(env) {
  const { minKeepYear, curYear, keepYears, deleteBeforeYear } = getRetentionYears();
  const result = {
    curYear,
    minKeepYear,
    keepYears,
    deleteBeforeYear,
    deletedSnapshotsD1: 0,
    deletedR2Objects: 0,
    details: []
  };

  if (env.DB) {
    try {
      const d1Res = await env.DB.prepare(`
        DELETE FROM monthly_snapshots 
        WHERE CAST(substr(month_key, 1, 4) AS INTEGER) < ?
      `).bind(minKeepYear).run();
      result.deletedSnapshotsD1 = d1Res.meta?.changes || 0;
      result.details.push(`D1: ลบประวัติรอบเดือนเก่า (< ${minKeepYear}) ออกจำนวน ${result.deletedSnapshotsD1} รายการ`);
    } catch (e) {
      result.details.push(`D1 Error: ${e.message}`);
    }
  }

  if (env.R2) {
    try {
      let cursor = undefined;
      let totalDeleted = 0;
      do {
        const list = await env.R2.list({ cursor, limit: 500 });
        const toDeleteKeys = [];
        for (const obj of list.objects) {
          const parts = obj.key.split('/');
          const yearNum = parseInt(parts[0], 10);
          if (!isNaN(yearNum) && yearNum < minKeepYear) {
            toDeleteKeys.push(obj.key);
          }
        }
        if (toDeleteKeys.length > 0) {
          await env.R2.delete(toDeleteKeys);
          totalDeleted += toDeleteKeys.length;
        }
        cursor = list.truncated ? list.cursor : undefined;
      } while (cursor);
      result.deletedR2Objects = totalDeleted;
      result.details.push(`R2: ลบไฟล์รูปภาพเก่า (< ${minKeepYear}) ออกจาก Bucket 'r2jde' จำนวน ${totalDeleted} ไฟล์`);
    } catch (e) {
      result.details.push(`R2 Error: ${e.message}`);
    }
  }

  return result;
}

async function migrateImagesToR2(env) {
  const { minKeepYear } = getRetentionYears();
  const summary = {
    success: true,
    tanksMigrated: 0,
    snapshotsMigrated: 0,
    totalImagesUploaded: 0,
    deletedOldSnapshotsD1: 0,
    deletedOldR2Objects: 0,
    details: []
  };

  const purgeRes = await purgeExpiredRetention(env);
  summary.deletedOldSnapshotsD1 = purgeRes.deletedSnapshotsD1;
  summary.deletedOldR2Objects = purgeRes.deletedR2Objects;
  summary.details.push(...purgeRes.details);

  if (!env.R2) {
    summary.details.push('คำเตือน: ไม่พบ Binding R2 ใน Pages runtime');
    return summary;
  }

  if (env.DB) {
    const tanksQ = await env.DB.prepare('SELECT fire_tank, pic_tank, pic_area, lastcheck FROM tanks').all().catch(() => ({ results: [] }));
    for (const t of tanksQ.results || []) {
      let updatedPicTank = t.pic_tank;
      let updatedPicArea = t.pic_area;
      let changed = false;

      if (t.pic_tank && typeof t.pic_tank === 'string' && t.pic_tank.startsWith('data:')) {
        updatedPicTank = await saveImageToR2(env, t.pic_tank, 'tanks', t.fire_tank, t.lastcheck);
        changed = true;
        summary.totalImagesUploaded++;
      }
      if (t.pic_area && typeof t.pic_area === 'string' && t.pic_area.startsWith('data:')) {
        updatedPicArea = await saveImageToR2(env, t.pic_area, 'areas', t.fire_tank, t.lastcheck);
        changed = true;
        summary.totalImagesUploaded++;
      }
      if (changed) {
        await env.DB.prepare('UPDATE tanks SET pic_tank = ?, pic_area = ? WHERE fire_tank = ?').bind(updatedPicTank, updatedPicArea, t.fire_tank).run();
        summary.tanksMigrated++;
      }
    }
    summary.details.push(`ตารางถังปัจจุบัน (tanks): ย้ายรูปภาพ Base64 ไปยัง R2 สำเร็จ ${summary.tanksMigrated} รายการ`);

    const snapQ = await env.DB.prepare('SELECT id, month_key, snapshot_data FROM monthly_snapshots WHERE CAST(substr(month_key, 1, 4) AS INTEGER) >= ?').bind(minKeepYear).all().catch(() => ({ results: [] }));
    for (const snap of snapQ.results || []) {
      try {
        const list = JSON.parse(snap.snapshot_data);
        if (!Array.isArray(list)) continue;
        let snapChanged = false;
        for (const item of list) {
          const tankId = item.FireTank || 'TANK';
          if (item.PicTank && typeof item.PicTank === 'string' && item.PicTank.startsWith('data:')) {
            item.PicTank = await saveImageToR2(env, item.PicTank, 'tanks', tankId, snap.month_key);
            snapChanged = true;
            summary.totalImagesUploaded++;
          }
          if (item.PicArea && typeof item.PicArea === 'string' && item.PicArea.startsWith('data:')) {
            item.PicArea = await saveImageToR2(env, item.PicArea, 'areas', tankId, snap.month_key);
            snapChanged = true;
            summary.totalImagesUploaded++;
          }
        }
        if (snapChanged) {
          await env.DB.prepare('UPDATE monthly_snapshots SET snapshot_data = ? WHERE id = ?').bind(JSON.stringify(list), snap.id).run();
          summary.snapshotsMigrated++;
        }
      } catch (e) {}
    }
    summary.details.push(`ประวัติรอบเดือน (monthly_snapshots): ย้ายรูปภาพ Base64 ไปยัง R2 สำเร็จ ${summary.snapshotsMigrated} รอบเดือน`);
  }

  return summary;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const pathParts = params.path;
  const subPath = Array.isArray(pathParts) ? pathParts.join('/') : String(pathParts || '');
  const method = request.method.toUpperCase();

  // GET /api/r2/status
  if (subPath === 'status' && method === 'GET') {
    const { curYear, minKeepYear, keepYears, deleteBeforeYear } = getRetentionYears();
    let r2ObjectCount = 0;
    let r2Available = Boolean(env.R2);
    if (env.R2) {
      try {
        const list = await env.R2.list({ limit: 1000 });
        r2ObjectCount = list.objects.length;
      } catch (e) {}
    }

    let base64TanksCount = 0;
    let r2TanksCount = 0;
    if (env.DB) {
      const countQ = await env.DB.prepare(`
        SELECT 
          SUM(CASE WHEN pic_tank LIKE 'data:%' OR pic_area LIKE 'data:%' THEN 1 ELSE 0 END) as base64_count,
          SUM(CASE WHEN pic_tank LIKE '/r2/%' OR pic_area LIKE '/r2/%' THEN 1 ELSE 0 END) as r2_count
        FROM tanks
      `).first().catch(() => null);
      if (countQ) {
        base64TanksCount = countQ.base64_count || 0;
        r2TanksCount = countQ.r2_count || 0;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      bucket: 'r2jde',
      r2Available,
      retention: {
        curYear,
        minKeepYear,
        keepYears,
        deleteBeforeYear,
        rule: `เก็บข้อมูลปีปัจจุบัน (${curYear}) และย้อนหลัง 2 ปี (${keepYears.join(', ')}) ลบปีก่อนหน้า (${deleteBeforeYear - 1} และเก่ากว่า) ทั้ง D1 และ R2`
      },
      stats: {
        liveTanksWithBase64: base64TanksCount,
        liveTanksWithR2: r2TanksCount,
        r2ObjectsSample: r2ObjectCount
      }
    }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }

  // POST /api/r2/migrate
  if (subPath === 'migrate' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const permit = parseInt(body.requestorPermitDo || '0', 10);
    if (permit < 3) {
      return new Response(JSON.stringify({ success: false, message: 'เฉพาะผู้ดูแลระบบระดับ Super Admin (P3) เท่านั้น' }), { status: 403 });
    }
    const migrationResult = await migrateImagesToR2(env);
    return new Response(JSON.stringify(migrationResult), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  // POST /api/r2/cleanup or /api/r2/retention
  if ((subPath === 'cleanup' || subPath === 'retention') && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const permit = parseInt(body.requestorPermitDo || '0', 10);
    if (permit < 3) {
      return new Response(JSON.stringify({ success: false, message: 'เฉพาะผู้ดูแลระบบระดับ Super Admin (P3) เท่านั้น' }), { status: 403 });
    }
    const cleanupResult = await purgeExpiredRetention(env);
    return new Response(JSON.stringify({ success: true, ...cleanupResult }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  return new Response(JSON.stringify({ success: false, message: 'Route not found: /api/r2/' + subPath }), { status: 404 });
}
