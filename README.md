# GuardX — Modern Real-Time SOC & Threat Telemetry Dashboard

[![Wazuh SIEM 4.14.7](https://img.shields.io/badge/Wazuh-4.14.7-blue.svg)](https://wazuh.com/)
[![React 19](https://img.shields.io/badge/React-19.3.1-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3.6-646CFF.svg)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4.21.2-green.svg)](https://expressjs.com/)
[![OpenSearch](https://img.shields.io/badge/OpenSearch-2.x-orange.svg)](https://opensearch.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

GuardX is an enterprise-grade Security Operations Center (SOC) telemetry and incident analysis dashboard engineered for **Wazuh 4.14.7**. It bridges real-time security alerts, registered endpoint inventory, file integrity changes, Windows authentication events, PowerShell script block telemetry, and detection rules into a cohesive, high-performance web interface.

---

## Architecture Overview

GuardX is architected with a decoupled dual-tier architecture ensuring strict separation between the browser, the intermediary security API gateway, and the Wazuh cluster:

```
┌────────────────────────────────────────────────────────┐
│               GuardX Web UI (Vite / React 19)          │
│               http://localhost:5173                    │
└───────────────────────────┬────────────────────────────┘
                            │ Reverse Proxy (/api/*)
┌───────────────────────────▼────────────────────────────┐
│          GuardX Backend Gateway (Express / Node.js)     │
│          Listening strictly on http://127.0.0.1:4000    │
│  - Strict CA Certificate Validation (guardx-ca.pem)   │
│  - Automated Wazuh Manager JWT Token Caching & Retry   │
│  - OpenSearch / Wazuh Indexer Query Orchestration      │
│  - Data Normalization, Sanitization & Telemetry Typing │
└─────────────┬────────────────────────────┬─────────────┘
              │ HTTPS (Port 55000)         │ HTTPS (Port 9200)
              │ JWT Authentication         │ HTTP Basic Auth
┌─────────────▼──────────────┐ ┌───────────▼─────────────┐
│    Wazuh Manager API       │ │      Wazuh Indexer       │
│    Version: 4.14.7         │ │      (OpenSearch 2.x)    │
│    Agent & Rule Management │ │   `wazuh-alerts-4.x-*`   │
└────────────────────────────┘ └─────────────────────────┘
```

---

## Key Modules & Capabilities

### 1. Security Overview & Live Alerts (`/alerts`)
- Queries real security alerts from the `wazuh-alerts-4.x-*` index pattern.
- Severity mapping into standard SIEM levels: Critical (level ≥ 15), High (12–14), Medium (7–11), Low (4–6), Informational (0–3).
- Real-time filtering by time range (`15m`, `1h`, `6h`, `24h`, `7d`, `30d`, `all`), severity, agent name, and rule ID.
- In-depth JSON inspection modal preserving the full raw Wazuh alert document.

### 2. Endpoints Inventory (`/endpoints`)
- Retrieves registered agents directly from the Wazuh Manager REST API (`GET /agents`).
- Real-time connection status normalization: `active` → `online`, `disconnected` → `offline`, `never_connected` → `unverified`.
- Detailed agent hardware/OS profiling: OS platform, version, IP address, registration timestamp, last keepalive, and assigned groups.
- Detailed agent inspection endpoint: `GET /api/endpoints/:id`.

### 3. File Integrity Monitoring (FIM / Syscheck) (`/fim`)
- Full separation between **Filesystem** events (`C:\...`, `/etc/...`) and **Windows Registry** changes (`HKEY_LOCAL_MACHINE\...`).
- Action classification: `created` (added), `modified`, and `deleted`.
- User attribution tracking (`syscheck.uname_after` / `uname`), SHA256/MD5 checksum differential tracking.
- Separate, accurate metric cards for File events vs. Registry modifications.

### 4. Windows Authentication Telemetry (`/authentication`)
- Native Windows Security Event ID parsing:
  - **Event ID 4624**: Successful User Logon.
  - **Event ID 4625**: Failed User Logon (Potential Brute-force / Credential Abuse).
- Identity tracking: Target User Name, Target Domain Name, Logon Type (Interactive, Network, Service, etc.), Workstation Name, and Failure Reason.
- Aggregated real-time metrics tracking total events, logon successes, and logon failures.

### 5. PowerShell Alert Telemetry (`/powershell`)
- Dedicated inspection of PowerShell Script Block Execution (**Event ID 4104**).
- Extraction of executed script code, script block GUIDs, originating user, agent, and Wazuh detection rule trigger.
- Full-text search across script code bodies and rule descriptions.
- **Operational Scope**: Telemetry is sourced from alerted events in `wazuh-alerts-4.x-*`. (Unalerted, raw routine scripts require Wazuh Archives index ingestion).

### 6. Detection Rules Explorer (`/rules`)
- Complete index of 4,514 configured detection rules retrieved live from the Wazuh Manager API (`GET /rules`).
- Real-time enrichment from Wazuh Indexer showing historical alert frequency per rule (78 active rules responsible for 3,376+ alerts).
- Distinguishes core rule configuration status (`enabled`) from runtime alert activity (`liveAlertsVerified: true`).
- Supports inspection of out-of-the-box rules as well as custom organization rules (`local_rules.xml`, e.g., Rule 100100 & 100101).

---

## Operating Modes

GuardX supports three flexible data operating modes configured in Settings:

| Mode | Data Source | Network Activity | Purpose |
| :--- | :--- | :--- | :--- |
| **Live** | Real Wazuh Manager & Indexer | Live HTTPS requests to `http://127.0.0.1:4000/api` | Production operations, live incident triage, real telemetry. |
| **Demo** | Realistic in-memory simulation | Zero external API calls | Presentations, UI training, offline demonstrations. |
| **Unconnected** | Catalog placeholders | Zero external API calls | Standalone review of catalog rules and static endpoints. |

---

## Technology Stack

- **Frontend**:
  - React 19 (`19.3.1`) with React Router DOM v7 (`7.18.5`)
  - Vite 8 (`8.3.6`) with ESM Fast Refresh
  - Tailwind CSS v4 (`4.3.5`)
  - Lucide React Icons (`1.72.0`)
  - Recharts (`3.10.1`) for telemetry visualizations
- **Backend API Gateway**:
  - Node.js (v18+ LTS, ES Modules)
  - Express (`4.21.2`)
  - Axios (`1.7.9`) with HTTPS agent & custom CA verification
  - Dotenv (`16.4.7`) for isolated environment configuration
- **SIEM Infrastructure**:
  - Wazuh Manager 4.14.7 (Port 55000)
  - Wazuh Indexer / OpenSearch 2.x (Port 9200)

---

## Prerequisites & Installation

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Wazuh Cluster**: Wazuh Manager 4.14.7 and Wazuh Indexer accessible over loopback or LAN.
- **Root CA Certificate**: PEM-encoded certificate chain for Wazuh (e.g., `root-ca.pem` or `guardx-combined-ca.pem`).

### 2. Install Dependencies

Clone the repository and install dependencies for both the frontend and backend:

```bash
# Clone the repository
git clone https://github.com/your-org/guardx-dashboard.git
cd guardx-dashboard

# Install frontend dependencies
npm install

# Install backend gateway dependencies
cd backend
npm install
cd ..
```

---

## Configuration

GuardX isolates all credentials and connection endpoints inside environment variables.

### 1. Frontend Configuration (`.env`)

Create or update `.env` in the project root:

```ini
# GuardX Frontend Configuration
VITE_API_BASE_URL=/api
VITE_DATA_SOURCE=live
VITE_ENVIRONMENT=LOCAL
VITE_WAZUH_VERSION=4.14.7

# Vite dev server reverse proxy target (not exposed to browser)
API_PROXY_TARGET=http://127.0.0.1:4000
```

### 2. Backend Configuration (`backend/.env`)

Create `backend/.env` (use `backend/.env.example` as a template):

```ini
# Server Binding (Strict loopback isolation)
PORT=4000
HOST=127.0.0.1
NODE_ENV=development
CORS_ORIGIN=http://127.0.0.1:5173,http://localhost:5173

# Wazuh Manager REST API (Port 55000 HTTPS)
WAZUH_API_URL=https://127.0.0.1:55000
WAZUH_API_USER=wazuh
WAZUH_API_PASSWORD=your_wazuh_api_password_here

# Wazuh Indexer / OpenSearch (Port 9200 HTTPS)
WAZUH_INDEXER_URL=https://127.0.0.1:9200
WAZUH_INDEXER_USER=admin
WAZUH_INDEXER_PASSWORD=your_wazuh_indexer_password_here

# Path to Custom Wazuh Root CA Certificate
WAZUH_CA_CERT_PATH=C:/Users/ASUS/Downloads/guardx-combined-ca.pem

# TLS Verification Mode (false = enforce strict CA validation)
WAZUH_ALLOW_SELF_SIGNED=false
```

> **Security Note**: Never commit `backend/.env` or any file containing plaintext credentials or private keys to version control. Both `.env` and `backend/.env` are included in `.gitignore`.

---

## Starting the Application

### Option A: Development Mode (Two Terminals)

**Terminal 1 — Start the Backend API Gateway:**
```bash
cd backend
npm start
# Expected output:
# [GUARDX-BACKEND] [INFO] Loaded custom Wazuh CA certificate
# [GUARDX-BACKEND] [INFO] Listening strictly on: http://127.0.0.1:4000
```

**Terminal 2 — Start the Vite Frontend:**
```bash
npm run dev
# Expected output:
# Local: http://localhost:5173/
```

Open `http://localhost:5173` in your web browser.

### Option B: Production Build

```bash
# Build the production frontend bundle
npm run build

# Preview the production build locally
npm run preview
```

---

## API Specification

All endpoints are hosted by the backend gateway on `http://127.0.0.1:4000` and proxied by Vite via `/api/*`:

| Endpoint | Method | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | — | Health probe checking Manager API (55000) and Indexer (9200). Returns cluster status and latency. |
| `/api/alerts` | `GET` | `range`, `severity`, `agent`, `rule`, `search`, `limit`, `offset` | Real-time security alerts from `wazuh-alerts-4.x-*`. |
| `/api/endpoints` | `GET` | `limit`, `offset`, `search`, `status` | Registered Wazuh agents from Manager API. |
| `/api/endpoints/:id`| `GET` | — | Single agent profile and status inspection. |
| `/api/fim` | `GET` | `range`, `action`, `objectType`, `agent`, `search`, `limit`, `offset` | File and Registry Integrity events with separate aggregation counts. |
| `/api/authentication` | `GET` | `range`, `outcome`, `agent`, `user`, `search`, `limit`, `offset` | Windows Security Event ID 4624 and 4625 authentication events. |
| `/api/powershell` | `GET` | `range`, `agent`, `search`, `limit`, `offset` | PowerShell Script Block execution (Event ID 4104) alert telemetry. |
| `/api/rules` | `GET` | `ruleId`, `severity`, `search`, `limit`, `offset` | Configured Wazuh detection rules enriched with historical alert counts. |

---

## Testing & Quality Assurance

### Automated Integration Test Suite

GuardX includes a comprehensive automated test suite verifying all 6 endpoints, health checks, filter parameters, and Vite proxy transparent routing:

```bash
node scratch/run-integration-tests.js
```

**Integration Test Results Summary:**
- Health API (Manager `running`, Indexer `green`): **PASS**
- Stage 10.1 Alerts API (wazuh-alerts index, severity & agent filters): **PASS**
- Stage 10.2 Endpoints API (Wazuh Manager agents, single agent query): **PASS**
- Stage 10.3 FIM API (File vs. Registry classification & metrics separation): **PASS**
- Stage 10.4 Authentication API (Event ID 4624/4625 success/failure classification): **PASS**
- Stage 10.5 PowerShell API (Event ID 4104 script block extraction & search): **PASS**
- Stage 10.6 Detection Rules API (4,514 configured rules, 78 active alert rules): **PASS**
- Vite Reverse Proxy transparent routing for all endpoints: **PASS**
- **Total: 21 / 21 Tests Passed (0 Failures)**

### Code Quality & Build Verification
```bash
# Run ESLint across entire codebase
npm run lint

# Run Vite production build
npm run build
```

---

## Operational Scope & Known Behaviors

1. **PowerShell Alert Telemetry Scope**:
   In standard Wazuh deployments, the Indexer cluster only ingests alerted events into `wazuh-alerts-4.x-*`. Routine, non-suspicious PowerShell executions do not generate alerts unless custom rules or raw archives indexing (`wazuh-archives-*`) are explicitly enabled in `/var/ossec/etc/ossec.conf`. GuardX accurately designates this data as **PowerShell Alert Telemetry**.

2. **Manager (Agent 000) Keepalive**:
   The Wazuh Manager daemon (Agent ID `000`) reports a keepalive timestamp of `9999-12-31 23:59:59` natively. GuardX normalizes this value to `null` to avoid displaying illogical dates in the UI.

3. **Strict TLS Enforcement**:
   Self-signed certificates without an explicit CA will be rejected with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Always supply your cluster's CA bundle via `WAZUH_CA_CERT_PATH`.

---

## Troubleshooting Guide

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | Backend cannot verify self-signed Wazuh certificates. | Ensure `WAZUH_CA_CERT_PATH` in `backend/.env` points to a valid PEM certificate bundle. |
| `ECONNREFUSED 127.0.0.1:4000` | Backend Express server is not running. | Run `npm start` in the `backend/` directory. |
| `401 Unauthorized` on Manager API | Wazuh API JWT expired or invalid credentials. | The backend automatically refreshes expired JWT tokens; verify `WAZUH_API_USER` and `WAZUH_API_PASSWORD` in `backend/.env`. |
| Connection Pill shows "Unreachable" | Frontend cannot reach `/api/health`. | Check browser network console to ensure Vite proxy is routing to `http://127.0.0.1:4000`. |
| Endpoints show 0 agents | Wazuh Manager service stopped or blocked by firewall. | Run `systemctl status wazuh-manager` on your Wazuh host and confirm port 55000 is open. |

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
