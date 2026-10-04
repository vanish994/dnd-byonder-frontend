import type { NarrativeEntry } from '../types/game'

interface NarrativePanelProps {
  history: NarrativeEntry[]
}

export function NarrativePanel({ history }: NarrativePanelProps) {
  return (
    <section className="narrative-panel" aria-labelledby="narrative-title">
      <div className="section-kicker"><span className="kicker-line" /> Crônica da sessão</div>
      <div className="narrative-heading-row">
        <h1 id="narrative-title">A aventura começa<br /><em>onde você decide.</em></h1>
        <span className="chapter-label">CAP. 01<br /><strong>A ESTRADA ESCURA</strong></span>
      </div>
      <div className="narrative-history" aria-live="polite">
        {history.map((entry) => (
          <article className={`narrative-entry narrative-entry--${entry.speaker}`} key={entry.id}>
            <div className="entry-meta">
              <span className="entry-avatar">{entry.speaker === 'mestre' ? 'M' : 'V'}</span>
              <span>{entry.speaker === 'mestre' ? 'Mestre' : 'Você'}</span>
            </div>
            <p>{entry.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
