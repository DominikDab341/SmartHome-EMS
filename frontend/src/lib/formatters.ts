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

export function formatDuration(seconds: number): string {
  if (seconds % 3600 === 0) {
    const hours = seconds / 3600
    return `${hours} godz.`
  }
  return `${Math.round(seconds / 60)} min`
}

export function roleLabel(role: UserProfile['role']): string {
  if (role === 'OWNER') return 'Właściciel'
  if (role === 'ADMIN') return 'Administrator'
  return 'Mieszkaniec'
}
