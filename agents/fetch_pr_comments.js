// agents/fetch_pr_comments.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const TOKEN = process.env.GITHUB_TOKEN;
const PR_NUMBER = process.env.PR_NUMBER || '1'; // default PR #1

const ledgerPath = path.join(__dirname, '..', 'ledger', 'events.log');
const modelCallsPath = path.join(__dirname, '..', 'ledger', 'model_calls.log');

function logEvent(obj){ fs.appendFileSync(ledgerPath, JSON.stringify(obj) + '\n', 'utf8'); }
function logModel(obj){ fs.appendFileSync(modelCallsPath, JSON.stringify(obj) + '\n', 'utf8'); }

if (!OWNER || !REPO || !TOKEN) {
  console.error('Missing GITHUB_OWNER/GITHUB_REPO/GITHUB_TOKEN in env. Exiting.');
  process.exit(1);
}

async function fetchComments(pr = PR_NUMBER) {
  try {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues/${pr}/comments`;
    const resp = await axios.get(url, { headers: { Authorization: `token ${TOKEN}`, 'User-Agent': 'sentinelchain' } });
    const comments = resp.data || [];

    // Heuristic: CodeRabbit comments are authored by coderabbit-like accounts or include keywords
    const coderabbit = comments.filter(c => {
      const author = (c.user && c.user.login || '').toLowerCase();
      return /coderabbit|coderabbitai/i.test(author) || /CodeRabbit|AI review|code review/i.test(c.body);
    });

    // Log each CodeRabbit comment to ledger
    for (const c of coderabbit) {
      const entry = { time: new Date().toISOString(), type: 'coderabbit_comment', pr: Number(pr), author: c.user.login, body: c.body };
      logEvent(entry);
      logModel({ timestamp: new Date().toISOString(), agent: 'fetch_pr_comments', sample: (c.body||'').slice(0,400) });
    }

    console.log('Fetched', coderabbit.length, 'CodeRabbit comment(s) for PR', pr);
    return coderabbit;
  } catch (err) {
    const e = err.response?.data || err.message || String(err);
    console.error('Failed to fetch comments:', e);
    logModel({ timestamp: new Date().toISOString(), agent: 'fetch_pr_comments', error: String(e) });
    logEvent({ time: new Date().toISOString(), type: 'fetch_pr_comments_failed', error: String(e) });
    // If 404, the PR doesn't exist, don't throw error
    if (err.response?.status === 404) {
      console.log('PR not found, skipping...');
      return [];
    }
    throw err;
  }
}

if (require.main === module) {
  fetchComments().then(r => { console.log('Done'); process.exit(0); }).catch(()=>process.exit(1));
}

module.exports = { fetchComments };
