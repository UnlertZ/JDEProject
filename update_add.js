const fs = require('fs');
let html = fs.readFileSync('add.html', 'utf8');

const eqTypeHtml = `
          <!-- Row 0: Equipment Type -->
          <div class="row g-3 mb-3">
            <div class="col-12">
              <label class="form-label fw-semibold small">ประเภทอุปกรณ์ (Equipment Type) <span class="text-danger">*</span></label>
              <select name="EqType" id="eqTypeSelect" class="form-select" required>
                <option value="tank">🧯 ถังดับเพลิง (Tank)</option>
                <option value="fhc">🧰 ตู้ดับเพลิง (FHC)</option>
                <option value="fh">🚒 สายฉีด (FH)</option>
                <option value="hd">🚰 หัวรับน้ำ (HD)</option>
              </select>
            </div>
          </div>
`;

html = html.replace('<!-- Row 1: FireTank ID & Type -->', eqTypeHtml + '\n          <!-- Row 1: FireTank ID & Type -->');
html = html.replace('Types: $(\'#typeInput\').val().trim(),', 'EqType: $(\'#eqTypeSelect\').val(),\n        Types: $(\'#typeInput\').val().trim(),');

fs.writeFileSync('add.html', html, 'utf8');
