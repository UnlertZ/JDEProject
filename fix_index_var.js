const fs = require('fs');
let indexHtml = fs.readFileSync('index.html', 'utf8');

indexHtml = indexHtml.replace(
  'let dataTableInstance = null;',
  'let currentEqType = "tank";\n    let dataTableInstance = null;'
);

fs.writeFileSync('index.html', indexHtml, 'utf8');
console.log("Added currentEqType variable");
