const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Accept repoPath as CLI argument
const repoPath = process.argv[2] || './sandbox';

// Get target host and port from environment (for containerized apps)
const targetHost = process.env.TARGET_HOST || 'localhost';
const targetPort = process.env.SANDBOX_PORT || process.env.TARGET_PORT || '3000';

// Read ledger/last_payload.json
const payloadPath = path.join(__dirname, '..', 'ledger', 'last_payload.json');
const entry = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
const payload = entry.payload;

// Analyze imported repository for server patterns
function analyzeRepoForServer(targetPath) {
  const serverInfo = {
    hasServer: false,
    port: null,
    framework: null,
    routes: []
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

        // Check for Express server
        if (/express\s*\(\)/g.test(content) && /listen\s*\(/g.test(content)) {
          serverInfo.hasServer = true;
          serverInfo.framework = 'express';

          // Extract port from const port = number;
          const portMatch = content.match(/const\s+port\s*=\s*(\d+)/);
          if (portMatch) {
            serverInfo.port = parseInt(portMatch[1]);
          }
        }

        // Check for other server frameworks
        if (/http\.createServer/g.test(content)) {
          serverInfo.hasServer = true;
          serverInfo.framework = 'http';
        }

        // Extract routes
        const routeMatches = content.match(/(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g);
        if (routeMatches) {
          routeMatches.forEach(match => {
            const routeMatch = match.match(/(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/);
            if (routeMatch) {
              serverInfo.routes.push({
                method: routeMatch[1],
                route: routeMatch[2]
              });
            }
          });
        }
      }
    }
  }

  scanDirectory(targetPath);
  return serverInfo;
}

// Simulate attack on detected server
function simulateAttack(serverInfo, payload) {
  if (!serverInfo.hasServer) {
    console.log('No server detected in imported repository. Simulating attack on sandbox instead.');
    // Fall back to original sandbox attack
    return attackSandbox(payload);
  }

  console.log(`Detected ${serverInfo.framework} server on potential port ${serverInfo.port || 'unknown'}`);
  console.log(`Available routes: ${serverInfo.routes.map(r => `${r.method.toUpperCase()} ${r.route}`).join(', ')}`);

  // Simulate attack on detected routes
  const attacks = [];

  if (serverInfo.routes.length > 0) {
    // Attack the first detected route
    const route = serverInfo.routes[0];
    attacks.push({
      type: 'route_attack',
      method: route.method,
      url: `http://localhost:${serverInfo.port || 3000}${route.route}`,
      payload: payload,
      description: `Simulated attack on ${route.method.toUpperCase()} ${route.route}`
    });
  }

  // Generic attack simulation
  attacks.push({
    type: 'generic_attack',
    payload: payload,
    description: 'Generic payload injection simulation'
  });

  return attacks;
}

function attackTarget(payload) {
  // Prepare cmd as a whitelisted command with payload
  const cmd = `echo ${JSON.stringify(payload)}`;

  // Post to target (could be sandbox or containerized app)
  const url = `http://${targetHost}:${targetPort}/run`;
  const data = { cmd };

  console.log(`Attacking target: ${url}`);

  return axios.post(url, data, { timeout: 10000 })
    .then(response => {
      console.log('Target Response:', response.data);
      return {
        success: true,
        response: response.data,
        target: `${targetHost}:${targetPort}`,
        url: url
      };
    })
    .catch(error => {
      console.log('Target Error:', error.message);
      return {
        success: false,
        error: error.message,
        target: `${targetHost}:${targetPort}`,
        url: url
      };
    });
}

async function main() {
  console.log(`Running RedAgent attack simulation on: ${repoPath}`);

  const serverInfo = analyzeRepoForServer(repoPath);
  console.log('Server analysis:', serverInfo);

  const attacks = simulateAttack(serverInfo, payload);
  console.log('Simulated attacks:', attacks.length);

  // Execute attack on configured target (could be containerized app or sandbox)
  const result = await attackTarget(payload);

  // Record event
  const event = {
    time: new Date().toISOString(),
    type: 'attack_run',
    payload: payload,
    repo_path: repoPath,
    server_detected: serverInfo,
    attacks_simulated: attacks.length,
    attack_result: result,
    success: result.success
  };
  appendEvent(event);

  console.log('Attack simulation completed');
}

function appendEvent(event) {
  const eventsPath = path.join(__dirname, '..', 'ledger', 'events.log');
  const line = JSON.stringify(event) + '\n';
  fs.appendFileSync(eventsPath, line);
}

// Run main if no server detected, otherwise just analyze
if (require.main === module) {
  main().catch(console.error);
}
