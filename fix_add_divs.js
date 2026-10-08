const fs = require('fs');
let html = fs.readFileSync('add.html', 'utf8');

// Replace the div wrapping weightInput
html = html.replace(
  '<div class="col-md-4">',
  '<div class="col-md-4" id="weightContainer">'
);
// In case it's not exactly that, find the label 'น้ำหนักถัง'
const labelRegex = /<div[^>]*>\s*<label[^>]*>\s*น้ำหนักถัง/i;
if (labelRegex.test(html)) {
   html = html.replace(/(<div[^>]*>)(\s*<label[^>]*>\s*น้ำหนักถัง)/i, '<div class="col-md-4" id="weightContainer">$2');
}

// Do the same for Expiry
const expiryRegex = /<div[^>]*>\s*<label[^>]*>\s*วันหมดอายุ/i;
if (expiryRegex.test(html)) {
   html = html.replace(/(<div[^>]*>)(\s*<label[^>]*>\s*วันหมดอายุ)/i, '<div class="col-md-4" id="expiryContainer">$2');
}

fs.writeFileSync('add.html', html, 'utf8');
console.log("Added IDs to containers");
