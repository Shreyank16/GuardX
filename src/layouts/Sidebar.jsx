import { NavLink } from 'react-router-dom'
import {
  AlertTriangle,
  Brain,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  KeyRound,
  LayoutDashboard,
  Monitor,
  Package,
  ScrollText,
  Settings,
  Shield,
  Terminal,
  X,
} from 'lucide-react'
import StatusDot from '../components/StatusDot'
import { useApp } from '../hooks/useApp'

/* ── Navigation structure ─────────────────────────────────────────────────── */

const NAV = [
  {
    section: null,
    items: [
      { to: '/', label: 'Overview', Icon: LayoutDashboard, end: true },
    ],
  },
  {
    section: 'Detection & AI',
    items: [
      { to: '/alerts',              label: 'Alerts',                 Icon: AlertTriangle },
      { to: '/threat-intelligence', label: 'AI Threat Intelligence', Icon: Brain },
      { to: '/endpoints',           label: 'Endpoints',              Icon: Monitor },
      { to: '/applications',        label: 'Application Inventory',  Icon: Package },
    ],
  },
  {
    section: 'Telemetry',
    items: [
      { to: '/fim',            label: 'File Integrity',  Icon: FileSearch },
      { to: '/authentication', label: 'Authentication',  Icon: KeyRound },
      { to: '/powershell',     label: 'PowerShell',      Icon: Terminal },
    ],
  },
  {
    section: 'Configuration',
    items: [
      { to: '/rules',    label: 'Rules',    Icon: ScrollText },
      { to: '/settings', label: 'Settings', Icon: Settings },
    ],
  },
]

/* ── Sidebar ──────────────────────────────────────────────────────────────── */

export default function Sidebar() {
  const {
    prefs,
    updatePrefs,
    connection,
    dataset,
    live,
    mobileNavOpen,
    setMobileNavOpen,
  } = useApp()

  const collapsed = prefs.sidebarCollapsed
  const isLoading = live.loading

  function toggleCollapse() {
    updatePrefs({ sidebarCollapsed: !collapsed })
  }

  return (
    <aside
      className={[
        'gx-sidebar',
        collapsed        ? 'gx-sidebar-collapsed'    : '',
        mobileNavOpen    ? 'gx-sidebar-mobile-open'  : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Main navigation"
    >
      {/* ── Branding header ─────────────────────────────────────────────── */}
      <div
        style={{
          height: 44,
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          gap: 10,
          borderBottom: '1px solid var(--color-line)',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <Shield
          size={17}
          aria-hidden="true"
          style={{ color: 'var(--color-accent)', flexShrink: 0 }}
        />

        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  letterSpacing: '0.14em',
                  color: 'var(--color-ink-strong)',
                  fontWeight: 500,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                }}
              >
                GUARDX
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--color-faint)',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.03em',
                }}
              >
                Security Monitoring
              </div>
            </div>

            {/* Mobile-only close button */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="gx-mobile-only"
              aria-label="Close navigation"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-muted)',
                cursor: 'pointer',
                padding: 4,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <nav
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}
        aria-label="Site navigation"
      >
        {NAV.map((group, gi) => (
          <div key={gi} className="gx-nav-section">
            {group.section && (
              <div className="gx-nav-section-label" aria-hidden={collapsed ? 'true' : undefined}>
                {collapsed
                  ? <span style={{ opacity: 0.25, fontSize: 10 }}>—</span>
                  : group.section}
              </div>
            )}

            {group.items.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  ['gx-nav-item', isActive ? 'gx-nav-item-active' : '']
                    .filter(Boolean)
                    .join(' ')
                }
                onClick={() => setMobileNavOpen(false)}
                title={collapsed ? label : undefined}
                aria-label={label}
              >
                <Icon size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* ── Bottom panel: status + collapse ─────────────────────────────── */}
      <div
        style={{
          borderTop: '1px solid var(--color-line)',
          flexShrink: 0,
          padding: '8px 0 4px',
        }}
      >
        {/* API connection status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: collapsed ? '5px 0' : '5px 14px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            overflow: 'hidden',
          }}
          title={
            collapsed
              ? `${connection.label} · ${connection.detail}`
              : undefined
          }
        >
          <StatusDot tone={connection.tone} pulse={isLoading} />

          {!collapsed && (
            <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--color-ink)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.35,
                }}
              >
                {connection.label}
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--color-faint)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.35,
                }}
              >
                {connection.detail}
              </div>
            </div>
          )}
        </div>

        {/* Demo data warning chip — expanded only */}
        {!collapsed && dataset.source === 'demo' && (
          <div
            style={{
              margin: '4px 10px 6px',
              padding: '3px 8px',
              background: '#1a0f00',
              border: '1px solid #3d2800',
              fontSize: '10px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-warn)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span aria-hidden="true">⚠</span>
            <span>Demo data active</span>
          </div>
        )}

        {/* Collapse / expand toggle — hidden on mobile (overlay sidebar) */}
        <button
          type="button"
          onClick={toggleCollapse}
          className="gx-nav-item gx-desktop-only"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : undefined}
          style={{
            justifyContent: collapsed ? 'center' : 'flex-start',
            marginTop: 2,
          }}
        >
          {collapsed ? (
            <ChevronRight
              size={14}
              aria-hidden="true"
              style={{ color: 'var(--color-faint)', flexShrink: 0 }}
            />
          ) : (
            <>
              <ChevronLeft
                size={14}
                aria-hidden="true"
                style={{ color: 'var(--color-faint)', flexShrink: 0 }}
              />
              <span
                style={{
                  color: 'var(--color-faint)',
                  fontSize: '11px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                Collapse
              </span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
