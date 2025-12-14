const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const API_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';

// Accept repoPath as CLI argument
const repoPath = process.argv[2] || './sandbox';

// Analyze repository for vulnerable files
function findVulnerableFiles(targetPath) {
  const vulnerableFiles = [];

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

        // Check for vulnerability patterns
        const hasVulnerabilities = /exec\(|spawn\(|eval\(|Function\s*\(/g.test(content);

        if (hasVulnerabilities) {
          vulnerableFiles.push({
            path: fullPath,
            relativePath: path.relative(targetPath, fullPath),
            content: content
          });
        }
      }
    }
  }

  scanDirectory(targetPath);
  return vulnerableFiles;
}

async function callModel(code) {
  const prompt = `Here is vulnerable Node.js code that contains security issues like command injection, eval usage, or other dangerous patterns:\n\n${code}\n\nGenerate a patched version that adds proper input sanitization and security measures. Focus on:

1. Adding sanitize functions for user input
2. Replacing dangerous exec() calls with safe alternatives
3. Commenting out or replacing eval() and Function() usage
4. Adding input validation

Respond only with the complete patched code, maintaining the same functionality but with security improvements.`;

  try {
    const response = await axios.post(API_URL, {
      model: process.env.OPENROUTER_MODEL || 'mistralai/devstral-2512:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1500
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const patchedCode = response.data.choices[0].message.content.trim();
    // Clean up response (remove markdown code blocks if present)
    const cleanCode = patchedCode.replace(/```javascript\s*|\s*```/g, '');
    return { success: true, patchedCode: cleanCode };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log(`Running AI-powered AutoFix on repository: ${repoPath}`);

  const vulnerableFiles = findVulnerableFiles(repoPath);
  console.log(`Found ${vulnerableFiles.length} potentially vulnerable files`);

  const patchedFiles = [];

  for (const file of vulnerableFiles) {
    console.log(`Processing: ${file.relativePath}`);

    const result = await callModel(file.content);
    const timestamp = new Date().toISOString();

    // Log to model_calls.log
    const modelLog = {
      timestamp,
      agent: 'autofix_together',
      prompt: `Patch code for ${file.relativePath}`,
      response: result.success ? result.patchedCode.substring(0, 500) + '...' : null,
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
      agent: 'autofix_together',
      success: result.success,
      file: file.relativePath
    };
    const eventsPath = path.join(__dirname, '..', 'ledger', 'events.log');
    fs.appendFileSync(eventsPath, JSON.stringify(event) + '\n');

    if (result.success) {
      // Write patched code
      const patchedPath = file.path.replace(/\.js$/, '.patched.js');
      fs.writeFileSync(patchedPath, result.patchedCode);
      console.log(`✅ Patched: ${file.relativePath} -> ${path.basename(patchedPath)}`);
      patchedFiles.push(file.relativePath);
    } else {
      console.log(`❌ Failed to patch: ${file.relativePath}`);
    }
  }

  // Log overall results
  const finalEvent = {
    time: new Date().toISOString(),
    type: 'autofix_applied',
    agent: 'autofix_together',
    repo_path: repoPath,
    files_processed: vulnerableFiles.length,
    files_patched: patchedFiles.length
  };
  const eventsPath = path.join(__dirname, '..', 'ledger', 'events.log');
  fs.appendFileSync(eventsPath, JSON.stringify(finalEvent) + '\n');

  if (patchedFiles.length === 0) {
    console.log('No vulnerable files found or AI patching failed, falling back to deterministic script');
    exec(`node agents/autofix.js "${repoPath}"`, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
      if (error) console.error('Fallback error:', error);
      else console.log('Fallback completed');
    });
  } else {
    console.log(`AI-powered AutoFix completed: ${patchedFiles.length} files patched`);
  }
}

main().catch(console.error);
