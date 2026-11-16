import { useMemo, useState } from 'react'
import {
  CheckCircle,
  Eye,
  KeyRound,
  Percent,
  ShieldCheck,
  UserX,
  X,
} from 'lucide-react'
import {
  ConnectionPill,
  DataTable,
  EmptyState,
  FilterBar,
  JsonViewer,
  Pagination,
  StatusDot,
  TimeRangePicker,
} from '../components'
import { useApp } from '../hooks/useApp'
import { usePage } from '../hooks/usePage'
import { usePageTitle } from '../hooks/usePageTitle'
import { formatTimestamp, logonTypeLabel } from '../utils/format'
import { filterAuth, pageWindow, sortRows } from '../utils/records'

export default function AuthPage() {
  usePageTitle('Authentication Monitoring')
  const { dataset, timeRange, asOf, selectedEndpoint } = useApp()

  const isUnconnected = dataset.source === 'unconnected'

  // Filter states
  const [search, setSearch] = useState('')
  const [resultFilter, setResultFilter] = useState('all')
  const [endpointFilter, setEndpointFilter] = useState('all')
  const [eventIdFilter, setEventIdFilter] = useState('all')

  // Sorting
  const [sort, setSort] = useState({ key: 'timestamp', direction: 'desc' })

  // Selected event for raw JSON inspection
  const [selectedEvent, setSelectedEvent] = useState(null)

  // Page tracking
  const filterKey = `${search}-${resultFilter}-${endpointFilter}-${eventIdFilter}-${timeRange}-${selectedEndpoint}`
  const [activePage, setActivePage] = usePage(filterKey)

  // Filtered events
  const filteredEvents = useMemo(() => {
    return filterAuth(dataset.authentication, {
      range: timeRange,
      asOf,
      result: resultFilter,
      endpoint: endpointFilter,
      q: search,
    }).filter((event) => {
      if (eventIdFilter !== 'all' && event.eventId !== eventIdFilter) return false
      return true
    })
  }, [dataset.authentication, timeRange, asOf, resultFilter, endpointFilter, eventIdFilter, search])


  // Summary counts based on time window
  const inWindowAll = useMemo(() => {
    return filterAuth(dataset.authentication, {
      range: timeRange,
      asOf,
      result: 'all',
      endpoint: 'all',
      q: '',
    })
  }, [dataset.authentication, timeRange, asOf])

  const hasActiveFilters =
    search.trim().length > 0 ||
    resultFilter !== 'all' ||
    endpointFilter !== 'all' ||
    eventIdFilter !== 'all'

  // Determine whether to use full API aggregated metrics or loaded window counts
  const useApiMetrics = Boolean(dataset.authMetrics && !hasActiveFilters && dataset.source === 'live')
  const metricsSourceLabel = useApiMetrics
    ? 'Aggregated Total'
    : hasActiveFilters
      ? 'Filtered Subset'
      : 'Loaded Window'

  const totalCount = useApiMetrics
    ? (dataset.authMetrics.total || dataset.authTotal || inWindowAll.length)
    : inWindowAll.length
  const failureCount = useApiMetrics
    ? dataset.authMetrics.failure
    : inWindowAll.filter((e) => e.result === 'failure').length
  const successCount = useApiMetrics
    ? dataset.authMetrics.success
    : inWindowAll.filter((e) => e.result === 'success').length
  const failureRatio =
    totalCount > 0 ? `${((failureCount / totalCount) * 100).toFixed(1)}%` : '—'

  // Sorting and pagination
  const sortedEvents = useMemo(() => {
    return sortRows(filteredEvents, sort)
  }, [filteredEvents, sort])

  const pageSize = 15
  const windowData = pageWindow(sortedEvents.length, activePage, pageSize)
  const paginatedEvents = useMemo(() => {
    return sortedEvents.slice(windowData.start, windowData.end)
  }, [sortedEvents, windowData.start, windowData.end])

  // Distinct endpoints
  const endpointOptions = useMemo(() => {
    const names = new Set(dataset.authentication.map((a) => a.endpoint).filter(Boolean))
    return [
      { value: 'all', label: 'All Endpoints' },
      ...Array.from(names).map((name) => ({ value: name, label: name })),
    ]
  }, [dataset.authentication])


  function handleResetFilters() {
    setSearch('')
    setResultFilter('all')
    setEndpointFilter('all')
    setEventIdFilter('all')
    setActivePage(1)
  }

  // Table columns
  const columns = [
    {
      key: 'result',
      label: 'Result',
      width: '120px',
      sortable: true,
      render: (val, row) => {
        const isFail = val === 'failure'
        return (
          <span
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border"
            style={{
              background: isFail ? '#251214' : '#102419',
              borderColor: isFail ? '#5c2229' : '#234d35',
              color: isFail ? '#ea7a7a' : 'var(--color-accent-2)',
            }}
          >
            <StatusDot tone={isFail ? 'bad' : 'ok'} size={5} />
            <span>{isFail ? 'Failed' : 'Success'}</span>
            <span style={{ opacity: 0.6 }}>({row.eventId || '—'})</span>
          </span>
        )
      },
    },
    {
      key: 'username',
      label: 'Target Account',
      width: '160px',
      mono: true,
      sortable: true,
      render: (val, row) => (
        <div
          className="cursor-pointer group flex flex-col font-mono text-xs"
          onClick={() => setSelectedEvent(row)}
        >
          <span
            className="font-semibold text-ink-strong group-hover:underline"
            style={{ color: 'var(--color-ink-strong)' }}
          >
            {val || '—'}
          </span>
          <span className="text-[10px] text-faint">
            {row.logonType != null ? logonTypeLabel(row.logonType) : 'Logon type N/A'}
          </span>
        </div>
      ),
    },
    {
      key: 'eventId',
      label: 'Event ID',
      width: '100px',
      mono: true,
      sortable: true,
      render: (val) => (
        <span
          className="font-semibold"
          style={{
            color: val === '4625' ? 'var(--color-critical)' : 'var(--color-accent-2)',
          }}
        >
          {val || '—'}
        </span>
      ),
    },
    {
      key: 'sourceIp',
      label: 'Source Address',
      width: '140px',
      mono: true,
      render: (val) => (
        <span style={{ color: val ? 'var(--color-ink-strong)' : 'var(--color-faint)' }}>
          {val || 'Local / None'}
        </span>
      ),
    },
    {
      key: 'endpoint',
      label: 'Agent / Endpoint',
      width: '140px',
      mono: true,
      sortable: true,
      render: (val, row) => (
        <div className="flex flex-col font-mono text-[11px]">
          <span style={{ color: 'var(--color-ink-strong)' }}>{val}</span>
          <span style={{ color: 'var(--color-faint)', fontSize: '10px' }}>
            ID: {row.agentId || '002'}
          </span>
        </div>
      ),
    },
    {
      key: 'timestamp',
      label: 'Timestamp',
      width: '160px',
      mono: true,
      sortable: true,
      render: (val) => formatTimestamp(val),
    },
    {
      key: 'inspect',
      label: '',
      width: '80px',
      render: (_, row) => (
        <button
          type="button"
          onClick={() => setSelectedEvent(row)}
          className="gx-btn"
          style={{ height: '22px', fontSize: '10px', padding: '0 6px' }}
        >
          <Eye size={10} aria-hidden="true" />
          <span>Inspect</span>
        </button>
      ),
    },
  ]

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* ── Page Header ── */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-5"
        style={{ borderBottom: '1px solid var(--color-line)' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <KeyRound size={17} style={{ color: 'var(--color-accent)' }} />
            <h1
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '15px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--color-ink-strong)',
                margin: 0,
              }}
            >
              Authentication Monitoring
            </h1>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 border uppercase"
              style={{
                background: 'var(--color-panel-2)',
                borderColor: 'var(--color-line)',
                color: 'var(--color-faint)',
              }}
            >
              Security Auditing
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: 0 }}>
            Windows Security Logons (Event ID 4624) and Authentication Failures (Event ID 4625).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ConnectionPill showDetail />
        </div>
      </div>

      {/* ── Summary Counters ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div
          className="p-3 border flex items-center justify-between"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
            borderLeft: '3px solid var(--color-accent)',
          }}
        >
          <div>
            <div className="text-[10px] font-mono uppercase text-faint" style={{ color: 'var(--color-faint)' }}>
              Total Logons
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: 'var(--color-ink-strong)' }}>
              {totalCount}
            </div>
            <div className="text-[9px] font-mono text-faint mt-0.5" style={{ color: 'var(--color-faint)' }}>
              {metricsSourceLabel}
            </div>
          </div>
          <ShieldCheck size={18} style={{ color: 'var(--color-accent)' }} />
        </div>

        <div
          className="p-3 border flex items-center justify-between"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
            borderLeft: '3px solid var(--color-critical)',
          }}
        >
          <div>
            <div className="text-[10px] font-mono uppercase text-faint" style={{ color: 'var(--color-critical)' }}>
              Failures (Event 4625)
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: '#ea7a7a' }}>
              {failureCount}
            </div>
            <div className="text-[9px] font-mono text-faint mt-0.5" style={{ color: 'var(--color-faint)' }}>
              {metricsSourceLabel}
            </div>
          </div>
          <UserX size={18} style={{ color: 'var(--color-critical)' }} />
        </div>

        <div
          className="p-3 border flex items-center justify-between"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
            borderLeft: '3px solid var(--color-accent)',
          }}
        >
          <div>
            <div className="text-[10px] font-mono uppercase text-faint" style={{ color: 'var(--color-accent-2)' }}>
              Successes (Event 4624)
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: '#b7dcc8' }}>
              {successCount}
            </div>
            <div className="text-[9px] font-mono text-faint mt-0.5" style={{ color: 'var(--color-faint)' }}>
              {metricsSourceLabel}
            </div>
          </div>
          <CheckCircle size={18} style={{ color: 'var(--color-accent)' }} />
        </div>

        <div
          className="p-3 border flex items-center justify-between"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
            borderLeft: '3px solid var(--color-warn)',
          }}
        >
          <div>
            <div className="text-[10px] font-mono uppercase text-faint" style={{ color: 'var(--color-warn)' }}>
              Failure Ratio
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: '#ddb974' }}>
              {failureRatio}
            </div>
            <div className="text-[9px] font-mono text-faint mt-0.5" style={{ color: 'var(--color-faint)' }}>
              {totalCount > 0 ? `${failureCount} of ${totalCount}` : 'No events'}
            </div>
          </div>
          <Percent size={18} style={{ color: 'var(--color-warn)' }} />
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by username, IP, event ID, or description..."
        filters={[
          {
            id: 'result',
            label: 'Result',
            value: resultFilter,
            onChange: setResultFilter,
            options: [
              { value: 'all', label: 'All Results' },
              { value: 'failure', label: 'Failed (4625)' },
              { value: 'success', label: 'Success (4624)' },
            ],
          },
          {
            id: 'eventId',
            label: 'Event ID',
            value: eventIdFilter,
            onChange: setEventIdFilter,
            options: [
              { value: 'all', label: 'All Event IDs' },
              { value: '4625', label: '4625 (Logon Failure)' },
              { value: '4624', label: '4624 (Logon Success)' },
            ],
          },
          {
            id: 'endpoint',
            label: 'Endpoint',
            value: endpointFilter,
            onChange: setEndpointFilter,
            options: endpointOptions,
          },
        ]}
        hasActiveFilters={hasActiveFilters}
        onReset={handleResetFilters}
      >
        <TimeRangePicker />
      </FilterBar>

      {/* ── DataTable ── */}
      <div
        className="border flex flex-col mb-6"
        style={{
          background: 'var(--color-panel)',
          borderColor: 'var(--color-line)',
        }}
      >
        <DataTable
          columns={columns}
          data={paginatedEvents}
          sort={sort}
          onSort={setSort}
          keyField="id"
          emptyState={
            <EmptyState
              compact
              title={
                isUnconnected
                  ? 'No Authentication Telemetry in Unconnected Mode'
                  : hasActiveFilters
                    ? 'No Logons Match Active Filters'
                    : 'No Authentication Events Recorded'
              }
              description={
                isUnconnected
                  ? 'In unconnected mode, live Windows Security Auditing events are not collected. Connect to the Wazuh backend or enable demonstration data in Settings.'
                  : hasActiveFilters
                    ? 'Try clearing filter criteria to view all authentication attempts.'
                    : 'No logon success or failure events occurred within the selected time window.'
              }
            />
          }
        />

        {filteredEvents.length > 0 && (
          <Pagination
            total={filteredEvents.length}
            page={activePage}
            pageSize={pageSize}
            onPageChange={setActivePage}
          />
        )}
      </div>

      {/* ── Detail Modal / Drawer ── */}
      {selectedEvent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-drawer-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in"
        >
          <div
            className="w-full max-w-2xl border flex flex-col shadow-2xl"
            style={{
              background: 'var(--color-panel)',
              borderColor: 'var(--color-line)',
              maxHeight: '90vh',
            }}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b select-none"
              style={{
                background: 'var(--color-sidebar)',
                borderColor: 'var(--color-line)',
              }}
            >
              <div className="flex items-center gap-2">
                <KeyRound size={15} style={{ color: 'var(--color-accent)' }} />
                <span
                  id="auth-drawer-title"
                  className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-strong"
                >
                  Logon Audit Event · {selectedEvent.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-faint hover:text-ink cursor-pointer bg-transparent border-0 p-1"
                aria-label="Close modal"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex flex-col gap-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Result</div>
                  <div
                    className="font-semibold uppercase"
                    style={{
                      color: selectedEvent.result === 'failure' ? 'var(--color-critical)' : 'var(--color-accent-2)',
                    }}
                  >
                    {selectedEvent.result}
                  </div>
                </div>

                <div className="p-2.5 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Windows Event ID</div>
                  <div className="text-ink-strong font-semibold">{selectedEvent.eventId}</div>
                </div>

                <div className="p-2.5 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Target Account</div>
                  <div className="text-ink-strong font-semibold">{selectedEvent.username}</div>
                </div>

                <div className="p-2.5 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Logon Type</div>
                  <div className="text-ink-strong">
                    {selectedEvent.logonType != null ? logonTypeLabel(selectedEvent.logonType) : 'N/A'}
                  </div>
                </div>

                <div className="p-2.5 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Source IP Address</div>
                  <div className="text-ink-strong">{selectedEvent.sourceIp || 'Local / None'}</div>
                </div>

                <div className="p-2.5 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Domain</div>
                  <div className="text-ink-strong">{selectedEvent.domain || 'WORKGROUP / Local'}</div>
                </div>

                <div className="p-2.5 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Workstation</div>
                  <div className="text-ink-strong">{selectedEvent.workstation || 'N/A'}</div>
                </div>

                <div className="p-2.5 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Timestamp</div>
                  <div className="text-ink-strong">{formatTimestamp(selectedEvent.timestamp)}</div>
                </div>
              </div>

              {selectedEvent.ruleId && (
                <div
                  className="p-2.5 border flex items-center justify-between"
                  style={{ background: '#251214', borderColor: '#5c2229' }}
                >
                  <span className="text-[11px] text-critical font-medium">
                    Triggered Custom Detection Rule {selectedEvent.ruleId} (Authentication Failure)
                  </span>
                  <span className="text-[10px] uppercase px-1.5 py-0.5 border border-critical/50 text-critical">
                    Correlated
                  </span>
                </div>
              )}

              {/* Raw JSON */}
              <JsonViewer
                data={selectedEvent.raw || selectedEvent}
                title={`Raw Windows Audit Record · ${selectedEvent.id}`}
                maxHeight="220px"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
