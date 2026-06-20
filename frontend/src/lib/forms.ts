import { ApiError } from './api'
import type { Device, DeviceForm, ResidentForm, UserProfile } from '../types'

export const emptyAuthForm = {
  username: '',
  email: '',
  password: '',
}

export const emptyDeviceForm: DeviceForm = {
  name: '',
  type: 'appliance',
  maxPowerKw: '1.0',
  currentPowerKw: '0.5',
  isActive: true,
}

export const emptyResidentForm: ResidentForm = {
  username: '',
  email: '',
  password: '',
}

export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Nieprawidłowa nazwa użytkownika lub hasło.'
    }
    if (error.status === 409) {
      return error.message.toLowerCase().includes('email')
        ? 'Ten adres email jest już zarejestrowany.'
        : 'Ta nazwa użytkownika jest już zajęta.'
    }
    if (error.status === 422) {
      return 'Sprawdź email, nazwę użytkownika i hasło minimum 8 znaków.'
    }
    return error.message
  }

  return 'Nie udało się połączyć z API.'
}

export function deviceFormFromDevice(device: Device): DeviceForm {
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

export function validateDeviceForm(form: DeviceForm): string | null {
  const name = form.name.trim()
  const maxPower = parseDevicePower(form.maxPowerKw)
  const currentPower = parseDevicePower(form.currentPowerKw)

  if (name.length < 2) {
    return 'Nazwa musi mieć co najmniej 2 znaki.'
  }

  if (!Number.isFinite(maxPower) || maxPower <= 0 || maxPower > 25) {
    return 'Moc maksymalna musi być większa od 0 i nie większa niż 25 kW.'
  }

  if (form.type === 'appliance') {
    if (!Number.isFinite(currentPower) || currentPower < 0 || currentPower > 25) {
      return 'Aktualna moc musi być w zakresie od 0 do 25 kW.'
    }

    if (currentPower > maxPower) {
      return 'Aktualna moc nie może być większa od mocy maksymalnej.'
    }
  }

  return null
}

export function devicePayloadFromForm(form: DeviceForm) {
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

export function deviceErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 422) {
      return 'Sprawdź nazwę, typ oraz wartości mocy urządzenia.'
    }
    return error.message
  }

  return 'Nie udało się zapisać zmian urządzenia.'
}

export function residentErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return 'Tylko właściciel domu może tworzyć konta mieszkańców.'
    }
    if (error.status === 409) {
      return error.message.toLowerCase().includes('email')
        ? 'Ten adres email jest już zarejestrowany.'
        : 'Ta nazwa użytkownika jest już zajęta.'
    }
    if (error.status === 422) {
      return 'Sprawdź email, nazwę użytkownika i hasło minimum 8 znaków.'
    }
    return error.message
  }

  return 'Nie udało się utworzyć konta mieszkańca.'
}

export function canManageHouse(profile: UserProfile | null): boolean {
  return profile?.role === 'OWNER' || profile?.role === 'ADMIN'
}
