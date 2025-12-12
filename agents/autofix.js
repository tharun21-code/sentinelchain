const fs = require('fs');
const path = require('path');

// Read sandbox/app.js
const appPath = path.join(__dirname, '..', 'sandbox', 'app.js');
let code = fs.readFileSync(appPath, 'utf8');

// Insert sanitize function before app.post('/run'
const sanitizeFunction = `
function sanitize(cmd) {
  const whitelist = ['echo', 'date', 'uname', 'whoami'];
  const dangerous = [';', '|', '&', '\`', '$', '(', ')', '<', '>', 'rm', 'del', 'format', 'shutdown', 'reboot', 'sudo', 'su', 'chmod', 'chown', 'dd', 'mkfs', 'fdisk', 'wget', 'curl', 'nc', 'netcat', 'bash', 'sh', 'python', 'perl', 'ruby', 'node'];

  const baseCmd = cmd.trim().split(' ')[0];
  if (!whitelist.includes(baseCmd)) return null;

  for (let token of dangerous) {
    if (cmd.includes(token)) return null;
  }

  return cmd;
}
`;

const runPostIndex = code.indexOf("app.post('/run'");
code = code.slice(0, runPostIndex) + sanitizeFunction + '\n' + code.slice(runPostIndex);

// Modify the /run handler
const oldExec = `  exec(cmd, { timeout: 5000 }, (error, stdout, stderr) => {`;
const newExec = `  const safeCmd = sanitize(cmd);
  if (!safeCmd) {
    return res.status(400).json({ error: 'forbidden' });
  }
  exec(safeCmd, { timeout: 5000 }, (error, stdout, stderr) => {`;
code = code.replace(oldExec, newExec);

// Write to sandbox/app.patched.js
const patchedPath = path.join(__dirname, '..', 'sandbox', 'app.patched.js');
fs.writeFileSync(patchedPath, code);

// Append event to ledger/events.log
const event = {
  time: new Date().toISOString(),
  type: 'autofix_patch_written',
  path: 'sandbox/app.patched.js'
};
const eventsPath = path.join(__dirname, '..', 'ledger', 'events.log');
fs.appendFileSync(eventsPath, JSON.stringify(event) + '\n');

console.log('Patched file written to:', patchedPath);
