import { useEffect, useMemo, useState } from 'react'
import './App.css'

type DeviceType = 'appliance' | 'solar'
type StrategyType = 'maximize_profit' | 'eco_friendly' | 'battery_life'

type Device = {
  id: number
  name: string
  type: DeviceType
  max_power_kw: number
  current_power_kw: number
  is_active: boolean
}

type Battery = {
  id: number
  total_capacity_kwh: number
  current_charge_kwh: number
  min_safe_percentage: number
  max_charge_rate_kw: number
  max_discharge_rate_kw: number
  state_of_charge_percentage: number
}

type Settings = {
  id: number
  active_strategy: StrategyType
  grid_buy_price: number
  grid_sell_price: number
  location_name: string
  latitude: number
  longitude: number
}

type EnergyLog = {
  id: number
  timestamp: string
  total_consumption_kwh: number
  total_production_kwh: number
  grid_bought_kwh: number
  grid_sold_kwh: number
  battery_charged_kwh: number
  battery_discharged_kwh: number
  cost: number
  revenue: number
  strategy: StrategyType
  weather_cloud_cover: number
  solar_factor: number
}

type Dashboard = {
  devices: Device[]
  battery: Battery
  settings: Settings
  latest_log: EnergyLog | null
  logs: EnergyLog[]
}

type Snapshot = {
  total_consumption_kwh: number
  total_production_kwh: number
  battery_soc_percentage: number
  decision: {
    grid_bought_kwh: number
    grid_sold_kwh: number
    cost: number
    revenue: number
    note: string
  }
  weather: {
    cloud_cover: number
    solar_factor: number
    temperature_c: number
  }
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const strategyLabels: Record<StrategyType, string> = {
  maximize_profit: 'Profit',
  eco_friendly: 'Eco',
  battery_life: 'Battery',
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return (await response.json()) as T
}

function formatKwh(value: number): string {
  return `${value.toFixed(2)} kWh`
}

function formatKw(value: number): string {
  return `${value.toFixed(1)} kW`
}

function formatMoney(value: number): string {
  return `${value.toFixed(2)} PLN`
}

function App() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [lastSnapshot, setLastSnapshot] = useState<Snapshot | null>(null)
  const [status, setStatus] = useState('Connecting')
  const [busy, setBusy] = useState(false)

  const activeConsumption = useMemo(() => {
    return dashboard?.devices
      .filter((device) => device.type === 'appliance' && device.is_active)
      .reduce((sum, device) => sum + device.current_power_kw, 0) ?? 0
  }, [dashboard])

  const solarCapacity = useMemo(() => {
    return dashboard?.devices
      .filter((device) => device.type === 'solar' && device.is_active)
      .reduce((sum, device) => sum + device.max_power_kw, 0) ?? 0
  }, [dashboard])

  const latest = dashboard?.latest_log
  const maxChartValue = Math.max(
    0.01,
    ...(dashboard?.logs.flatMap((log) => [
      log.total_consumption_kwh,
      log.total_production_kwh,
    ]) ?? [0.01]),
  )

  async function loadDashboard(): Promise<void> {
    try {
      const data = await request<Dashboard>('/api/ems/dashboard')
      setDashboard(data)
      setStatus('Online')
    } catch {
      setStatus('Offline')
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadDashboard()
    }, 0)
    const timer = window.setInterval(() => {
      void loadDashboard()
    }, 10000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(timer)
    }
  }, [])

  async function runTick(): Promise<void> {
    setBusy(true)
    try {
      const snapshot = await request<Snapshot>('/api/ems/simulation/tick', {
        method: 'POST',
      })
      setLastSnapshot(snapshot)
      await loadDashboard()
    } finally {
      setBusy(false)
    }
  }

  async function setStrategy(strategy: StrategyType): Promise<void> {
    setBusy(true)
    try {
      await request<Settings>('/api/ems/strategy', {
        method: 'POST',
        body: JSON.stringify({ strategy }),
      })
      await loadDashboard()
    } finally {
      setBusy(false)
    }
  }

  async function toggleDevice(device: Device): Promise<void> {
    setBusy(true)
    try {
      await request<Device>(`/api/ems/devices/${device.id}/toggle`, {
        method: 'POST',
      })
      await loadDashboard()
    } finally {
      setBusy(false)
    }
  }

  async function updateDevicePower(device: Device, value: number): Promise<void> {
    setDashboard((current) => {
      if (!current) return current
      return {
        ...current,
        devices: current.devices.map((item) =>
          item.id === device.id ? { ...item, current_power_kw: value } : item,
        ),
      }
    })
    await request<Device>(`/api/ems/devices/${device.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ current_power_kw: value, is_active: value > 0 }),
    })
    await loadDashboard()
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Smart Home EMS</p>
          <h1>Energy Control</h1>
        </div>
        <div className={`connection ${status.toLowerCase()}`}>
          <span />
          {status}
        </div>
      </header>

      <section className="overview">
        <article className="battery-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Storage</p>
              <h2>{dashboard ? `${dashboard.battery.state_of_charge_percentage.toFixed(0)}%` : '--'}</h2>
            </div>
            <button type="button" onClick={runTick} disabled={busy}>
              {busy ? 'Running' : 'Tick'}
            </button>
          </div>
          <div className="battery-gauge" aria-label="Battery charge">
            <div
              className="battery-fill"
              style={{
                width: `${dashboard?.battery.state_of_charge_percentage ?? 0}%`,
              }}
            />
          </div>
          <div className="metric-row">
            <span>{dashboard ? formatKwh(dashboard.battery.current_charge_kwh) : '--'}</span>
            <span>{dashboard ? formatKwh(dashboard.battery.total_capacity_kwh) : '--'}</span>
          </div>
        </article>

        <article className="flow-panel">
          <p className="eyebrow">Live Flow</p>
          <div className="flow-grid">
            <div>
              <strong>{formatKw(activeConsumption)}</strong>
              <span>Load</span>
            </div>
            <div>
              <strong>{formatKw(solarCapacity)}</strong>
              <span>PV</span>
            </div>
            <div>
              <strong>{latest ? formatMoney(latest.revenue - latest.cost) : '0.00 PLN'}</strong>
              <span>Net</span>
            </div>
          </div>
          <p className="decision-note">
            {lastSnapshot?.decision.note ?? 'Waiting for the next simulation tick.'}
          </p>
        </article>

        <article className="weather-panel">
          <p className="eyebrow">{dashboard?.settings.location_name ?? 'Location'}</p>
          <div className="sun-orbit">
            <span />
          </div>
          <div className="metric-row">
            <span>Clouds {latest ? `${latest.weather_cloud_cover.toFixed(0)}%` : '--'}</span>
            <span>Solar {latest ? `${(latest.solar_factor * 100).toFixed(0)}%` : '--'}</span>
          </div>
        </article>
      </section>

      <section className="workspace">
        <div className="left-column">
          <section className="section-band">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Strategy</p>
                <h2>{dashboard ? strategyLabels[dashboard.settings.active_strategy] : '--'}</h2>
              </div>
              <div className="segmented">
                {(Object.keys(strategyLabels) as StrategyType[]).map((strategy) => (
                  <button
                    key={strategy}
                    type="button"
                    className={dashboard?.settings.active_strategy === strategy ? 'active' : ''}
                    onClick={() => void setStrategy(strategy)}
                    disabled={busy}
                  >
                    {strategyLabels[strategy]}
                  </button>
                ))}
              </div>
            </div>
            <div className="price-grid">
              <span>Buy {dashboard ? formatMoney(dashboard.settings.grid_buy_price) : '--'}</span>
              <span>Sell {dashboard ? formatMoney(dashboard.settings.grid_sell_price) : '--'}</span>
            </div>
          </section>

          <section className="section-band">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Devices</p>
                <h2>{dashboard?.devices.length ?? 0} active nodes</h2>
              </div>
            </div>
            <div className="device-list">
              {dashboard?.devices.map((device) => (
                <article className="device-card" key={device.id}>
                  <div>
                    <strong>{device.name}</strong>
                    <span>{device.type === 'solar' ? 'Production' : formatKw(device.current_power_kw)}</span>
                  </div>
                  {device.type === 'appliance' && (
                    <input
                      aria-label={`${device.name} power`}
                      type="range"
                      min="0"
                      max={device.max_power_kw}
                      step="0.1"
                      value={device.current_power_kw}
                      onChange={(event) =>
                        void updateDevicePower(device, Number(event.currentTarget.value))
                      }
                    />
                  )}
                  <button
                    type="button"
                    className={device.is_active ? 'switch active' : 'switch'}
                    onClick={() => void toggleDevice(device)}
                    disabled={busy}
                  >
                    {device.is_active ? 'On' : 'Off'}
                  </button>
                </article>
              )) ?? <p className="muted">No device data.</p>}
            </div>
          </section>
        </div>

        <section className="chart-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">History</p>
              <h2>Consumption / Production</h2>
            </div>
          </div>
          <div className="chart">
            {dashboard?.logs.length ? (
              dashboard.logs.map((log) => (
                <div className="chart-column" key={log.id}>
                  <span
                    className="bar consume"
                    style={{ height: `${(log.total_consumption_kwh / maxChartValue) * 100}%` }}
                  />
                  <span
                    className="bar produce"
                    style={{ height: `${(log.total_production_kwh / maxChartValue) * 100}%` }}
                  />
                </div>
              ))
            ) : (
              <div className="empty-chart">Run Tick</div>
            )}
          </div>
          <div className="legend">
            <span><i className="consume-dot" />Consumption</span>
            <span><i className="produce-dot" />Production</span>
          </div>
          <div className="log-grid">
            <span>Grid bought {latest ? formatKwh(latest.grid_bought_kwh) : '--'}</span>
            <span>Grid sold {latest ? formatKwh(latest.grid_sold_kwh) : '--'}</span>
            <span>Battery in {latest ? formatKwh(latest.battery_charged_kwh) : '--'}</span>
            <span>Battery out {latest ? formatKwh(latest.battery_discharged_kwh) : '--'}</span>
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
