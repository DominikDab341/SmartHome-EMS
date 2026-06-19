import { useRef, useState } from 'react'

type ExportThresholdControlProps = {
  value: number
  disabled: boolean
  onChange: (value: number) => void
}

export function ExportThresholdControl({
  value,
  disabled,
  onChange,
}: ExportThresholdControlProps) {
  const [draftValue, setDraftValue] = useState(value)
  const submittedValue = useRef(value)

  function submitValue(nextValue: number): void {
    if (nextValue === submittedValue.current) return
    submittedValue.current = nextValue
    onChange(nextValue)
  }

  return (
    <div className="export-threshold">
      <div className="export-threshold-heading">
        <div>
          <strong>Próg oddawania energii do sieci</strong>
          <p>Panele najpierw ładują baterię do tego poziomu.</p>
        </div>
        <output htmlFor="battery-export-threshold">{draftValue}%</output>
      </div>
      <input
        id="battery-export-threshold"
        type="range"
        min="20"
        max="100"
        step="5"
        value={draftValue}
        disabled={disabled}
        aria-label="Próg oddawania energii do sieci"
        onInput={(event) => setDraftValue(Number(event.currentTarget.value))}
        onPointerUp={(event) => submitValue(Number(event.currentTarget.value))}
        onKeyUp={(event) => submitValue(Number(event.currentTarget.value))}
        onBlur={(event) => submitValue(Number(event.currentTarget.value))}
      />
      <div className="export-threshold-scale">
        <span>20%</span>
        <span>Najpierw bateria</span>
        <span>100%</span>
      </div>
    </div>
  )
}
