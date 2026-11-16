import { AlertOctagon, RotateCw, X } from 'lucide-react'
import { cx } from '../utils/cx'

/**
 * Banner for displaying API connectivity, parsing or runtime errors.
 *
 * @param {Object} props
 * @param {string} [props.title='API Error'] - Error heading
 * @param {string|Error} [props.message] - Descriptive error text or Error object
 * @param {Function} [props.onRetry] - Optional retry handler callback
 * @param {Function} [props.onDismiss] - Optional dismiss callback
 * @param {string} [props.className] - Additional CSS class names
 */
export default function ErrorBanner({
  title = 'API Error',
  message,
  onRetry,
  onDismiss,
  className = '',
}) {
  if (!message) return null

  const textMessage =
    typeof message === 'string'
      ? message
      : message?.message || 'An unexpected error occurred while communicating with the server.'

  return (
    <div
      role="alert"
      className={cx(
        'w-full flex items-start justify-between border shrink-0',
        className,
      )}
      style={{
        background: '#190d0f',
        borderColor: '#4d1c22',
        padding: '10px 14px',
        gap: '12px',
      }}
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <AlertOctagon
          size={16}
          aria-hidden="true"
          className="shrink-0 mt-0.5"
          style={{ color: 'var(--color-critical)' }}
        />
        <div className="min-w-0 flex-1">
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--color-critical)',
              lineHeight: 1.3,
              marginBottom: '2px',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--color-ink)',
              lineHeight: 1.45,
              wordBreak: 'break-word',
            }}
          >
            {textMessage}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="gx-btn"
            style={{
              height: '24px',
              padding: '0 8px',
              fontSize: '11px',
              borderColor: '#4d1c22',
              color: 'var(--color-ink-strong)',
            }}
          >
            <RotateCw size={11} aria-hidden="true" />
            <span>Retry</span>
          </button>
        )}

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-faint)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
