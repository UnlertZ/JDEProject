const fs = require('fs');
let index = fs.readFileSync('index.html', 'utf8');

const tabsHtml = `
    <!-- Equipment Tabs -->
    <div class="mb-4">
      <div class="card shadow-sm border-0 rounded-4">
        <div class="card-body p-2">
          <ul class="nav nav-pills nav-fill" id="pills-tab" role="tablist">
            <li class="nav-item" role="presentation">
              <button class="nav-link active fw-bold rounded-pill" id="pills-tank-tab" data-bs-toggle="pill" data-eq-type="tank" type="button" role="tab">🧯 ถังดับเพลิง</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link fw-bold rounded-pill" id="pills-fhc-tab" data-bs-toggle="pill" data-eq-type="fhc" type="button" role="tab">🧰 ตู้ดับเพลิง (FHC)</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link fw-bold rounded-pill" id="pills-fh-tab" data-bs-toggle="pill" data-eq-type="fh" type="button" role="tab">🚒 สายฉีด (FH)</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link fw-bold rounded-pill" id="pills-hd-tab" data-bs-toggle="pill" data-eq-type="hd" type="button" role="tab">🚰 หัวรับน้ำ (HD)</button>
            </li>
          </ul>
        </div>
      </div>
    </div>
`;

if (!index.includes('id="pills-tab"')) {
  index = index.replace('<!-- ─── 1. Annual & Monthly Inspection Analytics Chart ─── -->', tabsHtml + '\n    <!-- ─── 1. Annual & Monthly Inspection Analytics Chart ─── -->');
  fs.writeFileSync('index.html', index, 'utf8');
  console.log("Added tabs");
} else {
  console.log("Tabs already exist");
}
