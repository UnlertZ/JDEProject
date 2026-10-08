const fs = require('fs');
let html = fs.readFileSync('edit.html', 'utf8');

const hideLogic = `
      // UI Changes for non-tanks
      const eqType = tank.EqType || 'tank';
      if (eqType !== 'tank') {
        const wContainer = document.getElementById('weightInput').closest('.col-md-4');
        if (wContainer) wContainer.classList.add('d-none');
        const tankIdLabel = document.querySelector('label.text-danger').parentNode;
        if (tankIdLabel) tankIdLabel.innerHTML = 'ชื่อ/รหัสอุปกรณ์';
        const typesLabel = document.querySelector('label[for="typeInput"]');
        if (typesLabel) typesLabel.innerHTML = 'ลักษณะอุปกรณ์ (Types)';
      }
`;

html = html.replace(
  "document.getElementById('currentPicAreaBox').classList.remove('d-none');\n      }",
  "document.getElementById('currentPicAreaBox').classList.remove('d-none');\n      }\n" + hideLogic
);

fs.writeFileSync('edit.html', html, 'utf8');
console.log("Added UI hide logic to edit.html");
