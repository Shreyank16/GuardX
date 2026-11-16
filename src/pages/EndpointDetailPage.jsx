import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Cpu,
  FileSearch,
  KeyRound,
  Layers,
  Monitor,
  ScrollText,
  Server,
  Terminal,
} from 'lucide-react'
import {
  Badge,
  ConnectionPill,
  DataTable,
  EmptyState,
  JsonViewer,
  StatusDot,
} from '../components'
import { useApp } from '../hooks/useApp'
import { usePageTitle } from '../hooks/usePageTitle'
import { formatTimestamp, statusLabel } from '../utils/format'

export default function EndpointDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { dataset } = useApp()

  // Find endpoint by agentId or id
  const endpoint = useMemo(() => {
    return dataset.endpoints.find(
      (ep) => ep.agentId === id || ep.id === id || ep.name?.toLowerCase() === id?.toLowerCase(),
    )
  }, [dataset.endpoints, id])

  usePageTitle(endpoint ? `Endpoint · ${endpoint.name}` : 'Endpoint Not Found')

  const [activeTab, setActiveTab] = useState('alerts')

  // Related security alerts (safe with optional chaining)
  const relatedAlerts = useMemo(() => {
    if (!endpoint) return []
    return dataset.alerts.filter(
      (a) => a.agentId === endpoint.agentId || a.endpoint === endpoint.name,
    )
  }, [dataset.alerts, endpoint])

  // Related authentication events
  const relatedAuth = useMemo(() => {
    if (!endpoint) return []
    return dataset.authentication.filter(
      (a) => a.agentId === endpoint.agentId || a.endpoint === endpoint.name,
    )
  }, [dataset.authentication, endpoint])

  // Related FIM events
  const relatedFim = useMemo(() => {
    if (!endpoint) return []
    return dataset.fim.filter(
      (f) => f.agentId === endpoint.agentId || f.endpoint === endpoint.name,
    )
  }, [dataset.fim, endpoint])

  // Related PowerShell events
  const relatedPowerShell = useMemo(() => {
    if (!endpoint) return []
    return dataset.powershell.filter(
      (p) => p.agentId === endpoint.agentId || p.endpoint === endpoint.name,
    )
  }, [dataset.powershell, endpoint])

  // Not found handling
  if (!endpoint) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto' }}>
        <div className="mb-4">
          <Link
            to="/endpoints"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-faint hover:text-ink transition-colors"
            style={{ color: 'var(--color-faint)' }}
          >
            <ArrowLeft size={13} aria-hidden="true" />
            <span>Back to Endpoint Inventory</span>
          </Link>
        </div>

        <EmptyState
          title={`Endpoint "${id}" Not Found`}
          description={
            dataset.source === 'unconnected'
              ? `No agent matching ID "${id}" was found. In unconnected mode, only catalog endpoints (JARVIS / 002) are registered in the local inventory.`
              : `No registered agent with identifier "${id}" exists in the current endpoint inventory.`
          }
          action={
            <Link to="/endpoints" className="gx-btn">
              <span>Return to Endpoint Inventory</span>
            </Link>
          }
        />
      </div>
    )
  }

  // Relevant Detection Rules
  const relevantRules = dataset.rules

  // Alerts columns for the nested table
  const alertColumns = [
    {
      key: 'severity',
      label: 'Severity',
      width: '120px',
      render: (val, row) => <Badge severity={val} level={row.level} showDot showLevel />,
    },
    { key: 'ruleId', label: 'Rule ID', width: '90px', mono: true },
    {
      key: 'description',
      label: 'Description',
      render: (val, row) => (
        <span
          className="hover:underline cursor-pointer font-medium text-ink-strong"
          onClick={() => navigate(`/alerts/${row.id}`)}
        >
          {val}
        </span>
      ),
    },
    { key: 'timestamp', label: 'Timestamp', width: '150px', mono: true, render: (val) => formatTimestamp(val) },
    {
      key: 'status',
      label: 'Status',
      width: '90px',
      render: (val) => (
        <span className="font-mono text-[10px] uppercase text-faint">
          {statusLabel(val)}
        </span>
      ),
    },
  ]

  // Auth columns
  const authColumns = [
    {
      key: 'result',
      label: 'Result',
      width: '100px',
      render: (val) => (
        <span
          className="font-mono text-[10px] uppercase px-1.5 py-0.5 border"
          style={{
            borderColor: val === 'failure' ? '#522026' : '#234d35',
            color: val === 'failure' ? 'var(--color-critical)' : 'var(--color-accent)',
            background: val === 'failure' ? '#220f12' : '#102419',
          }}
        >
          {val}
        </span>
      ),
    },
    { key: 'eventId', label: 'Event ID', width: '90px', mono: true },
    { key: 'username', label: 'Account / User', width: '140px', mono: true },
    { key: 'sourceIp', label: 'Source IP', width: '120px', mono: true, render: (val) => val || '—' },
    { key: 'description', label: 'Details' },
    { key: 'timestamp', label: 'Timestamp', width: '150px', mono: true, render: (val) => formatTimestamp(val) },
  ]

  // FIM columns
  const fimColumns = [
    {
      key: 'action',
      label: 'Action',
      width: '100px',
      render: (val) => (
        <span className="font-mono text-[10px] uppercase text-faint border px-1.5 py-0.5">
          {val}
        </span>
      ),
    },
    { key: 'path', label: 'File Path', mono: true },
    { key: 'user', label: 'User', width: '110px', mono: true, render: (val) => val || '—' },
    { key: 'timestamp', label: 'Timestamp', width: '150px', mono: true, render: (val) => formatTimestamp(val) },
  ]

  // PowerShell columns
  const psColumns = [
    {
      key: 'classification',
      label: 'Classification',
      width: '120px',
      render: (val) => (
        <span
          className="font-mono text-[10px] uppercase px-1.5 py-0.5 border"
          style={{
            borderColor: val === 'rule-match' ? '#4a3518' : 'var(--color-line)',
            color: val === 'rule-match' ? 'var(--color-warn)' : 'var(--color-faint)',
          }}
        >
          {val}
        </span>
      ),
    },
    { key: 'eventId', label: 'Event ID', width: '90px', mono: true },
    {
      key: 'scriptBlock',
      label: 'Script Block',
      render: (val) => (
        <code className="font-mono text-[11px] truncate block max-w-lg text-ink-strong">
          {val ? val.split('\n')[0] : '—'}
        </code>
      ),
    },
    { key: 'timestamp', label: 'Timestamp', width: '150px', mono: true, render: (val) => formatTimestamp(val) },
  ]

  const isUnconnected = dataset.source === 'unconnected'

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1300, margin: '0 auto' }}>
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b" style={{ borderColor: 'var(--color-line)' }}>
        <div className="flex items-center gap-2 text-xs font-mono">
          <Link
            to="/endpoints"
            className="inline-flex items-center gap-1 text-faint hover:text-ink transition-colors"
            style={{ color: 'var(--color-faint)' }}
          >
            <ArrowLeft size={13} aria-hidden="true" />
            <span>Endpoints</span>
          </Link>
          <span style={{ color: 'var(--color-line)' }}>/</span>
          <span style={{ color: 'var(--color-ink-strong)' }}>{endpoint.name} ({endpoint.agentId})</span>
        </div>

        <div className="flex items-center gap-2">
          <ConnectionPill size="sm" />
        </div>
      </div>

      {/* ── Endpoint Header Card ── */}
      <div
        className="p-4 border mb-5 flex flex-wrap items-center justify-between gap-4"
        style={{
          background: 'var(--color-panel)',
          borderColor: 'var(--color-line)',
          borderLeft: '4px solid var(--color-accent)',
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span
              className="inline-flex items-center gap-1.5 font-mono text-xs uppercase px-2 py-0.5 border"
              style={{
                background: endpoint.status === 'online' ? 'var(--color-accent-soft)' : '#1b1d22',
                borderColor: endpoint.status === 'online' ? 'var(--color-accent)' : 'var(--color-line)',
                color: endpoint.status === 'online' ? 'var(--color-accent-2)' : 'var(--color-warn)',
              }}
            >
              <StatusDot state={endpoint.status} size={6} />
              <span>{statusLabel(endpoint.status)}</span>
            </span>

            <span
              className="font-mono text-xs text-faint border px-1.5 py-0.5"
              style={{ borderColor: 'var(--color-line)', background: 'var(--color-panel-2)' }}
            >
              AGENT ID {endpoint.agentId}
            </span>

            <span
              className="font-mono text-xs text-faint"
              style={{ color: 'var(--color-faint)' }}
            >
              {endpoint.os}
            </span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--color-ink-strong)',
              margin: '0 0 4px',
            }}
          >
            {endpoint.name}
          </h1>

          <p
            style={{
              fontSize: '12px',
              color: 'var(--color-muted)',
              margin: 0,
            }}
          >
            {endpoint.note || 'Registered Windows host in the GuardX telemetry inventory.'}
          </p>
        </div>

        {/* Verification Status Badge */}
        <div className="flex flex-col items-end gap-1 shrink-0 font-mono">
          <div className="text-[10px] uppercase text-faint" style={{ color: 'var(--color-faint)' }}>
            Manager Verification
          </div>
          <span
            className="text-xs uppercase px-2 py-1 border font-semibold"
            style={{
              background: '#19150b',
              borderColor: '#4d3714',
              color: 'var(--color-warn)',
            }}
          >
            Unverified (Catalog Profile)
          </span>
        </div>
      </div>

      {/* ── Metadata Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="p-3 border" style={{ background: 'var(--color-panel)', borderColor: 'var(--color-line)' }}>
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-faint mb-1">
            <Monitor size={12} style={{ color: 'var(--color-accent)' }} />
            <span>Operating System</span>
          </div>
          <div className="font-mono text-xs font-semibold text-ink-strong" style={{ color: 'var(--color-ink-strong)' }}>
            {endpoint.os}
          </div>
          <div className="text-[10px] font-mono text-faint mt-0.5">
            Architecture: x86_64
          </div>
        </div>

        <div className="p-3 border" style={{ background: 'var(--color-panel)', borderColor: 'var(--color-line)' }}>
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-faint mb-1">
            <Cpu size={12} style={{ color: 'var(--color-accent)' }} />
            <span>Agent Version</span>
          </div>
          <div className="font-mono text-xs font-semibold text-ink-strong" style={{ color: 'var(--color-ink-strong)' }}>
            Wazuh v{endpoint.version}
          </div>
          <div className="text-[10px] font-mono text-faint mt-0.5">
            Manager: v4.14.7
          </div>
        </div>

        <div className="p-3 border" style={{ background: 'var(--color-panel)', borderColor: 'var(--color-line)' }}>
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-faint mb-1">
            <Server size={12} style={{ color: 'var(--color-accent)' }} />
            <span>Assigned IP</span>
          </div>
          <div className="font-mono text-xs font-semibold text-ink-strong" style={{ color: 'var(--color-ink-strong)' }}>
            {endpoint.ip || <span className="text-faint font-normal">Not reported</span>}
          </div>
          <div className="text-[10px] font-mono text-faint mt-0.5">
            Registration IP: {endpoint.ip || 'Pending API'}
          </div>
        </div>

        <div className="p-3 border" style={{ background: 'var(--color-panel)', borderColor: 'var(--color-line)' }}>
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-faint mb-1">
            <Clock size={12} style={{ color: 'var(--color-accent)' }} />
            <span>Last Keepalive</span>
          </div>
          <div className="font-mono text-xs font-semibold text-ink-strong" style={{ color: 'var(--color-ink-strong)' }}>
            {endpoint.lastKeepAlive ? formatTimestamp(endpoint.lastKeepAlive) : <span className="text-faint font-normal">No keepalive</span>}
          </div>
          <div className="text-[10px] font-mono text-faint mt-0.5">
            Heartbeat: Unreported
          </div>
        </div>
      </div>

      {/* ── Relevant Custom Detection Rules Card ── */}
      <div
        className="p-3.5 border mb-5"
        style={{
          background: 'var(--color-panel)',
          borderColor: 'var(--color-line)',
        }}
      >
        <div className="flex items-center justify-between mb-2 pb-2 border-b" style={{ borderColor: 'var(--color-line)' }}>
          <div className="flex items-center gap-2">
            <ScrollText size={14} style={{ color: 'var(--color-accent)' }} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--color-ink-strong)',
              }}
            >
              Relevant Wazuh Detection Rules for Endpoint
            </span>
          </div>
          <Link to="/rules" className="text-[10px] font-mono text-accent hover:underline" style={{ color: 'var(--color-accent-2)' }}>
            View All Rules
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {relevantRules.map((rule) => (
            <div
              key={rule.id}
              className="p-2.5 border"
              style={{
                background: 'var(--color-panel-2)',
                borderColor: 'var(--color-line)',
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Badge severity={rule.severity} level={rule.level} showDot />
                  <span className="font-mono text-xs font-semibold text-ink-strong">
                    Rule {rule.id}
                  </span>
                </div>
                <span
                  className="font-mono text-[9px] uppercase px-1 py-0.2 border"
                  style={{
                    borderColor: rule.liveAlertsVerified ? 'var(--color-accent)' : 'var(--color-line)',
                    color: rule.liveAlertsVerified ? 'var(--color-accent-2)' : 'var(--color-faint)',
                  }}
                >
                  {rule.liveAlertsVerified ? 'Live Verified' : 'Unverified Live'}
                </span>
              </div>
              <div className="text-xs text-ink font-medium mb-1">
                {rule.name}
              </div>
              <div className="text-[10px] text-faint leading-relaxed" style={{ color: 'var(--color-faint)' }}>
                {rule.verificationNote}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Telemetry Tabs (Alerts, Auth, FIM, PowerShell, Raw) ── */}
      <div
        className="border flex flex-col mb-6"
        style={{
          background: 'var(--color-panel)',
          borderColor: 'var(--color-line)',
        }}
      >
        {/* Tab Headers */}
        <div
          className="flex flex-wrap items-center gap-1 px-3 pt-2 border-b select-none"
          style={{
            background: 'var(--color-sidebar)',
            borderColor: 'var(--color-line)',
          }}
        >
          {[
            { id: 'alerts', label: 'Security Alerts', count: relatedAlerts.length, icon: AlertTriangle },
            { id: 'auth', label: 'Authentication', count: relatedAuth.length, icon: KeyRound },
            { id: 'fim', label: 'File Integrity', count: relatedFim.length, icon: FileSearch },
            { id: 'powershell', label: 'PowerShell', count: relatedPowerShell.length, icon: Terminal },
            { id: 'raw', label: 'Raw Profile', icon: Layers },
          ].map((tab) => {
            const active = activeTab === tab.id
            const Icon = tab.icon

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs border-b-2 cursor-pointer transition-colors"
                style={{
                  background: active ? 'var(--color-panel)' : 'transparent',
                  borderColor: active ? 'var(--color-accent)' : 'transparent',
                  color: active ? 'var(--color-ink-strong)' : 'var(--color-faint)',
                  borderTopLeftRadius: '2px',
                  borderTopRightRadius: '2px',
                }}
              >
                <Icon size={12} />
                <span>{tab.label}</span>
                {tab.count != null && (
                  <span
                    className="text-[10px] px-1 py-0.2 border ml-0.5"
                    style={{
                      background: active ? 'var(--color-panel-2)' : 'transparent',
                      borderColor: 'var(--color-line)',
                      color: active ? 'var(--color-accent-2)' : 'var(--color-faint)',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="p-0">
          {activeTab === 'alerts' && (
            <DataTable
              columns={alertColumns}
              data={relatedAlerts}
              keyField="id"
              emptyState={
                <EmptyState
                  compact
                  title="No Endpoint Alerts"
                  description={
                    isUnconnected
                      ? 'No live alerts are available in unconnected mode for this endpoint.'
                      : 'No security alerts are associated with this endpoint in the current time window.'
                  }
                />
              }
            />
          )}

          {activeTab === 'auth' && (
            <DataTable
              columns={authColumns}
              data={relatedAuth}
              keyField="id"
              emptyState={
                <EmptyState
                  compact
                  title="No Authentication Events"
                  description={
                    isUnconnected
                      ? 'No live authentication events are available in unconnected mode.'
                      : 'No authentication events recorded for this endpoint.'
                  }
                />
              }
            />
          )}

          {activeTab === 'fim' && (
            <DataTable
              columns={fimColumns}
              data={relatedFim}
              keyField="id"
              emptyState={
                <EmptyState
                  compact
                  title="No FIM Activity"
                  description={
                    isUnconnected
                      ? 'No live file integrity changes are available in unconnected mode.'
                      : 'No syscheck file integrity modifications reported for this endpoint.'
                  }
                />
              }
            />
          )}

          {activeTab === 'powershell' && (
            <DataTable
              columns={psColumns}
              data={relatedPowerShell}
              keyField="id"
              emptyState={
                <EmptyState
                  compact
                  title="No PowerShell Telemetry"
                  description={
                    isUnconnected
                      ? 'No live script block events are available in unconnected mode.'
                      : 'No PowerShell script block events recorded for this endpoint.'
                  }
                />
              }
            />
          )}

          {activeTab === 'raw' && (
            <div className="p-3">
              <JsonViewer
                data={endpoint}
                title={`Endpoint Profile · Agent ${endpoint.agentId}`}
                maxHeight="400px"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
