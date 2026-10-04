import { useState } from 'react'
import type { FormEvent } from 'react'

interface ActionInputProps {
  isLoading: boolean
  onSubmit: (value: string) => Promise<boolean>
}

export function ActionInput({ isLoading, onSubmit }: ActionInputProps) {
  const [value, setValue] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!value.trim() || isLoading) return
    const sent = await onSubmit(value)
    if (sent) setValue('')
  }

  return (
    <form className="action-composer" onSubmit={handleSubmit}>
      <label htmlFor="player-action">O que você faz?</label>
      <div className="composer-row">
        <textarea
          id="player-action"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Descreva sua próxima ação..."
          rows={2}
          maxLength={4000}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !value.trim()}>
          {isLoading ? <span className="button-spinner" aria-label="Enviando" /> : 'Enviar'}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
      <div className="composer-hint"><span>↳</span> Texto livre. O Mestre decide o que acontece.</div>
    </form>
  )
}
