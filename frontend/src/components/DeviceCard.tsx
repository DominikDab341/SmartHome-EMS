import type { CSSProperties } from 'react'
import { formatKw } from '../lib/formatters'
import type { Device } from '../types'
import { Icon } from './Icon'

type DeviceCardProps = {
  device: Device
  canManage: boolean
  busy: boolean
  deviceBusy: boolean
  editing: boolean
  pendingDelete: boolean
  onPowerChange: (device: Device, value: number) => void
  onToggle: (device: Device) => void
  onEdit: (device: Device) => void
  onRequestDelete: (device: Device) => void
  onConfirmDelete: (device: Device) => void
  onCancelDelete: () => void
}

export function DeviceCard({
  device,
  canManage,
  busy,
  deviceBusy,
  editing,
  pendingDelete,
  onPowerChange,
  onToggle,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: DeviceCardProps) {
  const powerStep = device.max_power_kw <= 1 ? 0.01 : 0.1
  const formatDevicePower = (value: number) =>
    `${value.toFixed(device.max_power_kw <= 1 ? 2 : 1)} kW`
  const utilization = device.max_power_kw
    ? Math.min((device.current_power_kw / device.max_power_kw) * 100, 100)
    : 0
  const displayedUtilization =
    device.type === 'solar' ? (device.is_active ? 100 : 0) : utilization
  const rangeStyle = {
    '--device-utilization': `${utilization}%`,
  } as CSSProperties

  return (
    <article
      className={[
        'device-card',
        editing ? 'editing' : '',
        canManage ? '' : 'read-only',
      ].filter(Boolean).join(' ')}
    >
      <div className={`device-icon ${device.type}`}>
        <Icon name={device.type === 'solar' ? 'solar' : 'bolt'} size={22} />
      </div>
      <div className="device-card-copy">
        <div className="device-card-title">
          <strong>{device.name}</strong>
          <span className={`device-state ${device.is_active ? 'active' : ''}`}>
            {device.is_active ? 'Aktywne' : 'Wyłączone'}
          </span>
        </div>
        <span className="device-card-meta">
          {device.type === 'solar'
            ? `Źródło wytwórcze (PV) · ${formatKw(device.max_power_kw)}`
            : `Urządzenie · ${formatDevicePower(device.current_power_kw)} z ${formatDevicePower(device.max_power_kw)}`}
        </span>
        {device.type === 'appliance' ? (
          <>
            <div className="device-progress-label">
              <span>Aktualne zużycie</span>
              <strong>{utilization.toFixed(0)}%</strong>
            </div>
            <input
              aria-label={`Aktualne zużycie: ${device.name}`}
              className="device-range"
              type="range"
              min="0"
              max={device.max_power_kw}
              step={powerStep}
              value={device.current_power_kw}
              style={rangeStyle}
              disabled={!canManage || busy || deviceBusy}
              onChange={(event) => onPowerChange(device, Number(event.currentTarget.value))}
            />
          </>
        ) : (
          <div
            className="device-progress solar"
            aria-label={`Aktywność źródła ${displayedUtilization.toFixed(0)}%`}
          >
            <span style={{ width: `${displayedUtilization}%` }} />
          </div>
        )}
      </div>
      <button
        type="button"
        className={device.is_active ? 'switch active' : 'switch'}
        onClick={() => onToggle(device)}
        disabled={!canManage || busy || deviceBusy}
        aria-label={`${device.is_active ? 'Wyłącz' : 'Włącz'} ${device.name}`}
      >
        <span />
      </button>
      {canManage && (
        <div className="device-actions">
          {pendingDelete ? (
            <>
              <button
                type="button"
                className="danger-button compact-button"
                onClick={() => onConfirmDelete(device)}
                disabled={deviceBusy}
              >
                Usuń
              </button>
              <button
                type="button"
                className="ghost-button compact-button"
                onClick={onCancelDelete}
                disabled={deviceBusy}
              >
                Anuluj
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="icon-button"
                onClick={() => onEdit(device)}
                disabled={deviceBusy}
                aria-label={`Edytuj ${device.name}`}
                title="Edytuj urządzenie"
              >
                <Icon name="edit" size={17} />
              </button>
              <button
                type="button"
                className="icon-button danger-icon"
                onClick={() => onRequestDelete(device)}
                disabled={deviceBusy}
                aria-label={`Usuń ${device.name}`}
                title="Usuń urządzenie"
              >
                <Icon name="trash" size={17} />
              </button>
            </>
          )}
        </div>
      )}
    </article>
  )
}
