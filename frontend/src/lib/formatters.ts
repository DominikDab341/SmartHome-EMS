import type { UserProfile } from '../types'

export function formatKwh(value: number): string {
  return `${value.toFixed(2)} kWh`
}

export function formatKw(value: number): string {
  return `${value.toFixed(1)} kW`
}

export function formatMoney(value: number): string {
  return `${value.toFixed(2)} PLN`
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function roleLabel(role: UserProfile['role']): string {
  if (role === 'OWNER') return 'Właściciel'
  if (role === 'ADMIN') return 'Administrator'
  return 'Mieszkaniec'
}
