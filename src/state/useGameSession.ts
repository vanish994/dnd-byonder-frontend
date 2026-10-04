import { useCallback, useMemo, useState } from 'react'
import { GameApiError, sendGameTurn } from '../api/game'
import type { GameState, NarrativeEntry, RuleResolution, StructuredAction } from '../types/game'

const initialNarrative = 'A noite se fecha sobre a estrada. Ao longe, uma luz solitária pulsa entre as árvores.'

export function useGameSession() {
  const [campaignId] = useState('campaign_local')
  const [state, setState] = useState<GameState>({})
  const [history, setHistory] = useState<NarrativeEntry[]>([
    { id: 'opening', speaker: 'mestre', text: initialNarrative, timestamp: 0 },
  ])
  const [ruleResolution, setRuleResolution] = useState<RuleResolution | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<GameApiError | null>(null)

  const sendAction = useCallback(async (playerInput: string, action: StructuredAction | null = null) => {
    const text = playerInput.trim()
    if (!text || isLoading) return false
    setError(null)
    setIsLoading(true)
    const timestamp = Date.now()
    setHistory((current) => [...current, { id: `player-${timestamp}`, speaker: 'voce', text, timestamp }])
    try {
      const response = await sendGameTurn({
        campaign_id: campaignId,
        state,
        player_input: text,
        action,
        available_actions: [],
      })
      setState(response.state)
      setRuleResolution(response.rule_resolution)
      setHistory((current) => [...current, { id: `master-${Date.now()}`, speaker: 'mestre', text: response.narration, timestamp: Date.now() }])
      return true
    } catch (requestError) {
      setError(requestError instanceof GameApiError ? requestError : new GameApiError('Erro inesperado.', 'network'))
      return false
    } finally {
      setIsLoading(false)
    }
  }, [campaignId, isLoading, state])

  return useMemo(() => ({ campaignId, state, history, ruleResolution, isLoading, error, sendAction }), [campaignId, error, history, isLoading, ruleResolution, sendAction, state])
}
