const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace('color: #555;', 'color: #555 !important;');

fs.writeFileSync('index.html', html, 'utf8');
console.log("Added !important to nav-link color");
