import { ActionInput } from '../components/ActionInput'
import { CombatPanel } from '../components/CombatPanel'
import { CharacterSummary } from '../components/CharacterSummary'
import { CharacterWizard } from '../components/CharacterWizard'
import { GameHeader } from '../components/GameHeader'
import { LoadingState } from '../components/LoadingState'
import { NarrativePanel } from '../components/NarrativePanel'
import { RuleResolution } from '../components/RuleResolution'
import { RuleTeachingPanel } from '../components/RuleTeachingPanel'
import { StructuredActionCard } from '../components/StructuredActionCard'
import { useGameSession } from '../state/useGameSession'

export function Game() {
  const session = useGameSession()
  return (
    <div className={`app-shell ${session.hasSession ? 'app-shell--game' : 'app-shell--wizard'}`}>
      <div className="ambient-orb ambient-orb--one" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--two" aria-hidden="true" />
      <div className="dragon-trace dragon-trace--top" aria-hidden="true" />
      <div className="dragon-trace dragon-trace--bottom" aria-hidden="true" />
      <GameHeader campaignId={session.campaignId} isLoading={session.isLoading} hasSession={session.hasSession} />
      {!session.hasSession ? <main className="wizard-layout"><CharacterWizard onCreated={session.startSession} /></main> : <main className="game-layout">
        <aside className="sidebar-column sidebar-column--left">
          <CharacterSummary state={session.state} character={session.character} classLabel={session.classLabel} derived={session.derived} />
          <div className="world-card">
            <div className="world-card__icon" aria-hidden="true">◈</div>
            <div><span className="eyebrow">O mundo aguarda</span><p>Uma crônica por vez. Cada escolha deixa uma marca.</p></div>
          </div>
          <div className="sidebar-note"><span className="note-mark" aria-hidden="true">✦</span><p><strong>Jogue no seu ritmo.</strong><br />O Mestre responde ao que você imagina.</p></div>
        </aside>
        <div className="story-column">
          <NarrativePanel history={session.history} state={session.state} narrationStatus={session.narrationStatus} />
          <div className="turn-controls">
            {session.isLoading && <LoadingState />}
            <CombatPanel state={session.state} />
            <RuleResolution resolution={session.ruleResolution} />
            <RuleTeachingPanel teaching={session.ruleTeaching} />
            {session.error && (
              <div className="error-banner" role="alert">
                <span className="error-icon">!</span>
                <div><strong>{session.error.kind === 'timeout' ? 'O Mestre demorou mais que o esperado.' : 'A névoa interrompeu a sessão.'}</strong><p>{session.error.message}</p>
                  {session.failedTurn && <button className="error-retry" type="button" disabled={session.isLoading} onClick={() => void session.retryTurn()}>Tentar turno novamente</button>}
                </div>
              </div>
            )}
            {session.availableActions.length > 0 && <section className="available-actions" aria-labelledby="available-actions-title">
              <div className="available-actions__heading">
                <div>
                  <span className="section-kicker"><span className="kicker-line" /> Sugestões do Mestre</span>
                  <h2 id="available-actions-title">Ideias para este momento</h2>
                </div>
                <span className="available-actions__count">{session.availableActions.length}</span>
              </div>
                  <p className="available-actions__hint">Use uma sugestão ou descreva livremente o que seu personagem tenta fazer.</p>
              {session.availableActions.map((action, index) => <StructuredActionCard
                key={`${String(action.type)}-${index}`}
                action={action}
                isLoading={session.isLoading}
                onSubmit={(selected, text) => session.sendAction(text, selected)}
              />)}
            </section>}
            <ActionInput isLoading={session.isLoading} onSubmit={session.sendAction} />
          </div>
        </div>
        <aside className="sidebar-column sidebar-column--right" aria-label="Recursos da sessão">
          <div className="side-rail-heading"><span className="section-kicker"><span className="kicker-line" /> Preparação</span><span className="side-rail-count">03</span></div>
          <div className="rail-item rail-item--active"><span className="rail-icon">◉</span><span><strong>Aventura</strong><small>Em andamento</small></span></div>
          <div className="rail-item"><span className="rail-icon">♧</span><span><strong>Inventário</strong><small>Em breve</small></span></div>
          <div className="rail-item"><span className="rail-icon">⌖</span><span><strong>Missões</strong><small>Em breve</small></span></div>
          <div className="rail-divider" />
          <div className="rail-quote"><span aria-hidden="true">“</span><p>A coragem não é a ausência do medo. É o passo que vem depois.</p></div>
        </aside>
      </main>}
      <footer className="app-footer"><span><i aria-hidden="true">ᛉ</i> BYONDER SOLO · v0.1</span><span>Uma crônica por vez <i aria-hidden="true">✦</i></span></footer>
    </div>
  )
}
