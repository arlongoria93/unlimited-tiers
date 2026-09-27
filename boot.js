class BootScene extends Phaser.Scene {
  constructor() { super("boot"); }
  preload() {
    this.cameras.main.setBackgroundColor(0x07060a);
    this.load.spritesheet("hero", "assets/hero.png", { frameWidth: 192, frameHeight: 240 });
    this.load.spritesheet("hound", "assets/hound.png", { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet("knight", "assets/knight.png", { frameWidth: 192, frameHeight: 256 });
    this.load.spritesheet("titan", "assets/titan.png", { frameWidth: 240, frameHeight: 280 });
    this.load.image("doorimg", "assets/door.png");
    this.load.image("torchimg", "assets/torch.png");
    this.load.image("floorimg", "assets/floor.jpg");
    this.load.image("roomP", "assets/room-portrait.jpg");
    this.load.image("roomL", "assets/room-land.jpg");
    this.load.image("debris", "assets/debris.png");
    this.load.image("glow", "assets/glow.png");
    this.load.image("mallbg", "assets/mall.jpg");
  }
  create() {
    [["hero", 6], ["hound", 8], ["knight", 5], ["titan", 4]].forEach(([key, rate]) => {
      this.anims.create({
        key: key + "-idle",
        frames: this.anims.generateFrameNumbers(key, { start: 0, end: 3 }),
        frameRate: rate,
        repeat: -1,
      });
    });
    this.scene.start("mall");
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#07060a",
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: "arcade", arcade: { debug: false } },
  scene: [BootScene, MallScene, DungeonScene, ShopScene, VendorScene, ForgeScene, BoardScene],
  audio: { noAudio: true },
  render: { antialias: true, pixelArt: false, roundPixels: false },
});
