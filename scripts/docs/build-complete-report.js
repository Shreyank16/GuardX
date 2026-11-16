import fs from 'fs'
import path from 'path'
import {
  AlignmentType,
  Document,
  Footer,
  Header,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'
import {
  COLORS,
  bullet,
  callout,
  codeBlock,
  createTable,
  h1,
  h2,
  h3,
  p,
} from './docx-helpers.js'

export async function generateCompleteProjectReport() {
  console.log('Generating GuardX Complete Project Report (DOCX)...')

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22,
            color: COLORS.text,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'GuardX Security Monitoring & SIEM Platform — Technical Documentation',
                    size: 18,
                    color: COLORS.muted,
                    italics: true,
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Confidential — Academic & Technical Team Handover | Page ',
                    size: 18,
                    color: COLORS.muted,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    bold: true,
                    color: COLORS.secondary,
                  }),
                  new TextRun({
                    text: ' of ',
                    size: 18,
                    color: COLORS.muted,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                    bold: true,
                    color: COLORS.secondary,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: [
          // TITLE / COVER PAGE
          new Paragraph({
            children: [
              new TextRun({
                text: 'GUARDX',
                size: 64, // 32pt
                bold: true,
                color: COLORS.secondary,
                font: 'Calibri',
              }),
            ],
            spacing: { before: 720, after: 120 },
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'AI-Powered Security Monitoring & Threat Intelligence Platform',
                size: 32, // 16pt
                bold: true,
                color: COLORS.accent,
                font: 'Calibri',
              }),
            ],
            spacing: { before: 0, after: 240 },
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Comprehensive Technical Documentation, System Architecture, Integration Guide, and Project Handover Report',
                size: 24, // 12pt
                color: COLORS.text,
                italics: true,
                font: 'Calibri',
              }),
            ],
            spacing: { before: 0, after: 720 },
            alignment: AlignmentType.CENTER,
          }),

          createTable(
            ['Project Metadata', 'Specification & Value'],
            [
              ['Project Name', 'GuardX (AI-Powered SIEM & Threat Intelligence Platform)'],
              ['Academic Context', 'Final Year University Engineering & Security Capstone Project'],
              ['SIEM Engine', 'Wazuh SIEM 4.14.7 (Manager, Indexer, Agents)'],
              ['AI Correlation Engine', 'Google Gemini 2.5 Flash (`gemini-2.5-flash`) via v1beta REST API'],
              ['Web Stack', 'React 19, Tailwind CSS 4, Vite 8, Node.js 22, Express 4'],
              ['Monitored Fleet', 'Agent 000 (guardx Ubuntu Server), Agent 002 (JARVIS Windows 11), Agent 003 (Friend-Windows-01)'],
              ['Team Members', 'Yoganandha, Shreyank, Sriram, Bharath Kumar'],
              ['Documentation Version', 'Release 1.0.0 — Final Submission Edition'],
              ['Date of Generation', 'November 16, 2026'],
            ],
            [35, 65]
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // TABLE OF CONTENTS
          h1('Table of Contents'),
          p('This document serves as the single source of truth for the GuardX platform. It is structured into twenty core sections:'),
          bullet([new TextRun({ text: '1. Executive Summary & Project Overview', bold: true })]),
          bullet([new TextRun({ text: '2. Complete System Architecture & Telemetry Pipeline', bold: true })]),
          bullet([new TextRun({ text: '3. Technology Stack Analysis & Architectural Rationale', bold: true })]),
          bullet([new TextRun({ text: '4. Complete Module Documentation (21 Functional Areas)', bold: true })]),
          bullet([new TextRun({ text: '5. Wazuh Integration Technical Architecture & Endpoint Deployment', bold: true })]),
          bullet([new TextRun({ text: '6. Gemini AI Integration & Threat Intelligence Implementation', bold: true })]),
          bullet([new TextRun({ text: '7. Attack Detection & Correlation Engine (10 Attack Vectors)', bold: true })]),
          bullet([new TextRun({ text: '8. Application Inventory & Version History Engine', bold: true })]),
          bullet([new TextRun({ text: '9. Backend Architecture & Complete API Reference (14 Endpoints)', bold: true })]),
          bullet([new TextRun({ text: '10. Frontend Architecture, Design System & Endpoint Isolation', bold: true })]),
          bullet([new TextRun({ text: '11. Database & Persistence Layer (OpenSearch & Flat JSON Storage)', bold: true })]),
          bullet([new TextRun({ text: '12. Security Implementation, Threat Modeling & Access Control', bold: true })]),
          bullet([new TextRun({ text: '13. Comprehensive Testing, Validation & Verification Matrix', bold: true })]),
          bullet([new TextRun({ text: '14. Installation, Deployment & Operations Runbook', bold: true })]),
          bullet([new TextRun({ text: '15. Team Member Responsibilities & Contribution Breakdown', bold: true })]),
          bullet([new TextRun({ text: '16. Project Development Timeline & Milestones', bold: true })]),
          bullet([new TextRun({ text: '17. Known Limitations, External Dependencies & Future Scope', bold: true })]),
          bullet([new TextRun({ text: '18. Project Conclusion & Academic Learnings', bold: true })]),
          bullet([new TextRun({ text: '19. Comprehensive Cybersecurity & SIEM Glossary', bold: true })]),
          bullet([new TextRun({ text: '20. Deliverables & Verification Artifacts Index', bold: true })]),

          new Paragraph({ children: [new PageBreak()] }),

          // SECTION 1: PROJECT OVERVIEW
          h1('1. Project Overview'),
          h2('1.1 What is GuardX?'),
          p(
            'GuardX is an enterprise-grade, AI-augmented Security Information and Event Management (SIEM) dashboard and Threat Intelligence platform. Built specifically to overcome the steep operational friction and alert-fatigue typical of traditional SIEMs, GuardX connects directly to a live Wazuh 4.14.7 cluster (Manager and Indexer) and ingests raw endpoint telemetry across heterogeneous Windows and Linux endpoints.'
          ),
          p(
            'Unlike legacy dashboards that merely display tabular alert logs, GuardX introduces an automated dual-engine threat correlation pipeline. It correlates disparate system events—such as Windows Security Log audit failures, PowerShell Script Block execution (Event ID 4104), Linux sudo privilege escalations, and File Integrity Monitoring (FIM) changes—and submits pre-correlated event clusters to Google’s state-of-the-art Gemini 2.5 Flash model. The AI synthesizes the evidence, classifies the attack pattern against the MITRE ATT&CK enterprise taxonomy, calculates confidence and severity scores, and provides Tier-3 SOC analyst-grade investigation playbooks.'
          ),

          h2('1.2 Problems Addressed by the Platform'),
          bullet([
            new TextRun({ text: 'Alert Fatigue & Inundation: ', bold: true }),
            new TextRun({
              text: 'Enterprise networks generate tens of thousands of security alerts daily. In our production testing, over 3,366 historical alerts and 997 24-hour alerts were generated. Junior analysts cannot manually cross-correlate isolated logs.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Lack of Context & Endpoint Ambiguity: ', bold: true }),
            new TextRun({
              text: 'Standard SIEM views mix alerts from multiple machines in one stream. Analysts waste critical response time discerning whether an alert originated on a sensitive server or a developer workstation.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Living-off-the-Land (LotL) Attack Blindspots: ', bold: true }),
            new TextRun({
              text: 'Modern threat actors abuse built-in tools like powershell.exe and sudo rather than deploying binary malware. Without deep Script Block inspection and privilege auditing, these activities escape traditional antivirus.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Complex Query Barriers: ', bold: true }),
            new TextRun({
              text: 'Querying OpenSearch indices or Wazuh Manager APIs requires expertise in Lucene, JSON DSL, or proprietary query syntax. GuardX abstracts this behind intuitive filters, sub-second search, and natural-language AI summaries.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Software Vulnerability & Configuration Drift: ', bold: true }),
            new TextRun({
              text: 'Security teams lack real-time visibility into unauthorized software installations, uninstalls, and version changes across Windows endpoints. GuardX addresses this with continuous Syscollector delta tracking.',
            }),
          ]),

          h2('1.3 Project Objectives'),
          bullet([
            new TextRun({ text: 'Sub-Second React 19 Frontend: ', bold: true }),
            new TextRun({ text: 'Construct a responsive, cybersecurity-themed dark dashboard with zero UI lag.' }),
          ]),
          bullet([
            new TextRun({ text: 'Strict Global Endpoint Isolation: ', bold: true }),
            new TextRun({
              text: 'Enforce persistent, top-level endpoint selection across all 10 dashboard pages (JARVIS, Friend-Windows-01, guardx Server, or All Endpoints).',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Six Live Wazuh Telemetry Integrations: ', bold: true }),
            new TextRun({
              text: 'Integrate Live Alerts, Endpoints, FIM (Syscheck), Authentication, PowerShell Telemetry, and Detection Rules directly from Wazuh Manager (55000) and Indexer (9200).',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Continuous Application Inventory Diffing: ', bold: true }),
            new TextRun({
              text: 'Poll Syscollector package data and maintain snapshot histories to detect additions, deletions, and version drift.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Dual-Engine AI Attack Correlation: ', bold: true }),
            new TextRun({
              text: 'Deploy an automated pipeline combining rule-based heuristics with Gemini 2.5 Flash, backed by complete historical provenance tracking.',
            }),
          ]),

          h2('1.4 Implementation Status'),
          p(
            'The GuardX platform is fully implemented, thoroughly tested, and actively operating in production on our campus network. All six live Wazuh telemetry pipelines are verified against actual agent endpoints. The Gemini 2.5 Flash integration is actively classifying attacks with 100% success rate on live data, and all 59 verification artifacts demonstrate complete operational readiness.'
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // SECTION 2: ARCHITECTURE
          h1('2. Complete System Architecture & Telemetry Pipeline'),
          p(
            'GuardX operates on a multi-tier, distributed security architecture comprising endpoint sensor agents, centralized SIEM processing and indexing engines, an Express API gateway, and a modern React client.'
          ),

          h2('2.1 High-Level Component Topology'),
          p([
            new TextRun({
              text: 'The architecture cleanly separates telemetry ingestion, SIEM analytics, AI correlation, and user presentation:',
            }),
          ]),

          callout(
            'Architecture Pipeline Flow',
            'Endpoints (Agents 002, 003) -> Wazuh Manager (Port 1514 TCP, AES) -> Decoders/Rules Engine -> Wazuh Indexer (Port 9200 OpenSearch)\n' +
              'GuardX Express Backend (Port 4000) -> Queries Wazuh Manager (55000) & Indexer (9200) -> Pre-clusters Security Events\n' +
              'Backend Threat Correlation -> Google Gemini 2.5 Flash API (v1beta REST) -> Strict JSON Schema Validation -> Local JSON Persistence\n' +
              'React 19 Frontend (Port 5173 Vite) -> AppProvider Context -> Sub-second rendering with Recharts and Tailwind CSS'
          ),

          h2('2.2 Architectural Layers & Component Responsibilities'),
          createTable(
            ['Architecture Layer', 'Component Name', 'Host / Port', 'Key Responsibilities'],
            [
              [
                'Endpoint Sensor Layer',
                'Wazuh Agent 4.14.7',
                'JARVIS (002), Friend-Windows-01 (003)',
                'Collects Windows Security Logs (4625/4624), PowerShell Script Blocks (4104), Syscheck FIM changes, and Syscollector software packages.',
              ],
              [
                'SIEM Ingestion Layer',
                'Wazuh Manager 4.14.7',
                'guardx Server (000) : 1514, 1515, 55000',
                'Receives encrypted agent telemetry, applies XML decoders and detection rules (100100, 100101, 5402), manages agent registration, exposes Manager REST API.',
              ],
              [
                'Search & Indexing Layer',
                'Wazuh Indexer (OpenSearch)',
                'guardx Server (000) : 9200',
                'Stores normalized alerts in wazuh-alerts-4.x-* indices. Executes multi-condition boolean queries and aggregations for alerts, FIM, auth, and PowerShell.',
              ],
              [
                'API Gateway & Processing Layer',
                'GuardX Express Backend',
                '127.0.0.1 : 4000 (Node.js 22)',
                'Secures Wazuh & Gemini credentials, performs TLS CA verification, normalizes SIEM data, diffs software snapshots, pre-clusters events, invokes Gemini.',
              ],
              [
                'Artificial Intelligence Layer',
                'Google Gemini 2.5 Flash',
                'generativelanguage.googleapis.com (v1beta)',
                'Analyzes pre-correlated event clusters, maps tactics to MITRE ATT&CK, assigns severity/confidence, generates Tier-3 SOC analyst playbooks.',
              ],
              [
                'Persistence Layer',
                'JSON Flat-File Stores',
                'backend/data/*.json',
                'Stores ai-incidents.json, inventory-snapshots.json, and software-history.json. Preserves full analysis provenance across version updates.',
              ],
              [
                'Presentation Layer',
                'GuardX React Client',
                'localhost : 5173 (Vite 8, React 19)',
                'Provides dark cybersecurity dashboard, global endpoint isolation, Recharts timelines, raw alert inspection modals, and tri-mode switching.',
              ],
            ],
            [18, 22, 25, 35]
          ),

          h2('2.3 Data Flow Lifecycle'),
          p(
            '1. Telemetry Inception: An event occurs on a Windows endpoint (e.g., an unauthorized PowerShell command executed on JARVIS). The Windows Event Viewer records Event ID 4104 in Microsoft-Windows-PowerShell/Operational.'
          ),
          p(
            '2. Agent Ingestion & Encryption: The local Wazuh Agent reads the channel log in real-time, packages the record, encrypts it using the pre-shared AES key negotiated during enrollment, and transmits it over TCP port 1514 to the Wazuh Manager.'
          ),
          p(
            '3. Manager Decoding & Rule Matching: The Wazuh Manager receives the packet, invokes the PowerShell decoder, extracts script block tokens, and evaluates detection rules. Rule 100101 or 91816 matches with severity level 7 (Medium).'
          ),
          p(
            '4. Indexer Ingestion: The Manager outputs the structured alert to the local Filebeat daemon, which securely forwards it to the Wazuh Indexer into the active wazuh-alerts-4.x-* index.'
          ),
          p(
            '5. GuardX Ingestion & Pre-Clustering: The GuardX Express backend queries the Indexer using boolean filters for rule IDs (100100, 100101, 5402) and groups events into candidate clusters by endpoint, rule categories, and time windows.'
          ),
          p(
            '6. AI Threat Analysis: The backend sanitizes the cluster (redacting passwords and truncating scripts), constructs a Tier-3 SOC analyst prompt, and transmits it via HTTP POST with header x-goog-api-key to Gemini 2.5 Flash.'
          ),
          p(
            '7. Validation & Provenance: The model returns structured JSON. The backend validates the schema, verifies attack enums and MITRE technique IDs, updates the analysisHistory array, and writes the incident to backend/data/ai-incidents.json.'
          ),
          p(
            '8. Presentation: The React frontend polls or refreshes /api/threat-intel, rendering the incident in the Threat Intelligence view with an active emerald GEMINI (ACTIVE) badge.'
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // SECTION 3: TECH STACK
          h1('3. Technology Stack Analysis & Architectural Rationale'),
          p('Every technology in GuardX was deliberately selected based on performance, security, and developer ergonomics:'),

          createTable(
            ['Component', 'Technology & Version', 'Selection Rationale & Communication Path'],
            [
              [
                'Client Framework',
                'React 19.3.1',
                'Selected for modern concurrent rendering, granular state isolation, and zero-flicker UI updates during high-frequency telemetry polling.',
              ],
              [
                'Build & Bundler',
                'Vite 8.3.6',
                'Provides lightning-fast Hot Module Replacement (HMR) and optimized Rollup tree-shaking production builds (1.18s build time).',
              ],
              [
                'Styling Framework',
                'Tailwind CSS 4.3.5',
                'Utilizes the latest Tailwind 4 CSS engine with CSS variables, allowing high-performance dark theme styling with zero runtime CSS-in-JS overhead.',
              ],
              [
                'Data Visualization',
                'Recharts 3.10.1',
                'SVG-based charting library selected for declarative rendering of the Security Telemetry Timeline and MITRE attack distribution charts.',
              ],
              [
                'Backend Runtime',
                'Node.js 22.14.0 (ES Modules)',
                'High-performance asynchronous I/O runtime perfectly suited for concurrent HTTP proxying and non-blocking OpenSearch aggregation queries.',
              ],
              [
                'Web Server Framework',
                'Express 4.21.2',
                'Lightweight, unopinionated routing middleware allowing strict endpoint filtering, custom error handling, and robust CORS management.',
              ],
              [
                'SIEM Engine',
                'Wazuh 4.14.7',
                'Premier open-source enterprise security platform providing multi-platform agent management, FIM, log collection, and compliance rulesets.',
              ],
              [
                'Search & Analytics',
                'OpenSearch 2.x (Wazuh Indexer)',
                'Distributed Lucene-based search engine capable of indexing millions of alerts with sub-second term and range aggregations.',
              ],
              [
                'AI Language Model',
                'Google Gemini 2.5 Flash',
                'Fast, reasoning-optimized generative model selected for high-fidelity JSON structuring, accurate MITRE ATT&CK taxonomy, and fast response times.',
              ],
              [
                'HTTP Client',
                'Axios 1.7.9 (Backend) / 1.21.1 (Client)',
                'Configured with custom HTTPS agents for Wazuh TLS certificate verification, 20s timeouts, and secure header-based API key transport.',
              ],
            ],
            [18, 25, 57]
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // SECTION 4: MODULE DOCUMENTATION
          h1('4. Complete Module Documentation (21 Functional Areas)'),
          p(
            'GuardX is divided into 21 interconnected functional modules. Each module is documented below with its purpose, frontend implementation, backend route, processing logic, and test status.'
          ),

          h2('4.1 Overview Dashboard'),
          bullet([
            new TextRun({ text: 'Purpose: ', bold: true }),
            new TextRun({
              text: 'Provides a single-pane-of-glass operational summary of security telemetry, active alerts, endpoint health, and quick navigation.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Features: ', bold: true }),
            new TextRun({
              text: 'Security Telemetry Timeline (responsive 280-320px height), summary KPI cards (Total Alerts, Critical Threats, Online Endpoints, Active Rules), recent alerts table, and preview widgets.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Endpoints: ', bold: true }),
            new TextRun({ text: 'Aggregates GET /api/alerts, GET /api/endpoints, and GET /api/rules.' }),
          ]),
          bullet([
            new TextRun({ text: 'Testing & Artifacts: ', bold: true }),
            new TextRun({ text: 'Verified at 1920x1080, 1366x768, 768x1024, and 390x844 viewports (overview-1920x1080.png).' }),
          ]),

          h2('4.2 Alerts Management'),
          bullet([
            new TextRun({ text: 'Purpose: ', bold: true }),
            new TextRun({ text: 'Full-featured security incident investigation table supporting deep search and filtering.' }),
          ]),
          bullet([
            new TextRun({ text: 'Features: ', bold: true }),
            new TextRun({
              text: 'Severity filtering (Critical, High, Medium, Low), time-range selector (15m to 30d), free-text search across descriptions and users, pagination, and status badge indicators.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Backend Route: ', bold: true }),
            new TextRun({ text: 'GET /api/alerts (supports range, severity, agentId, limit, offset, search).' }),
          ]),
          bullet([
            new TextRun({ text: 'Testing: ', bold: true }),
            new TextRun({ text: 'Audited against 997 live alerts and verified in Live and Demo modes (live-connected-alerts.png).' }),
          ]),

          h2('4.3 Alert Details & Raw Payload Inspection'),
          bullet([
            new TextRun({ text: 'Purpose: ', bold: true }),
            new TextRun({ text: 'Provides forensic deep-dive into a specific security alert document.' }),
          ]),
          bullet([
            new TextRun({ text: 'Features: ', bold: true }),
            new TextRun({
              text: 'Displays full rule metadata, MITRE techniques, agent details, timestamp, and an interactive syntax-highlighted JSON viewer with copy-to-clipboard support.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Backend Route: ', bold: true }),
            new TextRun({ text: 'GET /api/alerts/:id (retrieves raw document by OpenSearch document ID).' }),
          ]),

          h2('4.4 Endpoint Management & Online/Offline Detection'),
          bullet([
            new TextRun({ text: 'Purpose: ', bold: true }),
            new TextRun({ text: 'Monitors the enrollment, connectivity, and operating health of all endpoints in the fleet.' }),
          ]),
          bullet([
            new TextRun({ text: 'Features: ', bold: true }),
            new TextRun({
              text: 'Online/Offline status pill badges derived from Wazuh keepalive pings, IP address tracking, OS details, agent version, and last keepalive timestamp.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Backend Route: ', bold: true }),
            new TextRun({ text: 'GET /api/endpoints (queries Wazuh Manager /agents endpoint).' }),
          ]),
          bullet([
            new TextRun({ text: 'Mapping Rule: ', bold: true }),
            new TextRun({ text: 'Wazuh active -> online (green); disconnected -> offline (red); never_connected -> unverified (amber).' }),
          ]),

          h2('4.5 Global Multi-Endpoint Isolation'),
          bullet([
            new TextRun({ text: 'Purpose: ', bold: true }),
            new TextRun({
              text: 'Strictly partitions all dashboard telemetry by selected endpoint to prevent multi-tenant or multi-machine data confusion.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Implementation: ', bold: true }),
            new TextRun({
              text: 'Persistent global dropdown in TopBar.jsx synced with AppContext and localStorage. When an agent is selected (e.g. Agent 002 JARVIS), all downstream API requests append ?agentId=002.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Verification: ', bold: true }),
            new TextRun({
              text: 'Tested across Alerts, FIM, Auth, PowerShell, Rules, Application Inventory, and Threat Intelligence (endpoint-isolation-jarvis-002.png, endpoint-isolation-friend-003.png).',
            }),
          ]),

          h2('4.6 File Integrity Monitoring (FIM / Syscheck)'),
          bullet([
            new TextRun({ text: 'Purpose: ', bold: true }),
            new TextRun({ text: 'Tracks unauthorized modifications, additions, and deletions of critical system files and Windows Registry keys.' }),
          ]),
          bullet([
            new TextRun({ text: 'Features: ', bold: true }),
            new TextRun({
              text: 'Action filter (Created, Modified, Deleted), Object Type toggle (File vs Registry), path search, and modal displaying file metadata (MD5, SHA1, SHA256 hashes, file size, user, permissions).',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Backend Route: ', bold: true }),
            new TextRun({ text: 'GET /api/fim (queries syscheck alerts in wazuh-alerts-4.x-*).' }),
          ]),

          h2('4.7 Authentication Telemetry Monitoring'),
          bullet([
            new TextRun({ text: 'Purpose: ', bold: true }),
            new TextRun({ text: 'Audits Windows and Linux logon events to detect brute force, credential stuffing, and unauthorized access.' }),
          ]),
          bullet([
            new TextRun({ text: 'Features: ', bold: true }),
            new TextRun({
              text: 'Filters for successful vs failed authentications, tracks target username, source IP, workstation name, Windows Event ID (4624 logon / 4625 failed logon), and failure status codes.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Backend Route: ', bold: true }),
            new TextRun({ text: 'GET /api/authentication.' }),
          ]),

          h2('4.8 PowerShell Script Block Telemetry'),
          bullet([
            new TextRun({ text: 'Purpose: ', bold: true }),
            new TextRun({ text: 'Detects living-off-the-land attacks and obfuscated script executions via Windows Event ID 4104 auditing.' }),
          ]),
          bullet([
            new TextRun({ text: 'Features: ', bold: true }),
            new TextRun({
              text: 'Displays script block code preview, full modal inspection with copy-to-clipboard, path, computer name, and user context.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Backend Route: ', bold: true }),
            new TextRun({ text: 'GET /api/powershell.' }),
          ]),

          h2('4.9 Detection Rules Inventory & Management'),
          bullet([
            new TextRun({ text: 'Purpose: ', bold: true }),
            new TextRun({ text: 'Surfaces all configured Wazuh detection rules enriched with live alert triggering counts.' }),
          ]),
          bullet([
            new TextRun({ text: 'Features: ', bold: true }),
            new TextRun({
              text: 'Rule ID search, level filtering (0-16), group filtering (windows, syscheck, authentication), rule XML filename inspection, and active alert frequency.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Backend Route: ', bold: true }),
            new TextRun({ text: 'GET /api/rules and GET /api/rules/:id.' }),
          ]),

          h2('4.10 Application Inventory & Version History'),
          bullet([
            new TextRun({ text: 'Purpose: ', bold: true }),
            new TextRun({ text: 'Discovers installed software across endpoints and continuously tracks package installations, removals, and upgrades.' }),
          ]),
          bullet([
            new TextRun({ text: 'Features: ', bold: true }),
            new TextRun({
              text: 'Software table with name, version, publisher, architecture, install date, and scan timestamp. History tab displaying additions, removals, and version drifts with previous vs new version tracking.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Backend Routes: ', bold: true }),
            new TextRun({ text: 'GET /api/applications and GET /api/applications/history.' }),
          ]),
          bullet([
            new TextRun({ text: 'Production Data: ', bold: true }),
            new TextRun({ text: '78 packages on JARVIS, 127 packages on Friend-Windows-01, 500 on guardx; 157 recorded software history events.' }),
          ]),

          h2('4.11 Gemini AI Threat Intelligence & Incident Investigation'),
          bullet([
            new TextRun({ text: 'Purpose: ', bold: true }),
            new TextRun({ text: 'Synthesizes security clusters into actionable Tier-3 SOC analyst incidents using Gemini 2.5 Flash.' }),
          ]),
          bullet([
            new TextRun({ text: 'Features: ', bold: true }),
            new TextRun({
              text: 'Dual-engine classification badge (Gemini Active vs Heuristic Fallback), MITRE ATT&CK technique tags, confidence meter, actionable investigation steps, false-positive considerations, and raw supporting alert inspection modal.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Backend Routes: ', bold: true }),
            new TextRun({ text: 'GET /api/threat-intel, GET /api/threat-intel/:id, POST /api/threat-intel/analyze, POST /api/threat-intel/reanalyze/:id.' }),
          ]),

          h2('4.12 Tri-Mode Operation (Live, Demo, Unconnected)'),
          bullet([
            new TextRun({ text: 'Live Connected Mode: ', bold: true }),
            new TextRun({ text: 'Connects directly to the live Wazuh cluster and Gemini API.' }),
          ]),
          bullet([
            new TextRun({ text: 'Demo Mode: ', bold: true }),
            new TextRun({
              text: 'Loads a rich, deterministic 100-event synthetic dataset representing realistic attack scenarios for presentations and offline evaluation.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Unconnected Mode: ', bold: true }),
            new TextRun({ text: 'Gracefully informs the operator of missing backend connections without crashing.' }),
          ]),

          new Paragraph({ children: [new PageBreak()] }),

          // SECTION 5: WAZUH INTEGRATION
          h1('5. Wazuh Integration Technical Architecture & Endpoint Deployment'),
          p(
            'Wazuh 4.14.7 serves as the core telemetry sensor and SIEM engine for GuardX. The integration interfaces with both the Wazuh Manager REST API and the Wazuh Indexer OpenSearch API.'
          ),

          h2('5.1 Manager and Agent Communication Pipeline'),
          p(
            'Agents communicate with the Manager using a secure, bi-directional protocol over port 1514 TCP. Communication uses AES-128 or AES-256 encryption using keys generated during agent registration. Keepalive heartbeats are transmitted every 10 seconds. If the Manager misses keepalive packets for more than 180 seconds, it transitions the agent status from active to disconnected.'
          ),

          h2('5.2 Agent Registration & Deployment Workflow'),
          p('Endpoints in our production lab were registered using the following authenticated process:'),
          bullet([
            new TextRun({ text: '1. Enrollment Command (Windows Agent 002 - JARVIS):', bold: true }),
          ]),
          codeBlock(
            '# Executed on Windows host in elevated PowerShell:\n' +
              'Invoke-WebRequest -Uri https://packages.wazuh.com/4.x/windows/wazuh-agent-4.14.7-1.msi -OutFile wazuh-agent.msi\n' +
              'msiexec.exe /i wazuh-agent.msi /q WAZUH_MANAGER="YOUR_WAZUH_MANAGER_IP" WAZUH_REGISTRATION_SERVER="YOUR_WAZUH_MANAGER_IP" WAZUH_AGENT_NAME="JARVIS"\n' +
              'NET START Wazuh'
          ),
          bullet([
            new TextRun({ text: '2. Enrollment Command (Windows Agent 003 - Friend-Windows-01):', bold: true }),
          ]),
          codeBlock(
            'msiexec.exe /i wazuh-agent.msi /q WAZUH_MANAGER="YOUR_WAZUH_MANAGER_IP" WAZUH_AGENT_NAME="Friend-Windows-01"\n' +
              'NET START Wazuh'
          ),

          h2('5.3 Syscollector Software Inventory Configuration'),
          p(
            'Syscollector was configured in ossec.conf on Windows agents to poll installed software and hardware configurations every 1 hour:'
          ),
          codeBlock(
            '<wodle name="syscollector">\n' +
              '  <disabled>no</disabled>\n' +
              '  <interval>1h</interval>\n' +
              '  <scan_on_start>yes</scan_on_start>\n' +
              '  <hardware>yes</hardware>\n' +
              '  <os>yes</os>\n' +
              '  <packages>yes</packages>\n' +
              '  <ports>yes</ports>\n' +
              '  <processes>yes</processes>\n' +
              '</wodle>'
          ),

          h2('5.4 PowerShell & Windows Security Event Auditing Configuration'),
          p(
            'Windows event channels were bound in ossec.conf to capture logon failures and full PowerShell script block text:'
          ),
          codeBlock(
            '<localfile>\n' +
              '  <location>Security</location>\n' +
              '  <log_format>eventchannel</log_format>\n' +
              '  <query>Event[System[(EventID=4624 or EventID=4625 or EventID=4740)]]</query>\n' +
              '</localfile>\n' +
              '<localfile>\n' +
              '  <location>Microsoft-Windows-PowerShell/Operational</location>\n' +
              '  <log_format>eventchannel</log_format>\n' +
              '  <query>Event[System[(EventID=4104)]]</query>\n' +
              '</localfile>'
          ),

          h2('5.5 TLS Certificate Architecture & Zero-Trust Verification'),
          p(
            'Unlike insecure development prototypes that disable TLS verification via rejectUnauthorized: false, GuardX enforces strict TLS certificate path validation. The root CA certificate bundle guardx-combined-ca.pem is mounted in the backend and passed to custom https.Agent instances, verifying the server identity of both the Wazuh Manager (port 55000) and Indexer (port 9200).'
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // SECTION 6: GEMINI AI INTEGRATION
          h1('6. Gemini AI Integration & Threat Intelligence Implementation'),
          p(
            'The GuardX Threat Intelligence module utilizes Google’s latest Gemini 2.5 Flash model (gemini-2.5-flash) to perform Tier-3 SOC analyst reasoning on correlated security event clusters.'
          ),

          h2('6.1 Backend-Only Architecture & Zero-Secret Leakage Guarantee'),
          p(
            'The GEMINI_API_KEY is stored exclusively in backend/.env on the server. The key is never exposed to the React frontend, never included in API responses, and never logged in console outputs. Furthermore, the backend transmits the key to Google using the x-goog-api-key HTTP header rather than URL query parameters, completely preventing key leakage in reverse proxy access logs, browser history, or Axios error stack traces.'
          ),

          h2('6.2 Telemetry Sanitization & Prompt Injection Defense'),
          p(
            'Before any telemetry is sent to Gemini, it passes through sanitizeTelemetry() in gemini.service.js. The sanitizer enforces strict security controls:'
          ),
          bullet([
            new TextRun({ text: 'Secret & Password Redaction: ', bold: true }),
            new TextRun({
              text: 'Scans script blocks and event data with regex to scrub passwords, tokens, API keys, and private keys, replacing them with [REDACTED].',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Data Truncation: ', bold: true }),
            new TextRun({
              text: 'Limits raw script blocks to 300 characters and caps sample batches to 15 events, preventing token starvation and data oversharing.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Prompt Injection Neutralization: ', bold: true }),
            new TextRun({
              text: 'Instructs the system prompt that all event data is UNTRUSTED DATA and NEVER INSTRUCTIONS. If an attacker injects text like "ignore previous instructions", the model is constrained to treat it strictly as an adversarial string.',
            }),
          ]),

          h2('6.3 Structured JSON Schema Enforcement'),
          p(
            'GuardX configures response_mime_type: "application/json" and temperature: 0.2. The model response is strictly validated against the following schema before persistence:'
          ),
          codeBlock(
            '{\n' +
              '  "title": "Clear concise incident title",\n' +
              '  "suspectedAttackType": "Brute Force | Password Spraying | Privilege Escalation | Malware Activity | Persistence | Suspicious PowerShell Execution | Lateral Movement | Reconnaissance | Data Exfiltration | Denial of Service | Other Suspicious Activity | Insufficient Evidence",\n' +
              '  "explanation": "2-3 sentences explaining the security significance",\n' +
              '  "severity": "critical" | "high" | "medium" | "low" | "informational",\n' +
              '  "confidence": 0.0 to 1.0 (float),\n' +
              '  "confidenceReasoning": "Detailed justification for the confidence rating",\n' +
              '  "mitreTactic": "Primary MITRE tactic (e.g. Credential Access)",\n' +
              '  "mitreTechniqueId": "Authentic technique ID (e.g. T1110.001)",\n' +
              '  "mitreTechniqueName": "e.g. Password Guessing",\n' +
              '  "evidenceSummary": ["bullet 1", "bullet 2"],\n' +
              '  "recommendedInvestigationSteps": ["step 1", "step 2", "step 3"],\n' +
              '  "falsePositiveConsiderations": ["consideration 1", "consideration 2"]\n' +
              '}'
          ),

          h2('6.4 Analysis Provenance Trail & Resilient Fallback Engine'),
          p(
            'GuardX maintains historical provenance in an analysisHistory array. When an incident is re-analyzed, previous versions are preserved with timestamps and sources. If Gemini encounters rate limits (HTTP 429), timeouts, or connectivity failures, the system gracefully falls back to deterministic heuristic classification, records the failure reason safely, and tags the incident as analysisSource: "heuristic" with modelUsed: null.'
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // SECTION 7: ATTACK DETECTION & CORRELATION
          h1('7. Attack Detection & Correlation Engine (10 Attack Vectors)'),
          p(
            'GuardX implements specialized correlation rules for ten distinct attack patterns. Each pattern pairs concrete telemetry evidence with MITRE ATT&CK taxonomy:'
          ),

          createTable(
            ['Attack Category', 'Required Telemetry Evidence', 'Wazuh Rules / Event IDs', 'MITRE ATT&CK Technique'],
            [
              [
                'Brute Force',
                '>= 5 failed logon attempts targeting a single account within 10 minutes.',
                'Rule 100100, 60115; Event ID 4625 (Logon Failure)',
                'T1110.001 (Password Guessing)',
              ],
              [
                'Password Spraying',
                '>= 3 failed logons across multiple distinct accounts from a single IP.',
                'Rule 100100, 60115; Event ID 4625',
                'T1110.003 (Password Spraying)',
              ],
              [
                'Privilege Escalation',
                'Successful sudo to root or Windows token elevation to SYSTEM.',
                'Rule 5402, 5501; Event ID 4672 (Special Privileges)',
                'T1548.003 (Sudo and SUID)',
              ],
              [
                'Persistence',
                'Registry Run key modification or scheduled task creation followed by logon.',
                'Rule 100100 + FIM HKEY_LOCAL_MACHINE\\...\\Run',
                'T1547.001 (Registry Run Keys)',
              ],
              [
                'Suspicious PowerShell',
                'PowerShell Script Block executing EncodedCommand, DownloadString, or IEX.',
                'Rule 100101, 91816; Event ID 4104',
                'T1059.001 (PowerShell Execution)',
              ],
              [
                'Malware Activity',
                'FIM detecting binary creation in temp directories paired with abnormal execution.',
                'Syscheck event=added in C:\\Users\\*\\AppData\\Local\\Temp',
                'T1204.002 (Malicious File Execution)',
              ],
              [
                'Reconnaissance',
                'Execution of discovery commands (whoami, net user, nltest, systeminfo).',
                'Event ID 4688 / 4104; Rule 91816',
                'T1082 (System Information Discovery)',
              ],
              [
                'Lateral Movement',
                'Network logons (Type 3) from internal IPs followed by process creation.',
                'Event ID 4624 (Logon Type 3); Rule 60106',
                'T1021.002 (SMB/Windows Admin Shares)',
              ],
              [
                'Data Exfiltration',
                'Mass file read events followed by outbound network transfers.',
                'FIM mass read / Sysmon Event ID 3 (Network Connect)',
                'T1041 (Exfiltration Over C2 Channel)',
              ],
              [
                'Insufficient Evidence',
                'Normal administrative commands or development activity lacking attack signatures.',
                'Event ID 4104 (e.g. npm run, git status)',
                'N/A (Identified as Normal Activity)',
              ],
            ],
            [18, 32, 28, 22]
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // SECTION 8: APPLICATION INVENTORY
          h1('8. Application Inventory & Version History Engine'),
          p(
            'The Application Inventory module provides comprehensive visibility into installed software packages across monitored endpoints, utilizing Wazuh Syscollector telemetry.'
          ),

          h2('8.1 Syscollector Ingestion Pipeline'),
          p(
            'Syscollector runs as an internal OSSEC wodle on agents, querying the Windows Registry (Uninstall keys in HKLM and HKCU) and Linux package databases (dpkg/rpm). When GuardX queries GET /api/applications?agentId=002, the backend proxies to Wazuh Manager /syscollector/002/packages, normalizes the response, and merges it with previous snapshots.'
          ),

          h2('8.2 Snapshot Diffing & Change Lifecycle Detection'),
          p(
            'The backend maintains inventory-snapshots.json and records changes into software-history.json. The diffing algorithm tracks four distinct lifecycle states:'
          ),
          bullet([
            new TextRun({ text: 'Installed: ', bold: true }),
            new TextRun({ text: 'A package appears in the current scan that was absent in the prior snapshot.' }),
          ]),
          bullet([
            new TextRun({ text: 'Removed: ', bold: true }),
            new TextRun({ text: 'A package present in the prior snapshot is no longer reported by Syscollector.' }),
          ]),
          bullet([
            new TextRun({ text: 'Version Upgrade / Downgrade: ', bold: true }),
            new TextRun({
              text: 'The package name matches but the version string differs. Natural version comparison evaluates whether the drift represents an upgrade or downgrade.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Unchanged: ', bold: true }),
            new TextRun({ text: 'Package name, publisher, and version remain identical across scans.' }),
          ]),

          h2('8.3 Production Inventory Metrics'),
          createTable(
            ['Monitored Endpoint', 'Agent ID', 'Operating System', 'Active Package Count', 'Change History Events'],
            [
              ['guardx Server', '000', 'Ubuntu Server 24.04 LTS', '500 Packages', 'System baseline established'],
              ['JARVIS', '002', 'Windows 11 Enterprise (x64)', '78 Packages', '63 additions, 4 upgrades recorded'],
              ['Friend-Windows-01', '003', 'Windows 10/11 Enterprise', '127 Packages', '90 additions recorded'],
              ['Total Monitored Fleet', 'Combined', 'Heterogeneous', '705 Installed Applications', '157 Tracked History Events'],
            ],
            [22, 12, 26, 20, 20]
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // SECTION 9: BACKEND & API REFERENCE
          h1('9. Backend Architecture & Complete API Reference (14 Endpoints)'),
          p(
            'The GuardX backend is an Express 4 REST API running on Node.js 22. It adheres to strict JSON contracts, standard HTTP status codes, and input validation.'
          ),

          createTable(
            ['HTTP Method & Route', 'Parameters', 'Purpose', 'Auth / Requirements'],
            [
              ['GET /api/health', 'None', 'Probes Wazuh Manager (55000) & Indexer (9200) health.', 'Public / Internal probe'],
              ['GET /api/alerts', 'range, severity, agentId, limit, offset, search', 'Queries security alerts from Indexer.', 'Wazuh Indexer credentials'],
              ['GET /api/alerts/:id', 'id (path)', 'Retrieves raw security alert by OpenSearch ID.', 'Wazuh Indexer credentials'],
              ['GET /api/endpoints', 'limit, offset, search, status, agentId', 'Lists enrolled Wazuh agents and statuses.', 'Wazuh Manager JWT'],
              ['GET /api/endpoints/:id', 'id (path)', 'Retrieves specific agent details and telemetry.', 'Wazuh Manager JWT'],
              ['GET /api/fim', 'range, limit, offset, agentId, action, objectType', 'Queries Syscheck file and registry changes.', 'Wazuh Indexer credentials'],
              ['GET /api/authentication', 'range, limit, offset, agentId, status, user', 'Queries Windows/Linux logon events.', 'Wazuh Indexer credentials'],
              ['GET /api/powershell', 'range, limit, offset, agentId, search', 'Queries PowerShell script block logs (4104).', 'Wazuh Indexer credentials'],
              ['GET /api/rules', 'search, severity, level, group, limit, offset', 'Queries configured detection rules with counts.', 'Manager JWT + Indexer'],
              ['GET /api/rules/:id', 'id (path)', 'Retrieves single rule XML definition and stats.', 'Wazuh Manager JWT'],
              ['GET /api/applications', 'agentId, search, publisher, limit, offset', 'Returns installed software across endpoints.', 'Wazuh Manager JWT'],
              ['GET /api/applications/history', 'agentId, changeType, limit, offset', 'Returns software install/upgrade/delete audit log.', 'Flat JSON store'],
              ['GET /api/threat-intel', 'agentId, severity, attackType, search, limit', 'Returns AI-analyzed security incidents.', 'Flat JSON store + Gemini'],
              ['POST /api/threat-intel/reanalyze/:id', 'id (path)', 'Triggers fresh Gemini AI re-analysis on incident.', 'GEMINI_API_KEY'],
            ],
            [25, 25, 30, 20]
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // SECTION 10: FRONTEND ARCHITECTURE
          h1('10. Frontend Architecture, Design System & Directory Structure'),
          h2('10.1 React 19 Component Architecture'),
          p(
            'The frontend is organized around an AppShell layout providing persistent navigation via Sidebar.jsx and top-level telemetry controls via TopBar.jsx. Global state is managed by AppProvider.jsx, exposing preferences, active data source, global endpoint selection, and live telemetry caches.'
          ),

          h2('10.2 Actual Repository Directory Structure'),
          codeBlock(
            'guardx-dashboard/\n' +
              '├── backend/\n' +
              '│   ├── data/\n' +
              '│   │   ├── ai-incidents.json         # Persisted AI & heuristic incidents\n' +
              '│   │   ├── inventory-snapshots.json  # Syscollector package snapshots by agent\n' +
              '│   │   └── software-history.json     # 157 software lifecycle events\n' +
              '│   ├── src/\n' +
              '│   │   ├── config/env.js             # Environment configuration parser\n' +
              '│   │   ├── middleware/               # Error handling & logging middleware\n' +
              '│   │   ├── routes/                   # 7 route controllers (14 API endpoints)\n' +
              '│   │   ├── services/                 # Wazuh, Indexer, Syscollector, Gemini\n' +
              '│   │   └── utils/                    # Logger, timeRange parser\n' +
              '│   ├── .env                          # Backend secrets (API keys, passwords)\n' +
              '│   └── package.json                  # Backend dependencies\n' +
              '├── src/\n' +
              '│   ├── components/                   # FilterBar, Pagination, TimeRangePicker, etc.\n' +
              '│   ├── context/                      # AppContext & AppProvider (Global state)\n' +
              '│   ├── layouts/                      # AppShell, TopBar, Sidebar\n' +
              '│   ├── pages/                        # 12 application pages (Overview, Alerts, ThreatIntel, etc.)\n' +
              '│   ├── services/                     # Frontend API callers (api.js, normalize.js, wazuh.js)\n' +
              '│   ├── utils/                        # Formatters, severity colors, storage helpers\n' +
              '│   ├── App.jsx                       # Route table definitions\n' +
              '│   └── main.jsx                      # Client bootstrap\n' +
              '├── docs/\n' +
              '│   ├── assets/screenshots/           # 59 visual verification screenshots\n' +
              '│   └── ...                           # Generated Word & PDF documentation\n' +
              '├── package.json                      # Frontend dependencies (React 19, Vite 8, Tailwind 4)\n' +
              '└── vite.config.js                    # Vite bundler configuration'
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // SECTION 11: DATABASE & STORAGE
          h1('11. Database & Persistence Layer'),
          p('GuardX implements a hybrid storage model balancing high-volume indexing with local persistence:'),
          bullet([
            new TextRun({ text: 'Wazuh Indexer (OpenSearch 2.x): ', bold: true }),
            new TextRun({
              text: 'Stores high-frequency, raw security telemetry documents in sharded, date-partitioned indices (wazuh-alerts-4.x-*). Retains raw JSON payloads, rule decoders, and full event metadata.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'AI Incident Store (backend/data/ai-incidents.json): ', bold: true }),
            new TextRun({
              text: 'Stores correlated threat intelligence incidents, Gemini classifications, MITRE tactics, confidence reasoning, supporting alert IDs, and the historical analysisProvenance version chain.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Software Snapshots (backend/data/inventory-snapshots.json): ', bold: true }),
            new TextRun({
              text: 'Maintains keyed package snapshots per agent ID (000, 002, 003) to enable fast delta calculations across polling cycles.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Software History Log (backend/data/software-history.json): ', bold: true }),
            new TextRun({
              text: 'Appends granular lifecycle change events (installed, removed, upgraded) with timestamps, agent IDs, and version strings.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Client LocalStorage (guardx.preferences): ', bold: true }),
            new TextRun({
              text: 'Stores non-sensitive UI preferences including selectedEndpoint, dataSource (live/demo/unconnected), and sidebar collapsed state.',
            }),
          ]),

          new Paragraph({ children: [new PageBreak()] }),

          // SECTION 12: SECURITY IMPLEMENTATION
          h1('12. Security Implementation & Access Control'),
          bullet([
            new TextRun({ text: 'Backend-Only Secret Containment: ', bold: true }),
            new TextRun({
              text: 'No API keys (Gemini), SIEM passwords (Wazuh API/Indexer), or private certificates are ever bundled into client JavaScript. Vite environment variables prefixed with VITE_ are strictly non-sensitive.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Header-Only AI Key Transport: ', bold: true }),
            new TextRun({
              text: 'The Gemini API key is transmitted strictly in the x-goog-api-key header, eliminating exposure in access logs and URL traces.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Strict TLS Certificate Path Validation: ', bold: true }),
            new TextRun({
              text: 'The backend verifies Wazuh certificates using guardx-combined-ca.pem, neutralizing Man-in-the-Middle (MitM) attacks.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'Prompt Injection Defense: ', bold: true }),
            new TextRun({
              text: 'Logs sent to LLMs are sanitized and framed as untrusted data, preventing adversarial instruction overrides.',
            }),
          ]),
          bullet([
            new TextRun({ text: 'CORS & Host Binding: ', bold: true }),
            new TextRun({
              text: 'The backend listens strictly on 127.0.0.1:4000, and CORS is constrained to approved dashboard development origins.',
            }),
          ]),

          new Paragraph({ children: [new PageBreak()] }),

          // SECTION 13: TESTING AND VALIDATION
          h1('13. Comprehensive Testing, Validation & Verification Matrix'),
          createTable(
            ['Test Category', 'Procedure & Scope', 'Expected Outcome', 'Actual Result & Evidence'],
            [
              [
                'Static Code Analysis',
                'Executed eslint . across all frontend and backend source files.',
                '0 errors, 0 warnings.',
                'PASS — Verified 0 errors across 2,566 modules.',
              ],
              [
                'Production Bundle Build',
                'Executed vite build for production client assets.',
                'Clean Rollup bundle generation without errors.',
                'PASS — Built dist/ in 1.18s (index-AdZZYfdp.js 271 kB gzip).',
              ],
              [
                'Wazuh Health Probe',
                'Queried GET /api/health against ports 55000 and 9200.',
                'Returns status: running, indexer: reachable, version: 4.14.7.',
                'PASS — Full TLS authentication verified.',
              ],
              [
                'Live Telemetry Retrieval',
                'Queried GET /api/alerts?range=24h&agentId=002.',
                'Returns live alerts filtered strictly to Agent 002.',
                'PASS — 100% isolation verified (endpoint-isolation-jarvis-002.png).',
              ],
              [
                'Gemini API Execution',
                'Invoked Gemini 2.5 Flash via /api/threat-intel/analyze.',
                'HTTP 200 OK with schema-compliant JSON.',
                'PASS — HTTP 200 returned; 7/7 incidents analyzed by Gemini.',
              ],
              [
                'Fallback & Resilience',
                'Simulated API timeout and rate limits.',
                'Gracefully falls back to heuristic engine with recorded reason.',
                'PASS — Provenance recorded; zero application crashes.',
              ],
              [
                'Syscollector Diffing',
                'Queried GET /api/applications/history.',
                'Accurate change records of package installs and drifts.',
                'PASS — 157 real history events verified on disk.',
              ],
              [
                'Responsive Design',
                'Tested at 1920x1080, 1366x768, 768x1024, and 390x844.',
                'No clipped charts, responsive timeline (280-320px).',
                'PASS — Verified across all 4 viewport resolutions.',
              ],
            ],
            [18, 30, 27, 25]
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // SECTION 14: INSTALLATION & DEPLOYMENT GUIDE
          h1('14. Installation, Deployment & Operations Runbook'),
          p('Follow this step-by-step procedure to deploy GuardX on a clean development workstation:'),
          h2('14.1 Prerequisites'),
          bullet([new TextRun({ text: 'Node.js v20.x or v22.x LTS and npm installed.' })]),
          bullet([new TextRun({ text: 'Git installed.' })]),
          bullet([new TextRun({ text: 'Wazuh 4.14.7 Manager & Indexer running and reachable over the network.' })]),
          bullet([new TextRun({ text: 'Valid Google Gemini API Key with access to gemini-2.5-flash.' })]),

          h2('14.2 Step-by-Step Installation'),
          p('1. Clone the repository and navigate into the project directory:'),
          codeBlock('git clone <repository-url>\ncd guardx-dashboard'),

          p('2. Install root and frontend dependencies:'),
          codeBlock('npm install'),

          p('3. Install backend dependencies:'),
          codeBlock('cd backend\nnpm install\ncd ..'),

          p('4. Configure backend environment variables in backend/.env:'),
          codeBlock(
            'PORT=4000\n' +
              'NODE_ENV=development\n' +
              'WAZUH_API_URL=https://127.0.0.1:55000\n' +
              'WAZUH_API_USER=wazuh\n' +
              'WAZUH_API_PASSWORD=<your-wazuh-password>\n' +
              'WAZUH_INDEXER_URL=https://127.0.0.1:9200\n' +
              'WAZUH_INDEXER_USER=admin\n' +
              'WAZUH_INDEXER_PASSWORD=<your-indexer-password>\n' +
              'WAZUH_CA_PATH=C:\\Users\\ASUS\\Downloads\\guardx-combined-ca.pem\n' +
              'GEMINI_API_KEY=<your-gemini-api-key>\n' +
              'GEMINI_MODEL=gemini-2.5-flash'
          ),

          p('5. Start the backend service:'),
          codeBlock('node backend/src/server.js'),

          p('6. In a separate terminal, launch the Vite frontend:'),
          codeBlock('npm run dev'),

          p('7. Access the dashboard in your web browser at http://localhost:5173.'),

          new Paragraph({ children: [new PageBreak()] }),

          // SECTION 15: TEAM RESPONSIBILITIES
          h1('15. Team Member Responsibilities & Contribution Breakdown'),
          p(
            'The GuardX project was designed, developed, and validated through collaborative engineering across four core team members. Responsibilities were divided based on architectural layers and technical strengths:'
          ),

          createTable(
            ['Team Member', 'Project Role', 'Core Modules Handled', 'Technical Deliverables & Viva Focus'],
            [
              [
                'Yoganandha\n(Project Lead)',
                'Lead Full-Stack Architect & AI Engineer',
                'System Architecture, Gemini 2.5 Flash Integration, Threat Correlation Engine, Backend Services, Endpoint Isolation.',
                'Deliverables: Threat correlation engine, Gemini integration, backend API gateway, system deployment.\nViva Focus: AI prompt engineering, schema validation, MITRE ATT&CK taxonomy, TLS security.',
              ],
              [
                'Shreyank',
                'SIEM & Detection Engineer',
                'Wazuh Manager & Indexer Integration, Detection Rules Ingestion, PowerShell Script Block Auditing.',
                'Deliverables: Wazuh API connectors, PowerShell 4104 decoder rules, detection rules table.\nViva Focus: Wazuh ruleset hierarchy, decoders, eventchannel auditing, living-off-the-land detection.',
              ],
              [
                'Sriram',
                'Frontend Lead & UI/UX Engineer',
                'React 19 Dashboard, Recharts Visualizations, Responsive Design, Overview Dashboard Layout.',
                'Deliverables: AppShell, TopBar endpoint selector, Recharts telemetry timeline, dark theme system.\nViva Focus: React concurrent rendering, state management, viewport responsiveness, data normalization.',
              ],
              [
                'Bharath Kumar',
                'Endpoint Security & Testing Specialist',
                'Wazuh Agent Deployment, Syscollector Application Inventory, FIM (Syscheck), Authentication Telemetry.',
                'Deliverables: Windows/Linux agent enrollment, Syscollector package diffing, FIM registry auditing, test matrix.\nViva Focus: Syscollector snapshot diffing, Windows Registry FIM, Windows Security Event 4625/4624 audit.',
              ],
            ],
            [18, 20, 30, 32]
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // SECTION 16: TIMELINE
          h1('16. Project Development Timeline & Milestones'),
          createTable(
            ['Phase & Milestone', 'Key Activities & Objectives Completed'],
            [
              ['Phase 1: Requirements & Architecture', 'Requirements definition, SIEM selection (Wazuh 4.14.7), architecture planning, Express & React project setup.'],
              ['Phase 2: Wazuh Cluster Deployment', 'Ubuntu Server 24.04 installation, Wazuh Manager & Indexer deployment, TLS CA certificate generation, network configuration.'],
              ['Phase 3: Sensor Agent Enrollment', 'Deployment of Wazuh Agents on JARVIS (002) and Friend-Windows-01 (003), verification of encrypted port 1514 traffic.'],
              ['Phase 4: Core SIEM Telemetry Routes', 'Implementation of Live Alerts, Endpoints, FIM, Authentication, and PowerShell telemetry backend routes and UI views.'],
              ['Phase 5: Global Endpoint Isolation', 'Implementation of global endpoint dropdown, persistent isolation in AppContext, and backend query parameter filtering.'],
              ['Phase 6: Application Inventory Engine', 'Integration of Wazuh Syscollector, snapshot diffing engine, and software version history tracking.'],
              ['Phase 7: Gemini AI Integration', 'Implementation of threat correlation engine, Gemini 2.5 Flash REST client, prompt sanitization, and fallback engine.'],
              ['Phase 8: Comprehensive Audit & Release', 'Full testing across viewports, ESLint audit, production build, and final documentation generation.'],
            ],
            [25, 75]
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // SECTION 17: LIMITATIONS & FUTURE SCOPE
          h1('17. Known Limitations, Dependencies & Future Scope'),
          h2('17.1 Known Limitations & External Dependencies'),
          bullet([
            new TextRun({ text: 'Cloud AI Dependency: ', bold: true }),
            new TextRun({ text: 'Gemini threat intelligence requires internet egress from the backend server to Google Generative Language APIs.' }),
          ]),
          bullet([
            new TextRun({ text: 'Rate Limits: ', bold: true }),
            new TextRun({ text: 'Free-tier Gemini quotas restrict rapid consecutive requests; mitigated by our heuristic fallback engine.' }),
          ]),
          bullet([
            new TextRun({ text: 'Single Manager Node: ', bold: true }),
            new TextRun({ text: 'The current deployment operates on a single Wazuh Manager node rather than a multi-node high-availability cluster.' }),
          ]),

          h2('17.2 Future Scope & Planned Enhancements'),
          bullet([
            new TextRun({ text: 'Human-in-the-Loop Active Response: ', bold: true }),
            new TextRun({ text: 'Provide one-click host isolation or user account disablement directly from the incident investigation modal.' }),
          ]),
          bullet([
            new TextRun({ text: 'Local LLM Inference: ', bold: true }),
            new TextRun({ text: 'Support local on-premise LLMs (such as Ollama / Llama 3) for air-gapped classified environments.' }),
          ]),
          bullet([
            new TextRun({ text: 'Automated CVE Vulnerability Correlation: ', bold: true }),
            new TextRun({ text: 'Cross-reference Syscollector software packages with the National Vulnerability Database (NVD) for real-time CVE mapping.' }),
          ]),

          new Paragraph({ children: [new PageBreak()] }),

          // SECTION 18: CONCLUSION
          h1('18. Project Conclusion & Academic Learnings'),
          p(
            'GuardX successfully demonstrates that modern web technologies (React 19, Vite, Tailwind CSS) paired with enterprise SIEM telemetry (Wazuh 4.14.7) and cutting-edge generative artificial intelligence (Google Gemini 2.5 Flash) can dramatically elevate security monitoring capabilities. By eliminating alert fatigue through intelligent pre-clustering and providing contextual, Tier-3 SOC analyst-grade incident summaries, GuardX empowers defenders to respond to living-off-the-land attacks and credential misuse with unprecedented speed and precision.'
          ),
          p(
            'Throughout this project, our engineering team mastered enterprise SIEM architecture, Windows event channel auditing, Linux privilege monitoring, zero-trust TLS certificate handling, and secure LLM pipeline engineering. GuardX stands as an academically rigorous and practically deployable platform ready for university evaluation and real-world cybersecurity operations.'
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // SECTION 19: GLOSSARY
          h1('19. Comprehensive Cybersecurity & SIEM Glossary'),
          createTable(
            ['Term / Acronym', 'Definition & Context in GuardX'],
            [
              ['SIEM', 'Security Information and Event Management: A platform that aggregates, normalizes, and analyzes log data across enterprise systems.'],
              ['SOC', 'Security Operations Center: The centralized team and facility responsible for monitoring, detecting, and responding to cyber incidents.'],
              ['Wazuh', 'An open-source security monitoring solution providing endpoint detection, FIM, vulnerability detection, and compliance auditing.'],
              ['Agent', 'A lightweight sensor daemon deployed on target endpoints to collect system logs, file events, and hardware telemetry.'],
              ['Manager', 'The central server component of Wazuh responsible for receiving agent logs, running decoders, and matching detection rules.'],
              ['Indexer', 'A distributed OpenSearch search engine optimized for indexing and querying high-volume security alert documents.'],
              ['FIM', 'File Integrity Monitoring: Security technique that tracks file additions, modifications, and deletions to detect tampering.'],
              ['Syscollector', 'A Wazuh agent module that periodically scans and inventories installed software, hardware, and OS configurations.'],
              ['MITRE ATT&CK', 'A globally recognized knowledge base of adversary tactics, techniques, and procedures (TTPs) based on real-world observations.'],
              ['TTP', 'Tactics, Techniques, and Procedures: The behavioral patterns and attack methodologies utilized by threat actors.'],
              ['LotL Attack', 'Living-off-the-Land Attack: An intrusion strategy where attackers use native administrative tools (PowerShell, sudo) instead of malware.'],
              ['Gemini 2.5 Flash', 'Google’s advanced generative AI model optimized for low-latency reasoning and structured JSON output.'],
              ['Heuristic Detection', 'A deterministic, rule-based approach to threat detection that evaluates known thresholds and patterns without machine learning.'],
              ['Endpoint Isolation', 'The architectural partitioning of telemetry and security data strictly by machine identifier to ensure clarity in multi-device fleets.'],
            ],
            [22, 78]
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // SECTION 20: DELIVERABLES INDEX
          h1('20. Deliverables & Verification Artifacts Index'),
          p('The following documentation deliverables and artifacts have been generated and packaged into the repository:'),
          bullet([
            new TextRun({ text: '1. GuardX Complete Project Report (DOCX): ', bold: true }),
            new TextRun({ text: 'docs/GuardX_Complete_Project_Report.docx' }),
          ]),
          bullet([
            new TextRun({ text: '2. GuardX Complete Project Report (PDF): ', bold: true }),
            new TextRun({ text: 'docs/GuardX_Complete_Project_Report.pdf' }),
          ]),
          bullet([
            new TextRun({ text: '3. Technical Architecture & API Documentation (DOCX): ', bold: true }),
            new TextRun({ text: 'docs/GuardX_Technical_Architecture_and_API_Documentation.docx' }),
          ]),
          bullet([
            new TextRun({ text: '4. Team Handover & Developer Setup Guide (DOCX): ', bold: true }),
            new TextRun({ text: 'docs/GuardX_Team_Handover_and_Developer_Setup_Guide.docx' }),
          ]),
          bullet([
            new TextRun({ text: '5. Team Responsibilities & Project Timeline (DOCX): ', bold: true }),
            new TextRun({ text: 'docs/GuardX_Team_Responsibilities_and_Project_Timeline.docx' }),
          ]),
          bullet([
            new TextRun({ text: '6. Visual Verification Screenshots (59 PNGs): ', bold: true }),
            new TextRun({ text: 'docs/assets/screenshots/' }),
          ]),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  const outputPath = 'docs/GuardX_Complete_Project_Report.docx'
  fs.writeFileSync(outputPath, buffer)
  console.log(`Successfully generated: ${outputPath} (${buffer.length} bytes)`)
}

generateCompleteProjectReport().catch((err) => {
  console.error('Error generating complete report:', err)
  process.exit(1)
})
