import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import './App.css'
import { AppHeader } from './components/AppHeader'
import { AppSidebar } from './components/AppSidebar'
import { AuthScreen, SessionLoadingScreen } from './components/AuthScreen'
import { TOKEN_STORAGE_KEY } from './config'
import { ApiError, request } from './lib/api'
import {
  authErrorMessage,
  canManageHouse,
  deviceErrorMessage,
  deviceFormFromDevice,
  devicePayloadFromForm,
  emptyAuthForm,
  emptyDeviceForm,
  emptyResidentForm,
  residentErrorMessage,
  validateDeviceForm,
} from './lib/forms'
import type {
  AppView,
  AuthForm,
  AuthMode,
  ConnectionStatus,
  Dashboard,
  Device,
  DeviceForm,
  ResidentForm,
  Settings,
  Snapshot,
  StrategyType,
  TokenResponse,
  UserProfile,
} from './types'
import { AnalyticsView } from './views/AnalyticsView'
import { DashboardView } from './views/DashboardView'
import { DevicesView } from './views/DevicesView'
import { ResidentsView } from './views/ResidentsView'

function App() {
  const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
  const [token, setToken] = useState<string | null>(storedToken)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [checkingSession, setCheckingSession] = useState(Boolean(storedToken))
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authForm, setAuthForm] = useState<AuthForm>(emptyAuthForm)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authBusy, setAuthBusy] = useState(false)

  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [lastSnapshot, setLastSnapshot] = useState<Snapshot | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>(
    storedToken ? 'Connecting' : 'Offline',
  )
  const [busy, setBusy] = useState(false)
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [locationBusy, setLocationBusy] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  const [deviceForm, setDeviceForm] = useState<DeviceForm>(emptyDeviceForm)
  const [editingDeviceId, setEditingDeviceId] = useState<number | null>(null)
  const [pendingDeleteDeviceId, setPendingDeleteDeviceId] = useState<number | null>(null)
  const [deviceBusy, setDeviceBusy] = useState(false)
  const [deviceError, setDeviceError] = useState<string | null>(null)

  const [residents, setResidents] = useState<UserProfile[]>([])
  const [residentForm, setResidentForm] = useState<ResidentForm>(emptyResidentForm)
  const [pendingDeleteResidentId, setPendingDeleteResidentId] = useState<number | null>(null)
  const [residentBusy, setResidentBusy] = useState(false)
  const [residentError, setResidentError] = useState<string | null>(null)

  const [activeView, setActiveView] = useState<AppView>('dashboard')
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)

  const canManage = canManageHouse(user)
  const devicePanelReady = dashboard !== null

  const activeConsumption = useMemo(
    () =>
      dashboard?.devices
        .filter((device) => device.type === 'appliance' && device.is_active)
        .reduce((sum, device) => sum + device.current_power_kw, 0) ?? 0,
    [dashboard],
  )

  const solarCapacity = useMemo(
    () =>
      dashboard?.devices
        .filter((device) => device.type === 'solar' && device.is_active)
        .reduce((sum, device) => sum + device.max_power_kw, 0) ?? 0,
    [dashboard],
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
    setResidents([])
    setResidentForm(emptyResidentForm)
    setPendingDeleteResidentId(null)
    setResidentError(null)
    setStatus('Offline')
    setSettingsBusy(false)
    setLocationBusy(false)
    setLocationError(null)
    setActiveView('dashboard')
    setMobileNavigationOpen(false)
  }, [])

  const loadDashboard = useCallback(
    async (authToken = token): Promise<void> => {
      if (!authToken) return

      try {
        const data = await request<Dashboard>('/api/ems/dashboard', undefined, authToken)
        setDashboard(data)
        setStatus('Online')
      } catch (error) {
        setStatus('Offline')
        if (error instanceof ApiError && error.status === 401) {
          clearSession()
          setAuthError('Sesja wygasła. Zaloguj się ponownie.')
        }
      }
    },
    [clearSession, token],
  )

  const loadResidents = useCallback(
    async (authToken = token): Promise<void> => {
      if (!authToken || !canManage) {
        setResidents([])
        return
      }

      try {
        const data = await request<UserProfile[]>('/api/users/residents', undefined, authToken)
        setResidents(data)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearSession()
          setAuthError('Sesja wygasła. Zaloguj się ponownie.')
        }
      }
    },
    [canManage, clearSession, token],
  )

  useEffect(() => {
    if (!token) return

    let cancelled = false

    request<UserProfile>('/api/users/me', undefined, token)
      .then((profile) => {
        if (cancelled) return

        setUser(profile)
        setStatus('Online')
        if (canManageHouse(profile)) {
          void request<UserProfile[]>('/api/users/residents', undefined, token)
            .then((data) => {
              if (!cancelled) setResidents(data)
            })
            .catch(() => {
              if (!cancelled) setResidents([])
            })
        } else {
          setResidents([])
        }
      })
      .catch(() => {
        if (!cancelled) clearSession()
      })
      .finally(() => {
        if (!cancelled) setCheckingSession(false)
      })

    return () => {
      cancelled = true
    }
  }, [clearSession, token])

  useEffect(() => {
    if (!token || !user) return undefined

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

  async function loginWithCredentials(
    username: string,
    password: string,
  ): Promise<TokenResponse> {
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
      setAuthError('Uzupełnij wszystkie wymagane pola.')
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
      setAuthForm(emptyAuthForm)

      if (canManageHouse(profile)) {
        const ownerResidents = await request<UserProfile[]>(
          '/api/users/residents',
          undefined,
          tokenResponse.access_token,
        )
        setResidents(ownerResidents)
      } else {
        setResidents([])
      }

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

  function navigateTo(view: AppView): void {
    setActiveView(view)
    setMobileNavigationOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
    setActiveView('devices')
  }

  async function handleDeviceSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!token || !devicePanelReady || !canManage) return

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
          { method: 'PATCH', body: JSON.stringify(payload) },
          token,
        )
      } else {
        await request<Device>(
          '/api/ems/devices',
          { method: 'POST', body: JSON.stringify(payload) },
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
    if (!token || !canManage) return

    setDeviceBusy(true)
    setDeviceError(null)
    try {
      await request<void>(
        `/api/ems/devices/${device.id}`,
        { method: 'DELETE' },
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

  async function toggleDevice(device: Device): Promise<void> {
    if (!token || !canManage) return

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
    if (!token || !canManage) return

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

  function updateResidentField(field: keyof ResidentForm, value: string): void {
    setResidentForm((current) => ({ ...current, [field]: value }))
    setResidentError(null)
    setPendingDeleteResidentId(null)
  }

  async function handleResidentSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!token || !canManage) return

    const username = residentForm.username.trim()
    const email = residentForm.email.trim()
    const password = residentForm.password

    if (!username || !email || !password) {
      setResidentError('Uzupełnij wszystkie pola mieszkańca.')
      return
    }

    setResidentBusy(true)
    setResidentError(null)
    try {
      await request<UserProfile>(
        '/api/users/residents',
        {
          method: 'POST',
          body: JSON.stringify({ username, email, password }),
        },
        token,
      )
      setResidentForm(emptyResidentForm)
      setPendingDeleteResidentId(null)
      await loadResidents(token)
    } catch (error) {
      setResidentError(residentErrorMessage(error))
    } finally {
      setResidentBusy(false)
    }
  }

  function requestDeleteResident(resident: UserProfile): void {
    setPendingDeleteResidentId(resident.id)
    setResidentError(null)
  }

  async function confirmDeleteResident(resident: UserProfile): Promise<void> {
    if (!token || !canManage) return

    setResidentBusy(true)
    setResidentError(null)
    try {
      await request<void>(
        `/api/users/residents/${resident.id}`,
        { method: 'DELETE' },
        token,
      )
      setPendingDeleteResidentId(null)
      await loadResidents(token)
    } catch (error) {
      setResidentError(
        error instanceof ApiError && error.status === 404
          ? 'Ten mieszkaniec nie istnieje albo nie należy do tego domu.'
          : residentErrorMessage(error),
      )
    } finally {
      setResidentBusy(false)
    }
  }

  async function runTick(): Promise<void> {
    if (!token || !canManage) return

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
    if (!token || !canManage) return

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

  async function setBatteryExportThreshold(value: number): Promise<void> {
    if (!token || !canManage) return

    setSettingsBusy(true)
    setDashboard((current) =>
      current
        ? {
            ...current,
            settings: {
              ...current.settings,
              battery_export_threshold_percentage: value,
            },
          }
        : current,
    )

    try {
      const settings = await request<Settings>(
        '/api/ems/settings',
        {
          method: 'PATCH',
          body: JSON.stringify({
            battery_export_threshold_percentage: value,
          }),
        },
        token,
      )
      setDashboard((current) => (current ? { ...current, settings } : current))
    } catch {
      await loadDashboard(token)
    } finally {
      setSettingsBusy(false)
    }
  }

  async function setWeatherLocation(city: string): Promise<void> {
    if (!token || !canManage) return

    setLocationBusy(true)
    setLocationError(null)
    try {
      const settings = await request<Settings>(
        '/api/ems/settings/location',
        {
          method: 'POST',
          body: JSON.stringify({ city }),
        },
        token,
      )
      setDashboard((current) => (current ? { ...current, settings } : current))
      setLastSnapshot(null)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setLocationError('Nie znaleziono takiego miasta. Sprawdź nazwę i spróbuj ponownie.')
      } else if (error instanceof ApiError && error.status === 503) {
        setLocationError('Usługa lokalizacji jest chwilowo niedostępna. Spróbuj ponownie.')
      } else {
        setLocationError('Nie udało się zmienić miasta.')
      }
    } finally {
      setLocationBusy(false)
    }
  }

  if (!token || (!user && !checkingSession)) {
    return (
      <AuthScreen
        mode={authMode}
        form={authForm}
        error={authError}
        busy={authBusy}
        onModeChange={switchAuthMode}
        onFieldChange={updateAuthField}
        onSubmit={(event) => void handleAuthSubmit(event)}
      />
    )
  }

  if (!user) {
    return <SessionLoadingScreen />
  }

  return (
    <main className="app-shell">
      <AppSidebar
        activeView={activeView}
        mobileOpen={mobileNavigationOpen}
        canManage={canManage}
        status={status}
        user={user}
        deviceStats={deviceStats}
        residentsCount={residents.length}
        onNavigate={navigateTo}
        onCloseMobile={() => setMobileNavigationOpen(false)}
        onLogout={logout}
      />

      <div className="app-main">
        <AppHeader
          activeView={activeView}
          username={user.username}
          status={status}
          canManage={canManage}
          busy={busy || settingsBusy}
          onOpenMobile={() => setMobileNavigationOpen(true)}
          onRunTick={() => void runTick()}
        />

        {activeView === 'dashboard' && (
          <DashboardView
            dashboard={dashboard}
            lastSnapshot={lastSnapshot}
            activeConsumption={activeConsumption}
            solarCapacity={solarCapacity}
            deviceStats={deviceStats}
            canManage={canManage}
            busy={busy || settingsBusy}
            locationBusy={locationBusy}
            locationError={locationError}
            onNavigateToDevices={() => navigateTo('devices')}
            onStrategyChange={(strategy) => void setStrategy(strategy)}
            onExportThresholdChange={(value) => void setBatteryExportThreshold(value)}
            onLocationChange={(city) => void setWeatherLocation(city)}
          />
        )}

        {activeView === 'devices' && (
          <DevicesView
            canManage={canManage}
            busy={busy}
            deviceBusy={deviceBusy}
            devicePanelReady={devicePanelReady}
            deviceForm={deviceForm}
            deviceError={deviceError}
            editingDeviceId={editingDeviceId}
            pendingDeleteDeviceId={pendingDeleteDeviceId}
            deviceStats={deviceStats}
            deviceGroups={sortedDeviceGroups}
            onFieldChange={updateDeviceFormField}
            onSubmit={(event) => void handleDeviceSubmit(event)}
            onResetForm={resetDeviceForm}
            onPowerChange={(device, value) => void updateDevicePower(device, value)}
            onToggle={(device) => void toggleDevice(device)}
            onEdit={editDevice}
            onRequestDelete={requestDeleteDevice}
            onConfirmDelete={(device) => void confirmDeleteDevice(device)}
            onCancelDelete={() => setPendingDeleteDeviceId(null)}
          />
        )}

        {activeView === 'analytics' && <AnalyticsView dashboard={dashboard} />}

        {activeView === 'residents' && canManage && (
          <ResidentsView
            residents={residents}
            form={residentForm}
            busy={residentBusy}
            error={residentError}
            pendingDeleteId={pendingDeleteResidentId}
            onFieldChange={updateResidentField}
            onSubmit={(event) => void handleResidentSubmit(event)}
            onRequestDelete={requestDeleteResident}
            onConfirmDelete={(resident) => void confirmDeleteResident(resident)}
            onCancelDelete={() => setPendingDeleteResidentId(null)}
          />
        )}
      </div>
    </main>
  )
}

export default App
