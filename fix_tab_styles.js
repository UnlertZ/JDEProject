const fs = require('fs');
let index = fs.readFileSync('index.html', 'utf8');

const styleBlock = `
  <style>
    #pills-tab .nav-link {
      color: #555;
      background-color: #f8f9fa;
      border: 1px solid #ddd;
      margin: 0 5px;
    }
    #pills-tab .nav-link.active {
      background-color: #dc3545 !important;
      color: #fff !important;
      border-color: #dc3545;
    }
  </style>
</head>
`;

index = index.replace('</head>', styleBlock);

fs.writeFileSync('index.html', index, 'utf8');
console.log("Added tab styles");
