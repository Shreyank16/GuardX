import { Database, FilterX, ShieldCheck, WifiOff } from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { cx } from '../utils/cx'

/**
 * Reusable empty state for SIEM telemetry, alert queues and search results.
 *
 * Automatically detects whether the application is in:
 * 1. 'unconnected' mode (no backend connected)
 * 2. 'live' mode with 0 events
 * 3. 'demo' mode with filtered out events
 *
 * @param {Object} props
 * @param {string} [props.title] - Override title
 * @param {string} [props.description] - Override descriptive message
 * @param {React.ComponentType} [props.icon] - Override Lucide icon component
 * @param {React.ReactNode} [props.action] - Optional call to action / button
 * @param {boolean} [props.compact=false] - Compact padding variant
 * @param {string} [props.className] - Additional CSS class names
 */
export default function EmptyState({
  title,
  description,
  icon: CustomIcon,
  action,
  compact = false,
  className = '',
}) {
  const { dataset } = useApp()
  const source = dataset?.source || 'unconnected'

  // Default configurations based on the data source
  let defaultIcon = Database
  let defaultTitle = 'No Records Found'
  let defaultDescription =
    'No security telemetry records match the current view criteria.'

  if (source === 'unconnected') {
    defaultIcon = WifiOff
    defaultTitle = 'Unconnected Mode'
    defaultDescription =
      'GuardX is operating in unconnected mode. No live telemetry is being ingested from the Wazuh manager, and synthetic events are disabled by default. Configure the backend API or switch to demonstration data in Settings.'
  } else if (source === 'live') {
    defaultIcon = ShieldCheck
    defaultTitle = 'No Live Events Recorded'
    defaultDescription =
      'The Wazuh manager is connected and healthy, but no security events were reported for this telemetry group within the selected time window.'
  } else if (source === 'demo') {
    defaultIcon = FilterX
    defaultTitle = 'No Matching Demo Records'
    defaultDescription =
      'No synthetic events match the current search query or active filter settings.'
  }

  const IconComponent = CustomIcon || defaultIcon
  const displayTitle = title || defaultTitle
  const displayDescription = description || defaultDescription

  return (
    <div
      role="region"
      aria-label={displayTitle}
      className={cx(
        'w-full flex flex-col items-center justify-center text-center border',
        className,
      )}
      style={{
        background: 'var(--color-panel)',
        borderColor: 'var(--color-line)',
        padding: compact ? '24px 16px' : '48px 24px',
      }}
    >
      <div
        className="flex items-center justify-center shrink-0 mb-3"
        style={{
          width: compact ? 36 : 44,
          height: compact ? 36 : 44,
          background: 'var(--color-panel-2)',
          border: '1px solid var(--color-line)',
          color: 'var(--color-faint)',
        }}
      >
        <IconComponent size={compact ? 18 : 22} aria-hidden="true" />
      </div>

      <h3
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: compact ? '12px' : '13px',
          fontWeight: 500,
          letterSpacing: '0.04em',
          color: 'var(--color-ink-strong)',
          margin: '0 0 6px',
          textTransform: 'uppercase',
        }}
      >
        {displayTitle}
      </h3>

      <p
        style={{
          maxWidth: '460px',
          fontSize: compact ? '11px' : '12px',
          lineHeight: 1.5,
          color: 'var(--color-muted)',
          margin: 0,
        }}
      >
        {displayDescription}
      </p>

      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
