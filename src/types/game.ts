export type GameState = Record<string, unknown>

export interface AbilityCheckAction {
  type: 'ability_check'
  ability: string
  dc: number
  modifier: number
}

export type StructuredAction = AbilityCheckAction | Record<string, unknown>

export interface GameTurnRequest {
  campaign_id: string
  state: GameState
  player_input: string
  action: StructuredAction | null
  available_actions: Array<Record<string, unknown>>
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
  available_actions: Array<Record<string, unknown>>
}

export interface NarrativeEntry {
  id: string
  speaker: 'mestre' | 'voce'
  text: string
  timestamp: number
}
