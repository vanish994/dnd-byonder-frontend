import { useCallback, useMemo, useRef, useState } from 'react'
import { GameApiError, sendGameTurn } from '../api/game'
import type { CharacterCreation, DerivedCharacter, GameState, NarrativeEntry, RuleResolution, RuleTeaching, StructuredAction } from '../types/game'

const openingInput = 'Começar a aventura.'

export function useGameSession() {
  const [campaignId, setCampaignId] = useState('campaign_local')
  const [hasSession, setHasSession] = useState(false)
  const [state, setState] = useState<GameState>({})
  const [character, setCharacter] = useState<Record<string, unknown> | null>(null)
  const [classLabel, setClassLabel] = useState<string | null>(null)
  const [derived, setDerived] = useState<DerivedCharacter | null>(null)
  const [availableActions, setAvailableActions] = useState<StructuredAction[]>([])
  const [history, setHistory] = useState<NarrativeEntry[]>([])
  const [ruleResolution, setRuleResolution] = useState<RuleResolution | null>(null)
  const [ruleTeaching, setRuleTeaching] = useState<RuleTeaching | null>(null)
  const [narrationStatus, setNarrationStatus] = useState<'available' | 'unavailable'>('available')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<GameApiError | null>(null)
  const [failedTurn, setFailedTurn] = useState<{ text: string; action: StructuredAction | null; opening: boolean } | null>(null)
  const current = useRef({ campaignId: 'campaign_local', state: {} as GameState, actions: [] as StructuredAction[] })
  const busy = useRef(false)

  const runTurn = useCallback(async (playerInput: string, action: StructuredAction | null, opening = false, retry = false) => {
    const text = playerInput.trim()
    if (!text || busy.current) return false
    busy.current = true
    setError(null)
    setFailedTurn(null)
    setIsLoading(true)
    if (!opening && !retry) {
      const timestamp = Date.now()
      setHistory((entries) => [...entries, { id: `player-${timestamp}`, speaker: 'voce', text, timestamp }])
    }
    try {
      const response = await sendGameTurn({
        campaign_id: current.current.campaignId,
        state: current.current.state,
        player_input: text,
        action,
        available_actions: current.current.actions,
      })
      current.current = { campaignId: response.campaign_id, state: response.state, actions: response.available_actions }
      setCampaignId(response.campaign_id)
      setState(response.state)
      setAvailableActions(response.available_actions)
      setRuleResolution(response.rule_resolution)
      setRuleTeaching(response.rule_teaching)
      setNarrationStatus(response.narration_status)
      setHistory((entries) => [...entries, { id: `master-${Date.now()}`, speaker: 'mestre', text: response.narration, timestamp: Date.now() }])
      return true
    } catch (requestError) {
      setError(requestError instanceof GameApiError ? requestError : new GameApiError('Erro inesperado.', 'network'))
      setFailedTurn({ text, action, opening })
      return false
    } finally {
      busy.current = false
      setIsLoading(false)
    }
  }, [])

  const startSession = useCallback(async (created: CharacterCreation, label: string) => {
    const id = created.campaign_id || 'campaign_local'
    current.current = { campaignId: id, state: created.state, actions: created.available_actions }
    setCampaignId(id)
    setState(created.state)
    setCharacter(created.character)
    setClassLabel(label)
    setDerived(created.derived ?? null)
    setAvailableActions(created.available_actions)
    setRuleResolution(created.rule_resolution)
    setRuleTeaching(null)
    setHistory([])
    setHasSession(true)
    return runTurn(openingInput, null, true)
  }, [runTurn])

  const sendAction = useCallback((playerInput: string, action: StructuredAction | null = null) => {
    if (!hasSession) return Promise.resolve(false)
    return runTurn(playerInput, action)
  }, [hasSession, runTurn])

  const retryTurn = useCallback(() => failedTurn
    ? runTurn(failedTurn.text, failedTurn.action, failedTurn.opening, true)
    : Promise.resolve(false), [failedTurn, runTurn])

  return useMemo(() => ({
    campaignId, hasSession, state, character, classLabel, derived, availableActions, history, ruleResolution, ruleTeaching, narrationStatus,
    isLoading, error, failedTurn, startSession, sendAction, retryTurn,
  }), [campaignId, hasSession, state, character, classLabel, derived, availableActions, history, ruleResolution, ruleTeaching, narrationStatus,
    isLoading, error, failedTurn, startSession, sendAction, retryTurn])
}
