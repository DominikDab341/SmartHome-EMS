import { roleLabel } from '../lib/formatters'
import type { AppView, ConnectionStatus, DeviceStats, UserProfile } from '../types'
import { Icon, type IconName } from './Icon'

type AppSidebarProps = {
  activeView: AppView
  mobileOpen: boolean
  canManage: boolean
  status: ConnectionStatus
  user: UserProfile
  deviceStats: DeviceStats
  residentsCount: number
  onNavigate: (view: AppView) => void
  onCloseMobile: () => void
  onLogout: () => void
}

const navigationItems: Array<{
  id: AppView
  label: string
  icon: IconName
  ownerOnly?: boolean
}> = [
  { id: 'dashboard', label: 'Pulpit', icon: 'dashboard' },
  { id: 'devices', label: 'Urządzenia', icon: 'devices' },
  { id: 'analytics', label: 'Analityka', icon: 'analytics' },
  { id: 'residents', label: 'Mieszkańcy', icon: 'residents', ownerOnly: true },
]

export function AppSidebar({
  activeView,
  mobileOpen,
  canManage,
  status,
  user,
  deviceStats,
  residentsCount,
  onNavigate,
  onCloseMobile,
  onLogout,
}: AppSidebarProps) {
  return (
    <>
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Icon name="bolt" size={21} /></div>
          <div>
            <strong>Wattwise</strong>
            <span>Smart Home EMS</span>
          </div>
          <button
            type="button"
            className="sidebar-close"
            onClick={onCloseMobile}
            aria-label="Zamknij menu"
          >
            <Icon name="close" />
          </button>
        </div>

        <nav className="main-navigation" aria-label="Główna nawigacja">
          <p className="navigation-label">Menu</p>
          {navigationItems
            .filter((item) => !item.ownerOnly || canManage)
            .map((item) => (
              <button
                type="button"
                className={activeView === item.id ? 'active' : ''}
                onClick={() => onNavigate(item.id)}
                key={item.id}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.id === 'devices' && <small>{deviceStats.total}</small>}
                {item.id === 'residents' && <small>{residentsCount}</small>}
              </button>
            ))}
        </nav>

        <div className="sidebar-footer">
          <div className={`system-status ${status.toLowerCase()}`}>
            <span className="status-dot" />
            <div>
              <strong>{status === 'Online' ? 'System online' : 'Brak połączenia'}</strong>
              <small>Synchronizacja co 10 sekund</small>
            </div>
          </div>
          <button type="button" className="sidebar-user" onClick={onLogout}>
            <span className="avatar">{user.username.slice(0, 1).toUpperCase()}</span>
            <span className="sidebar-user-copy">
              <strong>{user.username}</strong>
              <small>{roleLabel(user.role)}</small>
            </span>
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="navigation-scrim"
          onClick={onCloseMobile}
          aria-label="Zamknij tło nawigacji"
        />
      )}
    </>
  )
}
