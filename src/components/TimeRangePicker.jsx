import { useApp } from '../hooks/useApp'
import { cx } from '../utils/cx'
import { RANGES } from '../utils/time'

/**
 * Reusable time-range selector button group.
 * If value/onChange are omitted, binds directly to AppContext timeRange and setTimeRange.
 *
 * @param {Object} props
 * @param {string} [props.value] - Controlled selected range id ('15m'|'1h'|'24h'|'7d'|'30d')
 * @param {Function} [props.onChange] - Range change callback: (rangeId: string) => void
 * @param {Array<Object>} [props.ranges] - Override list of ranges
 * @param {'sm'|'md'} [props.size='sm'] - Sizing profile
 * @param {string} [props.className] - Additional CSS class names
 */
export default function TimeRangePicker({
  value,
  onChange,
  ranges = RANGES,
  size = 'sm',
  className = '',
}) {
  const app = useApp()

  const activeRange = value ?? app?.timeRange ?? '24h'
  const handleSelect = onChange ?? app?.setTimeRange

  const isSmall = size === 'sm'

  return (
    <div
      role="group"
      aria-label="Time range filter"
      className={cx('inline-flex items-center gap-0.5 shrink-0 select-none', className)}
    >
      {ranges.map((range) => {
        const isActive = activeRange === range.id

        return (
          <button
            key={range.id}
            type="button"
            onClick={() => handleSelect?.(range.id)}
            aria-pressed={isActive}
            style={{
              height: isSmall ? 22 : 26,
              padding: isSmall ? '0 6px' : '0 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: isSmall ? '10px' : '11px',
              letterSpacing: '0.04em',
              cursor: 'pointer',
              border: '1px solid',
              transition: 'background 140ms, color 140ms, border-color 140ms',
              background: isActive ? 'var(--color-accent-soft)' : 'transparent',
              borderColor: isActive ? 'var(--color-accent)' : 'var(--color-line)',
              color: isActive ? 'var(--color-accent-2)' : 'var(--color-faint)',
            }}
          >
            {range.label}
          </button>
        )
      })}
    </div>
  )
}
