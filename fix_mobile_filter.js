const fs = require('fs');
let index = fs.readFileSync('index.html', 'utf8');

const mobileFilterLogic = `
        if ((tank.EqType || 'tank') !== currentEqType) return false;
        if (selType && tank.Types !== selType) return false;
`;

index = index.replace(
  'if (selType && tank.Types !== selType) return false;',
  mobileFilterLogic
);

fs.writeFileSync('index.html', index, 'utf8');
console.log("Added EqType filtering to renderMobileCards");
