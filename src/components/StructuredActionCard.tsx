import type { AbilityCheckAction } from '../types/game'

interface StructuredActionCardProps {
  action: AbilityCheckAction
  isLoading: boolean
  onSubmit: (action: AbilityCheckAction) => Promise<boolean>
}

const abilityLabels: Record<string, string> = {
  strength: 'Força',
  dexterity: 'Destreza',
  constitution: 'Constituição',
  intelligence: 'Inteligência',
  wisdom: 'Sabedoria',
  charisma: 'Carisma',
}

export function StructuredActionCard({ action, isLoading, onSubmit }: StructuredActionCardProps) {
  const abilityLabel = abilityLabels[action.ability] ?? action.ability
  const modifier = action.modifier >= 0 ? `+${action.modifier}` : `${action.modifier}`

  return (
    <section className="structured-action-card" aria-label="Ações estruturadas disponíveis">
      <div className="structured-action-card__copy">
        <span className="section-kicker"><span className="kicker-line" /> Ação disponível</span>
        <h3>Arrombar a porta</h3>
        <p>Teste de {abilityLabel} <span aria-hidden="true">•</span> CD {action.dc} <span aria-hidden="true">•</span> {modifier}</p>
      </div>
      <button
        type="button"
        className="structured-action-card__button"
        onClick={() => void onSubmit(action)}
        disabled={isLoading}
      >
        {isLoading ? <span className="button-spinner" aria-label="Rolando" /> : <span aria-hidden="true">✦</span>}
        <span>{isLoading ? 'Rolando' : 'Fazer teste'}</span>
      </button>
    </section>
  )
}
