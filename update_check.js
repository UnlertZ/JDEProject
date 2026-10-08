const fs = require('fs');
let html = fs.readFileSync('check.html', 'utf8');

const additionalChecklists = `
          <!-- 📝 Checklist สำหรับ FHC (Fire Hose Cabinet) -->
          <div id="checklist-fhc" class="d-none">
            <h6 class="fw-bold text-dark border-bottom pb-2 mb-3"><i class="bi bi-ui-checks"></i> หัวข้อการตรวจ FHC</h6>
            <!-- Cabinet & Glass -->
            <div class="mb-3">
              <label class="form-label text-secondary small fw-bold">ตู้และกระจก (Cabinet & Glass)</label>
              <div class="d-flex gap-2 w-100">
                <input type="radio" class="btn-check check-input-fhc" name="fhc_glass" id="fhc_glass_normal" value="normal" checked onchange="updateLiveStatus()">
                <label class="btn btn-outline-success flex-fill" for="fhc_glass_normal"><i class="bi bi-check-circle me-1"></i>ปกติ</label>
                <input type="radio" class="btn-check check-input-fhc" name="fhc_glass" id="fhc_glass_abnormal" value="abnormal" onchange="updateLiveStatus()">
                <label class="btn btn-outline-danger flex-fill" for="fhc_glass_abnormal"><i class="bi bi-x-circle me-1"></i>ชำรุด/แตก</label>
              </div>
            </div>
            <!-- Valve -->
            <div class="mb-3">
              <label class="form-label text-secondary small fw-bold">วาล์วเปิด-ปิด (Valve)</label>
              <div class="d-flex gap-2 w-100">
                <input type="radio" class="btn-check check-input-fhc" name="fhc_valve" id="fhc_valve_normal" value="normal" checked onchange="updateLiveStatus()">
                <label class="btn btn-outline-success flex-fill" for="fhc_valve_normal"><i class="bi bi-check-circle me-1"></i>ปกติ</label>
                <input type="radio" class="btn-check check-input-fhc" name="fhc_valve" id="fhc_valve_abnormal" value="abnormal" onchange="updateLiveStatus()">
                <label class="btn btn-outline-danger flex-fill" for="fhc_valve_abnormal"><i class="bi bi-x-circle me-1"></i>ผิดปกติ</label>
              </div>
            </div>
            <!-- Hose -->
            <div class="mb-3">
              <label class="form-label text-secondary small fw-bold">สายฉีด (Hose)</label>
              <div class="d-flex gap-2 w-100">
                <input type="radio" class="btn-check check-input-fhc" name="fhc_hose" id="fhc_hose_normal" value="normal" checked onchange="updateLiveStatus()">
                <label class="btn btn-outline-success flex-fill" for="fhc_hose_normal"><i class="bi bi-check-circle me-1"></i>ปกติ</label>
                <input type="radio" class="btn-check check-input-fhc" name="fhc_hose" id="fhc_hose_abnormal" value="abnormal" onchange="updateLiveStatus()">
                <label class="btn btn-outline-danger flex-fill" for="fhc_hose_abnormal"><i class="bi bi-x-circle me-1"></i>ชำรุด/รั่วซึม</label>
              </div>
            </div>
            <!-- Nozzle -->
            <div class="mb-3">
              <label class="form-label text-secondary small fw-bold">หัวฉีด (Nozzle)</label>
              <div class="d-flex gap-2 w-100">
                <input type="radio" class="btn-check check-input-fhc" name="fhc_nozzle" id="fhc_nozzle_normal" value="normal" checked onchange="updateLiveStatus()">
                <label class="btn btn-outline-success flex-fill" for="fhc_nozzle_normal"><i class="bi bi-check-circle me-1"></i>ปกติ</label>
                <input type="radio" class="btn-check check-input-fhc" name="fhc_nozzle" id="fhc_nozzle_abnormal" value="abnormal" onchange="updateLiveStatus()">
                <label class="btn btn-outline-danger flex-fill" for="fhc_nozzle_abnormal"><i class="bi bi-x-circle me-1"></i>ผิดปกติ/สูญหาย</label>
              </div>
            </div>
          </div>

          <!-- 📝 Checklist สำหรับ FH (Fire Hose) -->
          <div id="checklist-fh" class="d-none">
            <h6 class="fw-bold text-dark border-bottom pb-2 mb-3"><i class="bi bi-ui-checks"></i> หัวข้อการตรวจ FH</h6>
            <!-- Hose -->
            <div class="mb-3">
              <label class="form-label text-secondary small fw-bold">สายฉีด (Hose)</label>
              <div class="d-flex gap-2 w-100">
                <input type="radio" class="btn-check check-input-fh" name="fh_hose" id="fh_hose_normal" value="normal" checked onchange="updateLiveStatus()">
                <label class="btn btn-outline-success flex-fill" for="fh_hose_normal"><i class="bi bi-check-circle me-1"></i>ปกติ</label>
                <input type="radio" class="btn-check check-input-fh" name="fh_hose" id="fh_hose_abnormal" value="abnormal" onchange="updateLiveStatus()">
                <label class="btn btn-outline-danger flex-fill" for="fh_hose_abnormal"><i class="bi bi-x-circle me-1"></i>ชำรุด/รั่วซึม</label>
              </div>
            </div>
            <!-- Coupling -->
            <div class="mb-3">
              <label class="form-label text-secondary small fw-bold">ข้อต่อและซีลยาง (Coupling)</label>
              <div class="d-flex gap-2 w-100">
                <input type="radio" class="btn-check check-input-fh" name="fh_coupling" id="fh_coupling_normal" value="normal" checked onchange="updateLiveStatus()">
                <label class="btn btn-outline-success flex-fill" for="fh_coupling_normal"><i class="bi bi-check-circle me-1"></i>ปกติ</label>
                <input type="radio" class="btn-check check-input-fh" name="fh_coupling" id="fh_coupling_abnormal" value="abnormal" onchange="updateLiveStatus()">
                <label class="btn btn-outline-danger flex-fill" for="fh_coupling_abnormal"><i class="bi bi-x-circle me-1"></i>ชำรุด/ไม่ครบ</label>
              </div>
            </div>
          </div>

          <!-- 📝 Checklist สำหรับ HD (Hydrant) -->
          <div id="checklist-hd" class="d-none">
            <h6 class="fw-bold text-dark border-bottom pb-2 mb-3"><i class="bi bi-ui-checks"></i> หัวข้อการตรวจ HD</h6>
            <!-- Valve -->
            <div class="mb-3">
              <label class="form-label text-secondary small fw-bold">วาล์วเปิด-ปิด (Valve)</label>
              <div class="d-flex gap-2 w-100">
                <input type="radio" class="btn-check check-input-hd" name="hd_valve" id="hd_valve_normal" value="normal" checked onchange="updateLiveStatus()">
                <label class="btn btn-outline-success flex-fill" for="hd_valve_normal"><i class="bi bi-check-circle me-1"></i>ปกติ</label>
                <input type="radio" class="btn-check check-input-hd" name="hd_valve" id="hd_valve_abnormal" value="abnormal" onchange="updateLiveStatus()">
                <label class="btn btn-outline-danger flex-fill" for="hd_valve_abnormal"><i class="bi bi-x-circle me-1"></i>ผิดปกติ</label>
              </div>
            </div>
            <!-- Coupling -->
            <div class="mb-3">
              <label class="form-label text-secondary small fw-bold">ข้อต่อ (Coupling)</label>
              <div class="d-flex gap-2 w-100">
                <input type="radio" class="btn-check check-input-hd" name="hd_coupling" id="hd_coupling_normal" value="normal" checked onchange="updateLiveStatus()">
                <label class="btn btn-outline-success flex-fill" for="hd_coupling_normal"><i class="bi bi-check-circle me-1"></i>ปกติ</label>
                <input type="radio" class="btn-check check-input-hd" name="hd_coupling" id="hd_coupling_abnormal" value="abnormal" onchange="updateLiveStatus()">
                <label class="btn btn-outline-danger flex-fill" for="hd_coupling_abnormal"><i class="bi bi-x-circle me-1"></i>ชำรุด/ไม่ครบ</label>
              </div>
            </div>
          </div>
`;

// Wrap the original tank checklist in a div
html = html.replace('<!-- ⏱️ สภาพความพร้อมใช้งาน -->', '<div id="checklist-tank">\n          <!-- ⏱️ สภาพความพร้อมใช้งาน -->');
html = html.replace('<!-- 💬 หมายเหตุ (แสดงเสมอ) -->', '</div>\n\n' + additionalChecklists + '\n\n          <!-- 💬 หมายเหตุ (แสดงเสมอ) -->');

// JS Updates in check.html
// 1. Store EqType in global variable when selecting tank
html = html.replace('let selectedTank = null;', 'let selectedTank = null;\n    let currentEqType = "tank";');
html = html.replace('selectedTank = t;', 'selectedTank = t;\n          currentEqType = t.EqType || \'tank\';');

// 2. onTankSelectChange -> hide/show correct checklist
const toggleChecklists = `
        $('#checklist-tank, #checklist-fhc, #checklist-fh, #checklist-hd').addClass('d-none');
        $('#checklist-' + currentEqType).removeClass('d-none');
        updateLiveStatus();
`;
html = html.replace("$('#infoLastcheck').text(t.Lastcheck || '-');", `$('#infoLastcheck').text(t.Lastcheck || '-');\n${toggleChecklists}`);

// 3. updateLiveStatus logic to support all types
const newUpdateLiveStatus = `
    function updateLiveStatus() {
      let isReady = false;
      
      if (currentEqType === 'tank') {
        const g = $('input[name="gauge_status"]:checked').val() === 'normal';
        const b = $('input[name="body_status"]:checked').val() === 'normal';
        const l = $('input[name="leak_status"]:checked').val() === 'normal';
        const w = $('input[name="weight_status"]:checked').val() === 'normal';
        isReady = g && b && l && w;
      } else if (currentEqType === 'fhc') {
        const gl = $('input[name="fhc_glass"]:checked').val() === 'normal';
        const v = $('input[name="fhc_valve"]:checked').val() === 'normal';
        const h = $('input[name="fhc_hose"]:checked').val() === 'normal';
        const n = $('input[name="fhc_nozzle"]:checked').val() === 'normal';
        isReady = gl && v && h && n;
      } else if (currentEqType === 'fh') {
        const h = $('input[name="fh_hose"]:checked').val() === 'normal';
        const c = $('input[name="fh_coupling"]:checked').val() === 'normal';
        isReady = h && c;
      } else if (currentEqType === 'hd') {
        const v = $('input[name="hd_valve"]:checked').val() === 'normal';
        const c = $('input[name="hd_coupling"]:checked').val() === 'normal';
        isReady = v && c;
      }

      if (isReady) {
        $('#liveStatusText').text('พร้อมใช้งาน (Ready)').removeClass('text-danger').addClass('text-success');
        $('#liveStatusIcon').removeClass('bi-x-circle-fill text-danger').addClass('bi-check-circle-fill text-success');
      } else {
        $('#liveStatusText').text('ไม่พร้อมใช้งาน (Not Ready)').removeClass('text-success').addClass('text-danger');
        $('#liveStatusIcon').removeClass('bi-check-circle-fill text-success').addClass('bi-x-circle-fill text-danger');
      }
    }
`;
html = html.replace(/function updateLiveStatus\(\) \{[\s\S]*?\}\n/, newUpdateLiveStatus);

// 4. handleCheckSubmit logic for isReady
const newHandleCheckSubmit = `
      let isReady = false;
      let eqData = {};

      if (currentEqType === 'tank') {
        const g = $('input[name="gauge_status"]:checked').val() === 'normal';
        const b = $('input[name="body_status"]:checked').val() === 'normal';
        const l = $('input[name="leak_status"]:checked').val() === 'normal';
        const w = $('input[name="weight_status"]:checked').val() === 'normal';
        isReady = g && b && l && w;
        eqData = { gauge: g, body: b, leak: l, weight: w, weightVal: $('#weightInput').val() };
      } else if (currentEqType === 'fhc') {
        const gl = $('input[name="fhc_glass"]:checked').val() === 'normal';
        const v = $('input[name="fhc_valve"]:checked').val() === 'normal';
        const h = $('input[name="fhc_hose"]:checked').val() === 'normal';
        const n = $('input[name="fhc_nozzle"]:checked').val() === 'normal';
        isReady = gl && v && h && n;
        eqData = { glass: gl, valve: v, hose: h, nozzle: n };
      } else if (currentEqType === 'fh') {
        const h = $('input[name="fh_hose"]:checked').val() === 'normal';
        const c = $('input[name="fh_coupling"]:checked').val() === 'normal';
        isReady = h && c;
        eqData = { hose: h, coupling: c };
      } else if (currentEqType === 'hd') {
        const v = $('input[name="hd_valve"]:checked').val() === 'normal';
        const c = $('input[name="hd_coupling"]:checked').val() === 'normal';
        isReady = v && c;
        eqData = { valve: v, coupling: c };
      }
`;
html = html.replace(/const g = \$\('input\[name="gauge_status"\]:checked'\)\.val\(\) === 'normal';[\s\S]*?const isReady = g && b && l && w;/, newHandleCheckSubmit);

// 5. updateTankCheck payload (add eq_data)
html = html.replace('PicTank: currentUploadedBase64,', 'PicTank: currentUploadedBase64,\n          EqType: currentEqType,\n          EqData: JSON.stringify(eqData),');

fs.writeFileSync('check.html', html, 'utf8');
