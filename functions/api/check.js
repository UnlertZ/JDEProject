/**
 * functions/api/check.js — Cloudflare D1 API สำหรับบันทึกผลการตรวจเช็คสภาพถัง
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const tankId = String(body.FireTank || '').trim().toUpperCase();
    if (!tankId) {
      return new Response(JSON.stringify({ success: false, message: 'กรุณาระบุรหัสถัง' }), { status: 400 });
    }

    // ดึงข้อมูลเดิมของถัง
    const tank = await env.DB.prepare('SELECT inuse FROM tanks WHERE fire_tank = ?').bind(tankId).first();
    if (!tank) {
      return new Response(JSON.stringify({ success: false, message: 'ไม่พบถังที่ระบุ' }), { status: 404 });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${year}-${month}-${day} ${hours}:${mins}`;

    // คำนวณอายุถัง
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

    let picTankUrl = newPic;
    if (newPic && typeof newPic === 'string' && newPic.startsWith('data:') && env.R2) {
      try {
        const match = newPic.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1];
          const binaryStr = atob(match[2]);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
          let ext = 'jpg';
          if (mimeType.includes('png')) ext = 'png';
          else if (mimeType.includes('webp')) ext = 'webp';
          const safeTank = tankId.replace(/[^a-zA-Z0-9_-]/g, '_');
          const key = `${year}/${month}/tanks/${safeTank}_${Date.now()}.${ext}`;
          await env.R2.put(key, bytes.buffer, {
            httpMetadata: { contentType: mimeType, cacheControl: 'public, max-age=31536000, immutable' }
          });
          picTankUrl = `/r2/${key}`;
        }
      } catch (e) {
        console.error('R2 upload error in check.js:', e);
      }
    }

    await env.DB.prepare(`
      UPDATE tanks
      SET lastcheck = ?, tankcheck = 'เช็คแล้ว', ready_or_not = ?, tank_status = ?,
          exptank = ?, inspector = ?, weight = COALESCE(?, weight),
          pic_tank = COALESCE(?, pic_tank), remark = ?
      WHERE fire_tank = ?
    `).bind(
      timeStr,
      isReady ? 'Ready' : 'Not Ready',
      isReady ? 1 : 0,
      exptank,
      inspectorName,
      weightVal,
      picTankUrl,
      remark,
      tankId
    ).run();

    return new Response(JSON.stringify({
      success: true,
      data: {
        lastcheck: timeStr,
        exptank: exptank,
        ready_or_not: isReady ? 'Ready' : 'Not Ready',
        pic_tank: picTankUrl
      }
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
  }
}
