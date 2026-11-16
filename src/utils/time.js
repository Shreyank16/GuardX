export const RANGES = [
  { id: '15m', label: '15m', ms: 15 * 60 * 1000 },
  { id: '1h', label: '1h', ms: 60 * 60 * 1000 },
  { id: '24h', label: '24h', ms: 24 * 60 * 60 * 1000 },
  { id: '7d', label: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { id: '30d', label: '30d', ms: 30 * 24 * 60 * 60 * 1000 },
]

export function rangeMs(rangeId) {
  return RANGES.find((range) => range.id === rangeId)?.ms ?? RANGES[2].ms
}

export function inRange(iso, rangeId, asOf) {
  if (!iso) return true
  const timestamp = new Date(iso).getTime()
  if (Number.isNaN(timestamp)) return false
  return timestamp <= asOf && asOf - timestamp <= rangeMs(rangeId)
}

export function withinDates(iso, from, to) {
  if (!iso) return !from && !to
  const timestamp = new Date(iso).getTime()
  if (Number.isNaN(timestamp)) return false
  if (from) {
    const start = new Date(`${from}T00:00:00`).getTime()
    if (timestamp < start) return false
  }
  if (to) {
    const end = new Date(`${to}T23:59:59.999`).getTime()
    if (timestamp > end) return false
  }
  return true
}
