import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import './App.css'

type DeviceType = 'appliance' | 'solar'
type StrategyType = 'maximize_profit' | 'eco_friendly' | 'battery_life'
type AuthMode = 'login' | 'register'

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

type TokenResponse = {
  access_token: string
  token_type: string
}

type UserProfile = {
  id: number
  username: string
  email: string
  role: 'ADMIN' | 'OWNER' | 'RESIDENT'
}

type AuthForm = {
  username: string
  email: string
  password: string
}

type DeviceForm = {
  name: string
  type: DeviceType
  maxPowerKw: string
  currentPowerKw: string
  isActive: boolean
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const TOKEN_STORAGE_KEY = 'smart-home-ems-token'

const strategyLabels: Record<StrategyType, string> = {
  maximize_profit: 'Profit',
  eco_friendly: 'Eco',
  battery_life: 'Battery',
}

const emptyDeviceForm: DeviceForm = {
  name: '',
  type: 'appliance',
  maxPowerKw: '1.0',
  currentPowerKw: '0.5',
  isActive: true,
}

class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown }
    if (typeof body.detail === 'string') {
      return body.detail
    }
    if (Array.isArray(body.detail)) {
      return 'Nieprawidlowe dane formularza.'
    }
  } catch {
    return `HTTP ${response.status}`
  }

  return `HTTP ${response.status}`
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(init.headers)
  const body = init.body

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (
    body &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response))
  }

  if (response.status === 204) {
    return undefined as T
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

function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Nieprawidlowa nazwa uzytkownika lub haslo.'
    }
    if (error.status === 409) {
      return error.message.toLowerCase().includes('email')
        ? 'Ten adres email jest juz zarejestrowany.'
        : 'Ta nazwa uzytkownika jest juz zajeta.'
    }
    if (error.status === 422) {
      return 'Sprawdz email, nazwe uzytkownika i haslo minimum 8 znakow.'
    }
    return error.message
  }

  return 'Nie udalo sie polaczyc z API.'
}

function deviceFormFromDevice(device: Device): DeviceForm {
  return {
    name: device.name,
    type: device.type,
    maxPowerKw: String(device.max_power_kw),
    currentPowerKw: String(device.current_power_kw),
    isActive: device.is_active,
  }
}

function parseDevicePower(value: string): number {
  return Number(value.replace(',', '.'))
}

function validateDeviceForm(form: DeviceForm): string | null {
  const name = form.name.trim()
  const maxPower = parseDevicePower(form.maxPowerKw)
  const currentPower = parseDevicePower(form.currentPowerKw)

  if (name.length < 2) {
    return 'Nazwa musi miec co najmniej 2 znaki.'
  }

  if (!Number.isFinite(maxPower) || maxPower <= 0 || maxPower > 25) {
    return 'Moc maksymalna musi byc wieksza od 0 i nie wieksza niz 25 kW.'
  }

  if (form.type === 'appliance') {
    if (!Number.isFinite(currentPower) || currentPower < 0 || currentPower > 25) {
      return 'Aktualna moc musi byc w zakresie od 0 do 25 kW.'
    }

    if (currentPower > maxPower) {
      return 'Aktualna moc nie moze byc wieksza od mocy maksymalnej.'
    }
  }

  return null
}

function devicePayloadFromForm(form: DeviceForm) {
  const type = form.type
  const maxPower = parseDevicePower(form.maxPowerKw)
  const currentPower = type === 'solar' ? 0 : parseDevicePower(form.currentPowerKw)

  return {
    name: form.name.trim(),
    type,
    max_power_kw: Number(maxPower.toFixed(2)),
    current_power_kw: Number(currentPower.toFixed(2)),
    is_active: form.isActive,
  }
}

function deviceErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 422) {
      return 'Sprawdz nazwe, typ oraz wartosci mocy urzadzenia.'
    }
    return error.message
  }

  return 'Nie udalo sie zapisac zmian urzadzenia.'
}

function App() {
  const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
  const [token, setToken] = useState<string | null>(storedToken)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [checkingSession, setCheckingSession] = useState(Boolean(storedToken))
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authForm, setAuthForm] = useState<AuthForm>({
    username: '',
    email: '',
    password: '',
  })
  const [authError, setAuthError] = useState<string | null>(null)
  const [authBusy, setAuthBusy] = useState(false)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [lastSnapshot, setLastSnapshot] = useState<Snapshot | null>(null)
  const [status, setStatus] = useState(storedToken ? 'Connecting' : 'Offline')
  const [busy, setBusy] = useState(false)
  const [deviceForm, setDeviceForm] = useState<DeviceForm>(emptyDeviceForm)
  const [editingDeviceId, setEditingDeviceId] = useState<number | null>(null)
  const [pendingDeleteDeviceId, setPendingDeleteDeviceId] = useState<number | null>(null)
  const [deviceBusy, setDeviceBusy] = useState(false)
  const [deviceError, setDeviceError] = useState<string | null>(null)

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setToken(null)
    setUser(null)
    setCheckingSession(false)
    setDashboard(null)
    setLastSnapshot(null)
    setDeviceForm(emptyDeviceForm)
    setEditingDeviceId(null)
    setPendingDeleteDeviceId(null)
    setDeviceError(null)
    setStatus('Offline')
  }, [])

  const loadDashboard = useCallback(
    async (authToken = token): Promise<void> => {
      if (!authToken) {
        return
      }

      try {
        const data = await request<Dashboard>('/api/ems/dashboard', undefined, authToken)
        setDashboard(data)
        setStatus('Online')
      } catch (error) {
        setStatus('Offline')
        if (error instanceof ApiError && error.status === 401) {
          clearSession()
          setAuthError('Sesja wygasla. Zaloguj sie ponownie.')
        }
      }
    },
    [clearSession, token],
  )

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

  const deviceStats = useMemo(() => {
    const devices = dashboard?.devices ?? []

    return {
      total: devices.length,
      active: devices.filter((device) => device.is_active).length,
      appliances: devices.filter((device) => device.type === 'appliance').length,
      solar: devices.filter((device) => device.type === 'solar').length,
    }
  }, [dashboard])

  const sortedDeviceGroups = useMemo(() => {
    const devices = dashboard?.devices ?? []
    const collator = new Intl.Collator('pl', {
      numeric: true,
      sensitivity: 'base',
    })
    const byName = (first: Device, second: Device) =>
      collator.compare(first.name, second.name)

    return {
      appliances: devices.filter((device) => device.type === 'appliance').sort(byName),
      solar: devices.filter((device) => device.type === 'solar').sort(byName),
    }
  }, [dashboard])

  const devicePanelReady = dashboard !== null

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false

    request<UserProfile>('/api/users/me', undefined, token)
      .then((profile) => {
        if (!cancelled) {
          setUser(profile)
          setStatus('Online')
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearSession()
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingSession(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [clearSession, token])

  useEffect(() => {
    if (!token || !user) {
      return undefined
    }

    const initialLoad = window.setTimeout(() => {
      void loadDashboard(token)
    }, 0)
    const timer = window.setInterval(() => {
      void loadDashboard(token)
    }, 10000)

    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(timer)
    }
  }, [loadDashboard, token, user])

  function updateAuthField(field: keyof AuthForm, value: string): void {
    setAuthForm((current) => ({ ...current, [field]: value }))
  }

  function switchAuthMode(mode: AuthMode): void {
    setAuthMode(mode)
    setAuthError(null)
  }

  async function loginWithCredentials(username: string, password: string): Promise<TokenResponse> {
    return request<TokenResponse>('/api/auth/login', {
      method: 'POST',
      body: new URLSearchParams({ username, password }),
    })
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setAuthError(null)

    const username = authForm.username.trim()
    const email = authForm.email.trim()
    const password = authForm.password

    if (!username || !password || (authMode === 'register' && !email)) {
      setAuthError('Uzupelnij wszystkie wymagane pola.')
      return
    }

    setAuthBusy(true)
    try {
      if (authMode === 'register') {
        await request<UserProfile>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ username, email, password }),
        })
      }

      const tokenResponse = await loginWithCredentials(username, password)
      localStorage.setItem(TOKEN_STORAGE_KEY, tokenResponse.access_token)
      setToken(tokenResponse.access_token)

      const profile = await request<UserProfile>(
        '/api/users/me',
        undefined,
        tokenResponse.access_token,
      )
      setUser(profile)
      setCheckingSession(false)
      setAuthForm({ username: '', email: '', password: '' })
      await loadDashboard(tokenResponse.access_token)
    } catch (error) {
      setAuthError(authErrorMessage(error))
    } finally {
      setAuthBusy(false)
    }
  }

  function logout(): void {
    clearSession()
    setAuthError(null)
  }

  function updateDeviceFormField<K extends keyof DeviceForm>(
    field: K,
    value: DeviceForm[K],
  ): void {
    setDeviceForm((current) => {
      const next = { ...current, [field]: value }

      if (field === 'type' && value === 'solar') {
        next.currentPowerKw = '0'
      }

      return next
    })
    setDeviceError(null)
    setPendingDeleteDeviceId(null)
  }

  function resetDeviceForm(): void {
    setDeviceForm(emptyDeviceForm)
    setEditingDeviceId(null)
    setPendingDeleteDeviceId(null)
    setDeviceError(null)
  }

  function editDevice(device: Device): void {
    setDeviceForm(deviceFormFromDevice(device))
    setEditingDeviceId(device.id)
    setPendingDeleteDeviceId(null)
    setDeviceError(null)
  }

  async function handleDeviceSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!token || !devicePanelReady) return

    const validationError = validateDeviceForm(deviceForm)
    if (validationError) {
      setDeviceError(validationError)
      return
    }

    const payload = devicePayloadFromForm(deviceForm)
    setDeviceBusy(true)
    setDeviceError(null)
    try {
      if (editingDeviceId) {
        await request<Device>(
          `/api/ems/devices/${editingDeviceId}`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          },
          token,
        )
      } else {
        await request<Device>(
          '/api/ems/devices',
          {
            method: 'POST',
            body: JSON.stringify(payload),
          },
          token,
        )
      }

      resetDeviceForm()
      await loadDashboard(token)
    } catch (error) {
      setDeviceError(deviceErrorMessage(error))
    } finally {
      setDeviceBusy(false)
    }
  }

  function requestDeleteDevice(device: Device): void {
    setPendingDeleteDeviceId(device.id)
    setDeviceError(null)
  }

  async function confirmDeleteDevice(device: Device): Promise<void> {
    if (!token) return

    setDeviceBusy(true)
    setDeviceError(null)
    try {
      await request<void>(
        `/api/ems/devices/${device.id}`,
        {
          method: 'DELETE',
        },
        token,
      )

      if (editingDeviceId === device.id) {
        resetDeviceForm()
      } else {
        setPendingDeleteDeviceId(null)
      }

      await loadDashboard(token)
    } catch (error) {
      setDeviceError(deviceErrorMessage(error))
    } finally {
      setDeviceBusy(false)
    }
  }

  async function runTick(): Promise<void> {
    if (!token) return

    setBusy(true)
    try {
      const snapshot = await request<Snapshot>(
        '/api/ems/simulation/tick',
        { method: 'POST' },
        token,
      )
      setLastSnapshot(snapshot)
      await loadDashboard(token)
    } finally {
      setBusy(false)
    }
  }

  async function setStrategy(strategy: StrategyType): Promise<void> {
    if (!token) return

    setBusy(true)
    try {
      await request<Settings>(
        '/api/ems/strategy',
        {
          method: 'POST',
          body: JSON.stringify({ strategy }),
        },
        token,
      )
      await loadDashboard(token)
    } finally {
      setBusy(false)
    }
  }

  async function toggleDevice(device: Device): Promise<void> {
    if (!token) return

    setBusy(true)
    try {
      await request<Device>(
        `/api/ems/devices/${device.id}/toggle`,
        { method: 'POST' },
        token,
      )
      await loadDashboard(token)
    } finally {
      setBusy(false)
    }
  }

  async function updateDevicePower(device: Device, value: number): Promise<void> {
    if (!token) return

    setDashboard((current) => {
      if (!current) return current
      return {
        ...current,
        devices: current.devices.map((item) =>
          item.id === device.id ? { ...item, current_power_kw: value } : item,
        ),
      }
    })
    await request<Device>(
      `/api/ems/devices/${device.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ current_power_kw: value, is_active: value > 0 }),
      },
      token,
    )
    await loadDashboard(token)
  }

  function renderDeviceCard(device: Device) {
    return (
      <article
        className={device.id === editingDeviceId ? 'device-card editing' : 'device-card'}
        key={device.id}
      >
        <div>
          <strong>
            {device.name}
            <span className={`device-type ${device.type}`}>
              {device.type === 'solar' ? 'PV' : 'Load'}
            </span>
          </strong>
          <span>
            {device.type === 'solar'
              ? `Capacity ${formatKw(device.max_power_kw)}`
              : `${formatKw(device.current_power_kw)} / ${formatKw(device.max_power_kw)}`}
          </span>
        </div>
        {device.type === 'appliance' ? (
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
        ) : (
          <div className="device-meter">
            <span style={{ width: device.is_active ? '100%' : '0%' }} />
          </div>
        )}
        <button
          type="button"
          className={device.is_active ? 'switch active' : 'switch'}
          onClick={() => void toggleDevice(device)}
          disabled={busy || deviceBusy}
        >
          {device.is_active ? 'On' : 'Off'}
        </button>
        <div className="device-actions">
          {pendingDeleteDeviceId === device.id ? (
            <>
              <button
                type="button"
                className="danger-button compact-button"
                onClick={() => void confirmDeleteDevice(device)}
                disabled={deviceBusy}
              >
                Confirm
              </button>
              <button
                type="button"
                className="ghost-button compact-button"
                onClick={() => setPendingDeleteDeviceId(null)}
                disabled={deviceBusy}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="ghost-button compact-button"
                onClick={() => editDevice(device)}
                disabled={deviceBusy}
              >
                Edit
              </button>
              <button
                type="button"
                className="danger-button compact-button"
                onClick={() => requestDeleteDevice(device)}
                disabled={deviceBusy}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </article>
    )
  }

  if (!token || (!user && !checkingSession)) {
    return (
      <main className="app-shell auth-shell">
        <section className="auth-panel" aria-label="Logowanie do Smart Home EMS">
          <div className="auth-copy">
            <p className="eyebrow">Smart Home EMS</p>
            <h1>Twoj panel energii</h1>
            <p>
              Zaloguj sie albo utworz konto, a aplikacja przygotuje osobny zestaw
              urzadzen, baterii, ustawien i historii dla Twojego uzytkownika.
            </p>
          </div>

          <form className="auth-form" onSubmit={(event) => void handleAuthSubmit(event)}>
            <div className="auth-tabs" role="tablist" aria-label="Tryb autoryzacji">
              <button
                type="button"
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => switchAuthMode('login')}
              >
                Logowanie
              </button>
              <button
                type="button"
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => switchAuthMode('register')}
              >
                Rejestracja
              </button>
            </div>

            <label>
              Nazwa uzytkownika
              <input
                type="text"
                value={authForm.username}
                autoComplete="username"
                minLength={3}
                maxLength={64}
                required
                onChange={(event) => updateAuthField('username', event.currentTarget.value)}
              />
            </label>

            {authMode === 'register' && (
              <label>
                Email
                <input
                  type="email"
                  value={authForm.email}
                  autoComplete="email"
                  required
                  onChange={(event) => updateAuthField('email', event.currentTarget.value)}
                />
              </label>
            )}

            <label>
              Haslo
              <input
                type="password"
                value={authForm.password}
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                minLength={authMode === 'register' ? 8 : undefined}
                required
                onChange={(event) => updateAuthField('password', event.currentTarget.value)}
              />
            </label>

            {authError && <p className="auth-error">{authError}</p>}

            <button type="submit" className="auth-submit" disabled={authBusy}>
              {authBusy
                ? 'Przetwarzanie'
                : authMode === 'register'
                  ? 'Utworz konto'
                  : 'Zaloguj'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="app-shell auth-shell">
        <section className="auth-panel session-panel">
          <p className="eyebrow">Smart Home EMS</p>
          <h1>Sprawdzam sesje</h1>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Smart Home EMS</p>
          <h1>Energy Control</h1>
        </div>
        <div className="topbar-actions">
          <div className={`connection ${status.toLowerCase()}`}>
            <span />
            {status}
          </div>
          <div className="user-chip" title={user.email}>
            <span>{user.username.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{user.username}</strong>
              <small>{user.role.toLowerCase()}</small>
            </div>
          </div>
          <button type="button" className="ghost-button" onClick={logout}>
            Wyloguj
          </button>
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

          <section className="section-band devices-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Devices</p>
                <h2>{deviceStats.active} enabled</h2>
              </div>
              <div className="device-summary">
                <span>{deviceStats.total} total</span>
                <span>{deviceStats.appliances} loads</span>
                <span>{deviceStats.solar} PV</span>
              </div>
            </div>

            <form className="device-form" onSubmit={(event) => void handleDeviceSubmit(event)}>
              <div className="device-form-heading">
                <div>
                  <p className="eyebrow">{editingDeviceId ? 'Edit equipment' : 'New equipment'}</p>
                  <h3>{editingDeviceId ? 'Update device' : 'Add device'}</h3>
                </div>
                {editingDeviceId && (
                  <button
                    type="button"
                    className="ghost-button compact-button"
                    onClick={resetDeviceForm}
                    disabled={deviceBusy}
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className="device-form-grid">
                <label className="wide-field">
                  Name
                  <input
                    type="text"
                    value={deviceForm.name}
                    minLength={2}
                    maxLength={96}
                    placeholder="e.g. Heat pump"
                    disabled={deviceBusy || !devicePanelReady}
                    required
                    onChange={(event) =>
                      updateDeviceFormField('name', event.currentTarget.value)
                    }
                  />
                </label>

                <div className="form-field">
                  <span>Type</span>
                  <div className="type-toggle" role="group" aria-label="Device type">
                    <button
                      type="button"
                      className={deviceForm.type === 'appliance' ? 'active' : ''}
                      onClick={() => updateDeviceFormField('type', 'appliance')}
                      disabled={deviceBusy || !devicePanelReady}
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      className={deviceForm.type === 'solar' ? 'active' : ''}
                      onClick={() => updateDeviceFormField('type', 'solar')}
                      disabled={deviceBusy || !devicePanelReady}
                    >
                      PV
                    </button>
                  </div>
                </div>

                <label>
                  Max kW
                  <input
                    type="number"
                    min="0.1"
                    max="25"
                    step="0.1"
                    value={deviceForm.maxPowerKw}
                    disabled={deviceBusy || !devicePanelReady}
                    required
                    onChange={(event) =>
                      updateDeviceFormField('maxPowerKw', event.currentTarget.value)
                    }
                  />
                </label>

                <label>
                  Current kW
                  <input
                    type="number"
                    min="0"
                    max={deviceForm.maxPowerKw || 25}
                    step="0.1"
                    value={deviceForm.currentPowerKw}
                    disabled={deviceForm.type === 'solar' || deviceBusy || !devicePanelReady}
                    required={deviceForm.type === 'appliance'}
                    onChange={(event) =>
                      updateDeviceFormField('currentPowerKw', event.currentTarget.value)
                    }
                  />
                </label>

                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={deviceForm.isActive}
                    disabled={deviceBusy || !devicePanelReady}
                    onChange={(event) =>
                      updateDeviceFormField('isActive', event.currentTarget.checked)
                    }
                  />
                  <span>Active</span>
                </label>
              </div>

              {deviceError && <p className="device-error">{deviceError}</p>}

              <div className="device-form-actions">
                <button type="submit" disabled={deviceBusy || !devicePanelReady}>
                  {deviceBusy
                    ? 'Saving'
                    : !devicePanelReady
                      ? 'Loading'
                      : editingDeviceId
                        ? 'Save changes'
                        : 'Add device'}
                </button>
                {!editingDeviceId && (
                  <button
                    type="button"
                    className="ghost-button compact-button"
                    onClick={resetDeviceForm}
                    disabled={deviceBusy || !devicePanelReady}
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>

            <div className="device-groups">
              <section className="device-group" aria-label="Load devices">
                <div className="device-group-heading">
                  <div>
                    <p className="eyebrow">Load</p>
                    <h3>Home equipment</h3>
                  </div>
                  <span>{sortedDeviceGroups.appliances.length}</span>
                </div>
                <div className="device-list">
                  {sortedDeviceGroups.appliances.length ? (
                    sortedDeviceGroups.appliances.map(renderDeviceCard)
                  ) : (
                    <p className="muted device-empty">No load devices.</p>
                  )}
                </div>
              </section>

              <section className="device-group" aria-label="PV devices">
                <div className="device-group-heading">
                  <div>
                    <p className="eyebrow">PV</p>
                    <h3>Solar production</h3>
                  </div>
                  <span>{sortedDeviceGroups.solar.length}</span>
                </div>
                <div className="device-list">
                  {sortedDeviceGroups.solar.length ? (
                    sortedDeviceGroups.solar.map(renderDeviceCard)
                  ) : (
                    <p className="muted device-empty">No PV devices.</p>
                  )}
                </div>
              </section>
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
