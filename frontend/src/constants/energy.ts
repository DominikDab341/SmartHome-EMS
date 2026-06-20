import type { AppView, StrategyType } from '../types'

export const strategyLabels: Record<StrategyType, string> = {
  maximize_profit: 'Pełen zakup z sieci',
  eco_friendly: 'Tryb ekologiczny',
  battery_life: 'Ochrona baterii',
}

export const strategyDescriptions: Record<StrategyType, string> = {
  maximize_profit: 'Sieć pokrywa zużycie, a fotowoltaika ładuje baterię do ustawionego progu eksportu.',
  eco_friendly: 'Bateria pokrywa całe możliwe zapotrzebowanie, także poniżej rezerwy 20%.',
  battery_life: 'Bateria pracuje pełną dozwoloną mocą, ale zatrzymuje się dokładnie na 20%.',
}

export const pageMeta: Record<
  AppView,
  { eyebrow: string; title: string; description: string }
> = {
  dashboard: {
    eyebrow: 'Centrum sterowania',
    title: 'Dzień dobry',
    description: 'Najważniejsze informacje o energii w Twoim domu.',
  },
  devices: {
    eyebrow: 'Zarządzanie domem',
    title: 'Urządzenia',
    description: 'Steruj odbiornikami i instalacją fotowoltaiczną.',
  },
  analytics: {
    eyebrow: 'Dane i historia',
    title: 'Analityka energii',
    description: 'Sprawdź produkcję, zużycie i przepływy energii.',
  },
  residents: {
    eyebrow: 'Dostęp do domu',
    title: 'Mieszkańcy',
    description: 'Zarządzaj kontami z dostępem do podglądu systemu.',
  },
}
