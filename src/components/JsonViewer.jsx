import { useState } from 'react'
import { Check, Copy, FileCode } from 'lucide-react'
import { cx } from '../utils/cx'

/**
 * Enterprise raw event JSON viewer with one-click clipboard copying and syntax contrast.
 *
 * @param {Object} props
 * @param {any} props.data - Raw telemetry object or string
 * @param {string} [props.title='Raw Event Data'] - Panel header title
 * @param {string} [props.maxHeight='420px'] - Maximum CSS height before scrolling
 * @param {boolean} [props.copyable=true] - Display the copy button
 * @param {string} [props.className] - Additional container class names
 */
export default function JsonViewer({
  data,
  title = 'Raw Event Data',
  maxHeight = '420px',
  copyable = true,
  className = '',
}) {
  const [copied, setCopied] = useState(false)

  const jsonString =
    data == null
      ? 'null'
      : typeof data === 'string'
        ? data
        : JSON.stringify(data, null, 2)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(jsonString)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Fallback for older sandboxes
      const textarea = document.createElement('textarea')
      textarea.value = jsonString
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  const lineCount = jsonString.split('\n').length
  const byteCount = new Blob([jsonString]).size

  return (
    <div
      className={cx('w-full border flex flex-col', className)}
      style={{
        background: '#0a0c0e',
        borderColor: 'var(--color-line)',
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b select-none shrink-0"
        style={{
          background: 'var(--color-sidebar)',
          borderColor: 'var(--color-line)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileCode
            size={13}
            aria-hidden="true"
            style={{ color: 'var(--color-accent)' }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-strong)',
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--color-faint)',
            }}
          >
            ({lineCount} lines · {byteCount} B)
          </span>
        </div>

        {copyable && (
          <button
            type="button"
            onClick={handleCopy}
            className="gx-btn"
            style={{
              height: '22px',
              padding: '0 8px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              gap: '4px',
            }}
            title="Copy JSON to clipboard"
          >
            {copied ? (
              <>
                <Check
                  size={11}
                  aria-hidden="true"
                  style={{ color: 'var(--color-accent)' }}
                />
                <span style={{ color: 'var(--color-accent)' }}>Copied</span>
              </>
            ) : (
              <>
                <Copy size={11} aria-hidden="true" />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Code body */}
      <pre
        tabIndex={0}
        aria-label={title}
        className="p-3 m-0 overflow-auto text-left"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          lineHeight: 1.55,
          color: 'var(--color-ink)',
          maxHeight,
          whiteSpace: 'pre',
          tabSize: 2,
        }}
      >
        <code>{jsonString}</code>
      </pre>
    </div>
  )
}
