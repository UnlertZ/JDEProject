const fs = require('fs');
let html = fs.readFileSync('add.html', 'utf8');

const changeHandler = `
    $('#eqTypeSelect').on('change', function() {
      const v = $(this).val();
      if (v === 'tank') {
        $('label[for="tankIdInput"]').html('รหัสถัง (FireTank) <span class="text-danger">*</span>');
        $('label[for="typeInput"]').html('ประเภทถัง (Types)');
        $('#weightContainer').removeClass('d-none');
        $('#expiryContainer').removeClass('d-none');
      } else {
        $('label[for="tankIdInput"]').html('ชื่อ/รหัสอุปกรณ์ <span class="text-danger">*</span>');
        $('label[for="typeInput"]').html('ลักษณะอุปกรณ์ (Types)');
        $('#weightContainer').addClass('d-none');
        $('#expiryContainer').addClass('d-none');
      }
    });
`;

html = html.replace('function initPage() {', changeHandler + '\n    function initPage() {');

// Update data payload
const oldData = `const data = {
        FireTank: tankId,
        Types: document.getElementById('typeInput').value.trim(),
        'Weight (lb)': document.getElementById('weightInput').value,`;

const newData = `const data = {
        EqType: document.getElementById('eqTypeSelect').value,
        FireTank: tankId,
        Types: document.getElementById('typeInput').value.trim(),
        'Weight (lb)': document.getElementById('weightInput').value,`;

html = html.replace(oldData, newData);

fs.writeFileSync('add.html', html, 'utf8');
console.log("Patched add.html");
