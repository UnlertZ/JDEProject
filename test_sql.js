const Database = require('better-sqlite3');
const db = new Database(':memory:');

db.exec(`
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
`);
db.exec(`
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
`);
db.exec(`
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
`);
db.exec(`
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
`);

try {
  const query = `
          SELECT fire_tank, types, weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'tank' as eq_type, '' as eq_data FROM tanks
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'fhc' as eq_type, eq_data FROM fhc
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'fh' as eq_type, eq_data FROM fh
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'hd' as eq_type, eq_data FROM hd
  `;
  const stmt = db.prepare(query);
  const rows = stmt.all();
  console.log("SUCCESS:", rows.length);
} catch (e) {
  console.log("ERROR:", e.message);
}
