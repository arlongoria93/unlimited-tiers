class BootScene extends Phaser.Scene {
  constructor() { super("boot"); }
  preload() {
    this.cameras.main.setBackgroundColor(0x07060a);
    this.load.spritesheet("heroIdle", "assets/hero-idle.png?v=33", { frameWidth: 151, frameHeight: 140 });
    this.load.spritesheet("heroWalk", "assets/hero-walk.png?v=33", { frameWidth: 151, frameHeight: 140 });
    this.load.spritesheet("heroAttack", "assets/hero-attack.png?v=33", { frameWidth: 176, frameHeight: 140 });
    for (let t = 1; t <= 16; t++) this.load.image("tier" + t, `assets/rooms/t${t}.jpg?v=28`);
    this.load.spritesheet("hound", "assets/hound.png?v=33", { frameWidth: 254, frameHeight: 140 });
    this.load.spritesheet("knight", "assets/knight.png?v=33", { frameWidth: 151, frameHeight: 140 });
    this.load.spritesheet("titan", "assets/titan.png?v=33", { frameWidth: 117, frameHeight: 140 });
    this.load.image("doorimg", "assets/door.png");
    this.load.image("torchimg", "assets/torch.png");
    this.load.image("floorimg", "assets/floor.jpg?v=22");
    this.load.image("roomP", "assets/room-portrait.jpg?v=22");
    this.load.image("roomL", "assets/room-land.jpg?v=22");
    this.load.image("debris", "assets/debris.png");
    this.load.image("glow", "assets/glow.png");
    this.load.image("mallbg", "assets/mall.jpg?v=22");
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
    ["heroIdle", "heroWalk", "heroAttack", "hound", "knight", "titan"].forEach((key) => {
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
  render: { antialias: true, pixelArt: false, roundPixels: false },
});
