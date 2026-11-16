import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import {
  Badge,
  ConnectionPill,
  DataTable,
  EmptyState,
  FilterBar,
  Pagination,
  StatusDot,
  TimeRangePicker,
} from '../components'
import { useApp } from '../hooks/useApp'
import { usePage } from '../hooks/usePage'
import { usePageTitle } from '../hooks/usePageTitle'
import { formatTimestamp, statusLabel } from '../utils/format'
import {
  countSeverities,
  filterAlerts,
  pageWindow,
  sortRows,
} from '../utils/records'

export default function AlertsPage() {
  usePageTitle('Security Alerts')
  const navigate = useNavigate()
  const { dataset, timeRange, asOf, selectedEndpoint } = useApp()

  const isUnconnected = dataset.source === 'unconnected'

  // Filter state
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [endpointFilter, setEndpointFilter] = useState('all')
  const [ruleFilter, setRuleFilter] = useState('all')

  // Sort state
  const [sort, setSort] = useState({ key: 'timestamp', direction: 'desc' })

  // Page state reset on filter change
  const filterKey = `${search}-${severityFilter}-${statusFilter}-${endpointFilter}-${ruleFilter}-${timeRange}-${selectedEndpoint}`
  const [activePage, setActivePage] = usePage(filterKey)

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return filterAlerts(dataset.alerts, {
      range: timeRange,
      asOf,
      severity: severityFilter,
      status: statusFilter,
      endpoint: endpointFilter,
      ruleId: ruleFilter,
      q: search,
    })
  }, [dataset.alerts, timeRange, asOf, severityFilter, statusFilter, endpointFilter, ruleFilter, search])

  // Total severity counts across time window (unfiltered by category dropdowns)
  const severityMetrics = useMemo(() => {
    const inTimeWindow = filterAlerts(dataset.alerts, {
      range: timeRange,
      asOf,
      severity: 'all',
      status: 'all',
      endpoint: 'all',
      ruleId: 'all',
      q: '',
    })
    return countSeverities(inTimeWindow)
  }, [dataset.alerts, timeRange, asOf])

  // Sorted and paginated data
  const sortedAlerts = useMemo(() => {
    return sortRows(filteredAlerts, sort)
  }, [filteredAlerts, sort])

  const pageSize = 15
  const windowData = pageWindow(sortedAlerts.length, activePage, pageSize)
  const paginatedAlerts = useMemo(() => {
    return sortedAlerts.slice(windowData.start, windowData.end)
  }, [sortedAlerts, windowData.start, windowData.end])

  // Dynamic filter dropdown options
  const endpointOptions = useMemo(() => {
    const names = new Set(dataset.alerts.map((a) => a.endpoint).filter(Boolean))
    return [
      { value: 'all', label: 'All Endpoints' },
      ...Array.from(names).map((name) => ({ value: name, label: name })),
    ]
  }, [dataset.alerts])

  const ruleOptions = useMemo(() => {
    const rules = new Set(dataset.alerts.map((a) => a.ruleId).filter(Boolean))
    return [
      { value: 'all', label: 'All Rules' },
      ...Array.from(rules).map((id) => ({ value: id, label: `Rule ${id}` })),
    ]
  }, [dataset.alerts])

  const hasActiveFilters =
    search.trim().length > 0 ||
    severityFilter !== 'all' ||
    statusFilter !== 'all' ||
    endpointFilter !== 'all' ||
    ruleFilter !== 'all'

  function handleResetFilters() {
    setSearch('')
    setSeverityFilter('all')
    setStatusFilter('all')
    setEndpointFilter('all')
    setRuleFilter('all')
    setActivePage(1)
  }

  // Table columns definition
  const columns = [
    {
      key: 'severity',
      label: 'Severity',
      width: '130px',
      sortable: true,
      render: (val, row) => (
        <Badge severity={val} level={row.level} showDot showLevel />
      ),
    },
    {
      key: 'ruleId',
      label: 'Rule ID',
      width: '100px',
      mono: true,
      sortable: true,
      render: (val) => val || '—',
    },
    {
      key: 'description',
      label: 'Description',
      render: (val, row) => (
        <div
          className="cursor-pointer group flex flex-col"
          onClick={() => navigate(`/alerts/${row.id}`)}
        >
          <span
            className="font-medium group-hover:underline text-ink-strong"
            style={{ color: 'var(--color-ink-strong)' }}
          >
            {val}
          </span>
          <span
            className="text-[10px] font-mono text-faint"
            style={{ color: 'var(--color-faint)' }}
          >
            ID: {row.id}
          </span>
        </div>
      ),
    },
    {
      key: 'endpoint',
      label: 'Agent / Endpoint',
      width: '150px',
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
      key: 'username',
      label: 'Source / User',
      width: '140px',
      render: (val, row) => (
        <div className="flex flex-col font-mono text-[11px]">
          <span style={{ color: val ? 'var(--color-ink-strong)' : 'var(--color-faint)' }}>
            {val || '—'}
          </span>
          {row.sourceIp && (
            <span style={{ color: 'var(--color-faint)', fontSize: '10px' }}>
              {row.sourceIp}
            </span>
          )}
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
      key: 'status',
      label: 'Status',
      width: '110px',
      sortable: true,
      render: (val) => {
        const isOpen = val === 'open'
        const isReview = val === 'in_review'
        return (
          <span
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 border"
            style={{
              background: isOpen ? '#251214' : isReview ? '#241a0d' : '#14171b',
              borderColor: isOpen ? '#522026' : isReview ? '#4a3518' : 'var(--color-line)',
              color: isOpen ? 'var(--color-critical)' : isReview ? 'var(--color-warn)' : 'var(--color-faint)',
            }}
          >
            <StatusDot
              tone={isOpen ? 'bad' : isReview ? 'warn' : 'idle'}
              size={5}
            />
            <span>{statusLabel(val)}</span>
          </span>
        )
      },
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
            <AlertTriangle size={17} style={{ color: 'var(--color-accent)' }} />
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
              Security Alert Queue
            </h1>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 border uppercase"
              style={{
                background: 'var(--color-panel-2)',
                borderColor: 'var(--color-line)',
                color: 'var(--color-faint)',
              }}
            >
              {filteredAlerts.length} Active in view
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: 0 }}>
            Triaged security events matched against Wazuh rules and endpoint audit telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ConnectionPill showDetail />
        </div>
      </div>

      {/* ── Severity Metric Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
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
              Critical
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: '#ea7a7a' }}>
              {severityMetrics.critical}
            </div>
          </div>
          <StatusDot tone="bad" size={8} />
        </div>

        <div
          className="p-3 border flex items-center justify-between"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
            borderLeft: '3px solid var(--color-high)',
          }}
        >
          <div>
            <div className="text-[10px] font-mono uppercase text-faint" style={{ color: 'var(--color-high)' }}>
              High
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: '#e89e5a' }}>
              {severityMetrics.high}
            </div>
          </div>
          <StatusDot tone="warn" size={8} />
        </div>

        <div
          className="p-3 border flex items-center justify-between"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
            borderLeft: '3px solid var(--color-medium)',
          }}
        >
          <div>
            <div className="text-[10px] font-mono uppercase text-faint" style={{ color: 'var(--color-medium)' }}>
              Medium
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: '#ddb974' }}>
              {severityMetrics.medium}
            </div>
          </div>
          <StatusDot tone="idle" size={8} />
        </div>

        <div
          className="p-3 border flex items-center justify-between"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
            borderLeft: '3px solid var(--color-low)',
          }}
        >
          <div>
            <div className="text-[10px] font-mono uppercase text-faint" style={{ color: 'var(--color-low)' }}>
              Low / Info
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: 'var(--color-ink-strong)' }}>
              {severityMetrics.low + severityMetrics.informational}
            </div>
          </div>
          <StatusDot tone="idle" size={8} />
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search alerts by ID, rule, user, IP, or summary..."
        filters={[
          {
            id: 'severity',
            label: 'Severity',
            value: severityFilter,
            onChange: setSeverityFilter,
            options: [
              { value: 'all', label: 'All Severities' },
              { value: 'critical', label: 'Critical' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ],
          },
          {
            id: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'all', label: 'All Statuses' },
              { value: 'open', label: 'Open' },
              { value: 'in_review', label: 'In Review' },
              { value: 'closed', label: 'Closed' },
            ],
          },
          {
            id: 'endpoint',
            label: 'Endpoint',
            value: endpointFilter,
            onChange: setEndpointFilter,
            options: endpointOptions,
          },
          {
            id: 'rule',
            label: 'Rule',
            value: ruleFilter,
            onChange: setRuleFilter,
            options: ruleOptions,
          },
        ]}
        hasActiveFilters={hasActiveFilters}
        onReset={handleResetFilters}
      >
        <TimeRangePicker />
      </FilterBar>

      {/* ── Alerts Table ── */}
      <div
        className="border flex flex-col"
        style={{
          background: 'var(--color-panel)',
          borderColor: 'var(--color-line)',
        }}
      >
        <DataTable
          columns={columns}
          data={paginatedAlerts}
          sort={sort}
          onSort={setSort}
          keyField="id"
          emptyState={
            <EmptyState
              compact
              title={
                isUnconnected
                  ? 'No Alerts in Unconnected Mode'
                  : hasActiveFilters
                    ? 'No Alerts Match Active Filters'
                    : 'Alert Queue Empty'
              }
              description={
                isUnconnected
                  ? 'In default unconnected mode, no live alerts are pulled from the Wazuh manager, and synthetic records are not fabricated. Connect a live backend API or enable demonstration data in Settings.'
                  : hasActiveFilters
                    ? 'Try broadening your search term or clearing filter criteria to see matching alerts.'
                    : 'No security detections were recorded within the selected time range.'
              }
            />
          }
        />

        {filteredAlerts.length > 0 && (
          <Pagination
            total={filteredAlerts.length}
            page={activePage}
            pageSize={pageSize}
            onPageChange={setActivePage}
          />
        )}
      </div>
    </div>
  )
}
