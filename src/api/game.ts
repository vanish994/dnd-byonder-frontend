import type {
  CatalogItem, CharacterClassOption, CharacterCreation, CharacterDraft, CharacterOptions,
  CharacterValidation, DerivedCharacter, GameTurnRequest, GameTurnResponse, RuleResolution,
} from '../types/game'

const PUBLIC_GATEWAY_URL = 'https://dnd-byonder-gateway.onrender.com'

function getApiUrl() {
  return (import.meta.env.VITE_GAME_API_URL ?? PUBLIC_GATEWAY_URL).replace(/\/$/, '')
}

export class GameApiError extends Error {
  status?: number
  kind: 'network' | 'timeout' | 'http' | 'invalid'

  constructor(message: string, kind: GameApiError['kind'], status?: number) {
    super(message)
    this.name = 'GameApiError'
    this.kind = kind
    this.status = status
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function objects(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every(record)
}

function actions(value: unknown): Record<string, unknown>[] {
  if (!objects(value) || value.some((action) => typeof action.type !== 'string' || !action.type)) invalid('ações disponíveis')
  return value
}

function numbers(value: unknown): value is Record<string, number> {
  return record(value) && Object.values(value).every((item) => typeof item === 'number' && Number.isFinite(item))
}

function invalid(description: string): never {
  throw new GameApiError(`O servidor retornou ${description} inválidos. Tente novamente.`, 'invalid')
}

function item(value: unknown): CatalogItem {
  if (!record(value) || typeof value.id !== 'string' || !value.id ||
    typeof (value.name ?? value.label) !== 'string' || !(value.name ?? value.label)) invalid('opções')
  return {
    id: value.id as string,
    name: (value.name ?? value.label) as string,
    ...(typeof value.description === 'string' ? { description: value.description } : {}),
    ...(typeof value.abbreviation === 'string' ? { abbreviation: value.abbreviation } : {}),
  }
}

function items(value: unknown): CatalogItem[] {
  if (!Array.isArray(value)) invalid('opções')
  const result = value.map(item)
  if (!result.length || new Set(result.map((choice) => choice.id)).size !== result.length) invalid('opções')
  return result
}

function integers(value: unknown): number[] {
  if (!Array.isArray(value) || !value.length || !value.every((number) => Number.isInteger(number))) invalid('opções')
  return value
}

function parseOptions(value: unknown): CharacterOptions {
  if (!record(value) || typeof value.schema_version !== 'string' || !value.schema_version || !Array.isArray(value.classes)) invalid('opções de personagem')
  const skills = items(value.skills)
  const weapons = items(value.weapons)
  const levels = integers(value.levels)
  const classes: CharacterClassOption[] = value.classes.map((raw: unknown) => {
    const base = item(raw)
    if (!record(raw) || !record(raw.skill_choices) || !Number.isInteger(raw.skill_choices.count) ||
      (raw.skill_choices.count as number) < 0 || !Array.isArray(raw.skill_choices.options) ||
      (raw.skill_choices.count as number) > raw.skill_choices.options.length ||
      !raw.skill_choices.options.every((id: unknown) => typeof id === 'string' && skills.some((skill) => skill.id === id)) ||
      !Array.isArray(raw.levels) || !raw.levels.length || !raw.levels.every((level: unknown) => levels.includes(level as number)) ||
      !Array.isArray(raw.weapon_options) || !raw.weapon_options.length ||
      !raw.weapon_options.every((id: unknown) => typeof id === 'string' && weapons.some((weapon) => weapon.id === id)) ||
      new Set(raw.skill_choices.options).size !== raw.skill_choices.options.length) {
      invalid('opções de classe')
    }
    return {
      ...base,
      skill_choices: raw.skill_choices.count as number,
      skill_options: raw.skill_choices.options as string[],
      levels: raw.levels as number[],
      weapon_options: raw.weapon_options as string[],
    }
  })
  const abilities = items(value.abilities)
  const standardArray = integers(value.standard_array)
  if (!classes.length || new Set(classes.map((choice) => choice.id)).size !== classes.length ||
    standardArray.length !== abilities.length || new Set(levels).size !== levels.length) invalid('opções de personagem')
  return {
    schema_version: value.schema_version,
    classes,
    levels,
    standard_array: standardArray,
    abilities,
    skills,
    weapons,
  }
}

function parseDerived(value: unknown): DerivedCharacter {
  if (!record(value) || !numbers(value.ability_modifiers) || !numbers(value.saving_throw_modifiers) ||
    !numbers(value.skill_modifiers) || !Object.keys(value.ability_modifiers).length ||
    !Object.keys(value.saving_throw_modifiers).length || !Number.isFinite(value.proficiency_bonus) ||
    !record(value.hp) || !Number.isFinite(value.hp.current) || !Number.isFinite(value.hp.max) ||
    (value.hp.max as number) <= 0 || !record(value.ac) || !Number.isFinite(value.ac.value) ||
    !Number.isFinite(value.initiative_modifier) ||
    (value.weapons !== undefined && (!record(value.weapons) || !Object.values(value.weapons).every(record)))) {
    invalid('dados da ficha')
  }
  return value as unknown as DerivedCharacter
}

function parseResolution(value: unknown): RuleResolution {
  if (!record(value) || value.schema_version !== 'rule-resolution-v1' ||
    (value.status !== 'resolved' && value.status !== 'needs_rule_validation') ||
    (value.action !== undefined && !record(value.action)) ||
    (value.check !== undefined && !record(value.check)) ||
    (value.rolls !== undefined && !objects(value.rolls)) ||
    (value.outcome !== undefined && !record(value.outcome)) ||
    (value.rules_used !== undefined && (!Array.isArray(value.rules_used) || !value.rules_used.every((rule) => typeof rule === 'string')))) {
    invalid('uma resolução mecânica')
  }
  return value as unknown as RuleResolution
}

function parseValidation(value: unknown): CharacterValidation {
  if (!record(value) || value.valid !== true || !record(value.character) ||
    typeof value.character.name !== 'string' || !numbers(value.character.abilities)) invalid('a validação do personagem')
  return {
    valid: true,
    derived: parseDerived(value.derived),
    character: value.character,
  }
}

function parseCreation(value: unknown): CharacterCreation {
  if (!record(value) || !record(value.character) || typeof value.character.id !== 'string' ||
    typeof value.character.name !== 'string' || !record(value.state) ||
    !record(value.state.character) || typeof value.campaign_id !== 'string' || !value.campaign_id ||
    value.state.character.id !== value.character.id) {
    invalid('a criação do personagem')
  }
  const resolution = parseResolution(value.rule_resolution)
  if (resolution.status !== 'resolved') invalid('a criação do personagem')
  return {
    character: value.character,
    state: value.state,
    available_actions: actions(value.available_actions),
    derived: parseDerived(value.derived),
    campaign_id: value.campaign_id,
    rule_resolution: resolution,
  }
}

function parseTurn(value: unknown): GameTurnResponse {
  if (!record(value) || typeof value.campaign_id !== 'string' || !value.campaign_id ||
    typeof value.narration !== 'string' || !record(value.state) ||
    (value.narration_status !== undefined && value.narration_status !== 'available' && value.narration_status !== 'unavailable')) {
    invalid('um turno')
  }
  return { campaign_id: value.campaign_id, narration: value.narration, narration_status: value.narration_status ?? 'available',
    state: value.state,
    available_actions: actions(value.available_actions), rule_resolution: parseResolution(value.rule_resolution) }
}

async function request(path: string, payload?: unknown, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 30_000)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort, { once: true })

  try {
    const response = await fetch(`${getApiUrl()}${path}`, {
      method: payload === undefined ? 'GET' : 'POST',
      ...(payload === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
      signal: controller.signal,
    })

    if (!response.ok) {
      // Do not echo arbitrary upstream error bodies or secrets into the browser.
      const message = response.status === 400 || response.status === 422
        ? 'Confira as escolhas do personagem e tente novamente.'
        : response.status === 429 ? 'Muitas tentativas. Aguarde um momento e tente novamente.'
          : 'O serviço está indisponível agora. Tente novamente.'
      throw new GameApiError(message, 'http', response.status)
    }

    try {
      return await response.json() as unknown
    } catch {
      return invalid('uma resposta')
    }
  } catch (error) {
    if (error instanceof GameApiError) throw error
    if (controller.signal.aborted) {
      throw new GameApiError('A resposta demorou mais que o esperado.', 'timeout')
    }
    throw new GameApiError('Não foi possível conectar ao servidor.', 'network')
  } finally {
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', onAbort)
  }
}

export async function loadCharacterOptions(signal?: AbortSignal): Promise<CharacterOptions> {
  return parseOptions(await request('/v1/character/options', undefined, signal))
}

export async function validateCharacter(payload: CharacterDraft, signal?: AbortSignal): Promise<CharacterValidation> {
  return parseValidation(await request('/v1/character/validate', payload, signal))
}

export async function createCharacter(payload: CharacterDraft, signal?: AbortSignal): Promise<CharacterCreation> {
  return parseCreation(await request('/v1/character/create', payload, signal))
}

export async function sendGameTurn(payload: GameTurnRequest, signal?: AbortSignal): Promise<GameTurnResponse> {
  return parseTurn(await request('/v1/game/turn', payload, signal))
}
