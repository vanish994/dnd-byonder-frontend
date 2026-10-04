export type GameState = Record<string, unknown>

export type StructuredAction = Record<string, unknown>

export interface CatalogItem {
  id: string
  name: string
  description?: string
  abbreviation?: string
}

export interface CharacterClassOption extends CatalogItem {
  skill_choices: number
  skill_options: string[]
  levels: number[]
  weapon_options: string[]
}

export interface CharacterOptions {
  schema_version: string
  classes: CharacterClassOption[]
  levels: number[]
  standard_array: number[]
  abilities: CatalogItem[]
  skills: CatalogItem[]
  weapons: CatalogItem[]
}

export interface CharacterDraft {
  name: string
  class_id: string
  level: number
  abilities: Record<string, number>
  skills: string[]
  weapon_id: string
}

export interface DerivedCharacter {
  ability_modifiers: Record<string, number>
  saving_throw_modifiers: Record<string, number>
  skill_modifiers: Record<string, number>
  proficiency_bonus: number
  hp: { current: number; max: number }
  ac: { value: number; source?: string }
  initiative_modifier: number
  weapons?: Record<string, Record<string, unknown>>
  [key: string]: unknown
}

export interface CharacterValidation {
  valid: true
  derived: DerivedCharacter
  character: Record<string, unknown>
}

export interface CharacterCreation {
  character: Record<string, unknown>
  derived?: DerivedCharacter
  state: GameState
  available_actions: StructuredAction[]
  campaign_id: string
  rule_resolution: RuleResolution
}

export interface GameTurnRequest {
  campaign_id: string
  state: GameState
  player_input: string
  action: StructuredAction | null
  available_actions: StructuredAction[]
}

export interface RuleResolution {
  schema_version: 'rule-resolution-v1'
  status: 'resolved' | 'needs_rule_validation'
  resolution_id?: string
  action?: Record<string, unknown>
  check?: {
    ability?: string
    dc?: number
    modifier?: number
  }
  rolls?: Array<Record<string, unknown>>
  outcome?: {
    total?: number
    success?: boolean
  }
  rules_used?: string[]
  reason?: string
  [key: string]: unknown
}

export interface GameTurnResponse {
  campaign_id: string
  narration: string
  rule_resolution: RuleResolution
  state: GameState
  available_actions: StructuredAction[]
}

export interface NarrativeEntry {
  id: string
  speaker: 'mestre' | 'voce'
  text: string
  timestamp: number
}
