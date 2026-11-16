import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Eye,
  Info,
  Layers,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  Sparkles,
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
} from '../components'
import { useApp } from '../hooks/useApp'
import { usePage } from '../hooks/usePage'
import { usePageTitle } from '../hooks/usePageTitle'
import { triggerThreatAnalysis } from '../services/wazuh'
import { formatTimestamp } from '../utils/format'
import { pageWindow } from '../utils/records'

export default function ThreatIntelPage() {
  usePageTitle('AI Threat Intelligence')
  const { dataset, selectedEndpoint, setSelectedEndpoint, refreshData, live } = useApp()

  const isUnconnected = dataset.source === 'unconnected'

  // Filter states
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [attackTypeFilter, setAttackTypeFilter] = useState('all')
  const [endpointFilter, setEndpointFilter] = useState('all')

  // Sorting
  const [sort, setSort] = useState({ key: 'lastSeen', direction: 'desc' })

  // Analysis trigger state
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisMessage, setAnalysisMessage] = useState(null)

  // Selected incident for deep-dive investigation modal
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [inspectedRawAlert, setInspectedRawAlert] = useState(null)

  // Pagination
  const filterKey = `${search}-${severityFilter}-${attackTypeFilter}-${endpointFilter}-${selectedEndpoint}`
  const [activePage, setActivePage] = usePage(filterKey)

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return (dataset.threatIntel || []).filter((inc) => {
      // Endpoint filter
      if (endpointFilter !== 'all' && inc.agentId !== endpointFilter && inc.affectedEndpoint !== endpointFilter) {
        return false
      }

      // Severity filter
      if (severityFilter !== 'all' && inc.severity !== severityFilter.toLowerCase()) {
        return false
      }

      // Attack type filter
      if (attackTypeFilter !== 'all' && inc.suspectedAttackType !== attackTypeFilter) {
        return false
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const match =
          inc.title?.toLowerCase().includes(q) ||
          inc.suspectedAttackType?.toLowerCase().includes(q) ||
          inc.mitreTactic?.toLowerCase().includes(q) ||
          inc.mitreTechniqueId?.toLowerCase().includes(q) ||
          inc.mitreTechniqueName?.toLowerCase().includes(q) ||
          inc.affectedEndpoint?.toLowerCase().includes(q) ||
          inc.explanation?.toLowerCase().includes(q)
        if (!match) return false
      }

      return true
    })
  }, [dataset.threatIntel, endpointFilter, severityFilter, attackTypeFilter, search])

  // Sorting & pagination
  const sortedIncidents = useMemo(() => {
    const list = [...filteredIncidents]
    const dir = sort.direction === 'desc' ? -1 : 1
    const severityRank = { critical: 4, high: 3, medium: 2, low: 1, informational: 0 }

    list.sort((a, b) => {
      if (sort.key === 'severity') {
        return ((severityRank[a.severity] || 0) - (severityRank[b.severity] || 0)) * dir
      }
      if (sort.key === 'confidence') {
        return ((a.confidence || 0) - (b.confidence || 0)) * dir
      }
      if (sort.key === 'eventCount') {
        return ((a.eventCount || 0) - (b.eventCount || 0)) * dir
      }
      if (sort.key === 'endpoint') {
        return (a.affectedEndpoint || '').localeCompare(b.affectedEndpoint || '') * dir
      }
      if (sort.key === 'attackType') {
        return (a.suspectedAttackType || '').localeCompare(b.suspectedAttackType || '') * dir
      }
      // Default: sort by lastSeen timestamp
      const da = a.lastSeen ? new Date(a.lastSeen).getTime() : 0
      const db = b.lastSeen ? new Date(b.lastSeen).getTime() : 0
      return (da - db) * dir
    })
    return list
  }, [filteredIncidents, sort])

  const pageSize = 10
  const windowData = pageWindow(sortedIncidents.length, activePage, pageSize)
  const paginatedIncidents = useMemo(() => {
    return sortedIncidents.slice(windowData.start, windowData.end)
  }, [sortedIncidents, windowData.start, windowData.end])

  // Distinct filter options
  const attackTypeOptions = useMemo(() => {
    const types = new Set((dataset.threatIntel || []).map((i) => i.suspectedAttackType).filter(Boolean))
    return [
      { value: 'all', label: 'All Attack Types' },
      ...Array.from(types).map((t) => ({ value: t, label: t })),
    ]
  }, [dataset.threatIntel])

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

  const severityOptions = [
    { value: 'all', label: 'All Severities' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
    { value: 'informational', label: 'Informational' },
  ]

  // Metrics
  const metrics = useMemo(() => {
    const list = dataset.threatIntel || []
    const sev = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 }
    const attacks = {}
    const mitreMap = {}
    const endpoints = {}

    list.forEach((i) => {
      sev[i.severity] = (sev[i.severity] || 0) + 1
      attacks[i.suspectedAttackType] = (attacks[i.suspectedAttackType] || 0) + 1
      if (i.mitreTechniqueId) {
        const k = `${i.mitreTechniqueId} - ${i.mitreTechniqueName || ''}`
        mitreMap[k] = (mitreMap[k] || 0) + 1
      }
      endpoints[i.affectedEndpoint] = (endpoints[i.affectedEndpoint] || 0) + 1
    })

    return {
      total: list.length,
      critHigh: sev.critical + sev.high,
      sev,
      attacks,
      mitre: Object.entries(mitreMap).map(([k, c]) => ({ key: k, count: c })),
      endpoints: Object.entries(endpoints).map(([k, c]) => ({ endpoint: k, count: c })),
    }
  }, [dataset.threatIntel])

  // Current endpoint name
  const currentEndpointRecord = useMemo(() => {
    if (selectedEndpoint === 'all') return null
    return (dataset.allEndpoints || []).find(
      (ep) => ep.agentId === selectedEndpoint || ep.id === selectedEndpoint
    )
  }, [dataset.allEndpoints, selectedEndpoint])

  // Status info
  const statusInfo = dataset.threatIntelStatus || {
    geminiConfigured: false,
    model: 'gemini-1.5-flash',
    analysisMode: 'heuristic',
  }

  function handleResetFilters() {
    setSearch('')
    setSeverityFilter('all')
    setAttackTypeFilter('all')
    setEndpointFilter('all')
    setActivePage(1)
  }

  async function handleAnalyzeNow() {
    setAnalyzing(true)
    setAnalysisMessage(null)
    try {
      const res = await triggerThreatAnalysis({
        agentId: selectedEndpoint === 'all' ? 'all' : selectedEndpoint,
        force: true,
      })
      setAnalysisMessage(res?.message || 'Threat analysis completed.')
      await refreshData()
    } catch (err) {
      setAnalysisMessage(`Analysis error: ${err.message}`)
    } finally {
      setAnalyzing(false)
      setTimeout(() => setAnalysisMessage(null), 5000)
    }
  }

  // Incident Table Columns
  const columns = [
    {
      key: 'severity',
      label: 'Severity',
      width: '120px',
      sortable: true,
      render: (val) => {
        const s = String(val).toLowerCase()
        let badge = 'bg-slate-800 text-slate-300 border-slate-700'
        if (s === 'critical') badge = 'bg-red-950/70 text-red-300 border-red-700'
        if (s === 'high') badge = 'bg-rose-950/70 text-rose-300 border-rose-700'
        if (s === 'medium') badge = 'bg-amber-950/70 text-amber-300 border-amber-700'
        if (s === 'low') badge = 'bg-blue-950/70 text-blue-300 border-blue-700'
        return (
          <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded ${badge}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {s}
          </span>
        )
      },
    },
    {
      key: 'title',
      label: 'Incident Finding & Attack Classification',
      render: (val, row) => (
        <div className="space-y-1 max-w-[340px]">
          <div className="text-xs font-semibold text-slate-200 truncate" title={val}>
            {val}
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block font-mono text-[10px] text-cyan-300 bg-cyan-950/50 px-1.5 py-0.2 border border-cyan-800/50 rounded">
              {row.suspectedAttackType}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {row.analysisSource === 'gemini' ? 'Gemini AI' : 'Rule Heuristic'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'mitre',
      label: 'MITRE ATT&CK',
      width: '180px',
      render: (_, row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[11px] text-slate-300 font-medium">
            {row.mitreTechniqueId || 'T1082'}
          </span>
          <span className="text-[10px] text-slate-400 truncate max-w-[170px]" title={row.mitreTechniqueName}>
            {row.mitreTactic}: {row.mitreTechniqueName}
          </span>
        </div>
      ),
    },
    {
      key: 'endpoint',
      label: 'Endpoint',
      width: '140px',
      sortable: true,
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-xs text-slate-200 font-medium truncate">{row.affectedEndpoint}</span>
          <span className="font-mono text-[10px] text-slate-500">ID: {row.agentId}</span>
        </div>
      ),
    },
    {
      key: 'eventCount',
      label: 'Events',
      width: '80px',
      sortable: true,
      render: (val) => (
        <span className="font-mono text-xs text-slate-300 bg-[#141b26] px-2 py-0.5 border border-[#243144] rounded">
          {val}
        </span>
      ),
    },
    {
      key: 'confidence',
      label: 'AI Confidence',
      width: '130px',
      sortable: true,
      render: (val) => {
        const pct = Math.round((val || 0) * 100)
        let barColor = 'bg-cyan-500'
        if (pct >= 85) {
          barColor = 'bg-emerald-500'
        } else if (pct < 70) {
          barColor = 'bg-amber-500'
        }

        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-300 font-medium">{pct}%</span>
              <span className="text-slate-500">Assessment</span>
            </div>
            <div className="w-full h-1.5 bg-[#141b26] rounded-full overflow-hidden border border-[#222c3d]">
              <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      },
    },
    {
      key: 'lastSeen',
      label: 'Last Seen',
      width: '140px',
      sortable: true,
      render: (val) => (
        <span className="font-mono text-xs text-slate-400">
          {val ? formatTimestamp(val) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Investigate',
      width: '100px',
      align: 'right',
      render: (_, row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setSelectedIncident(row)
          }}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-800/50 rounded transition-colors"
          title="Investigate incident telemetry and raw alerts"
        >
          <Eye className="w-3.5 h-3.5" />
          Review
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
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-semibold tracking-tight text-slate-100">
                  AI Threat Intelligence & Attack Correlation
                </h1>
                {statusInfo.geminiConfigured ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 border border-emerald-800/50 rounded">
                    <Sparkles className="w-3 h-3" />
                    Gemini AI Active ({statusInfo.model})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 border border-amber-800/50 rounded" title="Add GEMINI_API_KEY to backend/.env for generative deep analysis">
                    <Cpu className="w-3 h-3" />
                    Heuristic Correlation Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-event correlation across Windows authentication, PowerShell execution, and system telemetry mapped to MITRE ATT&CK.
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
            onClick={handleAnalyzeNow}
            disabled={analyzing || live.loading}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono text-cyan-300 bg-cyan-950/50 hover:bg-cyan-950/80 border border-cyan-800/60 rounded transition-colors disabled:opacity-50"
            title="Trigger multi-event correlation and AI attack classification"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin text-cyan-400' : ''}`} />
            {analyzing ? 'Analyzing Telemetry...' : 'Analyse Now'}
          </button>
        </div>
      </div>

      {/* ── Status / Notification Banner ────────────────────────────────────── */}
      {analysisMessage && (
        <div className="p-3 bg-cyan-950/30 border border-cyan-800/50 rounded text-xs font-mono text-cyan-300 flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{analysisMessage}</span>
        </div>
      )}

      {/* ── Endpoint Isolation Banner ───────────────────────────────────────── */}
      {selectedEndpoint !== 'all' && (
        <div className="p-3 bg-cyan-950/20 border border-cyan-900/40 rounded flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-cyan-300">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Filtered to Endpoint: <strong>{currentEndpointRecord?.name || selectedEndpoint}</strong> (Agent ID: {selectedEndpoint}). Showing only incidents attributed strictly to this endpoint.
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

      {/* ── Metric Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Incidents */}
        <div className="p-4 bg-[#0e121a] border border-[#1b2332] rounded-lg relative overflow-hidden group hover:border-cyan-800/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Correlated Incidents
            </span>
            <div className="w-7 h-7 rounded bg-[#131924] border border-[#232d3f] flex items-center justify-center text-cyan-400">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-100 font-mono">
              {metrics.total}
            </span>
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
              Attack Clusters
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            <span>Grouped from real Wazuh telemetry</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-500/30" />
        </div>

        {/* Metric 2: Critical & High Findings */}
        <div className="p-4 bg-[#0e121a] border border-[#1b2332] rounded-lg relative overflow-hidden group hover:border-rose-800/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Critical & High Severity
            </span>
            <div className="w-7 h-7 rounded bg-[#131924] border border-[#232d3f] flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-rose-400 font-mono">
              {metrics.critHigh}
            </span>
            <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider">
              Priority Threats
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            <span>High probability attack indicators</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-rose-500/30" />
        </div>

        {/* Metric 3: Suspected Attack Types */}
        <div className="p-4 bg-[#0e121a] border border-[#1b2332] rounded-lg relative overflow-hidden group hover:border-amber-800/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Attack Types Identified
            </span>
            <div className="w-7 h-7 rounded bg-[#131924] border border-[#232d3f] flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-amber-400 font-mono">
              {Object.keys(metrics.attacks).length}
            </span>
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">
              Distinct Patterns
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            <span>Brute Force, PowerShell, Sudo, etc.</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-500/30" />
        </div>

        {/* Metric 4: MITRE ATT&CK Techniques */}
        <div className="p-4 bg-[#0e121a] border border-[#1b2332] rounded-lg relative overflow-hidden group hover:border-emerald-800/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              MITRE ATT&CK Mappings
            </span>
            <div className="w-7 h-7 rounded bg-[#131924] border border-[#232d3f] flex items-center justify-center text-emerald-400">
              <Shield className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-emerald-400 font-mono">
              {metrics.mitre.length}
            </span>
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
              Techniques Mapped
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            <span>Directly corroborated by log artifacts</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500/30" />
        </div>
      </div>

      {/* ── Visual Analytics Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Attack Distribution Card */}
        <div className="p-4 bg-[#0e121a] border border-[#1b2332] rounded-lg space-y-3">
          <div className="flex items-center justify-between border-b border-[#1b2332] pb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Suspected Attack Distribution
            </span>
            <span className="text-[10px] font-mono text-slate-500">Classification</span>
          </div>
          <div className="space-y-2.5">
            {Object.entries(metrics.attacks).length === 0 ? (
              <span className="text-xs text-slate-500 block">No attacks classified yet.</span>
            ) : (
              Object.entries(metrics.attacks).map(([type, count]) => {
                const pct = Math.round((count / (metrics.total || 1)) * 100)
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 truncate max-w-[200px]" title={type}>{type}</span>
                      <span className="font-mono text-slate-400 text-[11px]">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#141b26] rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* MITRE ATT&CK Matrix Card */}
        <div className="p-4 bg-[#0e121a] border border-[#1b2332] rounded-lg space-y-3">
          <div className="flex items-center justify-between border-b border-[#1b2332] pb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              MITRE ATT&CK Matrix
            </span>
            <span className="text-[10px] font-mono text-slate-500">Framework</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {metrics.mitre.length === 0 ? (
              <span className="text-xs text-slate-500 block">No techniques mapped yet.</span>
            ) : (
              metrics.mitre.map((item) => (
                <div key={item.key} className="flex items-center justify-between p-2 bg-[#121824] border border-[#20293a] rounded">
                  <span className="text-xs font-mono text-slate-300 truncate max-w-[220px]" title={item.key}>
                    {item.key}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 rounded">
                    {item.count} inc
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Endpoint Threat Breakdown Card */}
        <div className="p-4 bg-[#0e121a] border border-[#1b2332] rounded-lg space-y-3">
          <div className="flex items-center justify-between border-b border-[#1b2332] pb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-blue-400" />
              Endpoint Threat Attribution
            </span>
            <span className="text-[10px] font-mono text-slate-500">Isolation</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {metrics.endpoints.length === 0 ? (
              <span className="text-xs text-slate-500 block">No endpoint incidents found.</span>
            ) : (
              metrics.endpoints.map((item) => (
                <div
                  key={item.endpoint}
                  className="flex items-center justify-between p-2 bg-[#121824] border border-[#20293a] rounded hover:border-cyan-800/40 transition-colors cursor-pointer"
                  onClick={() => {
                    const epMatch = (dataset.allEndpoints || []).find((e) => e.name === item.endpoint)
                    if (epMatch) setSelectedEndpoint(epMatch.agentId || epMatch.id)
                  }}
                  title="Click to isolate endpoint"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-xs font-medium text-slate-200">{item.endpoint}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {item.count} incidents
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Incidents Table & Filters ────────────────────────────────────────── */}
      <div className="space-y-4">
        <FilterBar
          searchPlaceholder="Search incidents by title, attack type, MITRE technique, explanation..."
          search={search}
          onSearchChange={(val) => {
            setSearch(val)
            setActivePage(1)
          }}
          filters={[
            {
              id: 'severity',
              label: 'Severity',
              value: severityFilter,
              options: severityOptions,
              onChange: (v) => {
                setSeverityFilter(v)
                setActivePage(1)
              },
            },
            {
              id: 'attackType',
              label: 'Attack Type',
              value: attackTypeFilter,
              options: attackTypeOptions,
              onChange: (v) => {
                setAttackTypeFilter(v)
                setActivePage(1)
              },
            },
            {
              id: 'endpoint',
              label: 'Endpoint',
              value: endpointFilter,
              options: endpointOptions,
              onChange: (v) => {
                setEndpointFilter(v)
                setActivePage(1)
              },
            },
          ]}
          onReset={handleResetFilters}
          resultCount={filteredIncidents.length}
          totalCount={(dataset.threatIntel || []).length}
        />

        {sortedIncidents.length === 0 ? (
          <EmptyState
            icon={Brain}
            title={
              isUnconnected
                ? 'No Threat Incidents (Unconnected Mode)'
                : 'No Threat Incidents Match Filter Criteria'
            }
            message={
              isUnconnected
                ? 'Connect the GuardX backend to a live Wazuh cluster to correlate security telemetry with Gemini AI.'
                : 'Try adjusting your search query, attack type, or severity filter, or click "Analyse Now" to re-cluster events.'
            }
            actionLabel={
              search || severityFilter !== 'all' || attackTypeFilter !== 'all' || endpointFilter !== 'all'
                ? 'Reset Filters'
                : undefined
            }
            onAction={handleResetFilters}
          />
        ) : (
          <div className="space-y-4">
            <DataTable
              columns={columns}
              data={paginatedIncidents}
              sortKey={sort.key}
              sortDir={sort.direction}
              onSort={(key) => {
                setSort((prev) => ({
                  key,
                  direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
                }))
              }}
              onRowClick={(row) => setSelectedIncident(row)}
            />

            <Pagination
              page={activePage}
              totalPages={windowData.totalPages}
              totalItems={sortedIncidents.length}
              pageSize={pageSize}
              onPageChange={setActivePage}
            />
          </div>
        )}
      </div>

      {/* ── Incident Investigation Deep-Dive Modal ──────────────────────────── */}
      {selectedIncident && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          onClick={() => setSelectedIncident(null)}
        >
          <div
            className="w-full max-w-4xl bg-[#0b0f16] border border-[#202b3d] rounded-xl shadow-2xl p-6 space-y-6 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#1b2332] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#141b26] border border-[#243144] flex items-center justify-center text-cyan-400">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-500">{selectedIncident.id}</span>
                    <span className="font-mono text-xs text-slate-600">·</span>
                    <span className="font-mono text-xs text-slate-400">
                      {selectedIncident.affectedEndpoint} (Agent {selectedIncident.agentId})
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-slate-100 mt-0.5">
                    {selectedIncident.title}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-[#161f2c]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Incident Classification Header Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-[#111722] border border-[#1d2738] rounded">
                <span className="text-slate-500 block font-mono text-[10px] uppercase">Suspected Attack Type</span>
                <span className="text-cyan-300 font-semibold mt-0.5 block">{selectedIncident.suspectedAttackType}</span>
              </div>
              <div className="p-3 bg-[#111722] border border-[#1d2738] rounded">
                <span className="text-slate-500 block font-mono text-[10px] uppercase">Severity</span>
                <span className="font-mono uppercase font-bold text-slate-200 mt-0.5 block">{selectedIncident.severity}</span>
              </div>
              <div className="p-3 bg-[#111722] border border-[#1d2738] rounded">
                <span className="text-slate-500 block font-mono text-[10px] uppercase">AI Confidence</span>
                <span className="text-emerald-400 font-mono font-bold mt-0.5 block">
                  {Math.round((selectedIncident.confidence || 0) * 100)}%
                </span>
              </div>
              <div className="p-3 bg-[#111722] border border-[#1d2738] rounded">
                <span className="text-slate-500 block font-mono text-[10px] uppercase">Correlated Events</span>
                <span className="text-slate-200 font-mono font-bold mt-0.5 block">{selectedIncident.eventCount} alerts</span>
              </div>
            </div>

            {/* AI Explanation & Context */}
            <div className="p-4 bg-[#101622] border border-[#1e283b] rounded-lg space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                AI Threat Assessment & Explanation
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedIncident.explanation}
              </p>
              <div className="pt-2 text-[11px] text-slate-400 italic border-t border-[#1a2333]">
                {selectedIncident.confidenceReasoning}
              </div>
            </div>

            {/* MITRE ATT&CK & Evidence Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: MITRE ATT&CK Mapping */}
              <div className="p-4 bg-[#101622] border border-[#1e283b] rounded-lg space-y-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  MITRE ATT&CK Mapping
                </span>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-mono uppercase">Tactic</span>
                    <span className="text-slate-200 font-medium">{selectedIncident.mitreTactic}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-mono uppercase">Technique ID & Name</span>
                    <span className="font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 border border-cyan-800/60 rounded inline-block mt-0.5">
                      {selectedIncident.mitreTechniqueId} - {selectedIncident.mitreTechniqueName}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#1a2333]">
                    <span className="text-slate-500 block text-[10px] font-mono uppercase">Supporting Telemetry IDs</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedIncident.supportingRuleIds?.map((r) => (
                        <span key={r} className="font-mono text-[10px] text-slate-300 bg-[#141b26] px-1.5 py-0.5 border border-[#253246] rounded">
                          Rule {r}
                        </span>
                      ))}
                      {selectedIncident.supportingEventIds?.map((e) => (
                        <span key={e} className="font-mono text-[10px] text-amber-300 bg-amber-950/40 px-1.5 py-0.5 border border-amber-800/40 rounded">
                          Event {e}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Evidence Summary */}
              <div className="p-4 bg-[#101622] border border-[#1e283b] rounded-lg space-y-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Evidence Summary
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {selectedIncident.evidenceSummary?.map((ev, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recommended Steps and False Positive Guidance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#101622] border border-[#1e283b] rounded-lg space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-semibold">
                  Recommended Investigation Steps
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {selectedIncident.recommendedInvestigationSteps?.map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-blue-950 border border-blue-800 text-blue-300 flex items-center justify-center text-[10px] font-mono shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-[#101622] border border-[#1e283b] rounded-lg space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  False-Positive Considerations
                </span>
                <ul className="space-y-1.5 text-xs text-slate-400">
                  {selectedIncident.falsePositiveConsiderations?.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-slate-600 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Correlated Source Wazuh Alerts Table */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-200 font-semibold flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  Correlated Source Alerts ({selectedIncident.correlatedAlerts?.length || 0})
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Click any row to inspect raw Wazuh alert JSON
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto border border-[#1e283b] rounded-lg bg-[#0a0d13]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#101622] border-b border-[#1e283b] text-slate-400 text-[10px] uppercase sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Timestamp</th>
                      <th className="py-2 px-3">Rule</th>
                      <th className="py-2 px-3">Event ID</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#161f2e] text-slate-300">
                    {(selectedIncident.correlatedAlerts || []).map((alert, idx) => (
                      <tr
                        key={alert.id || idx}
                        className="hover:bg-[#121926] cursor-pointer transition-colors"
                        onClick={() => setInspectedRawAlert(alert.raw || alert)}
                      >
                        <td className="py-2 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                          {formatTimestamp(alert.timestamp)}
                        </td>
                        <td className="py-2 px-3 text-cyan-400 whitespace-nowrap">
                          Rule {alert.ruleId} (lvl {alert.ruleLevel})
                        </td>
                        <td className="py-2 px-3 text-amber-300 whitespace-nowrap">
                          {alert.eventId ? `Event ${alert.eventId}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-300 truncate max-w-[280px]" title={alert.ruleDescription}>
                          {alert.ruleDescription}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setInspectedRawAlert(alert.raw || alert)
                            }}
                            className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-[#192333] rounded"
                            title="Inspect raw JSON"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-[#1b2332]">
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-1.5 text-xs font-mono text-slate-300 bg-[#141b26] hover:bg-[#1a2332] border border-[#243144] rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Raw Source Alert JSON Inspector Modal ───────────────────────────── */}
      {inspectedRawAlert && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          onClick={() => setInspectedRawAlert(null)}
        >
          <div
            className="w-full max-w-2xl bg-[#0c1017] border border-[#202b3d] rounded-xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#1b2332] pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Raw Wazuh Alert Telemetry Document
              </span>
              <button
                type="button"
                onClick={() => setInspectedRawAlert(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-[#161f2c]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto rounded border border-[#1d2738] bg-[#0a0d13]">
              <JsonViewer data={inspectedRawAlert} />
            </div>

            <div className="flex justify-end pt-2 border-t border-[#1b2332]">
              <button
                type="button"
                onClick={() => setInspectedRawAlert(null)}
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
