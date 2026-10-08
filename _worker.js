/**
 * _worker.js — Universal Gateway สำหรับ Cloudflare Workers & Pages
 * Self-contained 100% — อ้างอิงและดึงข้อมูลจาก Cloudflare D1 ล้วนๆ (100% Database Driven)
 */

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function getDaysSinceCheck(lastcheckVal) {
  if (!lastcheckVal) return null;
  const s = String(lastcheckVal).trim();
  if (!s) return null;

  let checkDate = null;
  if (/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.test(s)) {
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
    if (m) {
      const d = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const y = parseInt(m[3], 10);
      const h = m[4] ? parseInt(m[4], 10) : 0;
      const mi = m[5] ? parseInt(m[5], 10) : 0;
      checkDate = new Date(y, mo, d, h, mi);
    }
  } else if (/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/.test(s)) {
    const m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const d = parseInt(m[3], 10);
      const h = m[4] ? parseInt(m[4], 10) : 0;
      const mi = m[5] ? parseInt(m[5], 10) : 0;
      checkDate = new Date(y, mo, d, h, mi);
    }
  }

  if (!checkDate || isNaN(checkDate.getTime())) return null;

  const now = new Date();
  const diffMs = now.getTime() - checkDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Helper: ตรวจสอบว่าได้รับการตรวจในรอบเดือนปัจจุบันหรือไม่ (เช็คทุกต้นเดือนใหม่)
function isCheckedInCurrentMonth(lastcheckVal) {
  if (!lastcheckVal) return false;
  const s = String(lastcheckVal).trim();
  if (!s || s === '-' || s === '—') return false;

  let checkYear = null;
  let checkMonth = null;

  if (/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.test(s)) {
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) {
      checkMonth = parseInt(m[2], 10);
      checkYear = parseInt(m[3], 10);
    }
  } else if (/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/.test(s)) {
    const m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (m) {
      checkYear = parseInt(m[1], 10);
      checkMonth = parseInt(m[2], 10);
    }
  }

  if (!checkYear || !checkMonth) return false;

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  return (checkYear === curYear && checkMonth === curMonth);
}

function formatTankResponse(row) {
  if (!row) return {};

  // Case-insensitive & symbol-agnostic lookup helper เพื่อรองรับชื่อคอลัมน์ทุกรูปแบบใน D1
  const get = (key) => {
    if (row[key] !== undefined && row[key] !== null) return row[key];
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const k of Object.keys(row)) {
      if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanKey) {
        if (row[k] !== undefined && row[k] !== null) return row[k];
      }
    }
    return '';
  };

  const fireTank = get('fire_tank') || get('FireTank') || get('firetank') || '';
  const lastcheck = get('lastcheck') || get('Lastcheck') || '';
  let tankCheck = get('tankcheck') || get('Tankcheck') || 'ยังไม่เช็ค';

  // กฎรอบเดือนใหม่: เช็คทุกต้นเดือนใหม่ (รีเซ็ตเป็นยังไม่เช็คหากไม่ได้ตรวจในเดือนปัจจุบัน)
  if (tankCheck === 'เช็คแล้ว') {
    if (!isCheckedInCurrentMonth(lastcheck)) {
      tankCheck = 'ยังไม่เช็ค';
    }
  }

  let readyOrNot = get('ready_or_not') || get('ReadyorNot') || 'Not Ready';
  const tankStatusVal = get('tank_status') ?? get('TankStatus');
  let tankStatus = (tankStatusVal !== '' && tankStatusVal !== undefined)
    ? Boolean(tankStatusVal)
    : (readyOrNot === 'Ready');

  // Requirement 2: เมื่อยังไม่ตรวจต้องขึ้นว่ายังไม่พร้อมใช้งาน
  if (tankCheck !== 'เช็คแล้ว') {
    readyOrNot = 'Not Ready';
    tankStatus = false;
  }

  let weightVal = get('weight') || get('Weight (lb)') || get('Weight');
  if (weightVal !== '' && weightVal !== null && !isNaN(weightVal)) {
    weightVal = parseFloat(weightVal);
  } else {
    weightVal = null;
  }

  return {
    FireTank: String(fireTank).trim(),
    Types: String(get('types') || get('Types') || ''),
    'Weight (lb)': weightVal,
    Area: String(get('area') || get('Area') || ''),
    Inuse: String(get('inuse') || get('Inuse') || ''),
    Lastcheck: lastcheck ? String(lastcheck) : '',
    Tankcheck: tankCheck,
    ReadyorNot: readyOrNot,
    TankStatus: tankStatus,
    Exptank: String(get('exptank') || get('Exptank') || ''),
    PicTank: get('pic_tank') || get('PicTank') || null,
    PicArea: get('pic_area') || get('PicArea') || null,
    Inspector: String(get('inspector') || get('Inspector') || ''),
    Responsible: String(get('responsible') || get('Responsible') || ''),
    Remark: String(get('remark') || get('Remark') || '')
  };
}

function formatTankForSnapshot(t, overrides = {}) {
  // ตัด base64 data URLs เพื่อป้องกันข้อผิดพลาด D1 SQLite SQLITE_TOOBIG (string or blob too big)
  let picTank = t.PicTank || '';
  let picArea = t.PicArea || '';
  if (typeof picTank === 'string' && picTank.startsWith('data:')) picTank = '';
  if (typeof picArea === 'string' && picArea.startsWith('data:')) picArea = '';

  return {
    Id: t.Id !== undefined ? t.Id : '',
    FireTank: String(t.FireTank || '').trim(),
    Types: String(t.Types || ''),
    'Weight (lb)': t['Weight (lb)'] !== undefined ? t['Weight (lb)'] : null,
    Area: String(t.Area || ''),
    Responsible: String(t.Responsible || ''),
    Inuse: t.Inuse ? String(t.Inuse) : '',
    Lastcheck: overrides.Lastcheck !== undefined ? overrides.Lastcheck : (t.Lastcheck ? String(t.Lastcheck) : ''),
    Tankcheck: overrides.Tankcheck !== undefined ? overrides.Tankcheck : (t.Tankcheck || 'ยังไม่เช็ค'),
    ReadyorNot: overrides.ReadyorNot !== undefined ? overrides.ReadyorNot : (t.ReadyorNot || 'Ready'),
    TankStatus: overrides.TankStatus !== undefined ? overrides.TankStatus : Boolean(t.TankStatus),
    Exptank: String(t.Exptank || ''),
    Inspector: overrides.Inspector !== undefined ? overrides.Inspector : String(t.Inspector || ''),
    Remark: overrides.Remark !== undefined ? overrides.Remark : String(t.Remark || ''),
    PicTank: picTank,
    PicArea: picArea
  };
}

let _dbInitialized = false;

async function ensureDatabase(db) {
  if (_dbInitialized || !db) return;
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT,
        rank TEXT DEFAULT 'P1',
        permit_do INTEGER DEFAULT 1,
        em_name TEXT
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS pending_users (
        username TEXT PRIMARY KEY,
        password TEXT,
        em_name TEXT,
        rank TEXT DEFAULT 'P1',
        permit_do INTEGER DEFAULT 1,
        registered_at TEXT
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS tanks (
        fire_tank TEXT PRIMARY KEY,
        types TEXT,
        weight REAL,
        area TEXT,
        inuse TEXT,
        lastcheck TEXT,
        tankcheck TEXT DEFAULT 'ยังไม่เช็ค',
        ready_or_not TEXT DEFAULT 'Not Ready',
        tank_status INTEGER DEFAULT 0,
        exptank TEXT,
        pic_tank TEXT,
        pic_area TEXT,
        inspector TEXT,
        responsible TEXT,
        remark TEXT
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS monthly_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month_key TEXT NOT NULL UNIQUE,
        month_label TEXT NOT NULL,
        total_tanks INTEGER DEFAULT 0,
        checked_tanks INTEGER DEFAULT 0,
        not_checked_tanks INTEGER DEFAULT 0,
        ready_tanks INTEGER DEFAULT 0,
        not_ready_tanks INTEGER DEFAULT 0,
        snapshot_data TEXT NOT NULL,
        archived_at TEXT NOT NULL,
        is_closed INTEGER DEFAULT 1
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS system_migrations (
        id TEXT PRIMARY KEY,
        executed_at TEXT
      )
    `).run();

    // Migration: เพิ่มข้อมูลย้อนหลัง 01/01/2026 ถึง 01/09/2026 ตรวจครบและพร้อมใช้งาน 100% (รันครั้งเดียว ไม่ทำซ้ำเมื่อลบ)
    const migCheck = await db.prepare("SELECT id FROM system_migrations WHERE id = 'seed_past_snapshots_2026_v2'").first().catch(() => null);
    if (!migCheck) {
      const tankQ = await db.prepare("SELECT * FROM tanks").all().catch(() => ({ results: [] }));
      const liveTanks = (tankQ.results || []).map(formatTankResponse);
      const total = liveTanks.length;
      if (total > 0) {
        for (let m = 1; m <= 9; m++) {
          const mStr = String(m).padStart(2, '0');
          const monthKey = `2026-${mStr}`;
          const thaiYear = 2026 + 543;
          const monthLabel = `${THAI_MONTHS[m - 1]} ${thaiYear}`;
          const checkDateStr = `01/${mStr}/2026`;
          const archDate = `2026-${mStr}-28 23:59:59`;

          const snapshotTanks = liveTanks.map(t => formatTankForSnapshot(t, {
            Tankcheck: 'เช็คแล้ว',
            ReadyorNot: 'Ready',
            TankStatus: true,
            Lastcheck: checkDateStr,
            Inspector: 'SHE'
          }));

          const snapJson = JSON.stringify(snapshotTanks);

          await db.prepare(`
            INSERT OR IGNORE INTO monthly_snapshots 
            (month_key, month_label, total_tanks, checked_tanks, not_checked_tanks, ready_tanks, not_ready_tanks, snapshot_data, archived_at, is_closed)
            VALUES (?, ?, ?, ?, 0, ?, 0, ?, ?, 1)
          `).bind(monthKey, monthLabel, total, total, total, snapJson, archDate).run().catch(console.error);
        }
      }
      await db.prepare("INSERT OR IGNORE INTO system_migrations (id, executed_at) VALUES ('seed_past_snapshots_2026_v2', datetime('now'))").run().catch(console.error);
    }

    _dbInitialized = true;
  } catch (err) {
    console.error('ensureDatabase error:', err);
  }
}

// ─── Cloudflare R2 & Base64 Helpers ───

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

// Upload base64 image into Cloudflare R2 bucket
// Categorized by /{YYYY}/{MM}/{subFolder}/{FireTank}_{timestamp}.{ext}
async function saveImageToR2(env, imageInput, subFolder, tankId, dateInput) {
  if (!imageInput || typeof imageInput !== 'string') return imageInput || null;
  const trimmed = imageInput.trim();
  if (!trimmed || trimmed === '-' || trimmed === '—') return null;

  // Preserve existing R2 paths, HTTP URLs, or static assets
  if (!trimmed.startsWith('data:')) {
    return trimmed;
  }

  if (!env.R2) {
    console.warn('saveImageToR2: env.R2 binding not configured in Worker runtime');
    return trimmed;
  }

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

// Retention policy: Keep current year + previous 2 years (e.g. 2026 -> keep 2024, 2025, 2026; delete <= 2023)
function getRetentionYears() {
  const curYear = new Date().getFullYear();
  const minKeepYear = curYear - 2;
  const keepYears = [];
  for (let y = minKeepYear; y <= curYear; y++) {
    keepYears.push(y);
  }
  return {
    curYear,
    minKeepYear,
    keepYears,
    deleteBeforeYear: minKeepYear
  };
}

// Purge expired records and objects (< minKeepYear) from both D1 and R2
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

  // 1. D1: Delete from monthly_snapshots where year < minKeepYear
  if (env.DB) {
    try {
      const d1Res = await env.DB.prepare(`
        DELETE FROM monthly_snapshots 
        WHERE CAST(substr(month_key, 1, 4) AS INTEGER) < ?
      `).bind(minKeepYear).run();
      result.deletedSnapshotsD1 = d1Res.meta?.changes || 0;
      result.details.push(`D1: ลบประวัติรอบเดือนเก่า (< ${minKeepYear}) ออกจำนวน ${result.deletedSnapshotsD1} รายการ`);
    } catch (e) {
      console.error('Error purging D1 snapshots:', e);
      result.details.push(`D1 Error: ${e.message}`);
    }
  }

  // 2. R2: Delete objects with year prefix < minKeepYear
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
      console.error('Error purging R2 objects:', e);
      result.details.push(`R2 Error: ${e.message}`);
    }
  }

  return result;
}

// Migrate all base64 images in D1 to R2 and execute retention purge
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

  // Step 1: Run retention purge first (< minKeepYear) in both D1 & R2
  const purgeRes = await purgeExpiredRetention(env);
  summary.deletedOldSnapshotsD1 = purgeRes.deletedSnapshotsD1;
  summary.deletedOldR2Objects = purgeRes.deletedR2Objects;
  summary.details.push(...purgeRes.details);

  if (!env.R2) {
    summary.details.push('คำเตือน: ไม่พบ Binding R2 ใน Worker runtime ไม่สามารถอัปโหลดไฟล์รูปภาพได้');
    return summary;
  }

  // Step 2: Migrate live tanks table
  if (env.DB) {
    const tanksQ = await env.DB.prepare('SELECT fire_tank, pic_tank, pic_area, lastcheck FROM tanks').all().catch(() => ({ results: [] }));
    const tanks = tanksQ.results || [];

    for (const t of tanks) {
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
        await env.DB.prepare(`
          UPDATE tanks
          SET pic_tank = ?, pic_area = ?
          WHERE fire_tank = ?
        `).bind(updatedPicTank, updatedPicArea, t.fire_tank).run();
        summary.tanksMigrated++;
      }
    }
    summary.details.push(`ตารางถังปัจจุบัน (tanks): ย้ายรูปภาพ Base64 ไปยัง R2 สำเร็จ ${summary.tanksMigrated} รายการ`);

    // Step 3: Migrate retained monthly_snapshots (>= minKeepYear)
    const snapQ = await env.DB.prepare(`
      SELECT id, month_key, snapshot_data 
      FROM monthly_snapshots 
      WHERE CAST(substr(month_key, 1, 4) AS INTEGER) >= ?
    `).bind(minKeepYear).all().catch(() => ({ results: [] }));

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
          await env.DB.prepare(`
            UPDATE monthly_snapshots 
            SET snapshot_data = ? 
            WHERE id = ?
          `).bind(JSON.stringify(list), snap.id).run();
          summary.snapshotsMigrated++;
        }
      } catch (e) {
        console.error(`Error migrating snapshot id ${snap.id}:`, e);
      }
    }
    summary.details.push(`ประวัติรอบเดือน (monthly_snapshots): ย้ายรูปภาพ Base64 ไปยัง R2 สำเร็จ ${summary.snapshotsMigrated} รอบเดือน`);
  }

  return summary;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    // ─── Cloudflare R2 Image Delivery Route ───
    if (pathname.startsWith('/r2/')) {
      if (!env.R2) {
        return new Response('Cloudflare R2 binding "R2" is not configured', { status: 500 });
      }
      try {
        const key = decodeURIComponent(pathname.replace(/^\/r2\//, ''));
        const object = await env.R2.get(key);
        if (!object) {
          return new Response('Image Not Found in R2', { status: 404 });
        }

        const etag = object.httpEtag;
        if (request.headers.get('if-none-match') === etag) {
          return new Response(null, { status: 304 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', etag);
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        headers.set('Access-Control-Allow-Origin', '*');

        return new Response(object.body, { headers });
      } catch (r2Err) {
        return new Response('Error retrieving image from R2: ' + r2Err.message, { status: 500 });
      }
    }

    // ─── API Routes ───
    try {
      if (!env.DB && pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Cloudflare D1 binding "DB" is not configured in env'
        }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      }

      // Explicit init/seed endpoint only (never run DDL write locks on normal read requests)
      if (env.DB && (pathname === '/api/seed' || pathname === '/api/init')) {
        await ensureDatabase(env.DB);
        return new Response(JSON.stringify({ success: true, message: 'Database initialized successfully' }), {
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      }

      // 1. /api/auth
      if (pathname === '/api/auth') {
        if (method === 'POST') {
          const { username, password } = await request.json();
          const uTrim = String(username || '').trim().toLowerCase();
          const pTrim = String(password || '').trim();

          const pending = await env.DB.prepare(
            'SELECT username FROM pending_users WHERE LOWER(username) = ?'
          ).bind(uTrim).first();

          if (pending) {
            return new Response(JSON.stringify({
              success: false,
              message: '⚠️ บัญชีของคุณอยู่ระหว่างรอผู้ดูแลระบบ (Admin) อนุมัติ กรุณารอการตรวจสอบ'
            }), { status: 403, headers: { 'Content-Type': 'application/json' } });
          }

          const user = await env.DB.prepare(
            'SELECT username, password, rank, permit_do, em_name FROM users WHERE LOWER(username) = ?'
          ).bind(uTrim).first();

          if (user && user.password === pTrim) {
            return new Response(JSON.stringify({
              success: true,
              user: {
                Username: user.username,
                Rank: user.rank,
                PermitDo: user.permit_do,
                EmName: user.em_name
              }
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          return new Response(JSON.stringify({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }), {
            status: 401, headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // 2. /api/check
      if (pathname === '/api/check') {
        if (method === 'POST') {
          const body = await request.json();
          const tankId = String(body.FireTank || '').trim().toUpperCase();
          if (!tankId) return new Response(JSON.stringify({ success: false, message: 'กรุณาระบุรหัสถัง' }), { status: 400 });

          const tank = await env.DB.prepare('SELECT inuse FROM tanks WHERE UPPER(fire_tank) = ?').bind(tankId).first();
          if (!tank) return new Response(JSON.stringify({ success: false, message: 'ไม่พบถังที่ระบุ' }), { status: 404 });

          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const hours = String(now.getHours()).padStart(2, '0');
          const mins = String(now.getMinutes()).padStart(2, '0');
          const timeStr = `${year}-${month}-${day} ${hours}:${mins}`;

          let exptank = '';
          if (tank.inuse) {
            const match = String(tank.inuse).match(/\d{4}/);
            if (match) {
              const inuseYear = parseInt(match[0], 10);
              const diff = Math.max(0, year - inuseYear);
              exptank = `${diff}ปี`;
            }
          }

          const isReady = Boolean(body.isReady);
          const weightVal = body.weight ? parseFloat(body.weight) : null;
          const inspectorName = body.inspector || '';
          const newPic = body.newPic || null;
          const remark = body.remark || '';

          // บันทึกรูปภาพเข้า Cloudflare R2 หากเป็น Base64
          let picTankUrl = newPic;
          if (newPic && typeof newPic === 'string' && newPic.startsWith('data:')) {
            picTankUrl = await saveImageToR2(env, newPic, 'tanks', tankId, now);
          }

          await env.DB.prepare(`
            UPDATE tanks
            SET lastcheck = ?, tankcheck = 'เช็คแล้ว', ready_or_not = ?, tank_status = ?,
                exptank = ?, inspector = ?, weight = COALESCE(?, weight),
                pic_tank = COALESCE(?, pic_tank), remark = ?
            WHERE UPPER(fire_tank) = ?
          `).bind(timeStr, isReady ? 'Ready' : 'Not Ready', isReady ? 1 : 0, exptank, inspectorName, weightVal, picTankUrl, remark, tankId).run();

          return new Response(JSON.stringify({
            success: true,
            data: { lastcheck: timeStr, exptank: exptank, ready_or_not: isReady ? 'Ready' : 'Not Ready', pic_tank: picTankUrl }
          }), { headers: { 'Content-Type': 'application/json' } });
        }
      }

      // 3. /api/register
      if (pathname === '/api/register') {
        if (method === 'POST') {
          const { username, password, emName } = await request.json();
          const uTrim = String(username || '').trim().toLowerCase();
          const pTrim = String(password || '').trim();
          const nameTrim = String(emName || '').trim();

          if (!uTrim || !pTrim || !nameTrim) return new Response(JSON.stringify({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' }), { status: 400 });

          const existingUser = await env.DB.prepare('SELECT username FROM users WHERE LOWER(username) = ?').bind(uTrim).first();
          if (existingUser) return new Response(JSON.stringify({ success: false, message: `ชื่อผู้ใช้ "${uTrim}" มีอยู่ในระบบแล้ว` }), { status: 409 });

          const existingPending = await env.DB.prepare('SELECT username FROM pending_users WHERE LOWER(username) = ?').bind(uTrim).first();
          if (existingPending) return new Response(JSON.stringify({ success: false, message: `ชื่อผู้ใช้ "${uTrim}" อยู่ระหว่างรอการอนุมัติแล้ว` }), { status: 409 });

          const now = new Date();
          const dateStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

          await env.DB.prepare(`
            INSERT INTO pending_users (username, password, em_name, rank, permit_do, registered_at)
            VALUES (?, ?, ?, 'P1', 1, ?)
          `).bind(uTrim, pTrim, nameTrim, dateStr).run();

          return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
        }
      }

      // 4. /api/tanks — ดึงสดจาก Cloudflare D1 100%
      if (pathname === '/api/tanks') {
        if (method === 'GET') {
          let rows = [];
          try {
            const query = await env.DB.prepare('SELECT * FROM tanks').all();
            rows = query.results || [];
          } catch (dbErr) {
            if (String(dbErr.message).includes('no such table')) {
              await ensureDatabase(env.DB);
              const retryQ = await env.DB.prepare('SELECT * FROM tanks').all().catch(() => ({ results: [] }));
              rows = retryQ.results || [];
            } else {
              // หากตารางชื่ออื่นใน D1 ตรวจสอบตารางที่มีอยู่
              const tblQuery = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").all().catch(() => ({ results: [] }));
              const tableList = (tblQuery.results || []).map(r => r.name);
              const foundTable = tableList.find(t => t.toLowerCase().includes('tank') || t.toLowerCase().includes('pump'));
              if (foundTable) {
                const q2 = await env.DB.prepare(`SELECT * FROM "${foundTable}"`).all();
                rows = q2.results || [];
              } else {
                return new Response(JSON.stringify({
                  error: `Database query failed: ${dbErr.message}`,
                  availableTables: tableList
                }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
              }
            }
          }

          const formatted = rows.map(formatTankResponse);
          formatted.sort((a, b) => (a.FireTank || '').localeCompare(b.FireTank || '', undefined, { numeric: true, sensitivity: 'base' }));
          return new Response(JSON.stringify(formatted), {
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'public, max-age=10, stale-while-revalidate=30'
            }
          });
        }

        if (method === 'POST') {
          const body = await request.json();
          const tankId = String(body.FireTank || '').trim().toUpperCase();
          if (!tankId) return new Response(JSON.stringify({ success: false, message: 'กรุณาระบุรหัสถัง' }), { status: 400 });

          const existing = await env.DB.prepare('SELECT fire_tank FROM tanks WHERE UPPER(fire_tank) = ?').bind(tankId).first();
          if (existing) return new Response(JSON.stringify({ success: false, message: `รหัสถัง "${tankId}" มีอยู่แล้ว` }), { status: 400 });

          const weightVal = body['Weight (lb)'] ? parseFloat(body['Weight (lb)']) : null;
          const isReady = body.ReadyorNot === 'Ready';

          // อัปโหลดรูปเข้า R2 ถ้าเป็น Base64
          let picTank = body.PicTank || null;
          let picArea = body.PicArea || null;
          if (picTank && typeof picTank === 'string' && picTank.startsWith('data:')) {
            picTank = await saveImageToR2(env, picTank, 'tanks', tankId, body.Lastcheck || new Date());
          }
          if (picArea && typeof picArea === 'string' && picArea.startsWith('data:')) {
            picArea = await saveImageToR2(env, picArea, 'areas', tankId, body.Lastcheck || new Date());
          }

          await env.DB.prepare(`
            INSERT INTO tanks (fire_tank, types, weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, eq_type, eq_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(tankId, body.Types || '', weightVal, body.Area || '', body.Inuse || '', body.Lastcheck || '', body.Tankcheck || 'ยังไม่เช็ค', body.ReadyorNot || 'Not Ready', isReady ? 1 : 0, body.Exptank || '', picTank, picArea, body.Inspector || '', body.Responsible || '', body.Remark || '').run();

          return new Response(JSON.stringify({ success: true, picTank, picArea }), { headers: { 'Content-Type': 'application/json' } });
        }

        if (method === 'PUT') {
          const body = await request.json();
          const tankId = String(body.FireTank || '').trim().toUpperCase();
          if (!tankId) return new Response(JSON.stringify({ success: false, message: 'กรุณาระบุรหัสถัง' }), { status: 400 });

          const weightVal = body['Weight (lb)'] ? parseFloat(body['Weight (lb)']) : null;
          const isReady = body.ReadyorNot === 'Ready';

          // อัปโหลดรูปเข้า R2 ถ้าเป็น Base64
          let picTank = body.PicTank || null;
          let picArea = body.PicArea || null;
          if (picTank && typeof picTank === 'string' && picTank.startsWith('data:')) {
            picTank = await saveImageToR2(env, picTank, 'tanks', tankId, body.Lastcheck || new Date());
          }
          if (picArea && typeof picArea === 'string' && picArea.startsWith('data:')) {
            picArea = await saveImageToR2(env, picArea, 'areas', tankId, body.Lastcheck || new Date());
          }

          await env.DB.prepare(`
            UPDATE tanks
            SET types = ?, weight = ?, area = ?, inuse = ?, lastcheck = ?,
                tankcheck = ?, ready_or_not = ?, tank_status = ?, exptank = ?,
                pic_tank = COALESCE(?, pic_tank), pic_area = COALESCE(?, pic_area),
                inspector = ?, responsible = ?, remark = ?
            WHERE UPPER(fire_tank) = ?
          `).bind(body.Types || '', weightVal, body.Area || '', body.Inuse || '', body.Lastcheck || '', body.Tankcheck || 'ยังไม่เช็ค', body.ReadyorNot || 'Not Ready', isReady ? 1 : 0, body.Exptank || '', picTank, picArea, body.Inspector || '', body.Responsible || '', body.Remark || '', body.EqType || 'tank', body.EqData || '{}', tankId).run();

          return new Response(JSON.stringify({ success: true, picTank, picArea }), { headers: { 'Content-Type': 'application/json' } });
        }

        if (method === 'DELETE') {
          const tankId = url.searchParams.get('id');
          if (!tankId) return new Response(JSON.stringify({ success: false, message: 'กรุณาระบุรหัสถัง' }), { status: 400 });
          await env.DB.prepare('DELETE FROM tanks WHERE UPPER(fire_tank) = ?').bind(tankId.toUpperCase()).run();
          return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
        }
      }

      // 5. /api/approvals
      if (pathname === '/api/approvals') {
        if (method === 'GET') {
          const pendingQuery = await env.DB.prepare('SELECT username as Username, em_name as EmName, rank as Rank, permit_do as PermitDo, registered_at as RegisteredAt FROM pending_users').all();
          const usersQuery = await env.DB.prepare('SELECT username as Username, em_name as EmName, rank as Rank, permit_do as PermitDo FROM users').all();
          return new Response(JSON.stringify({ pending: pendingQuery.results || [], users: usersQuery.results || [] }), { headers: { 'Content-Type': 'application/json' } });
        }

        if (method === 'POST') {
          const { username } = await request.json();
          const uTrim = String(username || '').trim();
          const pending = await env.DB.prepare('SELECT * FROM pending_users WHERE LOWER(username) = ?').bind(uTrim.toLowerCase()).first();
          if (!pending) return new Response(JSON.stringify({ success: false, message: 'ไม่พบรายการผู้สมัคร' }), { status: 404 });

          await env.DB.prepare('DELETE FROM pending_users WHERE LOWER(username) = ?').bind(uTrim.toLowerCase()).run();
          await env.DB.prepare('INSERT OR REPLACE INTO users (username, password, rank, permit_do, em_name) VALUES (?, ?, "P1", 1, ?)').bind(pending.username, pending.password, pending.em_name).run();

          return new Response(JSON.stringify({ success: true, user: { Username: pending.username, EmName: pending.em_name } }), { headers: { 'Content-Type': 'application/json' } });
        }

        if (method === 'PUT') {
          const body = await request.json();
          const targetUsername = String(body.username || '').trim();
          const newPermit = parseInt(body.permitDo, 10);
          const requestorPermit = parseInt(body.requestorPermitDo, 10);

          if (!targetUsername || isNaN(newPermit)) return new Response(JSON.stringify({ success: false, message: 'ข้อมูลไม่ครบถ้วน' }), { status: 400 });

          const targetUser = await env.DB.prepare('SELECT permit_do FROM users WHERE LOWER(username) = ?').bind(targetUsername.toLowerCase()).first();
          if (!targetUser) return new Response(JSON.stringify({ success: false, message: 'ไม่พบผู้ใช้ในระบบ' }), { status: 404 });

          if (requestorPermit < 3 && targetUser.permit_do >= 3) {
            return new Response(JSON.stringify({ success: false, message: 'ไม่มีสิทธิ์ปรับระดับผู้ใช้ที่เป็น P3' }), { status: 403 });
          }

          const newRank = newPermit >= 3 ? 'P3' : newPermit >= 2 ? 'P2' : 'P1';
          await env.DB.prepare('UPDATE users SET permit_do = ?, rank = ? WHERE LOWER(username) = ?').bind(newPermit, newRank, targetUsername.toLowerCase()).run();

          return new Response(JSON.stringify({ success: true, newPermit, newRank }), { headers: { 'Content-Type': 'application/json' } });
        }

        if (method === 'DELETE') {
          const targetUsername = url.searchParams.get('username');
          const type = url.searchParams.get('type') || 'pending';
          const requestorPermit = parseInt(url.searchParams.get('requestorPermit') || '0', 10);

          if (!targetUsername) return new Response(JSON.stringify({ success: false, message: 'กรุณาระบุชื่อผู้ใช้' }), { status: 400 });

          if (type === 'user') {
            const targetUser = await env.DB.prepare('SELECT permit_do FROM users WHERE LOWER(username) = ?').bind(targetUsername.trim().toLowerCase()).first();
            if (!targetUser) return new Response(JSON.stringify({ success: false, message: 'ไม่พบผู้ใช้' }), { status: 404 });
            if (requestorPermit < 3 && targetUser.permit_do >= 3) {
              return new Response(JSON.stringify({ success: false, message: 'ไม่มีสิทธิ์ลบผู้ใช้ที่เป็น P3' }), { status: 403 });
            }
            await env.DB.prepare('DELETE FROM users WHERE LOWER(username) = ?').bind(targetUsername.trim().toLowerCase()).run();
          } else {
            await env.DB.prepare('DELETE FROM pending_users WHERE LOWER(username) = ?').bind(targetUsername.trim().toLowerCase()).run();
          }

          return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
        }
      }

      // 6. /api/history — ประวัติรอบเดือนและสถิติรายปี (Monthly Archive & Annual Chart)
      if (pathname.startsWith('/api/history')) {
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = now.getMonth() + 1;
        const curMonthKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;
        const curThaiYear = curYear + 543;
        const curMonthLabel = `${THAI_MONTHS[curMonth - 1]} ${curThaiYear}`;

        // 6.1 /api/history/months — แสดงรายการเดือนทั้งหมด (ดึงตรงจาก D1 ไม่มีการสร้างซ้ำซ้อน)
        if (pathname === '/api/history/months') {
          const q = await env.DB.prepare('SELECT id, month_key, month_label, total_tanks, checked_tanks, not_checked_tanks, ready_tanks, not_ready_tanks, archived_at, is_closed FROM monthly_snapshots ORDER BY month_key DESC').all().catch(() => ({ results: [] }));
          const snapshots = q.results || [];

          return new Response(JSON.stringify({
            current: {
              month_key: curMonthKey,
              month_label: `${curMonthLabel} (รอบปัจจุบัน)`,
              is_current: true
            },
            history: snapshots
          }), {
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'public, max-age=15, stale-while-revalidate=60'
            }
          });
        }

        // 6.2 /api/history/snapshot — ดึงข้อมูลถังในรอบเดือนที่เลือก
        if (pathname === '/api/history/snapshot') {
          const targetKey = url.searchParams.get('month');
          if (!targetKey) return new Response(JSON.stringify({ success: false, message: 'กรุณาระบุเดือน' }), { status: 400 });

          const row = await env.DB.prepare('SELECT * FROM monthly_snapshots WHERE month_key = ?').bind(targetKey).first();
          if (!row) return new Response(JSON.stringify({ success: false, message: 'ไม่พบข้อมูลของรอบเดือนที่ระบุ' }), { status: 404 });

          let parsedData = [];
          try {
            parsedData = JSON.parse(row.snapshot_data);
          } catch(e) {}

          return new Response(JSON.stringify({
            success: true,
            snapshot: {
              month_key: row.month_key,
              month_label: row.month_label,
              total_tanks: row.total_tanks,
              checked_tanks: row.checked_tanks,
              not_checked_tanks: row.not_checked_tanks,
              ready_tanks: row.ready_tanks,
              not_ready_tanks: row.not_ready_tanks,
              archived_at: row.archived_at,
              is_closed: Boolean(row.is_closed)
            },
            tanks: parsedData
          }), { headers: { 'Content-Type': 'application/json' } });
        }

        // 6.3 /api/history/yearly — ข้อมูล 12 เดือนสำหรับกราฟแท่งและกราฟเปอร์เซ็นต์
        if (pathname === '/api/history/yearly') {
          const yearParam = parseInt(url.searchParams.get('year') || curYear, 10);
          const qYear = await env.DB.prepare('SELECT month_key, total_tanks, ready_tanks, not_ready_tanks, checked_tanks, not_checked_tanks FROM monthly_snapshots WHERE month_key LIKE ?').bind(`${yearParam}-%`).all().catch(() => ({ results: [] }));
          const snapMap = {};
          (qYear.results || []).forEach(r => {
            snapMap[r.month_key] = r;
          });

          let currentTankStats = null;
          if (yearParam === curYear) {
            const liveTanksQ = await env.DB.prepare('SELECT fire_tank, lastcheck, tankcheck, ready_or_not, tank_status FROM tanks').all().catch(() => ({ results: [] }));
            const liveTanks = (liveTanksQ.results || []).map(formatTankResponse);
            const tot = liveTanks.length;
            const chk = liveTanks.filter(t => t.Tankcheck === 'เช็คแล้ว').length;
            const notChk = tot - chk;
            const rdy = liveTanks.filter(t => t.Tankcheck === 'เช็คแล้ว' && t.ReadyorNot === 'Ready' && t.TankStatus).length;
            const notRdy = liveTanks.filter(t => t.Tankcheck === 'เช็คแล้ว' && (t.ReadyorNot === 'Not Ready' || !t.TankStatus)).length;
            currentTankStats = {
              total_tanks: tot,
              ready_tanks: rdy,
              not_ready_tanks: notRdy,
              checked_tanks: chk,
              not_checked_tanks: notChk
            };
          }

          const monthsData = [];
          for (let m = 1; m <= 12; m++) {
            const mKey = `${yearParam}-${String(m).padStart(2, '0')}`;
            let stat = snapMap[mKey];

            if (!stat && mKey === curMonthKey && currentTankStats) {
              stat = currentTankStats;
            }

            const total = stat ? stat.total_tanks : (m > curMonth && yearParam === curYear ? 0 : 0);
            const ready = stat ? stat.ready_tanks : 0;
            const notReady = stat ? stat.not_ready_tanks : 0;
            const checked = stat ? stat.checked_tanks : 0;
            const notChecked = stat ? (stat.not_checked_tanks !== undefined ? stat.not_checked_tanks : (total - checked)) : 0;

            const pctReady = total > 0 ? Math.round((ready / total) * 100) : 0;
            const pctNotReady = total > 0 ? Math.round((notReady / total) * 100) : 0;
            const pctChecked = total > 0 ? Math.round((checked / total) * 100) : 0;
            const pctNotChecked = total > 0 ? Math.round((notChecked / total) * 100) : 0;

            monthsData.push({
              month: m,
              month_key: mKey,
              label: THAI_MONTHS_SHORT[m - 1],
              full_label: `${THAI_MONTHS[m - 1]} ${yearParam + 543}`,
              total: total,
              ready: ready,
              not_ready: notReady,
              checked: checked,
              not_checked: notChecked,
              percent_ready: pctReady,
              percent_not_ready: pctNotReady,
              percent_checked: pctChecked,
              percent_not_checked: pctNotChecked,
              has_data: Boolean(stat)
            });
          }

          return new Response(JSON.stringify({
            year: yearParam,
            thai_year: yearParam + 543,
            months: monthsData
          }), {
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'public, max-age=15, stale-while-revalidate=60'
            }
          });
        }

        // 6.4 /api/history/seed-month — สำหรับ Super Admin (P3) เพิ่มข้อมูลประวัติย้อนหลังรายเดือนอย่างรวดเร็ว
        if (pathname === '/api/history/seed-month' && method === 'POST') {
          const body = await request.json().catch(() => ({}));
          const permit = parseInt(body.requestorPermitDo, 10);
          if (permit < 3) {
            return new Response(JSON.stringify({ success: false, message: 'เฉพาะผู้ดูแลระบบระดับ Super Admin (P3) เท่านั้น' }), { status: 403 });
          }

          const monthKey = String(body.monthKey || body.month || '').trim();
          const inspector = String(body.inspector || 'SHE').trim();

          const tankQ = await env.DB.prepare('SELECT * FROM tanks').all().catch(() => ({ results: [] }));
          const liveTanks = (tankQ.results || []).map(formatTankResponse);
          const total = liveTanks.length;
          if (total === 0) {
            return new Response(JSON.stringify({ success: false, message: 'ไม่พบรายการถังในระบบ ไม่สามารถสร้าง Snapshot ได้' }), { status: 400 });
          }

          // รองรับการเติมรวดเดียว 9 เดือน (ม.ค. - ก.ย.)
          if (monthKey.includes('all_01_09')) {
            const y = parseInt(body.year || monthKey.split('-')[0] || 2026, 10);
            const yStr = String(y);
            const thaiYear = y + 543;

            for (let m = 1; m <= 9; m++) {
              const mStr = String(m).padStart(2, '0');
              const curMKey = `${yStr}-${mStr}`;
              const curLabel = `${THAI_MONTHS[m - 1]} ${thaiYear}`;
              const curCheckDateStr = `01/${mStr}/${yStr}`;
              const curArchDate = `${curMKey}-28 23:59:59`;

              const snapTanks = liveTanks.map(t => formatTankForSnapshot(t, {
                Tankcheck: 'เช็คแล้ว',
                ReadyorNot: 'Ready',
                TankStatus: true,
                Lastcheck: curCheckDateStr,
                Inspector: inspector
              }));
              const sJson = JSON.stringify(snapTanks);

              await env.DB.prepare(`
                INSERT INTO monthly_snapshots 
                (month_key, month_label, total_tanks, checked_tanks, not_checked_tanks, ready_tanks, not_ready_tanks, snapshot_data, archived_at, is_closed)
                VALUES (?, ?, ?, ?, 0, ?, 0, ?, ?, 1)
                ON CONFLICT(month_key) DO UPDATE SET
                  month_label = excluded.month_label,
                  total_tanks = excluded.total_tanks,
                  checked_tanks = excluded.checked_tanks,
                  not_checked_tanks = excluded.not_checked_tanks,
                  ready_tanks = excluded.ready_tanks,
                  not_ready_tanks = excluded.not_ready_tanks,
                  snapshot_data = excluded.snapshot_data,
                  archived_at = excluded.archived_at,
                  is_closed = excluded.is_closed
              `).bind(curMKey, curLabel, total, total, total, sJson, curArchDate).run();
            }

            return new Response(JSON.stringify({
              success: true,
              message: `เพิ่มข้อมูลย้อนหลังครบ 9 เดือน (ม.ค. - ก.ย. ${thaiYear}) สำเร็จเรียบร้อย (${total} ถัง/เดือน)`,
              month_key: `${yStr}-09`,
              month_label: `กันยายน ${thaiYear}`
            }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
          }

          if (!/^\d{4}-\d{2}$/.test(monthKey)) {
            return new Response(JSON.stringify({ success: false, message: 'รูปแบบเดือนไม่ถูกต้อง (ต้องเป็น YYYY-MM เช่น 2026-05)' }), { status: 400 });
          }

          const [yStr, mStr] = monthKey.split('-');
          const y = parseInt(yStr, 10);
          const m = parseInt(mStr, 10);
          if (m < 1 || m > 12) {
            return new Response(JSON.stringify({ success: false, message: 'เดือนไม่ถูกต้อง' }), { status: 400 });
          }

          const thaiYear = y + 543;
          const monthLabel = `${THAI_MONTHS[m - 1]} ${thaiYear}`;
          const checkDateStr = `01/${mStr}/${yStr}`;
          const archDate = `${monthKey}-28 23:59:59`;

          const mode = body.mode || '100_percent';
          let checked = total;
          let ready = total;
          let notChecked = 0;
          let notReady = 0;

          let snapshotTanks = [];
          if (mode === '100_percent') {
            checked = total;
            ready = total;
            notChecked = 0;
            notReady = 0;
            snapshotTanks = liveTanks.map(t => formatTankForSnapshot(t, {
              Tankcheck: 'เช็คแล้ว',
              ReadyorNot: 'Ready',
              TankStatus: true,
              Lastcheck: checkDateStr,
              Inspector: inspector
            }));
          } else {
            ready = Math.min(total, Math.max(0, parseInt(body.readyCount !== undefined ? body.readyCount : total, 10)));
            notReady = Math.min(total - ready, Math.max(0, parseInt(body.notReadyCount || 0, 10)));
            checked = ready + notReady;
            notChecked = Math.max(0, total - checked);

            let assignedReady = 0;
            let assignedNotReady = 0;
            snapshotTanks = liveTanks.map(t => {
              if (assignedReady < ready) {
                assignedReady++;
                return formatTankForSnapshot(t, { Tankcheck: 'เช็คแล้ว', ReadyorNot: 'Ready', TankStatus: true, Lastcheck: checkDateStr, Inspector: inspector });
              } else if (assignedNotReady < notReady) {
                assignedNotReady++;
                return formatTankForSnapshot(t, { Tankcheck: 'เช็คแล้ว', ReadyorNot: 'Not Ready', TankStatus: false, Lastcheck: checkDateStr, Inspector: inspector, Remark: 'พบจุดบกพร่อง' });
              } else {
                return formatTankForSnapshot(t, { Tankcheck: 'ยังไม่เช็ค', ReadyorNot: 'Ready', TankStatus: true, Lastcheck: '', Inspector: '' });
              }
            });
          }

          const snapJson = JSON.stringify(snapshotTanks);

          await env.DB.prepare(`
            INSERT INTO monthly_snapshots 
            (month_key, month_label, total_tanks, checked_tanks, not_checked_tanks, ready_tanks, not_ready_tanks, snapshot_data, archived_at, is_closed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT(month_key) DO UPDATE SET
              month_label = excluded.month_label,
              total_tanks = excluded.total_tanks,
              checked_tanks = excluded.checked_tanks,
              not_checked_tanks = excluded.not_checked_tanks,
              ready_tanks = excluded.ready_tanks,
              not_ready_tanks = excluded.not_ready_tanks,
              snapshot_data = excluded.snapshot_data,
              archived_at = excluded.archived_at,
              is_closed = excluded.is_closed
          `).bind(monthKey, monthLabel, total, checked, notChecked, ready, notReady, snapJson, archDate).run();

          return new Response(JSON.stringify({
            success: true,
            message: `เพิ่มข้อมูลย้อนหลังรอบเดือน ${monthLabel} สำเร็จ (${total} ถัง)`,
            month_key: monthKey,
            month_label: monthLabel
          }), { headers: { 'Content-Type': 'application/json' } });
        }

        // 6.5 DELETE /api/history/snapshot — สำหรับ P3 ลบข้อมูลรอบเดือน
        if (pathname === '/api/history/snapshot' && method === 'DELETE') {
          const permit = parseInt(url.searchParams.get('requestorPermit') || '0', 10);
          if (permit < 3) {
            return new Response(JSON.stringify({ success: false, message: 'เฉพาะผู้ดูแลระบบระดับ Super Admin (P3) เท่านั้น' }), { status: 403 });
          }
          const targetKey = url.searchParams.get('month');
          if (!targetKey) return new Response(JSON.stringify({ success: false, message: 'กรุณาระบุเดือน' }), { status: 400 });
          await env.DB.prepare('DELETE FROM monthly_snapshots WHERE month_key = ?').bind(targetKey).run();
          return new Response(JSON.stringify({ success: true, message: `ลบข้อมูลรอบเดือน ${targetKey} สำเร็จ` }), { headers: { 'Content-Type': 'application/json' } });
        }
      }

      // 7. /api/r2/* — การจัดการ Cloudflare R2 Storage & Data Retention
      if (pathname.startsWith('/api/r2/')) {
        const { curYear, minKeepYear, keepYears, deleteBeforeYear } = getRetentionYears();

        // 7.1 GET /api/r2/status
        if (pathname === '/api/r2/status') {
          let r2ObjectCount = 0;
          let r2Available = Boolean(env.R2);
          if (env.R2) {
            try {
              const list = await env.R2.list({ limit: 1000 });
              r2ObjectCount = list.objects.length;
            } catch (e) {
              console.warn('R2 list error:', e);
            }
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

        // 7.2 POST /api/r2/migrate — ย้ายรูปภาพ Base64 ไปยัง R2 และลบข้อมูลเก่าตาม Retention
        if (pathname === '/api/r2/migrate' && method === 'POST') {
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

        // 7.3 POST /api/r2/cleanup — ล้างข้อมูลเก่าตาม Retention Policy (ลบ <= 2023)
        if ((pathname === '/api/r2/cleanup' || pathname === '/api/r2/retention') && method === 'POST') {
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
      }

      if (pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({ success: false, message: `API route not found: [${method}] ${pathname}` }), {
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      }
    } catch (apiErr) {
      return new Response(JSON.stringify({ success: false, error: apiErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    // ─── Static Assets ───
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return await env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};