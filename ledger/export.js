const fs = require('fs');
const path = require('path');

// Read events.log
const eventsPath = path.join(__dirname, 'events.log');
const eventsData = fs.readFileSync(eventsPath, 'utf8').trim();
const events = eventsData ? eventsData.split('\n').map(line => JSON.parse(line)) : [];

// Read graph.json
const graphPath = path.join(__dirname, 'graph.json');
const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));

// Create summary
const summary = {
  totalEvents: events.length,
  eventTypes: {},
  attackRuns: events.filter(e => e.type === 'attack_run').length,
  autofixPatches: events.filter(e => e.type === 'autofix_patch_written').length
};
events.forEach(event => {
  summary.eventTypes[event.type] = (summary.eventTypes[event.type] || 0) + 1;
});

// Create report
const report = {
  meta: {
    generatedAt: new Date().toISOString(),
    version: '1.0'
  },
  graph: graph,
  events: events,
  summary: summary
};

// Write to report.json
const reportPath = path.join(__dirname, 'report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log('Report written to:', reportPath);
