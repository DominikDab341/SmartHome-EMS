import { EnergyChart } from '../components/EnergyChart'
import { Icon } from '../components/Icon'
import { formatKwh, formatMoney } from '../lib/formatters'
import type { Dashboard } from '../types'

type AnalyticsViewProps = {
  dashboard: Dashboard | null
}

export function AnalyticsView({ dashboard }: AnalyticsViewProps) {
  const latest = dashboard?.latest_log

  return (
    <>
      <section className="analytics-kpis">
        <article>
          <span className="card-icon load"><Icon name="grid" /></span>
          <div><p>Energia z sieci</p><strong>{latest ? formatKwh(latest.grid_bought_kwh) : '--'}</strong></div>
        </article>
        <article>
          <span className="card-icon solar"><Icon name="solar" /></span>
          <div><p>Energia oddana</p><strong>{latest ? formatKwh(latest.grid_sold_kwh) : '--'}</strong></div>
        </article>
        <article>
          <span className="card-icon battery"><Icon name="battery" /></span>
          <div><p>Ładowanie baterii</p><strong>{latest ? formatKwh(latest.battery_charged_kwh) : '--'}</strong></div>
        </article>
        <article>
          <span className="card-icon wallet"><Icon name="wallet" /></span>
          <div><p>Koszt ostatniego cyklu</p><strong>{latest ? formatMoney(latest.cost) : '--'}</strong></div>
        </article>
      </section>

      <section className="workspace view-analytics">
        <EnergyChart dashboard={dashboard} expanded />
      </section>
    </>
  )
}
