import { Route, Routes } from 'react-router-dom'
import AppShell from './layouts/AppShell'
import AlertDetailPage from './pages/AlertDetailPage'
import AlertsPage from './pages/AlertsPage'
import ApplicationsPage from './pages/ApplicationsPage'
import AuthPage from './pages/AuthPage'
import EndpointDetailPage from './pages/EndpointDetailPage'
import EndpointsPage from './pages/EndpointsPage'
import FimPage from './pages/FimPage'
import NotFoundPage from './pages/NotFoundPage'
import OverviewPage from './pages/OverviewPage'
import PowerShellPage from './pages/PowerShellPage'
import RulesPage from './pages/RulesPage'
import SettingsPage from './pages/SettingsPage'
import ThreatIntelPage from './pages/ThreatIntelPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Stage 1: Overview */}
        <Route index element={<OverviewPage />} />

        {/* Stage 2: Security Alerts & Alert Details */}
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="alerts/:id" element={<AlertDetailPage />} />
        <Route path="threat-intelligence" element={<ThreatIntelPage />} />
        <Route path="ai-intel" element={<ThreatIntelPage />} />

        {/* Stage 3: Endpoint Management & Application Inventory */}
        <Route path="endpoints" element={<EndpointsPage />} />
        <Route path="endpoints/:id" element={<EndpointDetailPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="inventory" element={<ApplicationsPage />} />

        {/* Stage 4: Security Telemetry Monitoring */}
        <Route path="fim" element={<FimPage />} />
        <Route path="authentication" element={<AuthPage />} />
        <Route path="powershell" element={<PowerShellPage />} />

        {/* Stage 5: Detection Rules, Settings & 404 */}
        <Route path="rules" element={<RulesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
