import type { FormEvent } from 'react'
import { DeviceCard } from '../components/DeviceCard'
import type {
  Device,
  DeviceForm,
  DeviceGroups,
  DeviceStats,
} from '../types'

type DevicesViewProps = {
  canManage: boolean
  busy: boolean
  deviceBusy: boolean
  devicePanelReady: boolean
  deviceForm: DeviceForm
  deviceError: string | null
  editingDeviceId: number | null
  pendingDeleteDeviceId: number | null
  deviceStats: DeviceStats
  deviceGroups: DeviceGroups
  onFieldChange: <K extends keyof DeviceForm>(field: K, value: DeviceForm[K]) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onResetForm: () => void
  onPowerChange: (device: Device, value: number) => void
  onToggle: (device: Device) => void
  onEdit: (device: Device) => void
  onRequestDelete: (device: Device) => void
  onConfirmDelete: (device: Device) => void
  onCancelDelete: () => void
}

export function DevicesView({
  canManage,
  busy,
  deviceBusy,
  devicePanelReady,
  deviceForm,
  deviceError,
  editingDeviceId,
  pendingDeleteDeviceId,
  deviceStats,
  deviceGroups,
  onFieldChange,
  onSubmit,
  onResetForm,
  onPowerChange,
  onToggle,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: DevicesViewProps) {
  const renderDevice = (device: Device) => (
    <DeviceCard
      key={device.id}
      device={device}
      canManage={canManage}
      busy={busy}
      deviceBusy={deviceBusy}
      editing={editingDeviceId === device.id}
      pendingDelete={pendingDeleteDeviceId === device.id}
      onPowerChange={onPowerChange}
      onToggle={onToggle}
      onEdit={onEdit}
      onRequestDelete={onRequestDelete}
      onConfirmDelete={onConfirmDelete}
      onCancelDelete={onCancelDelete}
    />
  )

  return (
    <section className="workspace view-devices">
      <div className="left-column">
        <section className="section-band devices-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Infrastruktura domu</p>
              <h2>{deviceStats.active} z {deviceStats.total} urządzeń aktywnych</h2>
              <p className="section-description">
                Zmieniaj moc odbiorników, wyłączaj sprzęty i zarządzaj instalacją PV.
              </p>
            </div>
            <div className="device-summary">
              <span>{deviceStats.total} łącznie</span>
              <span>{deviceStats.appliances} odbiorników</span>
              <span>{deviceStats.solar} instalacji PV</span>
            </div>
          </div>

          {canManage ? (
            <form className="device-form" onSubmit={onSubmit}>
              <div className="device-form-heading">
                <div>
                  <p className="eyebrow">{editingDeviceId ? 'Edycja urządzenia' : 'Nowe urządzenie'}</p>
                  <h3>{editingDeviceId ? 'Zaktualizuj dane' : 'Dodaj sprzęt do systemu'}</h3>
                </div>
                {editingDeviceId && (
                  <button
                    type="button"
                    className="ghost-button compact-button"
                    onClick={onResetForm}
                    disabled={deviceBusy}
                  >
                    Anuluj
                  </button>
                )}
              </div>

              <div className="device-form-grid">
                <label className="wide-field">
                  Nazwa urządzenia
                  <input
                    type="text"
                    value={deviceForm.name}
                    minLength={2}
                    maxLength={96}
                    placeholder="np. Pompa ciepła"
                    disabled={deviceBusy || !devicePanelReady}
                    required
                    onChange={(event) => onFieldChange('name', event.currentTarget.value)}
                  />
                </label>

                <div className="form-field">
                  <span>Typ</span>
                  <div className="type-toggle" role="group" aria-label="Typ urządzenia">
                    <button
                      type="button"
                      className={deviceForm.type === 'appliance' ? 'active' : ''}
                      onClick={() => onFieldChange('type', 'appliance')}
                      disabled={deviceBusy || !devicePanelReady}
                    >
                      Odbiornik
                    </button>
                    <button
                      type="button"
                      className={deviceForm.type === 'solar' ? 'active' : ''}
                      onClick={() => onFieldChange('type', 'solar')}
                      disabled={deviceBusy || !devicePanelReady}
                    >
                      Fotowoltaika
                    </button>
                  </div>
                </div>

                <label>
                  Moc maksymalna (kW)
                  <input
                    type="number"
                    min="0.1"
                    max="25"
                    step="0.1"
                    value={deviceForm.maxPowerKw}
                    disabled={deviceBusy || !devicePanelReady}
                    required
                    onChange={(event) => onFieldChange('maxPowerKw', event.currentTarget.value)}
                  />
                </label>

                <label>
                  Aktualna moc (kW)
                  <input
                    type="number"
                    min="0"
                    max={deviceForm.maxPowerKw || 25}
                    step="0.1"
                    value={deviceForm.currentPowerKw}
                    disabled={deviceForm.type === 'solar' || deviceBusy || !devicePanelReady}
                    required={deviceForm.type === 'appliance'}
                    onChange={(event) => onFieldChange('currentPowerKw', event.currentTarget.value)}
                  />
                </label>

                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={deviceForm.isActive}
                    disabled={deviceBusy || !devicePanelReady}
                    onChange={(event) => onFieldChange('isActive', event.currentTarget.checked)}
                  />
                  <span>Urządzenie aktywne</span>
                </label>
              </div>

              {deviceError && <p className="device-error">{deviceError}</p>}

              <div className="device-form-actions">
                <button type="submit" disabled={deviceBusy || !devicePanelReady}>
                  {deviceBusy
                    ? 'Zapisuję…'
                    : !devicePanelReady
                      ? 'Ładowanie…'
                      : editingDeviceId
                        ? 'Zapisz zmiany'
                        : 'Dodaj urządzenie'}
                </button>
                {!editingDeviceId && (
                  <button
                    type="button"
                    className="ghost-button compact-button"
                    onClick={onResetForm}
                    disabled={deviceBusy || !devicePanelReady}
                  >
                    Wyczyść
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="readonly-panel inline-readonly">
              <p className="eyebrow">Read only</p>
              <h3>Tryb podglądu</h3>
              <p>Możesz obserwować urządzenia, ale tylko właściciel może zmieniać ich konfigurację.</p>
            </div>
          )}

          <div className="device-groups">
            <section className="device-group" aria-label="Load devices">
              <div className="device-group-heading">
                <div>
                  <p className="eyebrow">Odbiorniki</p>
                  <h3>Urządzenia domowe</h3>
                </div>
                <span>{deviceGroups.appliances.length}</span>
              </div>
              <div className="device-list">
                {deviceGroups.appliances.length ? (
                  deviceGroups.appliances.map(renderDevice)
                ) : (
                  <p className="muted device-empty">Brak urządzeń pobierających energię.</p>
                )}
              </div>
            </section>

            <section className="device-group" aria-label="PV devices">
              <div className="device-group-heading">
                <div>
                  <p className="eyebrow">Produkcja</p>
                  <h3>Instalacje fotowoltaiczne</h3>
                </div>
                <span>{deviceGroups.solar.length}</span>
              </div>
              <div className="device-list">
                {deviceGroups.solar.length ? (
                  deviceGroups.solar.map(renderDevice)
                ) : (
                  <p className="muted device-empty">Brak instalacji fotowoltaicznych.</p>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </section>
  )
}
