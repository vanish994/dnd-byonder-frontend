import type { NarrativeEntry } from '../types/game'

interface NarrativePanelProps {
  history: NarrativeEntry[]
}

export function NarrativePanel({ history }: NarrativePanelProps) {
  return (
    <section className="narrative-panel" id="adventure" aria-labelledby="narrative-title">
      <div className="scene-banner">
        <span className="scene-status"><span className="scene-beacon" /> Cena atual</span>
        <span className="scene-location">A estrada esquecida <span aria-hidden="true">⌁</span></span>
      </div>
      <div className="narrative-heading-row">
        <div>
          <div className="section-kicker"><span className="kicker-line" /> Diário de aventura</div>
          <h1 id="narrative-title">A aventura começa<br /><em>onde você decide.</em></h1>
        </div>
        <div className="chapter-label"><span>CAP. 01</span><strong>A ESTRADA ESCURA</strong><small>Uma nova lenda se escreve</small></div>
      </div>
      <div className="narrative-history" aria-live="polite">
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
