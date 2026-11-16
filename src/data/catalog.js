import { severityFromLevel } from '../utils/severity'

export const environment = {
  product: 'GUARDX',
  platform: 'Security Monitoring Platform',
  managerVersion: import.meta.env.VITE_WAZUH_VERSION || '4.14.7',
  managerOs: 'Ubuntu Server 24.04',
  stack: ['Wazuh Manager', 'Wazuh Indexer', 'Wazuh Dashboard'],
}

export const knownEndpoints = [
  {
    id: '002',
    name: 'JARVIS',
    agentId: '002',
    ip: null,
    os: 'Windows 11',
    version: '4.14.7',
    status: 'unverified',
    lastKeepAlive: null,
    groups: [],
    note: 'Known endpoint in the GuardX inventory. IP address, groups, and keepalive are not shown until the manager API reports them.',
  },
]

export const knownRules = [
  {
    id: '100100',
    name: 'GuardX: Windows authentication failure detected.',
    description: 'Custom rule for Windows authentication failure activity collected from the endpoint.',
    level: 10,
    group: 'authentication',
    eventId: '4625',
    parentRule: '60122',
    status: 'defined',
    verification: 'Live alert verified',
    liveAlertsVerified: true,
    verificationNote:
      'Live alert production verified on Windows endpoint JARVIS. Rule triggers on Windows Event ID 4625 (Logon Failure) via parent rule 60122.',
  },
  {
    id: '100101',
    name: 'GuardX: PowerShell Script Block detected.',
    description:
      'Custom rule for PowerShell Operational Script Block Logging, Event ID 4104. A script block event remains monitored telemetry unless this rule is confirmed to have fired.',
    level: 8,
    group: 'powershell',
    eventId: '4104',
    parentRule: null,
    status: 'defined',
    verification: 'wazuh-logtest verified · Live alert not verified',
    liveAlertsVerified: false,
    verificationNote:
      'Verified with wazuh-logtest utility. Live alert production on the manager has not been verified. Script blocks remain monitored telemetry until confirmed.',
  },
]

export const investigationSteps = {
  '100100': [
    'Confirm the account is expected to authenticate to this endpoint.',
    'Review Windows Event ID 4625 for logon type, workstation, and source address.',
    'Compare the failure with later successful logons for the same account.',
    'Decide whether the pattern is a mistype, a scheduled task, or repeated failures that need escalation.',
  ],
  '100101': [
    'Read the script block in full. Event ID 4104 is collected telemetry, not a malicious verdict.',
    'Check the manager before treating rule 100101 as a live detection. Its alert production has not been verified.',
    'Identify the user and parent process when the event actually contains them.',
    'Compare the command with approved administrative activity before escalating.',
  ],
  fim: [
    'Confirm the path is expected to change on this endpoint.',
    'Use the checksum only when the event includes one.',
    'Identify the account associated with the change when that field is present.',
    'Review adjacent create, modify, and delete events on the same path.',
  ],
  authentication: [
    'Separate successful logons from failures before deciding there is an incident.',
    'Record the username, logon type, and source address when the event has them.',
    'Look for a related detection rule only when the event references one.',
  ],
  powershell: [
    'Treat the script block as a monitored event unless a detection rule is attached.',
    'Do not escalate rule 100101 until live alert production has been verified on the manager.',
    'Preserve the script text and timestamp for the investigation record.',
  ],
}

export function stepsFor(record) {
  if (record?.ruleId && investigationSteps[record.ruleId]) return investigationSteps[record.ruleId]
  if (record?.kind === 'fim' || record?.action) return investigationSteps.fim
  if (record?.kind === 'authentication' || record?.eventId === '4624' || record?.eventId === '4625') {
    return investigationSteps.authentication
  }
  if (record?.kind === 'powershell' || record?.eventId === '4104') return investigationSteps.powershell
  return ['Review the raw event and confirm the data source before escalating.']
}

export function withSeverity(rule) {
  return { ...rule, severity: severityFromLevel(rule.level) }
}
