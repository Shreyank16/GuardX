import { Outlet } from 'react-router-dom'
import SyntheticBanner from '../components/SyntheticBanner'
import { useApp } from '../hooks/useApp'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppShell() {
  const { prefs, mobileNavOpen, setMobileNavOpen } = useApp()
  const collapsed = prefs.sidebarCollapsed

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--color-canvas)' }}>

      {/* Mobile backdrop — tap to close sidebar */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 30,
            background: 'rgba(0,0,0,0.65)',
          }}
        />
      )}

      <Sidebar />

      <div
        className={[
          'gx-shell-main',
          collapsed ? 'gx-shell-main-collapsed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <TopBar />

        {/* Persistent demonstration-data notice (only active when dataset.source === 'demo') */}
        <SyntheticBanner />

        <main
          id="gx-main-content"
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
