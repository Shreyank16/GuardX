import { useApp } from '../hooks/useApp'
import { cx } from '../utils/cx'
import StatusDot from './StatusDot'

/**
 * Pill component indicating the live state of the GuardX SIEM connection.
 * Reads directly from AppProvider context.
 *
 * @param {Object} props
 * @param {boolean} [props.showDetail=false] - Display the secondary status explanation
 * @param {boolean} [props.showDot=true] - Display the leading status dot
 * @param {'sm'|'md'} [props.size='sm'] - Sizing profile
 * @param {string} [props.className] - Additional CSS class names
 */
export default function ConnectionPill({
  showDetail = false,
  showDot = true,
  size = 'sm',
  className = '',
}) {
  const { connection, dataset, live } = useApp()
  const isSmall = size === 'sm'

  // Tone color styling
  const toneMap = {
    ok: {
      color: 'var(--color-accent-2)',
      bg: 'var(--color-accent-soft)',
      border: 'var(--color-accent)',
    },
    bad: {
      color: 'var(--color-critical)',
      bg: '#250f13',
      border: '#542028',
    },
    warn: {
      color: 'var(--color-warn)',
      bg: '#1a0f00',
      border: '#3d2800',
    },
    idle: {
      color: 'var(--color-faint)',
      bg: '#121519',
      border: 'var(--color-line)',
    },
  }

  const activeTone = toneMap[connection?.tone] || toneMap.idle

  // Special presentation for demo data
  if (dataset?.source === 'demo') {
    return (
      <span
        className={cx(
          'inline-flex items-center font-mono tracking-wide uppercase border rounded-none whitespace-nowrap',
          className,
        )}
        style={{
          background: '#1a0f00',
          borderColor: '#3d2800',
          color: 'var(--color-warn)',
          fontSize: isSmall ? '10px' : '11px',
          padding: isSmall ? '2px 7px' : '3px 9px',
          gap: '6px',
          letterSpacing: '0.06em',
        }}
        title="Active data source: Browser-generated demonstration dataset."
      >
        {showDot && <StatusDot tone="warn" size={isSmall ? 6 : 7} />}
        <span>Demo Data</span>
        {showDetail && (
          <span style={{ opacity: 0.7, textTransform: 'none' }}>
            (Synthetic)
          </span>
        )}
      </span>
    )
  }

  // Unconnected or live
  return (
    <span
      className={cx(
        'inline-flex items-center font-mono tracking-wide uppercase border rounded-none whitespace-nowrap',
        className,
      )}
      style={{
        background: activeTone.bg,
        borderColor: activeTone.border,
        color: activeTone.color,
        fontSize: isSmall ? '10px' : '11px',
        padding: isSmall ? '2px 7px' : '3px 9px',
        gap: '6px',
        letterSpacing: '0.06em',
      }}
      title={`${connection?.label || 'Status'} · ${connection?.detail || ''}`}
    >
      {showDot && (
        <StatusDot
          tone={connection?.tone}
          pulse={live?.loading}
          size={isSmall ? 6 : 7}
        />
      )}
      <span>{connection?.label || 'Not connected'}</span>
      {showDetail && connection?.detail && (
        <span
          style={{
            color: 'var(--color-muted)',
            textTransform: 'none',
            fontSize: isSmall ? '10px' : '11px',
            marginLeft: 2,
          }}
        >
          — {connection.detail}
        </span>
      )}
    </span>
  )
}
