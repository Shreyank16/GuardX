/**
 * Utilities for parsing and translating GuardX time ranges and filter parameters
 * into OpenSearch / Elasticsearch date math and query clauses.
 */

const VALID_RANGES = {
  '15m': 'now-15m',
  '1h': 'now-1h',
  '6h': 'now-6h',
  '24h': 'now-24h',
  '7d': 'now-7d',
  '30d': 'now-30d',
}

/**
 * Validates and converts frontend time-range parameter into OpenSearch range filter.
 * Defaults to 'now-24h' if omitted or invalid.
 */
export function buildTimeRangeFilter(range) {
  if (range === 'all') return null
  const gte = VALID_RANGES[range] || 'now-24h'
  return {
    range: {
      '@timestamp': {
        gte,
        lte: 'now',
      },
    },
  }
}

/**
 * Builds OpenSearch query filter for rule severity levels:
 * - Critical: level 15+
 * - High: level 12 - 14
 * - Medium: level 7 - 11
 * - Low: level 4 - 6
 * - Informational: level < 4
 */
export function buildSeverityFilter(severity) {
  if (!severity || severity === 'all') return null
  const normalized = String(severity).toLowerCase().trim()

  switch (normalized) {
    case 'critical':
      return { range: { 'rule.level': { gte: 15 } } }
    case 'high':
      return { range: { 'rule.level': { gte: 12, lte: 14 } } }
    case 'medium':
      return { range: { 'rule.level': { gte: 7, lte: 11 } } }
    case 'low':
      return { range: { 'rule.level': { gte: 4, lte: 6 } } }
    case 'informational':
    case 'info':
      return { range: { 'rule.level': { lt: 4 } } }
    default:
      return null
  }
}
