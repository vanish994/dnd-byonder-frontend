interface GameHeaderProps {
  campaignId: string
  isLoading: boolean
}

export function GameHeader({ campaignId, isLoading }: GameHeaderProps) {
  return (
    <header className="game-header">
      <div className="brand-lockup" aria-label="D&D Byonder — wordmark temporário">
        <span className="brand-mark">✦</span>
        <span className="brand-name">D&amp;D <em>BYONDER</em></span>
      </div>
      <div className="session-status">
        <span className={`status-dot ${isLoading ? 'is-thinking' : ''}`} aria-hidden="true" />
        <span>{isLoading ? 'Mestre pensando' : 'Sessão ativa'}</span>
        <span className="session-id">{campaignId}</span>
      </div>
    </header>
  )
}
