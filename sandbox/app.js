const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

const app = express();
const port = 3001;

app.use(bodyParser.json());

app.post('/run', (req, res) => {
  console.log('RUN hit');
  const { cmd } = req.body;
  if (!cmd) {
    return res.status(400).json({ error: 'No cmd provided' });
  }
  exec(cmd, { timeout: 5000 }, (error, stdout, stderr) => {
    if (error) {
      res.json({ error: error.message, stderr });
    } else {
      res.json({ stdout, stderr });
    }
  });
});

app.post('/honeypot', (req, res) => {
  console.log('HONEYPOT HIT');
  console.log('Body:', req.body);
  res.json({ message: 'Honeypot triggered' });
});

app.listen(port, () => {
  console.log(`Sandbox listening on port ${port}`);
});
