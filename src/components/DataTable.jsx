import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react'
import { cx } from '../utils/cx'
import EmptyState from './EmptyState'
import LoadingState from './LoadingState'

/**
 * Reusable data table for SIEM records, alerts, endpoints and telemetry tables.
 *
 * @param {Object} props
 * @param {Array<{
 *   key: string,
 *   label: string,
 *   render?: (value: any, row: any, index: number) => React.ReactNode,
 *   sortable?: boolean,
 *   align?: 'left'|'center'|'right',
 *   width?: string|number,
 *   mono?: boolean
 * }>} props.columns - Column specifications
 * @param {Array<Object>} props.data - Array of row objects
 * @param {Object} [props.sort] - Current sort { key: string, direction: 'asc'|'desc' }
 * @param {Function} [props.onSort] - Sort change callback: (newSort) => void
 * @param {string|number} [props.selectedId] - Currently selected row key value
 * @param {Function} [props.onSelectRow] - Row click handler: (row) => void
 * @param {string} [props.keyField='id'] - Unique key identifier field in row objects
 * @param {boolean} [props.isLoading=false] - Show loading state overlay
 * @param {React.ReactNode} [props.emptyState] - Custom empty state element
 * @param {string} [props.className] - Additional table container class names
 */
export default function DataTable({
  columns = [],
  data = [],
  sort,
  onSort,
  selectedId,
  onSelectRow,
  keyField = 'id',
  isLoading = false,
  emptyState,
  className = '',
}) {
  function handleHeaderClick(col) {
    if (!col.sortable || !onSort) return

    let nextDirection = 'asc'
    if (sort?.key === col.key) {
      nextDirection = sort.direction === 'asc' ? 'desc' : 'asc'
    }
    onSort({ key: col.key, direction: nextDirection })
  }

  if (isLoading) {
    return (
      <div
        className={cx(
          'w-full border p-12 flex items-center justify-center',
          className,
        )}
        style={{
          background: 'var(--color-panel)',
          borderColor: 'var(--color-line)',
        }}
      >
        <LoadingState message="Loading records..." />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className={className}>
        {emptyState ?? <EmptyState compact />}
      </div>
    )
  }

  return (
    <div
      className={cx(
        'w-full overflow-x-auto border',
        className,
      )}
      style={{
        background: 'var(--color-panel)',
        borderColor: 'var(--color-line)',
      }}
    >
      <table
        className="w-full text-left border-collapse"
        style={{ fontSize: '12px' }}
      >
        <thead>
          <tr
            style={{
              background: 'var(--color-sidebar)',
              borderBottom: '1px solid var(--color-line)',
            }}
          >
            {columns.map((col) => {
              const isSorted = sort?.key === col.key
              const isSortable = Boolean(col.sortable && onSort)
              const align = col.align || 'left'

              return (
                <th
                  key={col.key}
                  scope="col"
                  onClick={() => handleHeaderClick(col)}
                  className={cx(
                    'px-3 py-2 select-none uppercase font-mono tracking-wider',
                    isSortable ? 'cursor-pointer hover:text-white' : '',
                  )}
                  style={{
                    color: isSorted ? 'var(--color-accent-2)' : 'var(--color-faint)',
                    fontSize: '10px',
                    fontWeight: 500,
                    letterSpacing: '0.06em',
                    textAlign: align,
                    width: col.width,
                  }}
                  aria-sort={
                    isSorted
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <div
                    className={cx(
                      'inline-flex items-center gap-1',
                      align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start',
                    )}
                  >
                    <span>{col.label}</span>
                    {isSortable && (
                      <span className="shrink-0">
                        {isSorted ? (
                          sort.direction === 'asc' ? (
                            <ChevronUp size={11} aria-hidden="true" />
                          ) : (
                            <ChevronDown size={11} aria-hidden="true" />
                          )
                        ) : (
                          <ChevronsUpDown
                            size={10}
                            aria-hidden="true"
                            style={{ opacity: 0.3 }}
                          />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const rowId = row[keyField] ?? index
            const isSelected = selectedId != null && selectedId === rowId
            const isClickable = Boolean(onSelectRow)

            return (
              <tr
                key={rowId}
                onClick={() => onSelectRow?.(row)}
                className={cx(
                  'transition-colors',
                  isClickable ? 'cursor-pointer' : '',
                )}
                style={{
                  borderBottom: '1px solid var(--color-line-soft)',
                  background: isSelected
                    ? 'var(--color-accent-soft)'
                    : index % 2 === 1
                      ? '#101317'
                      : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--color-panel-2)'
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background =
                      index % 2 === 1 ? '#101317' : 'transparent'
                  }
                }}
              >
                {columns.map((col) => {
                  const rawValue = row[col.key]
                  const content = col.render
                    ? col.render(rawValue, row, index)
                    : rawValue ?? '—'
                  const align = col.align || 'left'

                  return (
                    <td
                      key={col.key}
                      className="px-3 py-2.5 whitespace-nowrap"
                      style={{
                        textAlign: align,
                        fontFamily: col.mono ? 'var(--font-mono)' : 'inherit',
                        fontSize: col.mono ? '11px' : '12px',
                        color: isSelected ? 'var(--color-ink-strong)' : 'var(--color-ink)',
                      }}
                    >
                      {content}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
