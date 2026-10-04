export function LoadingState() {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-glyph" aria-hidden="true">✦</span>
      <span>Mestre está pensando...</span>
    </div>
  )
}
