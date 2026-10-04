import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const options = {
  schema_version: 'character-options-v1',
  classes: [{ id: 'fighter', label: 'Guerreiro', levels: [1], skill_choices: { count: 2, options: ['athletics', 'persuasion'] }, weapon_options: ['longsword'] }],
  levels: [1], standard_array: [15, 14, 13, 12, 10, 8],
  abilities: [
    { id: 'strength', label: 'Força', abbreviation: 'STR', description: 'Usada para esforços físicos.' },
    { id: 'dexterity', label: 'Destreza' }, { id: 'constitution', label: 'Constituição' },
    { id: 'intelligence', label: 'Inteligência' }, { id: 'wisdom', label: 'Sabedoria' },
    { id: 'charisma', label: 'Carisma' },
  ],
  skills: [{ id: 'athletics', label: 'Atletismo' }, { id: 'persuasion', label: 'Persuasão' }],
  weapons: [{ id: 'longsword', label: 'Espada longa' }],
}
const abilities = { strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 }
const derived = {
  ability_modifiers: { strength: 2, dexterity: 2, constitution: 1, intelligence: 1, wisdom: 0, charisma: -1 },
  saving_throw_modifiers: { strength: 4, dexterity: 2, constitution: 3, intelligence: 1, wisdom: 0, charisma: -1 },
  skill_modifiers: { athletics: 4, persuasion: 1 }, proficiency_bonus: 2,
  hp: { current: 11, max: 11 }, ac: { value: 12, source: 'unarmored' }, initiative_modifier: 2,
  weapons: { longsword: { damage_dice: '1d8' } },
}
const character = { id: 'character-real', name: 'Aria', class: { id: 'fighter', level: 1 }, level: 1, current_hp: 11, abilities }
const resolution = { schema_version: 'rule-resolution-v1', status: 'resolved', action: { type: 'create_character' }, outcome: { derived } }
const action = { type: 'ability_check', ability: 'strength', dc: 12, modifier: 2 }
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })

function mockGateway({
  failOptions = false,
  failValidate = false,
  failCreate = false,
  failTurn = false,
  actions = [] as Array<Record<string, unknown>>,
  ruleTeaching,
  narrationStatus = 'available',
}: {
  failOptions?: boolean
  failValidate?: boolean
  failCreate?: boolean
  failTurn?: boolean
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
    if (path === '/v1/character/options') {
      optionsRequests++
      if (failOptions && optionsRequests === 1) return json({ error: 'temporarily unavailable' }, 503)
      return json(options)
    }
    if (path === '/v1/character/validate') {
      validations++
      if (failValidate && validations === 1) return json({ error: { message: 'private-backend-info' } }, 422)
      return json({ valid: true, character, derived, rule_resolution: resolution })
    }
    if (path === '/v1/character/create') {
      creations++
      if (failCreate && creations === 1) return json({ error: { message: 'private-backend-info' } }, 502)
      return json({ character, derived, rule_resolution: resolution, campaign_id: 'campaign-created', state: { character }, available_actions: actions })
    }
    if (path === '/v1/game/turn') {
      turns++
      if (failTurn && turns === 1) return json({ error: { message: 'upstream secret' } }, 502)
      return json({ campaign_id: 'campaign-created', narration: turns === 1 ? 'A aventura começou.' : 'O Mestre responde ao seu gesto.',
        narration_status: narrationStatus,
        rule_resolution: { schema_version: 'rule-resolution-v1', status: 'needs_rule_validation' },
        state: { character, scene: 'abertura' }, available_actions: actions,
        ...(ruleTeaching !== undefined ? { rule_teaching: ruleTeaching } : {}) })
    }
    throw new Error(`Rota inesperada: ${path}`)
  })
}

function continueWizard() { fireEvent.click(screen.getByRole('button', { name: 'Continuar' })) }

async function toAttributes() {
  await screen.findByRole('textbox', { name: 'Nome do personagem' })
  fireEvent.change(screen.getByRole('textbox', { name: 'Nome do personagem' }), { target: { value: 'Aria' } })
  continueWizard()
  fireEvent.click(screen.getByRole('radio', { name: 'Guerreiro' }))
  continueWizard()
  expect(screen.getByRole('heading', { name: 'Distribua seus atributos' })).toBeInTheDocument()
}

function assignScores() {
  for (const [label, score] of [['Força (STR)', '15'], ['Destreza', '14'], ['Constituição', '13'], ['Inteligência', '12'], ['Sabedoria', '10'], ['Carisma', '8']]) {
    fireEvent.change(screen.getByRole('combobox', { name: label }), { target: { value: score } })
  }
}

async function toEquipment() {
  await toAttributes()
  assignScores()
  continueWizard()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Atletismo' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Persuasão' }))
  continueWizard()
  expect(screen.getByRole('heading', { name: 'Equipamento inicial' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('radio', { name: 'Espada longa' }))
}

async function toSummary() {
  await toEquipment()
  continueWizard()
  await screen.findByRole('heading', { name: 'Sua ficha, pronta para começar' })
}

describe('criação guiada e sessão', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs() })

  it('inicia pelo wizard, carrega opções reais pelo Gateway e não mostra ficha/sessão fictícia', async () => {
    vi.stubEnv('VITE_GAME_API_URL', 'https://gateway.example.com')
    const fetchMock = mockGateway()
    render(<App />)
    expect(screen.getByRole('status', { name: '' }).textContent).toContain('Carregando')
    expect(await screen.findByRole('textbox', { name: 'Nome do personagem' })).toBeInTheDocument()
    expect(screen.getByText('Etapa 1 de 6')).toBeInTheDocument()
    expect(screen.getByText('Preparando personagem')).toBeInTheDocument()
    expect(screen.queryByText('Sessão ativa')).not.toBeInTheDocument()
    expect(screen.queryByText('Aventureiro sem nome')).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual(['/v1/character/options'])
  })

  it('distribui a Standard Array do catálogo sem reutilizar valores e seleciona a quantidade de perícias indicada pelo servidor', async () => {
    mockGateway()
    render(<App />)
    await toAttributes()
    expect(within(screen.getByRole('combobox', { name: 'Destreza' })).getByRole('option', { name: '15' })).not.toBeDisabled()
    fireEvent.change(screen.getByRole('combobox', { name: 'Força (STR)' }), { target: { value: '15' } })
    expect(within(screen.getByRole('combobox', { name: 'Destreza' })).getByRole('option', { name: '15' })).toBeDisabled()
    assignScores()
    expect(screen.getByText('6 de 6 atributos preenchidos.')).toBeInTheDocument()
    continueWizard()
    expect(screen.getByText('0 de 2 perícias escolhidas.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Atletismo' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Persuasão' }))
    expect(screen.getByText('2 de 2 perícias escolhidas.')).toBeInTheDocument()
    continueWizard()
    expect(screen.getByRole('radio', { name: 'Espada longa' })).toBeInTheDocument()
  })

  it('mostra o resumo exclusivamente com os valores derivados pelo Rule Engine após validar a seleção', async () => {
    const fetchMock = mockGateway()
    render(<App />)
    await toSummary()
    const summary = screen.getByLabelText('Resumo da ficha validada')
    expect(within(summary).getByText('11/11')).toBeInTheDocument()
    expect(within(summary).getByText('CA').parentElement).toHaveTextContent('12')
    expect(within(summary).getByText('1d8', { exact: false })).toBeInTheDocument()
    expect(within(summary).getByText('Guerreiro · Nível 1')).toBeInTheDocument()
    const validation = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/v1/character/validate'))
    expect(JSON.parse(validation?.[1]?.body as string)).toEqual({ name: 'Aria', class_id: 'fighter', level: 1, abilities,
      skills: ['athletics', 'persuasion'], weapon_id: 'longsword' })
  })

  it('cria o personagem, usa campanha/state/actions retornados e inicia o primeiro turno pelo fluxo existente', async () => {
    const fetchMock = mockGateway({ actions: [action] })
    render(<App />)
    await toSummary()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar personagem' }))
    expect(await screen.findByText('A aventura começou.')).toBeInTheDocument()
    expect(screen.getByText('Sessão ativa')).toBeInTheDocument()
    expect(screen.getByText('Aria')).toBeInTheDocument()
    expect(screen.getByText('Nível 1 · Guerreiro')).toBeInTheDocument()
    expect(screen.getByText('11/11')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument() // No invented XP.
    const firstTurn = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/v1/game/turn'))
    expect(JSON.parse(firstTurn?.[1]?.body as string)).toEqual({ campaign_id: 'campaign-created', state: { character },
      player_input: 'Começar a aventura.', action: null, available_actions: [action] })
    fireEvent.click(screen.getByRole('button', { name: 'Usar sugestão' }))
    await screen.findByText('O Mestre responde ao seu gesto.')
    const turns = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/v1/game/turn'))
    expect(JSON.parse(turns[1][1]?.body as string).action).toEqual(action)
    expect(JSON.parse(turns[1][1]?.body as string).available_actions).toEqual([action])
  })

  it('mostra a orientação mesmo quando a narrativa falha e mantém as ações do Backend como autoridade', async () => {
    mockGateway({
      actions: [action],
      narrationStatus: 'unavailable',
      ruleTeaching: {
        schema_version: 'rule-teaching-v1',
        tips: [{ id: 'check', title: 'Testes de habilidade', text: 'O resultado é resolvido pelo Mestre.' }],
      },
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
    expect(screen.getByRole('radio', { name: 'Espada longa' })).toBeChecked()
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
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/v1/character/create'))).toHaveLength(2)
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
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/v1/character/create'))).toHaveLength(1)
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/v1/game/turn'))).toHaveLength(2)
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
})
