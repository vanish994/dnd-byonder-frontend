import type { RuleTeaching } from '../types/game'

interface RuleTeachingPanelProps {
  teaching: RuleTeaching | null
}

export function RuleTeachingPanel({ teaching }: RuleTeachingPanelProps) {
  if (!teaching?.tips.length) return null

  return (
    <section className="rule-teaching-panel" aria-labelledby="rule-teaching-title">
      <div className="rule-teaching-panel__heading">
        <div>
          <span className="section-kicker"><span className="kicker-line" /> Como jogar</span>
          <h2 id="rule-teaching-title">Orientação para este turno</h2>
        </div>
        <span className="rule-teaching-panel__mark" aria-hidden="true">✦</span>
      </div>
      <p className="rule-teaching-panel__intro">
        Estas dicas explicam o que está acontecendo. As ações disponíveis abaixo continuam sendo definidas pelo Mestre.
      </p>
      <ul className="rule-teaching-panel__tips">
        {teaching.tips.map((tip, index) => (
          <li key={tip.id ?? `${tip.title ?? 'tip'}-${index}`}>
            <span className="rule-teaching-panel__bullet" aria-hidden="true">{index + 1}</span>
            <div>
              {tip.title && <strong>{tip.title}</strong>}
              <p>{tip.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
