class BootScene extends Phaser.Scene {
  constructor() { super("boot"); }
  preload() {
    this.cameras.main.setBackgroundColor(0x07060a);
    this.load.spritesheet("heroIdle", "assets/td/hero-idle.png?v=38", { frameWidth: 230, frameHeight: 196 });
    this.load.spritesheet("heroWalk", "assets/td/hero-walk.png?v=38", { frameWidth: 230, frameHeight: 196 });
    this.load.spritesheet("heroAttack", "assets/td/hero-attack.png?v=38", { frameWidth: 230, frameHeight: 196 });
    this.load.spritesheet("hound", "assets/td/hound-walk.png?v=37", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("knight", "assets/td/knight-walk.png?v=37", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("titan", "assets/td/titan-walk.png?v=37", { frameWidth: 32, frameHeight: 32 });
    this.load.image("floorA", "assets/td/floor.png?v=37");
    this.load.image("floorB", "assets/td/floor2.png?v=37");
    this.load.image("floorC", "assets/td/floor3.png?v=37");
    this.load.image("wallTile", "assets/td/wall.png?v=37");
    this.load.image("doorTile", "assets/td/door.png?v=37");
    this.load.image("mallbg", "assets/td/hall.jpg?v=37");
  }
  create() {
    const clip = (key, tex, rate, repeat) => {
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(tex, { start: 0, end: 3 }),
        frameRate: rate,
        repeat,
      });
    };
    clip("hero-idle", "heroIdle", 6, -1);
    clip("hero-walk", "heroWalk", 12, -1);
    clip("hero-attack", "heroAttack", 10, 0);
    clip("hound-move", "hound", 10, -1);
    clip("knight-move", "knight", 10, -1);
    clip("titan-move", "titan", 8, -1);
    ["heroIdle", "heroWalk", "heroAttack", "hound", "knight", "titan", "floorA", "floorB", "floorC", "wallTile", "doorTile", "mallbg"].forEach((key) => {
      if (this.textures.exists(key)) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    });
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
  scene: [BootScene, MallScene, DungeonScene, ShopScene, VendorScene, ForgeScene, BoardScene, ClassScene, GearScene],
  audio: { noAudio: true },
  render: { antialias: false, pixelArt: true, roundPixels: true },
});
