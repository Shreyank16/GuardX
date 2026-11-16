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

export async function generateHandoverSetupGuide() {
  console.log('Generating GuardX Team Handover and Developer Setup Guide (DOCX)...')

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
                    text: 'GuardX — Developer Handover & Setup Guide',
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
                    text: 'Developer Onboarding Guide | Page ',
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
                text: 'GUARDX DEVELOPER SETUP & HANDOVER GUIDE',
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
                text: 'Operational Runbook, Local Environment Configuration, Agent Deployment, and Troubleshooting',
                size: 24,
                color: COLORS.accent,
                italics: true,
                font: 'Calibri',
              }),
            ],
            spacing: { before: 0, after: 720 },
            alignment: AlignmentType.CENTER,
          }),

          h1('1. Introduction & Onboarding Welcome'),
          p(
            'Welcome to the GuardX engineering team. This runbook is designed to take a new software engineer or security researcher from zero to a fully operational local development environment. By following these steps, you will run the React frontend, connect the Express API gateway to the live Wazuh cluster, execute AI threat intelligence correlations with Gemini 2.5 Flash, and enroll test endpoints.'
          ),

          h1('2. System Prerequisites'),
          createTable(
            ['Prerequisite Software', 'Minimum Version', 'Purpose in GuardX'],
            [
              ['Node.js', 'v20.x or v22.x LTS', 'Executes Express backend server and Vite build tools.'],
              ['npm', 'v10.x+', 'Node package manager for dependency resolution.'],
              ['Wazuh Cluster', 'v4.14.7', 'SIEM Manager (55000) and Indexer (9200).'],
              ['Google Gemini API Key', 'Active Tier', 'Cloud LLM reasoning via gemini-2.5-flash.'],
              ['Wazuh CA Certificate', 'PEM Format', 'guardx-combined-ca.pem for zero-trust TLS verification.'],
              ['Git', 'v2.40+', 'Version control.'],
            ],
            [30, 25, 45]
          ),

          new Paragraph({ children: [new PageBreak()] }),

          h1('3. Step-by-Step Environment Setup'),
          h2('3.1 Cloning & Installing Dependencies'),
          codeBlock(
            '# 1. Clone repository\n' +
              'git clone <repository-url>\n' +
              'cd guardx-dashboard\n\n' +
              '# 2. Install root and frontend packages\n' +
              'npm install\n\n' +
              '# 3. Install backend packages\n' +
              'cd backend\n' +
              'npm install\n' +
              'cd ..'
          ),

          h2('3.2 Backend Configuration (.env)'),
          p('Create backend/.env based on backend/.env.example:'),
          codeBlock(
            'PORT=4000\n' +
              'NODE_ENV=development\n\n' +
              '# Wazuh Manager API (HTTPS)\n' +
              'WAZUH_API_URL=https://127.0.0.1:55000\n' +
              'WAZUH_API_USER=wazuh\n' +
              'WAZUH_API_PASSWORD=<your-wazuh-manager-password>\n\n' +
              '# Wazuh Indexer API (OpenSearch HTTPS)\n' +
              'WAZUH_INDEXER_URL=https://127.0.0.1:9200\n' +
              'WAZUH_INDEXER_USER=admin\n' +
              'WAZUH_INDEXER_PASSWORD=<your-indexer-password>\n\n' +
              '# TLS Certificate Verification\n' +
              'WAZUH_CA_PATH=C:\\Users\\ASUS\\Downloads\\guardx-combined-ca.pem\n\n' +
              '# Google Gemini Threat Intelligence Engine\n' +
              'GEMINI_API_KEY=<your-google-gemini-api-key>\n' +
              'GEMINI_MODEL=gemini-2.5-flash'
          ),

          h2('3.3 Launching the Platform'),
          codeBlock(
            '# Terminal 1: Launch Backend API Gateway\n' +
              'node backend/src/server.js\n\n' +
              '# Expected output: Listening strictly on: http://127.0.0.1:4000\n\n' +
              '# Terminal 2: Launch Vite React Frontend\n' +
              'npm run dev\n\n' +
              '# Access dashboard in browser: http://localhost:5173'
          ),

          new Paragraph({ children: [new PageBreak()] }),

          h1('4. Endpoint Sensor Enrollment Runbook'),
          p('To add a new Windows or Linux endpoint to your local GuardX dashboard:'),
          h2('4.1 Windows Agent Enrollment'),
          p('Open an elevated PowerShell prompt on the Windows endpoint and run:'),
          codeBlock(
            'Invoke-WebRequest -Uri https://packages.wazuh.com/4.x/windows/wazuh-agent-4.14.7-1.msi -OutFile wazuh-agent.msi\n' +
              'msiexec.exe /i wazuh-agent.msi /q WAZUH_MANAGER="<MANAGER_IP>" WAZUH_REGISTRATION_SERVER="<MANAGER_IP>" WAZUH_AGENT_NAME="<ENDPOINT_NAME>"\n' +
              'NET START Wazuh'
          ),

          h2('4.2 Linux Agent Enrollment'),
          p('On Ubuntu/Debian endpoints:'),
          codeBlock(
            'wget https://packages.wazuh.com/4.x/apt/pool/main/w/wazuh-agent/wazuh-agent_4.14.7-1_amd64.deb\n' +
              'sudo WAZUH_MANAGER="<MANAGER_IP>" dpkg -i wazuh-agent_4.14.7-1_amd64.deb\n' +
              'sudo systemctl daemon-reload\n' +
              'sudo systemctl enable wazuh-agent\n' +
              'sudo systemctl start wazuh-agent'
          ),

          h1('5. Common Troubleshooting Scenarios'),
          createTable(
            ['Symptom / Error', 'Root Cause', 'Prescribed Resolution'],
            [
              [
                'EADDRINUSE: 4000',
                'A previous Node.js backend instance is still bound to port 4000.',
                'Kill the conflicting process: Get-Process node | Stop-Process -Force or taskkill /F /IM node.exe.',
              ],
              [
                'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
                'Wazuh Manager or Indexer using custom CA not trusted by Node.',
                'Ensure WAZUH_CA_PATH points to the authentic guardx-combined-ca.pem file.',
              ],
              [
                'Gemini HTTP 404',
                'Configured model sunset or invalid on endpoint.',
                'Ensure GEMINI_MODEL=gemini-2.5-flash is configured in backend/.env.',
              ],
              [
                'Empty Telemetry Tables',
                'Agent selected in TopBar has generated no events in the chosen time window.',
                'Switch TopBar dropdown to "All Endpoints" or widen the time range picker to "7d" or "30d".',
              ],
            ],
            [25, 35, 40]
          ),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  const outputPath = 'docs/GuardX_Team_Handover_and_Developer_Setup_Guide.docx'
  fs.writeFileSync(outputPath, buffer)
  console.log(`Successfully generated: ${outputPath} (${buffer.length} bytes)`)
}

generateHandoverSetupGuide().catch((err) => {
  console.error('Error generating handover doc:', err)
  process.exit(1)
})
