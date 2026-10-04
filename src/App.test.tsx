import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const fetchMock = () => vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
  campaign_id: 'campaign_local',
  narration: 'A porta range e revela uma luz quente.',
  rule_resolution: { schema_version: 'rule-resolution-v1', status: 'needs_rule_validation', reason: 'not bound' },
  state: { scene: 'porta' },
  available_actions: [],
}), { status: 200, headers: { 'Content-Type': 'application/json' } }))

describe('App', () => {
  afterEach(() => vi.restoreAllMocks())

  it('apresenta a crônica e envia player_input como texto livre', async () => {
    vi.stubEnv('VITE_GAME_API_URL', 'https://backend.example.com')
    const requestSpy = fetchMock()
    render(<App />)
    expect(screen.getByText(/A aventura começa/i)).toBeInTheDocument()
    const input = screen.getByPlaceholderText(/Descreva sua próxima ação/i)
    fireEvent.change(input, { target: { value: 'Entro na taverna.' } })
    fireEvent.click(screen.getByRole('button', { name: /Enviar/i }))
    expect(screen.getByText(/Mestre está pensando/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/A porta range/i)).toBeInTheDocument())
    const body = JSON.parse(requestSpy.mock.calls[0][1]?.body as string)
    expect(body.player_input).toBe('Entro na taverna.')
    expect(body.action).toBeNull()
  })
})
