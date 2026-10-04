import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCharacter, loadCharacterOptions, sendGameTurn, validateCharacter } from './game'

const catalog = {
  schema_version: 'character-options-v1',
  classes: [{ id: 'fighter', label: 'Guerreiro', levels: [1], skill_choices: { count: 2, options: ['athletics', 'persuasion'] }, weapon_options: ['longsword'] }],
  levels: [1], standard_array: [15, 14, 13, 12, 10, 8],
  abilities: [
    { id: 'strength', label: 'Força', abbreviation: 'STR', description: 'Ações de força.' },
    { id: 'dexterity', label: 'Destreza' }, { id: 'constitution', label: 'Constituição' },
    { id: 'intelligence', label: 'Inteligência' }, { id: 'wisdom', label: 'Sabedoria' },
    { id: 'charisma', label: 'Carisma' },
  ],
  skills: [{ id: 'athletics', label: 'Atletismo' }, { id: 'persuasion', label: 'Persuasão' }],
  weapons: [{ id: 'longsword', label: 'Espada longa' }],
}

const draft = {
  name: 'Aria', class_id: 'fighter', level: 1,
  abilities: { strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 },
  skills: ['athletics', 'persuasion'], weapon_id: 'longsword',
}

const derived = {
  ability_modifiers: { strength: 2, dexterity: 2, constitution: 1, intelligence: 1, wisdom: 0, charisma: -1 },
  saving_throw_modifiers: { strength: 4, dexterity: 2, constitution: 3, intelligence: 1, wisdom: 0, charisma: -1 },
  skill_modifiers: { athletics: 4, persuasion: 1 }, proficiency_bonus: 2,
  hp: { current: 11, max: 11 }, ac: { value: 12, source: 'unarmored' }, initiative_modifier: 2,
}
const character = {
  id: 'character-123', name: 'Aria', level: 1, class: { id: 'fighter', level: 1 },
  abilities: { strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 },
  current_hp: 11,
}
const resolution = { schema_version: 'rule-resolution-v1', status: 'resolved', action: { type: 'create_character' }, outcome: { derived } }
const created = { character, derived, state: { character }, available_actions: [], campaign_id: 'real-campaign-id', rule_resolution: resolution }
const turn = {
  campaign_id: 'real-campaign-id', narration: 'Uma taverna surge no caminho.',
  narration_status: 'unavailable',
  rule_resolution: { schema_version: 'rule-resolution-v1', status: 'needs_rule_validation', reason: 'not bound' },
  state: { character, scene: 'taverna' }, available_actions: [],
}
const request = { campaign_id: 'real-campaign-id', state: { character }, player_input: 'Entro na taverna.', action: null, available_actions: [] }
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })

describe('Gateway public game API', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs() })

  it('busca o catálogo público e extrai exclusivamente suas opções de classe, atributos, perícias e armas', async () => {
    vi.stubEnv('VITE_GAME_API_URL', 'https://gateway.example.com/')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(catalog))
    const options = await loadCharacterOptions()
    expect(options.classes[0]).toMatchObject({ name: 'Guerreiro', skill_choices: 2, skill_options: ['athletics', 'persuasion'], weapon_options: ['longsword'] })
    expect(options.abilities[0]).toMatchObject({ name: 'Força', abbreviation: 'STR', description: 'Ações de força.' })
    expect(options.standard_array).toEqual(catalog.standard_array)
    expect(fetchMock).toHaveBeenCalledWith('https://gateway.example.com/v1/character/options', expect.objectContaining({ method: 'GET', signal: expect.any(AbortSignal) }))
  })

  it('envia a escolha, mostra somente os dados derivados validados e cria a sessão pelo Gateway', async () => {
    vi.stubEnv('VITE_GAME_API_URL', 'https://gateway.example.com')
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ valid: true, character, derived, rule_resolution: resolution }))
      .mockResolvedValueOnce(json(created))
    expect((await validateCharacter(draft)).derived.hp.max).toBe(11)
    expect((await createCharacter(draft)).state).toEqual({ character })
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://gateway.example.com/v1/character/validate',
      'https://gateway.example.com/v1/character/create',
    ])
    for (const [, init] of fetchMock.mock.calls) {
      expect(init?.method).toBe('POST')
      expect(JSON.parse(init?.body as string)).toEqual(draft)
      expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })
    }
  })

  it('propaga state e available_actions reais sem inventar uma ação mecânica no turno', async () => {
    vi.stubEnv('VITE_GAME_API_URL', 'https://gateway.example.com')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(turn))
    const response = await sendGameTurn(request)
    expect(response.narration).toBe('Uma taverna surge no caminho.')
    expect(response.narration_status).toBe('unavailable')
    expect(fetchMock).toHaveBeenCalledWith('https://gateway.example.com/v1/game/turn', expect.objectContaining({ method: 'POST', body: JSON.stringify(request) }))
  })

  it('consome rule-teaching-v1 sem alterar os campos mecânicos ou as ações autorizadas', async () => {
    vi.stubEnv('VITE_GAME_API_URL', 'https://gateway.example.com')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({
      ...turn,
      available_actions: [{ type: 'ability_check', ability: 'strength' }],
      rule_teaching: { schema_version: 'rule-teaching-v1', tips: [{ id: 'check', title: 'Testes', text: 'O Mestre resolve o resultado.' }] },
    }))

    const response = await sendGameTurn(request)

    expect(response.rule_teaching).toEqual({ schema_version: 'rule-teaching-v1', tips: [{ id: 'check', title: 'Testes', text: 'O Mestre resolve o resultado.' }] })
    expect(response.rule_resolution).toEqual(turn.rule_resolution)
    expect(response.state).toEqual(turn.state)
    expect(response.available_actions).toEqual([{ type: 'ability_check', ability: 'strength' }])
    expect(response.narration).toBe(turn.narration)
    expect(response.narration_status).toBe(turn.narration_status)
  })

  it('trata rule_teaching ausente, nulo ou vazio como nenhuma orientação', async () => {
    vi.stubEnv('VITE_GAME_API_URL', 'https://gateway.example.com')
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(turn))
      .mockResolvedValueOnce(json({ ...turn, rule_teaching: null }))
      .mockResolvedValueOnce(json({ ...turn, rule_teaching: { schema_version: 'rule-teaching-v1', tips: [] } }))

    await expect(sendGameTurn(request)).resolves.toMatchObject({ rule_teaching: null })
    await expect(sendGameTurn(request)).resolves.toMatchObject({ rule_teaching: null })
    await expect(sendGameTurn(request)).resolves.toMatchObject({ rule_teaching: null })
  })

  it('rejeita envelopes externos malformados em vez de aceitar qualquer objeto truthy', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ ...catalog, abilities: 'broken' }))
      .mockResolvedValueOnce(json({ valid: true, derived: { hp: 11 } }))
      .mockResolvedValueOnce(json({ ...created, available_actions: ['attack'] }))
      .mockResolvedValueOnce(json({ ...turn, state: [], rule_resolution: { schema_version: 'wrong', status: 'resolved' } }))
    await expect(loadCharacterOptions()).rejects.toMatchObject({ kind: 'invalid' })
    await expect(validateCharacter(draft)).rejects.toMatchObject({ kind: 'invalid' })
    await expect(createCharacter(draft)).rejects.toMatchObject({ kind: 'invalid' })
    await expect(sendGameTurn(request)).rejects.toMatchObject({ kind: 'invalid' })
  })

  it('não expõe mensagens arbitrárias do upstream e conserva HTTP/status para feedback seguro', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ error: { message: 'private-key-do-not-show' } }, 422))
    await expect(validateCharacter(draft)).rejects.toMatchObject({ kind: 'http', status: 422, message: expect.not.stringContaining('private-key') })
  })

  it('classifica falha de rede de forma recuperável', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(loadCharacterOptions()).rejects.toMatchObject({ kind: 'network' })
  })
})
