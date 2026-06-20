import { useState, type FormEvent } from 'react'
import { Icon } from './Icon'

type LocationControlProps = {
  currentLocation: string
  disabled: boolean
  busy: boolean
  error: string | null
  onSubmit: (city: string) => void
}

export function LocationControl({
  currentLocation,
  disabled,
  busy,
  error,
  onSubmit,
}: LocationControlProps) {
  const [city, setCity] = useState(currentLocation.split(',')[0].trim())

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const normalizedCity = city.trim()
    if (normalizedCity.length >= 2) {
      onSubmit(normalizedCity)
    }
  }

  return (
    <div className="location-control">
      <div className="location-control-heading">
        <span className="card-icon"><Icon name="weather" size={17} /></span>
        <div>
          <strong>Lokalizacja danych pogodowych</strong>
          <p>
            Aktywne miasto: <b>{currentLocation}</b>. Zmiana zostanie użyta w następnym cyklu.
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <label htmlFor="weather-city">Miasto</label>
        <div className="location-control-fields">
          <input
            id="weather-city"
            type="text"
            value={city}
            minLength={2}
            maxLength={96}
            placeholder="np. Gdańsk"
            autoComplete="address-level2"
            disabled={disabled || busy}
            onChange={(event) => setCity(event.currentTarget.value)}
          />
          <button
            type="submit"
            disabled={disabled || busy || city.trim().length < 2}
          >
            {busy ? 'Wyszukiwanie…' : 'Ustaw miasto'}
          </button>
        </div>
      </form>
      {error && <p className="location-error" role="alert">{error}</p>}
    </div>
  )
}
