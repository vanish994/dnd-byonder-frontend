import { useState } from 'react'
import type { FormEvent } from 'react'

interface ActionInputProps {
  isLoading: boolean
  disabled?: boolean
  onSubmit: (value: string) => Promise<boolean>
  suggestions?: string[]
}

export function ActionInput({ isLoading, disabled = false, onSubmit, suggestions = [] }: ActionInputProps) {
  const [value, setValue] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!value.trim() || isLoading || disabled) return
    const sent = await onSubmit(value)
    if (sent) setValue('')
  }

  function chooseSuggestion(suggestion: string) {
    setValue(suggestion)
    document.getElementById('player-action')?.focus()
  }

  return (
    <section className="action-zone" aria-label="Ações do jogador">
      <div className="action-heading">
        <div>
          <span className="section-kicker"><span className="kicker-line" /> Próximo movimento</span>
          <h2>O que você faz?</h2>
        </div>
        <span className="action-glyph" aria-hidden="true">⌁</span>
      </div>
      {suggestions.length > 0 && (
        <div className="suggested-actions" aria-label="Sugestões de ação">
          <span className="suggested-label">Você pode</span>
          {suggestions.map((suggestion) => (
            <button type="button" className="suggested-action" key={suggestion} onClick={() => chooseSuggestion(suggestion)} disabled={isLoading || disabled}>
              {suggestion}
            </button>
          ))}
        </div>
      )}
      <form className="action-composer" onSubmit={handleSubmit}>
        <label htmlFor="player-action"><span className="input-rune" aria-hidden="true">ᛉ</span> Descreva sua ação</label>
        <div className="composer-row">
          <textarea
            id="player-action"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          placeholder="Descreva sua próxima ação..."
            rows={2}
            maxLength={4000}
            disabled={isLoading || disabled}
          />
          <button type="submit" disabled={isLoading || disabled || !value.trim()}>
            {isLoading ? <span className="button-spinner" aria-label="Enviando" /> : <span className="send-arrow" aria-hidden="true">↗</span>}
            <span>{isLoading ? 'Enviando' : 'Enviar'}</span>
          </button>
        </div>
        <div className="composer-hint"><span>✦</span> Texto livre narra sua intenção; para rolar dados, escolha uma sugestão do Mestre.</div>
      </form>
    </section>
  )
}
