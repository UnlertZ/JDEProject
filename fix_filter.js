const fs = require('fs');
let index = fs.readFileSync('index.html', 'utf8');

const filterLogic = `
      // Filter tanks by currentEqType before rendering
      tanks = tanks.filter(t => (t.EqType || 'tank') === currentEqType);
      
      window._liveTanksReferenceMap = {};
`;

index = index.replace(
  'window._liveTanksReferenceMap = {};',
  filterLogic
);

fs.writeFileSync('index.html', index, 'utf8');
console.log("Added EqType filtering to renderDashboard");
