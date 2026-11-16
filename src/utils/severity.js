export const SEVERITIES = [
  { id: 'critical', label: 'Critical', color: '#c85a5a', min: 15 },
  { id: 'high', label: 'High', color: '#d08a45', min: 12 },
  { id: 'medium', label: 'Medium', color: '#c9a45d', min: 7 },
  { id: 'low', label: 'Low', color: '#7393ad', min: 4 },
  { id: 'informational', label: 'Informational', color: '#8e969f', min: 0 },
]

export function severityFromLevel(level) {
  const value = Number(level)
  if (Number.isNaN(value)) return 'informational'
  if (value >= 15) return 'critical'
  if (value >= 12) return 'high'
  if (value >= 7) return 'medium'
  if (value >= 4) return 'low'
  return 'informational'
}

export function severityMeta(id) {
  return SEVERITIES.find((item) => item.id === id) || SEVERITIES[4]
}
