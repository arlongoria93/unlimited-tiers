new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#07060a",
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: "arcade", arcade: { debug: false } },
  scene: [MallScene, DungeonScene, ShopScene],
  audio: { noAudio: true },
  render: { antialias: true, pixelArt: false, roundPixels: false },
});
