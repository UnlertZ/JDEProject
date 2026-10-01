/**
 * functions/api/history/months.js — Cloudflare Pages Functions
 * API: GET /api/history/months
 * แสดงรายการรอบเดือนทั้งหมด
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

export async function onRequestGet(context) {
  const { env } = context;
  try {
    if (!env.DB) {
      return new Response(JSON.stringify({ success: false, message: 'Cloudflare D1 is not bound' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    await ensureHistoryTables(env.DB);

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curMonthKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;
    const curThaiYear = curYear + 543;
    const curMonthLabel = `${THAI_MONTHS[curMonth - 1]} ${curThaiYear}`;

    const q = await env.DB.prepare('SELECT id, month_key, month_label, total_tanks, checked_tanks, not_checked_tanks, ready_tanks, not_ready_tanks, archived_at, is_closed FROM monthly_snapshots ORDER BY month_key DESC').all();
    const snapshots = q.results || [];

    return new Response(JSON.stringify({
      current: {
        month_key: curMonthKey,
        month_label: `${curMonthLabel} (รอบปัจจุบัน)`,
        is_current: true
      },
      history: snapshots
    }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
