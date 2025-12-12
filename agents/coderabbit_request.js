// agents/coderabbit_request.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ledgerDir = path.join(__dirname, '..', 'ledger');
if (!fs.existsSync(ledgerDir)) fs.mkdirSync(ledgerDir, { recursive: true });

const CODERABBIT_KEY = process.env.CODERABBIT_API_KEY;
const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const PR_NUMBER = process.env.PR_NUMBER || null;
const POLL_INTERVAL_MS = Number(process.env.CODERABBIT_POLL_MS || 3000);
const POLL_MAX_MS = Number(process.env.CODERABBIT_POLL_MAX_MS || 120000);

function logEvent(obj) {
  fs.appendFileSync(path.join(ledgerDir, 'events.log'), JSON.stringify(obj) + '\n', 'utf8');
}
function logModelCall(obj) {
  fs.appendFileSync(path.join(ledgerDir, 'model_calls.log'), JSON.stringify(obj) + '\n', 'utf8');
}

if (!CODERABBIT_KEY) {
  console.warn('CODERABBIT_API_KEY not set — logging event and exiting.');
  logEvent({ time: new Date().toISOString(), type: 'coderabbit_request_failed', error: 'no_key' });
  process.exit(0);
}

// Default endpoints (may need adapting to CodeRabbit docs/plan)
const REQUEST_API = process.env.CODERABBIT_API_URL || 'https://api.coderabbit.ai/v1/report.generate';
const STATUS_API = process.env.CODERABBIT_STATUS_URL || 'https://api.coderabbit.ai/v1/report.status';

async function requestReport() {
  try {
    const body = { repo: `${OWNER}/${REPO}` };
    if (PR_NUMBER) body.pr = Number(PR_NUMBER);
    const resp = await axios.post(REQUEST_API, body, {
      headers: { Authorization: `Bearer ${CODERABBIT_KEY}`, 'Content-Type': 'application/json' },
      timeout: 120000
    });
    logModelCall({ time: new Date().toISOString(), agent: 'coderabbit_request', request: body, resp_sample: resp.data });
    // If job_id returned, poll it
    if (resp.data && resp.data.job_id) {
      logEvent({ time: new Date().toISOString(), type: 'coderabbit_request', job_id: resp.data.job_id });
      return await pollJob(resp.data.job_id);
    } else {
      logEvent({ time: new Date().toISOString(), type: 'coderabbit_request', resp: resp.data });
      return resp.data;
    }
  } catch (e) {
    const err = e.response?.data || e.message || String(e);
    logModelCall({ time: new Date().toISOString(), agent: 'coderabbit_request', error: String(err) });
    logEvent({ time: new Date().toISOString(), type: 'coderabbit_request_failed', error: String(err) });
    throw e;
  }
}

async function pollJob(jobId) {
  const start = Date.now();
  while (Date.now() - start < POLL_MAX_MS) {
    try {
      const r = await axios.get(`${STATUS_API}?job_id=${jobId}`, {
        headers: { Authorization: `Bearer ${CODERABBIT_KEY}` },
        timeout: 30000
      });
      logModelCall({ time: new Date().toISOString(), agent: 'coderabbit_poll', sample: r.data });
      if (r.data && r.data.status === 'completed') {
        logEvent({ time: new Date().toISOString(), type: 'coderabbit_result', job_id: jobId, result: r.data });
        return r.data;
      } else if (r.data && r.data.status === 'failed') {
        logEvent({ time: new Date().toISOString(), type: 'coderabbit_result_failed', job_id: jobId, error: r.data });
        return r.data;
      }
    } catch (err) {
      logModelCall({ time: new Date().toISOString(), agent: 'coderabbit_poll_error', error: String(err.message || err) });
    }
    await new Promise(res => setTimeout(res, POLL_INTERVAL_MS));
    }
  logEvent({ time: new Date().toISOString(), type: 'coderabbit_poll_timeout', job_id: jobId });
  return { status: 'timeout', job_id: jobId };
}

if (require.main === module) {
  (async () => {
    try {
      const out = await requestReport();
      console.log('CodeRabbit request completed — result written to ledger/events.log');
      process.exit(0);
    } catch (e) {
      console.error('CodeRabbit request failed:', e.message || e);
      process.exit(1);
    }
  })();
}

module.exports = { requestReport };
