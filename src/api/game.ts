import type { GameTurnRequest, GameTurnResponse } from '../types/game'

function getApiUrl() {
  return (import.meta.env.VITE_GAME_API_URL ?? '').replace(/\/$/, '')
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

export async function sendGameTurn(
  payload: GameTurnRequest,
  signal?: AbortSignal,
): Promise<GameTurnResponse> {
  const apiUrl = getApiUrl()
  if (!apiUrl) {
    throw new GameApiError('O endereço do backend não está configurado.', 'network')
  }

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 30_000)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort, { once: true })

  try {
    const response = await fetch(`${apiUrl}/v1/game/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      let detail = 'Não foi possível completar o turno.'
      try {
        const body = await response.json()
        if (typeof body?.detail === 'string') detail = body.detail
        if (typeof body?.detail?.message === 'string') detail = body.detail.message
      } catch {
        // Keep the safe generic message when the backend returns no JSON.
      }
      throw new GameApiError(detail, 'http', response.status)
    }

    const body = (await response.json()) as GameTurnResponse
    if (!body || typeof body.narration !== 'string' || !body.rule_resolution) {
      throw new GameApiError('O backend retornou um turno inválido.', 'invalid')
    }
    return body
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
