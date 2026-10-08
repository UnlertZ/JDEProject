const fs = require('fs');
let index = fs.readFileSync('index.html', 'utf8');

index = index.replace(/\\\`/g, '`');

fs.writeFileSync('index.html', index, 'utf8');
console.log("Removed escaped backticks");
