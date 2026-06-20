export type DeviceType = 'appliance' | 'solar'
export type StrategyType = 'maximize_profit' | 'eco_friendly' | 'battery_life'
export type WeatherPreset = 'live' | 'sunny' | 'cloudy' | 'storm' | 'night'
export type AuthMode = 'login' | 'register'
export type AppView = 'dashboard' | 'devices' | 'analytics' | 'residents'
export type ConnectionStatus = 'Connecting' | 'Online' | 'Offline'

export type Device = {
  id: number
  name: string
  type: DeviceType
  max_power_kw: number
  current_power_kw: number
  is_active: boolean
}

export type Battery = {
  id: number
  total_capacity_kwh: number
  current_charge_kwh: number
  min_safe_percentage: number
  max_charge_rate_kw: number
  max_discharge_rate_kw: number
  state_of_charge_percentage: number
}

export type Settings = {
  id: number
  active_strategy: StrategyType
  grid_buy_price: number
  grid_sell_price: number
  tariff_provider: 'PGE' | 'TAURON'
  tariff_updated_at: string | null
  tariff_sell_period: string | null
  battery_export_threshold_percentage: number
  location_name: string
  latitude: number
  longitude: number
  weather_preset: WeatherPreset
}

export type EnergyLog = {
  id: number
  timestamp: string
  interval_seconds: number
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

export type Dashboard = {
  devices: Device[]
  battery: Battery
  settings: Settings
  latest_log: EnergyLog | null
  logs: EnergyLog[]
}

export type Snapshot = {
  interval_seconds: number
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

export type TokenResponse = {
  access_token: string
  token_type: string
}

export type UserProfile = {
  id: number
  username: string
  email: string
  role: 'ADMIN' | 'OWNER' | 'RESIDENT'
  house_id: number | null
}

export type AuthForm = {
  username: string
  email: string
  password: string
}

export type DeviceForm = {
  name: string
  type: DeviceType
  maxPowerKw: string
  currentPowerKw: string
  isActive: boolean
}

export type ResidentForm = {
  username: string
  email: string
  password: string
}

export type DeviceStats = {
  total: number
  active: number
  appliances: number
  solar: number
}

export type DeviceGroups = {
  appliances: Device[]
  solar: Device[]
}
