import type { DerivedCharacter, GameState } from '../types/game'

interface CharacterSummaryProps {
  state: GameState
  character: Record<string, unknown> | null
  classLabel: string | null
  derived: DerivedCharacter | null
}

export function CharacterSummary({ state, character, classLabel, derived }: CharacterSummaryProps) {
  const current = state.character && typeof state.character === 'object' && !Array.isArray(state.character)
    ? state.character as Record<string, unknown> : character ?? {}
  const name = typeof current.name === 'string' ? current.name : typeof character?.name === 'string' ? character.name : 'Nome não informado'
  const level = typeof current.level === 'number' ? current.level : null
  const hp = typeof current.current_hp === 'number' ? current.current_hp : derived?.hp.current ?? null
  const maxHp = derived?.hp.max ?? null
  const armorClass = derived?.ac.value ?? null
  const characterClass = current.class
  const className = classLabel ?? (typeof characterClass === 'string' ? characterClass
    : characterClass && typeof characterClass === 'object' && 'id' in characterClass && typeof characterClass.id === 'string' ? characterClass.id : null
  )
  const xp = typeof current.xp === 'number' ? current.xp : null
  const hpRatio = hp !== null && maxHp !== null && maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0

  return (
    <aside className="character-panel" aria-label="Resumo do personagem">
      <div className="panel-heading">
        <span className="panel-kicker"><span className="rune-mark">ᚱ</span> Seu personagem</span>
        <span className="rune-mark" aria-hidden="true">✦</span>
      </div>
      <div className="character-card">
        <div className="portrait-frame" aria-hidden="true">
          <div className="portrait-rune">✦</div>
          <div className="portrait-glyph">♜</div>
          <span className="portrait-corner portrait-corner--tl" />
          <span className="portrait-corner portrait-corner--br" />
        </div>
        <div className="character-info">
          <span className="eyebrow">{level !== null ? `Nível ${level}` : 'Nível não informado'}{className ? ` · ${className}` : ''}</span>
          <h2>{name}</h2>
          <div className="character-stats">
            <span><small>HP</small><strong>{hp !== null ? `${hp}${maxHp !== null ? `/${maxHp}` : ''}` : '—'}</strong></span>
            <span><small>CA</small><strong>{armorClass ?? '—'}</strong></span>
            <span><small>XP</small><strong>{xp ?? '—'}</strong></span>
          </div>
        </div>
      </div>
      <div className="hp-track" aria-label={hp !== null && maxHp !== null ? `${hp} de ${maxHp} pontos de vida` : 'Pontos de vida não informados'}>
        <span style={{ width: `${hpRatio}%` }} />
      </div>
      <div className="character-footer"><span><i aria-hidden="true">◈</i> Ficha fornecida pelo Mestre</span></div>
    </aside>
  )
}
