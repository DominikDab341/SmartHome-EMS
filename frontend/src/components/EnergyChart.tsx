import { strategyLabels } from '../constants/energy'
import { formatDateTime, formatKwh } from '../lib/formatters'
import type { Dashboard } from '../types'
import { Icon } from './Icon'

type EnergyChartProps = {
  dashboard: Dashboard | null
  expanded?: boolean
}

export function EnergyChart({ dashboard, expanded = false }: EnergyChartProps) {
  const latest = dashboard?.latest_log
  const maxChartValue = Math.max(
    0.01,
    ...(dashboard?.logs.flatMap((log) => [
      log.total_consumption_kwh,
      log.total_production_kwh,
    ]) ?? [0.01]),
  )

  return (
    <section className={`chart-section ${expanded ? 'analytics-chart' : ''}`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Historia pomiarów</p>
          <h2>Zużycie i produkcja energii</h2>
          <p className="section-description">
            {dashboard?.logs.length
              ? `${dashboard.logs.length} ostatnich cykli symulacji`
              : 'Uruchom symulację, aby zobaczyć pierwsze dane.'}
          </p>
        </div>
        <div className="chart-summary">
          <span><i className="consume-dot" /> Zużycie</span>
          <span><i className="produce-dot" /> Produkcja</span>
        </div>
      </div>
      <div className="chart">
        {dashboard?.logs.length ? (
          dashboard.logs.map((log, index) => (
            <div
              className="chart-column"
              key={log.id}
              title={`${formatDateTime(log.timestamp)} · zużycie ${formatKwh(log.total_consumption_kwh)} · produkcja ${formatKwh(log.total_production_kwh)}`}
            >
              <span
                className="bar consume"
                style={{ height: `${(log.total_consumption_kwh / maxChartValue) * 100}%` }}
              />
              <span
                className="bar produce"
                style={{ height: `${(log.total_production_kwh / maxChartValue) * 100}%` }}
              />
              {(index === 0 || index === dashboard.logs.length - 1) && (
                <small>
                  {new Date(log.timestamp).toLocaleTimeString('pl-PL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </small>
              )}
            </div>
          ))
        ) : (
          <div className="empty-chart">
            <span className="card-icon"><Icon name="analytics" /></span>
            <strong>Brak danych historycznych</strong>
            <p>Uruchom pierwszy cykl symulacji.</p>
          </div>
        )}
      </div>
      <div className="log-grid">
        <span><small>Pobrano z sieci</small>{latest ? formatKwh(latest.grid_bought_kwh) : '--'}</span>
        <span><small>Oddano do sieci</small>{latest ? formatKwh(latest.grid_sold_kwh) : '--'}</span>
        <span><small>Naładowano</small>{latest ? formatKwh(latest.battery_charged_kwh) : '--'}</span>
        <span><small>Rozładowano</small>{latest ? formatKwh(latest.battery_discharged_kwh) : '--'}</span>
      </div>

      {expanded && dashboard?.logs.length ? (
        <div className="history-table-wrap">
          <div className="history-table-title">
            <div>
              <p className="eyebrow">Szczegółowe dane</p>
              <h3>Ostatnie cykle</h3>
            </div>
          </div>
          <div className="history-table">
            <div className="history-row history-head">
              <span>Data</span>
              <span>Zużycie</span>
              <span>Produkcja</span>
              <span>Bilans</span>
              <span>Strategia</span>
            </div>
            {[...dashboard.logs].reverse().map((log) => (
              <div className="history-row" key={`history-${log.id}`}>
                <span>{formatDateTime(log.timestamp)}</span>
                <span>{formatKwh(log.total_consumption_kwh)}</span>
                <span>{formatKwh(log.total_production_kwh)}</span>
                <span className={log.total_production_kwh >= log.total_consumption_kwh ? 'positive-text' : 'negative-text'}>
                  {log.total_production_kwh >= log.total_consumption_kwh ? '+' : ''}
                  {formatKwh(log.total_production_kwh - log.total_consumption_kwh)}
                </span>
                <span>{strategyLabels[log.strategy]}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
