const fs = require('fs');
const path = require('path');

const TARGET_REPO_PATH = process.argv[2] || process.env.TARGET_REPO_PATH || '.';

// Utility to recursively find all .js files
function findJSFiles(dirPath, files = []) {
  if (!fs.existsSync(dirPath)) {
    console.warn(`Target path does not exist: ${dirPath}`);
    return files;
  }

  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      findJSFiles(fullPath, files);
    } else if (stat.isFile() && item.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Analyze a single JavaScript file
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(TARGET_REPO_PATH, filePath);

  const issues = [];
  const imports = [];
  const endpoints = [];
  const riskyPatterns = [];
  const llmPatterns = [];
  const promptInjection = [];
  const agentCommunication = [];
  const fileOperations = [];

  // Detect imports
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  // Detect command execution sinks
  const commandSinks = [
    { pattern: /exec\s*\(/g, type: 'exec', severity: 'high' },
    { pattern: /execSync\s*\(/g, type: 'execSync', severity: 'high' },
    { pattern: /spawn\s*\(/g, type: 'spawn', severity: 'high' },
    { pattern: /eval\s*\(/g, type: 'eval', severity: 'critical' },
    { pattern: /Function\s*\(\s*['"]/g, type: 'Function', severity: 'critical' }
  ];

  for (const { pattern, type, severity } of commandSinks) {
    if (pattern.test(content)) {
      riskyPatterns.push({ file: relativePath, pattern: type, severity, category: 'command_execution' });
      issues.push({ file: relativePath, pattern: type, severity, category: 'command_execution' });
    }
  }

  // Detect LLM call patterns
  const llmPatternsRegex = [
    { pattern: /openai\.chat\.completions\.create/g, type: 'openai_chat', severity: 'medium' },
    { pattern: /together\./g, type: 'together_api', severity: 'medium' },
    { pattern: /model\.generate\s*\(/g, type: 'model_generate', severity: 'medium' },
    { pattern: /fetch\s*\(\s*['"]https:\/\/api\.openai\.com\/v1\/chat\/completions['"]/g, type: 'openai_fetch', severity: 'medium' }
  ];

  for (const { pattern, type, severity } of llmPatternsRegex) {
    if (pattern.test(content)) {
      llmPatterns.push({ file: relativePath, pattern: type, severity });
      issues.push({ file: relativePath, pattern: type, severity, category: 'llm_call' });
    }
  }

  // Detect prompt injection surfaces
  const promptInjectionRegex = [
    { pattern: /req\.body[^}]*\$\{/g, type: 'req_body_template', severity: 'high' },
    { pattern: /req\.query[^}]*\$\{/g, type: 'req_query_template', severity: 'high' },
    { pattern: /\$\{[^}]*req\.body/g, type: 'template_req_body', severity: 'high' },
    { pattern: /\$\{[^}]*req\.query/g, type: 'template_req_query', severity: 'high' },
    { pattern: /req\.body\s*\+\s*['"]/g, type: 'req_body_concat', severity: 'high' },
    { pattern: /req\.query\s*\+\s*['"]/g, type: 'req_query_concat', severity: 'high' }
  ];

  for (const { pattern, type, severity } of promptInjectionRegex) {
    if (pattern.test(content)) {
      promptInjection.push({ file: relativePath, pattern: type, severity });
      issues.push({ file: relativePath, pattern: type, severity, category: 'prompt_injection' });
    }
  }

  // Detect agent-to-agent communication
  const agentCommRegex = [
    { pattern: /model.*output.*input/g, type: 'model_output_to_input', severity: 'medium' },
    { pattern: /JSON\.parse\s*\([^)]*model/g, type: 'model_json_parse', severity: 'medium' },
    { pattern: /message.*passing/g, type: 'message_passing', severity: 'low' }
  ];

  for (const { pattern, type, severity } of agentCommRegex) {
    if (pattern.test(content)) {
      agentCommunication.push({ file: relativePath, pattern: type, severity });
      issues.push({ file: relativePath, pattern: type, severity, category: 'agent_communication' });
    }
  }

  // Detect HTTP endpoints
  const endpointRegex = /(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
  while ((match = endpointRegex.exec(content)) !== null) {
    endpoints.push({
      file: relativePath,
      method: match[1].toUpperCase(),
      route: match[2]
    });
  }

  // Detect file operations
  const fileOpRegex = [
    { pattern: /fs\.writeFile\s*\(/g, type: 'writeFile', severity: 'medium' },
    { pattern: /fs\.writeFileSync\s*\(/g, type: 'writeFileSync', severity: 'medium' },
    { pattern: /fs\.readFile\s*\(/g, type: 'readFile', severity: 'low' },
    { pattern: /fs\.appendFile\s*\(/g, type: 'appendFile', severity: 'medium' }
  ];

  for (const { pattern, type, severity } of fileOpRegex) {
    if (pattern.test(content)) {
      fileOperations.push({ file: relativePath, pattern: type, severity });
      issues.push({ file: relativePath, pattern: type, severity, category: 'file_operation' });
    }
  }

  // Calculate risk level based on issues
  let risk = 'low';
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;

  if (criticalCount > 0 || highCount > 2) {
    risk = 'critical';
  } else if (highCount > 0 || mediumCount > 2) {
    risk = 'high';
  } else if (mediumCount > 0) {
    risk = 'medium';
  }

  // Determine node type
  let nodeType = 'file';
  if (endpoints.length > 0) nodeType = 'endpoint';
  else if (commandSinks.some(p => p.pattern.test(content))) nodeType = 'exec_surface';
  else if (llmPatterns.length > 0) nodeType = 'llm_surface';
  else if (agentCommunication.length > 0) nodeType = 'agent_flow';
  else if (fileOperations.length > 0) nodeType = 'file_op';

  return {
    file: relativePath,
    nodeType,
    imports,
    endpoints,
    riskyPatterns,
    llmPatterns,
    promptInjection,
    agentCommunication,
    fileOperations,
    risk,
    issues
  };
}

// Main scanning function
function performFAAMScan() {
  console.log(`Starting advanced FAAM scan on: ${TARGET_REPO_PATH}`);

  const jsFiles = findJSFiles(TARGET_REPO_PATH);
  console.log(`Found ${jsFiles.length} JavaScript files`);

  const nodes = [];
  const edges = [];
  const allIssues = [];

  // Build file map for import resolution
  const fileMap = new Map();

  for (const filePath of jsFiles) {
    const analysis = analyzeFile(filePath);
    nodes.push({
      id: analysis.file,
      type: analysis.nodeType,
      risk: analysis.risk,
      issues: analysis.issues.map(i => ({ pattern: i.pattern, severity: i.severity }))
    });

    fileMap.set(analysis.file, analysis);

    // Collect all issues
    allIssues.push(...analysis.issues);
  }

  // Build edges based on imports
  for (const [filePath, analysis] of fileMap) {
    for (const importPath of analysis.imports) {
      // Try to resolve relative imports
      let resolvedPath = null;

      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        const dir = path.dirname(path.join(TARGET_REPO_PATH, filePath));
        const resolved = path.resolve(dir, importPath);
        const relative = path.relative(TARGET_REPO_PATH, resolved);

        // Check if it resolves to a known file
        const possibleFiles = [relative + '.js', relative];
        for (const possible of possibleFiles) {
          if (fileMap.has(possible)) {
            resolvedPath = possible;
            break;
          }
        }
      }

      if (resolvedPath) {
        edges.push([filePath, resolvedPath]);
      }
    }
  }

  const graph = {
    nodes,
    edges,
    issues: allIssues,
    scanned_at: new Date().toISOString(),
    repo_path: TARGET_REPO_PATH
  };

  // Save to ledger/graph.json
  const graphPath = path.join(__dirname, '..', 'ledger', 'graph.json');
  fs.writeFileSync(graphPath, JSON.stringify(graph, null, 2));
  console.log(`Advanced FAAM graph saved to: ${graphPath}`);

  // Log event
  const event = {
    time: new Date().toISOString(),
    type: 'faam_scan_completed',
    repo: TARGET_REPO_PATH,
    files_scanned: jsFiles.length,
    nodes_count: nodes.length,
    edges_count: edges.length,
    issues_count: allIssues.length,
    critical_issues: allIssues.filter(i => i.severity === 'critical').length,
    high_issues: allIssues.filter(i => i.severity === 'high').length,
    medium_issues: allIssues.filter(i => i.severity === 'medium').length
  };

  const eventsPath = path.join(__dirname, '..', 'ledger', 'events.log');
  fs.appendFileSync(eventsPath, JSON.stringify(event) + '\n');
  console.log('Advanced FAAM scan completed successfully');

  return graph;
}

// Run if called directly
if (require.main === module) {
  try {
    const result = performFAAMScan();
    console.log(`Scan complete: ${result.nodes.length} files analyzed`);
    process.exit(0);
  } catch (error) {
    console.error('FAAM scan failed:', error.message);
    process.exit(1);
  }
}

module.exports = { performFAAMScan, analyzeFile, findJSFiles };
