const fs = require('fs');
let index = fs.readFileSync('index.html', 'utf8');

index = index.replace(
  "$('#equipmentTabs button').on('click', function (e) {",
  "$('#pills-tab button').on('shown.bs.tab', function (e) {"
);
index = index.replace(
  "$('#equipmentTabs button').removeClass('active bg-danger text-white').addClass('bg-white border text-dark');",
  ""
);
index = index.replace(
  "$(this).removeClass('bg-white border text-dark').addClass('active bg-danger text-white');",
  ""
);

fs.writeFileSync('index.html', index, 'utf8');
console.log("Fixed tab listener");
