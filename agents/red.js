const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Read ledger/last_payload.json
const payloadPath = path.join(__dirname, '..', 'ledger', 'last_payload.json');
const entry = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
const payload = entry.payload;

// Prepare cmd as JSON string
const cmd = JSON.stringify(payload);

// Post to sandbox
const url = 'http://localhost:3001/run';
const data = { cmd };

axios.post(url, data)
  .then(response => {
    console.log('Response:', response.data);
    // Record event
    const event = {
      time: new Date().toISOString(),
      type: 'attack_run',
      payload: payload,
      response: response.data
    };
    appendEvent(event);
  })
  .catch(error => {
    console.log('Error:', error.message);
    // Record event
    const event = {
      time: new Date().toISOString(),
      type: 'attack_run',
      payload: payload,
      error: error.message
    };
    appendEvent(event);
  });

function appendEvent(event) {
  const eventsPath = path.join(__dirname, '..', 'ledger', 'events.log');
  const line = JSON.stringify(event) + '\n';
  fs.appendFileSync(eventsPath, line);
}
