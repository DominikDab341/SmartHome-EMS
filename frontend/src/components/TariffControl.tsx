import { useState, type FormEvent } from 'react'
import { formatDateTime, formatMoney } from '../lib/formatters'

export type TariffProvider = 'PGE' | 'TAURON'

type TariffControlProps = {
  provider: TariffProvider
  buyPrice: number
  sellPrice: number
  sellPeriod: string | null
  updatedAt: string | null
  disabled: boolean
  busy: boolean
  error: string | null
  onRefresh: (provider: TariffProvider) => void
}

const providerUrls: Record<TariffProvider, string> = {
  PGE: 'https://www.gkpge.pl/dla-domu/oferta/oferta-taryfowa',
  TAURON:
    'https://media.tauron.pl/pr/862426/tansza-energia-dla-domu-tauron-z-nizszymi-cenami-pradu-w-2026-roku',
}

const pseUrl =
  'https://www.pse.pl/oire/rcem-rynkowa-miesieczna-cena-energii-elektrycznej'

export function TariffControl({
  provider,
  buyPrice,
  sellPrice,
  sellPeriod,
  updatedAt,
  disabled,
  busy,
  error,
  onRefresh,
}: TariffControlProps) {
  const [selectedProvider, setSelectedProvider] = useState<TariffProvider>(provider)

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    onRefresh(selectedProvider)
  }

  return (
    <div className="tariff-control">
      <div className="tariff-control-heading">
        <div>
          <strong>Ceny energii z oficjalnych źródeł</strong>
          <p>
            Zakup: taryfa G11 sprzedawcy. Sprzedaż: najnowsza RCEm dla net-billingu.
          </p>
        </div>
        <span>{updatedAt ? formatDateTime(updatedAt) : 'Nie aktualizowano'}</span>
      </div>

      <form onSubmit={handleSubmit}>
        <label htmlFor="tariff-provider">Sprzedawca energii</label>
        <div className="tariff-control-fields">
          <select
            id="tariff-provider"
            value={selectedProvider}
            disabled={disabled || busy}
            onChange={(event) =>
              setSelectedProvider(event.currentTarget.value as TariffProvider)
            }
          >
            <option value="PGE">PGE · G11</option>
            <option value="TAURON">Tauron · G11</option>
          </select>
          <button type="submit" disabled={disabled || busy}>
            {busy ? 'Pobieranie…' : 'Pobierz aktualne ceny'}
          </button>
        </div>
      </form>

      <div className="tariff-values">
        <span>
          <small>Cena zakupu energii</small>
          <strong>{formatMoney(buyPrice)}/kWh</strong>
        </span>
        <span>
          <small>Cena sprzedaży · {sellPeriod ?? 'brak okresu'}</small>
          <strong>{formatMoney(sellPrice)}/kWh</strong>
        </span>
      </div>

      <p className="tariff-disclaimer">
        Cena zakupu nie zawiera opłat dystrybucyjnych. Źródła:{' '}
        <a href={providerUrls[selectedProvider]} target="_blank" rel="noreferrer">
          {selectedProvider}
        </a>{' '}
        i{' '}
        <a href={pseUrl} target="_blank" rel="noreferrer">
          PSE
        </a>.
      </p>
      {error && <p className="location-error" role="alert">{error}</p>}
    </div>
  )
}
