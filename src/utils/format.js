const LOGON_TYPES = {
  2: 'Interactive',
  3: 'Network',
  4: 'Batch',
  5: 'Service',
  7: 'Unlock',
  8: 'Network cleartext',
  10: 'Remote interactive',
  11: 'Cached interactive',
}

export function formatTimestamp(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function formatBucketLabel(timestamp, rangeId) {
  const date = new Date(timestamp)
  const pad = (part) => String(part).padStart(2, '0')
  if (rangeId === '7d' || rangeId === '30d') {
    return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }
  if (rangeId === '24h') return `${pad(date.getHours())}:00`
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function display(value) {
  if (value == null || value === '') return '—'
  return String(value)
}

export function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  const letters = parts.map((part) => part[0].toUpperCase()).join('')
  return letters || 'GX'
}

export function logonTypeLabel(type) {
  if (type == null || type === '') return '—'
  const label = LOGON_TYPES[Number(type)]
  return label ? `${type} · ${label}` : String(type)
}

export function statusLabel(status) {
  if (!status) return '—'
  return String(status).replaceAll('_', ' ')
}

export function plural(count, noun) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}
