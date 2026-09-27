class BootScene extends Phaser.Scene {
  constructor() { super("boot"); }
  preload() {
    this.cameras.main.setBackgroundColor(0x07060a);
    this.load.image("hero", "assets/hero.png");
    this.load.image("hound", "assets/hound.png");
    this.load.image("knight", "assets/knight.png");
    this.load.image("titan", "assets/titan.png");
    this.load.image("doorimg", "assets/door.png");
    this.load.image("torchimg", "assets/torch.png");
    this.load.image("floorimg", "assets/floor.jpg?v=20");
    this.load.image("roomP", "assets/floor.jpg?v=20");
    this.load.image("roomL", "assets/floor.jpg?v=20");
    this.load.image("debris", "assets/debris.png");
    this.load.image("glow", "assets/glow.png");
    this.load.image("mallbg", "assets/mall.jpg");
  }
  create() {
    this.scene.start("mall");
  }
}

const cssW = Math.max(window.innerWidth || 400, 1);
const gameResolution = Math.min(window.devicePixelRatio || 1, 2, 2400 / cssW);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#07060a",
  resolution: gameResolution,
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: "arcade", arcade: { debug: false } },
  scene: [BootScene, MallScene, DungeonScene, ShopScene, VendorScene, ForgeScene, BoardScene, ClassScene],
  audio: { noAudio: true },
  render: { antialias: true, pixelArt: false, roundPixels: false },
});
