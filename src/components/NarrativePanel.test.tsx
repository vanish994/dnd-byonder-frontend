import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NarrativePanel } from './NarrativePanel'

const state = {
  scene: { title: 'A clareira', description: 'Uma trilha se abre entre as árvores.' },
} as never

describe('NarrativePanel', () => {
  it('mantém o histórico em uma área identificável de leitura interna e preserva parágrafos', () => {
    render(<NarrativePanel
      history={[
        { id: 'mestre-1', speaker: 'mestre', text: 'A névoa cobre a clareira.\nVocê ouve passos.', timestamp: 1 },
        { id: 'voce-1', speaker: 'voce', text: 'Eu observo a trilha.', timestamp: 2 },
      ]}
      state={state}
    />)

    const history = screen.getByLabelText('Histórico da narrativa')
    expect(history).toHaveClass('narrative-history')
    expect(history).toHaveAttribute('tabindex', '0')
    expect(screen.getByText(/A névoa cobre a clareira/)).toBeInTheDocument()
    expect(screen.getByText('Eu observo a trilha.')).toBeInTheDocument()
  })

  it('continua mostrando a orientação mecânica quando a narração está indisponível', () => {
    render(<NarrativePanel history={[]} state={state} narrationStatus="unavailable" />)

    expect(screen.getByText('A mecânica foi resolvida; a narração está temporariamente indisponível.')).toBeInTheDocument()
  })
})
