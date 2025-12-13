const fs = require('fs');
const path = require('path');

// Accept repoPath as CLI argument
const repoPath = process.argv[2] || './sandbox';

// Security patches to apply
const patches = {
  // Command injection patch
  commandInjection: {
    pattern: /exec\s*\(\s*([^,)]+)/g,
    replacement: (match, cmdVar) => {
      return `const safeCmd = sanitize(${cmdVar});
  if (!safeCmd) {
    return res.status(400).json({ error: 'forbidden command' });
  }
  exec(safeCmd`;
    },
    requiresSanitizeFunction: true
  },

  // Eval patch
  evalPatch: {
    pattern: /eval\s*\(/g,
    replacement: () => {
      return `// SECURITY: eval() disabled for safety
  // Original: eval(`;
    }
  },

  // Function constructor patch
  functionPatch: {
    pattern: /new\s+Function\s*\(/g,
    replacement: () => {
      return `// SECURITY: Function constructor disabled
  // Original: new Function(`;
    }
  }
};

// Sanitize function to insert
const sanitizeFunction = `
function sanitize(cmd) {
  const whitelist = ['echo', 'date', 'uname', 'whoami', 'ls', 'pwd'];
  const dangerous = [';', '|', '&', '\`', '$', '(', ')', '<', '>', 'rm', 'del', 'format', 'shutdown', 'reboot', 'sudo', 'su', 'chmod', 'chown', 'dd', 'mkfs', 'fdisk', 'wget', 'curl', 'nc', 'netcat', 'bash', 'sh', 'python', 'perl', 'ruby', 'node', 'npm', 'yarn'];

  if (!cmd || typeof cmd !== 'string') return null;

  const baseCmd = cmd.trim().split(' ')[0];
  if (!whitelist.includes(baseCmd)) return null;

  for (let token of dangerous) {
    if (cmd.includes(token)) return null;
  }

  return cmd;
}
`;

// Scan and patch vulnerable files in repository
function scanAndPatch(targetPath) {
  const patchedFiles = [];

  function scanDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;

    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scanDirectory(fullPath);
      } else if (stat.isFile() && item.endsWith('.js')) {
        const patchesApplied = patchFile(fullPath);
        if (patchesApplied.length > 0) {
          patchedFiles.push({
            file: path.relative(targetPath, fullPath),
            patches: patchesApplied
          });
        }
      }
    }
  }

  scanDirectory(targetPath);
  return patchedFiles;
}

function patchFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  const originalCode = code;
  const appliedPatches = [];

  // Apply command injection patch
  if (patches.commandInjection.pattern.test(code)) {
    // Insert sanitize function if not already present
    if (!code.includes('function sanitize(')) {
      // Find a good place to insert the function (before first function or at top)
      const insertPoint = code.indexOf('const ') === 0 ? 0 : code.indexOf('function ');
      if (insertPoint >= 0) {
        code = code.slice(0, insertPoint) + sanitizeFunction + '\n' + code.slice(insertPoint);
      } else {
        code = sanitizeFunction + '\n' + code;
      }
    }

    // Apply the command injection fix
    code = code.replace(patches.commandInjection.pattern, (match, cmdVar) => {
      return `const safeCmd = sanitize(${cmdVar});
  if (!safeCmd) {
    return res.status(400).json({ error: 'forbidden command' });
  }
  exec(safeCmd`;
    });

    appliedPatches.push('command_injection_fix');
  }

  // Apply eval patch
  if (patches.evalPatch.pattern.test(code)) {
    code = code.replace(patches.evalPatch.pattern, patches.evalPatch.replacement());
    appliedPatches.push('eval_disabled');
  }

  // Apply Function constructor patch
  if (patches.functionPatch.pattern.test(code)) {
    code = code.replace(patches.functionPatch.pattern, patches.functionPatch.replacement());
    appliedPatches.push('function_constructor_disabled');
  }

  // Write patched file if changes were made
  if (code !== originalCode) {
    const patchedPath = filePath.replace(/\.js$/, '.patched.js');
    fs.writeFileSync(patchedPath, code);
    console.log(`Patched file written to: ${patchedPath}`);
  }

  return appliedPatches;
}

// Apply patches directly to files
function applyPatchesToFiles(targetPath) {
  const patchedFiles = [];

  function scanDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;

    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scanDirectory(fullPath);
      } else if (stat.isFile() && item.endsWith('.js')) {
        const patchesApplied = applyPatchesToFile(fullPath, targetPath);
        if (patchesApplied.length > 0) {
          patchedFiles.push({
            file: path.relative(targetPath, fullPath),
            patches: patchesApplied
          });
        }
      }
    }
  }

  scanDirectory(targetPath);
  return patchedFiles;
}

function applyPatchesToFile(filePath, targetPath) {
  let code = fs.readFileSync(filePath, 'utf8');
  const originalCode = code;
  const appliedPatches = [];

  // Apply command injection patch
  if (patches.commandInjection.pattern.test(code)) {
    // Insert sanitize function if not already present
    if (!code.includes('function sanitize(')) {
      // Find a good place to insert the function (before first function or at top)
      const insertPoint = code.indexOf('const ') === 0 ? 0 : code.indexOf('function ');
      if (insertPoint >= 0) {
        code = code.slice(0, insertPoint) + sanitizeFunction + '\n' + code.slice(insertPoint);
      } else {
        code = sanitizeFunction + '\n' + code;
      }
    }

    // Apply the command injection fix
    code = code.replace(patches.commandInjection.pattern, (match, cmdVar) => {
      return `const safeCmd = sanitize(${cmdVar});
  if (!safeCmd) {
    return res.status(400).json({ error: 'forbidden command' });
  }
  exec(safeCmd`;
    });

    appliedPatches.push('command_injection_fix');
  }

  // Apply eval patch
  if (patches.evalPatch.pattern.test(code)) {
    code = code.replace(patches.evalPatch.pattern, patches.evalPatch.replacement());
    appliedPatches.push('eval_disabled');
  }

  // Apply Function constructor patch
  if (patches.functionPatch.pattern.test(code)) {
    code = code.replace(patches.functionPatch.pattern, patches.functionPatch.replacement());
    appliedPatches.push('function_constructor_disabled');
  }

  // Write back to the original file if changes were made
  if (code !== originalCode) {
    fs.writeFileSync(filePath, code);
    console.log(`Patched file: ${path.relative(targetPath, filePath)}`);
  }

  return appliedPatches;
}

// Main execution
try {
  console.log(`Running AutoFix on repository: ${repoPath}`);

  const patchedFiles = applyPatchesToFiles(repoPath);
  console.log(`Applied patches to ${patchedFiles.length} files`);

  patchedFiles.forEach(pf => {
    console.log(`- ${pf.file}: ${pf.patches.join(', ')}`);
  });

  // Log results
  const event = {
    time: new Date().toISOString(),
    type: 'autofix_applied',
    repo_path: repoPath,
    files_patched: patchedFiles.length,
    patches_applied: patchedFiles.reduce((sum, pf) => sum + pf.patches.length, 0)
  };

  const eventsPath = path.join(__dirname, '..', 'ledger', 'events.log');
  fs.appendFileSync(eventsPath, JSON.stringify(event) + '\n');

  console.log('AutoFix completed successfully');

} catch (error) {
  console.error('AutoFix failed:', error.message);

  // Log failure
  const failEvent = {
    time: new Date().toISOString(),
    type: 'autofix_failed',
    repo_path: repoPath,
    error: error.message
  };

  const eventsPath = path.join(__dirname, '..', 'ledger', 'events.log');
  fs.appendFileSync(eventsPath, JSON.stringify(failEvent) + '\n');

  process.exit(1);
}
