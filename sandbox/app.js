const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

const app = express();
const port = 3000;

app.use(bodyParser.json());

function sanitize(cmd) {
  const whitelist = ['echo', 'date', 'uname', 'whoami'];
  const dangerous = [';', '|', '&', '`', '$', '(', ')', '<', '>', 'rm', 'del', 'format', 'shutdown', 'reboot', 'sudo', 'su', 'chmod', 'chown', 'dd', 'mkfs', 'fdisk', 'wget', 'curl', 'nc', 'netcat', 'bash', 'sh', 'python', 'perl', 'ruby', 'node'];

  const baseCmd = cmd.trim().split(' ')[0];
  if (!whitelist.includes(baseCmd)) return null;

  for (let token of dangerous) {
    if (cmd.includes(token)) return null;
  }

  return cmd;
}

app.post('/run', (req, res) => {
  console.log('RUN hit');
  const { cmd } = req.body;
  if (!cmd) {
    return res.status(400).json({ error: 'No cmd provided' });
  }
  let safeCmd = sanitize(cmd);
  if (!safeCmd) {
    return res.status(400).json({ error: 'forbidden' });
  }
  const safeCmd = sanitize(safeCmd);
  if (!safeCmd) {
    return res.status(400).json({ error: 'forbidden command' });
  }
  const safeCmd = sanitize(safeCmd);
  if (!safeCmd) {
    return res.status(400).json({ error: 'forbidden command' });
  }
  const safeCmd = sanitize(safeCmd);
  if (!safeCmd) {
    return res.status(400).json({ error: 'forbidden command' });
  }
  const safeCmd = sanitize(safeCmd);
  if (!safeCmd) {
    return res.status(400).json({ error: 'forbidden command' });
  }
  exec(safeCmd, { timeout: 5000 }, (error, stdout, stderr) => {
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
