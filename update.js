const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Navbar
html = html.replace('navbar-dark bg-danger shadow-sm sticky-top', 'navbar-light bg-white sticky-top');
html = html.replace(/style="filter: brightness\(0\) invert\(1\);"/g, '');

// Register button
html = html.replace('<a href="register.html" class="btn btn-outline-light btn-sm fw-semibold">', '<a href="register.html" class="btn btn-outline-secondary btn-sm fw-semibold">');

// Cards
html = html.replace(/bg-primary-gradient text-white /g, '');
html = html.replace(/bg-success-gradient text-white /g, '');
html = html.replace(/bg-warning-gradient text-white /g, '');
html = html.replace(/bg-danger-gradient text-white /g, '');
html = html.replace(/<div class="card-pattern-overlay"><\/div>/g, '');

// Progress bars
html = html.replace(/background-color: rgba\(255,255,255,0\.25\)/g, 'background-color: #F3F4F6');
html = html.replace(/class="progress-bar bg-white" id="barPercentChecked"/g, 'class="progress-bar bg-success" id="barPercentChecked"');
html = html.replace(/class="progress-bar bg-white" id="barPercentNotChecked"/g, 'class="progress-bar bg-warning" id="barPercentNotChecked"');
html = html.replace(/class="progress-bar bg-white" role="progressbar"/g, 'class="progress-bar bg-dark" role="progressbar"');

// Modals
html = html.replace(/class="modal-header" style="background:#A04830;"/g, 'class="modal-header"');
html = html.replace(/class="modal-title text-white/g, 'class="modal-title');
html = html.replace(/class="modal-header text-white border-0 py-3" style="background: linear-gradient.*?;"/g, 'class="modal-header border-0 py-3"');
html = html.replace(/class="modal-header bg-gradient bg-info text-white py-3 border-0"/g, 'class="modal-header py-3 border-0"');

// Table
html = html.replace(/<thead class="table-dark">/g, '<thead>');

// Version
html = html.replace(/css\/style\.css\?v=[\w\.]+/g, 'css/style.css?v=20261008_v3.0');

fs.writeFileSync('index.html', html, 'utf8');
console.log('Done!');
