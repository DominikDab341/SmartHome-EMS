import type { AppView, StrategyType } from '../types'

export const strategyLabels: Record<StrategyType, string> = {
  maximize_profit: 'Maksymalny zysk',
  eco_friendly: 'Tryb ekologiczny',
  battery_life: 'Ochrona baterii',
}

export const strategyDescriptions: Record<StrategyType, string> = {
  maximize_profit: 'Kupuj i sprzedawaj energię wtedy, gdy jest to najbardziej opłacalne.',
  eco_friendly: 'W pierwszej kolejności wykorzystuj energię wyprodukowaną na miejscu.',
  battery_life: 'Ograniczaj głębokie cykle, aby wydłużyć żywotność magazynu energii.',
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
