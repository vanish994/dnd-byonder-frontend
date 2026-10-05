import Phaser from 'phaser'
import type { VisualSnapshot } from '../adapters/gameStateAdapter'

export type WorldSceneEvents = {
  onIntent?: (action: Record<string, unknown>) => void
}

export class WorldScene extends Phaser.Scene {
  private snapshot: VisualSnapshot | null = null
  private bridgeEvents: WorldSceneEvents = {}
  private player!: Phaser.GameObjects.Container
  private cameraReady = false

  constructor() { super('ByonderWorld') }

  init(data: { snapshot?: VisualSnapshot; events?: WorldSceneEvents }) {
    this.snapshot = data.snapshot ?? null
    this.bridgeEvents = data.events ?? {}
  }

  create() {
    this.drawBackdrop()
    this.drawMap()
    this.createActors()
    this.createCamera()
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.snapshot || !this.player) return
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, worldPoint.x, worldPoint.y)
      if (distance > 56) return
      const action = this.snapshot.authorizedInteractions.find((candidate) => candidate.type === 'move' || candidate.type === 'explore')
      if (action) this.bridgeEvents.onIntent?.({ ...action, target: { x: Math.round(worldPoint.x), y: Math.round(worldPoint.y) } })
    })
  }

  updateSnapshot(snapshot: VisualSnapshot) {
    const changedScene = this.snapshot?.sceneId !== snapshot.sceneId
    this.snapshot = snapshot
    if (changedScene && this.scene.isActive()) this.scene.restart({ snapshot, events: this.bridgeEvents })
  }

  private drawBackdrop() {
    this.add.rectangle(320, 180, 640, 360, 0x101a18)
    this.add.rectangle(320, 92, 640, 184, 0x16251f)
    this.add.rectangle(320, 276, 640, 184, 0x0e1715)
  }

  private drawMap() {
    const g = this.add.graphics()
    g.fillStyle(0x274437, 1).fillRect(40, 72, 560, 222)
    g.fillStyle(0x385b41, 1).fillRect(50, 82, 540, 202)
    g.fillStyle(0x6a5538, 1).fillRect(55, 190, 530, 25)
    g.fillStyle(0x8a7043, 1).fillRect(55, 199, 530, 7)
    for (let x = 90; x < 570; x += 55) {
      const y = 110 + ((x * 13) % 125)
      g.fillStyle(0x16352c, 1).fillRect(x, y, 18, 30)
      g.fillStyle(0x4d8251, 1).fillRect(x - 9, y - 12, 36, 18)
      g.fillStyle(0x74a65d, 1).fillRect(x - 3, y - 18, 10, 8)
    }
    g.lineStyle(2, 0xc09b52, 0.55).strokeRect(40, 72, 560, 222)
  }

  private createActors() {
    const playerX = 180
    const playerY = 202
    this.player = this.createActor(playerX, playerY, 0xd39a52, this.snapshot?.player.label ?? 'Você', true)
    const actors = this.snapshot?.actors ?? []
    actors.forEach((actor, index) => this.createActor(370 + index * 62, 160 + (index % 2) * 58, actor.kind === 'creature' ? 0xb55248 : 0x78a968, actor.label, false))
  }

  private createActor(x: number, y: number, color: number, label: string, interactive: boolean) {
    const body = this.add.rectangle(0, 0, 22, 28, color).setOrigin(.5, 1)
    const head = this.add.rectangle(0, -31, 18, 14, 0xe5c08b).setOrigin(.5, 1)
    const shadow = this.add.ellipse(0, 2, 34, 10, 0x08100c, .45)
    const text = this.add.text(0, 13, label.slice(0, 14), { color: '#f4e9ca', fontSize: '10px', fontFamily: 'monospace', align: 'center' }).setOrigin(.5, 0)
    const container = this.add.container(x, y, [shadow, body, head, text])
    if (interactive) {
      container.setSize(44, 44).setInteractive({ useHandCursor: true })
      container.on('pointerdown', () => {
        const action = this.snapshot?.authorizedInteractions.find((candidate) => candidate.type === 'interact' || candidate.type === 'investigate')
        if (action) this.bridgeEvents.onIntent?.(action)
      })
    }
    return container
  }

  private createCamera() {
    const camera = this.cameras.main
    camera.setBounds(0, 0, 640, 360)
    camera.setZoom(Math.min(window.innerWidth / 640, 1.8))
    camera.centerOn(320, 180)
    this.cameraReady = true
  }

  resize(width: number, height: number) {
    if (!this.cameraReady) return
    this.scale.resize(width, height)
    this.cameras.main.setZoom(Math.min(width / 640, height / 360))
  }
}
