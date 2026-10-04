import type { GameState } from '../types/game'

interface CharacterSummaryProps {
  state: GameState
}

export function CharacterSummary({ state }: CharacterSummaryProps) {
  const character = (state.character ?? {}) as Record<string, unknown>
  const name = typeof character.name === 'string' ? character.name : 'Aventureiro sem nome'
  const level = typeof character.level === 'number' ? character.level : 1
  const hp = typeof character.hp === 'number' ? character.hp : null
  const maxHp = typeof character.max_hp === 'number' ? character.max_hp : null
  const armorClass = typeof character.ac === 'number' ? character.ac : null
  const className = typeof character.class === 'string' ? character.class : 'Viajante'
  const hpRatio = hp !== null && maxHp ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 100

  return (
    <aside className="character-panel" aria-label="Resumo do personagem">
      <div className="panel-heading">
        <span className="panel-kicker"><span className="rune-mark">ᚱ</span> Seu personagem</span>
        <button className="panel-more" type="button" aria-label="Ver ficha completa" title="Ficha completa">•••</button>
      </div>
      <div className="character-card">
        <div className="portrait-frame" aria-hidden="true">
          <div className="portrait-rune">✦</div>
          <div className="portrait-glyph">♜</div>
          <span className="portrait-corner portrait-corner--tl" />
          <span className="portrait-corner portrait-corner--br" />
        </div>
        <div className="character-info">
          <span className="eyebrow">Nível {level} · {className}</span>
          <h2>{name}</h2>
          <div className="character-stats">
            <span><small>HP</small><strong>{hp !== null ? `${hp}${maxHp !== null ? `/${maxHp}` : ''}` : '—'}</strong></span>
            <span><small>CA</small><strong>{armorClass ?? '—'}</strong></span>
            <span><small>XP</small><strong>0</strong></span>
          </div>
        </div>
      </div>
      <div className="hp-track" aria-label={hp !== null ? `${hp} de ${maxHp ?? hp} pontos de vida` : 'Pontos de vida não informados'}>
        <span style={{ width: `${hpRatio}%` }} />
      </div>
      <div className="character-footer">
        <span><i className="stat-icon stat-icon--shield" aria-hidden="true">◈</i> Defesa preparada</span>
        <span className="resource-state"><i aria-hidden="true">✦</i> 0 recursos</span>
      </div>
    </aside>
  )
}
