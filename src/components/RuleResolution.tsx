import { useState } from 'react'
import type { RuleResolution } from '../types/game'
import { PhaserDiceStage } from './PhaserDiceStage'

interface RuleResolutionProps {
  resolution: RuleResolution | null
}

function formatModifier(value: number) {
  return value >= 0 ? `+${value}` : `${value}`
}

export function RuleResolution({ resolution }: RuleResolutionProps) {
  const isRenderable = Boolean(resolution && resolution.status === 'resolved' && resolution.action?.type !== 'create_character')
  const animationKey = resolution ? [resolution.action?.type ?? 'unknown', resolution.rolls?.[0]?.result ?? 'unknown', resolution.outcome?.round ?? '', resolution.outcome?.turn_index ?? ''].join(':') : null
  const [dismissedKey, setDismissedKey] = useState<string | null>(null)
  const isOpen = isRenderable && dismissedKey !== animationKey

  if (!isRenderable || !resolution) return null
  const isInitiative = resolution.action?.type === 'start_combat'
  const check = resolution.check
  const currentActor = typeof resolution.outcome?.current_actor_id === 'string' ? resolution.outcome.current_actor_id : null
  const initiativeRoll = isInitiative
    ? resolution.rolls?.find((entry) => entry.purpose === 'initiative' && entry.actor_id === currentActor)
    : undefined
  const primaryRoll = initiativeRoll ?? resolution.rolls?.[0]
  const roll = primaryRoll?.result
  const displayedRolls = (resolution.rolls ?? []).flatMap((entry) => {
    const type = typeof entry.type === 'string' ? entry.type : 'd20'
    if (typeof entry.result === 'number') return [{ type, result: entry.result }]
    if (Array.isArray(entry.results)) return entry.results.filter((value): value is number => typeof value === 'number').map((result) => ({ type, result }))
    return []
  }).slice(0, 12)
  const total = resolution.outcome?.total
  const success = resolution.outcome?.success
  const ability = typeof check?.ability === 'string' ? check.ability : 'teste'
  const abilityLabel = ability.charAt(0).toUpperCase() + ability.slice(1)

  const turnOrder = Array.isArray(resolution.outcome?.turn_order)
    ? resolution.outcome.turn_order.filter((entry): entry is string => typeof entry === 'string')
    : []
  const rollAnimationKey = [resolution.action?.type ?? 'unknown', roll ?? 'unknown', resolution.outcome?.round ?? '', resolution.outcome?.turn_index ?? '', currentActor ?? ''].join(':')

  return (
    <>
      {!isOpen && <button className="resolution-trigger" type="button" onClick={() => setDismissedKey(null)}>
        Ver resultado do teste
      </button>}
      {isOpen && <section className={`resolution-card resolution-inline ${success === undefined ? '' : success ? 'is-success' : 'is-failure'}`} role="dialog" aria-label="Resultado mecânico">
          <div className="resolution-topline">
            <span className="section-kicker"><span className="kicker-line" /> {isInitiative ? 'Iniciativa' : 'Resultado do teste'}</span>
            <button className="resolution-close" type="button" onClick={() => setDismissedKey(animationKey)} aria-label="Fechar resultado">×</button>
          </div>
          <span className="resolution-rule">{resolution.rules_used?.[0] ?? 'rule-resolution-v1'}</span>
          <ol className="roll-sequence" aria-label="Etapas da animação do dado">
            <li className="is-active"><b>1</b><span>Início</span></li>
            <li><b>2</b><span>Rolagem</span></li>
            <li><b>3</b><span>Desaceleração</span></li>
            <li><b>4</b><span>Resultado</span></li>
            <li><b>5</b><span>Destaque</span></li>
          </ol>
          <div className="resolution-main">
        <div className="dice-tray" aria-label="Dados rolados">
          {(displayedRolls.length ? displayedRolls : [{ type: 'd20', result: '—' as const }]).map((entry, index) => {
            const dieType = entry.type.replace(/^\d+/, '') || 'd20'
            return <PhaserDiceStage key={`${rollAnimationKey}-${dieType}-${index}`} die={entry.type} result={typeof entry.result === 'number' ? entry.result : null} rollId={index} />
          })}
        </div>
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
        </section>}
    </>
  )
}
