import { useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileCode,
  Info,
  ScrollText,
  ShieldCheck,
  X,
} from 'lucide-react'
import {
  Badge,
  ConnectionPill,
  DataTable,
  EmptyState,
  FilterBar,
  JsonViewer,
  Pagination,
  StatusDot,
} from '../components'
import { investigationSteps } from '../data/catalog'
import { useApp } from '../hooks/useApp'
import { usePage } from '../hooks/usePage'
import { usePageTitle } from '../hooks/usePageTitle'
import { formatTimestamp } from '../utils/format'
import { pageWindow, sortRows } from '../utils/records'

export default function RulesPage() {
  usePageTitle('Detection Rules')
  const { dataset, selectedEndpoint } = useApp()

  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [verificationFilter, setVerificationFilter] = useState('all')
  const [groupFilter, setGroupFilter] = useState('all')

  // Sorting: default by alertCount descending so rules with real activity appear first
  const [sort, setSort] = useState({ key: 'alertCount', direction: 'desc' })

  // Selected rule for detail modal
  const [selectedRule, setSelectedRule] = useState(null)

  // Filter keys for pagination persistence
  const filterKey = `${search}-${severityFilter}-${verificationFilter}-${groupFilter}-${selectedEndpoint}`
  const [activePage, setActivePage] = usePage(filterKey)

  // Filtered rules
  const filteredRules = useMemo(() => {
    return dataset.rules.filter((rule) => {
      if (severityFilter !== 'all' && rule.severity !== severityFilter) return false

      if (verificationFilter === 'live' && !rule.liveAlertsVerified) return false
      if (verificationFilter === 'unverified' && rule.liveAlertsVerified) return false

      if (groupFilter !== 'all' && rule.group !== groupFilter && !rule.groups?.includes(groupFilter)) {
        return false
      }

      if (search.trim()) {
        const query = search.toLowerCase().trim()
        const match =
          rule.id?.toString().toLowerCase().includes(query) ||
          rule.name?.toLowerCase().includes(query) ||
          rule.description?.toLowerCase().includes(query) ||
          rule.group?.toLowerCase().includes(query) ||
          rule.eventId?.toLowerCase().includes(query) ||
          rule.filename?.toLowerCase().includes(query) ||
          rule.parentRule?.toLowerCase().includes(query)
        if (!match) return false
      }

      return true
    })
  }, [dataset.rules, severityFilter, verificationFilter, groupFilter, search])

  // Summary counts
  const totalRules = dataset.rules.length
  const liveVerifiedRules = dataset.rules.filter((r) => r.liveAlertsVerified).length
  const unverifiedRules = dataset.rules.filter((r) => !r.liveAlertsVerified).length
  const totalAlertsFired = useMemo(() => {
    return dataset.rules.reduce((sum, r) => sum + (r.alertCount || 0), 0)
  }, [dataset.rules])

  // Top distinct groups for filtering
  const groupOptions = useMemo(() => {
    const groupCounts = new Map()
    for (const r of dataset.rules) {
      const g = r.group || 'ungrouped'
      groupCounts.set(g, (groupCounts.get(g) || 0) + 1)
    }
    const sorted = Array.from(groupCounts.entries())
      .filter(([name]) => name && name !== 'ungrouped')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name]) => ({ value: name, label: `${name}` }))

    return [{ value: 'all', label: 'All Groups' }, ...sorted]
  }, [dataset.rules])

  const hasActiveFilters =
    search.trim().length > 0 ||
    severityFilter !== 'all' ||
    verificationFilter !== 'all' ||
    groupFilter !== 'all'

  function handleResetFilters() {
    setSearch('')
    setSeverityFilter('all')
    setVerificationFilter('all')
    setGroupFilter('all')
    setActivePage(1)
  }

  // Sorting and pagination
  const sortedRules = useMemo(() => {
    return sortRows(filteredRules, sort)
  }, [filteredRules, sort])

  const pageSize = 15
  const windowData = pageWindow(sortedRules.length, activePage, pageSize)
  const paginatedRules = useMemo(() => {
    return sortedRules.slice(windowData.start, windowData.end)
  }, [sortedRules, windowData.start, windowData.end])

  // Table columns
  const columns = [
    {
      key: 'id',
      label: 'Rule ID',
      width: '95px',
      mono: true,
      sortable: true,
      render: (val, row) => (
        <span
          className="font-mono font-semibold cursor-pointer hover:underline text-ink-strong"
          onClick={() => setSelectedRule(row)}
        >
          {val}
        </span>
      ),
    },
    {
      key: 'level',
      label: 'Severity / Level',
      width: '140px',
      sortable: true,
      render: (val, row) => <Badge severity={row.severity} level={val} showDot showLevel />,
    },
    {
      key: 'name',
      label: 'Rule Description & Source',
      render: (val, row) => (
        <div
          className="cursor-pointer group flex flex-col max-w-xl"
          onClick={() => setSelectedRule(row)}
        >
          <span className="font-medium text-ink-strong group-hover:underline text-xs">
            {val}
          </span>
          <span className="text-[10px] text-faint line-clamp-1">
            {row.filename ? `${row.filename} · ` : ''}{row.description !== val ? row.description : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'group',
      label: 'Group / Event',
      width: '130px',
      mono: true,
      sortable: true,
      render: (val, row) => (
        <div className="flex flex-col text-[11px] font-mono">
          <span className="text-ink truncate" title={val}>{val || 'ungrouped'}</span>
          <span className="text-faint text-[10px]">
            {row.eventId ? `Event ${row.eventId}` : row.parentRule ? `Parent ${row.parentRule}` : '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'alertCount',
      label: 'Live Alerts',
      width: '120px',
      sortable: true,
      render: (val, row) => {
        const count = typeof val === 'number' ? val : row.alertCount || 0
        if (count > 0) {
          return (
            <span
              className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 border"
              style={{
                background: '#102419',
                borderColor: '#234d35',
                color: 'var(--color-accent-2)',
              }}
            >
              <Activity size={11} />
              <span>{count} alert{count > 1 ? 's' : ''}</span>
            </span>
          )
        }
        return <span className="font-mono text-[10px] text-faint">0 alerts</span>
      },
    },
    {
      key: 'verification',
      label: 'Verification State',
      width: '185px',
      render: (_, row) => (
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase">
          <StatusDot tone={row.liveAlertsVerified ? 'ok' : 'idle'} size={6} />
          <span
            className="px-1.5 py-0.5 border"
            style={{
              background: row.liveAlertsVerified ? '#102419' : 'var(--color-panel-2)',
              borderColor: row.liveAlertsVerified ? '#234d35' : 'var(--color-line)',
              color: row.liveAlertsVerified ? 'var(--color-accent-2)' : 'var(--color-faint)',
            }}
          >
            {row.liveAlertsVerified ? 'Live Alert Verified' : 'Configured (0 Alerts)'}
          </span>
        </div>
      ),
    },
    {
      key: 'inspect',
      label: '',
      width: '80px',
      render: (_, row) => (
        <button
          type="button"
          onClick={() => setSelectedRule(row)}
          className="gx-btn"
          style={{ height: '22px', fontSize: '10px', padding: '0 6px' }}
        >
          <Eye size={10} aria-hidden="true" />
          <span>Inspect</span>
        </button>
      ),
    },
  ]

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* ── Page Header ── */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-5"
        style={{ borderBottom: '1px solid var(--color-line)' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ScrollText size={17} style={{ color: 'var(--color-accent)' }} />
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
              Detection Rules Catalog
            </h1>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 border uppercase"
              style={{
                background: 'var(--color-panel-2)',
                borderColor: 'var(--color-line)',
                color: 'var(--color-faint)',
              }}
            >
              {totalRules} Loaded Rules
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: 0 }}>
            Configured Wazuh Manager detection rules correlated with genuine alert telemetry from Wazuh Indexer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ConnectionPill showDetail />
        </div>
      </div>

      {/* ── Governance & Alert Activity Policy Notice ── */}
      <div
        className="mb-5 p-3.5 border flex items-start gap-3 text-xs"
        style={{
          background: 'var(--color-panel)',
          borderColor: 'var(--color-line)',
          borderLeft: '4px solid var(--color-accent)',
          color: 'var(--color-faint)',
          lineHeight: 1.5,
        }}
      >
        <Info size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
        <div className="flex-1">
          <strong style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
            DETECTION RULE ARCHITECTURE &amp; ALERT CORRELATION:
          </strong>{' '}
          Rules are retrieved directly from the Wazuh Manager API (port 55000) and correlated against alert records in OpenSearch (<code>wazuh-alerts-4.x-*</code>). Rules with zero alerts are active and enabled in Manager configuration, but have not recorded matching alert telemetry in the current indices.
        </div>
      </div>

      {/* ── Summary Counters ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div
          className="p-3 border flex items-center justify-between"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
            borderLeft: '3px solid var(--color-accent)',
          }}
        >
          <div>
            <div className="text-[10px] font-mono uppercase text-faint" style={{ color: 'var(--color-faint)' }}>
              Total Loaded Rules
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: 'var(--color-ink-strong)' }}>
              {totalRules}
            </div>
            <div className="text-[9px] font-mono text-faint mt-0.5">
              {dataset.rulesMetrics?.totalConfigured ? `${dataset.rulesMetrics.totalConfigured} Manager total` : 'Configured'}
            </div>
          </div>
          <FileCode size={18} style={{ color: 'var(--color-accent)' }} />
        </div>

        <div
          className="p-3 border flex items-center justify-between"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
            borderLeft: '3px solid var(--color-accent)',
          }}
        >
          <div>
            <div className="text-[10px] font-mono uppercase text-faint" style={{ color: 'var(--color-accent-2)' }}>
              Live Alert Verified
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: '#b7dcc8' }}>
              {liveVerifiedRules}
            </div>
            <div className="text-[9px] font-mono text-faint mt-0.5">
              Rules with active alerts
            </div>
          </div>
          <ShieldCheck size={18} style={{ color: 'var(--color-accent)' }} />
        </div>

        <div
          className="p-3 border flex items-center justify-between"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
            borderLeft: '3px solid var(--color-line)',
          }}
        >
          <div>
            <div className="text-[10px] font-mono uppercase text-faint" style={{ color: 'var(--color-muted)' }}>
              Configured (0 Alerts)
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: 'var(--color-muted)' }}>
              {unverifiedRules}
            </div>
            <div className="text-[9px] font-mono text-faint mt-0.5">
              No alerts in current index
            </div>
          </div>
          <AlertTriangle size={18} style={{ color: 'var(--color-muted)' }} />
        </div>

        <div
          className="p-3 border flex items-center justify-between"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'var(--color-line)',
            borderLeft: '3px solid #7393ad',
          }}
        >
          <div>
            <div className="text-[10px] font-mono uppercase text-faint" style={{ color: '#7393ad' }}>
              Historical Alerts Fired
            </div>
            <div className="text-xl font-mono font-semibold" style={{ color: '#8fb4d4' }}>
              {dataset.rulesMetrics?.totalAlerts ?? totalAlertsFired}
            </div>
            <div className="text-[9px] font-mono text-faint mt-0.5">
              All indexed history
            </div>
          </div>
          <Activity size={18} style={{ color: '#7393ad' }} />
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search rules by ID (e.g. 100100, 91816), description, group, or filename..."
        filters={[
          {
            id: 'severity',
            label: 'Severity',
            value: severityFilter,
            onChange: setSeverityFilter,
            options: [
              { value: 'all', label: 'All Severities' },
              { value: 'critical', label: 'Critical (15+)' },
              { value: 'high', label: 'High (12-14)' },
              { value: 'medium', label: 'Medium (7-11)' },
              { value: 'low', label: 'Low (4-6)' },
              { value: 'informational', label: 'Informational (0-3)' },
            ],
          },
          {
            id: 'verification',
            label: 'Activity',
            value: verificationFilter,
            onChange: setVerificationFilter,
            options: [
              { value: 'all', label: 'All Rule States' },
              { value: 'live', label: 'Live Alert Verified (Fired Alerts)' },
              { value: 'unverified', label: 'Configured Only (0 Alerts)' },
            ],
          },
          {
            id: 'group',
            label: 'Group',
            value: groupFilter,
            onChange: setGroupFilter,
            options: groupOptions,
          },
        ]}
        hasActiveFilters={hasActiveFilters}
        onReset={handleResetFilters}
      />

      {/* ── DataTable ── */}
      <div
        className="border flex flex-col mb-6"
        style={{
          background: 'var(--color-panel)',
          borderColor: 'var(--color-line)',
        }}
      >
        <DataTable
          columns={columns}
          data={paginatedRules}
          sort={sort}
          onSort={setSort}
          keyField="id"
          emptyState={
            <EmptyState
              compact
              title="No Rules Match Filter"
              description="No detection rules match your current search, severity, or group filters."
            />
          }
        />

        {filteredRules.length > 0 && (
          <Pagination
            total={filteredRules.length}
            page={activePage}
            pageSize={pageSize}
            onPageChange={setActivePage}
          />
        )}
      </div>

      {/* ── Rule Details Modal ── */}
      {selectedRule && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rule-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in"
        >
          <div
            className="w-full max-w-2xl border flex flex-col shadow-2xl"
            style={{
              background: 'var(--color-panel)',
              borderColor: 'var(--color-line)',
              maxHeight: '90vh',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b select-none"
              style={{
                background: 'var(--color-sidebar)',
                borderColor: 'var(--color-line)',
              }}
            >
              <div className="flex items-center gap-2">
                <ScrollText size={15} style={{ color: 'var(--color-accent)' }} />
                <span
                  id="rule-modal-title"
                  className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-strong"
                >
                  Rule Specification · Rule {selectedRule.id}
                </span>
                {selectedRule.alertCount > 0 && (
                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 border border-emerald-800/50 bg-emerald-950/30 text-accent-2">
                    {selectedRule.alertCount} Live Alerts
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedRule(null)}
                className="text-faint hover:text-ink cursor-pointer bg-transparent border-0 p-1"
                aria-label="Close modal"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto flex flex-col gap-4 text-xs font-mono">
              <div className="flex items-center justify-between p-3 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                <div>
                  <div className="text-[10px] uppercase text-faint mb-1">Rule ID &amp; Severity</div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-ink-strong">Rule {selectedRule.id}</span>
                    <Badge severity={selectedRule.severity} level={selectedRule.level} showDot showLevel />
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase text-faint mb-1">Verification Status</div>
                  <span
                    className="px-2 py-0.5 border text-[10px] font-semibold uppercase"
                    style={{
                      background: selectedRule.liveAlertsVerified ? '#102419' : 'var(--color-panel-2)',
                      borderColor: selectedRule.liveAlertsVerified ? '#234d35' : 'var(--color-line)',
                      color: selectedRule.liveAlertsVerified ? 'var(--color-accent-2)' : 'var(--color-faint)',
                    }}
                  >
                    {selectedRule.liveAlertsVerified ? 'Live Alert Verified' : 'Configured (0 Alerts)'}
                  </span>
                </div>
              </div>

              <div className="p-3 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                <div className="text-[10px] uppercase text-faint mb-1">Rule Description</div>
                <div className="text-ink-strong font-sans text-sm font-semibold">{selectedRule.name}</div>
                {selectedRule.description !== selectedRule.name && (
                  <div className="text-muted font-sans text-xs mt-1 leading-relaxed">{selectedRule.description}</div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Live Alerts</div>
                  <div className="font-semibold" style={{ color: selectedRule.alertCount > 0 ? 'var(--color-accent-2)' : 'var(--color-faint)' }}>
                    {selectedRule.alertCount > 0 ? `${selectedRule.alertCount} alerts` : '0 alerts'}
                  </div>
                </div>

                <div className="p-2 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Manager Status</div>
                  <div className="text-ink-strong uppercase">{selectedRule.status || 'enabled'}</div>
                </div>

                <div className="p-2 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Source File</div>
                  <div className="text-ink-strong truncate" title={selectedRule.filename}>{selectedRule.filename || 'local_rules.xml'}</div>
                </div>

                <div className="p-2 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Recent Alert</div>
                  <div className="text-ink-strong text-[11px] truncate">
                    {selectedRule.lastAlert ? formatTimestamp(selectedRule.lastAlert) : 'None recorded'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Primary Group</div>
                  <div className="text-ink-strong uppercase truncate">{selectedRule.group}</div>
                </div>

                <div className="p-2 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Target Event ID</div>
                  <div className="text-ink-strong">{selectedRule.eventId ? `Event ${selectedRule.eventId}` : 'N/A'}</div>
                </div>

                <div className="p-2 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Parent Rule</div>
                  <div className="text-ink-strong">{selectedRule.parentRule ? `Rule ${selectedRule.parentRule}` : 'None'}</div>
                </div>

                <div className="p-2 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-0.5">Level Rating</div>
                  <div className="text-ink-strong">Level {selectedRule.level}</div>
                </div>
              </div>

              {/* MITRE ATT&CK Mapping */}
              {selectedRule.mitre && selectedRule.mitre.length > 0 && (
                <div className="p-3 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-1.5">MITRE ATT&amp;CK Mapping</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRule.mitre.map((m, idx) => {
                      const label = typeof m === 'object'
                        ? `${Array.isArray(m.id) ? m.id.join(', ') : m.id || ''} ${Array.isArray(m.tactic) ? m.tactic.join(', ') : m.tactic || ''}`.trim()
                        : String(m)
                      return (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[10px] font-mono border"
                          style={{
                            background: '#1d1912',
                            borderColor: '#543b18',
                            color: '#e2b36e',
                          }}
                        >
                          {label}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Technical Verification Note */}
              <div className="p-3 border" style={{ background: '#0e1115', borderColor: 'var(--color-line)' }}>
                <div className="text-[10px] uppercase text-faint mb-1">Technical Verification Note</div>
                <div className="text-muted leading-relaxed">{selectedRule.verificationNote}</div>
              </div>

              {/* Documented Investigation Steps */}
              {investigationSteps[selectedRule.id] && (
                <div className="p-3 border" style={{ background: 'var(--color-panel-2)', borderColor: 'var(--color-line)' }}>
                  <div className="text-[10px] uppercase text-faint mb-2">Documented Investigation Procedure</div>
                  <ol className="m-0 p-0 list-none flex flex-col gap-1.5 font-sans text-xs">
                    {investigationSteps[selectedRule.id].map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 size={13} className="shrink-0 mt-0.5 text-accent" />
                        <span className="text-ink">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Raw JSON */}
              <JsonViewer
                data={selectedRule.raw || selectedRule}
                title={`Rule Catalog Definition · ${selectedRule.id}`}
                maxHeight="180px"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
