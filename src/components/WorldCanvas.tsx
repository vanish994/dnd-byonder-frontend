import { useEffect, useRef } from 'react'
import type PhaserType from 'phaser'
import type { VisualSnapshot } from '../game/adapters/gameStateAdapter'

interface WorldCanvasProps {
  snapshot: VisualSnapshot | null
  isLoading: boolean
  onIntent: (action: Record<string, unknown>) => void
}

export function WorldCanvas({ snapshot, isLoading, onIntent }: WorldCanvasProps) {
  const host = useRef<HTMLDivElement | null>(null)
  const game = useRef<PhaserType.Game | null>(null)
  const latest = useRef({ snapshot, onIntent })
  useEffect(() => { latest.current = { snapshot, onIntent } }, [snapshot, onIntent])

  useEffect(() => {
    let disposed = false
    let removeResize = () => {}
    void Promise.all([import('phaser'), import('../game/scenes/WorldScene')]).then(([{ default: Phaser }, { WorldScene }]) => {
      if (disposed || !host.current) return
      const scene = new WorldScene()
      game.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host.current,
        width: 640,
        height: 360,
        backgroundColor: '#101a18',
        pixelArt: true,
        antialias: false,
        render: { roundPixels: true },
        scene: [scene],
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      })
      const boot = () => {
        if (!game.current || !latest.current.snapshot) return
        game.current.scene.start('ByonderWorld', {
          snapshot: latest.current.snapshot,
          events: { onIntent: latest.current.onIntent },
        })
      }
      game.current.events.once('ready', boot)
      const resize = () => game.current?.scale.resize(host.current?.clientWidth ?? 640, host.current?.clientHeight ?? 360)
      window.addEventListener('resize', resize)
      removeResize = () => window.removeEventListener('resize', resize)
    }).catch(() => {
      // The React narrative remains usable if the optional visual renderer cannot initialize.
    })
    return () => {
      disposed = true
      removeResize()
      game.current?.destroy(true)
      game.current = null
    }
  }, [])

  useEffect(() => {
    if (!snapshot || !game.current) return
    const active = game.current.scene.getScene('ByonderWorld') as unknown as { scene: { isActive: () => boolean }; updateSnapshot: (value: VisualSnapshot) => void } | null
    if (active?.scene.isActive()) active.updateSnapshot(snapshot)
    else game.current.scene.start('ByonderWorld', { snapshot, events: { onIntent } })
  }, [snapshot, onIntent])

  return <section className={`world-canvas ${isLoading ? 'is-loading' : ''}`} aria-label="Mapa visual da cena atual">
    <div ref={host} className="world-canvas__host" />
    <div className="world-canvas__hud"><span>{snapshot?.sceneTitle ?? 'Cena visual'}</span><span>{isLoading ? 'resolvendo…' : 'toque no personagem para interagir'}</span></div>
  </section>
}
