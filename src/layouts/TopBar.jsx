import { useLocation } from 'react-router-dom'
import { Menu, RefreshCw, Server } from 'lucide-react'
import ConnectionPill from '../components/ConnectionPill'
import StatusDot from '../components/StatusDot'
import TimeRangePicker from '../components/TimeRangePicker'
import { useApp } from '../hooks/useApp'

/* ── Page title mapping ───────────────────────────────────────────────────── */

const TITLES = {
  '/':               'Overview',
  '/alerts':         'Alerts',
  '/endpoints':      'Endpoints',
  '/fim':            'File Integrity',
  '/authentication': 'Authentication',
  '/powershell':     'PowerShell',
  '/rules':          'Rules',
  '/settings':       'Settings',
}

function pageTitle(pathname) {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith('/alerts/'))    return 'Alert Detail'
  if (pathname.startsWith('/endpoints/')) return 'Endpoint Detail'
  return 'GuardX'
}

/* ── As-of time formatter (HH:MM:SS only — compact for the topbar) ───────── */

function asOfLabel(ts) {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/* ── TopBar ───────────────────────────────────────────────────────────────── */

export default function TopBar() {
  const { pathname } = useLocation()
  const {
    refresh,
    live,
    asOf,
    setMobileNavOpen,
    dataset,
    selectedEndpoint,
    setSelectedEndpoint,
  } = useApp()

  const allEndpoints = dataset.allEndpoints || dataset.endpoints || []
  const currentEndpoint = allEndpoints.find(
    (ep) => ep.agentId === selectedEndpoint || ep.id === selectedEndpoint
  )

  return (
    <header className="gx-topbar" role="banner">

      {/* Mobile hamburger — hidden on desktop via CSS */}
      <button
        type="button"
        onClick={() => setMobileNavOpen(true)}
        className="gx-mobile-only"
        aria-label="Open navigation"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-muted)',
          cursor: 'pointer',
          padding: '0 2px',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Menu size={16} aria-hidden="true" />
      </button>

      {/* Page title — takes remaining space, truncates */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-ink-strong)',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {pageTitle(pathname)}
      </span>

      {/* ── Global Persistent Endpoint Selector & Indicator ── */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex items-center gap-1.5 px-2 py-1 border font-mono text-[11px]"
          style={{
            background: 'var(--color-panel)',
            borderColor: selectedEndpoint !== 'all' ? 'var(--color-accent)' : 'var(--color-line)',
          }}
        >
          <Server size={12} style={{ color: selectedEndpoint !== 'all' ? 'var(--color-accent)' : 'var(--color-muted)' }} />
          <select
            id="gx-global-endpoint-select"
            value={selectedEndpoint}
            onChange={(e) => setSelectedEndpoint(e.target.value)}
            className="bg-transparent font-mono text-[11px] font-medium cursor-pointer focus:outline-none"
            style={{
              color: selectedEndpoint !== 'all' ? 'var(--color-ink-strong)' : 'var(--color-muted)',
            }}
            aria-label="Filter dashboard by endpoint"
          >
            <option value="all" style={{ background: '#12151a', color: '#eceff3' }}>
              All Endpoints ({allEndpoints.length})
            </option>
            {allEndpoints.map((ep) => (
              <option
                key={ep.agentId || ep.id}
                value={ep.agentId || ep.id}
                style={{ background: '#12151a', color: '#eceff3' }}
              >
                {ep.name || 'Agent'} ({ep.agentId || ep.id})
                {ep.status ? ` — ${ep.status}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Selected endpoint indicator banner */}
        <div
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 border font-mono text-[10px]"
          style={{
            background: selectedEndpoint !== 'all' ? 'var(--color-panel-2)' : 'var(--color-panel)',
            borderColor: selectedEndpoint !== 'all' ? 'var(--color-accent)' : 'var(--color-line)',
            color: 'var(--color-ink-strong)',
          }}
          title={
            selectedEndpoint === 'all'
              ? 'Showing combined telemetry across all registered endpoints'
              : `Strict isolation active: Showing only data for ${currentEndpoint?.name || selectedEndpoint}`
          }
        >
          {selectedEndpoint === 'all' ? (
            <span style={{ color: 'var(--color-muted)' }}>
              Currently Viewing: <strong style={{ color: 'var(--color-ink-strong)' }}>All Endpoints</strong>
            </span>
          ) : (
            <div className="flex items-center gap-1.5">
              <StatusDot state={currentEndpoint?.status || 'unverified'} size={5} />
              <span style={{ color: 'var(--color-muted)' }}>
                Currently Viewing:{' '}
                <strong style={{ color: 'var(--color-ink-strong)' }}>
                  {currentEndpoint?.name || `Agent ${selectedEndpoint}`}
                </strong>
                {' '}| Agent ID:{' '}
                <strong style={{ color: 'var(--color-accent-2)' }}>{selectedEndpoint}</strong>
              </span>
              {currentEndpoint?.status && (
                <span
                  className="uppercase px-1 py-0.2 border text-[9px] font-semibold tracking-wider"
                  style={{
                    background: currentEndpoint.status === 'online' ? 'rgba(62,143,100,0.1)' : 'transparent',
                    borderColor: currentEndpoint.status === 'online' ? 'var(--color-accent)' : 'var(--color-line)',
                    color: currentEndpoint.status === 'online' ? 'var(--color-accent-2)' : 'var(--color-warn)',
                  }}
                >
                  {currentEndpoint.status}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div
        aria-hidden="true"
        style={{
          width: 1,
          height: 18,
          background: 'var(--color-line)',
          flexShrink: 0,
        }}
      />

      {/* Data source / connection indicator */}
      <ConnectionPill size="sm" />

      {/* Divider */}
      <div
        aria-hidden="true"
        style={{
          width: 1,
          height: 18,
          background: 'var(--color-line)',
          flexShrink: 0,
        }}
      />

      {/* Time range selector */}
      <TimeRangePicker size="sm" />

      {/* Divider */}
      <div
        aria-hidden="true"
        style={{
          width: 1,
          height: 18,
          background: 'var(--color-line)',
          flexShrink: 0,
        }}
      />

      {/* Refresh button */}
      <button
        type="button"
        onClick={refresh}
        disabled={live.loading}
        title="Refresh data"
        aria-label="Refresh data"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          color: live.loading ? 'var(--color-accent)' : 'var(--color-muted)',
          cursor: live.loading ? 'default' : 'pointer',
          padding: '0 2px',
          flexShrink: 0,
          transition: 'color 150ms',
        }}
      >
        <RefreshCw
          size={13}
          aria-hidden="true"
          className={live.loading ? 'gx-spin' : undefined}
        />
      </button>

      {/* As-of timestamp */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--color-faint)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          marginLeft: 2,
        }}
        title={`Data as of ${new Date(asOf).toISOString()}`}
        aria-label={`Data as of ${asOfLabel(asOf)}`}
      >
        {asOfLabel(asOf)}
      </span>
    </header>
  )
}
