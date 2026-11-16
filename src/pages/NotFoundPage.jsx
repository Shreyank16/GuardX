import { Link, useLocation } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  FileCode,
  FileSpreadsheet,
  Home,
  Laptop,
  Lock,
  ScrollText,
  Settings,
  ShieldAlert,
  Terminal,
} from 'lucide-react'
import { usePageTitle } from '../hooks/usePageTitle'

export default function NotFoundPage() {
  usePageTitle('404 · Route Not Found')
  const location = useLocation()

  const quickLinks = [
    { to: '/', label: 'Security Overview', icon: Home, desc: 'High-level SOC posture & telemetry' },
    { to: '/alerts', label: 'Security Alerts', icon: ShieldAlert, desc: 'Triage & investigative queue' },
    { to: '/endpoints', label: 'Endpoints', icon: Laptop, desc: 'Registered Wazuh agent inventory' },
    { to: '/rules', label: 'Detection Rules', icon: FileCode, desc: 'Custom rules & verification states' },
    { to: '/fim', label: 'File Integrity', icon: FileSpreadsheet, desc: 'Monitored directory change auditing' },
    { to: '/authentication', label: 'Authentication', icon: Lock, desc: 'Windows logon telemetry (4624/4625)' },
    { to: '/powershell', label: 'PowerShell Logs', icon: Terminal, desc: 'Operational Script Block logging (4104)' },
    { to: '/settings', label: 'Console Settings', icon: Settings, desc: 'Data sources & lab environment specs' },
  ]

  return (
    <div style={{ padding: '48px 24px', maxWidth: 880, margin: '0 auto' }}>
      {/* ── 404 Hero Card ── */}
      <div
        className="p-6 border mb-6 text-center sm:text-left sm:flex items-start gap-5"
        style={{
          background: 'var(--color-panel)',
          borderColor: 'var(--color-line)',
          borderLeft: '4px solid #ff7b7b',
        }}
      >
        <div
          className="w-12 h-12 flex items-center justify-center shrink-0 mx-auto sm:mx-0 mb-4 sm:mb-0"
          style={{ background: '#221111', border: '1px solid #4a2020', color: '#ff7b7b' }}
        >
          <AlertTriangle size={24} />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
            <span className="font-mono text-xs uppercase px-1.5 py-0.5 border" style={{ background: '#221111', borderColor: '#4a2020', color: '#ff7b7b' }}>
              Error 404
            </span>
            <span className="text-[11px] font-mono text-faint">
              HTTP_STATUS_NOT_FOUND
            </span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--color-ink-strong)',
              margin: '0 0 8px',
              letterSpacing: '0.04em',
            }}
          >
            Requested Route Unmapped
          </h1>

          <p style={{ fontSize: '13px', color: 'var(--color-muted)', margin: '0 0 16px', lineHeight: 1.6 }}>
            The requested console path does not match any operational routes in the GuardX SOC console navigation graph. Telemetry records or views may have been reorganized.
          </p>

          {/* Audit Telemetry Box */}
          <div
            className="p-3 border text-xs font-mono text-left mb-5 inline-block w-full"
            style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-line)' }}
          >
            <div className="text-faint text-[10px] uppercase mb-1">Routing Trajectory:</div>
            <div className="text-accent break-all">
              Path: <span className="text-ink-strong">{location.pathname}</span>
              {location.search && <span className="text-faint">{location.search}</span>}
            </div>
          </div>

          <div>
            <Link
              to="/"
              className="gx-btn inline-flex items-center gap-2 font-mono"
              style={{
                height: '34px',
                fontSize: '12px',
                padding: '0 16px',
                borderColor: 'var(--color-accent)',
                color: 'var(--color-accent-2)',
                background: 'var(--color-panel-2)',
              }}
            >
              <Home size={14} />
              <span>Return to Security Overview</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Quick Directory ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <ScrollText size={15} style={{ color: 'var(--color-accent)' }} />
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
            Operational SOC Console Navigation Directory
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                className="p-3 border flex items-center justify-between group transition-colors"
                style={{ background: 'var(--color-panel)', borderColor: 'var(--color-line)' }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 flex items-center justify-center shrink-0 border"
                    style={{ background: 'var(--color-canvas)', borderColor: 'var(--color-line)' }}
                  >
                    <Icon size={14} style={{ color: 'var(--color-accent)' }} />
                  </div>
                  <div>
                    <span className="font-mono text-xs font-medium text-ink-strong group-hover:underline block">
                      {link.label}
                    </span>
                    <span className="text-[11px] text-faint block">
                      {link.desc}
                    </span>
                  </div>
                </div>
                <ArrowRight size={13} className="text-faint group-hover:text-accent transition-colors" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
