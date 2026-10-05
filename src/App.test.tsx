import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const classIds = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard']
const classLabels: Record<string, string> = {
  barbarian: 'Bárbaro', bard: 'Bardo', cleric: 'Clérigo', druid: 'Druida', fighter: 'Guerreiro', monk: 'Monge',
  paladin: 'Paladino', ranger: 'Patrulheiro', rogue: 'Ladino', sorcerer: 'Feiticeiro', warlock: 'Bruxo', wizard: 'Mago',
}
const allSkills = ['acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight_of_hand', 'stealth', 'survival']
const speciesIds = ['aasimar', 'dragonborn', 'dwarf', 'elf', 'gnome', 'goliath', 'halfling', 'human', 'orc', 'tiefling']
const speciesLabels: Record<string, string> = { aasimar: 'Aasimar', dragonborn: 'Draconato', dwarf: 'Anão', elf: 'Elfo', gnome: 'Gnomo', goliath: 'Golias', halfling: 'Halfling', human: 'Humano', orc: 'Orc', tiefling: 'Tiefling' }
const backgroundIds = ['acolyte', 'artisan', 'charlatan', 'criminal', 'entertainer', 'farmer', 'guard', 'guide', 'hermit', 'merchant', 'noble', 'sage', 'sailor', 'scribe', 'soldier', 'wayfarer']
const backgroundLabels: Record<string, string> = { acolyte: 'Acólito', artisan: 'Artesão', charlatan: 'Charlatão', criminal: 'Criminoso', entertainer: 'Artista', farmer: 'Fazendeiro', guard: 'Guarda', guide: 'Guia', hermit: 'Eremita', merchant: 'Comerciante', noble: 'Nobre', sage: 'Sábio', sailor: 'Marinheiro', scribe: 'Escriba', soldier: 'Soldado', wayfarer: 'Viajante' }
const languageLabels: Record<string, string> = { common_sign_language: 'Língua de Sinais Comum', draconic: 'Dracônico', dwarvish: 'Anão', elvish: 'Élfico', giant: 'Gigante', gnomish: 'Gnômico', goblin: 'Goblin', halfling: 'Halfling', orc: 'Orc' }
const packages = (prefix: string) => [
  { id: 'A', items: [{ name: `${prefix} kit`, quantity: 1 }, { name: 'Espada longa', quantity: 1 }], gold_gp: 10 },
  { id: 'B', items: [{ name: `${prefix} alternativa`, quantity: 1 }], gold_gp: 25 },
]
const options = {
  schema_version: 'character-options-phb2024-v1', ruleset: 'dnd-2024-phb', edition: 2024, supported_character_level: 1,
  classes: classIds.map((id) => ({ id, label: classLabels[id], source_name: id, levels: [1], hit_die: id === 'fighter' ? 10 : 8,
    primary_abilities: ['strength'], skill_choices: { count: id === 'fighter' ? 2 : 1, options: id === 'fighter' ? ['athletics', 'persuasion', 'perception'] : ['athletics', 'perception'] },
    saving_throw_proficiencies: ['strength', 'constitution'], weapon_proficiencies: ['simple'], armor_proficiencies: [],
    level_1_features: [{ id: `${id}_feature`, name: 'Característica de nível 1', summary: 'Resumo.' }], equipment_packages: packages(`Pacote ${id}`) })),
  species: speciesIds.map((id) => ({ id, label: speciesLabels[id], source_name: id, choices: id === 'dwarf' ? {} : { size: ['medium', 'small'] } })),
  backgrounds: backgroundIds.map((id) => ({ id, label: backgroundLabels[id], source_name: id, eligible_abilities: ['strength', 'dexterity', 'constitution'],
    skill_proficiencies: ['animal_handling', 'nature'], origin_feat: 'Tough', origin_feat_id: 'tough', origin_feat_label_pt_br: 'Robusto', equipment_packages: packages(`Origem ${id}`) })),
  alignment_options: [
    { id: 'lawful_good', label: 'Leal e Bom' }, { id: 'neutral_good', label: 'Neutro e Bom' }, { id: 'chaotic_good', label: 'Caótico e Bom' },
    { id: 'lawful_neutral', label: 'Leal e Neutro' }, { id: 'neutral', label: 'Neutro' }, { id: 'chaotic_neutral', label: 'Caótico e Neutro' },
    { id: 'lawful_evil', label: 'Leal e Mau' }, { id: 'neutral_evil', label: 'Neutro e Mau' }, { id: 'chaotic_evil', label: 'Caótico e Mau' },
  ],
  abilities: ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'], skills: allSkills,
  recommended_standard_array: { fighter: { strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 } },
  ability_score_methods: {
    standard_array: { id: 'standard_array', label: 'Valores Padrão', values: [15, 14, 13, 12, 10, 8] },
    point_buy: { id: 'point_buy', label: 'Compra por Pontos', budget: 27, minimum: 8, maximum: 15, costs: { '8': 0, '9': 1, '10': 2, '11': 3, '12': 4, '13': 5, '14': 7, '15': 9 } },
    rolled: { id: 'rolled', label: 'Rolagem de Dados', dice: '4d6', drop_lowest: 1, number_of_scores: 6 },
    background_increases: { patterns: [[2, 1], [1, 1, 1]], eligible_source: 'background' },
  },
  language_rules: { required: ['common'], additional_choice_count: 2, additional_options: Object.entries(languageLabels).map(([id, label]) => ({ id, label })), selection_source: 'PHB2024' },
}
const abilities = { strength: 17, dexterity: 15, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 }
const baseAbilities = { strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 }
const startingEquipment = { items: [{ name: 'Pacote fighter kit', quantity: 1 }, { name: 'Espada longa', quantity: 1 }, { name: 'Origem farmer kit', quantity: 1 }, { name: 'Espada longa', quantity: 1 }], gold_gp: 20 }
const character = {
  id: 'character-real', name: 'Aria', class: { id: 'fighter', level: 1 }, level: 1, current_hp: 11,
  species_id: 'dwarf', background_id: 'farmer', alignment_id: 'neutral_good', abilities, starting_equipment: startingEquipment,
}
const derived = {
  ability_modifiers: { strength: 3, dexterity: 2, constitution: 1, intelligence: 1, wisdom: 0, charisma: -1 },
  saving_throw_modifiers: { strength: 5, dexterity: 2, constitution: 3, intelligence: 1, wisdom: 0, charisma: -1 },
  skill_modifiers: { athletics: 5, persuasion: 1, animal_handling: 2, nature: 1 }, proficiency_bonus: 2,
  hp: { current: 11, max: 11 }, ac: { value: 12, source: 'unarmored' }, initiative_modifier: 2,
}
const resolution = { schema_version: 'rule-resolution-v1', status: 'resolved', action: { type: 'create_character' }, outcome: { derived } }
const action = { type: 'ability_check', ability: 'strength', dc: 12, modifier: 3, label: 'Teste de Força', player_input: 'Faço um teste de Força.' }
const sessionId = '550e8400-e29b-41d4-a716-446655440000'
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })

function mockGateway({
  failOptions = false,
  failValidate = false,
  failCreate = false,
  failTurn = false,
  conflictTurn = false,
  actions = [] as Array<Record<string, unknown>>,
  ruleTeaching,
  narrationStatus = 'available',
}: {
  failOptions?: boolean
  failValidate?: boolean
  failCreate?: boolean
  failTurn?: boolean
  conflictTurn?: boolean
  actions?: Array<Record<string, unknown>>
  ruleTeaching?: unknown
  narrationStatus?: 'available' | 'unavailable'
} = {}) {
  let optionsRequests = 0
  let validations = 0
  let creations = 0
  let turns = 0
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = new URL(String(input)).pathname
    if (path === '/v2/character/options') {
      optionsRequests++
      if (failOptions && optionsRequests === 1) return json({ error: 'temporarily unavailable' }, 503)
      return json(options)
    }
    if (path === '/v2/character/validate') {
      validations++
      if (failValidate && validations === 1) return json({ error: { message: 'private-backend-info' } }, 422)
      return json({ valid: true, character, derived, rule_resolution: resolution, ruleset: 'dnd-2024-phb' })
    }
    if (path === '/v2/character/create') {
      creations++
      if (failCreate && creations === 1) return json({ error: { message: 'private-backend-info' } }, 502)
      return json({ character, derived, rule_resolution: resolution, ruleset: 'dnd-2024-phb', campaign_id: 'campaign-created',
        session_id: sessionId, revision: 0, state: { character }, available_actions: actions })
    }
    if (path === `/v1/sessions/${sessionId}`) {
      return json({ campaign_id: 'campaign-created', session_id: sessionId, ruleset: 'dnd-2024-phb', revision: 4,
        character, derived, state: { character, scene: { id: 'resume-scene' } }, available_actions: actions,
        history: [{ id: 'resume-history-1', speaker: 'mestre', text: 'A campanha retomada.', timestamp: 0 }] })
    }
    if (path === '/v1/game/turn') {
      turns++
      if (conflictTurn && turns === 1) return json({ error: { message: 'stale revision' } }, 409)
      if (failTurn && turns === 1) return json({ error: { message: 'upstream secret' } }, 502)
      return json({ campaign_id: 'campaign-created', session_id: sessionId, revision: turns,
        narration: turns === 1 ? 'A aventura começou.' : 'O Mestre responde ao seu gesto.',
        narration_status: narrationStatus,
        rule_resolution: { schema_version: 'rule-resolution-v1', status: 'needs_rule_validation' },
        state: { character, scene: 'abertura' }, available_actions: actions,
        ...(ruleTeaching !== undefined ? { rule_teaching: ruleTeaching } : {}) })
    }
    throw new Error(`Rota inesperada: ${path}`)
  })
}

function continueWizard() { fireEvent.click(screen.getByRole('button', { name: 'Continuar' })) }

async function toSpecies() {
  await screen.findByRole('textbox', { name: 'Nome do personagem' })
  fireEvent.change(screen.getByRole('textbox', { name: 'Nome do personagem' }), { target: { value: 'Aria' } })
  continueWizard()
  fireEvent.click(screen.getByRole('radio', { name: /Guerreiro/ }))
  continueWizard()
  expect(screen.getByRole('heading', { name: 'Escolha sua espécie' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('radio', { name: /Anão/ }))
  continueWizard()
}

async function toOrigin() {
  await toSpecies()
  expect(screen.getByRole('heading', { name: 'Defina sua origem' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('radio', { name: /Fazendeiro/ }))
  fireEvent.change(screen.getByRole('combobox', { name: 'Alinhamento' }), { target: { value: 'neutral_good' } })
  fireEvent.click(screen.getByRole('checkbox', { name: 'Dracônico' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Anão' }))
  continueWizard()
}

function assignScores() {
  const scores = [['Força', '15'], ['Destreza', '14'], ['Constituição', '13'], ['Inteligência', '12'], ['Sabedoria', '10'], ['Carisma', '8']]
  for (const [label, score] of scores) fireEvent.change(screen.getByRole('combobox', { name: label }), { target: { value: score } })
  fireEvent.change(screen.getByRole('combobox', { name: 'Atributo que recebe +2' }), { target: { value: 'strength' } })
  fireEvent.change(screen.getByRole('combobox', { name: 'Atributo diferente que recebe +1' }), { target: { value: 'dexterity' } })
}

async function toSkills() {
  await toOrigin()
  expect(screen.getByRole('heading', { name: 'Atribua seus atributos' })).toBeInTheDocument()
  assignScores()
  continueWizard()
  expect(screen.getByRole('heading', { name: 'Escolha suas perícias' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Atletismo' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Persuasão' }))
  continueWizard()
}

async function toEquipment() {
  await toSkills()
  expect(screen.getByRole('heading', { name: 'Escolha o equipamento inicial' })).toBeInTheDocument()
  const packageChoices = screen.getAllByRole('radio', { name: /Opção A/ })
  fireEvent.click(packageChoices[0])
  fireEvent.click(packageChoices[1])
}

async function toSummary() {
  await toEquipment()
  continueWizard()
  await screen.findByRole('heading', { name: 'Sua ficha, pronta para começar' })
}

const expectedDraft = {
  name: 'Aria', class_id: 'fighter', level: 1, species_id: 'dwarf', species_choices: {}, background_id: 'farmer',
  alignment_id: 'neutral_good', ability_method_id: 'standard_array', base_abilities: baseAbilities,
  background_ability_increases: { strength: 2, dexterity: 1 }, abilities,
  skills: ['athletics', 'persuasion'], language_choices: ['draconic', 'dwarvish'],
  class_equipment_option: 'A', background_equipment_option: 'A', class_choices: {},
}

describe('criação guiada PHB 2024 e sessão', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); sessionStorage.clear() })

  it('inicia pelo wizard, carrega o catálogo PHB 2024 pelo Gateway e não mostra ficha/sessão fictícia', async () => {
    vi.stubEnv('VITE_GAME_API_URL', 'https://gateway.example.com')
    const fetchMock = mockGateway()
    render(<App />)
    expect(screen.getByRole('status', { name: '' }).textContent).toContain('Carregando')
    expect(await screen.findByRole('textbox', { name: 'Nome do personagem' })).toBeInTheDocument()
    expect(screen.getByText('Etapa 1 de 8')).toBeInTheDocument()
    expect(screen.getByText('Preparando personagem')).toBeInTheDocument()
    expect(screen.queryByText('Sessão ativa')).not.toBeInTheDocument()
    expect(screen.queryByText('Aventureiro sem nome')).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual(['/v2/character/options'])
  })

  it('seleciona classe, espécie, origem, método de atributos e perícias sem reutilizar valores', async () => {
    mockGateway()
    render(<App />)
    await toSkills()
    expect(screen.getByRole('heading', { name: 'Escolha o equipamento inicial' })).toBeInTheDocument()
  })

  it('envia a criação completa 2024 e mostra o resumo com valores derivados pelo Rule Engine', async () => {
    const fetchMock = mockGateway()
    render(<App />)
    await toSummary()
    const summary = screen.getByLabelText('Resumo da ficha validada')
    expect(within(summary).getByText('11/11')).toBeInTheDocument()
    expect(within(summary).getByText('CA').parentElement).toHaveTextContent('12')
    expect(within(summary).getByText('Guerreiro · Anão · Nível 1')).toBeInTheDocument()
    expect(within(summary).getByText(/Talento de origem:.*Robusto/)).toBeInTheDocument()
    const validation = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/v2/character/validate'))
    expect(JSON.parse(validation?.[1]?.body as string)).toEqual(expectedDraft)
  })

  it('cria a sessão C2 e envia ao turno apenas o comando, session_id e revisão esperada', async () => {
    const fetchMock = mockGateway({ actions: [action] })
    render(<App />)
    await toSummary()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar personagem' }))
    expect(await screen.findByText('A aventura começou.')).toBeInTheDocument()
    expect(screen.getByText('Sessão ativa')).toBeInTheDocument()
    expect(screen.getByText('Aria')).toBeInTheDocument()
    expect(screen.getByText('Nível 1 · Guerreiro')).toBeInTheDocument()
    expect(screen.getByText('11/11')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('Anão · Fazendeiro · Neutro e Bom')).toBeInTheDocument()
    const firstTurn = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/v1/game/turn'))
    expect(JSON.parse(firstTurn?.[1]?.body as string)).toEqual({
      session_id: sessionId, expected_revision: 0, player_input: 'Começar a aventura.', action: null,
    })
    expect(firstTurn?.[1]?.headers).toMatchObject({
      'X-Session-Token': expect.any(String), 'Idempotency-Key': expect.stringMatching(/^turn:/),
    })
    fireEvent.click(screen.getByRole('button', { name: 'Usar sugestão' }))
    await screen.findByText('O Mestre responde ao seu gesto.')
    const turns = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/v1/game/turn'))
    expect(JSON.parse(turns[1][1]?.body as string)).toEqual({
      session_id: sessionId, expected_revision: 1, player_input: 'Faço um teste de Força.', action,
    })
    expect(JSON.parse(turns[1][1]?.body as string)).not.toHaveProperty('state')
    expect(JSON.parse(turns[1][1]?.body as string)).not.toHaveProperty('available_actions')
  })

  it('mostra a orientação mesmo quando a narrativa falha e mantém as ações do Backend como autoridade', async () => {
    mockGateway({
      actions: [action], narrationStatus: 'unavailable',
      ruleTeaching: { schema_version: 'rule-teaching-v1', tips: [{ id: 'check', title: 'Testes de habilidade', text: 'O resultado é resolvido pelo Mestre.' }] },
    })
    render(<App />)
    await toSummary()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar personagem' }))
    expect(await screen.findByText('A aventura começou.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Orientação para este turno' })).toBeInTheDocument()
    expect(screen.getByText('O resultado é resolvido pelo Mestre.')).toBeInTheDocument()
    expect(screen.getByText('A mecânica foi resolvida; a narração está temporariamente indisponível.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Usar sugestão' })).toHaveLength(1)
  })

  it('preserva escolhas e permite repetir carregamento e validação após erros seguros do Gateway', async () => {
    mockGateway({ failOptions: true, failValidate: true })
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await toEquipment()
    continueWizard()
    expect(await screen.findByRole('alert')).toHaveTextContent('Confira as escolhas')
    expect(screen.queryByText('private-backend-info')).not.toBeInTheDocument()
    expect(screen.getAllByRole('radio', { name: /Opção A/ })[0]).toBeChecked()
    continueWizard()
    await screen.findByRole('heading', { name: 'Sua ficha, pronta para começar' })
  })

  it('repete a criação após erro sem perder o resumo validado', async () => {
    const fetchMock = mockGateway({ failCreate: true })
    render(<App />)
    await toSummary()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar personagem' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Suas escolhas foram mantidas')
    expect(screen.getByRole('heading', { name: 'Sua ficha, pronta para começar' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar personagem' }))
    await screen.findByText('A aventura começou.')
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/v2/character/create'))).toHaveLength(2)
  })

  it('preserva o personagem criado quando o primeiro turno falha e recupera com retry sem recriá-lo', async () => {
    const fetchMock = mockGateway({ failTurn: true })
    render(<App />)
    await toSummary()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar personagem' }))
    expect(await screen.findByRole('button', { name: 'Tentar turno novamente' })).toBeInTheDocument()
    expect(screen.getByText('Aria')).toBeInTheDocument()
    expect(screen.getByText('11/11')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar turno novamente' }))
    await screen.findByText('O Mestre responde ao seu gesto.')
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/v2/character/create'))).toHaveLength(1)
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/v1/game/turn'))).toHaveLength(2)
  })

  it('bloqueia novas ações em conflito 409 até sincronizar o snapshot do servidor', async () => {
    mockGateway({ actions: [action], conflictTurn: true })
    render(<App />)
    await toSummary()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar personagem' }))
    const syncButton = await screen.findByRole('button', { name: 'Sincronizar sessão' })
    expect(await screen.findByRole('button', { name: 'Usar sugestão' })).toBeDisabled()
    fireEvent.click(syncButton)
    await screen.findByText('A campanha retomada.')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Usar sugestão' })).toBeEnabled())
  })

  it('ao recarregar volta a um wizard vazio em vez de fabricar personagem ou pontos de vida', async () => {
    mockGateway()
    const view = render(<App />)
    const name = await screen.findByRole('textbox', { name: 'Nome do personagem' })
    fireEvent.change(name, { target: { value: 'Aria' } })
    view.unmount()
    render(<App />)
    expect(await screen.findByRole('textbox', { name: 'Nome do personagem' })).toHaveValue('')
    await waitFor(() => expect(screen.getByText('Preparando personagem')).toBeInTheDocument())
    expect(screen.queryByText('11/11')).not.toBeInTheDocument()
  })

  it('retoma a sessão salva com o estado canônico e histórico do Backend', async () => {
    const token = 't'.repeat(43)
    sessionStorage.setItem('byonder.active-session.v1', JSON.stringify({
      campaign_id: 'campaign-created', session_id: sessionId, session_token: token, revision: 2, class_label: 'Guerreiro',
    }))
    const fetchMock = mockGateway({ actions: [action] })
    render(<App />)
    expect(await screen.findByText('A campanha retomada.')).toBeInTheDocument()
    expect(screen.getByText('Sessão ativa')).toBeInTheDocument()
    expect(screen.getByText('Aria')).toBeInTheDocument()
    const resumeCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith(`/v1/sessions/${sessionId}`))
    expect(resumeCall?.[1]).toMatchObject({ method: 'GET', headers: { 'X-Session-Token': token } })
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/v1/game/turn'))).toBe(false)
  })
})
