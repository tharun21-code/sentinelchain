# SentinelChain — AI-Powered Security Analysis Platform

SentinelChain is an intelligent security analysis platform that automatically discovers, analyzes, and patches vulnerabilities in web applications through a complete AI-driven pipeline.

## 🚀 Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Set up environment (interactive setup)
node setup_env.js

# OR manually create .env file:
# cp .env.example .env
# Then edit .env with your API keys

# 3. Test your API keys (optional)
node test_api.js

# 4. Start the dashboard
npm run start:dashboard

# 5. Open browser to http://localhost:4000
```

### 🔑 Environment Variables

SentinelChain requires API keys for AI models and GitHub integration:

- **`OPENROUTER_API_KEY`**: Required for AI-powered security analysis and code generation
- **`GITHUB_TOKEN`**: Required for repository import and PR creation
- **`GITHUB_OWNER`**: Your GitHub username
- **`TARGET_GITHUB_REPO`**: Repository name for PR creation

**Get your keys:**
- [OpenRouter API Key](https://openrouter.ai/keys)
- [GitHub Personal Access Token](https://github.com/settings/tokens) (needs `repo` and `workflow` permissions)

## 📖 Demo Instructions

For a complete demonstration of SentinelChain's capabilities, follow the detailed step-by-step guide in [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md).

The demo script includes:
- **Environment setup** and configuration
- **Repository import** and analysis workflow
- **Complete pipeline execution** with real-time monitoring
- **Security report generation** and review
- **GitHub PR creation** with automated fixes
- **Kestra workflow orchestration** demonstration
- **Safety and security notes** for ethical testing

**Demo Duration**: 15-30 minutes
**Prerequisites**: Node.js 18+, Docker, Git, API keys

---

## 🤖 Collaborative AI Agents Architecture

### **Agent Communication Flow Diagram**

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Human User    │────▶│   Dashboard     │────▶│  Kestra Agent   │
│                 │     │  (Web Interface)│     │ (Decision Engine)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                           │                     │
         ▼                           ▼                     ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ GitHub Import   │────▶│     FAAM        │────▶│     Ledger      │
│   (Clone Repo)  │     │ (Vulnerability  │     │   (Events &     │
│                 │     │    Scanner)     │     │   Graph Data)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                           │                     │
         ▼                           ▼                     ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AdSyn Agent   │────▶│  RedAgent       │────▶│  AutoFix Agent  │
│ (Payload Gen)   │     │ (Attack Exec)   │     │ (Self-Patching) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                           │                     │
         ▼                           ▼                     ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ CodeRabbit      │────▶│  GitHub PR      │────▶│   Re-Analysis   │
│ (AI Reviewer)   │     │   Creation      │     │   Loop          │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### **Agent Communication & Decision Flow**

#### **Ledger-Based Communication**
All agents communicate asynchronously through the **forensic ledger** system:
- **`ledger/events.log`**: Timestamped event stream with complete audit trail
- **`ledger/graph.json`**: Vulnerability analysis graphs and attack surfaces
- **`ledger/report.json`**: Comprehensive security assessment data
- **`ledger/last_import.json`**: Imported repository metadata
- **`ledger/last_payload.json`**: Generated attack vectors and payloads

#### **Kestra Intelligent Orchestration**
The Kestra workflow engine serves as the **central decision authority**:
- **Data Analysis**: Processes ledger events to understand security posture
- **AI Decision Making**: Uses OpenRouter API for context-aware orchestration decisions
- **Workflow Branching**: Routes execution based on `auto_pr`, `monitor`, or `noop` decisions
- **Fallback Logic**: Deterministic rules when AI is unavailable

#### **CodeRabbit Quality Enhancement**
Professional AI code review integration:
- **Patch Review**: Analyzes AutoFix-generated security patches
- **Quality Assurance**: Validates patch effectiveness and code quality
- **Suggestions**: Provides improvement recommendations for security fixes
- **Audit Trail**: Documents review findings in PR comments

#### **AutoFix Direct Repository Modification**
Intelligent patching system:
- **Vulnerability Detection**: Scans for command injection, eval usage, dangerous functions
- **Patch Application**: Directly modifies source files in imported repositories
- **Sanitize Functions**: Injects input validation and security hardening
- **Git Integration**: Creates branches and commits security improvements

#### **Autonomous Re-Analysis Loop**
Self-improving security workflow:
- **Post-Fix Validation**: Re-runs analysis after AutoFix to verify improvements
- **Iterative Enhancement**: Continues patching until confidence threshold met
- **Quality Gates**: Only proceeds when security metrics improve
- **Escalation Logic**: Involves human review for complex scenarios

### **Why This System is Unique**

#### **Agent Interoperability**
- **Decentralized Architecture**: Agents operate independently with shared state
- **Ledger-Based Coupling**: Loose coupling through immutable event streams
- **Composable Workflows**: Agents can be combined in different sequences
- **Plugin Architecture**: New agents can be added without modifying existing ones

#### **Enterprise Safety Guarantees**
- **Zero Host Execution**: Imported code never runs on the host system
- **Docker Sandboxing**: All testing occurs in isolated containers
- **Resource Limits**: CPU and memory restrictions prevent abuse
- **Network Isolation**: Containers have no external connectivity during analysis

#### **Deterministic Fallbacks**
- **AI + Rules Hybrid**: Intelligent decisions with rule-based safety nets
- **Graceful Degradation**: System continues working when AI services fail
- **Predictable Behavior**: Critical security operations have deterministic paths
- **Audit Compliance**: All decisions are logged with reasoning

#### **Full Chain-of-Custody**
- **Forensic Ledger**: Immutable audit trail of all security operations
- **Event Correlation**: Links cause-and-effect across agent actions
- **Timestamp Verification**: Cryptographically verifiable event ordering
- **Compliance Ready**: Supports regulatory requirements for security testing

## 🏗️ Architecture Overview

This repository contains the complete SentinelChain MVP with:
- **FAAM**: Advanced vulnerability scanner
- **AdSyn**: AI-powered payload generation
- **RedAgent**: Safe adversarial testing in Docker
- **Auto-Fixer**: Security patch application
- **Dashboard**: Real-time monitoring interface
- **Kestra Integration**: Workflow orchestration
- **Docker Isolation**: Secure containerized analysis

## 🙏 Credits

### **Core Contributors**
- **Cline**: AI-powered development assistant that architected and implemented the entire SentinelChain system
- **CodeRabbit**: AI code review and quality assurance partner
- **Kestra**: Workflow orchestration engine enabling intelligent pipeline automation
- **OpenRouter**: AI model aggregation platform powering intelligent security decisions

### **Technologies & Partners**
- **Node.js**: Runtime environment for the agent orchestration system
- **Docker**: Containerization platform ensuring safe, isolated security testing
- **GitHub**: Repository hosting and automated PR creation
- **Express.js**: Web framework for the real-time dashboard
- **Axios**: HTTP client for API integrations

### **Inspiration & Methodology**
This project demonstrates the power of **collaborative AI systems** working together to solve complex security challenges. The agent-based architecture showcases how specialized AI models can coordinate through shared state and intelligent orchestration to achieve outcomes beyond individual capabilities.

**Special thanks to the open-source community for providing the foundational technologies that make autonomous security analysis possible.**
