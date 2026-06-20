import type { FormEvent } from 'react'
import type { AuthForm, AuthMode } from '../types'
import { Icon } from './Icon'

type AuthScreenProps = {
  mode: AuthMode
  form: AuthForm
  error: string | null
  busy: boolean
  onModeChange: (mode: AuthMode) => void
  onFieldChange: (field: keyof AuthForm, value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function AuthScreen({
  mode,
  form,
  error,
  busy,
  onModeChange,
  onFieldChange,
  onSubmit,
}: AuthScreenProps) {
  return (
    <main className="app-shell auth-shell">
      <section className="auth-panel" aria-label="Logowanie do Smart Home EMS">
        <div className="auth-copy">
          <div className="auth-brand">
            <span className="brand-mark"><Icon name="bolt" size={22} /></span>
            <strong>Wattwise</strong>
          </div>
          <p className="eyebrow">Energia pod kontrolą</p>
          <h1>Inteligentny dom zaczyna się od dobrych decyzji.</h1>
          <p>
            Monitoruj produkcję, zużycie i magazynowanie energii w jednym,
            przejrzystym miejscu.
          </p>
          <div className="auth-feature-list">
            <span><Icon name="check" size={16} /> Podgląd przepływów energii na żywo</span>
            <span><Icon name="check" size={16} /> Automatyczne strategie oszczędzania</span>
            <span><Icon name="check" size={16} /> Historia i analiza każdego cyklu</span>
          </div>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          <div className="auth-form-heading">
            <p className="eyebrow">Witaj ponownie</p>
            <h2>{mode === 'login' ? 'Zaloguj się do panelu' : 'Utwórz nowe konto'}</h2>
          </div>
          <div className="auth-tabs" role="tablist" aria-label="Tryb autoryzacji">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => onModeChange('login')}
            >
              Logowanie
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'active' : ''}
              onClick={() => onModeChange('register')}
            >
              Rejestracja
            </button>
          </div>

          <label>
            Nazwa użytkownika
            <input
              type="text"
              value={form.username}
              autoComplete="username"
              minLength={3}
              maxLength={64}
              required
              onChange={(event) => onFieldChange('username', event.currentTarget.value)}
            />
          </label>

          {mode === 'register' && (
            <label>
              Email
              <input
                type="email"
                value={form.email}
                autoComplete="email"
                required
                onChange={(event) => onFieldChange('email', event.currentTarget.value)}
              />
            </label>
          )}

          <label>
            Hasło
            <input
              type="password"
              value={form.password}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              minLength={mode === 'register' ? 8 : undefined}
              required
              onChange={(event) => onFieldChange('password', event.currentTarget.value)}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy
              ? 'Przetwarzanie'
              : mode === 'register'
                ? 'Utwórz konto'
                : 'Zaloguj się'}
          </button>
        </form>
      </section>
    </main>
  )
}

export function SessionLoadingScreen() {
  return (
    <main className="app-shell auth-shell">
      <section className="auth-panel session-panel">
        <p className="eyebrow">Smart Home EMS</p>
        <h1>Sprawdzam sesję</h1>
      </section>
    </main>
  )
}
