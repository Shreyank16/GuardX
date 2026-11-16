import { formatBucketLabel } from './format'
import { inRange, withinDates } from './time'

export function matchesQuery(query, values) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return values.some((value) => String(value ?? '').toLowerCase().includes(needle))
}

export function sortRows(rows, sort) {
  if (!sort?.key) return rows
  const direction = sort.direction === 'asc' ? 1 : -1
  return [...rows].sort((left, right) => {
    const a = left[sort.key]
    const b = right[sort.key]
    if (a == null && b == null) return 0
    if (a == null) return 1
    if (b == null) return -1
    if (typeof a === 'number' && typeof b === 'number') return (a - b) * direction
    return String(a).localeCompare(String(b), undefined, { numeric: true }) * direction
  })
}

export function pageWindow(total, page, pageSize) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1)
  const current = Math.min(Math.max(page, 1), pageCount)
  const start = (current - 1) * pageSize
  return {
    page: current,
    pageCount,
    start,
    end: Math.min(start + pageSize, total),
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, total),
  }
}

function timeMatch(timestamp, range, asOf, from, to) {
  return inRange(timestamp, range, asOf) && withinDates(timestamp, from, to)
}

export function filterAlerts(alerts, filters) {
  return alerts.filter((alert) => {
    if (!timeMatch(alert.timestamp, filters.range, filters.asOf, filters.from, filters.to)) return false
    if (filters.severity && filters.severity !== 'all' && alert.severity !== filters.severity) return false
    if (filters.endpoint && filters.endpoint !== 'all' && alert.endpoint !== filters.endpoint) return false
    if (filters.ruleId && filters.ruleId !== 'all' && alert.ruleId !== filters.ruleId) return false
    if (filters.status && filters.status !== 'all' && alert.status !== filters.status) return false
    return matchesQuery(filters.q || '', [alert.id, alert.endpoint, alert.agentId, alert.ruleId, alert.description, alert.username, alert.status])
  })
}

export function filterFim(events, filters) {
  return events.filter((event) => {
    if (!timeMatch(event.timestamp, filters.range, filters.asOf, filters.from, filters.to)) return false
    if (filters.action && filters.action !== 'all' && event.action !== filters.action) return false
    if (filters.endpoint && filters.endpoint !== 'all' && event.endpoint !== filters.endpoint) return false
    if (filters.objectType && filters.objectType !== 'all' && event.objectType !== filters.objectType) return false
    return matchesQuery(filters.q || '', [event.id, event.path, event.endpoint, event.user, event.action, event.checksum, event.objectType])
  })
}

export function filterAuth(events, filters) {
  return events.filter((event) => {
    if (!timeMatch(event.timestamp, filters.range, filters.asOf, filters.from, filters.to)) return false
    if (filters.result && filters.result !== 'all' && event.result !== filters.result) return false
    if (filters.endpoint && filters.endpoint !== 'all' && event.endpoint !== filters.endpoint) return false
    return matchesQuery(filters.q || '', [event.id, event.username, event.endpoint, event.eventId, event.sourceIp, event.result, event.ruleId])
  })
}

export function filterPowerShell(events, filters) {
  return events.filter((event) => {
    if (!timeMatch(event.timestamp, filters.range, filters.asOf, '', '')) return false
    if (filters.classification && filters.classification !== 'all' && event.classification !== filters.classification) return false
    if (filters.endpoint && filters.endpoint !== 'all' && event.endpoint !== filters.endpoint) return false
    return matchesQuery(filters.q || '', [event.id, event.endpoint, event.scriptBlock, event.ruleId, event.provider, event.classification, event.description])
  })
}

export function explorerRows(dataset) {
  const rows = []
  dataset.alerts.forEach((alert) => {
    rows.push({
      id: `alert:${alert.id}`,
      kind: 'alert',
      kindLabel: 'Alert',
      timestamp: alert.timestamp,
      severity: alert.severity,
      endpoint: alert.endpoint,
      summary: alert.description,
      ruleId: alert.ruleId,
      record: alert,
    })
  })
  dataset.fim.forEach((event) => {
    rows.push({
      id: `fim:${event.id}`,
      kind: 'fim',
      kindLabel: 'File integrity',
      timestamp: event.timestamp,
      severity: event.severity || 'informational',
      endpoint: event.endpoint,
      summary: event.description,
      ruleId: event.ruleId,
      record: event,
    })
  })
  dataset.authentication.forEach((event) => {
    rows.push({
      id: `auth:${event.id}`,
      kind: 'authentication',
      kindLabel: 'Authentication',
      timestamp: event.timestamp,
      severity: event.result === 'failure' ? 'medium' : 'informational',
      endpoint: event.endpoint,
      summary: event.description,
      ruleId: event.ruleId,
      record: event,
    })
  })
  dataset.powershell.forEach((event) => {
    rows.push({
      id: `ps:${event.id}`,
      kind: 'powershell',
      kindLabel: 'PowerShell',
      timestamp: event.timestamp,
      severity: event.severity || 'informational',
      endpoint: event.endpoint,
      summary: event.description,
      ruleId: event.ruleId,
      record: event,
    })
  })
  return rows
}

export function filterExplorer(rows, filters) {
  return rows.filter((row) => {
    if (!inRange(row.timestamp, filters.range, filters.asOf)) return false
    if (filters.kind && filters.kind !== 'all' && row.kind !== filters.kind) return false
    if (filters.severity && filters.severity !== 'all' && row.severity !== filters.severity) return false
    if (filters.endpoint && filters.endpoint !== 'all' && row.endpoint !== filters.endpoint) return false
    return matchesQuery(filters.q || '', [row.summary, row.endpoint, row.ruleId, row.kindLabel, row.record?.id])
  })
}

export function activityPoints(dataset, range, asOf) {
  const points = []
  dataset.alerts.forEach((alert) => {
    if (inRange(alert.timestamp, range, asOf)) points.push({ timestamp: alert.timestamp, severity: alert.severity })
  })
  dataset.fim.forEach((event) => {
    if (inRange(event.timestamp, range, asOf)) points.push({ timestamp: event.timestamp, severity: 'informational' })
  })
  dataset.authentication.forEach((event) => {
    if (event.alertId) return
    if (inRange(event.timestamp, range, asOf)) points.push({ timestamp: event.timestamp, severity: 'informational' })
  })
  dataset.powershell.forEach((event) => {
    if (event.alertId) return
    if (inRange(event.timestamp, range, asOf)) points.push({ timestamp: event.timestamp, severity: 'informational' })
  })
  return points
}

export function buildSeries(points, range, asOf) {
  const spec = {
    '15m': { step: 60 * 1000, count: 15 },
    '1h': { step: 5 * 60 * 1000, count: 12 },
    '24h': { step: 60 * 60 * 1000, count: 24 },
    '7d': { step: 24 * 60 * 60 * 1000, count: 7 },
    '30d': { step: 24 * 60 * 60 * 1000, count: 30 },
  }[range] || { step: 60 * 60 * 1000, count: 24 }

  const anchor = new Date(asOf)
  if (range === '7d' || range === '30d') anchor.setHours(0, 0, 0, 0)
  else if (range === '24h') anchor.setMinutes(0, 0, 0)
  else anchor.setSeconds(0, 0)

  const lastStart = anchor.getTime()
  const buckets = []
  for (let index = spec.count - 1; index >= 0; index -= 1) {
    const start = lastStart - index * spec.step
    buckets.push({
      start,
      end: start + spec.step,
      label: formatBucketLabel(start, range),
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      informational: 0,
    })
  }

  points.forEach((point) => {
    if (!point.timestamp) return
    const time = new Date(point.timestamp).getTime()
    const bucket = buckets.find((item, index) => {
      const end = index === buckets.length - 1 ? Math.max(item.end, asOf + 1) : item.end
      return time >= item.start && time < end
    })
    if (!bucket || !Object.hasOwn(bucket, point.severity)) return
    bucket[point.severity] += 1
  })

  return buckets.map((bucket) => ({
    label: bucket.label,
    critical: bucket.critical,
    high: bucket.high,
    medium: bucket.medium,
    low: bucket.low,
    informational: bucket.informational,
    total: bucket.critical + bucket.high + bucket.medium + bucket.low + bucket.informational,
  }))
}

export function countSeverities(alerts) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 }
  alerts.forEach((alert) => {
    if (Object.hasOwn(counts, alert.severity)) counts[alert.severity] += 1
  })
  return counts
}

export function detectionSummary(dataset, range, asOf) {
  const alerts = dataset.alerts.filter((alert) => inRange(alert.timestamp, range, asOf))
  return {
    authenticationFailures: dataset.authentication.filter((event) => event.result === 'failure' && inRange(event.timestamp, range, asOf)).length,
    fileModifications: dataset.fim.filter((event) => event.action === 'modified' && inRange(event.timestamp, range, asOf)).length,
    powershellEvents: dataset.powershell.filter((event) => inRange(event.timestamp, range, asOf)).length,
    suspicious: alerts.filter((alert) => alert.severity === 'critical' || alert.severity === 'high').length,
    alerts: alerts.length,
    critical: alerts.filter((alert) => alert.severity === 'critical').length,
    detectionEvents: [
      ...dataset.authentication.filter((event) => event.ruleId),
      ...dataset.powershell.filter((event) => event.ruleId),
      ...dataset.fim.filter((event) => event.ruleId),
    ].filter((event) => inRange(event.timestamp, range, asOf)).length,
  }
}

export function latestActivity(dataset, endpointName, range, asOf) {
  const stamps = []
  const collect = (rows) => {
    rows.forEach((row) => {
      if (row.endpoint === endpointName && row.timestamp && inRange(row.timestamp, range, asOf)) stamps.push(row.timestamp)
    })
  }
  collect(dataset.alerts)
  collect(dataset.fim)
  collect(dataset.authentication)
  collect(dataset.powershell)
  if (!stamps.length) return null
  return stamps.sort().at(-1)
}

export function endpointNames(dataset) {
  const names = new Set()
  dataset.endpoints.forEach((endpoint) => names.add(endpoint.name))
  ;[...dataset.alerts, ...dataset.fim, ...dataset.authentication, ...dataset.powershell].forEach((row) => {
    if (row.endpoint) names.add(row.endpoint)
  })
  return [...names]
}

export function ruleIds(dataset) {
  const ids = new Set(dataset.rules.map((rule) => rule.id))
  dataset.alerts.forEach((alert) => {
    if (alert.ruleId) ids.add(alert.ruleId)
  })
  return [...ids]
}

export function rangeHasData(points) {
  return points.some((point) => point.total > 0)
}
