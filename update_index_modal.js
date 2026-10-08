const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// The modal ID is `tankDetailModal`.
// It shows `detailType`, `detailWeight`, etc.
// We can parse EqData JSON and append it to `detailRemark` or add a new container.
const detailsHtml = `
              <div class="col-6 mb-2"><strong>ขนาดบรรจุ:</strong> <span id="detailWeight">-</span> lb</div>
              <div class="col-12 mt-2 mb-2"><strong class="text-danger"><i class="bi bi-ui-checks me-1"></i>ผลการตรวจเฉพาะจุด:</strong></div>
              <div class="col-12" id="detailEqDataContainer">
                <div class="p-2 bg-light rounded small" id="detailEqDataText">-</div>
              </div>
`;

html = html.replace('<div class="col-6 mb-2"><strong>ขนาดบรรจุ:</strong> <span id="detailWeight">-</span> lb</div>', detailsHtml);

// JS for modal
const modalJs = `
    function openTankDetailModal(tankId) {
      const t = allTanks.find(x => x.FireTank === tankId);
      if (!t) return;
      $('#detailId').text(t.FireTank);
      $('#detailType').text(t.Types || '-');
      $('#detailArea').text(t.Area || '-');
      $('#detailInuse').text(t.Inuse || '-');
      $('#detailLastcheck').text(t.Lastcheck || '-');
      $('#detailExptank').text(t.Exptank || '-');
      $('#detailWeight').text(t.Weight || '-');
      $('#detailInspector').text(t.Inspector || '-');
      $('#detailResponsible').text(t.Responsible || '-');
      $('#detailRemark').text(t.Remark || '-');
      
      // EqData
      let eqHtml = '-';
      if (t.EqData && t.EqData !== '{}') {
        try {
          const d = JSON.parse(t.EqData);
          if (t.EqType === 'fhc') {
            eqHtml = \`กระจก/ตู้: \${d.glass ? '✅' : '❌'} | วาล์ว: \${d.valve ? '✅' : '❌'}<br>สายฉีด: \${d.hose ? '✅' : '❌'} | หัวฉีด: \${d.nozzle ? '✅' : '❌'}\`;
          } else if (t.EqType === 'fh') {
            eqHtml = \`สายฉีด: \${d.hose ? '✅' : '❌'} | ข้อต่อ: \${d.coupling ? '✅' : '❌'}\`;
          } else if (t.EqType === 'hd') {
            eqHtml = \`วาล์ว: \${d.valve ? '✅' : '❌'} | ข้อต่อ: \${d.coupling ? '✅' : '❌'}\`;
          } else if (t.EqType === 'tank') {
            eqHtml = \`เกจ์: \${d.gauge ? '✅' : '❌'} | ถัง: \${d.body ? '✅' : '❌'}<br>ซีล/สลัก: \${d.leak ? '✅' : '❌'} | น้ำหนัก: \${d.weight ? '✅' : '❌'}\`;
          }
        } catch(e) {}
      }
      $('#detailEqDataText').html(eqHtml);

      if (t.ReadyorNot === 'Ready') {
`;

html = html.replace(/function openTankDetailModal\(tankId\) \{[\s\S]*?if \(t\.ReadyorNot === 'Ready'\) \{/, modalJs);

fs.writeFileSync('index.html', html, 'utf8');
