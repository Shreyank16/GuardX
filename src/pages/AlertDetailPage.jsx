import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Info,
  ListOrdered,
  Monitor,
  ScrollText,
  Tag,
  User,
} from 'lucide-react'
import {
  Badge,
  ConnectionPill,
  EmptyState,
  JsonViewer,
  StatusDot,
} from '../components'
import { stepsFor } from '../data/catalog'
import { useApp } from '../hooks/useApp'
import { usePageTitle } from '../hooks/usePageTitle'
import { buildPreview } from '../utils/analysis'
import { formatTimestamp, logonTypeLabel, statusLabel } from '../utils/format'

export default function AlertDetailPage() {
  const { id } = useParams()
  const { dataset, setAlertStatus } = useApp()

  // Find alert in current dataset
  const alert = useMemo(() => {
    return dataset.alerts.find((item) => item.id === id)
  }, [dataset.alerts, id])

  usePageTitle(alert ? `Alert ${alert.id}` : 'Alert Not Found')

  const [statusMessage, setStatusMessage] = useState(null)

  // Handlers for local status management
  function handleStatusChange(nextStatus) {
    if (!alert) return
    setAlertStatus(alert.id, nextStatus)
    setStatusMessage(`Status locally set to "${statusLabel(nextStatus)}". Note: session override only.`)
    setTimeout(() => setStatusMessage(null), 3500)
  }

  // Not found handling (including unconnected mode with no alerts)
  if (!alert) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto' }}>
        <div className="mb-4">
          <Link
            to="/alerts"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-faint hover:text-ink transition-colors"
            style={{ color: 'var(--color-faint)' }}
          >
            <ArrowLeft size={13} aria-hidden="true" />
            <span>Back to Alert Queue</span>
          </Link>
        </div>

        <EmptyState
          title={`Alert "${id}" Not Found`}
          description={
            dataset.source === 'unconnected'
              ? 'GuardX is currently operating in unconnected mode with zero live alert ingestion. No alerts can be inspected until a backend API is connected or demonstration data is enabled in Settings.'
              : `No security detection record matching ID "${id}" was found in the active dataset. The alert may have rolled off the observation window or does not exist.`
          }
          action={
            <Link to="/alerts" className="gx-btn">
              <span>Return to Alerts</span>
            </Link>
          }
        />
      </div>
    )
  }

  // Analysis and investigation steps derivation
  const preview = buildPreview(alert)
  const steps = stepsFor(alert)

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1280, margin: '0 auto' }}>
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b" style={{ borderColor: 'var(--color-line)' }}>
        <div className="flex items-center gap-2 text-xs font-mono">
          <Link
            to="/alerts"
            className="inline-flex items-center gap-1 text-faint hover:text-ink transition-colors"
            style={{ color: 'var(--color-faint)' }}
          >
            <ArrowLeft size={13} aria-hidden="true" />
            <span>Alerts</span>
          </Link>
          <span style={{ color: 'var(--color-line)' }}>/</span>
          <span style={{ color: 'var(--color-ink-strong)' }}>{alert.id}</span>
        </div>

        <div className="flex items-center gap-2">
          {alert.synthetic && (
            <span
              className="font-mono text-[10px] uppercase px-2 py-0.5 border"
              style={{
                background: '#1a0f00',
                borderColor: '#3d2800',
                color: 'var(--color-warn)',
              }}
            >
              ⚠ Synthetic Record
            </span>
          )}
          <ConnectionPill size="sm" />
        </div>
      </div>

      {/* ── Alert Title & Main Classification Header ── */}
      <div
        className="p-4 border mb-5 flex flex-wrap items-center justify-between gap-4"
        style={{
          background: 'var(--color-panel)',
          borderColor: 'var(--color-line)',
          borderLeft: `4px solid ${
            alert.severity === 'critical'
              ? 'var(--color-critical)'
              : alert.severity === 'high'
                ? 'var(--color-high)'
                : alert.severity === 'medium'
                  ? 'var(--color-medium)'
                  : 'var(--color-low)'
          }`,
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
            <Badge severity={alert.severity} level={alert.level} showDot showLevel size="md" />
            <span
              className="font-mono text-xs text-faint border px-1.5 py-0.5"
              style={{ borderColor: 'var(--color-line)', background: 'var(--color-panel-2)' }}
            >
              RULE {alert.ruleId || 'N/A'}
            </span>
            <span
              className="font-mono text-xs text-faint"
              style={{ color: 'var(--color-faint)' }}
            >
              ID: {alert.id}
            </span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--color-ink-strong)',
              margin: '0 0 4px',
            }}
          >
            {alert.ruleDescription || alert.description}
          </h1>

          <p
            style={{
              fontSize: '12px',
              color: 'var(--color-muted)',
              margin: 0,
            }}
          >
            {alert.description}
          </p>
        </div>

        {/* Local Status Control */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="text-[10px] font-mono uppercase text-faint" style={{ color: 'var(--color-faint)' }}>
            Investigation Status (Local)
          </div>
          <div className="flex items-center gap-1">
            {['open', 'in_review', 'closed'].map((status) => {
              const active = alert.status === status
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleStatusChange(status)}
                  className="gx-btn"
                  style={{
                    height: '26px',
                    padding: '0 8px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    background: active ? 'var(--color-accent-soft)' : 'var(--color-panel-2)',
                    borderColor: active ? 'var(--color-accent)' : 'var(--color-line)',
                    color: active ? 'var(--color-accent-2)' : 'var(--color-muted)',
                  }}
                >
                  <StatusDot
                    tone={status === 'open' ? 'bad' : status === 'in_review' ? 'warn' : 'idle'}
                    size={5}
                  />
                  <span>{statusLabel(status)}</span>
                </button>
              )
            })}
          </div>
          {statusMessage && (
            <span className="text-[10px] font-mono text-accent animate-fade-in" style={{ color: 'var(--color-accent-2)' }}>
              {statusMessage}
            </span>
          )}
        </div>
      </div>

      {/* ── Metadata Grid (Telemetry Facts) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="p-3 border" style={{ background: 'var(--color-panel)', borderColor: 'var(--color-line)' }}>
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-faint mb-1">
            <Monitor size={12} style={{ color: 'var(--color-accent)' }} />
            <span>Endpoint / Agent</span>
          </div>
          <div className="font-mono text-sm font-semibold text-ink-strong" style={{ color: 'var(--color-ink-strong)' }}>
            {alert.endpoint}
          </div>
          <div className="text-[11px] font-mono text-faint mt-0.5" style={{ color: 'var(--color-faint)' }}>
            Agent ID: {alert.agentId || '002'}
          </div>
        </div>

        <div className="p-3 border" style={{ background: 'var(--color-panel)', borderColor: 'var(--color-line)' }}>
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-faint mb-1">
            <Clock size={12} style={{ color: 'var(--color-accent)' }} />
            <span>Timestamp</span>
          </div>
          <div className="font-mono text-xs font-semibold text-ink-strong" style={{ color: 'var(--color-ink-strong)' }}>
            {formatTimestamp(alert.timestamp)}
          </div>
          <div className="text-[10px] font-mono text-faint mt-0.5 truncate" title={alert.timestamp} style={{ color: 'var(--color-faint)' }}>
            {alert.timestamp}
          </div>
        </div>

        <div className="p-3 border" style={{ background: 'var(--color-panel)', borderColor: 'var(--color-line)' }}>
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-faint mb-1">
            <User size={12} style={{ color: 'var(--color-accent)' }} />
            <span>Target User / Source</span>
          </div>
          <div className="font-mono text-xs font-semibold text-ink-strong truncate" style={{ color: 'var(--color-ink-strong)' }}>
            {alert.username || 'System / Unattributed'}
          </div>
          <div className="text-[11px] font-mono text-faint mt-0.5" style={{ color: 'var(--color-faint)' }}>
            IP: {alert.sourceIp || 'Local / None'}
          </div>
        </div>

        <div className="p-3 border" style={{ background: 'var(--color-panel)', borderColor: 'var(--color-line)' }}>
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-faint mb-1">
            <Tag size={12} style={{ color: 'var(--color-accent)' }} />
            <span>Event ID / Logon</span>
          </div>
          <div className="font-mono text-xs font-semibold text-ink-strong" style={{ color: 'var(--color-ink-strong)' }}>
            Event ID {alert.eventId || 'N/A'}
          </div>
          <div className="text-[11px] font-mono text-faint mt-0.5" style={{ color: 'var(--color-faint)' }}>
            Type: {alert.logonType != null ? logonTypeLabel(alert.logonType) : 'N/A'}
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Analysis & Investigation ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Left: Rule-Based Analysis Preview */}
        <div
          className="border flex flex-col"
          style={{ background: 'var(--color-panel)', borderColor: 'var(--color-line)' }}
        >
          <div
            className="px-4 py-2.5 border-b flex items-center justify-between"
            style={{ background: 'var(--color-sidebar)', borderColor: 'var(--color-line)' }}
          >
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
                Rule-Based Analysis Preview
              </span>
            </div>
            <span
              className="text-[9px] font-mono uppercase px-1.5 py-0.5 border"
              style={{
                background: '#12161b',
                borderColor: 'var(--color-line)',
                color: 'var(--color-faint)',
              }}
            >
              Deterministic Rules
            </span>
          </div>

          <div className="p-4 flex flex-col gap-3.5 flex-1 text-xs">
            {/* MANDATORY AI-DISCLAIMER */}
            <div
              className="p-2.5 border flex items-start gap-2"
              style={{
                background: '#111418',
                borderColor: 'var(--color-line)',
                color: 'var(--color-faint)',
                fontSize: '11px',
                lineHeight: 1.45,
              }}
            >
              <Info size={14} className="shrink-0 mt-0.5 text-faint" />
              <div>
                <strong style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                  ANALYSIS NOTICE:
                </strong>{' '}
                This analysis is generated deterministically from documented rule metadata, level mappings, and SOC procedures in the GuardX catalog. It is not produced by an AI model.
              </div>
            </div>

            <div>
              <div className="font-mono text-[10px] uppercase text-faint mb-1 tracking-wider">
                Operational Context & Significance
              </div>
              <p className="text-ink leading-relaxed m-0" style={{ color: 'var(--color-ink)' }}>
                {preview.why}
              </p>
            </div>

            <div>
              <div className="font-mono text-[10px] uppercase text-faint mb-1 tracking-wider">
                Risk Classification Basis
              </div>
              <p className="text-ink leading-relaxed m-0" style={{ color: 'var(--color-ink)' }}>
                {preview.risk}
              </p>
            </div>

            {/* MITRE ATT&CK Mapping Card */}
            <div
              className="p-3 border mt-auto"
              style={{
                background: 'var(--color-panel-2)',
                borderColor: 'var(--color-line)',
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                  MITRE ATT&CK Context
                </span>
                {preview.mitre ? (
                  <span className="font-mono text-[10px] text-accent px-1.5 py-0.2 border border-accent/40 bg-accent-soft/30">
                    {preview.mitre.id}
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-faint">
                    Unmapped
                  </span>
                )}
              </div>

              {preview.mitre ? (
                <div>
                  <div className="font-mono text-xs font-semibold text-ink-strong mb-1">
                    {preview.mitre.name} ({preview.mitre.id})
                  </div>
                  <div className="text-[11px] text-muted leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                    {preview.mitre.note}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-faint italic" style={{ color: 'var(--color-faint)' }}>
                  No MITRE ATT&CK mapping is assigned to this custom detection rule in the GuardX catalog.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: SOC Investigation Procedure & Recommendations */}
        <div
          className="border flex flex-col"
          style={{ background: 'var(--color-panel)', borderColor: 'var(--color-line)' }}
        >
          <div
            className="px-4 py-2.5 border-b flex items-center justify-between"
            style={{ background: 'var(--color-sidebar)', borderColor: 'var(--color-line)' }}
          >
            <div className="flex items-center gap-2">
              <ListOrdered size={14} style={{ color: 'var(--color-accent)' }} />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--color-ink-strong)',
                }}
              >
                Standard Investigation Procedure
              </span>
            </div>
            <span
              className="text-[9px] font-mono uppercase px-1.5 py-0.5 border"
              style={{
                background: '#12161b',
                borderColor: 'var(--color-line)',
                color: 'var(--color-faint)',
              }}
            >
              Catalog Protocol
            </span>
          </div>

          <div className="p-4 flex flex-col gap-4 flex-1 text-xs">
            <div>
              <div className="font-mono text-[10px] uppercase text-faint mb-2 tracking-wider">
                Actionable Investigation Steps
              </div>
              <ol className="m-0 p-0 list-none flex flex-col gap-2">
                {steps.map((step, idx) => (
                  <li
                    key={idx}
                    className="p-2.5 border flex items-start gap-2.5"
                    style={{
                      background: 'var(--color-panel-2)',
                      borderColor: 'var(--color-line)',
                      fontSize: '12px',
                      lineHeight: 1.45,
                    }}
                  >
                    <span
                      className="font-mono font-bold text-[11px] px-1.5 py-0.5 border shrink-0"
                      style={{
                        background: 'var(--color-sidebar)',
                        borderColor: 'var(--color-line)',
                        color: 'var(--color-accent)',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span style={{ color: 'var(--color-ink)' }}>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-auto">
              <div className="font-mono text-[10px] uppercase text-faint mb-2 tracking-wider">
                Analyst Recommendations
              </div>
              <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
                {preview.recommendations.map((rec, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-[11px] text-muted leading-relaxed"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    <CheckCircle2 size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ── Raw Event Telemetry JSON Viewer ── */}
      <div className="mb-6">
        <JsonViewer
          data={alert.raw}
          title={`Raw Wazuh Event Telemetry · ${alert.id}`}
          maxHeight="460px"
        />
      </div>
    </div>
  )
}
