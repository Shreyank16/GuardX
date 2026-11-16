import { RotateCcw, Search, X } from 'lucide-react'
import { cx } from '../utils/cx'

/**
 * Filter and search bar for telemetry queues, alerts and audit tables.
 *
 * @param {Object} props
 * @param {string} [props.searchQuery=''] - Current search query text
 * @param {Function} [props.onSearchChange] - Search input change callback: (query: string) => void
 * @param {string} [props.searchPlaceholder='Search records...'] - Placeholder text
 * @param {Array<{
 *   id: string,
 *   label: string,
 *   value: string,
 *   options: Array<{ value: string, label: string }>,
 *   onChange: (value: string) => void
 * }>} [props.filters=[]] - Dropdown filter configurations
 * @param {Function} [props.onReset] - Reset filters callback
 * @param {boolean} [props.hasActiveFilters=false] - Whether reset button should be visible
 * @param {React.ReactNode} [props.children] - Additional right-aligned actions/controls
 * @param {string} [props.className] - Additional container class names
 */
export default function FilterBar({
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filters = [],
  onReset,
  hasActiveFilters = false,
  children,
  className = '',
}) {
  const isSearchActive = Boolean(searchQuery && searchQuery.trim().length > 0)
  const canReset = hasActiveFilters || isSearchActive

  return (
    <div
      role="search"
      aria-label="Filter records"
      className={cx(
        'w-full flex flex-wrap items-center justify-between gap-2.5 p-2.5 border mb-3',
        className,
      )}
      style={{
        background: 'var(--color-panel)',
        borderColor: 'var(--color-line)',
      }}
    >
      {/* Left side: Search input + Select filters */}
      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
        {/* Search input with icons */}
        {onSearchChange && (
          <div
            className="relative flex items-center min-w-[180px] max-w-[280px] flex-1"
          >
            <Search
              size={13}
              aria-hidden="true"
              className="absolute left-2.5 text-faint pointer-events-none"
              style={{ color: 'var(--color-faint)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="gx-field"
              style={{
                paddingLeft: '28px',
                paddingRight: isSearchActive ? '26px' : '8px',
                height: '28px',
                fontSize: '11px',
              }}
            />
            {isSearchActive && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2 text-faint hover:text-ink cursor-pointer bg-transparent border-0 p-0 flex items-center justify-center"
                style={{ color: 'var(--color-faint)' }}
              >
                <X size={12} aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* Dropdown filters */}
        {filters.map((filter) => (
          <div key={filter.id} className="flex items-center gap-1.5 shrink-0">
            {filter.label && (
              <label
                htmlFor={`filter-${filter.id}`}
                className="text-faint font-mono uppercase tracking-wider text-[10px] shrink-0"
                style={{ color: 'var(--color-faint)' }}
              >
                {filter.label}
              </label>
            )}
            <select
              id={`filter-${filter.id}`}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="gx-field"
              style={{
                height: '28px',
                fontSize: '11px',
                minWidth: '110px',
                padding: '0 6px',
                cursor: 'pointer',
              }}
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* Reset button */}
        {onReset && canReset && (
          <button
            type="button"
            onClick={onReset}
            className="gx-btn shrink-0"
            title="Reset filters"
            style={{
              height: '28px',
              padding: '0 8px',
              fontSize: '11px',
              color: 'var(--color-warn)',
            }}
          >
            <RotateCcw size={11} aria-hidden="true" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Right side: custom slot */}
      {children && (
        <div className="flex items-center gap-2 shrink-0">
          {children}
        </div>
      )}
    </div>
  )
}
