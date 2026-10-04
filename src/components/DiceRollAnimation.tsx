import type { ReactNode } from 'react'

interface DiceRollAnimationProps {
  ariaLabel: string
  children: ReactNode
}

export function DiceRollAnimation({ ariaLabel, children }: DiceRollAnimationProps) {
  return <div className="die-result" aria-label={ariaLabel}>{children}</div>
}
