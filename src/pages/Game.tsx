import { ActionInput } from '../components/ActionInput'
import { CharacterSummary } from '../components/CharacterSummary'
import { GameHeader } from '../components/GameHeader'
import { LoadingState } from '../components/LoadingState'
import { NarrativePanel } from '../components/NarrativePanel'
import { RuleResolution } from '../components/RuleResolution'
import { StructuredActionCard } from '../components/StructuredActionCard'
import { useGameSession } from '../state/useGameSession'
import type { AbilityCheckAction } from '../types/game'

const narrativeSuggestions = ['Explorar o ambiente', 'Investigar a estrada', 'Observar em silêncio']
const availableAbilityCheck: AbilityCheckAction = {
  type: 'ability_check',
  ability: 'strength',
  dc: 12,
  modifier: 3,
}

export function Game() {
  const session = useGameSession()
  return (
    <div className="app-shell">
      <div className="ambient-orb ambient-orb--one" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--two" aria-hidden="true" />
      <div className="dragon-trace dragon-trace--top" aria-hidden="true" />
      <div className="dragon-trace dragon-trace--bottom" aria-hidden="true" />
      <GameHeader campaignId={session.campaignId} isLoading={session.isLoading} />
      <main className="game-layout">
        <aside className="sidebar-column sidebar-column--left">
          <CharacterSummary state={session.state} />
          <div className="world-card">
            <div className="world-card__icon" aria-hidden="true">◈</div>
            <div><span className="eyebrow">O mundo aguarda</span><p>Uma crônica por vez. Cada escolha deixa uma marca.</p></div>
          </div>
          <div className="sidebar-note"><span className="note-mark" aria-hidden="true">✦</span><p><strong>Jogue no seu ritmo.</strong><br />O Mestre responde ao que você imagina.</p></div>
        </aside>
        <div className="story-column">
          <NarrativePanel history={session.history} />
          {session.isLoading && <LoadingState />}
          <RuleResolution resolution={session.ruleResolution} />
          {session.error && (
            <div className="error-banner" role="alert">
              <span className="error-icon">!</span>
              <div><strong>{session.error.kind === 'timeout' ? 'O Mestre demorou mais que o esperado.' : 'A névoa interrompeu a sessão.'}</strong><p>{session.error.message}</p></div>
            </div>
          )}
          <StructuredActionCard
            action={availableAbilityCheck}
            isLoading={session.isLoading}
            onSubmit={(action) => session.sendAction('Tento arrombar a porta.', action)}
          />
          <ActionInput isLoading={session.isLoading} onSubmit={session.sendAction} suggestions={narrativeSuggestions} />
        </div>
        <aside className="sidebar-column sidebar-column--right" aria-label="Recursos da sessão">
          <div className="side-rail-heading"><span className="section-kicker"><span className="kicker-line" /> Preparação</span><span className="side-rail-count">03</span></div>
          <div className="rail-item rail-item--active"><span className="rail-icon">◉</span><span><strong>Aventura</strong><small>Em andamento</small></span></div>
          <div className="rail-item"><span className="rail-icon">♧</span><span><strong>Inventário</strong><small>Em breve</small></span></div>
          <div className="rail-item"><span className="rail-icon">⌖</span><span><strong>Missões</strong><small>Em breve</small></span></div>
          <div className="rail-divider" />
          <div className="rail-quote"><span aria-hidden="true">“</span><p>A coragem não é a ausência do medo. É o passo que vem depois.</p></div>
        </aside>
      </main>
      <footer className="app-footer"><span><i aria-hidden="true">ᛉ</i> BYONDER SOLO · v0.1</span><span>Uma crônica por vez <i aria-hidden="true">✦</i></span></footer>
    </div>
  )
}
