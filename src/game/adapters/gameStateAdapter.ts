import type { GameState, StructuredAction } from '../../types/game'

export type VisualActor = {
  id: string
  label: string
  kind: 'character' | 'npc' | 'creature'
  visualKey: string
}

export type VisualSnapshot = {
  sceneId: string
  sceneTitle: string
  location: string
  description: string
  player: VisualActor
  actors: VisualActor[]
  authorizedInteractions: StructuredAction[]
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function text(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

export function adaptGameState(state: GameState, character: Record<string, unknown> | null, availableActions: StructuredAction[] = []): VisualSnapshot | null {
  const scene = record(state.scene) ? state.scene : null
  if (!scene || typeof scene.id !== 'string' || !scene.id) return null

  const rawCharacter = record(state.character) ? state.character : character ?? {}
  const characterId = text(rawCharacter.id, 'player-character')
  const characterName = text(rawCharacter.name, 'Aventureiro')
  const actors: VisualActor[] = []
  const rawActors = Array.isArray(scene.actors) ? scene.actors : []
  rawActors.forEach((raw, index) => {
    if (!record(raw)) return
    const kind = raw.kind === 'creature' || raw.kind === 'npc' ? raw.kind : 'npc'
    actors.push({
      id: text(raw.id, `actor-${index}`),
      label: text(raw.name ?? raw.label, 'Presença'),
      kind,
      visualKey: text(raw.visual_key ?? raw.visualKey, kind),
    })
  })

  return {
    sceneId: scene.id,
    sceneTitle: text(scene.title, text(scene.location, 'Cena atual')),
    location: text(scene.location, text(scene.title, 'Redwood Grove')),
    description: text(scene.description, 'A cena se forma diante de você.'),
    player: { id: characterId, label: characterName, kind: 'character', visualKey: 'player' },
    actors,
    authorizedInteractions: availableActions.length
      ? availableActions.filter(record)
      : Array.isArray(scene.available_actions) ? scene.available_actions.filter(record) : [],
  }
}
