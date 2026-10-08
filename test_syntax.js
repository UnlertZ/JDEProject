const fs = require('fs');
const acorn = require('acorn');
const html = fs.readFileSync('index.html', 'utf8');
const scripts = html.match(/<script>([\s\S]*?)<\/script>/gi);
if (scripts) {
  scripts.forEach((s, idx) => {
    const code = s.replace(/<\/?script>/g, '');
    try {
      acorn.parse(code, { ecmaVersion: 2020 });
      console.log(`Script ${idx} OK`);
    } catch (e) {
      console.error(`Script ${idx} ERROR:`, e.message);
      // print 3 lines around the error
      const lines = code.split('\n');
      const start = Math.max(0, e.loc.line - 3);
      const end = Math.min(lines.length, e.loc.line + 2);
      console.log(lines.slice(start, end).join('\n'));
    }
  });
}
