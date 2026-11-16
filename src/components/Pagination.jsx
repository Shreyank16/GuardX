import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { cx } from '../utils/cx'
import { pageWindow } from '../utils/records'

/**
 * Reusable pagination bar for data tables.
 * Utilizes the pageWindow utility from records.js.
 *
 * @param {Object} props
 * @param {number} props.total - Total number of items across all pages
 * @param {number} props.page - Current 1-based page number
 * @param {number} props.pageSize - Number of items displayed per page
 * @param {Function} props.onPageChange - Callback: (page: number) => void
 * @param {string} [props.className] - Additional CSS class names
 */
export default function Pagination({
  total = 0,
  page = 1,
  pageSize = 25,
  onPageChange,
  className = '',
}) {
  const windowData = pageWindow(total, page, pageSize)
  const { page: currentPage, pageCount, from, to } = windowData

  const canPrev = currentPage > 1
  const canNext = currentPage < pageCount

  return (
    <div
      className={cx(
        'w-full flex items-center justify-between gap-3 px-3 py-2 border-t font-mono text-xs select-none',
        className,
      )}
      style={{
        background: 'var(--color-sidebar)',
        borderColor: 'var(--color-line)',
        color: 'var(--color-faint)',
        fontSize: '11px',
      }}
    >
      {/* Record count summary */}
      <div className="tracking-wide">
        {total === 0 ? (
          <span>0 records</span>
        ) : (
          <span>
            Showing <strong style={{ color: 'var(--color-ink-strong)' }}>{from}</strong>–
            <strong style={{ color: 'var(--color-ink-strong)' }}>{to}</strong> of{' '}
            <strong style={{ color: 'var(--color-ink-strong)' }}>{total}</strong> records
          </span>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-1.5">
        <span
          className="mr-2"
          style={{
            fontSize: '11px',
            color: 'var(--color-muted)',
            letterSpacing: '0.04em',
          }}
        >
          Page {currentPage} of {pageCount}
        </span>

        <button
          type="button"
          onClick={() => onPageChange?.(1)}
          disabled={!canPrev}
          title="First page"
          aria-label="First page"
          className="gx-btn"
          style={{ width: 26, height: 24, padding: 0 }}
        >
          <ChevronsLeft size={13} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange?.(currentPage - 1)}
          disabled={!canPrev}
          title="Previous page"
          aria-label="Previous page"
          className="gx-btn"
          style={{ width: 26, height: 24, padding: 0 }}
        >
          <ChevronLeft size={13} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange?.(currentPage + 1)}
          disabled={!canNext}
          title="Next page"
          aria-label="Next page"
          className="gx-btn"
          style={{ width: 26, height: 24, padding: 0 }}
        >
          <ChevronRight size={13} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange?.(pageCount)}
          disabled={!canNext}
          title="Last page"
          aria-label="Last page"
          className="gx-btn"
          style={{ width: 26, height: 24, padding: 0 }}
        >
          <ChevronsRight size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
