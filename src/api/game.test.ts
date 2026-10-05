import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCharacter, createPHB2024Character, loadCharacterOptions, loadGameSession, loadPHB2024CharacterOptions, sendGameTurn, validateCharacter, validatePHB2024Character } from './game'

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
const sessionId = '550e8400-e29b-41d4-a716-446655440000'
const sessionToken = 's'.repeat(43)
const idempotencyKey = 'turn:client-generated-key-0001'
const created = { character, derived, state: { character }, available_actions: [], campaign_id: 'real-campaign-id',
  session_id: sessionId, revision: 0, rule_resolution: resolution }
const turn = {
  campaign_id: 'real-campaign-id', session_id: sessionId, revision: 1, narration: 'Uma taverna surge no caminho.',
  narration_status: 'unavailable',
  rule_resolution: { schema_version: 'rule-resolution-v1', status: 'needs_rule_validation', reason: 'not bound' },
  state: { character, scene: 'taverna' }, available_actions: [],
}
const request = { session_id: sessionId, expected_revision: 0, player_input: 'Entro na taverna.', action: null }
const resumed = {
  campaign_id: 'real-campaign-id', session_id: sessionId, ruleset: 'dnd-2024-phb', revision: 0,
  character, derived, state: { character }, available_actions: [],
  history: [{ id: 'history-1', speaker: 'mestre', text: 'A aventura começa.', timestamp: 0 }],
}
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })

const classIds2024 = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard']
const speciesIds2024 = ['aasimar', 'dragonborn', 'dwarf', 'elf', 'gnome', 'goliath', 'halfling', 'human', 'orc', 'tiefling']
const backgroundIds2024 = ['acolyte', 'artisan', 'charlatan', 'criminal', 'entertainer', 'farmer', 'guard', 'guide', 'hermit', 'merchant', 'noble', 'sage', 'sailor', 'scribe', 'soldier', 'wayfarer']
const phb2024Catalog = {
  schema_version: 'character-options-phb2024-v1', ruleset: 'dnd-2024-phb', edition: 2024, supported_character_level: 1,
  classes: classIds2024.map((id) => ({ id, label: id, source_name: id, levels: [1], hit_die: 8, primary_abilities: ['strength'],
    skill_choices: { count: 1, options: ['athletics'] }, saving_throw_proficiencies: ['strength', 'constitution'],
    weapon_proficiencies: ['simple'], armor_proficiencies: [], level_1_features: [{ id: `${id}_feature`, name: 'Feature' }],
    equipment_packages: [{ id: 'A', items: [{ name: 'Pack', quantity: 1 }], gold_gp: 5 }] })),
  species: speciesIds2024.map((id, index) => ({ id, label: id, source_name: id, choices: {},
    ...(index === 0 ? { summary: ['NOT FOR PLAYER — OCR audit note'], details: { internal: true } } : {}) })),
  backgrounds: backgroundIds2024.map((id) => ({ id, label: id, source_name: id, eligible_abilities: ['strength', 'dexterity', 'constitution'],
    skill_proficiencies: ['athletics'], origin_feat: 'Tough', origin_feat_id: 'tough', origin_feat_label_pt_br: 'Robusto',
    equipment_packages: [{ id: 'A', items: [{ name: 'Tool', quantity: 1 }], gold_gp: 10 }] })),
  alignment_options: [{ id: 'neutral', label: 'Neutro' }], abilities: ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'],
  skills: ['athletics'], recommended_standard_array: {},
  ability_score_methods: { standard_array: { id: 'standard_array', label: 'Valores Padrão', values: [15, 14, 13, 12, 10, 8] },
    point_buy: { id: 'point_buy', label: 'Compra por Pontos', budget: 27, minimum: 8, maximum: 15, costs: { '8': 0, '9': 1, '10': 2, '11': 3, '12': 4, '13': 5, '14': 7, '15': 9 } },
    rolled: { id: 'rolled', label: 'Rolagem', dice: '4d6', drop_lowest: 1, number_of_scores: 6 }, background_increases: { patterns: [[2, 1], [1, 1, 1]], eligible_source: 'background' } },
  language_rules: { required: ['common'], additional_choice_count: 2, additional_options: [{ id: 'dwarvish', label: 'Anão' }], selection_source: 'PHB2024' },
}
const draft2024 = {
  name: 'Aria', class_id: 'barbarian', level: 1 as const, species_id: 'dwarf', species_choices: {}, background_id: 'farmer',
  alignment_id: 'neutral', ability_method_id: 'standard_array' as const, base_abilities: { strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 },
  background_ability_increases: { strength: 2, constitution: 1 }, abilities: { strength: 17, dexterity: 14, constitution: 14, intelligence: 12, wisdom: 10, charisma: 8 },
  skills: ['athletics'], language_choices: ['draconic', 'dwarvish'], class_equipment_option: 'A', background_equipment_option: 'A', class_choices: {},
}

describe('Gateway public game API', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); sessionStorage.clear() })

  it('busca o catálogo público e extrai exclusivamente suas opções de classe, atributos, perícias e armas', async () => {
    vi.stubEnv('VITE_GAME_API_URL', 'https://gateway.example.com/')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(catalog))
    const options = await loadCharacterOptions()
    expect(options.classes[0]).toMatchObject({ name: 'Guerreiro', skill_choices: 2, skill_options: ['athletics', 'persuasion'], weapon_options: ['longsword'] })
    expect(options.abilities[0]).toMatchObject({ name: 'Força', abbreviation: 'STR', description: 'Ações de força.' })
    expect(options.standard_array).toEqual(catalog.standard_array)
    expect(fetchMock).toHaveBeenCalledWith('https://gateway.example.com/v1/character/options', expect.objectContaining({ method: 'GET', signal: expect.any(AbortSignal) }))
  })

  it('carrega o roster PHB 2024 pela rota v2 e preserva as escolhas oficiais', async () => {
    vi.stubEnv('VITE_GAME_API_URL', 'https://gateway.example.com')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(phb2024Catalog))
    const options = await loadPHB2024CharacterOptions()
    expect(options.edition).toBe(2024)
    expect(options.classes).toHaveLength(12)
    expect(options.species).toHaveLength(10)
    expect(options.species[0]).not.toHaveProperty('summary')
    expect(options.species[0]).not.toHaveProperty('details')
    expect(options.backgrounds).toHaveLength(16)
    expect(options.ability_score_methods.point_buy.budget).toBe(27)
    expect(options.classes[0].equipment_packages[0].id).toBe('A')
    expect(fetchMock).toHaveBeenCalledWith('https://gateway.example.com/v2/character/options', expect.objectContaining({ method: 'GET' }))
  })

  it('valida e cria personagens pelo contrato v2 sem usar a rota legada', async () => {
    vi.stubEnv('VITE_GAME_API_URL', 'https://gateway.example.com')
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ valid: true, character, derived, rule_resolution: resolution, ruleset: 'dnd-2024-phb' }))
      .mockResolvedValueOnce(json(created))
    expect((await validatePHB2024Character(draft2024)).valid).toBe(true)
    const creation = await createPHB2024Character(draft2024)
    expect(creation.campaign_id).toBe('real-campaign-id')
    expect(creation.session_id).toBe(sessionId)
    expect(creation.session_token).toHaveLength(43)
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://gateway.example.com/v2/character/validate',
      'https://gateway.example.com/v2/character/create',
    ])
    for (const [, init] of fetchMock.mock.calls) {
      expect(JSON.parse(init?.body as string)).toEqual(draft2024)
    }
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Session-Token': expect.any(String),
      'Idempotency-Key': expect.stringMatching(/^create:/),
    })
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
    const response = await sendGameTurn(request, sessionToken, idempotencyKey)
    expect(response.narration).toBe('Uma taverna surge no caminho.')
    expect(response.narration_status).toBe('unavailable')
    expect(fetchMock).toHaveBeenCalledWith('https://gateway.example.com/v1/game/turn', expect.objectContaining({
      method: 'POST', body: JSON.stringify(request),
      headers: { 'Content-Type': 'application/json', 'X-Session-Token': sessionToken, 'Idempotency-Key': idempotencyKey },
    }))
  })

  it('consome rule-teaching-v1 sem alterar os campos mecânicos ou as ações autorizadas', async () => {
    vi.stubEnv('VITE_GAME_API_URL', 'https://gateway.example.com')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({
      ...turn,
      available_actions: [{ type: 'ability_check', ability: 'strength' }],
      rule_teaching: { schema_version: 'rule-teaching-v1', tips: [{ id: 'check', title: 'Testes', text: 'O Mestre resolve o resultado.' }] },
    }))

    const response = await sendGameTurn(request, sessionToken, idempotencyKey)

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

    await expect(sendGameTurn(request, sessionToken, idempotencyKey)).resolves.toMatchObject({ rule_teaching: null })
    await expect(sendGameTurn(request, sessionToken, idempotencyKey)).resolves.toMatchObject({ rule_teaching: null })
    await expect(sendGameTurn(request, sessionToken, idempotencyKey)).resolves.toMatchObject({ rule_teaching: null })
  })

  it('rejeita envelopes externos malformados em vez de aceitar qualquer objeto truthy', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ ...catalog, abilities: 'broken' }))
      .mockResolvedValueOnce(json({ valid: true, derived: { hp: 11 } }))
      .mockResolvedValueOnce(json({ ...created, available_actions: ['attack'] }))
      .mockResolvedValueOnce(json({ ...turn, state: [], rule_resolution: { schema_version: 'wrong', status: 'resolved' } }))
    await expect(loadCharacterOptions()).rejects.toMatchObject({ kind: 'invalid' })
    await expect(validateCharacter(draft)).rejects.toMatchObject({ kind: 'invalid' })
    await expect(createCharacter(draft)).rejects.toMatchObject({ kind: 'invalid' })
    await expect(sendGameTurn(request, sessionToken, idempotencyKey)).rejects.toMatchObject({ kind: 'invalid' })
  })

  it('não expõe mensagens arbitrárias do upstream e conserva HTTP/status para feedback seguro', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ error: { message: 'private-key-do-not-show' } }, 422))
    await expect(validateCharacter(draft)).rejects.toMatchObject({ kind: 'http', status: 422, message: expect.not.stringContaining('private-key') })
  })

  it('orienta a escolher uma ação sugerida quando o Rule Engine rejeita um turno', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ detail: 'invalid structured action' }, 422))
    await expect(sendGameTurn(request, sessionToken, idempotencyKey)).rejects.toMatchObject({
      kind: 'http',
      status: 422,
      message: 'Essa ação não pôde ser resolvida. Escolha uma sugestão do Mestre ou tente outra ação.',
    })
  })

  it('classifica falha de rede de forma recuperável', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(loadCharacterOptions()).rejects.toMatchObject({ kind: 'network' })
  })

  it('retoma um snapshot PHB 2024 usando somente o token de sessão em header', async () => {
    vi.stubEnv('VITE_GAME_API_URL', 'https://gateway.example.com')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(resumed))
    await expect(loadGameSession(sessionId, sessionToken)).resolves.toMatchObject({
      campaign_id: 'real-campaign-id', revision: 0, ruleset: 'dnd-2024-phb', history: resumed.history,
    })
    expect(fetchMock).toHaveBeenCalledWith(`https://gateway.example.com/v1/sessions/${sessionId}`, expect.objectContaining({
      method: 'GET', headers: { 'X-Session-Token': sessionToken },
    }))
  })

  it('reutiliza token e chave de criação quando o cliente repete o mesmo payload após falha de rede', async () => {
    vi.stubEnv('VITE_GAME_API_URL', 'https://gateway.example.com')
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(json(created))
    await expect(createPHB2024Character(draft2024)).rejects.toMatchObject({ kind: 'network' })
    const firstHeaders = fetchMock.mock.calls[0]?.[1]?.headers
    const creation = await createPHB2024Character(draft2024)
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toEqual(firstHeaders)
    expect(creation.session_id).toBe(sessionId)
  })
})
