import { severityMeta } from './severity'

const MITRE = {
  '100100': {
    id: 'T1110',
    name: 'Brute Force',
    note: 'Possible mapping for a repeated authentication failure. Not confirmed from this event alone.',
  },
  '100101': {
    id: 'T1059.001',
    name: 'Command and Scripting Interpreter: PowerShell',
    note: 'Possible context for a script block. A monitored 4104 event is not confirmation of this technique.',
  },
}

const WHY = {
  '100100': 'Repeated Windows logon failures can be mistyped credentials, a stale scheduled task, or an attempt to guess an account. The event matters because it is the evidence an analyst uses to decide which of those it is.',
  '100101': 'Script block logging shows PowerShell content that may otherwise be invisible. It matters as telemetry. It becomes a detection only when rule 100101 is confirmed to have fired, which has not been verified.',
}

export function buildPreview(alert) {
  const band = severityMeta(alert.severity)
  const mapping = MITRE[alert.ruleId] || null
  return {
    summary: `${alert.synthetic ? 'Synthetic record' : 'Selected record'} ${alert.id} on ${alert.endpoint} at level ${alert.level}. Rule ${alert.ruleId || 'not attached'}: ${alert.ruleDescription || alert.description}`,
    risk: `${band.label} display band from rule level ${alert.level}. This is a level mapping, not a model score.`,
    why: WHY[alert.ruleId] || 'The record is available for review. Its operational importance depends on the rule, the endpoint, and the surrounding events.',
    recommendations: [
      'Confirm the data source before treating the record as manager telemetry.',
      'Open the raw event and check which fields were actually collected.',
      'Compare the timestamp with authentication, file integrity, and PowerShell activity on the same endpoint.',
      alert.ruleId === '100101'
        ? 'Do not close this as a confirmed threat. Live production of rule 100101 has not been verified.'
        : 'Record what would confirm or dismiss the activity, then set the alert status.',
    ],
    mitre: mapping,
  }
}
