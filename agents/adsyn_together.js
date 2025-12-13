require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const API_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';

// Get repoPath from ledger/last_import.json or CLI argument
let repoPath = process.argv[2];
if (!repoPath) {
  try {
    const importPath = path.join(__dirname, '..', 'ledger', 'last_import.json');
    if (fs.existsSync(importPath)) {
      const importData = JSON.parse(fs.readFileSync(importPath, 'utf8'));
      repoPath = path.join(__dirname, '..', importData.path);
    } else {
      repoPath = './repos/testrepo'; // fallback
    }
  } catch (error) {
    console.error('Error reading last_import.json:', error.message);
    repoPath = './repos/testrepo'; // fallback
  }
}

// Analyze repository for vulnerability patterns
function analyzeRepoForPayloads(targetPath) {
  const vulnerabilities = {
    commandInjection: false,
    sqlInjection: false,
    xss: false,
    pathTraversal: false,
    evalUsage: false,
    expressRoutes: [],
    authPatterns: false
  };

  function scanDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;

    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scanDirectory(fullPath);
      } else if (stat.isFile() && item.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');

        // Check for command injection patterns
        if (/exec\(|spawn\(|execSync\(/g.test(content)) {
          vulnerabilities.commandInjection = true;
        }

        // Check for eval usage
        if (/eval\(|Function\s*\(/g.test(content)) {
          vulnerabilities.evalUsage = true;
        }

        // Check for Express routes
        const routeMatches = content.match(/(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g);
        if (routeMatches) {
          routeMatches.forEach(match => {
            const routeMatch = match.match(/(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/);
            if (routeMatch) {
              vulnerabilities.expressRoutes.push({
                method: routeMatch[1],
                route: routeMatch[2]
              });
            }
          });
        }

        // Check for SQL-like patterns
        if (/SELECT|INSERT|UPDATE|DELETE/g.test(content)) {
          vulnerabilities.sqlInjection = true;
        }

        // Check for template rendering (potential XSS)
        if (/res\.render\(|res\.send\(|innerHTML/g.test(content)) {
          vulnerabilities.xss = true;
        }

        // Check for auth patterns
        if (/jwt|passport|session|cookie/g.test(content)) {
          vulnerabilities.authPatterns = true;
        }
      }
    }
  }

  scanDirectory(targetPath);
  return vulnerabilities;
}

async function callModel(vulnerabilities, faamGraph = null) {
  const vulnSummary = Object.keys(vulnerabilities)
    .filter(key => vulnerabilities[key] && key !== 'expressRoutes')
    .join(', ');

  const routes = vulnerabilities.expressRoutes.slice(0, 5).map(r => `${r.method.toUpperCase()} ${r.route}`).join(', ');

  let faamContext = '';
  if (faamGraph) {
    const issueSummary = faamGraph.issues?.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {});
    faamContext = `\nFAAM Analysis: ${faamGraph.nodes?.length || 0} files scanned, issues: ${JSON.stringify(issueSummary)}`;
  }

  const prompt = `Analyze this JavaScript application for security testing.

Repository: ${repoPath}
Static vulnerability analysis: ${vulnSummary || 'none detected'}
Express routes: ${routes || 'none found'}${faamContext}

Generate a realistic JSON attack payload for security testing. If obvious vulnerabilities exist, exploit them. Otherwise, create probing payloads for hypothesis-driven testing. Focus on command injection, code injection, XSS, or input validation bypasses.

Respond only with valid JSON:

Example format:
{
  "type": "command_injection",
  "attack": "malicious command here",
  "target": "/api/route",
  "description": "Brief description"
}`;

  try {
    const response = await axios.post(API_URL, {
      model: process.env.OPENROUTER_MODEL || 'mistralai/devstral-2512:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 200
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const content = response.data.choices[0].message.content.trim();
    // Clean up response (remove markdown code blocks if present)
    const cleanContent = content.replace(/```json\s*|\s*```/g, '');
    const payload = JSON.parse(cleanContent);
    return { success: true, payload, raw: content };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('FORCING OpenRouter payload generation');
  console.log(`Analyzing repository: ${repoPath}`);

  const vulnerabilities = analyzeRepoForPayloads(repoPath);
  console.log('Detected vulnerabilities:', vulnerabilities);

  // Load FAAM graph if available
  let faamGraph = null;
  try {
    const graphPath = path.join(__dirname, '..', 'ledger', 'graph.json');
    if (fs.existsSync(graphPath)) {
      faamGraph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
      console.log('Loaded FAAM graph with', faamGraph.nodes?.length || 0, 'nodes and', faamGraph.issues?.length || 0, 'issues');
    }
  } catch (error) {
    console.log('Could not load FAAM graph:', error.message);
  }

  if (API_KEY) {
    // Always call OpenRouter API in hybrid mode
    console.log('Calling OpenRouter API');
    console.log('Using OpenRouter model:', process.env.OPENROUTER_MODEL || 'mistralai/devstral-2512:free');
    const result = await callModel(vulnerabilities, faamGraph);
    console.log('OpenRouter response received');

    const timestamp = new Date().toISOString();

    // Log to model_calls.log
    const modelLog = {
      timestamp,
      agent: 'adsyn_together',
      prompt: "Analyze this JavaScript application...",
      response: result.success ? result.raw : null,
      success: result.success,
      error: result.success ? null : result.error,
      repo_path: repoPath
    };
    const modelLogPath = path.join(__dirname, '..', 'ledger', 'model_calls.log');
    fs.appendFileSync(modelLogPath, JSON.stringify(modelLog) + '\n');

    // Log to events.log
    const event = {
      time: timestamp,
      type: 'model_call',
      agent: 'adsyn_together',
      success: result.success,
      repo_path: repoPath
    };
    const eventsPath = path.join(__dirname, '..', 'ledger', 'events.log');
    fs.appendFileSync(eventsPath, JSON.stringify(event) + '\n');

    if (result.success) {
      // Use AI-generated payload
      const payloadPath = path.join(__dirname, '..', 'ledger', 'last_payload.json');
      const entry = {
        timestamp,
        payload: result.payload,
        type: 'adsyn_hybrid',
        repo_path: repoPath,
        vulnerabilities_analyzed: Object.keys(vulnerabilities).filter(key => vulnerabilities[key])
      };
      fs.writeFileSync(payloadPath, JSON.stringify(entry, null, 2));
      console.log('Hybrid AI-generated payload:', JSON.stringify(result.payload));
      process.exit(0); // Success
    } else {
      console.log('OpenRouter unavailable — using deterministic fallback');
      process.exit(1); // Failure, let pipeline call fallback
    }
  } else {
    console.log('OpenRouter API key missing — using deterministic fallback');
    process.exit(1); // Failure, let pipeline call fallback
  }
}

main().catch(console.error);
