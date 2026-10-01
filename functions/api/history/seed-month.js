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

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS system_migrations (
      id TEXT PRIMARY KEY,
      executed_at TEXT
    )
  `).run().catch(console.error);

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
    const inspector = String(body.inspector || 'SHE').trim();

    const tankQ = await env.DB.prepare('SELECT * FROM tanks').all().catch(() => ({ results: [] }));
    const liveTanks = (tankQ.results || []).map(formatTankResponse);
    const total = liveTanks.length;
    if (total === 0) {
      return new Response(JSON.stringify({ success: false, message: 'ไม่พบรายการถังในระบบ ไม่สามารถสร้าง Snapshot ได้' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
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
    }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: 'Server error: ' + err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
