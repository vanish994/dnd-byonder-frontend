import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RuleTeachingPanel } from './RuleTeachingPanel'

describe('RuleTeachingPanel', () => {
  it('renderiza tips separadas da narrativa com orientação compreensível', () => {
    render(<RuleTeachingPanel teaching={{
      schema_version: 'rule-teaching-v1',
      tips: [
        { id: 'first', title: 'O que acontece agora?', text: 'Você pode escolher uma ação disponível ou escrever uma intenção.' },
        { id: 'second', text: 'O Mestre resolve as regras.' },
      ],
    }} />)

    expect(screen.getByRole('heading', { name: 'Orientação para este turno' })).toBeInTheDocument()
    expect(screen.getByText('O que acontece agora?')).toBeInTheDocument()
    expect(screen.getByText('Você pode escolher uma ação disponível ou escrever uma intenção.')).toBeInTheDocument()
    expect(screen.getByText('O Mestre resolve as regras.')).toBeInTheDocument()
  })

  it.each([
    ['ausente', null],
    ['vazio', { schema_version: 'rule-teaching-v1' as const, tips: [] }],
  ])('não renderiza painel quando rule_teaching está %s', (_label, teaching) => {
    render(<RuleTeachingPanel teaching={teaching} />)
    expect(screen.queryByRole('heading', { name: 'Orientação para este turno' })).not.toBeInTheDocument()
  })
})
