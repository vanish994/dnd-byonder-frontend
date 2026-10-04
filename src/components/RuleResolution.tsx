import type { RuleResolution } from '../types/game'
import { DiceRollAnimation } from './DiceRollAnimation'

interface RuleResolutionProps {
  resolution: RuleResolution | null
}

function formatModifier(value: number) {
  return value >= 0 ? `+${value}` : `${value}`
}

export function RuleResolution({ resolution }: RuleResolutionProps) {
  if (!resolution || resolution.status !== 'resolved' || resolution.action?.type === 'create_character') return null
  const isInitiative = resolution.action?.type === 'start_combat'
  const check = resolution.check
  const currentActor = typeof resolution.outcome?.current_actor_id === 'string' ? resolution.outcome.current_actor_id : null
  const initiativeRoll = isInitiative
    ? resolution.rolls?.find((entry) => entry.purpose === 'initiative' && entry.actor_id === currentActor)
    : undefined
  const roll = (initiativeRoll ?? resolution.rolls?.[0])?.result
  const total = resolution.outcome?.total
  const success = resolution.outcome?.success
  const ability = typeof check?.ability === 'string' ? check.ability : 'teste'
  const abilityLabel = ability.charAt(0).toUpperCase() + ability.slice(1)

  const turnOrder = Array.isArray(resolution.outcome?.turn_order)
    ? resolution.outcome.turn_order.filter((entry): entry is string => typeof entry === 'string')
    : []
  const animationKey = [resolution.action?.type ?? 'unknown', roll ?? 'unknown', resolution.outcome?.round ?? '', resolution.outcome?.turn_index ?? '', currentActor ?? ''].join(':')

  return (
    <section className={`resolution-card ${success === undefined ? '' : success ? 'is-success' : 'is-failure'}`} aria-label="Resultado mecânico">
      <div className="resolution-topline">
        <span className="section-kicker"><span className="kicker-line" /> {isInitiative ? 'Iniciativa' : 'Resultado do teste'}</span>
        <span className="resolution-rule">{resolution.rules_used?.[0] ?? 'rule-resolution-v1'}</span>
      </div>
      <div className="resolution-main">
        <DiceRollAnimation key={animationKey} ariaLabel={`Rolagem d20: ${typeof roll === 'number' ? roll : 'não informada'}`}>
          <span className="die-label">d20</span>
          <strong>{typeof roll === 'number' ? roll : '—'}</strong>
          <span className="die-spark">✦</span>
        </DiceRollAnimation>
        <div className="resolution-copy">
          <div className="resolution-title-row">
            <h2>{isInitiative ? 'Combate iniciado' : `Teste de ${abilityLabel}`}</h2>
            {isInitiative
              ? <span className="resolution-badge">{currentActor ? `Turno: ${currentActor}` : 'Ordem definida'}</span>
              : <span className="resolution-badge">{success ? '✓ Sucesso' : '× Falha'}</span>}
          </div>
          <p>{isInitiative
            ? `Rodada ${typeof resolution.outcome?.round === 'number' ? resolution.outcome.round : '—'} · ${turnOrder.length} combatentes na ordem`
            : `1d20 ${typeof check?.modifier === 'number' ? formatModifier(check.modifier) : ''} contra CD ${typeof check?.dc === 'number' ? check.dc : '—'}`}</p>
        </div>
      </div>
      <div className="resolution-stats">
        <div><span>{isInitiative ? 'Rolagem do turno atual' : 'Rolagem'}</span><strong>{typeof roll === 'number' ? roll : '—'}</strong></div>
        <div><span>{isInitiative ? 'Ator atual' : 'Modificador'}</span><strong>{isInitiative ? currentActor ?? '—' : typeof check?.modifier === 'number' ? formatModifier(check.modifier) : '—'}</strong></div>
        <div><span>{isInitiative ? 'Índice do turno' : 'Total'}</span><strong>{isInitiative ? typeof resolution.outcome?.turn_index === 'number' ? resolution.outcome.turn_index : '—' : typeof total === 'number' ? total : '—'}</strong></div>
        <div><span>{isInitiative ? 'Ordem' : 'Classe de dificuldade'}</span><strong>{isInitiative ? turnOrder.join(' → ') || '—' : typeof check?.dc === 'number' ? check.dc : '—'}</strong></div>
      </div>
    </section>
  )
}
