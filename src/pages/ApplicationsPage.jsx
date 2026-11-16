import { useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  ArrowUpDown,
  Boxes,
  CheckCircle2,
  Clock,
  Eye,
  History,
  Info,
  Package,
  RefreshCw,
  Server,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import {
  ConnectionPill,
  DataTable,
  EmptyState,
  FilterBar,
  JsonViewer,
  Pagination,
} from '../components'
import { useApp } from '../hooks/useApp'
import { usePage } from '../hooks/usePage'
import { usePageTitle } from '../hooks/usePageTitle'
import { formatTimestamp } from '../utils/format'
import { pageWindow, sortRows } from '../utils/records'

/**
 * Natural version comparator for sorting software versions.
 */
function compareVersions(v1, v2) {
  const parts1 = String(v1 || '').split('.').map((n) => Number.parseInt(n, 10) || 0)
  const parts2 = String(v2 || '').split('.').map((n) => Number.parseInt(n, 10) || 0)
  const len = Math.max(parts1.length, parts2.length)
  for (let i = 0; i < len; i++) {
    const a = parts1[i] || 0
    const b = parts2[i] || 0
    if (a !== b) return a - b
  }
  return String(v1 || '').localeCompare(String(v2 || ''))
}

export default function ApplicationsPage() {
  usePageTitle('Application Inventory')
  const { dataset, selectedEndpoint, setSelectedEndpoint, refreshData, live } = useApp()

  const isUnconnected = dataset.source === 'unconnected'

  // Active Tab: 'inventory' | 'history'
  const [activeTab, setActiveTab] = useState('inventory')

  // Search and filter states (Inventory Tab)
  const [search, setSearch] = useState('')
  const [publisherFilter, setPublisherFilter] = useState('all')
  const [endpointFilter, setEndpointFilter] = useState('all')
  const [formatFilter, setFormatFilter] = useState('all')

  // Search and filter states (History Tab)
  const [historySearch, setHistorySearch] = useState('')
  const [changeTypeFilter, setChangeTypeFilter] = useState('all')

  // Sorting
  const [sort, setSort] = useState({ key: 'name', direction: 'asc' })
  const [historySort, setHistorySort] = useState({ key: 'timestamp', direction: 'desc' })

  // Selected application for raw inspector modal
  const [selectedApp, setSelectedApp] = useState(null)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null)

  // Page tracking for inventory
  const inventoryFilterKey = `${search}-${publisherFilter}-${endpointFilter}-${formatFilter}-${selectedEndpoint}`
  const [activeInventoryPage, setActiveInventoryPage] = usePage(inventoryFilterKey)

  // Page tracking for history
  const historyFilterKey = `${historySearch}-${changeTypeFilter}-${selectedEndpoint}`
  const [activeHistoryPage, setActiveHistoryPage] = usePage(historyFilterKey)

  // Filtered Applications (Inventory Tab)
  const filteredApplications = useMemo(() => {
    return (dataset.applications || []).filter((app) => {
      // Endpoint filter
      if (endpointFilter !== 'all' && app.agentId !== endpointFilter && app.endpoint !== endpointFilter) {
        return false
      }

      // Publisher filter
      if (publisherFilter !== 'all' && app.publisher !== publisherFilter) {
        return false
      }

      // Format filter
      if (formatFilter !== 'all' && app.format !== formatFilter) {
        return false
      }

      // Text search
      if (search.trim()) {
        const query = search.toLowerCase().trim()
        const match =
          app.name?.toLowerCase().includes(query) ||
          app.publisher?.toLowerCase().includes(query) ||
          app.version?.toLowerCase().includes(query) ||
          app.endpoint?.toLowerCase().includes(query) ||
          app.agentId?.toLowerCase().includes(query) ||
          app.architecture?.toLowerCase().includes(query)
        if (!match) return false
      }

      return true
    })
  }, [dataset.applications, endpointFilter, publisherFilter, formatFilter, search])

  // Sorted and Paginated Applications
  const sortedApplications = useMemo(() => {
    const list = [...filteredApplications]
    const dir = sort.direction === 'desc' ? -1 : 1
    list.sort((a, b) => {
      if (sort.key === 'version') {
        return compareVersions(a.version, b.version) * dir
      }
      if (sort.key === 'installDate') {
        const da = a.installDate ? new Date(a.installDate).getTime() : 0
        const db = b.installDate ? new Date(b.installDate).getTime() : 0
        return (da - db) * dir
      }
      if (sort.key === 'publisher') {
        return (a.publisher || '').localeCompare(b.publisher || '') * dir
      }
      if (sort.key === 'endpoint') {
        return (a.endpoint || '').localeCompare(b.endpoint || '') * dir
      }
      // Default: sort by name
      return (a.name || '').localeCompare(b.name || '') * dir
    })
    return list
  }, [filteredApplications, sort])

  const pageSize = 15
  const windowData = pageWindow(sortedApplications.length, activeInventoryPage, pageSize)
  const paginatedApplications = useMemo(() => {
    return sortedApplications.slice(windowData.start, windowData.end)
  }, [sortedApplications, windowData.start, windowData.end])

  // Filtered Change History (History Tab)
  const filteredHistory = useMemo(() => {
    return (dataset.applicationsHistory || []).filter((item) => {
      if (changeTypeFilter !== 'all' && item.changeType !== changeTypeFilter) {
        return false
      }
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim()
        const match =
          item.appName?.toLowerCase().includes(q) ||
          item.endpoint?.toLowerCase().includes(q) ||
          item.agentId?.toLowerCase().includes(q) ||
          item.details?.toLowerCase().includes(q) ||
          item.changeType?.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [dataset.applicationsHistory, changeTypeFilter, historySearch])

  const sortedHistory = useMemo(() => {
    return sortRows(filteredHistory, historySort)
  }, [filteredHistory, historySort])

  const historyWindowData = pageWindow(sortedHistory.length, activeHistoryPage, pageSize)
  const paginatedHistory = useMemo(() => {
    return sortedHistory.slice(historyWindowData.start, historyWindowData.end)
  }, [sortedHistory, historyWindowData.start, historyWindowData.end])

  // Distinct publishers for filter
  const publisherOptions = useMemo(() => {
    const counts = {}
    ;(dataset.applications || []).forEach((app) => {
      const pub = app.publisher || 'Unknown'
      counts[pub] = (counts[pub] || 0) + 1
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return [
      { value: 'all', label: 'All Publishers' },
      ...sorted.map(([name, count]) => ({
        value: name,
        label: `${name} (${count})`,
      })),
    ]
  }, [dataset.applications])

  // Distinct endpoint options
  const endpointOptions = useMemo(() => {
    const list = dataset.allEndpoints || []
    return [
      { value: 'all', label: 'All Endpoints' },
      ...list.map((ep) => ({
        value: ep.agentId || ep.id,
        label: `${ep.name} (${ep.agentId || ep.id})`,
      })),
    ]
  }, [dataset.allEndpoints])

  // Format options
  const formatOptions = [
    { value: 'all', label: 'All Formats' },
    { value: 'win', label: 'Windows Desktop Apps (win)' },
    { value: 'npm', label: 'Node Packages (npm)' },
    { value: 'deb', label: 'Debian Packages (deb)' },
  ]

  // Change type options
  const changeTypeOptions = [
    { value: 'all', label: 'All Change Types' },
    { value: 'Newly detected', label: 'Newly detected' },
    { value: 'Version changed', label: 'Version changed' },
    { value: 'Removal confirmed', label: 'Removal confirmed' },
    { value: 'Missing from latest inventory', label: 'Missing from latest inventory' },
  ]

  // Metrics from API or computed locally
  const metrics = dataset.applicationsMetrics || {
    totalInstalled: (dataset.applications || []).length,
    newlyDetected: (dataset.applicationsHistory || []).filter((h) => h.changeType === 'Newly detected').length,
    removed: (dataset.applicationsHistory || []).filter(
      (h) => h.changeType === 'Removal confirmed' || h.changeType === 'Missing from latest inventory'
    ).length,
    removalConfirmed: (dataset.applicationsHistory || []).filter((h) => h.changeType === 'Removal confirmed').length,
    missingFromLatest: (dataset.applicationsHistory || []).filter(
      (h) => h.changeType === 'Missing from latest inventory'
    ).length,
    versionChanged: (dataset.applicationsHistory || []).filter((h) => h.changeType === 'Version changed').length,
  }

  // Active endpoint name
  const currentEndpointRecord = useMemo(() => {
    if (selectedEndpoint === 'all') return null
    return (dataset.allEndpoints || []).find(
      (ep) => ep.agentId === selectedEndpoint || ep.id === selectedEndpoint
    )
  }, [dataset.allEndpoints, selectedEndpoint])

  function handleResetInventoryFilters() {
    setSearch('')
    setPublisherFilter('all')
    setEndpointFilter('all')
    setFormatFilter('all')
    setActiveInventoryPage(1)
  }

  function handleResetHistoryFilters() {
    setHistorySearch('')
    setChangeTypeFilter('all')
    setActiveHistoryPage(1)
  }

  // Inventory Table Columns
  const inventoryColumns = [
    {
      key: 'name',
      label: 'Application Name',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-2.5 max-w-[280px]">
          <div className="w-8 h-8 rounded bg-[#131922] border border-[#222d3d] flex items-center justify-center shrink-0 text-cyan-400">
            <Package className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-200 truncate" title={val}>
              {val}
            </div>
            {row.format && row.format !== 'win' && (
              <span className="inline-block mt-0.5 text-[9px] font-mono px-1.5 py-0.2 text-slate-400 bg-[#161d27] border border-[#263344] rounded">
                {row.format}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'version',
      label: 'Version',
      width: '130px',
      sortable: true,
      render: (val) => (
        <span className="font-mono text-[11px] text-cyan-300 bg-cyan-950/40 px-2 py-0.5 border border-cyan-800/40 rounded">
          {val || 'Unknown'}
        </span>
      ),
    },
    {
      key: 'publisher',
      label: 'Publisher',
      width: '180px',
      sortable: true,
      render: (val) => (
        <span className="text-xs text-slate-300 truncate block max-w-[170px]" title={val}>
          {val || 'Unknown'}
        </span>
      ),
    },
    {
      key: 'architecture',
      label: 'Architecture',
      width: '110px',
      sortable: false,
      render: (val) => (
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 bg-[#161e29] px-2 py-0.5 border border-[#263346] rounded">
          {val || 'x86_64'}
        </span>
      ),
    },
    {
      key: 'installDate',
      label: 'Installation Date',
      width: '150px',
      sortable: true,
      render: (val) => (
        <span className="font-mono text-xs text-slate-400">
          {val ? formatTimestamp(val) : '—'}
        </span>
      ),
    },
    {
      key: 'endpoint',
      label: 'Endpoint',
      width: '150px',
      sortable: true,
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-xs font-medium text-slate-200 truncate">{val}</span>
          <span className="font-mono text-[10px] text-slate-500">ID: {row.agentId}</span>
        </div>
      ),
    },
    {
      key: 'lastObserved',
      label: 'Last Observed',
      width: '150px',
      sortable: true,
      render: (val) => (
        <span className="font-mono text-xs text-slate-400">
          {val ? formatTimestamp(val) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Inspect',
      width: '80px',
      align: 'right',
      render: (_, row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setSelectedApp(row)
          }}
          className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-[#1a2332] rounded transition-colors"
          title="Inspect application properties"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ]

  // History Table Columns
  const historyColumns = [
    {
      key: 'changeType',
      label: 'Change Type',
      width: '180px',
      sortable: true,
      render: (val) => {
        let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700'
        let icon = <Info className="w-3 h-3 shrink-0" />
        if (val === 'Newly detected') {
          badgeColor = 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50'
          icon = <Sparkles className="w-3 h-3 shrink-0" />
        } else if (val === 'Version changed') {
          badgeColor = 'bg-cyan-950/50 text-cyan-300 border-cyan-800/50'
          icon = <ArrowUpDown className="w-3 h-3 shrink-0" />
        } else if (val === 'Removal confirmed') {
          badgeColor = 'bg-rose-950/50 text-rose-300 border-rose-800/50'
          icon = <CheckCircle2 className="w-3 h-3 shrink-0" />
        } else if (val === 'Missing from latest inventory') {
          badgeColor = 'bg-amber-950/50 text-amber-300 border-amber-800/50'
          icon = <AlertCircle className="w-3 h-3 shrink-0" />
        }

        return (
          <span
            className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded ${badgeColor}`}
          >
            {icon}
            {val}
          </span>
        )
      },
    },
    {
      key: 'appName',
      label: 'Application Name',
      sortable: true,
      render: (val) => (
        <span className="text-xs font-medium text-slate-200 block truncate max-w-[240px]" title={val}>
          {val}
        </span>
      ),
    },
    {
      key: 'versionDiff',
      label: 'Version Comparison',
      width: '200px',
      render: (_, row) => {
        if (row.changeType === 'Version changed') {
          return (
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-slate-400 line-through bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-800">
                {row.previousVersion || 'Unknown'}
              </span>
              <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="text-cyan-300 font-semibold bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/50">
                {row.newVersion || 'Unknown'}
              </span>
            </div>
          )
        }
        if (row.changeType === 'Newly detected') {
          return (
            <span className="font-mono text-[11px] text-emerald-300 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
              New: {row.newVersion || 'Installed'}
            </span>
          )
        }
        if (row.changeType === 'Removal confirmed') {
          return (
            <span className="font-mono text-[11px] text-rose-300 bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-800/40">
              Removed: {row.previousVersion || 'Previous version'}
            </span>
          )
        }
        return (
          <span className="font-mono text-[11px] text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">
            Unobserved: {row.previousVersion || '—'}
          </span>
        )
      },
    },
    {
      key: 'endpoint',
      label: 'Endpoint',
      width: '140px',
      sortable: true,
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-xs text-slate-300 truncate">{val}</span>
          <span className="font-mono text-[10px] text-slate-500">ID: {row.agentId}</span>
        </div>
      ),
    },
    {
      key: 'timestamp',
      label: 'Detection Time',
      width: '150px',
      sortable: true,
      render: (val) => (
        <span className="font-mono text-xs text-slate-400">
          {val ? formatTimestamp(val) : '—'}
        </span>
      ),
    },
    {
      key: 'correlation',
      label: 'Verification & Correlation',
      width: '210px',
      render: (_, row) => {
        if (row.confirmedByEvent) {
          return (
            <span
              className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-300 bg-emerald-950/40 px-2 py-0.5 border border-emerald-800/50 rounded"
              title={row.details}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              Event Verified {row.correlatedEventId ? `(${row.correlatedEventId})` : ''}
            </span>
          )
        }
        return (
          <span
            className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 border border-slate-800 rounded"
            title={row.details}
          >
            <Clock className="w-3 h-3 text-slate-500 shrink-0" />
            Inventory Scan Discovery
          </span>
        )
      },
    },
    {
      key: 'actions',
      label: 'Inspect',
      width: '80px',
      align: 'right',
      render: (_, row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setSelectedHistoryItem(row)
          }}
          className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-[#1a2332] rounded transition-colors"
          title="Inspect event audit log"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#1b2230] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-950/50 border border-cyan-800/60 rounded-lg text-cyan-400">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-100">
                Application Inventory
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Software packages, installed versions, and verified installation/uninstallation change tracking.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Endpoint Badge */}
          <div className="px-3 py-1 bg-[#10151d] border border-[#20293a] rounded flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-xs text-slate-300">
              {selectedEndpoint === 'all'
                ? 'All Endpoints'
                : `${currentEndpointRecord?.name || 'Agent'} (${selectedEndpoint})`}
            </span>
          </div>

          <ConnectionPill />

          <button
            type="button"
            onClick={() => refreshData()}
            disabled={live.loading}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono text-slate-300 bg-[#121824] hover:bg-[#182030] border border-[#20293a] rounded transition-colors disabled:opacity-50"
            title="Refresh software inventory and diff scan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${live.loading ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Isolation Banner (When specific endpoint is filtered) ─────────────── */}
      {selectedEndpoint !== 'all' && (
        <div className="p-3 bg-cyan-950/20 border border-cyan-900/40 rounded flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-cyan-300">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Filtered to Endpoint: <strong>{currentEndpointRecord?.name || selectedEndpoint}</strong> (Agent ID: {selectedEndpoint}). Showing only isolated software inventory and change records.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedEndpoint('all')}
            className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline"
          >
            Show All Endpoints
          </button>
        </div>
      )}

      {/* ── Statistics Metric Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Installed Applications */}
        <div className="p-4 bg-[#0e121a] border border-[#1b2332] rounded-lg relative overflow-hidden group hover:border-cyan-800/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Installed Applications
            </span>
            <div className="w-7 h-7 rounded bg-[#131924] border border-[#232d3f] flex items-center justify-center text-cyan-400">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-100 font-mono">
              {metrics.totalInstalled.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
              Active Inventory
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span>Collected via real Syscollector</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-500/30" />
        </div>

        {/* Metric 2: Applications Newly Detected */}
        <div className="p-4 bg-[#0e121a] border border-[#1b2332] rounded-lg relative overflow-hidden group hover:border-emerald-800/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Newly Detected
            </span>
            <div className="w-7 h-7 rounded bg-[#131924] border border-[#232d3f] flex items-center justify-center text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-emerald-400 font-mono">
              {metrics.newlyDetected.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
              Discovered
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span>New package detections recorded</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500/30" />
        </div>

        {/* Metric 3: Applications with Version Changes */}
        <div className="p-4 bg-[#0e121a] border border-[#1b2332] rounded-lg relative overflow-hidden group hover:border-blue-800/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Version Changes
            </span>
            <div className="w-7 h-7 rounded bg-[#131924] border border-[#232d3f] flex items-center justify-center text-blue-400">
              <History className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-blue-400 font-mono">
              {metrics.versionChanged.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">
              Updated
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span>Software updates & upgrades</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500/30" />
        </div>

        {/* Metric 4: Applications Removed (Confirmed vs Unconfirmed) */}
        <div className="p-4 bg-[#0e121a] border border-[#1b2332] rounded-lg relative overflow-hidden group hover:border-rose-800/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Applications Removed
            </span>
            <div className="w-7 h-7 rounded bg-[#131924] border border-[#232d3f] flex items-center justify-center text-rose-400">
              <Trash2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-rose-400 font-mono">
              {metrics.removed.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider">
              Total Tracked
            </span>
          </div>
          <div className="mt-2 text-[11px] flex items-center gap-2 font-mono">
            <span className="text-rose-400/90 font-medium" title="Uninstallation verified by MsiInstaller / Event log">
              {metrics.removalConfirmed} confirmed
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-amber-400/90" title="Disappeared from scan without confirmed uninstaller event">
              {metrics.missingFromLatest} missing
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-rose-500/30" />
        </div>
      </div>

      {/* ── Tabs Navigation ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-[#1b2230]">
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'inventory'
              ? 'border-cyan-400 text-cyan-400 font-semibold bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          Software Inventory ({filteredApplications.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'history'
              ? 'border-cyan-400 text-cyan-400 font-semibold bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          Software Change History ({filteredHistory.length})
        </button>
      </div>

      {/* ── TAB 1: Software Inventory Table ─────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <FilterBar
            searchPlaceholder="Search by application, publisher, version, architecture..."
            search={search}
            onSearchChange={(val) => {
              setSearch(val)
              setActiveInventoryPage(1)
            }}
            filters={[
              {
                id: 'endpoint',
                label: 'Endpoint',
                value: endpointFilter,
                options: endpointOptions,
                onChange: (v) => {
                  setEndpointFilter(v)
                  setActiveInventoryPage(1)
                },
              },
              {
                id: 'publisher',
                label: 'Publisher',
                value: publisherFilter,
                options: publisherOptions,
                onChange: (v) => {
                  setPublisherFilter(v)
                  setActiveInventoryPage(1)
                },
              },
              {
                id: 'format',
                label: 'Package Format',
                value: formatFilter,
                options: formatOptions,
                onChange: (v) => {
                  setFormatFilter(v)
                  setActiveInventoryPage(1)
                },
              },
            ]}
            onReset={handleResetInventoryFilters}
            resultCount={filteredApplications.length}
            totalCount={(dataset.applications || []).length}
          />

          {sortedApplications.length === 0 ? (
            <EmptyState
              icon={Package}
              title={
                isUnconnected
                  ? 'No Application Inventory (Unconnected Mode)'
                  : 'No Applications Match Filters'
              }
              message={
                isUnconnected
                  ? 'Connect the GuardX backend to a live Wazuh cluster to view genuine Syscollector software inventory.'
                  : 'Try adjusting your search criteria, publisher filter, or endpoint selection.'
              }
              actionLabel={
                search || publisherFilter !== 'all' || endpointFilter !== 'all' || formatFilter !== 'all'
                  ? 'Reset Filters'
                  : undefined
              }
              onAction={handleResetInventoryFilters}
            />
          ) : (
            <div className="space-y-4">
              <DataTable
                columns={inventoryColumns}
                data={paginatedApplications}
                sortKey={sort.key}
                sortDir={sort.direction}
                onSort={(key) => {
                  setSort((prev) => ({
                    key,
                    direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
                  }))
                }}
                onRowClick={(row) => setSelectedApp(row)}
              />

              <Pagination
                page={activeInventoryPage}
                totalPages={windowData.totalPages}
                totalItems={sortedApplications.length}
                pageSize={pageSize}
                onPageChange={setActiveInventoryPage}
              />
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Software Change History ──────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <FilterBar
            searchPlaceholder="Search change history by application, endpoint, notes..."
            search={historySearch}
            onSearchChange={(val) => {
              setHistorySearch(val)
              setActiveHistoryPage(1)
            }}
            filters={[
              {
                id: 'changeType',
                label: 'Change Type',
                value: changeTypeFilter,
                options: changeTypeOptions,
                onChange: (v) => {
                  setChangeTypeFilter(v)
                  setActiveHistoryPage(1)
                },
              },
            ]}
            onReset={handleResetHistoryFilters}
            resultCount={filteredHistory.length}
            totalCount={(dataset.applicationsHistory || []).length}
          />

          {sortedHistory.length === 0 ? (
            <EmptyState
              icon={History}
              title={
                isUnconnected
                  ? 'No Software Change History (Unconnected Mode)'
                  : 'No Change History Records Found'
              }
              message={
                isUnconnected
                  ? 'Connect the GuardX backend to live Wazuh telemetry to record software version changes and uninstallation events.'
                  : 'No software change events match the current filter selection.'
              }
              actionLabel={
                historySearch || changeTypeFilter !== 'all' ? 'Reset Filters' : undefined
              }
              onAction={handleResetHistoryFilters}
            />
          ) : (
            <div className="space-y-4">
              <DataTable
                columns={historyColumns}
                data={paginatedHistory}
                sortKey={historySort.key}
                sortDir={historySort.direction}
                onSort={(key) => {
                  setHistorySort((prev) => ({
                    key,
                    direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
                  }))
                }}
                onRowClick={(row) => setSelectedHistoryItem(row)}
              />

              <Pagination
                page={activeHistoryPage}
                totalPages={historyWindowData.totalPages}
                totalItems={sortedHistory.length}
                pageSize={pageSize}
                onPageChange={setActiveHistoryPage}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Application Details Modal / Drawer ──────────────────────────────── */}
      {selectedApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedApp(null)}
        >
          <div
            className="w-full max-w-2xl bg-[#0c1017] border border-[#202b3d] rounded-xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#1b2332] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#141b26] border border-[#243144] flex items-center justify-center text-cyan-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-100">
                    {selectedApp.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-cyan-400 bg-cyan-950/60 px-2 py-0.5 border border-cyan-800/60 rounded">
                      Version: {selectedApp.version}
                    </span>
                    <span className="font-mono text-xs text-slate-400 bg-[#161f2c] px-2 py-0.5 border border-[#253246] rounded">
                      {selectedApp.architecture}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-[#161f2c]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Application Properties Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#111722] border border-[#1d2738] rounded">
                <span className="text-slate-500 block font-mono text-[10px] uppercase">Publisher / Vendor</span>
                <span className="text-slate-200 font-medium mt-0.5 block">{selectedApp.publisher || 'Unknown'}</span>
              </div>
              <div className="p-3 bg-[#111722] border border-[#1d2738] rounded">
                <span className="text-slate-500 block font-mono text-[10px] uppercase">Endpoint</span>
                <span className="text-slate-200 font-medium mt-0.5 block">{selectedApp.endpoint} (ID: {selectedApp.agentId})</span>
              </div>
              <div className="p-3 bg-[#111722] border border-[#1d2738] rounded">
                <span className="text-slate-500 block font-mono text-[10px] uppercase">Installation Date</span>
                <span className="text-slate-200 font-mono mt-0.5 block">
                  {selectedApp.installDate ? formatTimestamp(selectedApp.installDate) : 'Not reported'}
                </span>
              </div>
              <div className="p-3 bg-[#111722] border border-[#1d2738] rounded">
                <span className="text-slate-500 block font-mono text-[10px] uppercase">Last Inventory Observation</span>
                <span className="text-slate-200 font-mono mt-0.5 block">
                  {selectedApp.lastObserved ? formatTimestamp(selectedApp.lastObserved) : '—'}
                </span>
              </div>
              {selectedApp.location && (
                <div className="col-span-2 p-3 bg-[#111722] border border-[#1d2738] rounded font-mono text-[11px]">
                  <span className="text-slate-500 block font-mono text-[10px] uppercase">Installation Location / Path</span>
                  <span className="text-slate-300 break-all mt-0.5 block">{selectedApp.location}</span>
                </div>
              )}
            </div>

            {/* Raw Wazuh Syscollector Document */}
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                Raw Wazuh Syscollector Item
              </span>
              <div className="max-h-60 overflow-y-auto rounded border border-[#1d2738] bg-[#0a0d13]">
                <JsonViewer data={selectedApp.raw || selectedApp} />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#1b2332]">
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-4 py-1.5 text-xs font-mono text-slate-300 bg-[#141b26] hover:bg-[#1a2332] border border-[#243144] rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change History Details Modal ────────────────────────────────────── */}
      {selectedHistoryItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedHistoryItem(null)}
        >
          <div
            className="w-full max-w-2xl bg-[#0c1017] border border-[#202b3d] rounded-xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#1b2332] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#141b26] border border-[#243144] flex items-center justify-center text-cyan-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-100">
                    Software Change Event: {selectedHistoryItem.changeType}
                  </h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {selectedHistoryItem.appName} on {selectedHistoryItem.endpoint} (ID: {selectedHistoryItem.agentId})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistoryItem(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-[#161f2c]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#111722] border border-[#1d2738] rounded">
                <span className="text-slate-500 block font-mono text-[10px] uppercase">Application</span>
                <span className="text-slate-200 font-medium mt-0.5 block">{selectedHistoryItem.appName}</span>
              </div>
              <div className="p-3 bg-[#111722] border border-[#1d2738] rounded">
                <span className="text-slate-500 block font-mono text-[10px] uppercase">Endpoint</span>
                <span className="text-slate-200 font-medium mt-0.5 block">{selectedHistoryItem.endpoint}</span>
              </div>
              <div className="p-3 bg-[#111722] border border-[#1d2738] rounded">
                <span className="text-slate-500 block font-mono text-[10px] uppercase">Previous Version</span>
                <span className="text-slate-200 font-mono mt-0.5 block">{selectedHistoryItem.previousVersion || '—'}</span>
              </div>
              <div className="p-3 bg-[#111722] border border-[#1d2738] rounded">
                <span className="text-slate-500 block font-mono text-[10px] uppercase">New Version</span>
                <span className="text-cyan-300 font-mono mt-0.5 block">{selectedHistoryItem.newVersion || '—'}</span>
              </div>
              <div className="col-span-2 p-3 bg-[#111722] border border-[#1d2738] rounded">
                <span className="text-slate-500 block font-mono text-[10px] uppercase">Detection / Log Timestamp</span>
                <span className="text-slate-200 font-mono mt-0.5 block">
                  {selectedHistoryItem.timestamp ? formatTimestamp(selectedHistoryItem.timestamp) : '—'}
                </span>
              </div>
              <div className="col-span-2 p-3 bg-[#111722] border border-[#1d2738] rounded">
                <span className="text-slate-500 block font-mono text-[10px] uppercase">Audit Details & Verification</span>
                <span className="text-slate-300 mt-1 block text-xs leading-relaxed">
                  {selectedHistoryItem.details || 'Detected through Wazuh Syscollector delta comparison.'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                Raw Event Payload
              </span>
              <div className="max-h-60 overflow-y-auto rounded border border-[#1d2738] bg-[#0a0d13]">
                <JsonViewer data={selectedHistoryItem.raw || selectedHistoryItem} />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#1b2332]">
              <button
                type="button"
                onClick={() => setSelectedHistoryItem(null)}
                className="px-4 py-1.5 text-xs font-mono text-slate-300 bg-[#141b26] hover:bg-[#1a2332] border border-[#243144] rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
