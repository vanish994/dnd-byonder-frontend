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

export interface PHB2024EquipmentPackage {
  id: string
  items: Array<{ name: string; quantity: number }>
  gold_gp: number
  source_details?: unknown
}

export interface PHB2024ClassOption extends CatalogItem {
  source_name: string
  levels: number[]
  hit_die: number
  primary_abilities: string[]
  skill_choices: { count: number; options: string[] }
  saving_throw_proficiencies: string[]
  weapon_proficiencies: string[]
  armor_proficiencies: string[]
  level_1_features: Array<{ id: string; name: string; summary?: string }>
  equipment_packages: PHB2024EquipmentPackage[]
}

export interface PHB2024SpeciesOption extends CatalogItem {
  source_name: string
  choices: Record<string, string[]>
}

export interface PHB2024BackgroundOption extends CatalogItem {
  source_name: string
  eligible_abilities: string[]
  skill_proficiencies: string[]
  origin_feat: string
  origin_feat_id: string
  origin_feat_label_pt_br: string
  equipment_packages: PHB2024EquipmentPackage[]
}

export interface PHB2024CharacterOptions {
  schema_version: string
  ruleset: string
  edition: 2024
  supported_character_level: 1
  classes: PHB2024ClassOption[]
  species: PHB2024SpeciesOption[]
  backgrounds: PHB2024BackgroundOption[]
  alignment_options: CatalogItem[]
  ability_score_methods: {
    standard_array: { id: string; label: string; values: number[] }
    point_buy: { id: string; label: string; budget: number; minimum: number; maximum: number; costs: Record<string, number> }
    rolled: { id: string; label: string; dice: string; drop_lowest: number; number_of_scores: number }
    background_increases: { patterns: number[][]; eligible_source: string }
  }
  recommended_standard_array: Record<string, Record<string, number>>
  abilities: string[]
  skills: string[]
  language_rules: {
    required: string[]
    additional_choice_count: number
    additional_options: CatalogItem[]
    selection_source: string
  }
}

export interface PHB2024CharacterDraft {
  name: string
  class_id: string
  level: 1
  species_id: string
  species_choices: Record<string, string>
  background_id: string
  alignment_id: string
  ability_method_id: 'standard_array' | 'point_buy' | 'rolled'
  base_abilities: Record<string, number>
  background_ability_increases: Record<string, number>
  abilities: Record<string, number>
  skills: string[]
  language_choices: string[]
  class_equipment_option: string
  background_equipment_option: string
  class_choices: Record<string, string>
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
    current_actor_id?: string
    round?: number
    turn_index?: number
    turn_order?: unknown
    [key: string]: unknown
  }
  rules_used?: string[]
  reason?: string
  [key: string]: unknown
}

export interface RuleTeachingTip {
  id?: string
  title?: string
  text: string
}

export interface RuleTeaching {
  schema_version: 'rule-teaching-v1'
  tips: RuleTeachingTip[]
}

export interface GameTurnResponse {
  campaign_id: string
  narration: string
  narration_status: 'available' | 'unavailable'
  rule_resolution: RuleResolution
  state: GameState
  available_actions: StructuredAction[]
  rule_teaching: RuleTeaching | null
}

export interface NarrativeEntry {
  id: string
  speaker: 'mestre' | 'voce'
  text: string
  timestamp: number
}
