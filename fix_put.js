const fs = require('fs');
let worker = fs.readFileSync('_worker.js', 'utf8');

const putLogic = `
          const eqType = body.EqType || 'tank';
          const isFhcClass = eqType !== 'tank';
          const tableName = isFhcClass ? eqType : 'tanks';
          const idCol = isFhcClass ? 'eq_id' : 'fire_tank';

          if (isFhcClass) {
            await env.DB.prepare(\`
              UPDATE \${tableName}
              SET types = ?, area = ?, inuse = ?, lastcheck = ?,
                  tankcheck = ?, ready_or_not = ?, tank_status = ?, exptank = ?,
                  pic_tank = COALESCE(?, pic_tank), pic_area = COALESCE(?, pic_area),
                  inspector = ?, responsible = ?, remark = ?, eq_data = ?
              WHERE UPPER(eq_id) = ?
            \`).bind(body.Types || '', body.Area || '', body.Inuse || '', body.Lastcheck || '', body.Tankcheck || 'ยังไม่เช็ค', body.ReadyorNot || 'Not Ready', isReady ? 1 : 0, body.Exptank || '', picTank, picArea, body.Inspector || '', body.Responsible || '', body.Remark || '', body.EqData || '{}', tankId).run();
          } else {
            await env.DB.prepare(\`
              UPDATE tanks
              SET types = ?, weight = ?, area = ?, inuse = ?, lastcheck = ?,
                  tankcheck = ?, ready_or_not = ?, tank_status = ?, exptank = ?,
                  pic_tank = COALESCE(?, pic_tank), pic_area = COALESCE(?, pic_area),
                  inspector = ?, responsible = ?, remark = ?
              WHERE UPPER(fire_tank) = ?
            \`).bind(body.Types || '', weightVal, body.Area || '', body.Inuse || '', body.Lastcheck || '', body.Tankcheck || 'ยังไม่เช็ค', body.ReadyorNot || 'Not Ready', isReady ? 1 : 0, body.Exptank || '', picTank, picArea, body.Inspector || '', body.Responsible || '', body.Remark || '', tankId).run();
          }
`;

worker = worker.replace(
  /await env\.DB\.prepare\([\s\S]*?body\.EqData \|\| '\{\}', tankId\)\.run\(\);/m,
  putLogic.trim()
);

fs.writeFileSync('_worker.js', worker, 'utf8');
console.log("Fixed PUT API");
