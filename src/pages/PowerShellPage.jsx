import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Code2,
  Copy,
  ScrollText,
  Terminal,
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
import { filterPowerShell, pageWindow, sortRows } from '../utils/records'

export default function PowerShellPage() {
  usePageTitle('PowerShell Monitoring')
  const { dataset, timeRange, asOf, selectedEndpoint } = useApp()

  const isUnconnected = dataset.source === 'unconnected'

  // Filter states
  const [search, setSearch] = useState('')
  const [classificationFilter, setClassificationFilter] = useState('all')
  const [endpointFilter, setEndpointFilter] = useState('all')

  // Sorting
  const [sort, setSort] = useState({ key: 'timestamp', direction: 'desc' })

  // Selected event for raw script block inspection
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [copiedScript, setCopiedScript] = useState(false)

  // Page tracking
  const filterKey = `${search}-${classificationFilter}-${endpointFilter}-${timeRange}-${selectedEndpoint}`
  const [activePage, setActivePage] = usePage(filterKey)

  // Filtered events
  const filteredEvents = useMemo(() => {
    return filterPowerShell(dataset.powershell, {
      range: timeRange,
      asOf,
      classification: classificationFilter,
      endpoint: endpointFilter,
      q: search,
    })
  }, [dataset.powershell, timeRange, asOf, classificationFilter, endpointFilter, search])

  // Summary counts based on time window
  const inWindowAll = useMemo(() => {
    return filterPowerShell(dataset.powershell, {
      range: timeRange,
      asOf,
      classification: 'all',
      endpoint: 'all',
      q: '',
    })
  }, [dataset.powershell, timeRange, asOf])

  const hasActiveFilters =
    search.trim().length > 0 ||
    classificationFilter !== 'all' ||
    endpointFilter !== 'all'

  // Determine whether to use full API aggregated metrics or loaded window counts
  const useApiMetrics = Boolean(dataset.powershellMetrics && !hasActiveFilters && dataset.source === 'live')
  const metricsSourceLabel = useApiMetrics
    ? 'Aggregated Total'
    : hasActiveFilters
      ? 'Filtered Subset'
      : 'Loaded Window'

  const totalCount = useApiMetrics
    ? (dataset.powershellMetrics.total || dataset.powershellTotal || inWindowAll.length)
    : inWindowAll.length
  const monitoredCount = useApiMetrics
    ? (dataset.powershellMetrics.monitored ?? inWindowAll.filter((p) => p.classification === 'monitored' || !p.ruleId).length)
    : inWindowAll.filter((p) => p.classification === 'monitored' || !p.ruleId).length
  const ruleMatchCount = useApiMetrics
    ? (dataset.powershellMetrics.ruleMatch ?? inWindowAll.filter((p) => p.ruleId != null).length)
    : inWindowAll.filter((p) => p.ruleId != null).length

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
    const names = new Set(dataset.powershell.map((p) => p.endpoint).filter(Boolean))
    return [
      { value: 'all', label: 'All Endpoints' },
      ...Array.from(names).map((name) => ({ value: name, label: name })),
    ]
  }, [dataset.powershell])

  function handleResetFilters() {
    setSearch('')
    setClassificationFilter('all')
    setEndpointFilter('all')
    setActivePage(1)
  }

  async function copyScriptText(text) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedScript(true)
      setTimeout(() => setCopiedScript(false), 2000)
    } catch {
      // Fallback
      setCopiedScript(false)
    }
  }

  // Table columns
  const columns = [
    {
      key: 'classification',
      label: 'Telemetry Type',
      width: '140px',
      sortable: true,
      render: (val, row) => {
        const isRuleMatch = Boolean(row.ruleId)
        return (
          <span
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border"
            style={{
              background: isRuleMatch ? '#28200f' : '#14171b',
              borderColor: isRuleMatch ? '#5c481d' : 'var(--color-line)',
              color: isRuleMatch ? '#ddb974' : 'var(--color-faint)',
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: isRuleMatch ? 'var(--color-warn)' : 'var(--color-faint)',
              }}
            />
            <span>{isRuleMatch ? `Rule ${row.ruleId}` : 'Monitored'}</span>
          </span>
        )
      },
    },
    {
      key: 'eventId',
      label: 'Event ID',
      width: '90px',
      mono: true,
      sortable: true,
      render: (val, row) => <span style={{ color: 'var(--color-accent-2)' }}>{val || row.eventId || '—'}</span>,
    },
    {
      key: 'scriptBlock',
      label: 'Script Block Content (Preview)',
      render: (val, row) => (
        <div
          className="cursor-pointer group flex flex-col font-mono text-xs max-w-xl"
          onClick={() => setSelectedEvent(row)}
        >
          <code
            className="truncate block text-ink-strong group-hover:underline"
            style={{ color: 'var(--color-ink-strong)' }}
            title={val}
          >
            {val ? val.split('\n')[0] : '—'}
          </code>
          {val && val.includes('\n') && (
            <span className="text-[10px] text-faint">
              + {val.split('\n').length - 1} more line{val.split('\n').length > 2 ? 's' : ''}
            </span>
          )}
        </div>
      ),
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
      width: '100px',
      render: (_, row) => (
        <button
          type="button"
          onClick={() => setSelectedEvent(row)}
          className="gx-btn"
          style={{ height: '22px', fontSize: '10px', padding: '0 6px' }}
        >
          <Code2 size={10} aria-hidden="true" />
          <span>View Script</span>
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
            <Terminal size={17} style={{ color: 'var(--color-accent)' }} />
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
              PowerShell Script Block Monitoring
            </h1>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 border uppercase"
              style={{
                background: 'var(--color-panel-2)',
                borderColor: 'var(--color-line)',
                color: 'var(--color-faint)',
              }}
            >
              Event ID 4104
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: 0 }}>
            Operational Script Block Logging alert telemetry ingested from Windows endpoint JARVIS via Wazuh rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ConnectionPill showDetail />
        </div>
      </div>

      {/* ── CRITICAL DETECTION RULE INTEGRITY CALLOUT ── */}
      <div
        className="mb-5 p-3.5 border flex items-start gap-3 text-xs"
        style={{
          background: 'var(--color-panel)',
          borderColor: 'var(--color-line)',
          borderLeft: '4px solid var(--color-warn)',
          color: 'var(--color-ink)',
          lineHeight: 1.5,
        }}
      >
        <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--color-warn)' }} />
        <div className="flex-1">
          <div className="font-mono text-[11px] font-semibold uppercase text-warn mb-1" style={{ color: 'var(--color-warn)' }}>
            PowerShell Alert Telemetry Scope &amp; Archives Policy
          </div>
          <p className="m-0 mb-1.5 text-muted" style={{ color: 'var(--color-muted)' }}>
            Telemetry displayed is alert-backed PowerShell execution stored in <code>wazuh-alerts-4.x-*</code>. Storing non-alerted routine script blocks requires Wazuh archives indexing (<code>wazuh-archives-*</code>), which is currently inactive. All ingested script blocks correspond to matched detection rules (e.g. 91816, 91820, 91819).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t font-mono text-[11px]" style={{ borderColor: 'var(--color-line)' }}>
            <div>
              <span className="text-faint">ACTIVE ALERT RULES:</span>{' '}
              <strong style={{ color: 'var(--color-accent-2)' }}>Rules 91816, 91820, 91819, 91815, 91809</strong>
            </div>
            <div>
              <span className="text-faint">UNALERTED ARCHIVE INGESTION:</span>{' '}
              <strong style={{ color: 'var(--color-warn)' }}>Inactive (No wazuh-archives-* index)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary Metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
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
              Total Script Block Alerts
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: 'var(--color-ink-strong)' }}>
              {totalCount}
            </div>
            <div className="text-[9px] font-mono text-faint mt-0.5" style={{ color: 'var(--color-faint)' }}>
              {metricsSourceLabel}
            </div>
          </div>
          <Terminal size={18} style={{ color: 'var(--color-accent)' }} />
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
              Monitored (Requires Archives)
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: '#8fb4d4' }}>
              {monitoredCount}
            </div>
            <div className="text-[9px] font-mono text-faint mt-0.5" style={{ color: 'var(--color-faint)' }}>
              {metricsSourceLabel}
            </div>
          </div>
          <Code2 size={18} style={{ color: 'var(--color-low)' }} />
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
              Detection Rule Matches
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: '#ddb974' }}>
              {ruleMatchCount}
            </div>
            <div className="text-[9px] font-mono text-faint mt-0.5" style={{ color: 'var(--color-faint)' }}>
              {metricsSourceLabel}
            </div>
          </div>
          <ScrollText size={18} style={{ color: 'var(--color-warn)' }} />
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search script code, commands, cmdlets, or rule ID..."
        filters={[
          {
            id: 'classification',
            label: 'Type',
            value: classificationFilter,
            onChange: setClassificationFilter,
            options: [
              { value: 'all', label: 'All Telemetry' },
              { value: 'monitored', label: 'Monitored Only' },
              { value: 'rule-match', label: 'Rule Matches' },
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
                  ? 'No PowerShell Telemetry in Unconnected Mode'
                  : hasActiveFilters
                    ? 'No Script Blocks Match Active Filters'
                    : 'No PowerShell Script Blocks Recorded'
              }
              description={
                isUnconnected
                  ? 'In default unconnected mode, live PowerShell script blocks are not ingested from endpoint JARVIS. Connect to the Wazuh backend or enable demonstration data in Settings.'
                  : classificationFilter === 'monitored'
                    ? 'All PowerShell telemetry stored in wazuh-alerts-4.x-* is rule-matched. Storing un-alerted routine script blocks requires configuring Wazuh archives indexing (wazuh-archives-*).'
                    : hasActiveFilters
                      ? 'Clear search or category filters to view all captured script blocks.'
                      : 'No Event ID 4104 script block logging events occurred in the selected time window.'
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

      {/* ── Script Inspection Modal ── */}
      {selectedEvent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ps-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in"
        >
          <div
            className="w-full max-w-3xl border flex flex-col shadow-2xl"
            style={{
              background: 'var(--color-panel)',
              borderColor: 'var(--color-line)',
              maxHeight: '90vh',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b select-none"
              style={{
                background: 'var(--color-sidebar)',
                borderColor: 'var(--color-line)',
              }}
            >
              <div className="flex items-center gap-2">
                <Terminal size={15} style={{ color: 'var(--color-accent)' }} />
                <span
                  id="ps-modal-title"
                  className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-strong"
                >
                  PowerShell Script Block · {selectedEvent.id}
                </span>
                {selectedEvent.ruleId && (
                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 border border-amber-900/50 bg-amber-950/30 text-warn">
                    Rule {selectedEvent.ruleId}
                  </span>
                )}
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

            {/* Body */}
            <div className="p-4 overflow-y-auto flex flex-col gap-4 text-xs font-mono">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Classification</div>
                  <div className="font-semibold uppercase" style={{ color: selectedEvent.ruleId ? 'var(--color-warn)' : 'var(--color-ink-strong)' }}>
                    {selectedEvent.classification || 'monitored'}
                  </div>
                </div>

                <div className="p-2 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Event ID</div>
                  <div className="text-ink-strong font-semibold">{selectedEvent.eventId || '—'}</div>
                </div>

                <div className="p-2 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Endpoint</div>
                  <div className="text-ink-strong">{selectedEvent.endpoint} ({selectedEvent.agentId || '002'})</div>
                </div>

                <div className="p-2 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Timestamp</div>
                  <div className="text-ink-strong">{formatTimestamp(selectedEvent.timestamp)}</div>
                </div>
              </div>

              {/* Full Script Text Box */}
              <div className="border" style={{ borderColor: 'var(--color-line)' }}>
                <div
                  className="flex items-center justify-between px-3 py-1.5 border-b"
                  style={{ background: '#090b0d', borderColor: 'var(--color-line)' }}
                >
                  <span className="text-[10px] uppercase tracking-wider text-faint">
                    Script Block Code
                  </span>
                  <button
                    type="button"
                    onClick={() => copyScriptText(selectedEvent.scriptBlock || '')}
                    className="gx-btn"
                    style={{ height: '22px', fontSize: '10px', padding: '0 8px' }}
                  >
                    <Copy size={11} aria-hidden="true" />
                    <span>{copiedScript ? 'Copied' : 'Copy Script'}</span>
                  </button>
                </div>
                <pre
                  className="p-3 m-0 overflow-x-auto text-left"
                  style={{
                    background: '#07090b',
                    color: 'var(--color-ink-strong)',
                    fontSize: '11px',
                    lineHeight: 1.55,
                    maxHeight: '200px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  <code>{selectedEvent.scriptBlock || '— (No script text content)'}</code>
                </pre>
              </div>

              {/* Raw JSON */}
              <JsonViewer
                data={selectedEvent.raw || selectedEvent}
                title={`Raw Event Telemetry · ${selectedEvent.id}`}
                maxHeight="180px"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
