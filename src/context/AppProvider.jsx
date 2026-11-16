import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppContext } from './AppContext'
import { environment, knownEndpoints, knownRules, withSeverity } from '../data/catalog'
import { buildDemoDataset } from '../data/demo'
import { describeError } from '../services/api'
import { checkHealth, loadSnapshot } from '../services/wazuh'
import { readJson, writeJson } from '../utils/storage'

const PREFS_KEY = 'guardx.preferences'
const SOURCES = ['unconnected', 'demo', 'live']

function initialPrefs() {
  const stored = readJson(PREFS_KEY, {})
  const envSource = import.meta.env.VITE_DATA_SOURCE
  const storedSource = stored.dataSource === 'catalog' ? 'unconnected' : stored.dataSource
  const resolvedEnv = envSource === 'catalog' ? 'unconnected' : envSource
  return {
    dataSource: SOURCES.includes(storedSource)
      ? storedSource
      : SOURCES.includes(resolvedEnv)
        ? resolvedEnv
        : 'unconnected',
    selectedEndpoint: stored.selectedEndpoint || 'all',
    environmentLabel: stored.environmentLabel || import.meta.env.VITE_ENVIRONMENT || 'LOCAL',
    operatorName: stored.operatorName || 'Console operator',
    sidebarCollapsed: Boolean(stored.sidebarCollapsed),
  }
}

function applyStatus(alerts, overrides) {
  if (!Object.keys(overrides).length) return alerts
  return alerts.map((alert) => (overrides[alert.id] ? { ...alert, status: overrides[alert.id] } : alert))
}

export function AppProvider({ children }) {
  const [prefs, setPrefs] = useState(initialPrefs)
  const [asOf, setAsOf] = useState(() => Date.now())
  const [timeRange, setTimeRange] = useState('24h')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [statusOverrides, setStatusOverrides] = useState({})
  const [localEpoch, setLocalEpoch] = useState(0)
  const [live, setLive] = useState({ loading: false, error: null, data: null })
  const [probe, setProbe] = useState({ loading: false, error: null, result: null })
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    writeJson(PREFS_KEY, prefs)
  }, [prefs])

  const refresh = useCallback(() => {
    setAsOf(Date.now())
    setRefreshToken((value) => value + 1)
  }, [])

  const setSelectedEndpoint = useCallback((endpointId) => {
    const val = String(endpointId || 'all').trim()
    setLive({ loading: true, error: null, data: null })
    setPrefs((current) => ({ ...current, selectedEndpoint: val }))
  }, [])

  useEffect(() => {
    if (prefs.dataSource !== 'live') return undefined
    let cancelled = false
    setLive((current) => ({ ...current, loading: true, error: null, data: null })) // eslint-disable-line react-hooks/set-state-in-effect
    loadSnapshot(timeRange, prefs.selectedEndpoint || 'all')
      .then((data) => {
        if (cancelled) return
        setLive({ loading: false, error: null, data })
        setProbe({ loading: false, error: null, result: data.health })
        setAsOf(Date.now())
      })
      .catch((error) => {
        if (cancelled) return
        setLive({ loading: false, error: describeError(error), data: null })
      })
    return () => {
      cancelled = true
    }
  }, [prefs.dataSource, timeRange, prefs.selectedEndpoint, refreshToken])

  const queryApi = useCallback(async () => {
    setProbe((current) => ({ ...current, loading: true, error: null }))
    try {
      const result = await checkHealth()
      setProbe({ loading: false, error: null, result })
      setAsOf(Date.now())
      return result
    } catch (error) {
      const message = describeError(error)
      setProbe({ loading: false, error: message, result: null })
      setAsOf(Date.now())
      return null
    }
  }, [])

  const demo = useMemo(() => (prefs.dataSource === 'demo' ? buildDemoDataset(asOf) : null), [asOf, prefs.dataSource])
  const catalogRules = useMemo(() => knownRules.map(withSeverity), [])

  const dataset = useMemo(() => {
    const sel = prefs.selectedEndpoint || 'all'
    const isFiltered = sel !== 'all'
    let base
    if (prefs.dataSource === 'demo' && demo) {
      const demoAlerts = isFiltered ? demo.alerts.filter((a) => a.agentId === sel || a.endpoint === sel) : demo.alerts
      const demoFim = isFiltered ? demo.fim.filter((f) => f.agentId === sel || f.endpoint === sel) : demo.fim
      const demoAuth = isFiltered ? demo.authentication.filter((au) => au.agentId === sel || au.endpoint === sel) : demo.authentication
      const demoPs = isFiltered ? demo.powershell.filter((ps) => ps.agentId === sel || ps.endpoint === sel) : demo.powershell
      const demoApps = isFiltered ? (demo.applications || []).filter((a) => a.agentId === sel || a.endpoint === sel) : (demo.applications || [])
      const demoAppHistory = isFiltered ? (demo.applicationsHistory || []).filter((h) => h.agentId === sel || h.endpoint === sel) : (demo.applicationsHistory || [])
      const demoThreat = isFiltered ? (demo.threatIntel || []).filter((t) => t.agentId === sel || t.affectedEndpoint === sel) : (demo.threatIntel || [])
      const activeEndpoints = isFiltered ? knownEndpoints.filter((ep) => ep.agentId === sel || ep.id === sel) : knownEndpoints

      base = {
        source: 'demo',
        selectedEndpoint: sel,
        alerts: demoAlerts,
        fim: demoFim,
        authentication: demoAuth,
        powershell: demoPs,
        rules: catalogRules,
        applications: demoApps,
        applicationsMetrics: {
          totalInstalled: demoApps.length,
          newlyDetected: demoAppHistory.filter((h) => h.changeType === 'Newly detected').length,
          removed: demoAppHistory.filter((h) => h.changeType === 'Removal confirmed' || h.changeType === 'Missing from latest inventory').length,
          removalConfirmed: demoAppHistory.filter((h) => h.changeType === 'Removal confirmed').length,
          missingFromLatest: demoAppHistory.filter((h) => h.changeType === 'Missing from latest inventory').length,
          versionChanged: demoAppHistory.filter((h) => h.changeType === 'Version changed').length,
        },
        applicationsTotal: demoApps.length,
        applicationsHistory: demoAppHistory,
        applicationsPublishers: [],
        threatIntel: demoThreat,
        threatIntelMetrics: {
          totalIncidents: demoThreat.length,
          severityBreakdown: {
            critical: demoThreat.filter((t) => t.severity === 'critical').length,
            high: demoThreat.filter((t) => t.severity === 'high').length,
            medium: demoThreat.filter((t) => t.severity === 'medium').length,
            low: demoThreat.filter((t) => t.severity === 'low').length,
            informational: demoThreat.filter((t) => t.severity === 'informational').length,
          },
          attackTypeBreakdown: {},
          mitreTechniques: [],
          endpointBreakdown: {},
        },
        threatIntelStatus: {
          geminiConfigured: true,
          model: 'gemini-1.5-flash (demo)',
          lastAnalyzed: new Date().toISOString(),
          analysisMode: 'gemini',
        },
        threatIntelTotal: demoThreat.length,
        endpoints: activeEndpoints,
        allEndpoints: knownEndpoints,
      }
    } else if (prefs.dataSource === 'live' && live.data) {
      const allKnown = live.data.endpoints.length ? live.data.endpoints : knownEndpoints
      const activeEndpoints = isFiltered ? allKnown.filter((ep) => ep.agentId === sel || ep.id === sel) : allKnown

      // Client-side confirmation filter (guarantees zero mixed endpoint data)
      const alerts = isFiltered
        ? live.data.alerts.filter((a) => a.agentId === sel || a.agent?.id === sel || a.endpoint === sel)
        : live.data.alerts
      const fim = isFiltered
        ? live.data.fim.filter((f) => f.agentId === sel || f.agent?.id === sel || f.endpoint === sel)
        : live.data.fim
      const authentication = isFiltered
        ? live.data.authentication.filter((au) => au.agentId === sel || au.agent?.id === sel || au.endpoint === sel)
        : live.data.authentication
      const powershell = isFiltered
        ? live.data.powershell.filter((ps) => ps.agentId === sel || ps.agent?.id === sel || ps.endpoint === sel)
        : live.data.powershell
      const applications = isFiltered
        ? (live.data.applications || []).filter((a) => a.agentId === sel || a.agent?.id === sel || a.endpoint === sel)
        : (live.data.applications || [])
      const applicationsHistory = isFiltered
        ? (live.data.applicationsHistory || []).filter((h) => h.agentId === sel || h.endpoint === sel)
        : (live.data.applicationsHistory || [])
      const threatIntel = isFiltered
        ? (live.data.threatIntel || []).filter((t) => t.agentId === sel || t.affectedEndpoint === sel)
        : (live.data.threatIntel || [])

      base = {
        source: 'live',
        selectedEndpoint: sel,
        alerts,
        fim,
        fimMetrics: live.data.fimMetrics || null,
        fimTotal: live.data.fimTotal || 0,
        authentication,
        authMetrics: live.data.authMetrics || null,
        authTotal: live.data.authTotal || 0,
        powershell,
        powershellMetrics: live.data.powershellMetrics || null,
        powershellTotal: live.data.powershellTotal || 0,
        rules: live.data.rules.length ? live.data.rules : catalogRules,
        rulesMetrics: live.data.rulesMetrics || null,
        rulesTotal: live.data.rulesTotal || 0,
        applications,
        applicationsMetrics: live.data.applicationsMetrics || null,
        applicationsTotal: live.data.applicationsTotal || applications.length,
        applicationsHistory,
        applicationsPublishers: live.data.applicationsPublishers || [],
        threatIntel,
        threatIntelMetrics: live.data.threatIntelMetrics || null,
        threatIntelStatus: live.data.threatIntelStatus || null,
        threatIntelTotal: live.data.threatIntelTotal || threatIntel.length,
        endpoints: activeEndpoints,
        allEndpoints: allKnown,
      }
    } else {
      const allKnown = knownEndpoints
      const activeEndpoints = isFiltered ? allKnown.filter((ep) => ep.agentId === sel || ep.id === sel) : allKnown
      base = {
        source: prefs.dataSource === 'live' ? 'live' : 'unconnected',
        selectedEndpoint: sel,
        alerts: [],
        fim: [],
        authentication: [],
        powershell: [],
        rules: catalogRules,
        applications: [],
        applicationsMetrics: null,
        applicationsTotal: 0,
        applicationsHistory: [],
        applicationsPublishers: [],
        threatIntel: [],
        threatIntelMetrics: null,
        threatIntelStatus: null,
        threatIntelTotal: 0,
        endpoints: activeEndpoints,
        allEndpoints: allKnown,
      }
    }
    return { ...base, alerts: applyStatus(base.alerts, statusOverrides) }
  }, [catalogRules, demo, live.data, prefs.dataSource, prefs.selectedEndpoint, statusOverrides])

  const connection = useMemo(() => {
    if (prefs.dataSource === 'demo') {
      return { tone: 'warn', label: 'Not connected', detail: 'Demonstration data' }
    }
    if (prefs.dataSource === 'unconnected' || prefs.dataSource === 'catalog') {
      return { tone: 'idle', label: 'Not connected', detail: 'Unconnected mode' }
    }
    if (live.loading) return { tone: 'idle', label: 'Querying', detail: 'GuardX API' }
    if (live.error) return { tone: 'bad', label: 'Unreachable', detail: 'GuardX API' }
    if (live.data?.health?.ok) return { tone: 'ok', label: 'Connected', detail: 'GuardX API' }
    if (live.data) return { tone: 'warn', label: 'Response received', detail: 'Health not confirmed' }
    return { tone: 'idle', label: 'Not connected', detail: 'Live API' }
  }, [live.data, live.error, live.loading, prefs.dataSource])

  const setAlertStatus = useCallback((id, status) => {
    setStatusOverrides((current) => ({ ...current, [id]: status }))
  }, [])

  const clearLocalRecords = useCallback(() => {
    localStorage.removeItem('guardx.notes')
    localStorage.removeItem('guardx.watchlist')
    setLocalEpoch((value) => value + 1)
  }, [])

  const value = {
    environment,
    prefs,
    updatePrefs: (patch) => setPrefs((current) => ({ ...current, ...patch })),
    selectedEndpoint: prefs.selectedEndpoint || 'all',
    setSelectedEndpoint,
    asOf,
    timeRange,
    setTimeRange,
    refresh,
    mobileNavOpen,
    setMobileNavOpen,
    dataset,
    connection,
    live,
    probe,
    queryApi,
    setAlertStatus,
    localEpoch,
    clearLocalRecords,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
