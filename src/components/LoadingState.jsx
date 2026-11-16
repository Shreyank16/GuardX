import { Loader2 } from 'lucide-react'
import { cx } from '../utils/cx'

/**
 * Reusable loading indicator for async queries, table fetches and widget refreshes.
 *
 * @param {Object} props
 * @param {string} [props.message='Loading telemetry...'] - Accessible loading text
 * @param {boolean} [props.compact=false] - Inline / small variant
 * @param {number} [props.size] - Custom spinner size in pixels
 * @param {string} [props.className] - Additional CSS class names
 */
export default function LoadingState({
  message = 'Loading telemetry...',
  compact = false,
  size,
  className = '',
}) {
  const iconSize = size ?? (compact ? 14 : 20)

  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        'w-full flex items-center justify-center text-center select-none',
        compact ? 'p-2' : 'p-8',
        className,
      )}
      style={{
        gap: compact ? '6px' : '10px',
        color: 'var(--color-muted)',
      }}
    >
      <Loader2
        size={iconSize}
        aria-hidden="true"
        className="gx-spin shrink-0"
        style={{ color: 'var(--color-accent)' }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: compact ? '11px' : '12px',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--color-faint)',
        }}
      >
        {message}
      </span>
    </div>
  )
}
