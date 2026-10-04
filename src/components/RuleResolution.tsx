import type { RuleResolution } from '../types/game'

interface RuleResolutionProps {
  resolution: RuleResolution | null
}

function formatModifier(value: number) {
  return value >= 0 ? `+${value}` : `${value}`
}

export function RuleResolution({ resolution }: RuleResolutionProps) {
  if (!resolution || resolution.status !== 'resolved') return null
  const check = resolution.check
  const roll = resolution.rolls?.[0]?.result
  const total = resolution.outcome?.total
  const success = resolution.outcome?.success
  const ability = typeof check?.ability === 'string' ? check.ability : 'teste'
  const abilityLabel = ability.charAt(0).toUpperCase() + ability.slice(1)

  return (
    <section className={`resolution-card ${success ? 'is-success' : 'is-failure'}`} aria-label="Resultado mecânico">
      <div className="resolution-topline">
        <span className="section-kicker"><span className="kicker-line" /> Resultado do teste</span>
        <span className="resolution-rule">{resolution.rules_used?.[0] ?? 'rule-resolution-v1'}</span>
      </div>
      <div className="resolution-main">
        <div className="die-result" aria-label={`Rolagem d20: ${typeof roll === 'number' ? roll : 'não informada'}`}>
          <span className="die-label">d20</span>
          <strong>{typeof roll === 'number' ? roll : '—'}</strong>
          <span className="die-spark">✦</span>
        </div>
        <div className="resolution-copy">
          <div className="resolution-title-row">
            <h2>Teste de {abilityLabel}</h2>
            <span className="resolution-badge">{success ? '✓ Sucesso' : '× Falha'}</span>
          </div>
          <p>1d20 {typeof check?.modifier === 'number' ? formatModifier(check.modifier) : ''} contra CD {typeof check?.dc === 'number' ? check.dc : '—'}</p>
        </div>
      </div>
      <div className="resolution-stats">
        <div><span>Rolagem</span><strong>{typeof roll === 'number' ? roll : '—'}</strong></div>
        <div><span>Modificador</span><strong>{typeof check?.modifier === 'number' ? formatModifier(check.modifier) : '—'}</strong></div>
        <div><span>Total</span><strong>{typeof total === 'number' ? total : '—'}</strong></div>
        <div><span>Classe de dificuldade</span><strong>{typeof check?.dc === 'number' ? check.dc : '—'}</strong></div>
      </div>
    </section>
  )
}
