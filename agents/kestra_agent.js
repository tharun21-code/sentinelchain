const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';

// Analyze ledger data and make orchestration decisions
function analyzeLedgerData() {
  const summary = {
    num_attacks: 0,
    num_autofix: 0,
    last_attack: null,
    recent_issues: [],
    patch_confidence: null
  };

  try {
    // Read events.log (last 200 lines)
    const eventsPath = path.join(__dirname, '..', 'ledger', 'events.log');
    if (fs.existsSync(eventsPath)) {
      const eventsData = fs.readFileSync(eventsPath, 'utf8');
      const lines = eventsData.trim().split('\n').slice(-200);

      for (const line of lines.reverse()) { // Process most recent first
        try {
          const event = JSON.parse(line);

          if (event.type === 'attack_run') {
            summary.num_attacks++;
            if (!summary.last_attack) {
              summary.last_attack = {
                time: event.time,
                status: event.success ? 'executed' : 'failed',
                payload_type: event.payload?.type
              };
            }
          }

          if (event.type === 'autofix_applied') {
            summary.num_autofix++;
          }

          // Collect recent issues (last 10)
          if (event.type === 'faam_scan_completed' && summary.recent_issues.length < 10) {
            summary.recent_issues.push({
              time: event.time,
              issues_found: event.issues_count || 0,
              critical: event.critical_issues || 0
            });
          }
        } catch (e) {
          // Skip malformed lines
        }
      }
    }

    // Read graph.json for patch confidence
    const graphPath = path.join(__dirname, '..', 'ledger', 'graph.json');
    if (fs.existsSync(graphPath)) {
      try {
        const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
        // Calculate confidence based on nodes with issues vs total nodes
        const nodesWithIssues = graph.nodes.filter(n => n.issues && n.issues.length > 0).length;
        const totalNodes = graph.nodes.length;
        summary.patch_confidence = totalNodes > 0 ? (totalNodes - nodesWithIssues) / totalNodes : null;
      } catch (e) {
        // Graph file might be malformed
      }
    }

  } catch (error) {
    console.error('Error analyzing ledger data:', error.message);
  }

  return summary;
}

async function callModel(summary) {
  const prompt = `Analyze this SentinelChain security summary and decide on the next action:

Security Summary:
- Attacks detected: ${summary.num_attacks}
- AutoFix applied: ${summary.num_autofix}
- Last attack: ${summary.last_attack ? `${summary.last_attack.status} (${summary.last_attack.payload_type})` : 'none'}
- Recent issues: ${summary.recent_issues.length} scans
- Patch confidence: ${summary.patch_confidence ? (summary.patch_confidence * 100).toFixed(1) + '%' : 'unknown'}

Available decisions:
- "auto_pr": Run full pipeline and create PR (high activity detected)
- "monitor": Continue monitoring (some activity, not critical)
- "noop": No action needed (low activity)

Respond with JSON: {"decision": "auto_pr|monitor|noop", "reason": "brief explanation"}`;

  try {
    const response = await axios.post(API_URL, {
      model: process.env.OPENROUTER_MODEL || 'mistralai/devstral-2512:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 150
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const content = response.data.choices[0].message.content.trim();
    // Clean up response
    const cleanContent = content.replace(/```json\s*|\s*```/g, '');
    return JSON.parse(cleanContent);
  } catch (error) {
    // Fallback to deterministic logic
    return getDeterministicDecision(summary);
  }
}

function getDeterministicDecision(summary) {
  // Deterministic decision rules
  if (summary.num_attacks >= 1 && summary.patch_confidence && summary.patch_confidence < 0.8) {
    return {
      decision: "auto_pr",
      reason: "Attacks detected with low patch confidence - run full pipeline"
    };
  } else if (summary.num_attacks >= 1 && summary.last_attack?.status === 'executed') {
    return {
      decision: "monitor",
      reason: "Attacks detected - continue monitoring"
    };
  } else if (summary.num_autofix > 0) {
    return {
      decision: "monitor",
      reason: "AutoFix applied - monitor for additional issues"
    };
  } else {
    return {
      decision: "noop",
      reason: "No significant security activity detected"
    };
  }
}

async function main() {
  try {
    const summary = analyzeLedgerData();
    console.log('Analyzed security summary:', summary);

    let decision;
    if (API_KEY) {
      console.log('Using AI model for decision...');
      decision = await callModel(summary);
    } else {
      console.log('Using deterministic decision logic...');
      decision = getDeterministicDecision(summary);
    }

    // Create comprehensive output
    const output = {
      decision: decision.decision,
      reason: decision.reason,
      summary: `Attacks: ${summary.num_attacks}, AutoFix: ${summary.num_autofix}, Confidence: ${summary.patch_confidence ? (summary.patch_confidence * 100).toFixed(1) + '%' : 'unknown'}`
    };

    // Write to decision.json for Kestra
    fs.writeFileSync('decision.json', JSON.stringify(output, null, 2));

    // Print to stdout for Kestra
    console.log(JSON.stringify(output));

  } catch (error) {
    console.error('Kestra agent error:', error.message);
    // Fallback decision
    const fallback = {
      decision: "noop",
      reason: "Agent error - defaulting to no action",
      summary: "Error occurred during analysis"
    };
    console.log(JSON.stringify(fallback));
    process.exit(1);
  }
}

main().catch(console.error);
