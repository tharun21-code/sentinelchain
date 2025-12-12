# SentinelChain MVP Demo Script (2-3 minutes)

## Intro (30s)
- Open http://localhost:4000 in browser
- "SentinelChain is an AI-driven cybersecurity platform. This demo shows FAAM (Flow Analysis and Attack Modeling), AdSyn (Adversarial Synthesis), RedAgent (Red Team Automation), and Auto-Fixer working together to secure a vulnerable Node.js app."

## Run FAAM (30s)
- Click "Run FAAM"
- "FAAM analyzes the workflow and builds the initial graph."

## Generate Payload (30s)
- Click "Generate Payload"
- "AdSyn creates a malicious payload template."

## Run Attack (before fix) (30s)
- Click "Run Attack"
- "RedAgent attempts the attack. It fails due to sandbox security."

## AutoFix (30s)
- Click "AutoFix"
- "Auto-Fixer patches the sandbox with input validation."

## Run Attack (after fix) (30s)
- Click "Run Attack"
- "RedAgent tries again. The attack is blocked by the fix."

## Export Report (30s)
- Click "Export Report"
- Click "Open HTML Report"
- "Here's the generated report showing all events."

## Close (30s)
- "SentinelChain demonstrates automated threat detection and response. Thank you!"

## Optional Commands
- PDF Export: npm install puppeteer && node ledger/export_pdf.js
- Git Tag: git add . && git commit -m "MVP complete" && git tag v1.0-mvp
