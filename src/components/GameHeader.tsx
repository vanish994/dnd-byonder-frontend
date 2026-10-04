interface GameHeaderProps {
  campaignId: string
  isLoading: boolean
  hasSession: boolean
}

export function GameHeader({ campaignId, isLoading, hasSession }: GameHeaderProps) {
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
          <span>{isLoading ? 'O mundo respira' : hasSession ? 'Sessão ativa' : 'Preparando personagem'}</span>
          {hasSession && <span className="session-id">{campaignId}</span>}
        </div>
        {hasSession && <span className="icon-button" aria-hidden="true">✦</span>}
      </div>
    </header>
  )
}
