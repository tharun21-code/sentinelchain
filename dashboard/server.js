require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');

const app = express();
const port = 4000;

app.use(express.json());
app.use('/', express.static(path.join(__dirname, 'public')));

// GET /api/report
app.get('/api/report', (req, res) => {
  const reportPath = path.join(__dirname, '..', 'ledger', 'report.json');
  if (fs.existsSync(reportPath)) {
    const content = fs.readFileSync(reportPath, 'utf8').trim();
    if (content) {
      try {
        const report = JSON.parse(content);
        res.json(report);
      } catch (e) {
        res.json({});
      }
    } else {
      res.json({});
    }
  } else {
    res.json({});
  }
});

// GET /api/events
app.get('/api/events', (req, res) => {
  const eventsPath = path.join(__dirname, '..', 'ledger', 'events.log');
  if (fs.existsSync(eventsPath)) {
    const content = fs.readFileSync(eventsPath, 'utf8').trim();
    if (content) {
      const lines = content.split('\n').filter(line => line.trim());
      const events = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      }).filter(event => event !== null);
      res.json(events);
    } else {
      res.json([]);
    }
  } else {
    res.json([]);
  }
});

// POST /api/coderabbit
app.post('/api/coderabbit', (req, res) => {
  // Set env vars from last_import.json if available
  const lastImportPath = path.join(__dirname, '..', 'ledger', 'last_import.json');
  let envVars = { ...process.env };
  if (fs.existsSync(lastImportPath)) {
    try {
      const lastImport = JSON.parse(fs.readFileSync(lastImportPath, 'utf8'));
      envVars.GITHUB_OWNER = lastImport.owner;
      envVars.GITHUB_REPO = lastImport.repo;
    } catch (e) {
      // ignore
    }
  }
  exec('node agents/fetch_pr_comments.js', { cwd: path.join(__dirname, '..'), env: envVars }, (error, stdout, stderr) => {
    if (error) {
      res.json({ success: false, error: error.message, stderr });
    } else {
      res.json({ success: true, stdout, stderr });
    }
  });
});

// POST /api/fetch-pr-comments
app.post('/api/fetch-pr-comments', (req, res) => {
  // Set env vars from last_import.json if available
  const lastImportPath = path.join(__dirname, '..', 'ledger', 'last_import.json');
  let envVars = { ...process.env };
  if (fs.existsSync(lastImportPath)) {
    try {
      const lastImport = JSON.parse(fs.readFileSync(lastImportPath, 'utf8'));
      envVars.GITHUB_OWNER = lastImport.owner;
      envVars.GITHUB_REPO = lastImport.repo;
    } catch (e) {
      // ignore
    }
  }
  exec('node agents/fetch_pr_comments.js', { cwd: path.join(__dirname, '..'), env: envVars }, (error, stdout, stderr) => {
    if (error) {
      res.json({ success: false, error: error.message, stderr });
    } else {
      res.json({ success: true, stdout, stderr });
    }
  });
});

// POST /api/fetch-coderabbit
app.post('/api/fetch-coderabbit', (req, res) => {
  const pr = (req.body && req.body.pr) || process.env.PR_NUMBER || '1';
  try {
    // run agent synchronously and return basic output
    const spawn = require('child_process').spawnSync;
    const out = spawn('node', ['agents/fetch_pr_comments.js'], { env: Object.assign({}, process.env, { PR_NUMBER: pr }), timeout: 60000 });
    const stdout = out.stdout ? out.stdout.toString() : '';
    const stderr = out.stderr ? out.stderr.toString() : '';
    res.json({ ok: true, pr, stdout: stdout.slice(0,2000), stderr: stderr.slice(0,2000) });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/run-pipeline
app.post('/api/run-pipeline', (req, res) => {
  exec('node orchestrator/run_pipeline.js', { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
    const output = stdout + (stderr ? '\nSTDERR:\n' + stderr : '');
    const status = error ? 'failed' : 'completed';

    // Log to ledger
    const fs = require('fs');
    const eventsPath = path.join(__dirname, '..', 'ledger', 'events.log');
    fs.appendFileSync(eventsPath, JSON.stringify({
      time: new Date().toISOString(),
      type: 'pipeline_run',
      status,
      output: output.slice(0, 10000) // Limit log size
    }) + '\n', 'utf8');

    if (error) {
      res.json({ ok: false, error: error.message, output });
    } else {
      res.json({ ok: true, output });
    }
  });
});

// POST /api/kestra/run-workflow
app.post('/api/kestra/run-workflow', async (req, res) => {
  const { trigger } = req.body || {};

  try {
    const KESTRA_URL = process.env.KESTRA_URL;

    if (KESTRA_URL) {
      // Call Kestra API
      const kestraResponse = await fetch(`${KESTRA_URL}/api/v1/executions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          namespace: 'dev.sentinelchain',
          flowId: 'sentinelchain_pipeline',
          inputs: {
            trigger_type: trigger || 'dashboard'
          }
        })
      });

      if (!kestraResponse.ok) {
        throw new Error(`Kestra API error: ${kestraResponse.status}`);
      }

      const kestraResult = await kestraResponse.json();
      res.json({
        ok: true,
        kestra_execution_id: kestraResult.id,
        message: 'Kestra workflow started'
      });
    } else {
      // Fallback: run agent directly and execute decision
      const { execSync } = require('child_process');
      const fs = require('fs');

      // Run kestra agent
      const agentOutput = execSync('node agents/kestra_agent.js', {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8'
      });

      let decision;
      try {
        decision = JSON.parse(agentOutput.trim());
      } catch (e) {
        decision = { decision: 'noop', reason: 'Failed to parse agent output', summary: agentOutput };
      }

      // Execute based on decision
      let actionResult = { message: 'No action taken' };

      if (decision.decision === 'auto_pr') {
        // Check if imported repo exists
        const lastImportPath = path.join(__dirname, '..', 'ledger', 'last_import.json');
        if (fs.existsSync(lastImportPath)) {
          try {
            const pipelineOutput = execSync('node orchestrator/run_pipeline.js', {
              cwd: path.join(__dirname, '..'),
              encoding: 'utf8',
              timeout: 300000 // 5 minutes
            });
            actionResult = { message: 'Full pipeline executed', output: pipelineOutput };
          } catch (error) {
            actionResult = { message: 'Pipeline execution failed', error: error.message };
          }
        } else {
          actionResult = { message: 'No imported repository found - import a repo first' };
        }
      } else if (decision.decision === 'monitor') {
        // Log monitoring event
        const event = {
          time: new Date().toISOString(),
          type: 'kestra_monitor_notification',
          message: 'SentinelChain monitoring triggered from dashboard',
          decision: decision
        };
        fs.appendFileSync(path.join(__dirname, '..', 'ledger', 'events.log'), JSON.stringify(event) + '\n');
        actionResult = { message: 'Monitoring notification logged' };
      } else {
        // Log noop event
        const event = {
          time: new Date().toISOString(),
          type: 'kestra_noop',
          reason: decision.reason || 'No action required',
          decision: decision
        };
        fs.appendFileSync(path.join(__dirname, '..', 'ledger', 'events.log'), JSON.stringify(event) + '\n');
        actionResult = { message: 'No operation logged' };
      }

      res.json({
        ok: true,
        decision: decision.decision,
        reason: decision.reason,
        summary: decision.summary,
        action: actionResult.message,
        output: actionResult.output
      });
    }
  } catch (error) {
    console.error('Kestra workflow error:', error);
    res.status(500).json({
      ok: false,
      error: error.message,
      message: 'Failed to run Kestra workflow'
    });
  }
});

// POST /api/import-repo
app.post('/api/import-repo', async (req, res) => {
  const { repoUrl } = req.body;
  if (!repoUrl) {
    return res.status(400).json({ error: 'Missing repoUrl in request body' });
  }

  // Validate URL format
  const urlPattern = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)$/;
  const match = repoUrl.match(urlPattern);
  if (!match) {
    return res.status(400).json({ error: 'Invalid GitHub URL format. Expected: https://github.com/<owner>/<repo>' });
  }

  const owner = match[1];
  const repo = match[2];

  // Create repos directory if it doesn't exist
  const reposDir = path.join(__dirname, '..', 'repos');
  if (!fs.existsSync(reposDir)) {
    fs.mkdirSync(reposDir, { recursive: true });
  }

  // Create owner directory
  const ownerDir = path.join(reposDir, owner);
  if (!fs.existsSync(ownerDir)) {
    fs.mkdirSync(ownerDir, { recursive: true });
  }

  // Remove existing repo folder if it exists
  const repoPath = path.join(ownerDir, repo);
  if (fs.existsSync(repoPath)) {
    execSync(`rmdir /s /q "${repoPath}"`, { stdio: 'inherit' });
  }

  try {
    // Get GitHub App installation token for cloning
    const { getInstallationToken } = require('../github/getInstallationToken.mjs');
    const installationId = process.env.GITHUB_INSTALLATION_ID;

    if (!installationId) {
      return res.status(500).json({ error: 'GitHub App installation ID not configured' });
    }

    const installationToken = await getInstallationToken(installationId);
    const tokenUrl = `https://x-access-token:${installationToken}@github.com/${owner}/${repo}.git`;

    // Clone the repository using token authentication
    exec(`git clone "${tokenUrl}" "${repoPath}"`, { timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Git clone failed:', error.message);
        // Log failure event
        const failEvent = {
          time: new Date().toISOString(),
          type: 'repo_import_failed',
          url: repoUrl,
          owner,
          repo,
          error: error.message
        };
        fs.appendFileSync(path.join(__dirname, '..', 'ledger', 'events.log'), JSON.stringify(failEvent) + '\n', 'utf8');
        return res.status(500).json({ error: `Failed to clone repository: ${error.message}` });
      }

      // Log success event
      const event = {
        time: new Date().toISOString(),
        type: 'repo_import',
        url: repoUrl,
        owner,
        repo,
        path: `repos/${owner}/${repo}`
      };
      fs.appendFileSync(path.join(__dirname, '..', 'ledger', 'events.log'), JSON.stringify(event) + '\n', 'utf8');

      // Create last_import.json
      const lastImport = {
        owner,
        repo,
        path: `repos/${owner}/${repo}`,
        imported_at: new Date().toISOString()
      };
      fs.writeFileSync(path.join(__dirname, '..', 'ledger', 'last_import.json'), JSON.stringify(lastImport, null, 2));

      res.json({ ok: true, owner, repo, path: `repos/${owner}/${repo}` });
    });
  } catch (error) {
    console.error('Token retrieval failed:', error.message);
    return res.status(500).json({ error: `Failed to authenticate with GitHub: ${error.message}` });
  }
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
