import { useEffect, useRef } from 'react'

type Props = { die: string; result: number | null; rollId: number }

export function PhaserDiceStage({ die, result, rollId }: Props) {
  const host = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let game: { destroy: (removeCanvas: boolean) => void } | undefined
    let disposed = false
    void import('phaser').then(({ default: Phaser }) => {
      if (disposed || !host.current) return
      const sides = Number(die.slice(1))
      const color = sides <= 6 ? 0xd39a52 : sides <= 12 ? 0x6aa891 : 0x9b76d8
      game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 220,
        height: 180,
        transparent: true,
        parent: host.current,
        scene: {
          create(this: Phaser.Scene) {
            const dieShape = this.add.polygon(110, 86, [-58, 0, 0, -58, 58, 0, 0, 58], color, 0.92)
              .setStrokeStyle(2, 0xf0c477, 0.9)
            const label = this.add.text(110, 86, die, { color: '#f0e6d4', fontFamily: 'Cinzel, Georgia, serif', fontSize: '15px' }).setOrigin(0.5)
            const value = this.add.text(110, 91, result === null ? '?' : String(result), { color: '#fff8e8', fontFamily: 'Cinzel, Georgia, serif', fontSize: '34px', fontStyle: 'bold' }).setOrigin(0.5)
            label.setAlpha(0.8)
            value.setAlpha(result === null ? 0.65 : 0)
            this.add.text(110, 158, 'PHASER · ANIMAÇÃO LOCAL', { color: '#9b8f7e', fontFamily: 'DM Sans, sans-serif', fontSize: '9px', letterSpacing: 1 }).setOrigin(0.5)
            this.tweens.add({ targets: dieShape, angle: 360, scale: 1.08, duration: 720, ease: 'Cubic.easeOut', onComplete: () => {
              this.tweens.add({ targets: dieShape, scale: 1, duration: 180, ease: 'Quad.easeOut' })
              this.tweens.add({ targets: value, alpha: 1, duration: 180, ease: 'Quad.easeOut' })
            } })
            this.tweens.add({ targets: label, angle: -360, duration: 720, ease: 'Cubic.easeOut' })
          },
        },
      })
    })
    return () => { disposed = true; game?.destroy(true) }
  }, [die, result, rollId])

  return <div ref={host} className="phaser-dice-stage" aria-label={`${die}: ${result ?? 'rolando'}`} />
}
