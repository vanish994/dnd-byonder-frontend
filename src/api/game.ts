import type {
  CatalogItem, CharacterClassOption, CharacterCreation, CharacterDraft, CharacterOptions,
  CharacterValidation, DerivedCharacter, GameTurnRequest, GameTurnResponse, RuleResolution, RuleTeaching, RuleTeachingTip,
  PHB2024BackgroundOption, PHB2024CharacterDraft, PHB2024CharacterOptions, PHB2024ClassOption,
  PHB2024EquipmentPackage, PHB2024SpeciesOption,
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

function stringArray(value: unknown, description: string): string[] {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) invalid(description)
  return value as string[]
}

function parseEquipmentPackages(value: unknown): PHB2024EquipmentPackage[] {
  if (!Array.isArray(value)) invalid('pacotes de equipamento 2024')
  return value.map((raw) => {
    if (!record(raw) || typeof raw.id !== 'string' || !raw.id || !Array.isArray(raw.items) ||
      !raw.items.every((entry) => record(entry) && typeof entry.name === 'string' && Number.isInteger(entry.quantity)) ||
      !Number.isInteger(raw.gold_gp)) invalid('pacotes de equipamento 2024')
    return {
      id: raw.id as string,
      items: raw.items as Array<{ name: string; quantity: number }>,
      gold_gp: raw.gold_gp as number,
      ...(raw.source_details !== undefined ? { source_details: raw.source_details } : {}),
    }
  })
}

function parsePHB2024Options(value: unknown): PHB2024CharacterOptions {
  if (!record(value) || value.edition !== 2024 || typeof value.schema_version !== 'string' ||
    !Array.isArray(value.classes) || !Array.isArray(value.species) || !Array.isArray(value.backgrounds) ||
    !record(value.ability_score_methods) || !record(value.ability_score_methods.standard_array) ||
    !record(value.ability_score_methods.point_buy) || !record(value.ability_score_methods.rolled) ||
    !record(value.ability_score_methods.background_increases) || !record(value.language_rules)) invalid('catálogo PHB 2024')

  const classes: PHB2024ClassOption[] = value.classes.map((raw: unknown) => {
    if (!record(raw) || !record(raw.skill_choices) || !Number.isInteger(raw.skill_choices.count) ||
      !Array.isArray(raw.levels) || !Array.isArray(raw.level_1_features) ||
      !Array.isArray(raw.equipment_packages)) invalid('opções de classe PHB 2024')
    const base = item(raw)
    const featureEntries = raw.level_1_features.filter(record).map((feature) => ({
      id: typeof feature.id === 'string' ? feature.id : '',
      name: typeof feature.name === 'string' ? feature.name : '',
      ...(typeof feature.summary === 'string' ? { summary: feature.summary } : {}),
    })).filter((feature) => feature.id && feature.name)
    if (!featureEntries.length) invalid('características de classe PHB 2024')
    return {
      ...base,
      source_name: typeof raw.source_name === 'string' ? raw.source_name : base.name,
      levels: integers(raw.levels),
      hit_die: Number.isInteger(raw.hit_die) ? raw.hit_die as number : invalid('dado de vida PHB 2024'),
      primary_abilities: stringArray(raw.primary_abilities, 'atributos primários PHB 2024'),
      skill_choices: {
        count: raw.skill_choices.count as number,
        options: stringArray(raw.skill_choices.options, 'perícias PHB 2024'),
      },
      saving_throw_proficiencies: stringArray(raw.saving_throw_proficiencies, 'salvaguardas PHB 2024'),
      weapon_proficiencies: stringArray(raw.weapon_proficiencies, 'armas PHB 2024'),
      armor_proficiencies: stringArray(raw.armor_proficiencies, 'armaduras PHB 2024'),
      level_1_features: featureEntries,
      equipment_packages: parseEquipmentPackages(raw.equipment_packages),
    }
  })

  const species: PHB2024SpeciesOption[] = value.species.map((raw: unknown) => {
    if (!record(raw) || !record(raw.choices)) invalid('opções de espécie PHB 2024')
    const choices: Record<string, string[]> = {}
    for (const [key, options] of Object.entries(raw.choices)) choices[key] = stringArray(options, 'escolhas de espécie PHB 2024')
    const base = item(raw)
    return {
      ...base,
      source_name: typeof raw.source_name === 'string' ? raw.source_name : base.name,
      choices,
    }
  })

  const backgrounds: PHB2024BackgroundOption[] = value.backgrounds.map((raw: unknown) => {
    if (!record(raw) || typeof raw.origin_feat !== 'string' || typeof raw.origin_feat_id !== 'string' ||
      typeof raw.origin_feat_label_pt_br !== 'string') invalid('opções de origem PHB 2024')
    const base = item(raw)
    return {
      ...base,
      source_name: typeof raw.source_name === 'string' ? raw.source_name : base.name,
      eligible_abilities: stringArray(raw.eligible_abilities, 'atributos de origem PHB 2024'),
      skill_proficiencies: stringArray(raw.skill_proficiencies, 'perícias de origem PHB 2024'),
      origin_feat: raw.origin_feat,
      origin_feat_id: raw.origin_feat_id,
      origin_feat_label_pt_br: raw.origin_feat_label_pt_br,
      equipment_packages: parseEquipmentPackages(raw.equipment_packages),
    }
  })

  const methods = value.ability_score_methods as Record<string, unknown>
  const standardArray = methods.standard_array as Record<string, unknown>
  const pointBuy = methods.point_buy as Record<string, unknown>
  const rolled = methods.rolled as Record<string, unknown>
  const backgroundIncreases = methods.background_increases as Record<string, unknown>
  const languageRules = value.language_rules as Record<string, unknown>
  if (!Array.isArray(standardArray.values) || !record(pointBuy.costs) || !Array.isArray(backgroundIncreases.patterns) ||
    !Array.isArray(languageRules.additional_options) || !Array.isArray(languageRules.required)) invalid('regras de atributos/idiomas PHB 2024')
  const languageOptions = items(languageRules.additional_options)
  const abilities = stringArray(value.abilities, 'atributos PHB 2024')
  const skills = stringArray(value.skills, 'perícias PHB 2024')
  if (classes.length !== 12 || species.length !== 10 || backgrounds.length !== 16 ||
    new Set(classes.map((entry) => entry.id)).size !== 12 || new Set(species.map((entry) => entry.id)).size !== 10 ||
    new Set(backgrounds.map((entry) => entry.id)).size !== 16 || abilities.length !== 6 ||
    !Array.isArray(value.recommended_standard_array) && !record(value.recommended_standard_array)) invalid('roster PHB 2024')

  return {
    schema_version: value.schema_version,
    ruleset: typeof value.ruleset === 'string' ? value.ruleset : 'dnd-2024-phb',
    edition: 2024,
    supported_character_level: 1,
    classes,
    species,
    backgrounds,
    alignment_options: items(value.alignment_options),
    ability_score_methods: {
      standard_array: { id: String(standardArray.id), label: String(standardArray.label), values: standardArray.values as number[] },
      point_buy: {
        id: String(pointBuy.id), label: String(pointBuy.label), budget: Number(pointBuy.budget),
        minimum: Number(pointBuy.minimum), maximum: Number(pointBuy.maximum),
        costs: pointBuy.costs as Record<string, number>,
      },
      rolled: {
        id: String(rolled.id), label: String(rolled.label), dice: String(rolled.dice),
        drop_lowest: Number(rolled.drop_lowest), number_of_scores: Number(rolled.number_of_scores),
      },
      background_increases: {
        patterns: backgroundIncreases.patterns as number[][],
        eligible_source: String(backgroundIncreases.eligible_source),
      },
    },
    recommended_standard_array: record(value.recommended_standard_array) ? value.recommended_standard_array as Record<string, Record<string, number>> : {},
    abilities,
    skills,
    language_rules: {
      required: stringArray(languageRules.required, 'idiomas obrigatórios PHB 2024'),
      additional_choice_count: Number(languageRules.additional_choice_count),
      additional_options: languageOptions,
      selection_source: typeof languageRules.selection_source === 'string' ? languageRules.selection_source : '',
    },
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

function parseRuleTeaching(value: unknown): RuleTeaching | null {
  if (value === undefined || value === null) return null
  if (!record(value)) invalid('orientações de jogo')
  if (!Object.keys(value).length) return null
  if (value.schema_version !== 'rule-teaching-v1' || !Array.isArray(value.tips)) invalid('orientações de jogo')

  const tips = value.tips.flatMap((raw: unknown): RuleTeachingTip[] => {
    if (typeof raw === 'string') return raw.trim() ? [{ text: raw.trim() }] : []
    if (!record(raw)) return []
    const text = ['text', 'body', 'description', 'content', 'message']
      .map((key) => raw[key])
      .find((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    if (!text) return []
    return [{
      ...(typeof raw.id === 'string' && raw.id ? { id: raw.id } : {}),
      ...(typeof raw.title === 'string' && raw.title ? { title: raw.title } : {}),
      text: text.trim(),
    }]
  })
  return tips.length ? { schema_version: 'rule-teaching-v1', tips } : null
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
    available_actions: actions(value.available_actions), rule_resolution: parseResolution(value.rule_resolution),
    rule_teaching: parseRuleTeaching(value.rule_teaching) }
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
      const message = response.status === 422 && path === '/v1/game/turn'
        ? 'Essa ação não pôde ser resolvida. Escolha uma sugestão do Mestre ou tente outra ação.'
        : response.status === 400 || response.status === 422
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

export async function loadPHB2024CharacterOptions(signal?: AbortSignal): Promise<PHB2024CharacterOptions> {
  return parsePHB2024Options(await request('/v2/character/options', undefined, signal))
}

export async function validateCharacter(payload: CharacterDraft, signal?: AbortSignal): Promise<CharacterValidation> {
  return parseValidation(await request('/v1/character/validate', payload, signal))
}

export async function validatePHB2024Character(payload: PHB2024CharacterDraft, signal?: AbortSignal): Promise<CharacterValidation> {
  return parseValidation(await request('/v2/character/validate', payload, signal))
}

export async function createCharacter(payload: CharacterDraft, signal?: AbortSignal): Promise<CharacterCreation> {
  return parseCreation(await request('/v1/character/create', payload, signal))
}

export async function createPHB2024Character(payload: PHB2024CharacterDraft, signal?: AbortSignal): Promise<CharacterCreation> {
  return parseCreation(await request('/v2/character/create', payload, signal))
}

export async function sendGameTurn(payload: GameTurnRequest, signal?: AbortSignal): Promise<GameTurnResponse> {
  return parseTurn(await request('/v1/game/turn', payload, signal))
}
