interface GameHeaderProps {
  campaignId: string
  isLoading: boolean
}

export function GameHeader({ campaignId, isLoading }: GameHeaderProps) {
  return (
    <header className="game-header">
      <a className="brand-lockup" href="#adventure" aria-label="D&D Byonder — início da aventura">
        <span className="brand-crest" aria-hidden="true">
          <span className="crest-eye" />
          <span className="crest-wing crest-wing--left" />
          <span className="crest-wing crest-wing--right" />
        </span>
        <span className="brand-copy">
          <span className="brand-overline">Crônicas de</span>
          <span className="brand-name">D&amp;D <em>BYONDER</em></span>
        </span>
      </a>
      <div className="header-actions">
        <div className="session-status" aria-live="polite">
          <span className={`status-dot ${isLoading ? 'is-thinking' : ''}`} aria-hidden="true" />
          <span>{isLoading ? 'O mundo respira' : 'Sessão ativa'}</span>
          <span className="session-id">{campaignId}</span>
        </div>
        <button className="icon-button" type="button" aria-label="Abrir menu da sessão" title="Menu da sessão">☰</button>
      </div>
    </header>
  )
}
