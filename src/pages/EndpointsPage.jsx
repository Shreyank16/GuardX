import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ExternalLink,
  Info,
  Monitor,
  Server,
  ShieldAlert,
} from 'lucide-react'
import {
  ConnectionPill,
  DataTable,
  EmptyState,
  FilterBar,
  Pagination,
  StatusDot,
} from '../components'
import { useApp } from '../hooks/useApp'
import { usePage } from '../hooks/usePage'
import { usePageTitle } from '../hooks/usePageTitle'
import { formatTimestamp, statusLabel } from '../utils/format'
import { pageWindow, sortRows } from '../utils/records'

export default function EndpointsPage() {
  usePageTitle('Endpoint Inventory')
  const navigate = useNavigate()
  const { dataset, selectedEndpoint, setSelectedEndpoint } = useApp()

  const isLive = dataset.source === 'live'

  // Search and filter states
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [osFilter, setOsFilter] = useState('all')

  // Sorting
  const [sort, setSort] = useState({ key: 'agentId', direction: 'asc' })

  // Page tracking
  const filterKey = `${search}-${statusFilter}-${osFilter}-${selectedEndpoint}`
  const [activePage, setActivePage] = usePage(filterKey)

  // Filtered endpoints
  const filteredEndpoints = useMemo(() => {
    return dataset.endpoints.filter((ep) => {
      // OS filter
      if (osFilter !== 'all' && ep.os !== osFilter) return false

      // Status filter
      if (statusFilter !== 'all' && ep.status !== statusFilter) return false

      // Text search
      if (search.trim()) {
        const query = search.toLowerCase().trim()
        const match =
          ep.name?.toLowerCase().includes(query) ||
          ep.agentId?.toLowerCase().includes(query) ||
          ep.id?.toLowerCase().includes(query) ||
          ep.os?.toLowerCase().includes(query) ||
          ep.version?.toLowerCase().includes(query) ||
          ep.ip?.toLowerCase().includes(query)
        if (!match) return false
      }

      return true
    })
  }, [dataset.endpoints, search, statusFilter, osFilter])

  // Sorting and pagination
  const sortedEndpoints = useMemo(() => {
    return sortRows(filteredEndpoints, sort)
  }, [filteredEndpoints, sort])

  const pageSize = 10
  const windowData = pageWindow(sortedEndpoints.length, activePage, pageSize)
  const paginatedEndpoints = useMemo(() => {
    return sortedEndpoints.slice(windowData.start, windowData.end)
  }, [sortedEndpoints, windowData.start, windowData.end])

  // Distinct OS options for filter
  const osOptions = useMemo(() => {
    const list = new Set(dataset.endpoints.map((e) => e.os).filter(Boolean))
    return [
      { value: 'all', label: 'All Operating Systems' },
      ...Array.from(list).map((os) => ({ value: os, label: os })),
    ]
  }, [dataset.endpoints])

  const hasActiveFilters =
    search.trim().length > 0 || statusFilter !== 'all' || osFilter !== 'all'

  function handleResetFilters() {
    setSearch('')
    setStatusFilter('all')
    setOsFilter('all')
    setActivePage(1)
  }

  // Summary counts
  const totalCount = dataset.endpoints.length
  const unverifiedCount = dataset.endpoints.filter((e) => e.status === 'unverified').length
  const connectedCount = dataset.endpoints.filter((e) => e.status === 'online' || e.status === 'connected').length
  const disconnectedCount = dataset.endpoints.filter((e) => e.status === 'offline' || e.status === 'disconnected').length

  // Table Columns
  const columns = [
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      sortable: true,
      render: (val) => {
        const isOnline = val === 'online' || val === 'connected'
        const isOffline = val === 'offline' || val === 'disconnected'
        return (
          <span
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border"
            style={{
              background: isOnline ? 'var(--color-accent-soft)' : isOffline ? '#220f12' : '#171a1f',
              borderColor: isOnline ? 'var(--color-accent)' : isOffline ? '#521f26' : 'var(--color-line)',
              color: isOnline ? 'var(--color-accent-2)' : isOffline ? 'var(--color-critical)' : 'var(--color-warn)',
            }}
          >
            <StatusDot state={val} size={6} />
            <span>{statusLabel(val)}</span>
          </span>
        )
      },
    },
    {
      key: 'agentId',
      label: 'Agent ID',
      width: '100px',
      mono: true,
      sortable: true,
      render: (val) => val || '—',
    },
    {
      key: 'name',
      label: 'Agent Name',
      width: '160px',
      sortable: true,
      render: (val, row) => (
        <div
          className="cursor-pointer group flex items-center gap-1.5"
          onClick={() => navigate(`/endpoints/${row.agentId || row.id}`)}
        >
          <span
            className="font-mono font-semibold text-xs text-ink-strong group-hover:underline"
            style={{ color: 'var(--color-ink-strong)' }}
          >
            {val}
          </span>
          <ExternalLink size={10} className="text-faint opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ),
    },
    {
      key: 'os',
      label: 'Operating System',
      width: '160px',
      sortable: true,
      render: (val) => (
        <span className="font-mono text-xs text-ink">{val || '—'}</span>
      ),
    },
    {
      key: 'version',
      label: 'Agent Version',
      width: '120px',
      mono: true,
      sortable: true,
      render: (val) => val || '—',
    },
    {
      key: 'ip',
      label: 'IP Address',
      width: '130px',
      mono: true,
      render: (val) => val || <span className="text-faint">Not reported</span>,
    },
    {
      key: 'groups',
      label: 'Groups',
      width: '130px',
      render: (val) =>
        Array.isArray(val) && val.length > 0 ? (
          <span className="font-mono text-xs text-ink">{val.join(', ')}</span>
        ) : (
          <span className="font-mono text-xs text-faint">default</span>
        ),
    },
    {
      key: 'lastKeepAlive',
      label: 'Last Keepalive',
      width: '160px',
      mono: true,
      render: (val) =>
        val ? (
          formatTimestamp(val)
        ) : (
          <span className="text-faint">No keepalive</span>
        ),
    },
    {
      key: 'actions',
      label: '',
      width: '80px',
      render: (_, row) => (
        <button
          type="button"
          onClick={() => navigate(`/endpoints/${row.agentId || row.id}`)}
          className="gx-btn"
          style={{ height: '22px', fontSize: '10px', padding: '0 6px' }}
        >
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
            <Monitor size={17} style={{ color: 'var(--color-accent)' }} />
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
              Endpoint Inventory
            </h1>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 border uppercase"
              style={{
                background: 'var(--color-panel-2)',
                borderColor: 'var(--color-line)',
                color: 'var(--color-faint)',
              }}
            >
              {dataset.endpoints.length} Registered Agent{dataset.endpoints.length === 1 ? '' : 's'}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: 0 }}>
            Registered endpoint inventory, operating systems, and agent telemetry agents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ConnectionPill showDetail />
        </div>
      </div>

      {/* ── Active Endpoint Isolation Notice ── */}
      {selectedEndpoint !== 'all' && (
        <div
          className="mb-5 p-3 border flex items-center justify-between font-mono text-xs"
          style={{
            background: 'var(--color-panel-2)',
            borderColor: 'var(--color-accent)',
            borderLeftWidth: '3px',
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--color-accent-2)', fontWeight: 600 }}>ISOLATION ACTIVE:</span>
            <span style={{ color: 'var(--color-ink-strong)' }}>
              Viewing single endpoint inventory for{' '}
              <strong>{dataset.endpoints[0]?.name || selectedEndpoint}</strong> (Agent ID: {selectedEndpoint}).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedEndpoint('all')}
            className="text-accent hover:underline flex items-center gap-1 cursor-pointer font-semibold"
            style={{ color: 'var(--color-accent-2)' }}
          >
            <span>Show All Endpoints ({dataset.allEndpoints?.length || 0})</span>
          </button>
        </div>
      )}

      {/* ── Data Integrity Callout ── */}
      <div
        className="mb-5 p-3 border flex items-start gap-2.5 text-xs"
        style={{
          background: 'var(--color-panel)',
          borderColor: 'var(--color-line)',
          color: 'var(--color-faint)',
          lineHeight: 1.5,
        }}
      >
        <Info size={15} className="shrink-0 mt-0.5 text-faint" />
        <div className="flex-1">
          <strong style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
            ENDPOINT VERIFICATION POLICY:
          </strong>{' '}
          {isLive ? (
            <span>
              Live backend connection confirmed. Endpoint registration, IP, and keepalives are synchronized with the Wazuh manager.
            </span>
          ) : (
            <span>
              Operating with documented catalog inventory. Known endpoint <strong>JARVIS (Agent ID 002)</strong> is documented in the environment catalog. Status is marked <strong>Unverified</strong> and dynamic telemetry (IP address, assigned groups, keepalive heartbeats) is withheld until confirmed by the live Wazuh manager API.
            </span>
          )}
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
              Total Endpoints
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: 'var(--color-ink-strong)' }}>
              {totalCount}
            </div>
          </div>
          <Server size={18} style={{ color: 'var(--color-accent)' }} />
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
              Unverified State
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: '#ddb974' }}>
              {unverifiedCount}
            </div>
          </div>
          <StatusDot tone="warn" size={8} />
        </div>

        <div
          className="p-3 border flex items-center justify-between"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
            borderLeft: '3px solid #3e8f64',
          }}
        >
          <div>
            <div className="text-[10px] font-mono uppercase text-faint" style={{ color: 'var(--color-accent-2)' }}>
              Live Connected
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: '#b7dcc8' }}>
              {connectedCount}
            </div>
          </div>
          <StatusDot tone="ok" size={8} />
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
              Disconnected / Offline
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: '#ea7a7a' }}>
              {disconnectedCount}
            </div>
          </div>
          <ShieldAlert size={18} style={{ color: 'var(--color-critical)' }} />
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter by name, agent ID, OS, or version..."
        filters={[
          {
            id: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'all', label: 'All Statuses' },
              { value: 'unverified', label: 'Unverified' },
              { value: 'online', label: 'Connected / Online' },
              { value: 'offline', label: 'Disconnected / Offline' },
            ],
          },
          {
            id: 'os',
            label: 'OS',
            value: osFilter,
            onChange: setOsFilter,
            options: osOptions,
          },
        ]}
        hasActiveFilters={hasActiveFilters}
        onReset={handleResetFilters}
      />

      {/* ── DataTable ── */}
      <div
        className="border flex flex-col"
        style={{
          background: 'var(--color-panel)',
          borderColor: 'var(--color-line)',
        }}
      >
        <DataTable
          columns={columns}
          data={paginatedEndpoints}
          sort={sort}
          onSort={setSort}
          keyField="id"
          emptyState={
            <EmptyState
              compact
              title="No Endpoints Found"
              description="No registered agents match the current search or filter criteria."
            />
          }
        />

        {filteredEndpoints.length > 0 && (
          <Pagination
            total={filteredEndpoints.length}
            page={activePage}
            pageSize={pageSize}
            onPageChange={setActivePage}
          />
        )}
      </div>
    </div>
  )
}
