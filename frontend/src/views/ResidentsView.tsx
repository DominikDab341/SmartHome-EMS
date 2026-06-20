import type { FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { roleLabel } from '../lib/formatters'
import type { ResidentForm, UserProfile } from '../types'

type ResidentsViewProps = {
  residents: UserProfile[]
  form: ResidentForm
  busy: boolean
  error: string | null
  pendingDeleteId: number | null
  onFieldChange: (field: keyof ResidentForm, value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onRequestDelete: (resident: UserProfile) => void
  onConfirmDelete: (resident: UserProfile) => void
  onCancelDelete: () => void
}

export function ResidentsView({
  residents,
  form,
  busy,
  error,
  pendingDeleteId,
  onFieldChange,
  onSubmit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: ResidentsViewProps) {
  return (
    <section className="workspace view-residents">
      <div className="left-column">
        <section className="section-band resident-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Konta domowników</p>
              <h2>{residents.length} {residents.length === 1 ? 'mieszkaniec' : 'mieszkańców'}</h2>
              <p className="section-description">
                Mieszkańcy mogą obserwować system, ale nie zmieniają jego konfiguracji.
              </p>
            </div>
          </div>

          <form className="resident-form" onSubmit={onSubmit}>
            <label>
              Nazwa użytkownika
              <input
                type="text"
                value={form.username}
                minLength={3}
                maxLength={64}
                placeholder="np. anna"
                required
                onChange={(event) => onFieldChange('username', event.currentTarget.value)}
              />
            </label>
            <label>
              Adres e-mail
              <input
                type="email"
                value={form.email}
                placeholder="anna@example.com"
                required
                onChange={(event) => onFieldChange('email', event.currentTarget.value)}
              />
            </label>
            <label>
              Hasło tymczasowe
              <input
                type="password"
                value={form.password}
                minLength={8}
                placeholder="Minimum 8 znaków"
                required
                onChange={(event) => onFieldChange('password', event.currentTarget.value)}
              />
            </label>
            {error && <p className="device-error">{error}</p>}
            <button type="submit" disabled={busy}>
              <Icon name="plus" size={17} />
              {busy ? 'Tworzę konto…' : 'Dodaj mieszkańca'}
            </button>
          </form>

          <div className="resident-list">
            {residents.length ? (
              residents.map((resident) => (
                <div className="resident-row" key={resident.id}>
                  <div className="resident-main">
                    <strong>{resident.username}</strong>
                    <span>{resident.email}</span>
                  </div>
                  <div className="resident-actions">
                    <small>{roleLabel(resident.role)}</small>
                    {pendingDeleteId === resident.id ? (
                      <>
                        <button
                          type="button"
                          className="danger-button compact-button"
                          onClick={() => onConfirmDelete(resident)}
                          disabled={busy}
                        >
                          Usuń
                        </button>
                        <button
                          type="button"
                          className="ghost-button compact-button"
                          onClick={onCancelDelete}
                          disabled={busy}
                        >
                          Anuluj
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="danger-button compact-button"
                        onClick={() => onRequestDelete(resident)}
                        disabled={busy}
                      >
                        Usuń
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <span className="card-icon"><Icon name="residents" /></span>
                <strong>Nie dodano jeszcze mieszkańców</strong>
                <p>Utwórz pierwsze konto za pomocą formularza powyżej.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  )
}
