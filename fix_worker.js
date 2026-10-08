const fs = require('fs');
let worker = fs.readFileSync('_worker.js', 'utf8');

worker = worker.replace(
  "if (method === 'GET') {\n          let rows = [];",
  "if (method === 'GET') {\n          await ensureDatabase(env.DB);\n          let rows = [];"
);

fs.writeFileSync('_worker.js', worker, 'utf8');
console.log("Called ensureDatabase eagerly");
