# SentinelChain Security Analysis Platform - Demo Script

## 🎯 **Overview**
SentinelChain is an AI-powered security analysis platform that automatically discovers, analyzes, and patches vulnerabilities in web applications. This demo showcases the complete pipeline from repository import through automated security fixes and pull request creation.

## 📋 **Prerequisites**
- Node.js 18+ and npm installed
- Docker installed and running
- Git configured with GitHub access
- OpenRouter API key (for AI features)
- GitHub Personal Access Token (for PR creation)

## 🚀 **Quick Start Commands**

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
export OPENROUTER_API_KEY="your_openrouter_key"
export GITHUB_TOKEN="your_github_token"
export TARGET_GITHUB_OWNER="your_github_username"
export TARGET_GITHUB_REPO="your_repo_name"

# 3. Start the dashboard
node dashboard/server.js

# 4. Open browser to http://localhost:4000
```

## 📖 **Demo Script - Step by Step**

### **Phase 1: Environment Setup**

1. **Start SentinelChain Dashboard**
   ```bash
   node dashboard/server.js
   ```
   - Opens dashboard at `http://localhost:4000`
   - Shows real-time pipeline progress
   - Displays security analysis results

2. **Configure Environment Variables**
   ```bash
   export OPENROUTER_API_KEY="sk-or-v1-..."
   export GITHUB_TOKEN="ghp_..."
   export TARGET_GITHUB_OWNER="demo-user"
   export TARGET_GITHUB_REPO="vulnerable-app"
   ```

### **Phase 2: Repository Import & Analysis**

3. **Import Target Repository**
   - Open dashboard at `http://localhost:4000`
   - Enter GitHub repository URL: `https://github.com/demo-user/vulnerable-app`
   - Click "Import Repo" button
   - **Expected Result**: Repository cloned to `repos/demo-user/vulnerable-app/`

4. **Run Complete Security Pipeline**
   - Click "Run Full Pipeline" button
   - Watch real-time progress in the log panel
   - **Expected Duration**: 2-5 minutes depending on repository size

### **Phase 3: Pipeline Execution Details**

#### **Step 1: FAAM Vulnerability Scanner**
- **Agent**: `orchestrator/faam_scan.js`
- **Function**: Advanced static analysis for security vulnerabilities
- **Detects**:
  - Command injection patterns (`exec()`, `spawn()`)
  - Code injection (`eval()`, `Function()`)
  - Input validation issues
  - HTTP route vulnerabilities
- **Output**: `ledger/graph.json` with vulnerability graph

#### **Step 2: Payload Generation (AI-Powered)**
- **Agent**: `agents/adsyn_together.js` (AI) → `agents/adsyn.js` (fallback)
- **Function**: Generates context-aware attack payloads
- **Uses**: OpenRouter API with vulnerability analysis
- **Output**: `ledger/last_payload.json` with attack vectors

#### **Step 3: RedAgent Attack Simulation**
- **Agent**: `agents/red.js`
- **Function**: Safe adversarial testing in Docker containers
- **Docker Isolation**: Automatic container creation/cleanup
- **Target**: Containerized application or sandbox environment
- **Output**: Attack results and success/failure metrics

#### **Step 4: AutoFix Security Patching**
- **Agent**: `agents/autofix_together.js` (AI) → `agents/autofix.js` (fallback)
- **Function**: Applies security patches directly to source code
- **Fixes**: Command injection, eval usage, input sanitization
- **Output**: Modified source files with security improvements

#### **Step 5: GitHub Pull Request Creation**
- **Agent**: `agents/prepare_pr_github.js`
- **Function**: Creates professional security patches via GitHub PRs
- **Process**:
  - Creates new branch: `sentinelchain-security-patch-{timestamp}`
  - Commits patched files with detailed security messages
  - Creates PR with vulnerability summary
- **Output**: GitHub PR URL with automated security fixes

#### **Step 6: CodeRabbit AI Review**
- **Agent**: `agents/coderabbit_request.js`
- **Function**: Requests AI-powered code review
- **Integration**: Professional code analysis and suggestions
- **Output**: CodeRabbit review comments on the security PR

#### **Step 7: Kestra Workflow Orchestration**
- **Workflow**: `kestra/workflows/sentinelchain_pipeline.yml`
- **Function**: Intelligent pipeline orchestration with decision logic
- **AI Decisions**: Analyzes security metrics to determine next actions
- **Branches**: `auto_pr`, `monitor`, `noop` based on threat assessment

### **Phase 4: Results & Reporting**

5. **View Security Reports**
   - **HTML Report**: Open `ledger/report.html` in browser
   - **JSON Data**: View `ledger/graph.json` for vulnerability graph
   - **Event Log**: Check `ledger/events.log` for complete audit trail

6. **Monitor Dashboard Updates**
   - Real-time pipeline progress
   - Security metrics and statistics
   - PR creation notifications
   - Container status updates

### **Phase 5: Advanced Features**

7. **Individual Pipeline Steps**
   - Click "Run FAAM" - Vulnerability scanning only
   - Click "Generate Payload" - Attack vector creation
   - Click "Run Attack" - Safe adversarial testing
   - Click "AutoFix" - Security patch application

8. **Kestra Workflow Management**
   ```bash
   # Start Kestra (optional)
   cd kestra
   docker-compose -f docker-compose.kestra.yml up -d

   # Trigger workflow via API
   curl -X POST http://localhost:4000/api/kestra/run-workflow
   ```

## 📸 **Screenshot Placeholders**

```
[SCREENSHOT 1: Dashboard Overview]
- Shows import form, pipeline buttons, real-time log panel

[SCREENSHOT 2: Pipeline Execution]
- Displays step-by-step progress with timing information

[SCREENSHOT 3: Security Report]
- HTML report showing vulnerabilities, fixes, and recommendations

[SCREENSHOT 4: GitHub PR Created]
- Shows the automated pull request with security patches

[SCREENSHOT 5: Kestra Workflow UI]
- Workflow orchestration interface with execution details
```

## 🛡️ **Safety & Security Notes**

### **Complete Isolation**
- **Docker Sandboxing**: All imported code runs in isolated containers
- **Resource Limits**: Containers limited to 512MB RAM, 0.5 CPU cores
- **Network Isolation**: No external network access during analysis
- **Automatic Cleanup**: Containers removed immediately after analysis

### **No Real Remote Code Execution**
- **Simulation Only**: Attacks are simulated, not executed on real systems
- **Safe Payloads**: Generated payloads are for testing purposes only
- **Host Protection**: Host system never executes imported or generated code
- **Audit Trail**: All operations logged for complete transparency

### **Ethical Testing**
- **Permission Required**: Only test repositories you own or have explicit permission to analyze
- **Legal Compliance**: Follow responsible disclosure practices
- **Educational Focus**: Designed for security education and improvement

## 🎯 **Key Features for Judges**

### **AI-Powered Security Analysis**
- **Intelligent Scanning**: FAAM detects 6+ vulnerability categories
- **Context-Aware Payloads**: AI generates targeted attack vectors
- **Smart Orchestration**: Kestra makes intelligent pipeline decisions

### **Complete Automation Pipeline**
- **End-to-End Security**: Import → Analyze → Test → Fix → PR
- **Professional Output**: Enterprise-grade reports and pull requests
- **CI/CD Integration**: API-driven workflow for automation

### **Enterprise Security Features**
- **Docker Isolation**: Zero-trust containerized analysis
- **Multi-Language Support**: Node.js and Python application analysis
- **Comprehensive Reporting**: HTML, JSON, and PDF security reports

### **Developer-Friendly Design**
- **Web Dashboard**: Intuitive interface for security operations
- **Real-Time Monitoring**: Live pipeline progress and results
- **GitHub Integration**: Seamless pull request workflows

### **Extensible Architecture**
- **Modular Agents**: Pluggable security analysis components
- **Workflow Orchestration**: Kestra-based pipeline management
- **API Integration**: RESTful interfaces for external tools

## 🔧 **Troubleshooting**

### **Common Issues**
1. **Docker Not Running**: Start Docker Desktop before running pipeline
2. **API Key Missing**: Set `OPENROUTER_API_KEY` environment variable
3. **GitHub Token Invalid**: Ensure token has `repo` and `workflow` permissions
4. **Port Conflicts**: Dashboard uses port 4000, ensure it's available

### **Fallback Options**
- **Deterministic Mode**: Pipeline works without AI API keys
- **Sandbox Only**: Test with built-in sandbox application
- **Manual Steps**: Run individual agents for debugging

## 📞 **Support**
- **Documentation**: Check `README.md` for detailed setup
- **Logs**: All operations logged to `ledger/events.log`
- **Dashboard**: Real-time status at `http://localhost:4000`

---

**Demo Duration**: 15-30 minutes
**Skills Demonstrated**: AI/ML, Security Analysis, DevOps, Containerization, API Design
**Technology Stack**: Node.js, Docker, AI APIs, GitHub Integration, Workflow Orchestration
