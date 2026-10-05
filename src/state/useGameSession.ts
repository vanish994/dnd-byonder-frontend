import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createIdempotencyKey,
  GameApiError,
  loadGameSession,
  persistGameSession,
  readStoredGameSession,
  sendGameTurn,
} from '../api/game'
import type {
  DerivedCharacter,
  GameState,
  NarrativeEntry,
  PersistedCharacterCreation,
  RuleResolution,
  RuleTeaching,
  StructuredAction,
} from '../types/game'

const openingInput = 'Começar a aventura.'

type PendingTurn = {
  text: string
  action: StructuredAction | null
  opening: boolean
  idempotencyKey: string
}

type CurrentSession = {
  campaignId: string
  sessionId: string
  sessionToken: string
  revision: number
  classLabel: string | null
  state: GameState
  actions: StructuredAction[]
}

function apiError(error: unknown) {
  return error instanceof GameApiError ? error : new GameApiError('Erro inesperado.', 'network')
}

export function useGameSession() {
  const [storedAtMount] = useState(readStoredGameSession)
  const [campaignId, setCampaignId] = useState(storedAtMount?.campaign_id ?? 'campaign_local')
  const [sessionId, setSessionId] = useState(storedAtMount?.session_id ?? '')
  const [hasSession, setHasSession] = useState(Boolean(storedAtMount))
  const [sessionReady, setSessionReady] = useState(false)
  const [isRestoring, setIsRestoring] = useState(Boolean(storedAtMount))
  const [state, setState] = useState<GameState>({})
  const [character, setCharacter] = useState<Record<string, unknown> | null>(null)
  const [classLabel, setClassLabel] = useState<string | null>(storedAtMount?.class_label ?? null)
  const [derived, setDerived] = useState<DerivedCharacter | null>(null)
  const [availableActions, setAvailableActions] = useState<StructuredAction[]>([])
  const [history, setHistory] = useState<NarrativeEntry[]>([])
  const [ruleResolution, setRuleResolution] = useState<RuleResolution | null>(null)
  const [ruleTeaching, setRuleTeaching] = useState<RuleTeaching | null>(null)
  const [narrationStatus, setNarrationStatus] = useState<'available' | 'unavailable'>('available')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<GameApiError | null>(null)
  const [failedTurn, setFailedTurn] = useState<PendingTurn | null>(null)
  const current = useRef<CurrentSession>({
    campaignId: storedAtMount?.campaign_id ?? 'campaign_local',
    sessionId: storedAtMount?.session_id ?? '',
    sessionToken: storedAtMount?.session_token ?? '',
    revision: storedAtMount?.revision ?? 0,
    classLabel: storedAtMount?.class_label ?? null,
    state: {},
    actions: [],
  })
  const busy = useRef(false)
  const ready = useRef(false)

  const restoreStoredSession = useCallback(async (stored: NonNullable<typeof storedAtMount>) => {
    try {
      const resumed = await loadGameSession(stored.session_id, stored.session_token)
      const next: CurrentSession = {
        campaignId: resumed.campaign_id,
        sessionId: resumed.session_id,
        sessionToken: stored.session_token,
        revision: resumed.revision,
        classLabel: stored.class_label || String((resumed.character.class as { id?: unknown } | undefined)?.id ?? ''),
        state: resumed.state,
        actions: resumed.available_actions,
      }
      current.current = next
      persistGameSession({
        campaign_id: next.campaignId,
        session_id: next.sessionId,
        session_token: next.sessionToken,
        revision: next.revision,
        class_label: next.classLabel ?? '',
      })
      setCampaignId(next.campaignId)
      setSessionId(next.sessionId)
      setState(resumed.state)
      setCharacter(resumed.character)
      setClassLabel(next.classLabel)
      setDerived(resumed.derived)
      setAvailableActions(resumed.available_actions)
      setHistory(resumed.history)
      setRuleResolution(null)
      setRuleTeaching(null)
      setNarrationStatus('available')
      setHasSession(true)
      ready.current = true
      setSessionReady(true)
      setFailedTurn(null)
      return true
    } catch (requestError) {
      setError(apiError(requestError))
      setHasSession(true)
      ready.current = false
      setSessionReady(false)
      return false
    } finally {
      setIsRestoring(false)
    }
  }, [])

  const retryResume = useCallback(async () => {
    const stored = storedAtMount ?? readStoredGameSession()
    if (!stored) return false
    setError(null)
    setIsRestoring(true)
    ready.current = false
    setSessionReady(false)
    return restoreStoredSession(stored)
  }, [storedAtMount, restoreStoredSession])

  useEffect(() => {
    if (!storedAtMount) return
    const timer = window.setTimeout(() => { void restoreStoredSession(storedAtMount) }, 0)
    return () => window.clearTimeout(timer)
  }, [storedAtMount, restoreStoredSession])

  const runTurn = useCallback(async (
    playerInput: string,
    action: StructuredAction | null,
    opening = false,
    retry = false,
    retryKey?: string,
  ) => {
    const text = playerInput.trim()
    if (!text || busy.current || !ready.current || !current.current.sessionId || !current.current.sessionToken) return false
    const idempotencyKey = retryKey ?? createIdempotencyKey('turn')
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
        session_id: current.current.sessionId,
        expected_revision: current.current.revision,
        player_input: text,
        action,
      }, current.current.sessionToken, idempotencyKey)
      const next: CurrentSession = {
        ...current.current,
        campaignId: response.campaign_id,
        sessionId: response.session_id,
        revision: response.revision,
        state: response.state,
        actions: response.available_actions,
      }
      current.current = next
      persistGameSession({
        campaign_id: next.campaignId,
        session_id: next.sessionId,
        session_token: next.sessionToken,
        revision: next.revision,
        class_label: next.classLabel ?? '',
      })
      setCampaignId(response.campaign_id)
      setSessionId(response.session_id)
      setState(response.state)
      setAvailableActions(response.available_actions)
      setRuleResolution(response.rule_resolution)
      setRuleTeaching(response.rule_teaching)
      setNarrationStatus(response.narration_status)
      setHistory((entries) => [...entries, { id: `master-${Date.now()}`, speaker: 'mestre', text: response.narration, timestamp: Date.now() }])
      return true
    } catch (requestError) {
      setError(apiError(requestError))
      setFailedTurn({ text, action, opening, idempotencyKey })
      if (requestError instanceof GameApiError && requestError.status === 409) {
        ready.current = false
        setSessionReady(false)
      }
      return false
    } finally {
      busy.current = false
      setIsLoading(false)
    }
  }, [])

  const startSession = useCallback(async (created: PersistedCharacterCreation, label: string) => {
    const next: CurrentSession = {
      campaignId: created.campaign_id,
      sessionId: created.session_id,
      sessionToken: created.session_token,
      revision: created.revision,
      classLabel: label,
      state: created.state,
      actions: created.available_actions,
    }
    current.current = next
    ready.current = true
    persistGameSession({
      campaign_id: next.campaignId,
      session_id: next.sessionId,
      session_token: next.sessionToken,
      revision: next.revision,
      class_label: label,
    })
    setCampaignId(next.campaignId)
    setSessionId(next.sessionId)
    setState(created.state)
    setCharacter(created.character)
    setClassLabel(label)
    setDerived(created.derived ?? null)
    setAvailableActions(created.available_actions)
    setRuleResolution(created.rule_resolution)
    setRuleTeaching(null)
    setNarrationStatus('available')
    setHistory([])
    setHasSession(true)
    setSessionReady(true)
    setError(null)
    return runTurn(openingInput, null, true)
  }, [runTurn])

  const sendAction = useCallback((playerInput: string, action: StructuredAction | null = null) => {
    if (!hasSession || !ready.current) return Promise.resolve(false)
    return runTurn(playerInput, action)
  }, [hasSession, runTurn])

  const retryTurn = useCallback(() => failedTurn
    ? runTurn(failedTurn.text, failedTurn.action, failedTurn.opening, true, failedTurn.idempotencyKey)
    : Promise.resolve(false), [failedTurn, runTurn])

  return useMemo(() => ({
    campaignId, sessionId, hasSession, sessionReady, isRestoring, state, character, classLabel, derived,
    availableActions, history, ruleResolution, ruleTeaching, narrationStatus,
    isLoading, error, failedTurn, startSession, sendAction, retryTurn, retryResume,
  }), [campaignId, sessionId, hasSession, sessionReady, isRestoring, state, character, classLabel, derived,
    availableActions, history, ruleResolution, ruleTeaching, narrationStatus,
    isLoading, error, failedTurn, startSession, sendAction, retryTurn, retryResume])
}
