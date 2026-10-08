const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const tabsHtml = `
    <!-- Equipment Tabs -->
    <ul class="nav nav-pills mb-3" id="equipmentTabs" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active bg-danger text-white rounded-pill px-4 fw-bold shadow-sm" id="tab-tank" data-eq-type="tank" type="button" role="tab">🧯 ถังดับเพลิง</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link rounded-pill px-4 fw-bold ms-2 shadow-sm bg-white border text-dark" id="tab-fhc" data-eq-type="fhc" type="button" role="tab">🧰 ตู้ดับเพลิง (FHC)</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link rounded-pill px-4 fw-bold ms-2 shadow-sm bg-white border text-dark" id="tab-fh" data-eq-type="fh" type="button" role="tab">🚒 สายฉีด (FH)</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link rounded-pill px-4 fw-bold ms-2 shadow-sm bg-white border text-dark" id="tab-hd" data-eq-type="hd" type="button" role="tab">🚰 หัวรับน้ำ (HD)</button>
      </li>
    </ul>
`;

html = html.replace('<div class="card mb-4 shadow-sm border-0 rounded-4 overflow-hidden" id="analyticsChartCard">', tabsHtml + '\n    <div class="card mb-4 shadow-sm border-0 rounded-4 overflow-hidden" id="analyticsChartCard">');
fs.writeFileSync('index.html', html, 'utf8');
