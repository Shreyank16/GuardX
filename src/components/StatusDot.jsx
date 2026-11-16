import { cx } from '../utils/cx'

/**
 * Status tone mappings for SOC indicator dots.
 */
const STATUS_CONFIGS = {
  // Named states
  connected: {
    color: 'var(--color-accent)',
    label: 'Connected',
    glow: '0 0 6px var(--color-accent)',
  },
  disconnected: {
    color: 'var(--color-critical)',
    label: 'Disconnected',
    glow: 'none',
  },
  unverified: {
    color: 'var(--color-warn)',
    label: 'Unverified',
    glow: 'none',
  },
  unknown: {
    color: 'var(--color-faint)',
    label: 'Unknown',
    glow: 'none',
  },

  // Tone aliases
  ok: {
    color: 'var(--color-accent)',
    label: 'Connected',
    glow: '0 0 6px var(--color-accent)',
  },
  bad: {
    color: 'var(--color-critical)',
    label: 'Error',
    glow: 'none',
  },
  warn: {
    color: 'var(--color-warn)',
    label: 'Warning',
    glow: 'none',
  },
  idle: {
    color: 'var(--color-faint)',
    label: 'Idle',
    glow: 'none',
  },
}

/**
 * Reusable status dot for endpoint states, connection indicators and agent verification.
 *
 * @param {Object} props
 * @param {'connected'|'disconnected'|'unknown'|'unverified'|'ok'|'bad'|'warn'|'idle'} [props.state='unknown'] - Status name
 * @param {'ok'|'bad'|'warn'|'idle'} [props.tone] - Alternative tone prop
 * @param {boolean} [props.pulse=false] - Whether to show CSS pulse animation
 * @param {number} [props.size=7] - Dot diameter in pixels
 * @param {string} [props.className] - Additional CSS class names
 * @param {string} [props.title] - Hover title / tooltip
 * @param {string} [props.label] - Accessible text description
 */
export default function StatusDot({
  state,
  tone,
  pulse = false,
  size = 7,
  className = '',
  title,
  label,
}) {
  const key = (tone || state || 'unknown').toLowerCase()
  const config = STATUS_CONFIGS[key] || STATUS_CONFIGS.unknown
  const accessibleLabel = label || title || config.label

  return (
    <span
      className={cx(
        'inline-block rounded-full shrink-0',
        pulse ? 'gx-pulse' : '',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: config.color,
        boxShadow: config.glow,
      }}
      title={title || accessibleLabel}
      role="status"
      aria-label={accessibleLabel}
    />
  )
}
