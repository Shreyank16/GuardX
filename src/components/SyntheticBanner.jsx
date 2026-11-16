import { AlertTriangle } from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { cx } from '../utils/cx'

/**
 * Global banner rendered whenever the application data source is 'demo'.
 *
 * DATA SAFETY RULE:
 * This component will return null unless dataset.source === 'demo'.
 * It will NEVER render when in 'unconnected' or 'live' modes.
 *
 * @param {Object} props
 * @param {boolean} [props.compact=false] - Use a narrower padding/font profile
 * @param {string} [props.className] - Additional CSS class names
 */
export default function SyntheticBanner({ compact = false, className = '' }) {
  const { dataset } = useApp()

  // Guard condition: never show when unconnected or live
  if (dataset?.source !== 'demo') {
    return null
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      className={cx(
        'w-full flex items-center shrink-0 border-b',
        className,
      )}
      style={{
        background: '#130c00',
        borderColor: '#3a2500',
        color: 'var(--color-warn)',
        padding: compact ? '4px 12px' : '6px 16px',
        fontSize: compact ? '10px' : '11px',
        lineHeight: 1.4,
        gap: '8px',
      }}
    >
      <AlertTriangle
        size={compact ? 13 : 15}
        aria-hidden="true"
        className="shrink-0"
        style={{ color: 'var(--color-warn)' }}
      />
      <div className="flex-1 min-w-0">
        <strong
          style={{
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.06em',
            fontWeight: 600,
            marginRight: '6px',
          }}
        >
          DEMONSTRATION DATA
        </strong>
        <span>
          All records shown are synthetic and generated in the browser for interface
          evaluation. They are not Wazuh telemetry and were not collected from JARVIS or any
          live endpoint.
        </span>
      </div>
    </aside>
  )
}
