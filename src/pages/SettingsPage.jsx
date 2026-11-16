import { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  Server,
  Shield,
  Trash2,
  User,
  XCircle,
} from 'lucide-react'
import { Badge, ConnectionPill, StatusDot } from '../components'
import { environment, knownEndpoints, knownRules } from '../data/catalog'
import { useApp } from '../hooks/useApp'
import { usePageTitle } from '../hooks/usePageTitle'

export default function SettingsPage() {
  usePageTitle('Settings')
  const {
    prefs,
    updatePrefs,
    timeRange,
    setTimeRange,
    connection,
    live,
    probe,
    queryApi,
    clearLocalRecords,
  } = useApp()

  const [operatorInput, setOperatorInput] = useState(prefs.operatorName || 'Console operator')
  const [operatorSaved, setOperatorSaved] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearedNotice, setClearedNotice] = useState(false)
  const [pendingSource, setPendingSource] = useState(null)
  const [isProbing, setIsProbing] = useState(false)

  // Save operator name
  function handleSaveOperator(e) {
    e.preventDefault()
    updatePrefs({ operatorName: operatorInput.trim() || 'Console operator' })
    setOperatorSaved(true)
    setTimeout(() => setOperatorSaved(false), 2000)
  }

  // Handle data source switch with safety confirmation
  function handleSelectSource(source) {
    if (source === prefs.dataSource) return
    setPendingSource(source)
  }

  function confirmSourceSwitch() {
    if (!pendingSource) return
    updatePrefs({ dataSource: pendingSource })
    setPendingSource(null)
  }

  // Handle clear local records
  function handleConfirmClear() {
    clearLocalRecords()
    setShowClearConfirm(false)
    setClearedNotice(true)
    setTimeout(() => setClearedNotice(false), 3000)
  }

  // Handle manual API health probe
  async function handleTestApi() {
    setIsProbing(true)
    try {
      await queryApi()
    } finally {
      setIsProbing(false)
    }
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* ── Page Header ── */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6"
        style={{ borderBottom: '1px solid var(--color-line)' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
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
              Console Settings & Telemetry Config
            </h1>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 border uppercase"
              style={{
                background: 'var(--color-panel-2)',
                borderColor: 'var(--color-line)',
                color: 'var(--color-faint)',
              }}
            >
              Mode: {prefs.dataSource}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: 0 }}>
            Configure data sources, operator identity, local session persistence, and inspect Wazuh lab integration parameters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ConnectionPill showDetail />
        </div>
      </div>

      {/* ── Section 1: Data Source Mode ── */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Database size={15} style={{ color: 'var(--color-accent)' }} />
          <h2
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-strong)',
              margin: 0,
            }}
          >
            Telemetry Data Source Selection
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Unconnected Mode Card */}
          <div
            onClick={() => handleSelectSource('unconnected')}
            className="p-4 border cursor-pointer transition-colors relative"
            style={{
              background:
                prefs.dataSource === 'unconnected' ? 'var(--color-panel-2)' : 'var(--color-panel)',
              borderColor:
                prefs.dataSource === 'unconnected' ? 'var(--color-accent)' : 'var(--color-line)',
              borderLeft:
                prefs.dataSource === 'unconnected'
                  ? '4px solid var(--color-accent)'
                  : '1px solid var(--color-line)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-semibold uppercase text-ink-strong">
                Unconnected (Default)
              </span>
              <StatusDot tone={prefs.dataSource === 'unconnected' ? 'ok' : 'idle'} size={8} />
            </div>
            <p className="text-xs text-muted leading-relaxed m-0 mb-3">
              SOC safe baseline. Zero synthetic security events are fabricated. Endpoint and rule catalog specifications remain available.
            </p>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-accent">
              <CheckCircle2 size={12} />
              <span>SOC Requirement Compliant</span>
            </div>
          </div>

          {/* Demo Mode Card */}
          <div
            onClick={() => handleSelectSource('demo')}
            className="p-4 border cursor-pointer transition-colors relative"
            style={{
              background:
                prefs.dataSource === 'demo' ? 'var(--color-panel-2)' : 'var(--color-panel)',
              borderColor:
                prefs.dataSource === 'demo' ? '#ddb974' : 'var(--color-line)',
              borderLeft:
                prefs.dataSource === 'demo'
                  ? '4px solid #ddb974'
                  : '1px solid var(--color-line)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-semibold uppercase text-ink-strong">
                Demonstration (Synthetic)
              </span>
              <StatusDot tone={prefs.dataSource === 'demo' ? 'warn' : 'idle'} size={8} />
            </div>
            <p className="text-xs text-muted leading-relaxed m-0 mb-3">
              Generates deterministic mock security events (auth, FIM, PowerShell, alerts) for UI and workflow testing.
            </p>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#ddb974]">
              <AlertTriangle size={12} />
              <span>Synthetic Banner Displayed</span>
            </div>
          </div>

          {/* Live API Mode Card */}
          <div
            onClick={() => handleSelectSource('live')}
            className="p-4 border cursor-pointer transition-colors relative"
            style={{
              background:
                prefs.dataSource === 'live' ? 'var(--color-panel-2)' : 'var(--color-panel)',
              borderColor:
                prefs.dataSource === 'live' ? 'var(--color-accent)' : 'var(--color-line)',
              borderLeft:
                prefs.dataSource === 'live'
                  ? '4px solid var(--color-accent)'
                  : '1px solid var(--color-line)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-semibold uppercase text-ink-strong">
                Live Backend API
              </span>
              <StatusDot tone={connection.tone} size={8} />
            </div>
            <p className="text-xs text-muted leading-relaxed m-0 mb-3">
              Queries the authenticated backend proxy (/api/) communicating with the Wazuh Manager 4.14.7 daemon.
            </p>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-faint">
              <Server size={12} />
              <span>{connection.label} ({connection.detail})</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Operator & Console Preferences ── */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <User size={15} style={{ color: 'var(--color-accent)' }} />
          <h2
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-strong)',
              margin: 0,
            }}
          >
            Operator Identity & UI Preferences
          </h2>
        </div>

        <div
          className="p-4 border grid grid-cols-1 md:grid-cols-2 gap-6"
          style={{ background: 'var(--color-panel)', borderColor: 'var(--color-line)' }}
        >
          {/* Operator Name Form */}
          <div>
            <label className="block text-xs font-mono uppercase text-muted mb-1.5">
              Operator Call-Sign / Display Name
            </label>
            <form onSubmit={handleSaveOperator} className="flex gap-2">
              <input
                type="text"
                value={operatorInput}
                onChange={(e) => setOperatorInput(e.target.value)}
                placeholder="Console operator"
                className="gx-field flex-1"
                style={{ fontSize: '12px', height: '32px' }}
              />
              <button
                type="submit"
                className="gx-btn font-mono"
                style={{ height: '32px', fontSize: '11px', padding: '0 12px' }}
              >
                Save
              </button>
            </form>
            {operatorSaved && (
              <span className="text-[11px] text-accent mt-1 block font-mono">
                Operator preference updated.
              </span>
            )}
            <p className="text-[11px] text-faint mt-1.5 leading-normal">
              Stored in local browser storage (`guardx.preferences`). Displayed in the top bar and audit history.
            </p>
          </div>

          {/* Console Layout & Window Settings */}
          <div className="flex flex-col justify-between">
            <div>
              <label className="block text-xs font-mono uppercase text-muted mb-1.5">
                Default Observation Time Window
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="gx-field w-full"
                style={{ fontSize: '12px', height: '32px' }}
              >
                <option value="1h">Last 1 hour</option>
                <option value="6h">Last 6 hours</option>
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </div>

            <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-line)' }}>
              <div>
                <span className="text-xs font-medium text-ink-strong block">
                  Sidebar Collapsed State
                </span>
                <span className="text-[11px] text-faint block">
                  Keep navigation rail collapsed to maximize SOC workspace
                </span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(prefs.sidebarCollapsed)}
                onChange={(e) => updatePrefs({ sidebarCollapsed: e.target.checked })}
                className="cursor-pointer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Lab Environment Specifications ── */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Server size={15} style={{ color: 'var(--color-accent)' }} />
          <h2
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-strong)',
              margin: 0,
            }}
          >
            Verified SOC Lab Specifications
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Server Spec */}
          <div
            className="p-3.5 border text-xs"
            style={{ background: 'var(--color-panel)', borderColor: 'var(--color-line)' }}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b" style={{ borderColor: 'var(--color-line)' }}>
              <span className="font-mono uppercase font-semibold text-ink-strong">
                Wazuh Manager Core
              </span>
              <span className="font-mono text-[10px] text-accent">VERIFIED 4.14.7</span>
            </div>
            <dl className="grid grid-cols-3 gap-y-1.5 text-[11px] font-mono">
              <dt className="text-faint">Host OS:</dt>
              <dd className="col-span-2 text-ink">{environment.managerHost || 'Ubuntu Server 24.04 LTS'}</dd>
              <dt className="text-faint">Version:</dt>
              <dd className="col-span-2 text-ink">{environment.managerVersion || '4.14.7'}</dd>
              <dt className="text-faint">Architecture:</dt>
              <dd className="col-span-2 text-ink">Linux x86_64</dd>
              <dt className="text-faint">Rules Catalog:</dt>
              <dd className="col-span-2 text-ink">{knownRules.length} Defined Custom Rules</dd>
            </dl>
          </div>

          {/* Endpoint Spec */}
          <div
            className="p-3.5 border text-xs"
            style={{ background: 'var(--color-panel)', borderColor: 'var(--color-line)' }}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b" style={{ borderColor: 'var(--color-line)' }}>
              <span className="font-mono uppercase font-semibold text-ink-strong">
                Audited Endpoint: {knownEndpoints[0]?.name || 'JARVIS'}
              </span>
              <Badge severity="info" label="AGENT 002" />
            </div>
            <dl className="grid grid-cols-3 gap-y-1.5 text-[11px] font-mono">
              <dt className="text-faint">Agent ID:</dt>
              <dd className="col-span-2 text-ink">{knownEndpoints[0]?.id || '002'}</dd>
              <dt className="text-faint">Target OS:</dt>
              <dd className="col-span-2 text-ink">{knownEndpoints[0]?.os || 'Windows 11'}</dd>
              <dt className="text-faint">Agent Version:</dt>
              <dd className="col-span-2 text-ink">{knownEndpoints[0]?.version || '4.14.7'}</dd>
              <dt className="text-faint">Monitored FIM:</dt>
              <dd className="col-span-2 text-accent">C:\GuardX-Test</dd>
            </dl>
          </div>
        </div>
      </section>

      {/* ── Section 4: Live Backend API Diagnostic ── */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={15} style={{ color: 'var(--color-accent)' }} />
          <h2
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-strong)',
              margin: 0,
            }}
          >
            Backend API Health Probe
          </h2>
        </div>

        <div
          className="p-4 border"
          style={{ background: 'var(--color-panel)', borderColor: 'var(--color-line)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-medium text-ink-strong uppercase">
                  Endpoint Target:
                </span>
                <code className="text-xs px-1.5 py-0.5 bg-black/40 text-accent border border-white/5">
                  /api/health
                </code>
              </div>
              <p className="text-[11px] text-muted m-0 mt-1">
                Direct health check to verify backend reverse proxy connectivity to Wazuh Manager.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestApi}
              disabled={isProbing}
              className="gx-btn font-mono"
              style={{ fontSize: '11px', height: '30px', padding: '0 12px' }}
            >
              <RefreshCw size={12} className={isProbing ? 'animate-spin' : ''} />
              <span>{isProbing ? 'Querying API...' : 'Test Connection'}</span>
            </button>
          </div>

          {/* Diagnostic Result */}
          {probe.error ? (
            <div
              className="p-3 border flex items-start gap-2.5 text-xs font-mono"
              style={{ background: '#221111', borderColor: '#4a2020', color: '#ff7b7b' }}
            >
              <XCircle size={15} className="shrink-0 mt-0.5" />
              <div>
                <strong>API Unreachable or Error:</strong> {probe.error}
                <div className="text-[10px] text-faint mt-1">
                  Expected if the Node/Python backend proxy server is not currently running. Unconnected mode remains the safe SOC default.
                </div>
              </div>
            </div>
          ) : probe.result ? (
            <div
              className="p-3 border flex items-start gap-2.5 text-xs font-mono"
              style={{ background: '#102419', borderColor: '#234d35', color: 'var(--color-accent-2)' }}
            >
              <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
              <div>
                <strong>Backend Proxy Responded OK:</strong>
                <pre className="text-[10px] mt-1 m-0 text-ink">
                  {JSON.stringify(probe.result, null, 2)}
                </pre>
              </div>
            </div>
          ) : live.loading ? (
            <div className="p-3 border text-xs font-mono text-muted" style={{ borderColor: 'var(--color-line)' }}>
              Polling backend proxy snapshot...
            </div>
          ) : (
            <div className="text-xs font-mono text-faint">
              Status: Idle. Click &quot;Test Connection&quot; to probe backend proxy endpoint.
            </div>
          )}

          {/* Staged Telemetry Integration Status */}
          {prefs.dataSource === 'live' && live.data?.available && (
            <div
              className="mt-3 pt-3 border-t grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono"
              style={{ borderColor: 'var(--color-line)' }}
            >
              <div className="flex items-center gap-1.5">
                <StatusDot tone="ok" size={6} />
                <span className="text-ink">Health Check:</span>
                <span className="text-accent text-[10px]">ONLINE</span>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusDot tone="ok" size={6} />
                <span className="text-ink">Alerts Telemetry:</span>
                <span className="text-accent text-[10px]">LIVE ({live.data.alerts.length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusDot tone={live.data.available?.endpoints ? 'ok' : 'idle'} size={6} />
                <span className={live.data.available?.endpoints ? 'text-ink' : 'text-faint'}>Endpoints:</span>
                <span className={live.data.available?.endpoints ? 'text-accent text-[10px]' : 'text-faint text-[10px]'}>
                  {live.data.available?.endpoints ? `LIVE (${live.data.endpoints.length})` : 'PENDING (STAGE 10.2)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusDot tone={live.data.available?.fim ? 'ok' : 'idle'} size={6} />
                <span className={live.data.available?.fim ? 'text-ink' : 'text-faint'}>File Integrity:</span>
                <span className={live.data.available?.fim ? 'text-accent text-[10px]' : 'text-faint text-[10px]'}>
                  {live.data.available?.fim ? `LIVE (${live.data.fim.length})` : 'PENDING (STAGE 10.3)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusDot tone={live.data.available?.authentication ? 'ok' : 'idle'} size={6} />
                <span className={live.data.available?.authentication ? 'text-ink' : 'text-faint'}>Authentication:</span>
                <span className={live.data.available?.authentication ? 'text-accent text-[10px]' : 'text-faint text-[10px]'}>
                  {live.data.available?.authentication ? `LIVE (${live.data.authentication.length})` : 'PENDING (STAGE 10.4)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusDot tone={live.data.available?.powershell ? 'ok' : 'idle'} size={6} />
                <span className={live.data.available?.powershell ? 'text-ink' : 'text-faint'}>PowerShell:</span>
                <span className={live.data.available?.powershell ? 'text-accent text-[10px]' : 'text-faint text-[10px]'}>
                  {live.data.available?.powershell ? `LIVE (${live.data.powershell.length})` : 'PENDING (STAGE 10.5)'}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Section 5: Local Storage Session Reset ── */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Trash2 size={15} style={{ color: 'var(--color-accent)' }} />
          <h2
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-strong)',
              margin: 0,
            }}
          >
            Session State & Local Overrides
          </h2>
        </div>

        <div
          className="p-4 border flex flex-wrap items-center justify-between gap-4"
          style={{ background: 'var(--color-panel)', borderColor: 'var(--color-line)' }}
        >
          <div>
            <span className="text-xs font-medium text-ink-strong block">
              Clear Local Session Overrides
            </span>
            <p className="text-[11px] text-muted m-0 mt-0.5">
              Purges alert disposition overrides, analyst notes, and investigation watchlists stored in browser memory.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="gx-btn font-mono"
            style={{
              height: '30px',
              fontSize: '11px',
              padding: '0 12px',
              borderColor: '#4a2020',
              color: '#ff7b7b',
            }}
          >
            <Trash2 size={12} />
            <span>Reset Local Session</span>
          </button>
        </div>

        {clearedNotice && (
          <div
            className="mt-2 p-2.5 border text-xs font-mono text-accent"
            style={{ background: '#102419', borderColor: '#234d35' }}
          >
            Local session state and overrides have been successfully cleared.
          </div>
        )}
      </section>

      {/* ── Section 6: Security Notice ── */}
      <div
        className="p-4 border flex items-start gap-3 text-xs leading-relaxed"
        style={{
          background: 'var(--color-panel)',
          borderColor: 'var(--color-line)',
          borderLeft: '4px solid var(--color-accent)',
        }}
      >
        <Shield size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
        <div>
          <strong style={{ color: 'var(--color-ink-strong)', fontFamily: 'var(--font-mono)' }}>
            MANDATORY ZERO-TRUST CREDENTIAL ISOLATION NOTICE:
          </strong>
          <p className="m-0 mt-1 text-muted">
            GuardX dashboard operates strictly as a zero-trust presentation layer. Wazuh Manager credentials (passwords, tokens, TLS client certificates) are <strong>never</strong> handled, stored in browser localStorage, or embedded into client bundles. All communications transit through a hardened backend gateway.
          </p>
        </div>
      </div>

      {/* ── Modal: Source Switch Confirmation ── */}
      {pendingSource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)' }}
          onClick={() => setPendingSource(null)}
        >
          <div
            className="p-5 border max-w-md w-full"
            style={{
              background: 'var(--color-canvas)',
              borderColor: 'var(--color-line)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-2 text-ink-strong font-mono uppercase text-xs font-semibold">
              <AlertTriangle size={15} style={{ color: '#ddb974' }} />
              Confirm Data Source Transition
            </div>
            <p className="text-xs text-muted leading-relaxed m-0 mb-4">
              {pendingSource === 'demo' ? (
                <>
                  Switching to <strong>Demonstration Mode</strong> will populate synthetic telemetry into the console. A persistent warning banner will be displayed to remind operators that the events are non-production mock data.
                </>
              ) : pendingSource === 'live' ? (
                <>
                  Switching to <strong>Live API Mode</strong> will attempt to query your Wazuh backend proxy at <code>/api/</code>. If the backend is not running, the dashboard will report an unreachable connection.
                </>
              ) : (
                <>
                  Switching to <strong>Unconnected Mode</strong> will clear any synthetic events and restore the safe SOC baseline where zero live events are fabricated.
                </>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingSource(null)}
                className="gx-btn font-mono"
                style={{ height: '30px', fontSize: '11px', padding: '0 12px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSourceSwitch}
                className="gx-btn font-mono"
                style={{
                  height: '30px',
                  fontSize: '11px',
                  padding: '0 12px',
                  borderColor: 'var(--color-accent)',
                  color: 'var(--color-accent-2)',
                  background: 'var(--color-panel-2)',
                }}
              >
                Confirm Switch to {pendingSource.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Clear Storage Confirmation ── */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)' }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="p-5 border max-w-md w-full"
            style={{
              background: 'var(--color-canvas)',
              borderColor: 'var(--color-line)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-2 text-ink-strong font-mono uppercase text-xs font-semibold">
              <Trash2 size={15} style={{ color: '#ff7b7b' }} />
              Reset Local Session Data
            </div>
            <p className="text-xs text-muted leading-relaxed m-0 mb-4">
              Are you sure you want to clear all local analyst notes, watchlists, and manual status overrides? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="gx-btn font-mono"
                style={{ height: '30px', fontSize: '11px', padding: '0 12px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                className="gx-btn font-mono"
                style={{
                  height: '30px',
                  fontSize: '11px',
                  padding: '0 12px',
                  borderColor: '#4a2020',
                  color: '#ff7b7b',
                  background: '#221111',
                }}
              >
                Yes, Clear Local Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
