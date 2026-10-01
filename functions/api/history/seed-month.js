/**
 * functions/api/history/seed-month.js — Cloudflare Pages Functions
 * API: POST /api/history/seed-month
 * สำหรับ Super Admin (P3) เพิ่มข้อมูลประวัติย้อนหลังรายเดือนอย่างรวดเร็ว
 */

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

function formatTankResponse(row) {
  if (!row) return {};
  const get = (key) => row[key] !== undefined ? row[key] : (row[key.toLowerCase()] !== undefined ? row[key.toLowerCase()] : '');

  return {
    Id: get('id'),
    FireTank: get('fire_tank') || get('firetank') || get('FireTank') || '',
    Types: get('types') || get('Types') || '',
    'Weight (lb)': get('weight') || get('Weight (lb)') || '',
    Area: get('area') || get('Area') || '',
    Responsible: get('responsible') || get('Responsible') || '',
    Inuse: get('inuse') || get('Inuse') || '',
    Lastcheck: get('lastcheck') || get('Lastcheck') || '',
    Tankcheck: get('tankcheck') || get('Tankcheck') || 'ยังไม่เช็ค',
    ReadyorNot: get('ready_or_not') || get('readyornot') || get('ReadyorNot') || 'Ready',
    Exptank: get('exptank') || get('Exptank') || '',
    Inspector: get('inspector') || get('Inspector') || '',
    Remark: get('remark') || get('Remark') || '',
    PicTank: get('pic_tank') || get('pictank') || get('PicTank') || '',
    PicArea: get('pic_area') || get('picarea') || get('PicArea') || '',
    TankStatus: Boolean(get('tank_status') !== '' ? get('tank_status') : true)
  };
}

async function ensureHistoryTables(db) {
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
  `).run().catch(console.error);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!env.DB) {
      return new Response(JSON.stringify({ success: false, message: 'Cloudflare D1 (DB) is not bound' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    await ensureHistoryTables(env.DB);

    const body = await request.json().catch(() => ({}));
    const permit = parseInt(body.requestorPermitDo, 10);
    if (permit < 3) {
      return new Response(JSON.stringify({ success: false, message: 'เฉพาะผู้ดูแลระบบระดับ Super Admin (P3) เท่านั้น' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    const monthKey = String(body.monthKey || body.month || '').trim();
    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      return new Response(JSON.stringify({ success: false, message: 'รูปแบบเดือนไม่ถูกต้อง (ต้องเป็น YYYY-MM เช่น 2026-05)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    const [yStr, mStr] = monthKey.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    if (m < 1 || m > 12) {
      return new Response(JSON.stringify({ success: false, message: 'เดือนไม่ถูกต้อง' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    const thaiYear = y + 543;
    const monthLabel = `${THAI_MONTHS[m - 1]} ${thaiYear}`;
    const inspector = String(body.inspector || 'SHE').trim();
    const checkDateStr = `01/${mStr}/${yStr}`;
    const archDate = `${monthKey}-28 23:59:59`;

    const tankQ = await env.DB.prepare('SELECT * FROM tanks').all().catch(() => ({ results: [] }));
    const liveTanks = (tankQ.results || []).map(formatTankResponse);
    const total = liveTanks.length;
    if (total === 0) {
      return new Response(JSON.stringify({ success: false, message: 'ไม่พบรายการถังในระบบ ไม่สามารถสร้าง Snapshot ได้' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

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
      snapshotTanks = liveTanks.map(t => ({
        ...t,
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
          return { ...t, Tankcheck: 'เช็คแล้ว', ReadyorNot: 'Ready', TankStatus: true, Lastcheck: checkDateStr, Inspector: inspector };
        } else if (assignedNotReady < notReady) {
          assignedNotReady++;
          return { ...t, Tankcheck: 'เช็คแล้ว', ReadyorNot: 'Not Ready', TankStatus: false, Lastcheck: checkDateStr, Inspector: inspector, Remark: 'พบจุดบกพร่อง' };
        } else {
          return { ...t, Tankcheck: 'ยังไม่เช็ค', ReadyorNot: 'Ready', TankStatus: true, Lastcheck: '', Inspector: '' };
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
    }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: 'Server error: ' + err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
