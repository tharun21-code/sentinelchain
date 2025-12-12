const fs = require('fs');
const path = require('path');

// Read workflow.json
const workflowPath = path.join(__dirname, 'workflow.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

// Create graph object with timestamp
const graph = {
  timestamp: new Date().toISOString(),
  graph: workflow
};

// Write to ledger/graph.json
const ledgerPath = path.join(__dirname, '..', 'ledger', 'graph.json');
fs.writeFileSync(ledgerPath, JSON.stringify(graph, null, 2));

console.log('Graph written to:', ledgerPath);
