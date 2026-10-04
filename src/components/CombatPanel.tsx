import type { GameState } from '../types/game'

interface CombatPanelProps {
  state: GameState
}

interface Combatant {
  id?: unknown
  hp?: unknown
  max_hp?: unknown
  ac?: unknown
  initiative?: unknown
  side?: unknown
  unconscious?: unknown
}

export function CombatPanel({ state }: CombatPanelProps) {
  const combat = state.combat
  if (!combat || typeof combat !== 'object' || Array.isArray(combat)) return null
  const value = combat as Record<string, unknown>
  if (value.active !== true || !value.combatants || typeof value.combatants !== 'object' || Array.isArray(value.combatants)) return null
  const combatants = Object.values(value.combatants as Record<string, Combatant>)
  const currentActor = typeof value.current_actor_id === 'string' ? value.current_actor_id : '—'

  return (
    <section className="combat-panel" aria-label="Combate atual">
      <div className="section-kicker"><span className="kicker-line" /> Combate · Rodada {String(value.round ?? '—')}</div>
      <p>Turno atual: <strong>{currentActor}</strong></p>
      <div className="combat-panel__cards">
        {combatants.map((combatant, index) => (
          <article className="combatant-card" key={String(combatant.id ?? index)}>
            <strong>{String(combatant.id ?? 'combatente')}</strong>
            <span>HP {String(combatant.hp ?? '—')}/{String(combatant.max_hp ?? '—')}</span>
            <span>CA {String(combatant.ac ?? '—')}</span>
            {combatant.initiative !== undefined && <span>Iniciativa {String(combatant.initiative)}</span>}
            {combatant.unconscious === true && <span>Inconsciente</span>}
          </article>
        ))}
      </div>
    </section>
  )
}
