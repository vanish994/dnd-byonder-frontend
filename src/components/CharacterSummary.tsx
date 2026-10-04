import type { GameState } from '../types/game'

interface CharacterSummaryProps {
  state: GameState
}

export function CharacterSummary({ state }: CharacterSummaryProps) {
  const character = (state.character ?? {}) as Record<string, unknown>
  const name = typeof character.name === 'string' ? character.name : 'Aventureiro'
  const level = typeof character.level === 'number' ? character.level : 1
  const hp = typeof character.hp === 'number' ? character.hp : null
  const maxHp = typeof character.max_hp === 'number' ? character.max_hp : null
  const armorClass = typeof character.ac === 'number' ? character.ac : null

  return (
    <aside className="character-card" aria-label="Resumo do personagem">
      <div className="portrait-placeholder" aria-hidden="true"><span>✦</span></div>
      <div className="character-info">
        <span className="eyebrow">Seu aventureiro</span>
        <h2>{name}</h2>
        <div className="character-stats">
          <span><small>Nível</small><strong>{level}</strong></span>
          <span><small>HP</small><strong>{hp !== null ? `${hp}${maxHp !== null ? `/${maxHp}` : ''}` : '—'}</strong></span>
          <span><small>CA</small><strong>{armorClass ?? '—'}</strong></span>
        </div>
      </div>
    </aside>
  )
}