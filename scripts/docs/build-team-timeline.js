import fs from 'fs'
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

export async function generateTeamTimelineDocs() {
  console.log('Generating GuardX Team Responsibilities and Project Timeline (DOCX)...')

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: COLORS.text },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'GuardX — Team Responsibilities, Project Timeline & Viva Prep',
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
                    text: 'Team Documentation | Page ',
                    size: 18,
                    color: COLORS.muted,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    bold: true,
                    color: COLORS.secondary,
                  }),
                  new TextRun({ text: ' of ', size: 18, color: COLORS.muted }),
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
          new Paragraph({
            children: [
              new TextRun({
                text: 'GUARDX TEAM RESPONSIBILITIES & PROJECT TIMELINE',
                size: 48,
                bold: true,
                color: COLORS.secondary,
                font: 'Calibri',
              }),
            ],
            spacing: { before: 720, after: 180 },
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Individual Contribution Matrix, Milestone Schedule, Collaborative Dependencies, and Viva Voce Defense Guide',
                size: 24,
                color: COLORS.accent,
                italics: true,
                font: 'Calibri',
              }),
            ],
            spacing: { before: 0, after: 720 },
            alignment: AlignmentType.CENTER,
          }),

          h1('1. Team Organization & Leadership Structure'),
          p(
            'The GuardX project was designed, engineered, and verified by a dedicated four-member capstone engineering team. To maximize engineering velocity and maintain rigorous code quality, responsibilities were partitioned cleanly across architectural layers:'
          ),

          createTable(
            ['Team Member', 'Architectural Role', 'Primary Ownership Area'],
            [
              ['Yoganandha', 'Project Lead & Full-Stack Architect', 'System Architecture, Gemini 2.5 Flash Integration, Threat Correlation Engine, Backend Services, Endpoint Isolation.'],
              ['Shreyank', 'SIEM & Detection Engineer', 'Wazuh Cluster Integration, Detection Rules Ingestion, PowerShell Script Block Auditing.'],
              ['Sriram', 'Frontend Lead & UI/UX Engineer', 'React 19 Dashboard, Recharts Visualizations, Responsive Design, Overview Dashboard Layout.'],
              ['Bharath Kumar', 'Endpoint Security & Testing Specialist', 'Wazuh Agent Deployment, Syscollector Application Inventory, FIM (Syscheck), Authentication Telemetry.'],
            ],
            [25, 30, 45]
          ),

          new Paragraph({ children: [new PageBreak()] }),

          h1('2. Individual Contribution Breakdown'),

          h2('2.1 Yoganandha — Lead Full-Stack Architect & AI Engineer'),
          bullet([new TextRun({ text: 'Role: ', bold: true }), new TextRun({ text: 'Architectural oversight, AI integration lead, and backend service engineer.' })]),
          bullet([new TextRun({ text: 'Key Deliverables: ', bold: true })]),
          bullet([new TextRun({ text: 'Engineered the threatCorrelation.service.js clustering pipeline, grouping raw Wazuh alerts into contextual attack candidates.' })], 1),
          bullet([new TextRun({ text: 'Integrated Google Gemini 2.5 Flash via v1beta REST API with zero-leakage x-goog-api-key header transport.' })], 1),
          bullet([new TextRun({ text: 'Implemented prompt injection defense and automated log sanitization (scrubbing secrets and passwords).' })], 1),
          bullet([new TextRun({ text: 'Built the historical provenance versioning engine (analysisHistory) and resilient heuristic fallback mechanism.' })], 1),
          bullet([new TextRun({ text: 'Designed the persistent global endpoint isolation architecture connecting TopBar to backend routes.' })], 1),
          bullet([new TextRun({ text: 'Skills: ', bold: true }), new TextRun({ text: 'Node.js, Express, Google Generative AI API, OpenSearch DSL, REST Architecture, Cryptography & TLS.' })]),

          h2('2.2 Shreyank — SIEM & Detection Engineer'),
          bullet([new TextRun({ text: 'Role: ', bold: true }), new TextRun({ text: 'SIEM integration specialist and Windows log auditing engineer.' })]),
          bullet([new TextRun({ text: 'Key Deliverables: ', bold: true })]),
          bullet([new TextRun({ text: 'Authored wazuhApi.service.js and wazuhIndexer.service.js for secure Manager JWT acquisition and OpenSearch queries.' })], 1),
          bullet([new TextRun({ text: 'Integrated the Detection Rules module (GET /api/rules), enriching configured rules with live alert trigger counts.' })], 1),
          bullet([new TextRun({ text: 'Implemented the PowerShell monitoring telemetry pipeline, capturing Windows Event ID 4104 script blocks.' })], 1),
          bullet([new TextRun({ text: 'Configured Wazuh decoders and custom rules (100100 for brute force, 100101 for suspicious PowerShell).' })], 1),
          bullet([new TextRun({ text: 'Skills: ', bold: true }), new TextRun({ text: 'Wazuh Administration, OpenSearch Indexing, Windows Event Channels, PowerShell Security, RegEx Decoders.' })]),

          h2('2.3 Sriram — Frontend Lead & UI/UX Engineer'),
          bullet([new TextRun({ text: 'Role: ', bold: true }), new TextRun({ text: 'Frontend UI/UX lead and data visualization specialist.' })]),
          bullet([new TextRun({ text: 'Key Deliverables: ', bold: true })]),
          bullet([new TextRun({ text: 'Engineered the React 19 application shell with responsive sidebar, top navigation bar, and tabbed routing.' })], 1),
          bullet([new TextRun({ text: 'Designed the high-performance dark cybersecurity dashboard theme using Tailwind CSS 4 variables.' })], 1),
          bullet([new TextRun({ text: 'Implemented interactive Recharts timelines and attack distribution charts with responsive viewport heights (280-320px).' })], 1),
          bullet([new TextRun({ text: 'Built modal inspection dialogues for deep forensic analysis of raw alerts, script blocks, and FIM hashes.' })], 1),
          bullet([new TextRun({ text: 'Optimized production Vite bundler configuration, achieving sub-second load times.' })], 1),
          bullet([new TextRun({ text: 'Skills: ', bold: true }), new TextRun({ text: 'React 19, Tailwind CSS 4, Vite 8, Recharts, Responsive Layouts, UI State Management.' })]),

          h2('2.4 Bharath Kumar — Endpoint Security & Testing Specialist'),
          bullet([new TextRun({ text: 'Role: ', bold: true }), new TextRun({ text: 'Endpoint sensor administrator and quality assurance specialist.' })]),
          bullet([new TextRun({ text: 'Key Deliverables: ', bold: true })]),
          bullet([new TextRun({ text: 'Enrolled and managed live test endpoints: Agent 002 (JARVIS Windows 11) and Agent 003 (Friend-Windows-01).' })], 1),
          bullet([new TextRun({ text: 'Implemented the Application Inventory module (GET /api/applications), capturing 705 total installed packages.' })], 1),
          bullet([new TextRun({ text: 'Constructed the Syscollector snapshot diffing algorithm, tracking 157 software installation, removal, and version drift events.' })], 1),
          bullet([new TextRun({ text: 'Audited File Integrity Monitoring (FIM / Syscheck) tracking Windows Registry and critical file changes.' })], 1),
          bullet([new TextRun({ text: 'Constructed the test matrix and captured 59 verification artifacts proving 100% operational readiness.' })], 1),
          bullet([new TextRun({ text: 'Skills: ', bold: true }), new TextRun({ text: 'Windows 11 / Linux Administration, Wazuh Syscollector, Syscheck FIM, QA Automation, Test Verification.' })]),

          new Paragraph({ children: [new PageBreak()] }),

          h1('3. Project Development Timeline & Milestones'),
          createTable(
            ['Sprint / Milestone', 'Duration', 'Key Engineering Deliverables Achieved'],
            [
              ['Sprint 1: Architecture & Design', 'Weeks 1–2', 'Requirements specification, tech stack selection, Express boilerplate, and React 19 initial setup.'],
              ['Sprint 2: Wazuh Cluster Deployment', 'Weeks 3–4', 'Ubuntu Server 24.04 setup, Wazuh Manager (55000) & Indexer (9200) installation, TLS certificate generation.'],
              ['Sprint 3: Sensor Agent Deployment', 'Weeks 5–6', 'Wazuh Agent installation on JARVIS (002) and Friend-Windows-01 (003), encrypted port 1514 verification.'],
              ['Sprint 4: Core SIEM Route Integration', 'Weeks 7–8', 'Backend proxy routes for Alerts, Endpoints, FIM, Authentication, and PowerShell telemetry; Live/Demo modes.'],
              ['Sprint 5: Global Endpoint Isolation', 'Weeks 9–10', 'Implementation of global endpoint dropdown, persistent isolation in AppContext, and backend query parameter filtering.'],
              ['Sprint 6: Application Inventory Engine', 'Weeks 11–12', 'Integration of Wazuh Syscollector, snapshot diffing engine, and software version history tracking.'],
              ['Sprint 7: Gemini AI Threat Intelligence', 'Weeks 13–14', 'Threat correlation engine, Gemini 2.5 Flash REST client, prompt sanitization, JSON schema enforcement, fallback engine.'],
              ['Sprint 8: Final Audit & Documentation', 'Weeks 15–16', 'Responsive viewport audit, ESLint verification (0 errors), Vite production build, and comprehensive documentation suite.'],
            ],
            [25, 18, 57]
          ),

          new Paragraph({ children: [new PageBreak()] }),

          h1('4. Viva Voce & Technical Defense Preparation Guide'),
          p(
            'To prepare the team for project evaluation, academic defense, and external viva examinations, the following expected questions and technical defense talking points are prepared:'
          ),

          h2('4.1 General System Questions (All Team Members)'),
          bullet([new TextRun({ text: 'Q: What makes GuardX different from the default Wazuh dashboard?', bold: true })]),
          bullet([new TextRun({ text: 'A: Default Wazuh is a generic tabular SIEM interface that suffers from alert fatigue and multi-endpoint data mixing. GuardX provides strict global endpoint isolation, automated living-off-the-land correlation, real-time Syscollector software diffing, and Tier-3 SOC analyst incident playbooks generated by Google Gemini 2.5 Flash with full historical provenance.' })]),

          h2('4.2 AI & Architecture Questions (Defense: Yoganandha)'),
          bullet([new TextRun({ text: 'Q: How does GuardX protect the Gemini API key and prevent prompt injection?', bold: true })]),
          bullet([new TextRun({ text: 'A: The API key is backend-only and transmitted strictly in the x-goog-api-key HTTP header, never in URLs or client bundles. Telemetry is scrubbed for passwords/keys, truncated, and the model is explicitly instructed via system prompt that all event data is untrusted log evidence and never instructions.' })]),
          bullet([new TextRun({ text: 'Q: What happens if the Gemini API is rate-limited or fails?', bold: true })]),
          bullet([new TextRun({ text: 'A: The backend catches HTTP 429/500 errors and immediately falls back to a deterministic heuristic engine. It stores analysisSource: "heuristic" and modelUsed: null with the failure reason recorded safely, ensuring zero downtime.' })]),

          h2('4.3 SIEM & Telemetry Questions (Defense: Shreyank)'),
          bullet([new TextRun({ text: 'Q: How does GuardX capture and correlate PowerShell attacks?', bold: true })]),
          bullet([new TextRun({ text: 'A: We bind the Microsoft-Windows-PowerShell/Operational channel in ossec.conf on agents to capture Event ID 4104 (Script Block Auditing). Wazuh rule 100101 detects encoded or suspicious execution, and the backend extracts the full script text for analyst review and Gemini classification.' })]),

          h2('4.4 Frontend & Performance Questions (Defense: Sriram)'),
          bullet([new TextRun({ text: 'Q: How does GuardX maintain high performance with thousands of events?', bold: true })]),
          bullet([new TextRun({ text: 'A: The backend offloads aggregations to OpenSearch (Wazuh Indexer) rather than processing raw logs in memory. The React 19 frontend uses concurrent rendering, state isolation via AppContext, and lightweight Recharts SVGs with constrained heights (280-320px) to prevent layout shifts.' })]),

          h2('4.5 Endpoint & Inventory Questions (Defense: Bharath Kumar)'),
          bullet([new TextRun({ text: 'Q: How does the software version history engine work?', bold: true })]),
          bullet([new TextRun({ text: 'A: The Wazuh agent runs Syscollector every hour to inventory installed applications. When polled, our backend compares the new package snapshot against inventory-snapshots.json. It computes additions, deletions, and version drift using natural version parsing, recording changes into software-history.json.' })]),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  const outputPath = 'docs/GuardX_Team_Responsibilities_and_Project_Timeline.docx'
  fs.writeFileSync(outputPath, buffer)
  console.log(`Successfully generated: ${outputPath} (${buffer.length} bytes)`)
}

generateTeamTimelineDocs().catch((err) => {
  console.error('Error generating team timeline doc:', err)
  process.exit(1)
})
