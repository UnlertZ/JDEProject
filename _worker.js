/**
 * _worker.js — Universal Gateway สำหรับ Cloudflare Workers & Pages
 * Self-contained 100% — อ้างอิงและดึงข้อมูลจาก Cloudflare D1 ล้วนๆ (100% Database Driven)
 */

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

  if (tankCheck === 'เช็คแล้ว') {
    const days = getDaysSinceCheck(lastcheck);
    if (days !== null && days >= 30) {
      tankCheck = 'ยังไม่เช็ค';
    }
  }

  const readyOrNot = get('ready_or_not') || get('ReadyorNot') || 'Not Ready';
  const tankStatusVal = get('tank_status') ?? get('TankStatus');
  const tankStatus = (tankStatusVal !== '' && tankStatusVal !== undefined)
    ? Boolean(tankStatusVal)
    : (readyOrNot === 'Ready');

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

    _dbInitialized = true;
  } catch (err) {
    console.error('ensureDatabase error:', err);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    // ─── API Routes ───
    try {
      if (!env.DB && pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Cloudflare D1 binding "DB" is not configured in env'
        }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      }

      if (env.DB && pathname.startsWith('/api/')) {
        await ensureDatabase(env.DB);
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

          await env.DB.prepare(`
            UPDATE tanks
            SET lastcheck = ?, tankcheck = 'เช็คแล้ว', ready_or_not = ?, tank_status = ?,
                exptank = ?, inspector = ?, weight = COALESCE(?, weight),
                pic_tank = COALESCE(?, pic_tank), remark = ?
            WHERE UPPER(fire_tank) = ?
          `).bind(timeStr, isReady ? 'Ready' : 'Not Ready', isReady ? 1 : 0, exptank, inspectorName, weightVal, newPic, remark, tankId).run();

          return new Response(JSON.stringify({
            success: true,
            data: { lastcheck: timeStr, exptank: exptank, ready_or_not: isReady ? 'Ready' : 'Not Ready' }
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

          const formatted = rows.map(formatTankResponse);
          formatted.sort((a, b) => (a.FireTank || '').localeCompare(b.FireTank || '', undefined, { numeric: true, sensitivity: 'base' }));
          return new Response(JSON.stringify(formatted), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
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

          await env.DB.prepare(`
            INSERT INTO tanks (fire_tank, types, weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(tankId, body.Types || '', weightVal, body.Area || '', body.Inuse || '', body.Lastcheck || '', body.Tankcheck || 'ยังไม่เช็ค', body.ReadyorNot || 'Not Ready', isReady ? 1 : 0, body.Exptank || '', body.PicTank || null, body.PicArea || null, body.Inspector || '', body.Responsible || '', body.Remark || '').run();

          return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
        }

        if (method === 'PUT') {
          const body = await request.json();
          const tankId = String(body.FireTank || '').trim().toUpperCase();
          if (!tankId) return new Response(JSON.stringify({ success: false, message: 'กรุณาระบุรหัสถัง' }), { status: 400 });

          const weightVal = body['Weight (lb)'] ? parseFloat(body['Weight (lb)']) : null;
          const isReady = body.ReadyorNot === 'Ready';

          await env.DB.prepare(`
            UPDATE tanks
            SET types = ?, weight = ?, area = ?, inuse = ?, lastcheck = ?,
                tankcheck = ?, ready_or_not = ?, tank_status = ?, exptank = ?,
                pic_tank = COALESCE(?, pic_tank), pic_area = COALESCE(?, pic_area),
                inspector = ?, responsible = ?, remark = ?
            WHERE UPPER(fire_tank) = ?
          `).bind(body.Types || '', weightVal, body.Area || '', body.Inuse || '', body.Lastcheck || '', body.Tankcheck || 'ยังไม่เช็ค', body.ReadyorNot || 'Not Ready', isReady ? 1 : 0, body.Exptank || '', body.PicTank || null, body.PicArea || null, body.Inspector || '', body.Responsible || '', body.Remark || '', tankId).run();

          return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
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
        const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const curMonthLabel = `${THAI_MONTHS[curMonth - 1]} ${curThaiYear}`;

        // 6.1 /api/history/months — แสดงรายการเดือนทั้งหมด
        if (pathname === '/api/history/months') {
          const q = await env.DB.prepare('SELECT id, month_key, month_label, total_tanks, checked_tanks, not_checked_tanks, ready_tanks, not_ready_tanks, archived_at, is_closed FROM monthly_snapshots ORDER BY month_key DESC').all();
          let snapshots = q.results || [];

          // ถ้ายังไม่มี snapshot ของเดือนกันยายน 2026 (เดือนก่อนหน้า) ให้ snapshot อัตโนมัติ
          const prevDate = new Date(curYear, curMonth - 2, 1);
          const prevYear = prevDate.getFullYear();
          const prevMonth = prevDate.getMonth() + 1;
          const prevMonthKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
          const prevThaiYear = prevYear + 543;
          const prevMonthLabel = `${THAI_MONTHS[prevMonth - 1]} ${prevThaiYear}`;

          const hasPrev = snapshots.some(s => s.month_key === prevMonthKey);
          if (!hasPrev) {
            const tankQ = await env.DB.prepare('SELECT * FROM tanks').all().catch(() => ({ results: [] }));
            const tankRows = (tankQ.results || []).map(formatTankResponse);
            if (tankRows.length > 0) {
              const total = tankRows.length;
              const checked = tankRows.filter(t => t.Tankcheck === 'เช็คแล้ว').length;
              const notChecked = total - checked;
              const ready = tankRows.filter(t => t.ReadyorNot === 'Ready' && t.TankStatus).length;
              const notReady = tankRows.filter(t => t.ReadyorNot === 'Not Ready' || !t.TankStatus).length;
              const snapJson = JSON.stringify(tankRows);
              const archDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-30 23:59:59`;

              await env.DB.prepare(`
                INSERT OR IGNORE INTO monthly_snapshots (month_key, month_label, total_tanks, checked_tanks, not_checked_tanks, ready_tanks, not_ready_tanks, snapshot_data, archived_at, is_closed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
              `).bind(prevMonthKey, prevMonthLabel, total, checked, notChecked, ready, notReady, snapJson, archDate).run().catch(console.error);

              const qReload = await env.DB.prepare('SELECT id, month_key, month_label, total_tanks, checked_tanks, not_checked_tanks, ready_tanks, not_ready_tanks, archived_at, is_closed FROM monthly_snapshots ORDER BY month_key DESC').all();
              snapshots = qReload.results || [];
            }
          }

          return new Response(JSON.stringify({
            current: {
              month_key: curMonthKey,
              month_label: `${curMonthLabel} (รอบปัจจุบัน)`,
              is_current: true
            },
            history: snapshots
          }), { headers: { 'Content-Type': 'application/json' } });
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
            const liveTanksQ = await env.DB.prepare('SELECT * FROM tanks').all().catch(() => ({ results: [] }));
            const liveTanks = (liveTanksQ.results || []).map(formatTankResponse);
            const tot = liveTanks.length;
            const rdy = liveTanks.filter(t => t.ReadyorNot === 'Ready' && t.TankStatus).length;
            const notRdy = liveTanks.filter(t => t.ReadyorNot === 'Not Ready' || !t.TankStatus).length;
            const chk = liveTanks.filter(t => t.Tankcheck === 'เช็คแล้ว').length;
            const notChk = tot - chk;
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
          }), { headers: { 'Content-Type': 'application/json' } });
        }
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