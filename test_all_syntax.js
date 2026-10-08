const fs = require('fs');
const acorn = require('acorn');
const files = ['add.html', 'check.html', 'edit.html', 'index.html'];

files.forEach(file => {
  const html = fs.readFileSync(file, 'utf8');
  const scripts = html.match(/<script>([\s\S]*?)<\/script>/gi);
  if (scripts) {
    scripts.forEach((s, idx) => {
      const code = s.replace(/<\/?script>/g, '');
      try {
        acorn.parse(code, { ecmaVersion: 2020 });
      } catch (e) {
        console.error(`[${file}] Script ${idx} ERROR:`, e.message);
      }
    });
  }
});
