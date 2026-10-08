const fs = require('fs');
let html = fs.readFileSync('add.html', 'utf8');

html = html.replace(
  '<label class="form-label fw-semibold small">\n                รหัสถัง (FireTank)',
  '<label for="tankIdInput" class="form-label fw-semibold small">\n                รหัสถัง (FireTank)'
);
html = html.replace(
  '<label class="form-label fw-semibold small">ประเภทถัง (Types)</label>\n              <input type="text" id="typeInput"',
  '<label for="typeInput" class="form-label fw-semibold small">ประเภทถัง (Types)</label>\n              <input type="text" id="typeInput"'
);

// Fallback if not matched:
if (!html.includes('for="tankIdInput"')) {
  // Regex approach
  html = html.replace(/(<label[^>]*>)(\s*รหัสถัง)/i, '<label for="tankIdInput" class="form-label fw-semibold small">$2');
}
if (!html.includes('for="typeInput"')) {
  html = html.replace(/(<label[^>]*>)(ประเภทถัง)/i, '<label for="typeInput" class="form-label fw-semibold small">$2');
}

fs.writeFileSync('add.html', html, 'utf8');
console.log("Added for attributes to labels");
