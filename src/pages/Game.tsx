import { ActionInput } from '../components/ActionInput'
import { CharacterSummary } from '../components/CharacterSummary'
import { GameHeader } from '../components/GameHeader'
import { LoadingState } from '../components/LoadingState'
import { NarrativePanel } from '../components/NarrativePanel'
import { RuleResolution } from '../components/RuleResolution'
import { useGameSession } from '../state/useGameSession'

export function Game() {
  const session = useGameSession()

  return (
    <div className="app-shell">
      <div className="ambient-glow ambient-glow--one" />
      <div className="ambient-glow ambient-glow--two" />
      <GameHeader campaignId={session.campaignId} isLoading={session.isLoading} />
      <main className="game-layout">
        <div className="story-column">
          <NarrativePanel history={session.history} />
          {session.isLoading && <LoadingState />}
          <RuleResolution resolution={session.ruleResolution} />
          {session.error && (
            <div className="error-banner" role="alert">
              <span className="error-icon">!</span>
              <div>
                <strong>{session.error.kind === 'timeout' ? 'O Mestre demorou mais que o esperado.' : 'Não foi possível continuar a sessão.'}</strong>
                <p>{session.error.message}</p>
              </div>
            </div>
          )}
          <ActionInput isLoading={session.isLoading} onSubmit={session.sendAction} />
        </div>
        <div className="sidebar-column">
          <CharacterSummary state={session.state} />
          <div className="sidebar-note">
            <span className="note-mark">✦</span>
            <p><strong>Jogue no seu ritmo.</strong><br />Descreva o que seu aventureiro faz. O mundo responde.</p>
          </div>
        </div>
      </main>
      <footer className="app-footer"><span>BYONDER SOLO · v0.1</span><span>Uma crônica por vez</span></footer>
    </div>
  )
}
