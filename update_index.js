const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Add currentEqType
html = html.replace('let allTanks = [];', 'let allTanks = [];\n    let currentEqType = "tank";');

// 2. Add Tab Click Listener in $(document).ready
const tabListener = `
      $('#equipmentTabs button').on('click', function (e) {
        e.preventDefault();
        $('#equipmentTabs button').removeClass('active bg-danger text-white').addClass('bg-white border text-dark');
        $(this).removeClass('bg-white border text-dark').addClass('active bg-danger text-white');
        currentEqType = $(this).data('eq-type');
        renderDashboard();
      });
`;
html = html.replace('$(\'#filterType, #filterArea, #filterCheck, #filterReady, #searchInput\')', tabListener + '\n      $(\'#filterType, #filterArea, #filterCheck, #filterReady, #searchInput\')');

// 3. Update renderDashboard
// Replace `let filtered = allTanks;` with `let filtered = allTanks.filter(t => (t.EqType || 'tank') === currentEqType);`
html = html.replace('let filtered = allTanks;', 'let filtered = allTanks.filter(t => (t.EqType || \'tank\') === currentEqType);');

// 4. Also inside check.html we will need to filter by currentEqType, but wait! The "Go Check" page is separate.
// check.html doesn't have tabs yet. It just lists all tanks in the dropdown.

fs.writeFileSync('index.html', html, 'utf8');
