/**
 * functions/api/history/months.js — Cloudflare Pages Functions
 * API: GET /api/history/months
 * แสดงรายการรอบเดือนทั้งหมด
 */

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

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
