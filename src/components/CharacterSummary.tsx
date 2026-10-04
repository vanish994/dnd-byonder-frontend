import type { DerivedCharacter, GameState } from '../types/game'

const SPECIES_LABELS: Record<string, string> = {
  aasimar: 'Aasimar', dragonborn: 'Draconato', dwarf: 'Anão', elf: 'Elfo', gnome: 'Gnomo',
  goliath: 'Golias', halfling: 'Halfling', human: 'Humano', orc: 'Orc', tiefling: 'Tiefling',
}
const BACKGROUND_LABELS: Record<string, string> = {
  acolyte: 'Acólito', artisan: 'Artesão', charlatan: 'Charlatão', criminal: 'Criminoso', entertainer: 'Artista',
  farmer: 'Fazendeiro', guard: 'Guarda', guide: 'Guia', hermit: 'Eremita', merchant: 'Comerciante',
  noble: 'Nobre', sage: 'Sábio', sailor: 'Marinheiro', scribe: 'Escriba', soldier: 'Soldado', wayfarer: 'Viajante',
}
const ALIGNMENT_LABELS: Record<string, string> = {
  lawful_good: 'Leal e Bom', neutral_good: 'Neutro e Bom', chaotic_good: 'Caótico e Bom',
  lawful_neutral: 'Leal e Neutro', neutral: 'Neutro', chaotic_neutral: 'Caótico e Neutro',
  lawful_evil: 'Leal e Mau', neutral_evil: 'Neutro e Mau', chaotic_evil: 'Caótico e Mau',
}

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
  const inventory = current.inventory && typeof current.inventory === 'object' && !Array.isArray(current.inventory)
    ? current.inventory as Record<string, unknown> : {}
  const equipped = current.equipped && typeof current.equipped === 'object' && !Array.isArray(current.equipped)
    ? current.equipped as Record<string, unknown> : {}
  const inventoryItems = Object.entries(inventory).map(([id, value]) => {
    const entry = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
    const item = entry.item && typeof entry.item === 'object' && !Array.isArray(entry.item) ? entry.item as Record<string, unknown> : {}
    const label = typeof item.name === 'string' ? item.name : typeof item.label === 'string' ? item.label : id
    const quantity = typeof entry.quantity === 'number' ? entry.quantity : 1
    const equippedSlot = Object.entries(equipped).find(([, itemId]) => itemId === id)?.[0]
    return { id, label, quantity, equippedSlot }
  })
  const startingEquipment = current.starting_equipment && typeof current.starting_equipment === 'object' && !Array.isArray(current.starting_equipment)
    ? current.starting_equipment as Record<string, unknown> : {}
  const startingItems = Array.isArray(startingEquipment.items) ? startingEquipment.items.flatMap((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []
    const item = value as Record<string, unknown>
    return typeof item.name === 'string' ? [{ id: `starting-${index}`, label: item.name, quantity: typeof item.quantity === 'number' ? item.quantity : 1, equippedSlot: undefined }] : []
  }) : []
  const displayedEquipment = inventoryItems.length ? inventoryItems : startingItems
  const speciesId = typeof current.species_id === 'string' ? current.species_id : ''
  const backgroundId = typeof current.background_id === 'string' ? current.background_id : ''
  const alignmentId = typeof current.alignment_id === 'string' ? current.alignment_id : ''
  const originDescription = [SPECIES_LABELS[speciesId], BACKGROUND_LABELS[backgroundId]].filter(Boolean).join(' · ')
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
          {originDescription && <small className="character-origin">{originDescription}{ALIGNMENT_LABELS[alignmentId] ? ` · ${ALIGNMENT_LABELS[alignmentId]}` : ''}</small>}
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
      {displayedEquipment.length > 0 && (
        <div className="character-equipment" aria-label="Equipamento">
          <span className="equipment-heading">Equipamento</span>
          {displayedEquipment.map((item) => (
            <div className="equipment-row" key={item.id}>
              <span>{item.label} ×{item.quantity}</span>
              {item.equippedSlot && <small>{item.equippedSlot === 'weapon' ? 'equipada' : 'vestida'}</small>}
            </div>
          ))}
        </div>
      )}
      <div className="character-footer"><span><i aria-hidden="true">◈</i> D&amp;D · Regras 2024</span></div>
    </aside>
  )
}
