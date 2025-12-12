const fs = require('fs');
const path = require('path');

// Read report.json
const reportPath = path.join(__dirname, 'report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// Generate HTML
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SentinelChain Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1, h2 { color: #333; }
    pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>SentinelChain MVP Report</h1>

  <h2>Meta</h2>
  <pre>${JSON.stringify(report.meta, null, 2)}</pre>

  <h2>Summary</h2>
  <pre>${JSON.stringify(report.summary, null, 2)}</pre>

  <h2>Graph</h2>
  <pre>${JSON.stringify(report.graph, null, 2)}</pre>

  <h2>Events</h2>
  <pre>${JSON.stringify(report.events, null, 2)}</pre>
</body>
</html>
`;

// Write to report.html
const htmlPath = path.join(__dirname, 'report.html');
fs.writeFileSync(htmlPath, html);

console.log('HTML report written to:', htmlPath);
