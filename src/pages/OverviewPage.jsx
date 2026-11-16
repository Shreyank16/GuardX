import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Database,
  ExternalLink,
  FileSearch,
  KeyRound,
  Layers,
  Monitor,
  Server,
  Shield,
  Terminal,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Badge,
  ConnectionPill,
  DataTable,
  EmptyState,
  StatusDot,
} from '../components'
import { useApp } from '../hooks/useApp'
import { usePageTitle } from '../hooks/usePageTitle'
import { formatTimestamp, statusLabel } from '../utils/format'
import {
  activityPoints,
  buildSeries,
  countSeverities,
  detectionSummary,
  rangeHasData,
} from '../utils/records'
import { inRange } from '../utils/time'

/**
 * Custom dark tooltip for Recharts activity timeline
 */
function CustomTimelineTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null

  const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0)

  return (
    <div
      style={{
        background: '#0d1014',
        border: '1px solid var(--color-line)',
        padding: '8px 12px',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--color-ink-strong)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ color: 'var(--color-faint)', marginBottom: 6, fontSize: 10 }}>
        BUCKET: {label} · {total} TOTAL
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {payload.map((entry) => (
          <div
            key={entry.dataKey}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              color: entry.color,
            }}
          >
            <span style={{ textTransform: 'uppercase' }}>{entry.name}:</span>
            <span style={{ fontWeight: 600 }}>{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function OverviewPage() {
  usePageTitle('Overview')
  const navigate = useNavigate()
  const { dataset, timeRange, asOf, environment, selectedEndpoint } = useApp()

  const isDemo = dataset.source === 'demo'
  const isUnconnected = dataset.source === 'unconnected'

  // Time-filtered alerts
  const timeFilteredAlerts = useMemo(() => {
    return dataset.alerts.filter((alert) => inRange(alert.timestamp, timeRange, asOf))
  }, [dataset.alerts, timeRange, asOf])

  // Severity counts
  const severityCounts = useMemo(() => {
    return countSeverities(timeFilteredAlerts)
  }, [timeFilteredAlerts])

  // Summary statistics across domains
  const summary = useMemo(() => {
    return detectionSummary(dataset, timeRange, asOf)
  }, [dataset, timeRange, asOf])

  // Timeline chart points & series
  const timelineSeries = useMemo(() => {
    const points = activityPoints(dataset, timeRange, asOf)
    return buildSeries(points, timeRange, asOf)
  }, [dataset, timeRange, asOf])

  const hasTimelineData = rangeHasData(timelineSeries)

  // Recent alerts (up to 5)
  const recentAlerts = useMemo(() => {
    return [...timeFilteredAlerts]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5)
  }, [timeFilteredAlerts])

  // Recent authentications (up to 5)
  const recentAuth = useMemo(() => {
    return [...dataset.authentication]
      .filter((e) => inRange(e.timestamp, timeRange, asOf))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5)
  }, [dataset.authentication, timeRange, asOf])

  // Compact endpoints for Overview (first 3-4 endpoints)
  const overviewEndpoints = useMemo(() => {
    return (dataset.endpoints || []).slice(0, 4)
  }, [dataset.endpoints])

  // Compact detection rules for Overview (5-8 relevant rules, prioritized by live alert activity)
  const overviewRules = useMemo(() => {
    if (!dataset.rules || !dataset.rules.length) return []
    const sorted = [...dataset.rules].sort((a, b) => {
      if (Boolean(a.liveAlertsVerified) !== Boolean(b.liveAlertsVerified)) {
        return a.liveAlertsVerified ? -1 : 1
      }
      return (b.alertCount || 0) - (a.alertCount || 0) || (b.level || 0) - (a.level || 0)
    })
    return sorted.slice(0, 6)
  }, [dataset.rules])

  // Table columns for Recent Alerts
  const alertColumns = [
    {
      key: 'severity',
      label: 'Severity',
      width: '120px',
      render: (val, row) => <Badge severity={val} level={row.level} showDot />,
    },
    {
      key: 'ruleId',
      label: 'Rule ID',
      width: '100px',
      mono: true,
      render: (val) => val || '—',
    },
    {
      key: 'description',
      label: 'Description',
      render: (val, row) => (
        <span
          className="hover:underline cursor-pointer"
          style={{ color: 'var(--color-ink-strong)' }}
          onClick={() => navigate(`/alerts/${row.id}`)}
        >
          {val}
        </span>
      ),
    },
    {
      key: 'endpoint',
      label: 'Endpoint',
      width: '110px',
      mono: true,
    },
    {
      key: 'timestamp',
      label: 'Timestamp',
      width: '160px',
      mono: true,
      render: (val) => formatTimestamp(val),
    },
    {
      key: 'status',
      label: 'Status',
      width: '90px',
      render: (val) => (
        <span
          className="font-mono text-[10px] uppercase tracking-wider"
          style={{
            color: val === 'closed' ? 'var(--color-faint)' : 'var(--color-warn)',
          }}
        >
          {statusLabel(val)}
        </span>
      ),
    },
  ]

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* ── 1. Page Header & Security Posture Bar ── */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6"
        style={{ borderBottom: '1px solid var(--color-line)' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={17} style={{ color: 'var(--color-accent)' }} />
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
              Security Operations Center
            </h1>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 border uppercase"
              style={{
                background: 'var(--color-panel-2)',
                borderColor: 'var(--color-line)',
                color: 'var(--color-faint)',
              }}
            >
              Overview
            </span>
          </div>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--color-muted)',
              margin: 0,
            }}
          >
            Active SIEM monitoring console for Wazuh {environment.managerVersion} on {environment.managerOs}.
          </p>
        </div>

        {/* Environment metadata & Connection state */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 border font-mono text-[11px]"
            style={{
              background: 'var(--color-panel)',
              borderColor: selectedEndpoint !== 'all' ? 'var(--color-accent)' : 'var(--color-line)',
              color: selectedEndpoint !== 'all' ? 'var(--color-ink-strong)' : 'var(--color-muted)',
            }}
          >
            <Server size={12} style={{ color: selectedEndpoint !== 'all' ? 'var(--color-accent)' : 'var(--color-muted)' }} />
            <span>
              {selectedEndpoint === 'all'
                ? `All Endpoints (${dataset.allEndpoints?.length || dataset.endpoints?.length || 0})`
                : `${dataset.endpoints?.[0]?.name || 'Agent'} (${selectedEndpoint})`}
            </span>
          </div>

          <ConnectionPill showDetail />

          <Link
            to="/settings"
            className="gx-btn"
            style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
          >
            <span>Config</span>
            <ExternalLink size={10} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* ── 2. Data Mode Notice (if unconnected or demo) ── */}
      {isUnconnected && (
        <div
          role="status"
          className="mb-6 p-3 border flex items-center justify-between gap-3"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
            color: 'var(--color-faint)',
            fontSize: '12px',
          }}
        >
          <div className="flex items-center gap-2.5">
            <Database size={15} style={{ color: 'var(--color-faint)' }} />
            <span>
              <strong style={{ color: 'var(--color-ink-strong)' }}>Unconnected Mode:</strong>{' '}
              Default state active. No live Wazuh backend is connected, and synthetic events are not simulated. Metrics and security queues reflect verified zero telemetry.
            </span>
          </div>
          <Link
            to="/settings"
            className="text-[11px] font-mono text-accent hover:underline flex items-center gap-1 shrink-0"
            style={{ color: 'var(--color-accent-2)' }}
          >
            <span>Configure Backend / Demo</span>
            <ArrowRight size={11} />
          </Link>
        </div>
      )}

      {/* ── 3. Severity Metric Cards (4 Grid) ── */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
      >
        {/* Critical */}
        <div
          className="p-3.5 border relative overflow-hidden"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
            borderTop: '2px solid var(--color-critical)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="font-mono text-[10px] uppercase tracking-wider font-semibold"
              style={{ color: 'var(--color-critical)' }}
            >
              Critical Severity
            </span>
            <StatusDot tone="bad" size={6} />
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '24px',
              fontWeight: 600,
              color: severityCounts.critical > 0 ? '#ea7a7a' : 'var(--color-ink-strong)',
              lineHeight: 1.1,
            }}
          >
            {severityCounts.critical}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--color-faint)',
              marginTop: 4,
            }}
          >
            {isDemo ? 'Synthetic alerts' : isUnconnected ? 'Unconnected mode' : 'Level 15–16 alerts'}
          </div>
        </div>

        {/* High */}
        <div
          className="p-3.5 border relative overflow-hidden"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
            borderTop: '2px solid var(--color-high)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="font-mono text-[10px] uppercase tracking-wider font-semibold"
              style={{ color: 'var(--color-high)' }}
            >
              High Severity
            </span>
            <StatusDot tone="warn" size={6} />
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '24px',
              fontWeight: 600,
              color: severityCounts.high > 0 ? '#e89e5a' : 'var(--color-ink-strong)',
              lineHeight: 1.1,
            }}
          >
            {severityCounts.high}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--color-faint)',
              marginTop: 4,
            }}
          >
            {isDemo ? 'Synthetic alerts' : isUnconnected ? 'Unconnected mode' : 'Level 12–14 alerts'}
          </div>
        </div>

        {/* Medium */}
        <div
          className="p-3.5 border relative overflow-hidden"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
            borderTop: '2px solid var(--color-medium)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="font-mono text-[10px] uppercase tracking-wider font-semibold"
              style={{ color: 'var(--color-medium)' }}
            >
              Medium Severity
            </span>
            <StatusDot tone="idle" size={6} />
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '24px',
              fontWeight: 600,
              color: severityCounts.medium > 0 ? '#ddb974' : 'var(--color-ink-strong)',
              lineHeight: 1.1,
            }}
          >
            {severityCounts.medium}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--color-faint)',
              marginTop: 4,
            }}
          >
            {isDemo ? 'Synthetic alerts' : isUnconnected ? 'Unconnected mode' : 'Level 7–11 alerts'}
          </div>
        </div>

        {/* Low / Informational */}
        <div
          className="p-3.5 border relative overflow-hidden"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
            borderTop: '2px solid var(--color-low)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="font-mono text-[10px] uppercase tracking-wider font-semibold"
              style={{ color: 'var(--color-low)' }}
            >
              Low / Info
            </span>
            <StatusDot tone="idle" size={6} />
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '24px',
              fontWeight: 600,
              color: 'var(--color-ink-strong)',
              lineHeight: 1.1,
            }}
          >
            {severityCounts.low + severityCounts.informational}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--color-faint)',
              marginTop: 4,
            }}
          >
            {isDemo ? 'Synthetic alerts' : isUnconnected ? 'Unconnected mode' : 'Level 0–6 telemetry'}
          </div>
        </div>
      </div>

      {/* ── 4. Main Two-Column Layout: Activity Timeline & Endpoint Health / Rules ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-start">
        {/* Left 2 Cols: Activity Timeline Chart */}
        <div
          className="lg:col-span-2 border flex flex-col"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-2.5 border-b"
            style={{
              background: 'var(--color-sidebar)',
              borderColor: 'var(--color-line)',
            }}
          >
            <div className="flex items-center gap-2">
              <Layers size={14} style={{ color: 'var(--color-accent)' }} />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--color-ink-strong)',
                }}
              >
                Security Telemetry Timeline
              </span>
              {isDemo && (
                <span className="text-[9px] font-mono text-warn border border-amber-900/50 px-1 py-0.2 bg-amber-950/20">
                  DEMO DATA
                </span>
              )}
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--color-faint)',
              }}
            >
              Window: {timeRange}
            </span>
          </div>

          <div className="p-4 flex flex-col justify-center">
            {hasTimelineData ? (
              <div className="w-full h-[230px] sm:h-[265px] lg:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={timelineSeries}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="2 2"
                      stroke="#1e242c"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      stroke="#56606d"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#2a3038' }}
                      fontFamily="var(--font-mono)"
                    />
                    <YAxis
                      stroke="#56606d"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#2a3038' }}
                      fontFamily="var(--font-mono)"
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      content={<CustomTimelineTooltip />}
                      cursor={{ fill: '#181d24', opacity: 0.5 }}
                    />
                    <Bar
                      dataKey="critical"
                      name="Critical"
                      stackId="a"
                      fill="#c85a5a"
                    />
                    <Bar
                      dataKey="high"
                      name="High"
                      stackId="a"
                      fill="#d08a45"
                    />
                    <Bar
                      dataKey="medium"
                      name="Medium"
                      stackId="a"
                      fill="#c9a45d"
                    />
                    <Bar
                      dataKey="low"
                      name="Low"
                      stackId="a"
                      fill="#7393ad"
                    />
                    <Bar
                      dataKey="informational"
                      name="Info"
                      stackId="a"
                      fill="#8e969f"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="w-full h-[230px] sm:h-[265px] lg:h-[300px] flex items-center justify-center">
                <EmptyState
                  compact
                  title="No Timeline Activity"
                  description={
                    isUnconnected
                      ? 'In unconnected mode, security events are not collected or simulated. Connect to the Wazuh backend or enable demonstration data in Settings to view activity graphs.'
                      : 'No telemetry events match the selected time range.'
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Endpoint Inventory & Detection Rules */}
        <div className="flex flex-col gap-4">
          {/* Endpoint Inventory Panel */}
          <div
            className="border flex flex-col"
            style={{
              background: 'var(--color-panel)',
              borderColor: 'var(--color-line)',
            }}
          >
            <div
              className="flex items-center justify-between px-3.5 py-2 border-b"
              style={{
                background: 'var(--color-sidebar)',
                borderColor: 'var(--color-line)',
              }}
            >
              <div className="flex items-center gap-2">
                <Monitor size={13} style={{ color: 'var(--color-accent)' }} />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--color-ink-strong)',
                  }}
                >
                  Endpoint Inventory
                </span>
                <span
                  className="text-[9px] font-mono px-1 py-0.2 border"
                  style={{
                    background: 'var(--color-panel-2)',
                    borderColor: 'var(--color-line)',
                    color: 'var(--color-faint)',
                  }}
                >
                  {dataset.endpoints.length}
                </span>
              </div>
              <Link
                to="/endpoints"
                className="text-[10px] font-mono text-accent hover:underline flex items-center gap-1"
                style={{ color: 'var(--color-accent-2)' }}
              >
                <span>View All</span>
                <ArrowRight size={10} />
              </Link>
            </div>

            <div className="p-3 flex flex-col gap-2.5">
              {overviewEndpoints.length > 0 ? (
                overviewEndpoints.map((ep) => (
                  <div
                    key={ep.id}
                    className="p-2.5 border"
                    style={{
                      background: 'var(--color-panel-2)',
                      borderColor: 'var(--color-line)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusDot state={ep.status} size={6} />
                        <span
                          className="truncate"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 600,
                            fontSize: '12px',
                            color: 'var(--color-ink-strong)',
                          }}
                        >
                          {ep.name}
                        </span>
                        <span className="font-mono text-[10px] text-faint">
                          ({ep.agentId})
                        </span>
                      </div>
                      <span
                        className="font-mono text-[9px] uppercase px-1.5 py-0.5 border shrink-0"
                        style={{
                          background: 'var(--color-panel)',
                          borderColor: 'var(--color-line)',
                          color:
                            ep.status === 'online'
                              ? 'var(--color-accent)'
                              : 'var(--color-warn)',
                        }}
                      >
                        {ep.status}
                      </span>
                    </div>

                    <div
                      className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] font-mono"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      <div className="truncate">
                        <span style={{ color: 'var(--color-faint)' }}>OS:</span>{' '}
                        {typeof ep.os === 'object' && ep.os !== null
                          ? ep.os.name || ep.os.platform || 'Windows'
                          : ep.os || 'Windows'}
                      </div>
                      <div className="truncate">
                        <span style={{ color: 'var(--color-faint)' }}>IP:</span> {ep.ip || 'Unreported'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  className="p-3 text-center text-[11px] font-mono"
                  style={{ color: 'var(--color-faint)' }}
                >
                  No endpoints registered
                </div>
              )}

              {dataset.endpoints.length > overviewEndpoints.length && (
                <div className="text-[10px] font-mono text-faint text-center pt-0.5">
                  +{dataset.endpoints.length - overviewEndpoints.length} additional endpoint{dataset.endpoints.length - overviewEndpoints.length > 1 ? 's' : ''} in inventory
                </div>
              )}
            </div>
          </div>

          {/* Compact Detection Rules Panel */}
          <div
            className="border flex flex-col"
            style={{
              background: 'var(--color-panel)',
              borderColor: 'var(--color-line)',
            }}
          >
            <div
              className="flex items-center justify-between px-3.5 py-2 border-b"
              style={{
                background: 'var(--color-sidebar)',
                borderColor: 'var(--color-line)',
              }}
            >
              <div className="flex items-center gap-2">
                <Shield size={13} style={{ color: 'var(--color-accent)' }} />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--color-ink-strong)',
                  }}
                >
                  Detection Rules
                </span>
                <span
                  className="text-[9px] font-mono px-1 py-0.2 border"
                  style={{
                    background: 'var(--color-panel-2)',
                    borderColor: 'var(--color-line)',
                    color: 'var(--color-faint)',
                  }}
                >
                  {dataset.rules.length}
                </span>
              </div>
              <Link
                to="/rules"
                className="text-[10px] font-mono text-accent hover:underline flex items-center gap-1"
                style={{ color: 'var(--color-accent-2)' }}
              >
                <span>View All</span>
                <ArrowRight size={10} />
              </Link>
            </div>

            <div className="p-3 flex flex-col gap-1.5">
              {overviewRules.length > 0 ? (
                overviewRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between gap-2 py-1 px-1.5 border"
                    style={{
                      background: 'var(--color-panel-2)',
                      borderColor: 'var(--color-line)',
                    }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="font-mono text-[11px] font-semibold shrink-0"
                        style={{ color: 'var(--color-ink-strong)' }}
                      >
                        {rule.id}
                      </span>
                      <span
                        className="text-[9px] font-mono px-1 py-0.2 border shrink-0"
                        style={{
                          background: 'var(--color-panel)',
                          borderColor: 'var(--color-line)',
                          color:
                            rule.level >= 12
                              ? 'var(--color-critical)'
                              : rule.level >= 7
                                ? 'var(--color-medium)'
                                : 'var(--color-faint)',
                        }}
                      >
                        L{rule.level}
                      </span>
                      <span
                        className="text-[10px] truncate"
                        style={{ color: 'var(--color-muted)' }}
                        title={rule.name || rule.description}
                      >
                        {rule.name || rule.description || 'Configured rule'}
                      </span>
                    </div>

                    <span
                      className="font-mono text-[9px] uppercase px-1 py-0.2 border shrink-0"
                      style={{
                        borderColor: rule.liveAlertsVerified
                          ? 'var(--color-accent)'
                          : 'var(--color-line)',
                        color: rule.liveAlertsVerified
                          ? 'var(--color-accent-2)'
                          : 'var(--color-faint)',
                        background: rule.liveAlertsVerified
                          ? 'rgba(74, 222, 128, 0.05)'
                          : 'transparent',
                      }}
                    >
                      {rule.liveAlertsVerified ? 'Verified' : 'Active'}
                    </span>
                  </div>
                ))
              ) : (
                <div
                  className="p-3 text-center text-[11px] font-mono"
                  style={{ color: 'var(--color-faint)' }}
                >
                  No rules in inventory
                </div>
              )}

              {dataset.rules.length > overviewRules.length && (
                <div className="flex items-center justify-between pt-1 border-t border-[var(--color-line)] text-[10px] font-mono text-faint">
                  <span>Showing {overviewRules.length} of {dataset.rules.length} rules</span>
                  <Link
                    to="/rules"
                    className="hover:underline flex items-center gap-0.5"
                    style={{ color: 'var(--color-accent-2)' }}
                  >
                    <span>Explore all</span>
                    <ArrowRight size={9} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Recent Security Alerts Table ── */}
      <div
        className="border mb-6 flex flex-col"
        style={{
          background: 'var(--color-panel)',
          borderColor: 'var(--color-line)',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b"
          style={{
            background: 'var(--color-sidebar)',
            borderColor: 'var(--color-line)',
          }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} style={{ color: 'var(--color-accent)' }} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--color-ink-strong)',
              }}
            >
              Recent Security Alerts
            </span>
            <span
              className="text-[10px] font-mono px-1.5 py-0.2 border"
              style={{
                background: 'var(--color-panel-2)',
                borderColor: 'var(--color-line)',
                color: 'var(--color-faint)',
              }}
            >
              {recentAlerts.length} shown
            </span>
          </div>

          <Link
            to="/alerts"
            className="text-[10px] font-mono text-accent hover:underline flex items-center gap-1"
            style={{ color: 'var(--color-accent-2)' }}
          >
            <span>View All Alerts</span>
            <ArrowRight size={10} />
          </Link>
        </div>

        <DataTable
          columns={alertColumns}
          data={recentAlerts}
          keyField="id"
          emptyState={
            <EmptyState
              compact
              title="No Recent Alerts"
              description={
                isUnconnected
                  ? 'GuardX is operating in unconnected mode. No live alert telemetry has been ingested.'
                  : 'No security alerts were triggered in the current observation window.'
              }
            />
          }
        />
      </div>

      {/* ── 6. Three-Domain Telemetry Summary Grid (Auth, FIM, PowerShell) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Authentication Summary */}
        <div
          className="border flex flex-col"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
          }}
        >
          <div
            className="flex items-center justify-between px-3.5 py-2.5 border-b"
            style={{
              background: 'var(--color-sidebar)',
              borderColor: 'var(--color-line)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <KeyRound size={13} style={{ color: 'var(--color-accent)' }} />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--color-ink-strong)',
                }}
              >
                Authentication
              </span>
            </div>
            <Link
              to="/authentication"
              className="text-[10px] font-mono text-accent hover:underline flex items-center gap-1"
              style={{ color: 'var(--color-accent-2)' }}
            >
              <span>Details</span>
              <ArrowRight size={10} />
            </Link>
          </div>

          <div className="p-3.5 flex flex-col gap-2.5 flex-1">
            <div className="flex items-center justify-between text-[11px] font-mono border-b pb-2" style={{ borderColor: 'var(--color-line)' }}>
              <span style={{ color: 'var(--color-faint)' }}>Logon Failures (4625):</span>
              <strong style={{ color: summary.authenticationFailures > 0 ? 'var(--color-critical)' : 'var(--color-ink-strong)' }}>
                {summary.authenticationFailures}
              </strong>
            </div>

            <div className="flex-1">
              {recentAuth.length > 0 ? (
                <div className="flex flex-col gap-1.5 mt-1">
                  {recentAuth.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="p-1.5 text-[10px] font-mono border flex items-center justify-between"
                      style={{
                        background: 'var(--color-panel-2)',
                        borderColor: 'var(--color-line)',
                      }}
                    >
                      <span className="truncate max-w-[130px] text-ink-strong">
                        {item.username || 'Unknown'}
                      </span>
                      <span
                        className="uppercase"
                        style={{
                          color: item.result === 'failure' ? 'var(--color-critical)' : 'var(--color-accent)',
                        }}
                      >
                        {item.result}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="p-4 text-center text-[11px] font-mono flex items-center justify-center h-full"
                  style={{ color: 'var(--color-faint)' }}
                >
                  {isUnconnected ? 'Telemetry inactive' : 'No authentication events'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FIM Summary */}
        <div
          className="border flex flex-col"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
          }}
        >
          <div
            className="flex items-center justify-between px-3.5 py-2.5 border-b"
            style={{
              background: 'var(--color-sidebar)',
              borderColor: 'var(--color-line)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <FileSearch size={13} style={{ color: 'var(--color-accent)' }} />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--color-ink-strong)',
                }}
              >
                File Integrity
              </span>
            </div>
            <Link
              to="/fim"
              className="text-[10px] font-mono text-accent hover:underline flex items-center gap-1"
              style={{ color: 'var(--color-accent-2)' }}
            >
              <span>Details</span>
              <ArrowRight size={10} />
            </Link>
          </div>

          <div className="p-3.5 flex flex-col gap-2.5 flex-1">
            <div className="flex items-center justify-between text-[11px] font-mono border-b pb-2" style={{ borderColor: 'var(--color-line)' }}>
              <span style={{ color: 'var(--color-faint)' }}>Modified Files:</span>
              <strong style={{ color: summary.fileModifications > 0 ? 'var(--color-high)' : 'var(--color-ink-strong)' }}>
                {summary.fileModifications}
              </strong>
            </div>

            <div className="flex-1">
              {dataset.fim.length > 0 ? (
                <div className="flex flex-col gap-1.5 mt-1">
                  {dataset.fim.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="p-1.5 text-[10px] font-mono border flex items-center justify-between"
                      style={{
                        background: 'var(--color-panel-2)',
                        borderColor: 'var(--color-line)',
                      }}
                    >
                      <span className="truncate max-w-[140px] text-ink-strong" title={item.path}>
                        {item.path ? item.path.split('\\').pop() : 'File'}
                      </span>
                      <span className="uppercase text-faint">
                        {item.action}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="p-4 text-center text-[11px] font-mono flex items-center justify-center h-full"
                  style={{ color: 'var(--color-faint)' }}
                >
                  {isUnconnected ? 'Telemetry inactive' : 'No FIM modifications'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PowerShell Monitoring Summary */}
        <div
          className="border flex flex-col"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
          }}
        >
          <div
            className="flex items-center justify-between px-3.5 py-2.5 border-b"
            style={{
              background: 'var(--color-sidebar)',
              borderColor: 'var(--color-line)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <Terminal size={13} style={{ color: 'var(--color-accent)' }} />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--color-ink-strong)',
                }}
              >
                PowerShell
              </span>
            </div>
            <Link
              to="/powershell"
              className="text-[10px] font-mono text-accent hover:underline flex items-center gap-1"
              style={{ color: 'var(--color-accent-2)' }}
            >
              <span>Details</span>
              <ArrowRight size={10} />
            </Link>
          </div>

          <div className="p-3.5 flex flex-col gap-2.5 flex-1">
            <div className="flex items-center justify-between text-[11px] font-mono border-b pb-2" style={{ borderColor: 'var(--color-line)' }}>
              <span style={{ color: 'var(--color-faint)' }}>Script Blocks (4104):</span>
              <strong style={{ color: summary.powershellEvents > 0 ? 'var(--color-accent-2)' : 'var(--color-ink-strong)' }}>
                {summary.powershellEvents}
              </strong>
            </div>

            <div className="flex-1">
              {dataset.powershell.length > 0 ? (
                <div className="flex flex-col gap-1.5 mt-1">
                  {dataset.powershell.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="p-1.5 text-[10px] font-mono border flex items-center justify-between"
                      style={{
                        background: 'var(--color-panel-2)',
                        borderColor: 'var(--color-line)',
                      }}
                    >
                      <span className="truncate max-w-[140px] text-ink-strong" title={item.scriptBlock}>
                        {item.scriptBlock ? item.scriptBlock.split('\n')[0] : 'Script block'}
                      </span>
                      <span
                        className="uppercase"
                        style={{
                          color: item.ruleId ? 'var(--color-warn)' : 'var(--color-faint)',
                        }}
                      >
                        {item.classification || 'monitored'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="p-4 text-center text-[11px] font-mono flex items-center justify-center h-full"
                  style={{ color: 'var(--color-faint)' }}
                >
                  {isUnconnected ? 'Telemetry inactive' : 'No script blocks captured'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
