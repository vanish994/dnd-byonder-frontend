import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendGameTurn } from './game'

const request = {
  campaign_id: 'campaign_local',
  state: { scene: 'estrada' },
  player_input: 'Entro na taverna.',
  action: null,
  available_actions: [],
}

describe('sendGameTurn', () => {
  afterEach(() => vi.restoreAllMocks())

  it('envia o contrato exato sem inventar uma ação mecânica', async () => {
    vi.stubEnv('VITE_GAME_API_URL', 'https://backend.example.com')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      campaign_id: 'campaign_local',
      narration: 'A taverna está cheia.',
      rule_resolution: { schema_version: 'rule-resolution-v1', status: 'needs_rule_validation', reason: 'not bound' },
      state: { scene: 'taverna' },
      available_actions: [],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    const response = await sendGameTurn(request)
    expect(response.narration).toBe('A taverna está cheia.')
    expect(fetchMock).toHaveBeenCalledWith('https://backend.example.com/v1/game/turn', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(request),
    }))
  })

  it('converte erro HTTP em erro amigável', async () => {
    vi.stubEnv('VITE_GAME_API_URL', 'https://backend.example.com')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ detail: 'MiMo narrator unavailable' }), { status: 502 }))
    await expect(sendGameTurn(request)).rejects.toMatchObject({ kind: 'http', status: 502 })
  })
})
