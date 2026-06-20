import { strategyDescriptions, strategyLabels } from '../constants/energy'
import { SIMULATION_CYCLE_MINUTES } from '../config'
import { formatKw, formatKwh, formatMoney } from '../lib/formatters'
import type {
  Dashboard,
  DeviceStats,
  Snapshot,
  StrategyType,
} from '../types'
import { EnergyChart } from '../components/EnergyChart'
import { ExportThresholdControl } from '../components/ExportThresholdControl'
import { Icon } from '../components/Icon'
import { LocationControl } from '../components/LocationControl'
import { TariffControl, type TariffProvider } from '../components/TariffControl'

type DashboardViewProps = {
  dashboard: Dashboard | null
  lastSnapshot: Snapshot | null
  activeConsumption: number
  solarCapacity: number
  deviceStats: DeviceStats
  canManage: boolean
  busy: boolean
  locationBusy: boolean
  locationError: string | null
  tariffBusy: boolean
  tariffError: string | null
  onNavigateToDevices: () => void
  onStrategyChange: (strategy: StrategyType) => void
  onExportThresholdChange: (value: number) => void
  onLocationChange: (city: string) => void
  onTariffRefresh: (provider: TariffProvider) => void
}

export function DashboardView({
  dashboard,
  lastSnapshot,
  activeConsumption,
  solarCapacity,
  deviceStats,
  canManage,
  busy,
  locationBusy,
  locationError,
  tariffBusy,
  tariffError,
  onNavigateToDevices,
  onStrategyChange,
  onExportThresholdChange,
  onLocationChange,
  onTariffRefresh,
}: DashboardViewProps) {
  const latest = dashboard?.latest_log
  const cycleSeconds = latest?.interval_seconds ?? SIMULATION_CYCLE_MINUTES * 60
  const cycleMinutes = Math.round(cycleSeconds / 60)
  const cycleBalance = latest ? latest.revenue - latest.cost : 0
  const cyclesPerHour = 3600 / cycleSeconds
  const hourlyBalance = cycleBalance * cyclesPerHour
  const dailyBalance = hourlyBalance * 24

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
              Ostatni cykl · {cycleMinutes} min
            </span>
          </div>
          <div className="metric-copy">
            <p>Wynik ostatniego cyklu ({cycleMinutes} min)</p>
            <h2>{formatMoney(cycleBalance)}</h2>
          </div>
          <div
            className="financial-projections"
            title="Prognoza zakłada utrzymanie identycznego zużycia, produkcji i cen."
          >
            <span>
              <small>Prognoza godzinna</small>
              <strong>{formatMoney(hourlyBalance)}</strong>
            </span>
            <span>
              <small>Prognoza dzienna</small>
              <strong>{formatMoney(dailyBalance)}</strong>
            </span>
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
              <span><small>Maks. rozładowanie</small>{dashboard ? formatKw(dashboard.battery.max_discharge_rate_kw) : '--'}</span>
            </div>
            {dashboard && (
              <>
                <TariffControl
                  key={`${dashboard.settings.tariff_provider}-${dashboard.settings.tariff_updated_at ?? 'initial'}`}
                  provider={dashboard.settings.tariff_provider}
                  buyPrice={dashboard.settings.grid_buy_price}
                  sellPrice={dashboard.settings.grid_sell_price}
                  sellPeriod={dashboard.settings.tariff_sell_period}
                  updatedAt={dashboard.settings.tariff_updated_at}
                  disabled={!canManage}
                  busy={tariffBusy}
                  error={tariffError}
                  onRefresh={onTariffRefresh}
                />
                <LocationControl
                  key={dashboard.settings.location_name}
                  currentLocation={dashboard.settings.location_name}
                  disabled={!canManage}
                  busy={locationBusy}
                  error={locationError}
                  onSubmit={onLocationChange}
                />
              </>
            )}
            {dashboard?.settings.active_strategy === 'maximize_profit' && (
              <ExportThresholdControl
                key={dashboard.settings.battery_export_threshold_percentage}
                value={dashboard.settings.battery_export_threshold_percentage}
                disabled={!canManage || busy}
                onChange={onExportThresholdChange}
              />
            )}
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
