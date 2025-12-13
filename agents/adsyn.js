const fs = require('fs');
const path = require('path');

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
    expressRoutes: []
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
        if (/eval\(/g.test(content)) {
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
        if (/res\.render\(|res\.send\(/g.test(content)) {
          vulnerabilities.xss = true;
        }
      }
    }
  }

  scanDirectory(targetPath);
  return vulnerabilities;
}

// Generate context-aware payload
function generatePayload(vulnerabilities) {
  let payload;

  if (vulnerabilities.commandInjection) {
    // Command injection payload
    payload = {
      type: 'command_injection',
      attack: 'ls',
      description: 'Command injection via user input'
    };
  } else if (vulnerabilities.evalUsage) {
    // Code injection payload
    payload = {
      type: 'code_injection',
      attack: 'process.exit()',
      description: 'Code injection via eval'
    };
  } else if (vulnerabilities.expressRoutes.length > 0) {
    // HTTP request payload for first route
    const route = vulnerabilities.expressRoutes[0];
    payload = {
      type: 'http_request',
      method: route.method.toUpperCase(),
      url: route.route,
      description: `HTTP request to ${route.method.toUpperCase()} ${route.route}`
    };
  } else if (vulnerabilities.sqlInjection) {
    // SQL injection payload
    payload = {
      type: 'sql_injection',
      attack: "'; DROP TABLE users; --",
      description: 'SQL injection attack'
    };
  } else {
    // Default payload
    payload = {
      type: 'default',
      attack: 'test',
      description: 'Generic test payload'
    };
  }

  return payload;
}

// Main execution
try {
  console.log(`Analyzing repository: ${repoPath}`);

  const vulnerabilities = analyzeRepoForPayloads(repoPath);
  console.log('Detected vulnerabilities:', vulnerabilities);

  const payload = generatePayload(vulnerabilities);
  console.log('Generated payload:', payload);

  // Write to ledger/last_payload.json
  const ledgerPath = path.join(__dirname, '..', 'ledger', 'last_payload.json');
  const entry = {
    timestamp: new Date().toISOString(),
    payload: payload,
    type: 'adsyn_deterministic',
    repo_path: repoPath,
    vulnerabilities_found: Object.keys(vulnerabilities).filter(key => vulnerabilities[key])
  };
  fs.writeFileSync(ledgerPath, JSON.stringify(entry, null, 2));

  // Print the payload
  console.log('Payload:', JSON.stringify(payload));
} catch (error) {
  console.error('Payload generation failed:', error.message);
  process.exit(1);
}
