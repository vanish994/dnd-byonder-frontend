import { useState } from 'react'
import type { StructuredAction } from '../types/game'

interface StructuredActionCardProps {
  action: StructuredAction
  isLoading: boolean
  onSubmit: (action: StructuredAction, text: string) => Promise<boolean>
}

export function StructuredActionCard({ action, isLoading, onSubmit }: StructuredActionCardProps) {
  const [distance, setDistance] = useState('')
  const label = typeof action.label === 'string' ? action.label
    : typeof action.name === 'string' ? action.name : String(action.type)
  const description = typeof action.description === 'string' ? action.description : null
  const text = typeof action.player_input === 'string' && action.player_input.trim() ? action.player_input : label
  const isMove = action.type === 'move'
  const canSubmit = !isMove || (distance !== '' && Number.isInteger(Number(distance)) && Number(distance) >= 0)

  function submit() {
    if (!canSubmit) return
    onSubmit(isMove ? { ...action, distance: Number(distance) } : action, text)
  }

  return (
    <section className="structured-action-card" aria-label="Ações estruturadas disponíveis">
      <div className="structured-action-card__copy">
        <span className="section-kicker"><span className="kicker-line" /> Ação disponível</span>
        <h3>{label}</h3>
        {description && <p>{description}</p>}
        {isMove && <label className="move-distance">Distância <input aria-label="Distância do movimento" type="number" min="0" step="1" value={distance} onChange={(event) => setDistance(event.target.value)} /></label>}
      </div>
      <button
        type="button"
        className="structured-action-card__button"
        onClick={() => void submit()}
        disabled={isLoading || !canSubmit}
      >
        {isLoading ? <span className="button-spinner" aria-label="Enviando" /> : <span aria-hidden="true">✦</span>}
        <span>{isLoading ? 'Enviando' : 'Executar ação'}</span>
      </button>
    </section>
  )
}
