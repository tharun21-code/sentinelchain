#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function setupEnvironment() {
  console.log('🚀 SentinelChain Environment Setup');
  console.log('=====================================\n');

  console.log('This script will help you create a .env file with your API keys.');
  console.log('Your keys will be stored locally and loaded automatically.\n');

  // Check if .env already exists
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const overwrite = await ask('A .env file already exists. Overwrite it? (y/N): ');
    if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('\n📝 Please provide your API keys:');
  console.log('(You can get these from https://openrouter.ai and https://github.com/settings/tokens)\n');

  const openRouterKey = await ask('OpenRouter API Key (sk-or-v1-...): ');
  const githubToken = await ask('GitHub Personal Access Token (ghp_...): ');

  if (!openRouterKey || !githubToken) {
    console.log('❌ Both API keys are required. Setup cancelled.');
    rl.close();
    return;
  }

  const githubOwner = await ask('Your GitHub username (optional): ') || '';
  const githubRepo = await ask('Target repository name (optional): ') || '';

  // Create .env content
  let envContent = `# OpenRouter API Configuration
OPENROUTER_API_KEY=${openRouterKey}
OPENROUTER_API_URL=https://openrouter.ai/api/v1/chat/completions

# GitHub Configuration
GITHUB_TOKEN=${githubToken}`;

  if (githubOwner) {
    envContent += `\nGITHUB_OWNER=${githubOwner}`;
  }

  if (githubRepo) {
    envContent += `\nTARGET_GITHUB_REPO=${githubRepo}`;
  }

  // Write .env file
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ .env file created successfully!');
  console.log(`📁 Location: ${envPath}`);
  console.log('\n🔧 Your environment is now configured.');
  console.log('You can now run:');
  console.log('  node test_api.js  # to test your API keys');
  console.log('  npm start:dashboard  # to start the dashboard');
  console.log('  node orchestrator/run_pipeline.js  # to run the pipeline');

  rl.close();
}

if (require.main === module) {
  setupEnvironment().catch(console.error);
}
