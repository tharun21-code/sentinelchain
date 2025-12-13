require('dotenv').config();
const axios = require('axios');

async function testOpenRouterAPI() {
  const API_KEY = process.env.OPENROUTER_API_KEY;
  const API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';

  if (!API_KEY) {
    console.error('❌ OPENROUTER_API_KEY environment variable is not set');
    console.log('Please set it with: export OPENROUTER_API_KEY="your_key_here"');
    return false;
  }

  console.log('🔍 Testing OpenRouter API connection...');
  console.log(`API URL: ${API_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}`);

  try {
    const response = await axios.post(API_URL, {
      model: "meta-llama/llama-3.2-3b-instruct:free",
      messages: [
        {
          role: "user",
          content: "Hello, just testing the API. Please respond with 'API test successful!'"
        }
      ],
      max_tokens: 50
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://sentinelchain.local',
        'X-Title': 'SentinelChain API Test'
      },
      timeout: 30000
    });

    if (response.data && response.data.choices && response.data.choices[0]) {
      const reply = response.data.choices[0].message.content;
      console.log('✅ API test successful!');
      console.log(`Response: ${reply}`);
      return true;
    } else {
      console.error('❌ Unexpected API response format');
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ API test failed!');
    if (error.response) {
      console.error(`HTTP ${error.response.status}:`, error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused - check your internet connection');
    } else {
      console.error('Error:', error.message);
    }
    return false;
  }
}

async function testGitHubToken() {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN environment variable is not set');
    console.log('Please set it with: export GITHUB_TOKEN="your_token_here"');
    return false;
  }

  console.log('🔍 Testing GitHub API connection...');
  console.log(`Token: ${GITHUB_TOKEN.substring(0, 10)}...${GITHUB_TOKEN.substring(GITHUB_TOKEN.length - 4)}`);

  try {
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 10000
    });

    if (response.data && response.data.login) {
      console.log('✅ GitHub token test successful!');
      console.log(`Authenticated as: ${response.data.login}`);
      return true;
    } else {
      console.error('❌ Unexpected GitHub API response');
      return false;
    }
  } catch (error) {
    console.error('❌ GitHub token test failed!');
    if (error.response) {
      console.error(`HTTP ${error.response.status}:`, error.response.data.message || error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return false;
  }
}

async function main() {
  console.log('🚀 Testing API keys and model access...\n');

  const openRouterOk = await testOpenRouterAPI();
  console.log();

  const githubOk = await testGitHubToken();
  console.log();

  if (openRouterOk && githubOk) {
    console.log('🎉 All API tests passed! Your setup is ready.');
  } else {
    console.log('⚠️  Some tests failed. Please check your environment variables.');
    console.log('\nTo set environment variables:');
    console.log('export OPENROUTER_API_KEY="your_openrouter_key"');
    console.log('export GITHUB_TOKEN="your_github_token"');
    console.log('\nFor persistent setup, consider creating a .env file.');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testOpenRouterAPI, testGitHubToken };
