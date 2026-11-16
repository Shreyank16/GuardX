import { cx } from '../utils/cx'
import { severityFromLevel, severityMeta } from '../utils/severity'

/**
 * Color tokens corresponding to the SEVERITIES registry.
 * Uses translucent backgrounds and borders for a restrained SOC aesthetic.
 */
const SEVERITY_STYLES = {
  critical: {
    bg: '#2e1215',
    border: '#692529',
    text: '#ea7a7a',
    dot: '#c85a5a',
  },
  high: {
    bg: '#2b1b0e',
    border: '#633b18',
    text: '#e89e5a',
    dot: '#d08a45',
  },
  medium: {
    bg: '#28200f',
    border: '#5c481d',
    text: '#ddb974',
    dot: '#c9a45d',
  },
  low: {
    bg: '#14202b',
    border: '#2a455c',
    text: '#8fb4d4',
    dot: '#7393ad',
  },
  informational: {
    bg: '#191c20',
    border: '#353b43',
    text: '#a6aeb8',
    dot: '#8e969f',
  },
}

/**
 * Reusable severity badge for SIEM alerts, rules and events.
 *
 * @param {Object} props
 * @param {string|number} [props.severity] - 'critical'|'high'|'medium'|'low'|'informational' or level number
 * @param {number} [props.level] - Wazuh rule level number (0-16)
 * @param {boolean} [props.showDot] - Prepend color indicator dot
 * @param {boolean} [props.showLevel] - Show level number alongside label
 * @param {'sm'|'md'} [props.size='sm'] - Badge size
 * @param {string} [props.className] - Additional CSS class names
 * @param {React.ReactNode} [props.children] - Override badge label text
 */
export default function Badge({
  severity,
  level,
  showDot = false,
  showLevel = false,
  size = 'sm',
  className = '',
  children,
}) {
  const resolvedSeverityId =
    typeof severity === 'number'
      ? severityFromLevel(severity)
      : severity
        ? severity.toLowerCase()
        : level != null
          ? severityFromLevel(level)
          : 'informational'

  const meta = severityMeta(resolvedSeverityId)
  const colors = SEVERITY_STYLES[meta.id] || SEVERITY_STYLES.informational

  const isSmall = size === 'sm'

  return (
    <span
      className={cx(
        'inline-flex items-center font-mono font-medium tracking-wide uppercase whitespace-nowrap border rounded-none',
        className,
      )}
      style={{
        background: colors.bg,
        borderColor: colors.border,
        color: colors.text,
        fontSize: isSmall ? '10px' : '11px',
        lineHeight: 1,
        padding: isSmall ? '2px 6px' : '3px 8px',
        gap: '5px',
        letterSpacing: '0.06em',
      }}
    >
      {showDot && (
        <span
          aria-hidden="true"
          style={{
            width: isSmall ? 5 : 6,
            height: isSmall ? 5 : 6,
            borderRadius: '50%',
            background: colors.dot,
            flexShrink: 0,
          }}
        />
      )}
      <span>{children ?? meta.label}</span>
      {showLevel && level != null && (
        <span
          style={{
            opacity: 0.7,
            fontFamily: 'var(--font-mono)',
            fontSize: isSmall ? '9px' : '10px',
            marginLeft: 2,
          }}
        >
          · LVL {level}
        </span>
      )}
    </span>
  )
}
