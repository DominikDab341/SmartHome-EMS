import { SIMULATION_CYCLE_MINUTES } from '../config'
import { strategyLabels } from '../constants/energy'
import type { Dashboard, StrategyType, WeatherPreset } from '../types'
import { Icon } from './Icon'

type SimulationControlPanelProps = {
  dashboard: Dashboard | null
  busy: boolean
  error: string | null
  onClose: () => void
  onRunTick: () => void
  onStrategyChange: (strategy: StrategyType) => void
  onWeatherChange: (preset: WeatherPreset) => void
  onBatteryLevelChange: (percentage: number) => void
  onPriceChange: (buyPrice: number, sellPrice: number) => void
}

const weatherOptions: Array<{
  value: WeatherPreset
  label: string
  description: string
  detail: string
}> = [
  {
    value: 'live',
    label: 'Pogoda na żywo',
    description: 'Dane Open‑Meteo dla wybranego miasta',
    detail: 'Automatycznie',
  },
  {
    value: 'sunny',
    label: 'Słonecznie',
    description: 'Maksymalna produkcja fotowoltaiki',
    detail: '5% chmur · 27°C',
  },
  {
    value: 'cloudy',
    label: 'Pochmurno',
    description: 'Wyraźnie ograniczona produkcja PV',
    detail: '82% chmur · 15°C',
  },
  {
    value: 'storm',
    label: 'Burza',
    description: 'Minimalna produkcja i trudny scenariusz',
    detail: '98% chmur · 11°C',
  },
  {
    value: 'night',
    label: 'Noc',
    description: 'Brak produkcji z instalacji PV',
    detail: '0% mocy PV · 12°C',
  },
]

const priceScenarios = [
  { label: 'Tania energia', buy: 0.55, sell: 0.22 },
  { label: 'Standard', buy: 0.95, sell: 0.42 },
  { label: 'Godziny szczytu', buy: 1.65, sell: 0.68 },
]

const batteryLevels = [20, 50, 80, 100]

export function SimulationControlPanel({
  dashboard,
  busy,
  error,
  onClose,
  onRunTick,
  onStrategyChange,
  onWeatherChange,
  onBatteryLevelChange,
  onPriceChange,
}: SimulationControlPanelProps) {
  const settings = dashboard?.settings
  const batteryPercentage = dashboard?.battery.state_of_charge_percentage ?? 0

  return (
    <section id="instructor-panel" className="instructor-panel" aria-label="Panel prowadzącego">
      <div className="instructor-panel-heading">
        <div>
          <p className="eyebrow">Tryb demonstracyjny</p>
          <h2>Panel prowadzącego</h2>
          <p>Ustaw warunki scenariusza, a następnie uruchom kolejny cykl symulacji.</p>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Zamknij panel prowadzącego"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className="instructor-controls">
        <div className="instructor-control weather-control">
          <div className="instructor-control-title">
            <span className="card-icon"><Icon name="weather" size={18} /></span>
            <div>
              <strong>Pogoda</strong>
              <small>Obowiązuje od kolejnego cyklu</small>
            </div>
          </div>
          <div className="weather-presets">
            {weatherOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={settings?.weather_preset === option.value ? 'active' : ''}
                onClick={() => onWeatherChange(option.value)}
                disabled={busy || !dashboard}
              >
                <span className={`weather-swatch ${option.value}`} />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                  <em>{option.detail}</em>
                </span>
                {settings?.weather_preset === option.value && <Icon name="check" size={15} />}
              </button>
            ))}
          </div>
        </div>

        <div className="instructor-control">
          <div className="instructor-control-title">
            <span className="card-icon"><Icon name="bolt" size={18} /></span>
            <div>
              <strong>Strategia EMS</strong>
              <small>Logika przepływu energii</small>
            </div>
          </div>
          <div className="instructor-option-list">
            {(Object.keys(strategyLabels) as StrategyType[]).map((strategy) => (
              <button
                key={strategy}
                type="button"
                className={settings?.active_strategy === strategy ? 'active' : ''}
                onClick={() => onStrategyChange(strategy)}
                disabled={busy || !dashboard}
              >
                {strategyLabels[strategy]}
                {settings?.active_strategy === strategy && <Icon name="check" size={15} />}
              </button>
            ))}
          </div>
        </div>

        <div className="instructor-control">
          <div className="instructor-control-title">
            <span className="card-icon"><Icon name="battery" size={18} /></span>
            <div>
              <strong>Poziom baterii</strong>
              <small>Aktualnie {batteryPercentage.toFixed(0)}%</small>
            </div>
          </div>
          <div className="instructor-option-grid">
            {batteryLevels.map((level) => (
              <button
                key={level}
                type="button"
                className={Math.round(batteryPercentage) === level ? 'active' : ''}
                onClick={() => onBatteryLevelChange(level)}
                disabled={busy || !dashboard}
              >
                {level}%
              </button>
            ))}
          </div>
        </div>

        <div className="instructor-control">
          <div className="instructor-control-title">
            <span className="card-icon"><Icon name="wallet" size={18} /></span>
            <div>
              <strong>Ceny energii</strong>
              <small>
                Zakup {settings?.grid_buy_price.toFixed(2) ?? '--'} zł · sprzedaż{' '}
                {settings?.grid_sell_price.toFixed(2) ?? '--'} zł
              </small>
            </div>
          </div>
          <div className="instructor-option-list">
            {priceScenarios.map((scenario) => {
              const active =
                settings?.grid_buy_price === scenario.buy &&
                settings?.grid_sell_price === scenario.sell
              return (
                <button
                  key={scenario.label}
                  type="button"
                  className={active ? 'active' : ''}
                  onClick={() => onPriceChange(scenario.buy, scenario.sell)}
                  disabled={busy || !dashboard}
                >
                  <span>
                    {scenario.label}
                    <small>{scenario.buy.toFixed(2)} / {scenario.sell.toFixed(2)} zł</small>
                  </span>
                  {active && <Icon name="check" size={15} />}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {error && <p className="instructor-error">{error}</p>}

      <div className="instructor-panel-footer">
        <p>Wybrany scenariusz zostanie zapisany i będzie używany także przez automatyczne cykle.</p>
        <button type="button" className="primary-action" onClick={onRunTick} disabled={busy}>
          <Icon name="play" size={18} />
          {busy ? 'Przeliczam…' : `Uruchom cykl ${SIMULATION_CYCLE_MINUTES} min`}
        </button>
      </div>
    </section>
  )
}
