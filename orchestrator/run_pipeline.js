require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TARGET_REPO_PATH = process.env.TARGET_REPO_PATH || '.';
const TARGET_GITHUB_OWNER = process.env.TARGET_GITHUB_OWNER;
const TARGET_GITHUB_REPO = process.env.TARGET_GITHUB_REPO;

function logEvent(obj) {
  const eventsPath = path.join(__dirname, '..', 'ledger', 'events.log');
  fs.appendFileSync(eventsPath, JSON.stringify(obj) + '\n', 'utf8');
}

function logModelCall(obj) {
  const modelCallsPath = path.join(__dirname, '..', 'ledger', 'model_calls.log');
  fs.appendFileSync(modelCallsPath, JSON.stringify(obj) + '\n', 'utf8');
}

function runStep(stepName, command, description) {
  console.log(`\n🔄 ${stepName}: ${description}`);
  try {
    const result = execSync(command, {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      timeout: 120000
    });

    logEvent({
      time: new Date().toISOString(),
      type: stepName.toLowerCase().replace(/\s+/g, '_') + '_executed',
      command,
      success: true
    });

    console.log(`✅ ${stepName}: Completed`);
    return { success: true, output: result };
  } catch (error) {
    console.log(`❌ ${stepName}: Failed - ${error.message}`);

    logEvent({
      time: new Date().toISOString(),
      type: 'pipeline_error',
      step: stepName,
      error: error.message
    });

    logModelCall({
      timestamp: new Date().toISOString(),
      agent: 'run_pipeline',
      step: stepName,
      error: error.message,
      success: false
    });

    return { success: false, error: error.message };
  }
}

async function runPipeline() {
  // Detect imported repo from last_import.json
  const lastImportPath = path.join(__dirname, '..', 'ledger', 'last_import.json');
  let repoPath = TARGET_REPO_PATH;
  let repoInfo = null;

  if (fs.existsSync(lastImportPath)) {
    try {
      repoInfo = JSON.parse(fs.readFileSync(lastImportPath, 'utf8'));
      repoPath = path.join(__dirname, '..', repoInfo.path);
      console.log('🚀 SentinelChain Pipeline Starting...');
      console.log(`📁 Target Repo: ${repoInfo.path} (${repoInfo.owner}/${repoInfo.repo})`);
    } catch (error) {
      console.error('Error reading last_import.json:', error.message);
      console.log('⚠️ Falling back to default repo path');
    }
  } else {
    console.log('🚀 SentinelChain Pipeline Starting...');
    console.log(`📁 Target Repo: ${repoPath} (default)`);
    console.log('⚠️ No imported repository found. Pipeline will run on default path.');
    console.log('💡 Import a GitHub repository first using the dashboard.');
  }

  const results = {};
  let containerInfo = null;

  // Step 1: FAAM Scanner
  const faamCommand = repoInfo ? `node orchestrator/faam_scan.js "${repoPath}"` : 'node orchestrator/faam_scan.js';
  results.faam = runStep(
    'FAAM Scan',
    faamCommand,
    `Running advanced vulnerability scanner on ${repoInfo ? repoInfo.path : 'default repo'}`
  );

  // Step 2: Payload Generation (try AI first, fallback to deterministic)
  console.log('\n🔄 Payload Generation: Attempting AI generation first');
  let payloadCommand = repoInfo ? `node agents/adsyn_together.js "${repoPath}"` : 'node agents/adsyn_together.js';
  let payloadResult = runStep(
    'Payload Generation (AI)',
    payloadCommand,
    `Generating adversarial payload using AI for ${repoInfo ? repoInfo.path : 'default repo'}`
  );

  if (!payloadResult.success) {
    console.log('⚠️ AI payload generation failed, using deterministic fallback');
    const fallbackCommand = repoInfo ? `node agents/adsyn.js "${repoPath}"` : 'node agents/adsyn.js';
    payloadResult = runStep(
      'Payload Generation (Deterministic)',
      fallbackCommand,
      `Generating payload with deterministic script for ${repoInfo ? repoInfo.path : 'default repo'}`
    );
  }
  results.payload = payloadResult;

  // Step 3: Docker Runner (only if we have an imported repo)
  if (repoInfo) {
    console.log('\n🐳 Starting Docker container for imported repository...');
    const dockerCommand = `node orchestrator/docker_runner.js --repoPath "${repoPath}"`;
    const dockerResult = runStep(
      'Docker Runner',
      dockerCommand,
      `Setting up isolated Docker environment for ${repoInfo.path}`
    );

    if (dockerResult.success) {
      try {
        // Parse the JSON output from docker_runner.js
        const output = dockerResult.output;
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          containerInfo = JSON.parse(jsonMatch[0]);
          if (containerInfo.ok) {
            // Set environment variables for RedAgent
            process.env.TARGET_HOST = 'localhost';
            process.env.TARGET_PORT = containerInfo.hostPort.toString();

            console.log(`✅ Container ready: ${containerInfo.containerName} on port ${containerInfo.hostPort}`);
          }
        }
      } catch (parseError) {
        console.error('Failed to parse Docker runner output:', parseError.message);
      }
    }
    results.docker = dockerResult;
  }

  // Step 4: RedAgent Attack
  const attackCommand = containerInfo ? 'node agents/red.js' : (repoInfo ? `node agents/red.js "${repoPath}"` : 'node agents/red.js');
  results.attack = runStep(
    'RedAgent Attack',
    attackCommand,
    containerInfo
      ? `Executing adversarial attack on containerized app (port ${containerInfo.hostPort})`
      : `Executing adversarial attack simulation on ${repoInfo ? repoInfo.path : 'default repo'}`
  );

  // Step 4: AutoFix (try AI first, fallback to deterministic)
  console.log('\n🔄 AutoFix: Attempting AI-powered fixes first');
  let fixCommand = repoInfo ? `node agents/autofix_together.js "${repoPath}"` : 'node agents/autofix_together.js';
  let fixResult = runStep(
    'AutoFix (AI)',
    fixCommand,
    `Applying AI-generated security patches to ${repoInfo ? repoInfo.path : 'default repo'}`
  );

  if (!fixResult.success) {
    console.log('⚠️ AI autofix failed, using deterministic fallback');
    const fallbackFixCommand = repoInfo ? `node agents/autofix.js "${repoPath}"` : 'node agents/autofix.js';
    fixResult = runStep(
      'AutoFix (Deterministic)',
      fallbackFixCommand,
      `Applying rule-based security patches to ${repoInfo ? repoInfo.path : 'default repo'}`
    );
  }
  results.autofix = fixResult;

  // Step 5: Docker Cleanup (if container was created)
  if (containerInfo) {
    console.log('\n🧹 Cleaning up Docker container...');
    const cleanupCommand = `node orchestrator/docker_cleanup.js ${containerInfo.containerName}`;
    const cleanupResult = runStep(
      'Docker Cleanup',
      cleanupCommand,
      `Removing container ${containerInfo.containerName}`
    );
    results.cleanup = cleanupResult;
  }

  // Step 6: GitHub PR Creation (only if we have an imported repo)
  if (repoInfo && TARGET_GITHUB_OWNER && TARGET_GITHUB_REPO) {
    results.pr = runStep(
      'GitHub PR',
      'node agents/prepare_pr_github.js',
      `Creating security patch pull request for ${repoInfo.owner}/${repoInfo.repo}`
    );
  } else if (repoInfo) {
    console.log('\n⚠️ GitHub PR: Skipped (missing TARGET_GITHUB_OWNER/REPO env vars)');
    results.pr = { success: false, error: 'Missing GitHub credentials' };
  } else {
    console.log('\n⚠️ GitHub PR: Skipped (no imported repository)');
    results.pr = { success: false, error: 'No imported repository' };
  }

  // Step 6: CodeRabbit Review
  results.coderabbit = runStep(
    'CodeRabbit Review',
    'node agents/coderabbit_request.js',
    'Requesting AI code review'
  );

  // Step 7: Report Export
  results.export_json = runStep(
    'Export JSON Report',
    'node ledger/export.js',
    'Generating JSON security report'
  );

  results.export_html = runStep(
    'Export HTML Report',
    'node ledger/export_html.js',
    'Generating HTML security report'
  );

  results.export_pdf = runStep(
    'Export PDF Report',
    'node ledger/export_pdf.js',
    'Generating PDF security report'
  );

  // Final Summary
  console.log('\n🎯 SentinelChain Pipeline Completed');
  console.log('=' .repeat(50));

  const summary = {
    faam: results.faam.success ? '✅ OK' : '❌ Failed',
    payload: results.payload.success ? '✅ OK' : '❌ Failed',
    attack: results.attack.success ? '✅ Executed' : '❌ Failed',
    autofix: results.autofix.success ? '✅ OK' : '❌ Failed',
    pr: results.pr.success ? '✅ Created' : '⚠️ Skipped',
    coderabbit: results.coderabbit.success ? '✅ Requested' : '❌ Failed',
    reports: (results.export_json.success || results.export_html.success || results.export_pdf.success)
      ? '✅ Exported' : '❌ Failed'
  };

  console.log(`FAAM Scan: ${summary.faam}`);
  console.log(`Payload Generation: ${summary.payload}`);
  console.log(`Attack Simulation: ${summary.attack}`);
  console.log(`AutoFix: ${summary.autofix}`);
  console.log(`GitHub PR: ${summary.pr}`);
  console.log(`CodeRabbit Review: ${summary.coderabbit}`);
  console.log(`Reports Exported: ${summary.reports}`);

  // Check for PR URL if PR was created
  if (results.pr.success) {
    try {
      const events = fs.readFileSync(path.join(__dirname, '..', 'ledger', 'events.log'), 'utf8')
        .trim().split('\n')
        .map(line => JSON.parse(line))
        .filter(event => event.type === 'github_pr_created')
        .pop();

      if (events && events.pr_url) {
        console.log(`🔗 PR URL: ${events.pr_url}`);
      }
    } catch (e) {
      // Ignore if we can't read the PR URL
    }
  }

  console.log('\n📊 Pipeline execution logged to ledger/events.log');
  console.log('🔍 Check ledger/graph.json for vulnerability analysis');
  console.log('📄 Reports available in ledger/ directory');

  // Final pipeline completion event
  logEvent({
    time: new Date().toISOString(),
    type: 'pipeline_completed',
    summary,
    target_repo: TARGET_REPO_PATH,
    github_repo: TARGET_GITHUB_OWNER && TARGET_GITHUB_REPO ? `${TARGET_GITHUB_OWNER}/${TARGET_GITHUB_REPO}` : null
  });

  return results;
}

// Run if called directly
if (require.main === module) {
  runPipeline().catch(error => {
    console.error('Pipeline execution failed:', error);
    logEvent({
      time: new Date().toISOString(),
      type: 'pipeline_critical_error',
      error: error.message
    });
    process.exit(1);
  });
}

module.exports = { runPipeline };
