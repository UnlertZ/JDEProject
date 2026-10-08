const fs = require('fs');

let worker = fs.readFileSync('_worker.js', 'utf8');

// 1. Add CREATE TABLE statements for fhc, fh, hd
const createTablesSql = `
    await db.prepare(\`
      CREATE TABLE IF NOT EXISTS fhc (
        eq_id TEXT PRIMARY KEY,
        types TEXT,
        area TEXT,
        inuse TEXT,
        lastcheck TEXT,
        tankcheck TEXT DEFAULT 'ยังไม่ตรวจ',
        ready_or_not TEXT DEFAULT 'Not Ready',
        tank_status INTEGER DEFAULT 0,
        exptank TEXT,
        pic_tank TEXT,
        pic_area TEXT,
        inspector TEXT,
        responsible TEXT,
        remark TEXT,
        eq_data TEXT
      )
    \`).run();

    await db.prepare(\`
      CREATE TABLE IF NOT EXISTS fh (
        eq_id TEXT PRIMARY KEY,
        types TEXT,
        area TEXT,
        inuse TEXT,
        lastcheck TEXT,
        tankcheck TEXT DEFAULT 'ยังไม่ตรวจ',
        ready_or_not TEXT DEFAULT 'Not Ready',
        tank_status INTEGER DEFAULT 0,
        exptank TEXT,
        pic_tank TEXT,
        pic_area TEXT,
        inspector TEXT,
        responsible TEXT,
        remark TEXT,
        eq_data TEXT
      )
    \`).run();

    await db.prepare(\`
      CREATE TABLE IF NOT EXISTS hd (
        eq_id TEXT PRIMARY KEY,
        types TEXT,
        area TEXT,
        inuse TEXT,
        lastcheck TEXT,
        tankcheck TEXT DEFAULT 'ยังไม่ตรวจ',
        ready_or_not TEXT DEFAULT 'Not Ready',
        tank_status INTEGER DEFAULT 0,
        exptank TEXT,
        pic_tank TEXT,
        pic_area TEXT,
        inspector TEXT,
        responsible TEXT,
        remark TEXT,
        eq_data TEXT
      )
    \`).run();
`;
worker = worker.replace(
  'CREATE TABLE IF NOT EXISTS monthly_snapshots (',
  createTablesSql + '\n\n    await db.prepare(`\n      CREATE TABLE IF NOT EXISTS monthly_snapshots ('
);

// 2. GET /api/tanks -> UNION ALL all 4 tables
const getAllSql = `
          SELECT fire_tank, types, weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'tank' as eq_type, '' as eq_data FROM tanks
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'fhc' as eq_type, eq_data FROM fhc
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'fh' as eq_type, eq_data FROM fh
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'hd' as eq_type, eq_data FROM hd
`;
// find `const tankQ = await env.DB.prepare("SELECT * FROM tanks").all();` and replace it
worker = worker.replace(
  'const tankQ = await env.DB.prepare("SELECT * FROM tanks").all();',
  'const tankQ = await env.DB.prepare(`' + getAllSql + '`).all();'
);

// 3. POST /api/tanks -> Route to correct table
const postLogic = `
          const eqType = body.EqType || 'tank';
          if (eqType === 'tank') {
            await env.DB.prepare(\`
              INSERT INTO tanks (fire_tank, types, weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            \`).bind(tankId, body.Types || '', weightVal, body.Area || '', body.Inuse || '', body.Lastcheck || '', body.Tankcheck || 'ยังไม่ตรวจ', body.ReadyorNot || 'Not Ready', isReady ? 1 : 0, body.Exptank || '', picTank, picArea, body.Inspector || '', body.Responsible || '', body.Remark || '').run();
          } else {
            const tableName = eqType === 'fhc' ? 'fhc' : (eqType === 'fh' ? 'fh' : 'hd');
            await env.DB.prepare(\`
              INSERT INTO \${tableName} (eq_id, types, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, eq_data)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            \`).bind(tankId, body.Types || '', body.Area || '', body.Inuse || '', body.Lastcheck || '', body.Tankcheck || 'ยังไม่ตรวจ', body.ReadyorNot || 'Not Ready', isReady ? 1 : 0, body.Exptank || '', picTank, picArea, body.Inspector || '', body.Responsible || '', body.Remark || '', body.EqData || '{}').run();
          }
`;
worker = worker.replace(
  /await env\.DB\.prepare\(`\s*INSERT INTO tanks[\s\S]*?body\.Remark \|\| ''\)\.run\(\);/,
  postLogic
);

// 4. PUT /api/tanks/[id] -> Route to correct table
const putLogic = `
          const eqType = body.EqType || 'tank';
          if (eqType === 'tank') {
            await env.DB.prepare(\`
              UPDATE tanks
              SET types = ?, weight = ?, area = ?, inuse = ?, lastcheck = ?, tankcheck = ?, ready_or_not = ?, tank_status = ?, exptank = ?,
                  pic_tank = COALESCE(?, pic_tank), pic_area = COALESCE(?, pic_area),
                  inspector = ?, responsible = ?, remark = ?
              WHERE fire_tank = ?
            \`).bind(body.Types || '', weightVal, body.Area || '', body.Inuse || '', body.Lastcheck || '', body.Tankcheck || 'ยังไม่ตรวจ', body.ReadyorNot || 'Not Ready', isReady ? 1 : 0, body.Exptank || '', picTank, picArea, body.Inspector || '', body.Responsible || '', body.Remark || '', tankId).run();
          } else {
            const tableName = eqType === 'fhc' ? 'fhc' : (eqType === 'fh' ? 'fh' : 'hd');
            await env.DB.prepare(\`
              UPDATE \${tableName}
              SET types = ?, area = ?, inuse = ?, lastcheck = ?, tankcheck = ?, ready_or_not = ?, tank_status = ?, exptank = ?,
                  pic_tank = COALESCE(?, pic_tank), pic_area = COALESCE(?, pic_area),
                  inspector = ?, responsible = ?, remark = ?, eq_data = COALESCE(?, eq_data)
              WHERE eq_id = ?
            \`).bind(body.Types || '', body.Area || '', body.Inuse || '', body.Lastcheck || '', body.Tankcheck || 'ยังไม่ตรวจ', body.ReadyorNot || 'Not Ready', isReady ? 1 : 0, body.Exptank || '', picTank, picArea, body.Inspector || '', body.Responsible || '', body.Remark || '', body.EqData || '{}', tankId).run();
          }
`;
worker = worker.replace(
  /await env\.DB\.prepare\(`\s*UPDATE tanks\s*SET types[\s\S]*?body\.Remark \|\| '', tankId\)\.run\(\);/,
  putLogic
);

// 5. DELETE /api/tanks/[id] -> DELETE FROM ALL tables
const delLogic = `
          await env.DB.prepare("DELETE FROM tanks WHERE fire_tank = ?").bind(tankId).run();
          await env.DB.prepare("DELETE FROM fhc WHERE eq_id = ?").bind(tankId).run();
          await env.DB.prepare("DELETE FROM fh WHERE eq_id = ?").bind(tankId).run();
          await env.DB.prepare("DELETE FROM hd WHERE eq_id = ?").bind(tankId).run();
`;
worker = worker.replace(
  'await env.DB.prepare("DELETE FROM tanks WHERE fire_tank = ?").bind(tankId).run();',
  delLogic
);

fs.writeFileSync('_worker.js', worker, 'utf8');
console.log("Done");
