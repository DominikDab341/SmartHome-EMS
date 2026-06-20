import { pageMeta } from '../constants/energy'
import { SIMULATION_CYCLE_MINUTES } from '../config'
import type { AppView, ConnectionStatus } from '../types'
import { Icon } from './Icon'

type AppHeaderProps = {
  activeView: AppView
  username: string
  status: ConnectionStatus
  canManage: boolean
  busy: boolean
  instructorPanelOpen: boolean
  onOpenMobile: () => void
  onToggleInstructorPanel: () => void
  onRunTick: () => void
}

export function AppHeader({
  activeView,
  username,
  status,
  canManage,
  busy,
  instructorPanelOpen,
  onOpenMobile,
  onToggleInstructorPanel,
  onRunTick,
}: AppHeaderProps) {
  const meta = pageMeta[activeView]

  return (
    <header className="topbar">
      <button
        type="button"
        className="mobile-menu-button"
        onClick={onOpenMobile}
        aria-label="Otwórz menu"
      >
        <Icon name="menu" />
      </button>
      <div className="page-title">
        <p className="eyebrow">{meta.eyebrow}</p>
        <h1>
          {meta.title}
          {activeView === 'dashboard' && <span>, {username}</span>}
        </h1>
        <p>{meta.description}</p>
      </div>
      <div className="topbar-actions">
        <div className={`connection ${status.toLowerCase()}`}>
          <span />
          {status === 'Online' ? 'Na żywo' : status}
        </div>
        {canManage && (
          <>
            <button
              type="button"
              className={`ghost-button instructor-toggle ${instructorPanelOpen ? 'active' : ''}`}
              onClick={onToggleInstructorPanel}
              aria-expanded={instructorPanelOpen}
              aria-controls="instructor-panel"
            >
              <Icon name="weather" size={18} />
              {instructorPanelOpen ? 'Ukryj panel' : 'Panel prowadzącego'}
            </button>
            <button type="button" className="primary-action" onClick={onRunTick} disabled={busy}>
              <Icon name="play" size={18} />
              {busy ? 'Przeliczam…' : `Symuluj ${SIMULATION_CYCLE_MINUTES} minut`}
            </button>
          </>
        )}
      </div>
    </header>
  )
}
