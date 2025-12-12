const fs = require('fs');
const path = require('path');

// Read template.json
const templatePath = path.join(__dirname, 'adsyn', 'template.json');
const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

// Substitute DEMO_SECRET
const secret = process.env.DEMO_SECRET || 'SECRET-PLACEHOLDER';
const payload = JSON.parse(JSON.stringify(template).replace('DEMO_SECRET', secret));

// Write to ledger/last_payload.json
const ledgerPath = path.join(__dirname, '..', 'ledger', 'last_payload.json');
const entry = {
  timestamp: new Date().toISOString(),
  payload: payload,
  type: 'adsyn'
};
fs.writeFileSync(ledgerPath, JSON.stringify(entry, null, 2));

// Print the payload
console.log('Payload:', JSON.stringify(payload));
