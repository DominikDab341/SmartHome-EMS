import { strategyDescriptions, strategyLabels } from '../constants/energy'
import { formatKw, formatKwh, formatMoney } from '../lib/formatters'
import type {
  Dashboard,
  DeviceStats,
  Snapshot,
  StrategyType,
} from '../types'
import { EnergyChart } from '../components/EnergyChart'
import { Icon } from '../components/Icon'

type DashboardViewProps = {
  dashboard: Dashboard | null
  lastSnapshot: Snapshot | null
  activeConsumption: number
  solarCapacity: number
  deviceStats: DeviceStats
  canManage: boolean
  busy: boolean
  onNavigateToDevices: () => void
  onStrategyChange: (strategy: StrategyType) => void
}

export function DashboardView({
  dashboard,
  lastSnapshot,
  activeConsumption,
  solarCapacity,
  deviceStats,
  canManage,
  busy,
  onNavigateToDevices,
  onStrategyChange,
}: DashboardViewProps) {
  const latest = dashboard?.latest_log

  return (
    <>
      <section className="overview">
        <article className="battery-panel">
          <div className="card-topline">
            <span className="card-icon battery"><Icon name="battery" /></span>
            <span className="trend-badge positive">Magazyn energii</span>
          </div>
          <div className="metric-copy">
            <p>Poziom baterii</p>
            <h2>
              {dashboard ? dashboard.battery.state_of_charge_percentage.toFixed(0) : '--'}
              <small>%</small>
            </h2>
          </div>
          <div className="battery-gauge" aria-label="Poziom baterii">
            <div
              className="battery-fill"
              style={{ width: `${dashboard?.battery.state_of_charge_percentage ?? 0}%` }}
            />
          </div>
          <div className="metric-row">
            <span>{dashboard ? formatKwh(dashboard.battery.current_charge_kwh) : '--'} dostępne</span>
            <span>z {dashboard ? formatKwh(dashboard.battery.total_capacity_kwh) : '--'}</span>
          </div>
        </article>

        <article className="metric-card">
          <div className="card-topline">
            <span className="card-icon load"><Icon name="bolt" /></span>
            <span className="live-label"><i /> Na żywo</span>
          </div>
          <div className="metric-copy">
            <p>Aktualne zużycie</p>
            <h2>{formatKw(activeConsumption)}</h2>
          </div>
          <div className="metric-footer">
            <span>{deviceStats.active} aktywnych urządzeń</span>
            <button type="button" onClick={onNavigateToDevices}>
              Szczegóły <Icon name="chevron" size={15} />
            </button>
          </div>
        </article>

        <article className="metric-card">
          <div className="card-topline">
            <span className="card-icon solar"><Icon name="solar" /></span>
            <span className="trend-badge">
              {latest ? `${(latest.solar_factor * 100).toFixed(0)}% mocy` : 'Brak danych'}
            </span>
          </div>
          <div className="metric-copy">
            <p>Moc instalacji PV</p>
            <h2>{formatKw(solarCapacity)}</h2>
          </div>
          <div className="metric-footer">
            <span>{latest ? `${latest.weather_cloud_cover.toFixed(0)}% zachmurzenia` : 'Oczekiwanie na pomiar'}</span>
          </div>
        </article>

        <article className="metric-card">
          <div className="card-topline">
            <span className="card-icon wallet"><Icon name="wallet" /></span>
            <span className={`trend-badge ${latest && latest.revenue >= latest.cost ? 'positive' : ''}`}>
              Bilans cyklu
            </span>
          </div>
          <div className="metric-copy">
            <p>Wynik finansowy</p>
            <h2>{latest ? formatMoney(latest.revenue - latest.cost) : '0.00 PLN'}</h2>
          </div>
          <div className="metric-footer">
            <span>Sprzedaż {latest ? formatMoney(latest.revenue) : '0.00 PLN'}</span>
          </div>
        </article>
      </section>

      <section className="workspace view-dashboard">
        <div className="left-column">
          <section className="section-band strategy-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Automatyzacja</p>
                <h2>Strategia zarządzania energią</h2>
                <p className="section-description">
                  {dashboard
                    ? strategyDescriptions[dashboard.settings.active_strategy]
                    : 'Ładowanie ustawień systemu…'}
                </p>
              </div>
              <div className="segmented">
                {(Object.keys(strategyLabels) as StrategyType[]).map((strategy) => (
                  <button
                    key={strategy}
                    type="button"
                    className={dashboard?.settings.active_strategy === strategy ? 'active' : ''}
                    onClick={() => onStrategyChange(strategy)}
                    disabled={busy || !canManage}
                  >
                    {strategyLabels[strategy]}
                  </button>
                ))}
              </div>
            </div>
            <div className="price-grid">
              <span><small>Cena zakupu</small>{dashboard ? formatMoney(dashboard.settings.grid_buy_price) : '--'}</span>
              <span><small>Cena sprzedaży</small>{dashboard ? formatMoney(dashboard.settings.grid_sell_price) : '--'}</span>
              <span><small>Aktywny tryb</small>{dashboard ? strategyLabels[dashboard.settings.active_strategy] : '--'}</span>
            </div>
            {lastSnapshot && (
              <div className="decision-insight">
                <span className="card-icon"><Icon name="bolt" size={17} /></span>
                <div>
                  <strong>Ostatnia decyzja systemu</strong>
                  <p>{lastSnapshot.decision.note}</p>
                </div>
              </div>
            )}
          </section>
        </div>
        <EnergyChart dashboard={dashboard} />
      </section>
    </>
  )
}
