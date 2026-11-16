import { useMemo, useState } from 'react'
import {
  Eye,
  FileCode,
  FileSearch,
  FolderLock,
  HardDrive,
  Info,
  X,
} from 'lucide-react'
import {
  ConnectionPill,
  DataTable,
  EmptyState,
  FilterBar,
  JsonViewer,
  Pagination,
  TimeRangePicker,
} from '../components'
import { useApp } from '../hooks/useApp'
import { usePage } from '../hooks/usePage'
import { usePageTitle } from '../hooks/usePageTitle'
import { formatTimestamp } from '../utils/format'
import { filterFim, pageWindow, sortRows } from '../utils/records'

export default function FimPage() {
  usePageTitle('File Integrity Monitoring')
  const { dataset, timeRange, asOf, selectedEndpoint } = useApp()

  const isUnconnected = dataset.source === 'unconnected'

  // Filter state
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [endpointFilter, setEndpointFilter] = useState('all')

  // Sort state
  const [sort, setSort] = useState({ key: 'timestamp', direction: 'desc' })

  // Selected event for raw inspection drawer
  const [selectedEvent, setSelectedEvent] = useState(null)

  // Page state
  const filterKey = `${search}-${actionFilter}-${typeFilter}-${endpointFilter}-${timeRange}-${selectedEndpoint}`
  const [activePage, setActivePage] = usePage(filterKey)

  // Filtered FIM events
  const filteredEvents = useMemo(() => {
    return filterFim(dataset.fim, {
      range: timeRange,
      asOf,
      action: actionFilter,
      objectType: typeFilter,
      endpoint: endpointFilter,
      q: search,
    })
  }, [dataset.fim, timeRange, asOf, actionFilter, typeFilter, endpointFilter, search])

  const hasActiveFilters =
    search.trim().length > 0 || actionFilter !== 'all' || typeFilter !== 'all' || endpointFilter !== 'all'

  // Summary counts based on time window
  const inWindowAll = useMemo(() => {
    return filterFim(dataset.fim, {
      range: timeRange,
      asOf,
      action: 'all',
      endpoint: 'all',
      objectType: 'all',
      q: '',
    })
  }, [dataset.fim, timeRange, asOf])

  // Separate genuine file events from registry events
  const fileEventsInWindow = useMemo(() => {
    return inWindowAll.filter((e) => e.objectType === 'file')
  }, [inWindowAll])

  const registryEventsInWindow = useMemo(() => {
    return inWindowAll.filter((e) => e.objectType === 'registry')
  }, [inWindowAll])

  // Determine whether to use full API aggregated metrics or loaded window counts
  const useApiMetrics = Boolean(dataset.fimMetrics && !hasActiveFilters && dataset.source === 'live')
  const metricsSourceLabel = useApiMetrics
    ? 'Aggregated Total'
    : hasActiveFilters
      ? 'Filtered Subset'
      : 'Loaded Window'

  const totalCount = useApiMetrics
    ? (dataset.fimMetrics.total || dataset.fimTotal || inWindowAll.length)
    : inWindowAll.length

  // Ensure created, modified, and deleted file counts strictly exclude registry events
  const createdCount = useApiMetrics
    ? dataset.fimMetrics.file.created
    : fileEventsInWindow.filter((e) => e.action === 'created').length

  const modifiedCount = useApiMetrics
    ? dataset.fimMetrics.file.modified
    : fileEventsInWindow.filter((e) => e.action === 'modified').length

  const deletedCount = useApiMetrics
    ? dataset.fimMetrics.file.deleted
    : fileEventsInWindow.filter((e) => e.action === 'deleted').length

  const registryCount = useApiMetrics
    ? dataset.fimMetrics.registry.total
    : registryEventsInWindow.length

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
    const names = new Set(dataset.fim.map((f) => f.endpoint).filter(Boolean))
    return [
      { value: 'all', label: 'All Endpoints' },
      ...Array.from(names).map((name) => ({ value: name, label: name })),
    ]
  }, [dataset.fim])

  function handleResetFilters() {
    setSearch('')
    setActionFilter('all')
    setTypeFilter('all')
    setEndpointFilter('all')
    setActivePage(1)
  }

  // Table columns
  const columns = [
    {
      key: 'action',
      label: 'Action',
      width: '120px',
      sortable: true,
      render: (val, row) => {
        const isCreated = val === 'created'
        const isModified = val === 'modified'
        const isDeleted = val === 'deleted'
        const isRegistry = row.objectType === 'registry'

        return (
          <div className="flex flex-col gap-1 items-start">
            <span
              className="inline-flex items-center font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border"
              style={{
                background: isCreated ? '#102419' : isModified ? '#28200f' : isDeleted ? '#281114' : '#14171b',
                borderColor: isCreated ? '#234d35' : isModified ? '#5c481d' : isDeleted ? '#5c2229' : 'var(--color-line)',
                color: isCreated ? 'var(--color-accent-2)' : isModified ? '#ddb974' : isDeleted ? '#ea7a7a' : 'var(--color-faint)',
              }}
            >
              {val}
            </span>
            <span
              className="inline-flex items-center font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.2 border font-semibold"
              style={{
                background: isRegistry ? '#181624' : '#0e1f17',
                borderColor: isRegistry ? '#3f3a5a' : '#1e4832',
                color: isRegistry ? '#b8b2e8' : '#7edbb0',
              }}
            >
              {isRegistry ? 'REGISTRY' : 'FILE'}
            </span>
          </div>
        )
      },
    },
    {
      key: 'path',
      label: 'Monitored Path / Object',
      sortable: true,
      render: (val, row) => {
        const isRegistry = row.objectType === 'registry'

        return (
          <div
            className="cursor-pointer group flex flex-col font-mono text-xs"
            onClick={() => setSelectedEvent(row)}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="text-[9px] font-mono px-1 py-0.2 border uppercase tracking-wider font-semibold shrink-0"
                style={{
                  background: isRegistry ? '#181624' : '#0e1f17',
                  borderColor: isRegistry ? '#3f3a5a' : '#1e4832',
                  color: isRegistry ? '#b8b2e8' : '#7edbb0',
                }}
              >
                {isRegistry ? 'REG' : 'FILE'}
              </span>
              <span
                className="font-medium text-ink-strong group-hover:underline truncate max-w-xl"
                style={{ color: 'var(--color-ink-strong)' }}
                title={val}
              >
                {val}
              </span>
            </div>
            {row.checksum && (
              <span className="text-[10px] text-faint truncate max-w-md font-mono mt-0.5" title={row.checksum}>
                SHA256: {row.checksum}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'endpoint',
      label: 'Endpoint',
      width: '130px',
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
      key: 'user',
      label: 'User / Identity',
      width: '120px',
      mono: true,
      render: (val) => (
        <span style={{ color: val ? 'var(--color-ink-strong)' : 'var(--color-faint)' }}>
          {val || '—'}
        </span>
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
            <FileSearch size={17} style={{ color: 'var(--color-accent)' }} />
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
              File Integrity Monitoring (FIM)
            </h1>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 border uppercase"
              style={{
                background: 'var(--color-panel-2)',
                borderColor: 'var(--color-line)',
                color: 'var(--color-faint)',
              }}
            >
              Syscheck Telemetry
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: 0 }}>
            Real-time file change auditing, hash modifications, and file creations across monitored directories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ConnectionPill showDetail />
        </div>
      </div>

      {/* ── Lab Target Configuration Notice ── */}
      <div
        className="mb-5 p-3 border flex items-start gap-2.5 text-xs"
        style={{
          background: 'var(--color-panel)',
          borderColor: 'var(--color-line)',
          color: 'var(--color-faint)',
          lineHeight: 1.5,
        }}
      >
        <FolderLock size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
        <div className="flex-1">
          <strong style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
            LAB TESTED TARGET DIRECTORY:
          </strong>{' '}
          Wazuh syscheck monitoring in our lab configuration audits <code className="text-ink-strong font-mono px-1 py-0.2 border bg-panel-2 border-line">C:\GuardX-Test</code> on Windows agent JARVIS. No other synthetic directories are fabricated.
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
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
              Total FIM Events
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: 'var(--color-ink-strong)' }}>
              {totalCount}
            </div>
            <div className="text-[9px] font-mono text-faint mt-0.5" style={{ color: 'var(--color-faint)' }}>
              {metricsSourceLabel}
            </div>
          </div>
          <HardDrive size={18} style={{ color: 'var(--color-accent)' }} />
        </div>

        <div
          className="p-3 border flex items-center justify-between"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
            borderLeft: '3px solid var(--color-accent-2)',
          }}
        >
          <div>
            <div className="text-[10px] font-mono uppercase text-faint" style={{ color: 'var(--color-accent-2)' }}>
              Files Created
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: '#b7dcc8' }}>
              {createdCount}
            </div>
            <div className="text-[9px] font-mono text-faint mt-0.5" style={{ color: 'var(--color-faint)' }}>
              Excludes registry
            </div>
          </div>
          <FileCode size={18} style={{ color: 'var(--color-accent-2)' }} />
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
              Files Modified
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: '#ddb974' }}>
              {modifiedCount}
            </div>
            <div className="text-[9px] font-mono text-faint mt-0.5" style={{ color: 'var(--color-faint)' }}>
              Excludes registry
            </div>
          </div>
          <FileSearch size={18} style={{ color: 'var(--color-medium)' }} />
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
              Files Deleted
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: '#ea7a7a' }}>
              {deletedCount}
            </div>
            <div className="text-[9px] font-mono text-faint mt-0.5" style={{ color: 'var(--color-faint)' }}>
              Excludes registry
            </div>
          </div>
          <Info size={18} style={{ color: 'var(--color-critical)' }} />
        </div>

        <div
          className="p-3 border flex items-center justify-between"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
            borderLeft: '3px solid #8e88c7',
          }}
        >
          <div>
            <div className="text-[10px] font-mono uppercase text-faint" style={{ color: '#b8b2e8' }}>
              Registry Events
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: '#cfcaf0' }}>
              {registryCount}
            </div>
            <div className="text-[9px] font-mono text-faint mt-0.5" style={{ color: 'var(--color-faint)' }}>
              HKEY_* auditing
            </div>
          </div>
          <FolderLock size={18} style={{ color: '#8e88c7' }} />
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by file path, user, agent, or SHA256 checksum..."
        filters={[
          {
            id: 'action',
            label: 'Action',
            value: actionFilter,
            onChange: setActionFilter,
            options: [
              { value: 'all', label: 'All Actions' },
              { value: 'created', label: 'Created' },
              { value: 'modified', label: 'Modified' },
              { value: 'deleted', label: 'Deleted' },
            ],
          },
          {
            id: 'objectType',
            label: 'Type',
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { value: 'all', label: 'All Types' },
              { value: 'file', label: 'Files Only' },
              { value: 'registry', label: 'Registry Only' },
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
                  ? 'No FIM Telemetry in Unconnected Mode'
                  : hasActiveFilters
                    ? 'No FIM Events Match Active Filters'
                    : 'No File Integrity Events Recorded'
              }
              description={
                isUnconnected
                  ? 'In unconnected mode, live syscheck file monitoring is not collected from the endpoint. Connect the backend API or enable demonstration data in Settings.'
                  : hasActiveFilters
                    ? 'Clear active filters to see all recorded file changes.'
                    : 'No file modification, creation, or deletion events occurred within the selected time window.'
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

      {/* ── Inspection Drawer / Modal ── */}
      {selectedEvent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="fim-drawer-title"
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
                <FileSearch size={15} style={{ color: 'var(--color-accent)' }} />
                <span
                  id="fim-drawer-title"
                  className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-strong flex items-center gap-2"
                >
                  <span>{selectedEvent.objectType === 'registry' ? 'Registry Event Details' : 'File Integrity Event Details'} · {selectedEvent.id}</span>
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.2 border uppercase tracking-wider font-semibold"
                    style={{
                      background: selectedEvent.objectType === 'registry' ? '#181624' : '#0e1f17',
                      borderColor: selectedEvent.objectType === 'registry' ? '#3f3a5a' : '#1e4832',
                      color: selectedEvent.objectType === 'registry' ? '#b8b2e8' : '#7edbb0',
                    }}
                  >
                    {selectedEvent.objectType === 'registry' ? 'REGISTRY' : 'FILE'}
                  </span>
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
                  <div className="text-[10px] uppercase text-faint mb-0.5">Action</div>
                  <div className="font-semibold uppercase" style={{ color: 'var(--color-accent-2)' }}>
                    {selectedEvent.action}
                  </div>
                </div>

                <div className="p-2.5 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Timestamp</div>
                  <div className="text-ink-strong">{formatTimestamp(selectedEvent.timestamp)}</div>
                </div>

                <div className="p-2.5 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Endpoint</div>
                  <div className="text-ink-strong">{selectedEvent.endpoint} ({selectedEvent.agentId || '002'})</div>
                </div>

                <div className="p-2.5 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Associated User</div>
                  <div className="text-ink-strong">{selectedEvent.user || 'SYSTEM / Unattributed'}</div>
                </div>
              </div>

              <div className="p-2.5 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                <div className="text-[10px] uppercase text-faint mb-1">
                  Target {selectedEvent.objectType === 'registry' ? 'Registry Key' : 'File Path'}
                </div>
                <div className="text-ink-strong text-xs break-all">{selectedEvent.path}</div>
              </div>

              {selectedEvent.checksum && (
                <div className="p-2.5 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-1">SHA256 Digest</div>
                  <div className="text-faint text-[11px] break-all">{selectedEvent.checksum}</div>
                </div>
              )}

              {/* Raw JSON */}
              <JsonViewer
                data={selectedEvent.raw || selectedEvent}
                title={`Raw Syscheck Event · ${selectedEvent.id}`}
                maxHeight="220px"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
