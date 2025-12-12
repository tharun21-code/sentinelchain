const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const port = 4000;

app.use(express.json());
app.use('/', express.static(path.join(__dirname, 'public')));

// GET /api/report
app.get('/api/report', (req, res) => {
  const reportPath = path.join(__dirname, '..', 'ledger', 'report.json');
  if (fs.existsSync(reportPath)) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    res.json(report);
  } else {
    res.status(404).json({ error: 'Report not found' });
  }
});

// GET /api/events
app.get('/api/events', (req, res) => {
  const eventsPath = path.join(__dirname, '..', 'ledger', 'events.log');
  if (fs.existsSync(eventsPath)) {
    const events = fs.readFileSync(eventsPath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    res.json(events);
  } else {
    res.json([]);
  }
});

// POST /api/coderabbit
app.post('/api/coderabbit', (req, res) => {
  exec('node agents/coderabbit_request.js', { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
    if (error) {
      res.json({ success: false, error: error.message, stderr });
    } else {
      res.json({ success: true, stdout, stderr });
    }
  });
});

// POST /api/run-stage
app.post('/api/run-stage', (req, res) => {
  const { stage } = req.body;
  let command;
  switch (stage) {
    case 'faam':
      command = 'node orchestrator/faam.js';
      break;
    case 'gen_payload':
      command = 'node agents/adsyn.js';
      break;
    case 'run_attack':
      command = 'node agents/red.js';
      break;
    case 'autofix':
      command = 'node agents/autofix.js';
      break;
    case 'export_report':
      command = 'node ledger/export.js && node ledger/export_html.js';
      break;
    default:
      return res.status(400).json({ error: 'Invalid stage' });
  }

  exec(command, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
    if (error) {
      res.json({ success: false, error: error.message, stderr });
    } else {
      res.json({ success: true, stdout, stderr });
    }
  });
});

app.listen(port, () => {
  console.log(`Dashboard listening on http://localhost:${port}`);
});
