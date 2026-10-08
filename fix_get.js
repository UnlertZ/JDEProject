const fs = require('fs');
let worker = fs.readFileSync('_worker.js', 'utf8');

const getAllSql = `
          SELECT fire_tank, types, weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'tank' as eq_type, '' as eq_data FROM tanks
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'fhc' as eq_type, eq_data FROM fhc
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'fh' as eq_type, eq_data FROM fh
          UNION ALL
          SELECT eq_id as fire_tank, types, NULL as weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark, 'hd' as eq_type, eq_data FROM hd
`;

// Line 302
worker = worker.replace(
  'const tankQ = await db.prepare("SELECT * FROM tanks").all().catch(() => ({ results: [] }));',
  'const tankQ = await db.prepare(`' + getAllSql + '`).all().catch(() => ({ results: [] }));'
);

// Line 1115
worker = worker.replace(
  'const tankQ = await env.DB.prepare(\'SELECT * FROM tanks\').all().catch(() => ({ results: [] }));',
  'const tankQ = await env.DB.prepare(`' + getAllSql + '`).all().catch(() => ({ results: [] }));'
);

// Format Tank Response should use EqType and EqData
worker = worker.replace(
  'Remark: t.remark || \'\'',
  'Remark: t.remark || \'\',\n    EqType: t.eq_type || \'tank\',\n    EqData: t.eq_data || \'{}\''
);

fs.writeFileSync('_worker.js', worker, 'utf8');
console.log("Replaced GET queries");
