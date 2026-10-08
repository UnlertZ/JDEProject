const fs = require('fs');
let worker = fs.readFileSync('_worker.js', 'utf8');

worker = worker.replace(
  "Remark: String(get('remark') || get('Remark') || '')",
  "Remark: String(get('remark') || get('Remark') || ''),\n    EqType: String(get('eq_type') || get('EqType') || 'tank'),\n    EqData: String(get('eq_data') || get('EqData') || '{}')"
);

fs.writeFileSync('_worker.js', worker, 'utf8');
console.log("Added EqType to formatTankResponse");
