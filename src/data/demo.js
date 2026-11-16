function iso(asOf, minutesAgo) {
  return new Date(asOf - minutesAgo * 60 * 1000).toISOString()
}

function envelope(extra) {
  return {
    synthetic: true,
    origin: 'guardx-demonstration-dataset',
    notice: 'Generated in the browser for interface review. This is not a Wazuh event and was not collected from JARVIS.',
    agent: { id: '002', name: 'JARVIS' },
    ...extra,
  }
}

const FAILURES = [
  { minutes: 3, user: 'sample.user', ip: '10.10.1.24', logonType: 3, status: 'open' },
  { minutes: 22, user: 'sample.user', ip: '10.10.1.24', logonType: 3, status: 'open' },
  { minutes: 48, user: 'sample.admin', ip: '10.10.1.31', logonType: 10, status: 'in_review' },
  { minutes: 95, user: 'sample.user', ip: null, logonType: 2, status: 'open' },
  { minutes: 150, user: 'sample.admin', ip: '10.10.1.31', logonType: 3, status: 'open' },
  { minutes: 320, user: 'sample.user', ip: '10.10.1.24', logonType: 3, status: 'open' },
  { minutes: 510, user: 'sample.admin', ip: null, logonType: 2, status: 'closed' },
  { minutes: 860, user: 'sample.user', ip: '10.10.1.24', logonType: 10, status: 'open' },
  { minutes: 1300, user: 'sample.admin', ip: '10.10.1.31', logonType: 3, status: 'in_review' },
  { minutes: 2000, user: 'sample.user', ip: '10.10.1.24', logonType: 3, status: 'open' },
]

const SUCCESSES = [
  { minutes: 8, user: 'sample.admin', ip: '10.10.1.31', logonType: 2 },
  { minutes: 200, user: 'sample.user', ip: null, logonType: 3 },
  { minutes: 600, user: 'sample.admin', ip: '10.10.1.31', logonType: 10 },
  { minutes: 1500, user: 'sample.user', ip: '10.10.1.24', logonType: 2 },
]

const FILE_EVENTS = [
  { minutes: 30, action: 'created', path: 'C:\\ProgramData\\GuardX\\agent\\state.json', user: 'SYSTEM', checksum: null },
  { minutes: 180, action: 'modified', path: 'C:\\Windows\\System32\\drivers\\etc\\hosts', user: 'sample\\analyst', checksum: 'sample-checksum-01' },
  { minutes: 400, action: 'deleted', path: 'C:\\Users\\Public\\Documents\\readme.txt', user: null, checksum: null },
  { minutes: 900, action: 'modified', path: 'C:\\ProgramData\\GuardX\\agent\\ossec.conf', user: 'SYSTEM', checksum: 'sample-checksum-02' },
  { minutes: 1400, action: 'created', path: 'C:\\Users\\Public\\Documents\\notes.txt', user: 'sample\\analyst', checksum: null },
  { minutes: 2100, action: 'modified', path: 'C:\\Windows\\System32\\drivers\\etc\\hosts', user: null, checksum: 'sample-checksum-03' },
]

const MONITORED_SCRIPTS = [
  { minutes: 60, script: 'Get-Date\nGet-ComputerInfo | Select-Object WindowsProductName, OsVersion' },
  { minutes: 480, script: 'Get-Service -Name WinDefend | Select-Object Status, StartType' },
  { minutes: 1000, script: 'Get-NetFirewallProfile | Select-Object Name, Enabled' },
]

const MATCHED_SCRIPTS = [
  { minutes: 12, status: 'open', script: 'Get-LocalUser | Select-Object Name, Enabled' },
  { minutes: 240, status: 'open', script: 'Get-Service -Name wuauserv | Select-Object Status, StartType' },
  { minutes: 700, status: 'in_review', script: 'Get-Date\nwhoami' },
  { minutes: 1600, status: 'open', script: 'Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version' },
]

export function buildDemoDataset(asOf) {
  const alerts = []
  const authentication = []
  const powershell = []
  const fim = []

  FAILURES.forEach((item, index) => {
    const number = String(index + 1).padStart(2, '0')
    const timestamp = iso(asOf, item.minutes)
    const alertId = `DEMO-ALT-100100-${number}`
    const description = `Synthetic · Windows authentication failure pattern for ${item.user}.`
    alerts.push({
      id: alertId,
      synthetic: true,
      timestamp,
      severity: 'medium',
      level: 10,
      endpoint: 'JARVIS',
      agentId: '002',
      ruleId: '100100',
      ruleDescription: 'GuardX: Windows authentication failure detected.',
      description,
      status: item.status,
      sourceIp: item.ip,
      username: item.user,
      eventId: '4625',
      logonType: item.logonType,
      provider: 'Microsoft-Windows-Security-Auditing',
      kind: 'alert',
      raw: envelope({
        rule: { id: '100100', level: 10, description: 'GuardX: Windows authentication failure detected.' },
        data: {
          win: {
            system: { eventID: '4625', providerName: 'Microsoft-Windows-Security-Auditing' },
            eventdata: { targetUserName: item.user, logonType: String(item.logonType), ipAddress: item.ip },
          },
        },
      }),
    })
    authentication.push({
      id: `DEMO-AUTH-${number}`,
      synthetic: true,
      timestamp,
      endpoint: 'JARVIS',
      agentId: '002',
      result: 'failure',
      eventId: '4625',
      username: item.user,
      logonType: item.logonType,
      sourceIp: item.ip,
      ruleId: '100100',
      alertId,
      provider: 'Microsoft-Windows-Security-Auditing',
      kind: 'authentication',
      description,
      raw: envelope({ eventId: '4625', result: 'failure', targetUserName: item.user, logonType: item.logonType, ipAddress: item.ip }),
    })
  })

  SUCCESSES.forEach((item, index) => {
    const number = String(index + 1).padStart(2, '0')
    authentication.push({
      id: `DEMO-AUTH-OK-${number}`,
      synthetic: true,
      timestamp: iso(asOf, item.minutes),
      endpoint: 'JARVIS',
      agentId: '002',
      result: 'success',
      eventId: '4624',
      username: item.user,
      logonType: item.logonType,
      sourceIp: item.ip,
      ruleId: null,
      alertId: null,
      provider: 'Microsoft-Windows-Security-Auditing',
      kind: 'authentication',
      description: `Synthetic · Successful logon for ${item.user}. Not an alert.`,
      raw: envelope({ eventId: '4624', result: 'success', targetUserName: item.user, logonType: item.logonType, ipAddress: item.ip }),
    })
  })

  FILE_EVENTS.forEach((item, index) => {
    const number = String(index + 1).padStart(2, '0')
    fim.push({
      id: `DEMO-FIM-${number}`,
      synthetic: true,
      timestamp: iso(asOf, item.minutes),
      endpoint: 'JARVIS',
      agentId: '002',
      action: item.action,
      path: item.path,
      user: item.user,
      checksum: item.checksum,
      severity: 'informational',
      ruleId: null,
      kind: 'fim',
      description: `Synthetic · File ${item.action}: ${item.path}`,
      raw: envelope({ action: item.action, path: item.path, user: item.user, checksum: item.checksum }),
    })
  })

  MONITORED_SCRIPTS.forEach((item, index) => {
    const number = String(index + 1).padStart(2, '0')
    powershell.push({
      id: `DEMO-PS-MON-${number}`,
      synthetic: true,
      timestamp: iso(asOf, item.minutes),
      endpoint: 'JARVIS',
      agentId: '002',
      eventId: '4104',
      provider: 'Microsoft-Windows-PowerShell',
      scriptBlock: item.script,
      ruleId: null,
      alertId: null,
      classification: 'monitored',
      severity: 'informational',
      kind: 'powershell',
      description: 'Synthetic · PowerShell script block collected as a monitored event.',
      raw: envelope({ eventId: '4104', provider: 'Microsoft-Windows-PowerShell', scriptBlock: item.script, classification: 'monitored' }),
    })
  })

  MATCHED_SCRIPTS.forEach((item, index) => {
    const number = String(index + 1).padStart(2, '0')
    const timestamp = iso(asOf, item.minutes)
    const alertId = `DEMO-ALT-100101-${number}`
    const description = 'Synthetic · PowerShell script block paired with rule 100101 for layout review. Not a live alert.'
    alerts.push({
      id: alertId,
      synthetic: true,
      timestamp,
      severity: 'medium',
      level: 8,
      endpoint: 'JARVIS',
      agentId: '002',
      ruleId: '100101',
      ruleDescription: 'GuardX: PowerShell Script Block detected.',
      description,
      status: item.status,
      sourceIp: null,
      username: 'sample.admin',
      eventId: '4104',
      logonType: null,
      provider: 'Microsoft-Windows-PowerShell',
      scriptBlock: item.script,
      kind: 'alert',
      raw: envelope({
        rule: { id: '100101', level: 8, description: 'GuardX: PowerShell Script Block detected.', liveAlertsVerified: false },
        data: { win: { system: { eventID: '4104', providerName: 'Microsoft-Windows-PowerShell' }, eventdata: { scriptBlockText: item.script } } },
      }),
    })
    powershell.push({
      id: `DEMO-PS-RULE-${number}`,
      synthetic: true,
      timestamp,
      endpoint: 'JARVIS',
      agentId: '002',
      eventId: '4104',
      provider: 'Microsoft-Windows-PowerShell',
      scriptBlock: item.script,
      ruleId: '100101',
      alertId,
      classification: 'rule-match',
      severity: 'medium',
      username: 'sample.admin',
      kind: 'powershell',
      description,
      raw: envelope({
        eventId: '4104',
        provider: 'Microsoft-Windows-PowerShell',
        scriptBlock: item.script,
        ruleId: '100101',
        classification: 'demonstration-rule-match',
        liveAlertsVerified: false,
      }),
    })
  })

  const applications = [
    {
      id: 'demo-app-002-1',
      synthetic: true,
      name: 'Microsoft Teams Meeting Add-in for Microsoft Office',
      version: '1.26.27102',
      publisher: 'Microsoft Corporation',
      architecture: 'x86_64',
      installDate: iso(asOf, 1440),
      location: 'C:\\Program Files\\Microsoft Office\\root\\Office16',
      format: 'win',
      endpoint: 'JARVIS',
      agentId: '002',
      scanTime: iso(asOf, 60),
      lastObserved: iso(asOf, 60),
      description: 'Synthetic demonstration package record',
    },
    {
      id: 'demo-app-002-2',
      synthetic: true,
      name: '7-Zip 26.03 (x64)',
      version: '26.03',
      publisher: 'Igor Pavlov',
      architecture: 'x86_64',
      installDate: iso(asOf, 2880),
      location: 'C:\\Program Files\\7-Zip',
      format: 'win',
      endpoint: 'JARVIS',
      agentId: '002',
      scanTime: iso(asOf, 60),
      lastObserved: iso(asOf, 60),
      description: 'Synthetic demonstration package record',
    },
    {
      id: 'demo-app-002-3',
      synthetic: true,
      name: 'Node.js',
      version: '22.14.0',
      publisher: 'Node.js Foundation',
      architecture: 'x86_64',
      installDate: iso(asOf, 5000),
      location: 'C:\\Program Files\\nodejs',
      format: 'win',
      endpoint: 'JARVIS',
      agentId: '002',
      scanTime: iso(asOf, 60),
      lastObserved: iso(asOf, 60),
      description: 'Synthetic demonstration package record',
    },
    {
      id: 'demo-app-002-4',
      synthetic: true,
      name: 'Google Chrome',
      version: '131.0.6778.86',
      publisher: 'Google LLC',
      architecture: 'x86_64',
      installDate: iso(asOf, 7200),
      location: 'C:\\Program Files\\Google\\Chrome\\Application',
      format: 'win',
      endpoint: 'JARVIS',
      agentId: '002',
      scanTime: iso(asOf, 60),
      lastObserved: iso(asOf, 60),
      description: 'Synthetic demonstration package record',
    },
    {
      id: 'demo-app-002-5',
      synthetic: true,
      name: 'Wazuh Agent',
      version: '4.14.7',
      publisher: 'Wazuh, Inc.',
      architecture: 'x86_64',
      installDate: iso(asOf, 10000),
      location: 'C:\\Program Files (x86)\\ossec-agent',
      format: 'win',
      endpoint: 'JARVIS',
      agentId: '002',
      scanTime: iso(asOf, 60),
      lastObserved: iso(asOf, 60),
      description: 'Synthetic demonstration package record',
    },
    {
      id: 'demo-app-003-1',
      synthetic: true,
      name: 'NVIDIA FrameView SDK',
      version: '1.3.8513.32290073',
      publisher: 'NVIDIA Corporation',
      architecture: 'x86_64',
      installDate: iso(asOf, 4320),
      location: 'C:\\Program Files\\NVIDIA Corporation\\FrameViewSDK',
      format: 'win',
      endpoint: 'Friend-Windows-01',
      agentId: '003',
      scanTime: iso(asOf, 120),
      lastObserved: iso(asOf, 120),
      description: 'Synthetic demonstration package record',
    },
    {
      id: 'demo-app-003-2',
      synthetic: true,
      name: 'NVIDIA Update Core',
      version: '39.5.0.0',
      publisher: 'NVIDIA Corporation',
      architecture: 'x86_64',
      installDate: iso(asOf, 4320),
      location: 'C:\\Program Files (x86)\\NVIDIA Corporation\\Update Core',
      format: 'win',
      endpoint: 'Friend-Windows-01',
      agentId: '003',
      scanTime: iso(asOf, 120),
      lastObserved: iso(asOf, 120),
      description: 'Synthetic demonstration package record',
    },
    {
      id: 'demo-app-003-3',
      synthetic: true,
      name: 'AI Noise Cancelation Audio Software',
      version: '1.0.0',
      publisher: 'ASUSTeK COMPUTER INC.',
      architecture: 'x86_64',
      installDate: iso(asOf, 8640),
      location: 'C:\\Program Files\\ASUS\\AI Noise Cancelation',
      format: 'win',
      endpoint: 'Friend-Windows-01',
      agentId: '003',
      scanTime: iso(asOf, 120),
      lastObserved: iso(asOf, 120),
      description: 'Synthetic demonstration package record',
    },
  ]

  const applicationsHistory = [
    {
      id: 'demo-hist-1',
      synthetic: true,
      agentId: '002',
      endpoint: 'JARVIS',
      appName: 'Microsoft Teams Meeting Add-in for Microsoft Office',
      previousVersion: '1.26.25904',
      newVersion: '1.26.27102',
      changeType: 'Version changed',
      timestamp: iso(asOf, 1440),
      detectionTimestamp: iso(asOf, 1440),
      correlatedEventId: '1033',
      ruleId: '60612',
      details: 'Product upgraded from 1.26.25904 to 1.26.27102 (confirmed by Event 1033)',
      confirmedByEvent: true,
    },
    {
      id: 'demo-hist-2',
      synthetic: true,
      agentId: '002',
      endpoint: 'JARVIS',
      appName: 'Legacy Meeting Helper',
      previousVersion: '1.0.2',
      newVersion: null,
      changeType: 'Removal confirmed',
      timestamp: iso(asOf, 2880),
      detectionTimestamp: iso(asOf, 2880),
      correlatedEventId: '11724',
      ruleId: '60611',
      details: 'Application uninstalled (confirmed by MsiInstaller Event 11724)',
      confirmedByEvent: true,
    },
    {
      id: 'demo-hist-3',
      synthetic: true,
      agentId: '002',
      endpoint: 'JARVIS',
      appName: 'Diagnostic Utility Tool',
      previousVersion: '0.9.1',
      newVersion: null,
      changeType: 'Missing from latest inventory',
      timestamp: iso(asOf, 3600),
      detectionTimestamp: iso(asOf, 3600),
      correlatedEventId: null,
      ruleId: null,
      details: 'Package not observed in current scan. Status: Missing from latest inventory (uninstallation unconfirmed).',
      confirmedByEvent: false,
    },
    {
      id: 'demo-hist-4',
      synthetic: true,
      agentId: '003',
      endpoint: 'Friend-Windows-01',
      appName: 'NVIDIA FrameView SDK',
      previousVersion: null,
      newVersion: '1.3.8513.32290073',
      changeType: 'Newly detected',
      timestamp: iso(asOf, 4320),
      detectionTimestamp: iso(asOf, 4320),
      correlatedEventId: '11707',
      ruleId: '60612',
      details: 'Installation completed successfully (Event 11707)',
      confirmedByEvent: true,
    },
  ]

  const threatIntel = [
    {
      id: 'DEMO-INC-002-BRUTE',
      synthetic: true,
      title: 'Repeated Failed Windows Logons against Local Accounts',
      suspectedAttackType: 'Brute Force',
      explanation: 'Synthetic demonstration incident. Observed repeated Windows authentication failure patterns (Event ID 4625) targeting local user accounts.',
      severity: 'high',
      confidence: 0.88,
      confidenceReasoning: 'Confidence reflects multiple correlated authentication failures within a short window.',
      mitreTactic: 'Credential Access',
      mitreTechniqueId: 'T1110.001',
      mitreTechniqueName: 'Password Guessing',
      affectedEndpoint: 'JARVIS',
      agentId: '002',
      firstSeen: iso(asOf, 120),
      lastSeen: iso(asOf, 5),
      eventCount: 14,
      supportingRuleIds: ['100100'],
      supportingEventIds: ['4625'],
      evidenceSummary: [
        '14 synthetic failed logon attempts',
        'Target accounts: Administrator, sample.admin',
        'Source IP: 192.0.2.105',
      ],
      recommendedInvestigationSteps: [
        'Verify origin of IP 192.0.2.105',
        'Inspect user account lockout status',
        'Check for concurrent logon successes',
      ],
      falsePositiveConsiderations: [
        'Automated health check probes with stale credentials',
      ],
      analysisSource: 'gemini',
      modelUsed: 'gemini-1.5-flash',
      analyzedAt: iso(asOf, 5),
      correlatedAlerts: alerts.slice(0, 5),
    },
    {
      id: 'DEMO-INC-002-POWERSHELL',
      synthetic: true,
      title: 'Suspicious PowerShell Script Block Execution & Environment Discovery',
      suspectedAttackType: 'Suspicious PowerShell Execution',
      explanation: 'Synthetic demonstration incident. Observed PowerShell script block execution querying system environment variables.',
      severity: 'medium',
      confidence: 0.82,
      confidenceReasoning: 'Corroborated by deep script block inspection (Event ID 4104) and Rule 100101.',
      mitreTactic: 'Execution',
      mitreTechniqueId: 'T1059.001',
      mitreTechniqueName: 'PowerShell',
      affectedEndpoint: 'JARVIS',
      agentId: '002',
      firstSeen: iso(asOf, 60),
      lastSeen: iso(asOf, 10),
      eventCount: 8,
      supportingRuleIds: ['100101'],
      supportingEventIds: ['4104'],
      evidenceSummary: [
        '8 script blocks executed with Base64 / encoded arguments',
        'Event ID 4104 logged in Operational channel',
      ],
      recommendedInvestigationSteps: [
        'Inspect full script block contents in incident drawer',
        'Identify parent process',
      ],
      falsePositiveConsiderations: [
        'Administrative deployment scripts',
      ],
      analysisSource: 'gemini',
      modelUsed: 'gemini-1.5-flash',
      analyzedAt: iso(asOf, 10),
      correlatedAlerts: alerts.slice(5, 8),
    },
    {
      id: 'DEMO-INC-003-AUTH',
      synthetic: true,
      title: 'Multiple Failed Logon Attempts against Domain Accounts',
      suspectedAttackType: 'Brute Force',
      explanation: 'Synthetic demonstration incident. Multiple failed interactive logons detected on Friend-Windows-01.',
      severity: 'medium',
      confidence: 0.85,
      confidenceReasoning: 'Audit failure telemetry shows localized password attempts.',
      mitreTactic: 'Credential Access',
      mitreTechniqueId: 'T1110.001',
      mitreTechniqueName: 'Password Guessing',
      affectedEndpoint: 'Friend-Windows-01',
      agentId: '003',
      firstSeen: iso(asOf, 180),
      lastSeen: iso(asOf, 20),
      eventCount: 6,
      supportingRuleIds: ['100100'],
      supportingEventIds: ['4625'],
      evidenceSummary: [
        '6 authentication failure events recorded under Rule 100100',
        'Target account: shrey',
      ],
      recommendedInvestigationSteps: [
        'Review recent password changes for user shrey',
      ],
      falsePositiveConsiderations: [
        'User typing incorrect password multiple times',
      ],
      analysisSource: 'gemini',
      modelUsed: 'gemini-1.5-flash',
      analyzedAt: iso(asOf, 20),
      correlatedAlerts: [],
    },
  ]

  return { alerts, authentication, powershell, fim, applications, applicationsHistory, threatIntel }
}
