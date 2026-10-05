import { describe, expect, it } from 'vitest'
import { adaptGameState } from './gameStateAdapter'

describe('adaptGameState', () => {
  it('converte a cena real em snapshot visual sem criar mecânica', () => {
    const snapshot = adaptGameState({
      scene: {
        id: 'redwood-grove-r3', title: 'Redwood Grove', location: 'Redwood Grove',
        description: 'Sequoias cercam a clareira.',
        available_actions: [{ type: 'investigate', label: 'Examinar a entrada' }],
        actors: [{ id: 'kaynen', name: 'Kaynen', kind: 'npc' }],
      },
    }, { id: 'el-1', name: 'Elian' })
    expect(snapshot).toMatchObject({
      sceneId: 'redwood-grove-r3', sceneTitle: 'Redwood Grove', location: 'Redwood Grove',
      player: { id: 'el-1', label: 'Elian', kind: 'character' },
      actors: [{ id: 'kaynen', label: 'Kaynen', kind: 'npc' }],
      authorizedInteractions: [{ type: 'investigate', label: 'Examinar a entrada' }],
    })
    expect(snapshot).not.toHaveProperty('hp')
    expect(snapshot).not.toHaveProperty('roll')
  })

  it('retorna null quando o backend não fornece uma cena válida', () => {
    expect(adaptGameState({ character: { name: 'Elian' } }, { name: 'Elian' })).toBeNull()
  })
})
