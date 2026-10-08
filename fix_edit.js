const fs = require('fs');
let html = fs.readFileSync('edit.html', 'utf8');

const newData = `const data = {
        EqType: currentTankData.EqType || 'tank',
        Types: document.getElementById('typeInput').value.trim(),`;

html = html.replace(
  "const data = {\n        Types: document.getElementById('typeInput').value.trim(),",
  newData
);

fs.writeFileSync('edit.html', html, 'utf8');
console.log("Added EqType to edit.html");
