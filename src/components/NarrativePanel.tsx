import type { GameState, NarrativeEntry } from '../types/game'

interface NarrativePanelProps {
  history: NarrativeEntry[]
  state: GameState
  narrationStatus?: 'available' | 'unavailable'
}

export function NarrativePanel({ history, state, narrationStatus = 'available' }: NarrativePanelProps) {
  const scene = state.scene && typeof state.scene === 'object' && !Array.isArray(state.scene)
    ? state.scene as Record<string, unknown>
    : null
  return (
    <section className="narrative-panel" id="adventure" aria-labelledby="narrative-title">
      <div className="scene-banner">
        <span className="scene-status"><span className="scene-beacon" /> Cena atual</span>
        {typeof scene?.title === 'string' && <span className="scene-location">{scene.title} <span aria-hidden="true">⌁</span></span>}
      </div>
      {typeof scene?.description === 'string' && <p className="scene-description">{scene.description}</p>}
      <div className="narrative-heading-row">
        <div>
          <div className="section-kicker"><span className="kicker-line" /> Diário de aventura</div>
          <h1 id="narrative-title">A aventura começa<br /><em>onde você decide.</em></h1>
        </div>
        <div className="chapter-label"><span>CRÔNICA ATUAL</span><strong>Uma nova lenda se escreve</strong></div>
      </div>
      <div className="narrative-history" aria-live="polite">
        {narrationStatus === 'unavailable' && <p className="narrative-empty">A mecânica foi resolvida; a narração está temporariamente indisponível.</p>}
        {history.length === 0 && <p className="narrative-empty">Aguardando o primeiro turno do Mestre.</p>}
        {history.map((entry, index) => (
          <article className={`narrative-entry narrative-entry--${entry.speaker}`} key={entry.id}>
            <div className="entry-meta">
              <span className="entry-avatar" aria-hidden="true">{entry.speaker === 'mestre' ? '✦' : '◒'}</span>
              <span>{entry.speaker === 'mestre' ? 'O Mestre' : 'Sua ação'}</span>
              {index === history.length - 1 && entry.speaker === 'mestre' && <span className="new-mark">Novo</span>}
            </div>
            <p>{entry.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
