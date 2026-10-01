/**
 * functions/api/history/yearly.js — Cloudflare Pages Functions
 * API: GET /api/history/yearly?year=YYYY
 * ดึงสถิติรายปีสำหรับกราฟแท่งและกราฟเปอร์เซ็นต์
 */

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

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
  const get = (key) => row[key] !== undefined ? row[key] : (row[key.toLowerCase()] !== undefined ? row[key.toLowerCase()] : '');

  const lastcheck = get('lastcheck') || get('Lastcheck') || '';
  let tankCheck = get('tankcheck') || get('Tankcheck') || 'ยังไม่เช็ค';

  if (tankCheck === 'เช็คแล้ว') {
    if (!isCheckedInCurrentMonth(lastcheck)) {
      tankCheck = 'ยังไม่เช็ค';
    }
  }

  return {
    FireTank: get('fire_tank') || get('firetank') || get('FireTank') || '',
    Lastcheck: lastcheck,
    Tankcheck: tankCheck,
    ReadyorNot: get('ready_or_not') || get('readyornot') || get('ReadyorNot') || 'Ready',
    TankStatus: Boolean(get('tank_status') !== '' ? get('tank_status') : true)
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curMonthKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;
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
      const chk = liveTanks.filter(t => t.Tankcheck === 'เช็คแล้ว' && isCheckedInCurrentMonth(t.Lastcheck)).length;
      const notChk = tot - chk;
      const rdy = liveTanks.filter(t => t.Tankcheck === 'เช็คแล้ว' && isCheckedInCurrentMonth(t.Lastcheck) && t.ReadyorNot === 'Ready' && t.TankStatus).length;
      const notRdy = liveTanks.filter(t => t.Tankcheck === 'เช็คแล้ว' && isCheckedInCurrentMonth(t.Lastcheck) && (t.ReadyorNot === 'Not Ready' || !t.TankStatus)).length;
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

      const total = stat ? stat.total_tanks : 0;
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

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
