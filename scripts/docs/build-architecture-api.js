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

export async function generateArchitectureApiDocs() {
  console.log('Generating GuardX Technical Architecture and API Documentation (DOCX)...')

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
                    text: 'GuardX — Technical Architecture & Complete API Specification',
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
                    text: 'Technical Handover | Page ',
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
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: 'GUARDX TECHNICAL ARCHITECTURE & API REFERENCE',
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
                text: 'Comprehensive Subsystem Design, SIEM Interfacing, AI Integration, and Route Contracts',
                size: 24,
                color: COLORS.accent,
                italics: true,
                font: 'Calibri',
              }),
            ],
            spacing: { before: 0, after: 720 },
            alignment: AlignmentType.CENTER,
          }),

          h1('1. System Architecture Overview'),
          p(
            'GuardX decouples security telemetry ingestion, SIEM correlation, generative threat intelligence, and client presentation across four independent, hardened architectural tiers:'
          ),
          bullet([
            new TextRun({ text: 'Endpoint Sensor Tier: ', bold: true }),
            new TextRun({ text: 'Wazuh 4.14.7 Agents deployed on Windows and Linux endpoints.' }),
          ]),
          bullet([
            new TextRun({ text: 'SIEM & Indexing Tier: ', bold: true }),
            new TextRun({ text: 'Wazuh Manager (port 55000 REST) and Wazuh Indexer (port 9200 OpenSearch REST).' }),
          ]),
          bullet([
            new TextRun({ text: 'API Gateway & AI Tier: ', bold: true }),
            new TextRun({ text: 'Node.js 22 / Express 4 API Gateway interfacing with Google Gemini 2.5 Flash.' }),
          ]),
          bullet([
            new TextRun({ text: 'Client Presentation Tier: ', bold: true }),
            new TextRun({ text: 'React 19, Tailwind CSS 4, Recharts, and React Router DOM 7.' }),
          ]),

          h1('2. Telemetry Ingestion Pipeline & Data Flow'),
          p(
            'The data pipeline guarantees strict data isolation, zero credential leakage, and high fault-tolerance:'
          ),
          codeBlock(
            '1. Windows Event Channel (4624/4625/4104) -> Wazuh Agent (Encrypted TCP 1514)\n' +
              '2. Wazuh Manager -> XML Decoders -> Rules Matching (Rules 100100, 100101, 5402)\n' +
              '3. Filebeat Ingestion -> Wazuh Indexer (OpenSearch index: wazuh-alerts-4.x-*)\n' +
              '4. GuardX Backend (Port 4000) -> OpenSearch Queries with Boolean Filters & Aggregations\n' +
              '5. Threat Correlation Engine -> Clusters Events -> Sanitizes PII & Secrets\n' +
              '6. Google Gemini 2.5 Flash -> Returns Structured JSON Classification & MITRE ATT&CK Mapping\n' +
              '7. Persistence Engine -> Writes to backend/data/ai-incidents.json with Full Version Provenance\n' +
              '8. React 19 Frontend -> Consumes Normalized JSON via /api/* Endpoints'
          ),

          new Paragraph({ children: [new PageBreak()] }),

          h1('3. Complete Backend API Route Specification'),
          p('The GuardX backend implements 14 REST endpoints across 7 functional route controllers:'),

          h2('3.1 Health & Connectivity Controller'),
          p([new TextRun({ text: 'GET /api/health', bold: true })]),
          bullet([new TextRun({ text: 'Purpose: Probes connectivity to Wazuh Manager (55000) and Indexer (9200).' })]),
          bullet([new TextRun({ text: 'Response: { ok: boolean, manager: string, indexer: string, version: "4.14.7", checkedAt: ISOString }' })]),

          h2('3.2 Security Alerts Controller'),
          p([new TextRun({ text: 'GET /api/alerts', bold: true })]),
          bullet([new TextRun({ text: 'Query Params: range (15m|1h|6h|24h|7d|30d), severity, agentId, limit, offset, search.' })]),
          bullet([new TextRun({ text: 'Response: { affected_items: Alert[], total_affected_items: number, offset: number, limit: number }' })]),
          p([new TextRun({ text: 'GET /api/alerts/:id', bold: true })]),
          bullet([new TextRun({ text: 'Purpose: Retrieves a single raw alert document from OpenSearch by document ID.' })]),

          h2('3.3 Endpoints Controller'),
          p([new TextRun({ text: 'GET /api/endpoints', bold: true })]),
          bullet([new TextRun({ text: 'Query Params: limit, offset, search, status (all|online|offline|unverified), agentId.' })]),
          bullet([new TextRun({ text: 'Response: Standardized agent array with mapped online/offline status derived from Wazuh keepalives.' })]),
          p([new TextRun({ text: 'GET /api/endpoints/:id', bold: true })]),
          bullet([new TextRun({ text: 'Purpose: Fetches complete agent metadata and hardware specs for a specific agent ID.' })]),

          h2('3.4 Telemetry Monitoring Controller'),
          p([new TextRun({ text: 'GET /api/fim', bold: true })]),
          bullet([new TextRun({ text: 'Query Params: range, limit, offset, agentId, action (created|modified|deleted), objectType (file|registry).' })]),
          p([new TextRun({ text: 'GET /api/authentication', bold: true })]),
          bullet([new TextRun({ text: 'Query Params: range, limit, offset, agentId, status (success|failed), user.' })]),
          p([new TextRun({ text: 'GET /api/powershell', bold: true })]),
          bullet([new TextRun({ text: 'Query Params: range, limit, offset, agentId, search (script block text).' })]),

          h2('3.5 Detection Rules Controller'),
          p([new TextRun({ text: 'GET /api/rules', bold: true })]),
          bullet([new TextRun({ text: 'Query Params: search, severity, level, group, ruleId, limit, offset.' })]),
          p([new TextRun({ text: 'GET /api/rules/:id', bold: true })]),
          bullet([new TextRun({ text: 'Purpose: Retrieves rule XML definition, level, description, and live alert triggering count.' })]),

          h2('3.6 Application Inventory Controller'),
          p([new TextRun({ text: 'GET /api/applications', bold: true })]),
          bullet([new TextRun({ text: 'Query Params: agentId (002|003|000|all), search, publisher, limit, offset.' })]),
          p([new TextRun({ text: 'GET /api/applications/history', bold: true })]),
          bullet([new TextRun({ text: 'Purpose: Returns the audit history of installed, removed, and upgraded packages.' })]),

          h2('3.7 Threat Intelligence Controller'),
          p([new TextRun({ text: 'GET /api/threat-intel', bold: true })]),
          bullet([new TextRun({ text: 'Query Params: agentId, severity, attackType, search, limit, offset.' })]),
          p([new TextRun({ text: 'POST /api/threat-intel/analyze', bold: true })]),
          bullet([new TextRun({ text: 'Request Body: { agentId: "all" | string, force: boolean }' })]),
          p([new TextRun({ text: 'POST /api/threat-intel/reanalyze/:id', bold: true })]),
          bullet([new TextRun({ text: 'Purpose: Re-runs Gemini 2.5 Flash on a specific incident while preserving historical analysis versions.' })]),

          new Paragraph({ children: [new PageBreak()] }),

          h1('4. Gemini AI Integration Specification'),
          p(
            'The AI integration targets Google Generative Language API v1beta using the gemini-2.5-flash model. Request structure, response validation, and fallback handling are strictly codified:'
          ),
          codeBlock(
            '// Request Configuration:\n' +
              'POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent\n' +
              'Headers:\n' +
              '  Content-Type: application/json\n' +
              '  x-goog-api-key: [SECURE_BACKEND_KEY]\n' +
              'Body:\n' +
              '  {\n' +
              '    "contents": [{ "role": "user", "parts": [{ "text": sanitizedTelemetryPrompt }] }],\n' +
              '    "systemInstruction": { "parts": [{ "text": tier3SocSystemInstruction }] },\n' +
              '    "generationConfig": {\n' +
              '      "temperature": 0.2,\n' +
              '      "response_mime_type": "application/json"\n' +
              '    }\n' +
              '  }'
          ),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  const outputPath = 'docs/GuardX_Technical_Architecture_and_API_Documentation.docx'
  fs.writeFileSync(outputPath, buffer)
  console.log(`Successfully generated: ${outputPath} (${buffer.length} bytes)`)
}

generateArchitectureApiDocs().catch((err) => {
  console.error('Error generating architecture doc:', err)
  process.exit(1)
})
