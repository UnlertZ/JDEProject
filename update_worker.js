const fs = require('fs');
let code = fs.readFileSync('_worker.js', 'utf8');

// 1. Add columns to CREATE TABLE tanks
code = code.replace(
  'remark TEXT\n      )',
  'remark TEXT,\n        eq_type TEXT DEFAULT \'tank\',\n        eq_data TEXT\n      )'
);

// 2. Add Migration for existing table
const alterTableCode = `
    // Migration: Add eq_type and eq_data columns to tanks
    try {
      await db.prepare("ALTER TABLE tanks ADD COLUMN eq_type TEXT DEFAULT 'tank'").run();
    } catch(e) {}
    try {
      await db.prepare("ALTER TABLE tanks ADD COLUMN eq_data TEXT").run();
    } catch(e) {}
`;
code = code.replace(
  '// Migration: อัปเดตข้อมูลปี 01/01/2026',
  alterTableCode + '\n    // Migration: อัปเดตข้อมูลปี 01/01/2026'
);

// 3. Update GET /api/tanks
// It should return eq_type and eq_data
// In the mapping `formatTankResponse`
code = code.replace(
  'Remark: t.remark || \'\'',
  'Remark: t.remark || \'\',\n    EqType: t.eq_type || \'tank\',\n    EqData: t.eq_data || \'{}\''
);

// 4. Update POST /api/tanks
code = code.replace(
  'pic_tank, pic_area, inspector, responsible, remark)',
  'pic_tank, pic_area, inspector, responsible, remark, eq_type, eq_data)'
);
code = code.replace(
  'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
// The `.bind(` block for INSERT
code = code.replace(
  'body.Remark || \'\'\n          ).run();',
  `body.Remark || '',
            body.EqType || 'tank',
            body.EqData || '{}'
          ).run();`
);

// 5. Update PUT /api/tanks/[id]
code = code.replace(
  'pic_tank = COALESCE(?, pic_tank), pic_area = COALESCE(?, pic_area),\n              inspector = ?, responsible = ?, remark = ?',
  `pic_tank = COALESCE(?, pic_tank), pic_area = COALESCE(?, pic_area),
              inspector = ?, responsible = ?, remark = ?,
              eq_type = COALESCE(?, eq_type), eq_data = COALESCE(?, eq_data)`
);
// The `.bind(` block for UPDATE
code = code.replace(
  'body.Remark || \'\', tankId).run();',
  `body.Remark || '', body.EqType || 'tank', body.EqData || '{}', tankId).run();`
);

fs.writeFileSync('_worker.js', code, 'utf8');
console.log('Worker updated');
