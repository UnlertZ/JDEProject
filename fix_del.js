const fs = require('fs');
let worker = fs.readFileSync('_worker.js', 'utf8');

const delLogic = `
          const upId = tankId.toUpperCase();
          await env.DB.prepare('DELETE FROM tanks WHERE UPPER(fire_tank) = ?').bind(upId).run();
          await env.DB.prepare('DELETE FROM fhc WHERE UPPER(eq_id) = ?').bind(upId).run();
          await env.DB.prepare('DELETE FROM fh WHERE UPPER(eq_id) = ?').bind(upId).run();
          await env.DB.prepare('DELETE FROM hd WHERE UPPER(eq_id) = ?').bind(upId).run();
`;
worker = worker.replace(
  'await env.DB.prepare(\'DELETE FROM tanks WHERE UPPER(fire_tank) = ?\').bind(tankId.toUpperCase()).run();',
  delLogic
);

fs.writeFileSync('_worker.js', worker, 'utf8');
console.log("Replaced DELETE queries");
