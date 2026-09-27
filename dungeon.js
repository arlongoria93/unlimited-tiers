class DungeonScene extends Phaser.Scene {
  constructor() { super("dungeon"); }
  init(data) {
    this.tier = data.tier || 1;
    this.forge = !!data.forge;
    this.world = !!data.world;
  }
  create() {
    bootTextures(this);
    const T = TIERS[this.tier];
    this.roomsTotal = this.world ? 1 : this.forge ? 3 : T.rooms;
    this.roomIndex = 0;
    this.checkpoint = 0;
    this.enrageAt = 0;
    const s = compute();
    this.hp = s.hp;
    this.maxHp = s.hp;
    this.nextSwing = 0;
    this.stick = { ax: 0, ay: 0, down: false, sx: 0, sy: 0 };
    this.doorOpen = false;
    this.advancing = false;
    this.travelId = 0;
    this.torches = [];
    this.mobs = [];
    this._fitLock = false;

    this.cameras.main.setBackgroundColor(0x07060a);
    this.floorLayer = this.add.tileSprite(0, 0, 64, 64, "floorimg").setOrigin(0).setDepth(0).setVisible(false);
    this.roomArt = this.add.image(0, 0, "roomP").setDepth(0);
    this.floorDim = this.add.rectangle(0, 0, 64, 64, T.floor, 0.1).setOrigin(0).setDepth(1);
    this.walls = this.physics.add.staticGroup();
    this.door = null;
    this.player = this.physics.add.sprite(0, 0, "hero").setDepth(6).setOrigin(0.5, 0.92);
    this.heroScale = Math.max(0.04, (this.scale.height * 0.115) / this.player.height);
    this.player.setScale(this.heroScale);
    this.playerShadow = this.add.ellipse(0, 0, 54, 16, 0x000000, 0.45).setDepth(5);
    this.player.body.setSize(this.player.width * 0.4, this.player.height * 0.2);
    this.player.body.setOffset(this.player.width * 0.3, this.player.height * 0.76);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.walls);
    this.sparks = this.add.particles(0, 0, "spark", {
      lifespan: 420, speed: { min: 20, max: 80 }, scale: { start: 0.7, end: 0 },
      emitting: false, quantity: 6, blendMode: "ADD",
    }).setDepth(8);
    this.strikeUntil = 0;
    for (let i = 0; i < 16; i++) this.spawnEmber();
    this.vignette = this.add.graphics().setScrollFactor(0).setDepth(15);

    this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT");
    this.input.on("pointerdown", (p) => {
      if (p.y > this.scale.height - 140) return;
      this.stick.down = true; this.stick.sx = p.x; this.stick.sy = p.y;
    });
    this.input.on("pointerup", () => { this.stick.down = false; this.stick.ax = 0; this.stick.ay = 0; });
    this.input.on("pointermove", (p) => {
      if (!this.stick.down) return;
      const dx = p.x - this.stick.sx, dy = p.y - this.stick.sy;
      const m = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, m / 56);
      this.stick.ax = (dx / m) * k;
      this.stick.ay = (dy / m) * k;
    });

    const barW = () => Math.min(420, this.scale.width - 24);
    this.hudBar = this.add.rectangle(0, 0, 10, 86, 0x0c0a08, 0.88).setOrigin(0.5, 0).setScrollFactor(0).setDepth(20);
    this.hudH = this.add.text(16, 8, "", { fontFamily: TITLE, fontSize: "12px", color: "#e8d59a" }).setScrollFactor(0).setDepth(21);
    this.hint = this.add.text(0, 28, "", { fontFamily: TITLE, fontSize: "13px", color: "#f0ead8" }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(21);
    this.hpGhost = this.add.rectangle(0, 58, 10, 12, 0x5a2018).setOrigin(0, 0.5).setScrollFactor(0).setDepth(21);
    this.hpBg = this.add.rectangle(0, 58, 10, 12, 0x1a0c0c).setScrollFactor(0).setDepth(21);
    this.hpFg = this.add.rectangle(0, 58, 10, 12, 0x9a1a18).setOrigin(0, 0.5).setScrollFactor(0).setDepth(22);
    this.hpFrame = this.add.rectangle(0, 58, 10, 18).setStrokeStyle(2, 0xc4a15a, 0.85).setScrollFactor(0).setDepth(23);
    this.bossTrack = this.add.rectangle(0, 0, 10, 10, 0x140806).setScrollFactor(0).setDepth(21).setVisible(false);
    this.bossFill = this.add.rectangle(0, 0, 10, 8, 0x8c1c16).setOrigin(0, 0.5).setScrollFactor(0).setDepth(22).setVisible(false);
    this.bossFrame = this.add.rectangle(0, 0, 10, 14).setStrokeStyle(1, 0xd4b56a, 0.8).setScrollFactor(0).setDepth(23).setVisible(false);
    this.bossName = this.add.text(0, 0, "", { fontFamily: TITLE, fontSize: "11px", color: "#e8d59a" }).setOrigin(0.5).setScrollFactor(0).setDepth(24).setVisible(false);
    this.mallBtn = this.add.rectangle(0, 0, 72, 28, 0x16120c).setStrokeStyle(1, 0xc4a15a, 0.8).setScrollFactor(0).setDepth(24).setInteractive();
    this.mallLabel = this.add.text(0, 0, "HALL", { fontFamily: TITLE, fontSize: "11px", color: "#e8d59a" }).setOrigin(0.5).setScrollFactor(0).setDepth(25);
    this.mallBtn.on("pointerup", () => this.scene.start("mall"));
    this.mpBg = this.add.rectangle(0, 0, 10, 6, 0x0c1824).setScrollFactor(0).setDepth(21);
    this.mpFg = this.add.rectangle(0, 0, 10, 6, 0x3ec6e0).setOrigin(0, 0.5).setScrollFactor(0).setDepth(22);
    this.skillSlots = [0, 1, 2, 3].map((i) => {
      const slot = this.add.rectangle(0, 0, 34, 34, i === 0 ? 0x3a2412 : 0x121018)
        .setStrokeStyle(2, i === 0 ? 0xf0d080 : 0x6a5a40, i === 0 ? 1 : 0.85)
        .setScrollFactor(0).setDepth(24).setInteractive();
      const label = this.add.text(0, 0, "ATK", {
        fontFamily: TITLE, fontSize: "9px", color: i === 0 ? "#f0d080" : "#f6e7b2",
      }).setOrigin(0.5).setScrollFactor(0).setDepth(26);
      const shade = this.add.rectangle(0, 0, 30, 0, 0x07060a, 0.72).setOrigin(0.5, 0).setScrollFactor(0).setDepth(25);
      if (i > 0) slot.on("pointerup", () => this.castSkill(i - 1));
      return { slot, label, shade };
    });
    this.cds = {};
    this.pets = [];
    if (this.input.keyboard) {
      this.input.keyboard.on("keydown-Q", () => this.castSkill(0));
      this.input.keyboard.on("keydown-E", () => this.castSkill(1));
      this.input.keyboard.on("keydown-R", () => this.castSkill(2));
    }
    this.nameTag = this.add.text(0, 0, classOf().name.toUpperCase(), {
      fontFamily: TITLE, fontSize: "12px", color: "#f6e7b2", stroke: "#140e08", strokeThickness: 4,
    }).setOrigin(0.5, 1).setDepth(12);
    this.shownHp = s.hp;
    this.ghostHp = s.hp;
    this._barW = barW;

    this.scale.on("resize", () => {
      if (this._fitLock) return;
      this.fitHud();
      this.buildRoom(true);
    });

    this.fitHud();
    this.buildRoom(false);
    this.cameras.main.fadeIn(180, 7, 6, 10);
  }
  view() {
    return { w: this.scale.width, h: this.scale.height };
  }
  fitHud() {
    const { w, h } = this.view();
    const bw = this._barW();
    this.mallBtn.setPosition(w - 48, h - 108);
    this.mallLabel.setPosition(w - 48, h - 108);
    const barY = h - 36;
    this.hpBg.setPosition(w / 2, barY).setSize(bw, 14);
    this.hpGhost.setPosition(w / 2 - bw / 2, barY).setSize(bw, 14);
    this.hpFg.setPosition(w / 2 - bw / 2, barY);
    this.hpFg.height = 14;
    this.hpFrame.setPosition(w / 2, barY).setSize(bw + 8, 20);
    this.mpBg.setPosition(w / 2, barY + 12).setSize(bw, 5);
    this.mpFg.setPosition(w / 2 - bw / 2, barY + 12);
    this.mpFg.height = 5;
    const slotY = h - 62;
    const slotStart = w / 2 - (4 * 40) / 2 + 20;
    this.skillSlots.forEach((sk, i) => {
      const x = slotStart + i * 40;
      sk.slot.setPosition(x, slotY);
      sk.label.setPosition(x, slotY);
      sk.shade.setPosition(x, slotY - 15);
    });
    this.hudBar.setPosition(w / 2, h - 128).setSize(w, 128);
    this.hint.setPosition(w / 2, h - 108);
    this.hudH.setPosition(16, h - 108);
    const bbw = Math.min(300, w * 0.72);
    this.bossName.setPosition(w / 2, 16);
    this.bossTrack.setPosition(w / 2, 36).setSize(bbw, 8);
    this.bossFill.setPosition(w / 2 - bbw / 2, 36);
    this.bossFill.height = 8;
    this.bossFrame.setPosition(w / 2, 36).setSize(bbw + 6, 14);
    this.drawVignette();
  }
  drawVignette() {
    const { w, h } = this.view();
    this.vignette.clear();
    this.vignette.fillStyle(0x000000, 0.28);
    this.vignette.fillRect(0, 0, w, 10);
    this.vignette.fillRect(0, h - 10, w, 10);
    for (let i = 0; i < 5; i++) {
      this.vignette.fillStyle(0x000000, 0.07);
      const t = 10 + i * 14;
      this.vignette.fillRect(0, 0, t, h);
      this.vignette.fillRect(w - t, 0, t, h);
      this.vignette.fillRect(0, 0, w, t * 0.45);
    }
  }
  buildRoom(keepPlayer) {
    const { w, h } = this.view();
    if (w < 40 || h < 40) return;
    const T = TIERS[this.tier];
    this._fitLock = true;
    const land = w > h;
    const ix = w * (land ? 0.08 : 0.11);
    const iy = h * 0.13;
    this.physics.world.setBounds(ix, iy, w - ix * 2, h - iy - h * 0.16);
    this.roomArt.setTexture("floorimg");
    this.roomArt.setPosition(w / 2, h / 2);
    this.roomArt.setScale(Math.max(w / this.roomArt.width, h / this.roomArt.height));
    this.floorDim.setPosition(0, 0).setSize(w, h).setFillStyle(0x000000, 0);
    this.walls.clear(true, true);
    this.mobs.forEach((m) => {
      m.sprite.destroy();
      if (m.shadow) m.shadow.destroy();
      if (m.bar) m.bar.destroy();
      if (m.barBg) m.barBg.destroy();
    });
    this.mobs = [];
    if (this.door) this.door.destroy();

    const last = this.roomIndex === this.roomsTotal - 1;
    [[w / 2, iy * 0.45, w, iy], [w / 2, h - 36, w, 72], [ix * 0.45, h / 2, ix, h], [w - ix * 0.45, h / 2, ix, h]].forEach((wall) => {
      const piece = this.walls.create(wall[0], wall[1], "wallpx");
      piece.setDisplaySize(wall[2], wall[3]).setVisible(false).refreshBody();
    });
    this.door = this.add.rectangle(w / 2, iy + 8, Math.min(120, w * 0.28), 22, 0xffc070, this.doorOpen ? 0.75 : 0).setDepth(3);
    if (this.gloom) this.gloom.destroy();
    this.gloom = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setDepth(2);
    if (this.lamps) this.lamps.forEach((lamp) => lamp.destroy());
    this.lamps = [];
    const spots = land
      ? [[0.13, 0.34], [0.13, 0.7], [0.87, 0.34], [0.87, 0.7]]
      : [[0.17, 0.28], [0.17, 0.64], [0.83, 0.3], [0.83, 0.66]];
    spots.forEach(([sx, sy], i) => {
      const lamp = this.add.image(w * sx, h * sy, "glow").setBlendMode(Phaser.BlendModes.ADD).setDepth(3).setAlpha(0.22);
      lamp.setScale(Math.max(0.7, w / 520));
      this.tweens.add({ targets: lamp, alpha: { from: 0.14, to: 0.26 }, duration: 380 + i * 90, yoyo: true, repeat: -1 });
      this.lamps.push(lamp);
    });

    const spawn = { x: w / 2, y: h * 0.72 };
    if (!keepPlayer) this.player.setPosition(spawn.x, spawn.y);
    else {
      this.player.setPosition(
        Phaser.Math.Clamp(this.player.x, 40, w - 40),
        Phaser.Math.Clamp(this.player.y, 90, h - 50)
      );
    }

    const packs = [];
    if (this.world || last) {
      packs.push({ kind: "boss", x: w * 0.5, y: land ? h * 0.42 : h * 0.36, n: 1 });
    } else if (land) {
      packs.push({ kind: "trash", x: w * 0.32, y: h * 0.42, n: 2 });
      packs.push({ kind: "trash", x: w * 0.7, y: h * 0.38, n: this.tier >= 5 ? 2 : 1 });
      if (this.tier >= 9 && this.roomIndex % 2 === 1) packs.push({ kind: "elite", x: w * 0.5, y: h * 0.28, n: 1 });
    } else {
      packs.push({ kind: "trash", x: w * 0.34, y: h * 0.46, n: 2 });
      packs.push({ kind: "trash", x: w * 0.68, y: h * 0.34, n: this.tier >= 5 ? 2 : 1 });
      if (this.tier >= 9 && this.roomIndex % 2 === 1) packs.push({ kind: "elite", x: w * 0.5, y: h * 0.24, n: 1 });
    }

    packs.forEach((p) => {
      for (let i = 0; i < p.n; i++) {
        const x = Phaser.Math.Clamp(p.x + (i - (p.n - 1) / 2) * 36, w * 0.24, w * 0.76);
        const y = Phaser.Math.Clamp(p.y + (i % 2) * 12, h * 0.3, h * 0.6);
        const tex = p.kind === "boss" ? "titan" : p.kind === "elite" ? "knight" : "hound";
        const sprite = this.physics.add.sprite(x, y, tex).setDepth(6).setOrigin(0.5, 0.92);
        const want = (p.kind === "boss" ? 0.24 : p.kind === "elite" ? 0.13 : 0.085) * h;
        const sc = want / sprite.height;
        sprite.setScale(sc);
        sprite.body.setImmovable(true);
        const pull = p.kind === "boss" ? Math.min(120, w * 0.2) : Math.min(78, w * 0.15);
        const shadow = this.add.ellipse(x, y + 4, sprite.displayWidth * 0.5, 14, 0x000000, 0.45).setDepth(5);
        const wide = p.kind === "elite" ? 46 : 30;
        const head = y - sprite.displayHeight * 0.92;
        const barBg = this.add.rectangle(x, head, wide, p.kind === "elite" ? 5 : 3, 0x140808).setDepth(7).setVisible(false);
        const bar = this.add.rectangle(x - wide / 2, head, wide, p.kind === "elite" ? 5 : 3, 0x9a1c18).setOrigin(0, 0.5).setDepth(8).setVisible(false);
        if (p.kind === "elite") bar.setStrokeStyle(1, 0xd4b56a, 0.9);
        this.mobs.push({
          sprite, shadow, bar, barBg, barW: wide, kind: p.kind, homeX: x, homeY: y,
          hp: enemyHp(this.tier, p.kind) * (this.world ? 2 : 1), max: enemyHp(this.tier, p.kind) * (this.world ? 2 : 1),
          state: "idle", pull, leash: p.kind === "boss" ? 280 : 210,
          baseScale: sc, attackAt: 0, slamming: false,
        });
      }
    });

    this.enrageAt = last && this.tier >= 13 ? this.time.now + (this.tier === 16 ? 180000 : 140000) : 0;
    this.hint.setText(`${T.inst.toUpperCase()}   ·   ${this.roomIndex + 1} / ${this.roomsTotal}`);
    this.fitHud();
    this.advancing = false;
    this._fitLock = false;
  }
  landHit(best, s, px, py) {
    const ang = Phaser.Math.Angle.Between(px, py, best.sprite.x, best.sprite.y);
    best.hp -= s.hit;
    if ((profile.graveUntil || 0) > Date.now()) this.hp = Math.min(this.maxHp, this.hp + s.hit * 0.2);
    if ((profile.phantomUntil || 0) > Date.now()) best.hp -= Math.round(s.hit * 0.7);
    if (this.cleaveLeft > 0) {
      this.cleaveLeft--;
      this.mobs.forEach((m) => {
        if (m === best || m.hp <= 0 || m.state !== "combat") return;
        if (Phaser.Math.Distance.Between(px, py, m.sprite.x, m.sprite.y) > 130) return;
        m.hp -= s.hit * 1.5;
        this.floatText(m.sprite.x, m.sprite.y - 16, `${Math.round(s.hit * 1.5)}`, "#ffe27a");
        if (m.hp <= 0) this.fell(m);
      });
    }
    this.nextSwing = this.time.now / 1000 + s.swing;
    this.strikeUntil = this.time.now + 220;
    this.player.setFlipX(Math.cos(ang) < 0);
    this.player.setVelocity(0, 0);
    this.player.setRotation(0);
    this.player.setScale(this.heroScale);
    this.swingBlade(ang);
    const ring = this.add.circle(best.sprite.x, best.sprite.y - 8, 6).setStrokeStyle(3, 0xfff1c4, 0.9).setDepth(9);
    this.tweens.add({ targets: ring, scale: 4.2, alpha: 0, duration: 180, onComplete: () => ring.destroy() });
    this.sparks.emitParticleAt(best.sprite.x, best.sprite.y - 10, best.hp <= 0 ? 22 : 12);
    this.floatText(best.sprite.x, best.sprite.y - 28, `${s.hit}`, best.hp <= 0 ? "#fff6d0" : "#ffe27a");
    this.skillSlots[0].slot.setScale(1.22);
    this.tweens.add({ targets: this.skillSlots[0].slot, scale: 1, duration: 140 });
    this.cameras.main.shake(best.hp <= 0 ? 160 : 80, best.hp <= 0 ? 0.008 : 0.004);
    sfx("swing");
    sfx(best.hp <= 0 ? "kill" : "hit");
    best.sprite.setTint(0xffffff);
    this.tweens.add({
      targets: best.sprite,
      scaleX: best.sprite.scaleX * 1.18,
      scaleY: best.sprite.scaleY * 0.82,
      duration: 50, yoyo: true,
    });
    if (best.hp <= 0) this.fell(best);
    else this.time.delayedCall(70, () => { if (best.hp > 0) best.sprite.setTint(0xffd0c0); });
  }
  fell(m) {
    if (!m || m.state === "dead") return;
    m.state = "dead";
    m.hp = 0;
    this.sparks.emitParticleAt(m.sprite.x, m.sprite.y, 16);
    if (m.shadow) m.shadow.destroy();
    if (m.bar) m.bar.destroy();
    if (m.barBg) m.barBg.destroy();
    const mode = this.forge ? "forge" : this.world ? "world" : "pit";
    this.floatText(m.sprite.x, m.sprite.y - 40, grantKill(m.kind, this.tier, mode), "#7ee0e6");
    this.tweens.add({
      targets: m.sprite, alpha: 0, y: m.sprite.y - 36, angle: 28, duration: 280,
      onComplete: () => m.sprite.destroy(),
    });
  }
  hurtMob(m, dmg) {
    if (!m || m.hp <= 0) return;
    m.hp -= dmg;
    m.state = m.state === "idle" ? "combat" : m.state;
    this.floatText(m.sprite.x, m.sprite.y - 18, `${Math.round(dmg)}`, "#fff6d0");
    if (m.hp <= 0) this.fell(m);
  }
  nearestFoe(maxDist) {
    let best = null, bd = maxDist;
    for (const m of this.mobs) {
      if (m.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, m.sprite.x, m.sprite.y);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }
  blast(range, dmg, color) {
    const ring = this.add.circle(this.player.x, this.player.y - 10, 12, color, 0.28).setDepth(8);
    this.tweens.add({ targets: ring, scale: range > 400 ? 7 : 3.2, alpha: 0, duration: 280, onComplete: () => ring.destroy() });
    let n = 0;
    this.mobs.forEach((m) => {
      if (m.hp <= 0) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, m.sprite.x, m.sprite.y);
      if (d > range) return;
      n++;
      this.hurtMob(m, dmg);
    });
    if (!n) this.toast("Nothing in range");
    sfx(n ? "hit" : "swing");
  }
  addPet(tint) {
    const pet = this.add.sprite(this.player.x + 16, this.player.y, "hound").setTint(tint).setDepth(6).setOrigin(0.5, 0.92);
    pet.setScale(Math.max(0.04, (this.scale.height * 0.09) / pet.height));
    this.pets.push({ sprite: pet, until: this.time.now + 14000, next: 0 });
  }
  castSkill(index) {
    const sk = classOf().skills[index];
    if (!sk) return;
    if ((this.cds[sk.id] || 0) > this.time.now) return;
    this.cds[sk.id] = this.time.now + sk.cd * 1000;
    const s = compute();
    const id = sk.id;
    if (id === "guard") { this.guardUntil = this.time.now + 2500; this.toast("Guard"); sfx("door"); }
    else if (id === "titanwake") { profile.titanUntil = Date.now() + 5000; this.toast("Titanwake"); sfx("kill"); }
    else if (id === "cleave") { this.cleaveLeft = 1; this.toast("Cleave armed"); sfx("swing"); }
    else if (id === "bolt" || id === "spark") this.blast(240, s.hit * 1.5, 0x7ee8ff);
    else if (id === "meteor") this.blast(999, s.hit * 1.7, 0xff8844);
    else if (id === "weave" || id === "surge") {
      profile.overloadUntil = Date.now() + 4000;
      if (id === "surge") profile.stormUntil = Date.now() + 4000;
      this.toast(id === "surge" ? "Surge" : "Weave");
      sfx("swing");
    }
    else if (id === "step" || id === "tear") this.dash(id === "tear" ? s.hit : 0);
    else if (id === "smoke") {
      this.mobs.forEach((m) => { if (m.state === "combat") m.state = "leash"; });
      this.toast("Smoke");
      sfx("step");
    }
    else if (id === "execute") {
      const m = this.nearestFoe(120);
      if (!m) return this.toast("Too far");
      const big = m.hp / m.max < 0.35;
      this.hurtMob(m, s.hit * (big ? 3 : 1.3));
      sfx(big ? "kill" : "hit");
    }
    else if (id === "mend" || id === "starlight") {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * (id === "mend" ? 0.35 : 0.22));
      this.toast(id === "mend" ? "Mend" : "Starlight");
      sfx("door");
    }
    else if (id === "oath") {
      this.oathUntil = this.time.now + 4000;
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.12);
      this.toast("Oath");
    }
    else if (id === "dawnstrike") {
      const m = this.nearestFoe(140);
      if (m) this.hurtMob(m, s.hit * 2);
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.1);
    }
    else if (id === "pet") this.addPet(0x86efac);
    else if (id === "volley") this.blast(260, s.hit * 0.9, 0x86efac);
    else if (id === "howl") { profile.howlUntil = Date.now() + 5000; this.toast("Howl"); sfx("kill"); }
    else if (id === "rift" || id === "rift2") this.addPet(id === "rift" ? 0xf472b6 : 0xa78bfa);
    else if (id === "detonate") {
      this.pets.forEach((p) => p.sprite.destroy());
      this.pets = [];
      this.blast(180, s.hit * 2, 0xf472b6);
    }
    else if (id === "storm") this.blast(220, s.hit * 1.1, 0x67e8f9);
    else if (id === "brand") { profile.brandUntil = Date.now() + 6000; this.toast("Brand"); }
    else if (id === "rune") this.blast(150, s.hit * 1.6, 0xf87171);
    else if (id === "grave") { profile.graveUntil = Date.now() + 6000; this.toast("Grave"); }
    else if (id === "star") { profile.starUntil = Date.now() + 5000; this.toast("Star"); }
    else if (id === "nova") this.blast(999, s.hit * 1.3, 0xfde68a);
    else if (id === "phantom") { profile.phantomUntil = Date.now() + 5000; this.toast("Phantom"); sfx("swing"); }
    else if (id === "collapse") this.blast(999, s.hit * 2.2, 0xa78bfa);
  }
  dash(dmg) {
    const vx = this.stick.ax || (this.player.flipX ? -1 : 1);
    const vy = this.stick.ay || 0;
    const mag = Math.hypot(vx, vy) || 1;
    const nx = Phaser.Math.Clamp(this.player.x + (vx / mag) * 120, 40, this.scale.width - 40);
    const ny = Phaser.Math.Clamp(this.player.y + (vy / mag) * 120, 80, this.scale.height - 150);
    this.player.setPosition(nx, ny);
    sfx("step");
    if (dmg) this.blast(70, dmg, 0xa78bfa);
    else this.toast("Step");
  }
  spawnEmber() {
    const { w, h } = this.view();
    const lamp = this.lamps && this.lamps.length ? this.lamps[Math.floor(Math.random() * this.lamps.length)] : null;
    const x = lamp ? lamp.x + Phaser.Math.Between(-18, 18) : Phaser.Math.Between(20, Math.max(21, w - 20));
    const y = lamp ? lamp.y + Phaser.Math.Between(-8, 16) : Phaser.Math.Between(Math.floor(h * 0.25), Math.max(30, h - 40));
    const c = this.add.circle(x, y, 1.5, 0xffb060, 0.7).setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: c, y: c.y - Phaser.Math.Between(40, 110), alpha: 0, duration: Phaser.Math.Between(1400, 2600),
      onComplete: () => { c.destroy(); if (this.scene.isActive()) this.spawnEmber(); },
    });
  }
  poseBoss(m, d) {
    const sp = m.sprite;
    const base = m.baseScale || 0.48;
    if (m.slamming) return;
    const t = this.time.now;
    if (m.state === "combat" && d < 100 && t > m.attackAt) {
      m.attackAt = t + 1400;
      m.slamming = true;
      const y0 = sp.y;
      sp.setVelocity(0, 0);
      this.tweens.add({
        targets: sp,
        y: y0 - 42,
        scaleX: base * 0.82,
        scaleY: base * 1.22,
        duration: 180,
        ease: "Quad.easeOut",
        yoyo: true,
        hold: 50,
        onYoyo: () => {
          sfx("slam");
          const ring = this.add.ellipse(sp.x, sp.y + 12, 36, 14, 0xffb060, 0.5).setDepth(4);
          this.tweens.add({ targets: ring, scaleX: 5.5, scaleY: 2.6, alpha: 0, duration: 340, onComplete: () => ring.destroy() });
          this.cameras.main.shake(140, 0.007);
          this.sparks.emitParticleAt(sp.x, sp.y + 4, 14);
        },
        onComplete: () => {
          m.slamming = false;
          sp.setScale(base);
          sp.setRotation(0);
        },
      });
      return;
    }
    const wave = Math.sin(t / (m.state === "combat" ? 150 : 380));
    sp.setScale(base * (1 + wave * 0.06), base * (1 - wave * 0.07));
    sp.setRotation(wave * (m.state === "combat" ? 0.14 : 0.05));
  }
  swingBlade(ang) {
    if (this.bladeTween) this.bladeTween.stop();
    const state = { a: ang - 1.7 };
    this.bladeSwinging = true;
    this.bladeAngle = state.a;
    this.bladeTween = this.tweens.add({
      targets: state,
      a: ang + 1.15,
      duration: 260,
      ease: "Cubic.easeOut",
      onUpdate: () => { this.bladeAngle = state.a; },
      onComplete: () => {
        this.bladeTween = this.tweens.add({
          targets: state,
          a: ang + 0.45,
          duration: 180,
          ease: "Sine.easeOut",
          onUpdate: () => { this.bladeAngle = state.a; },
          onComplete: () => { this.bladeSwinging = false; },
        });
      },
    });
    const g = this.add.graphics().setDepth(8);
    const arc = { t: 0 };
    this.tweens.add({
      targets: arc, t: 1, duration: 260,
      onUpdate: () => {
        g.clear();
        const a = ang - 1.5 + arc.t * 2.4;
        const reach = this.player.displayHeight * 0.85;
        g.lineStyle(Math.max(3, reach * 0.08), 0xfff6d8, 0.75 * (1 - arc.t));
        g.beginPath();
        g.arc(this.player.x, this.player.y - this.player.displayHeight * 0.35, reach, a, a + 0.7, false);
        g.strokePath();
      },
      onComplete: () => g.destroy(),
    });
  }
  placeBlade() {
    if (!this.blade) {
      this.blade = this.add.rectangle(0, 0, 6, 64, 0xf4f1ea).setOrigin(0.5, 0.12).setDepth(12);
      this.bladeEdge = this.add.rectangle(0, 0, 2, 58, 0xe7c56a).setOrigin(0.5, 0.08).setDepth(13);
      this.bladeAngle = 0.7;
    }
    const side = this.player.flipX ? -1 : 1;
    const x = this.player.x + side * this.player.displayWidth * 0.34;
    const handY = this.player.y - this.player.displayHeight * 0.62;
    const len = Math.max(22, this.player.displayHeight * 0.7);
    let ang = this.bladeAngle;
    if (!this.bladeSwinging && this.player.flipX) ang = Math.PI - this.bladeAngle;
    this.blade.setPosition(x, handY).setRotation(ang).setDisplaySize(Math.max(2, len * 0.06), len);
    this.bladeEdge.setPosition(x, handY).setRotation(ang).setDisplaySize(Math.max(1, len * 0.02), len * 0.9);
  }
  toast(msg) {
    const t = this.add.text(this.scale.width / 2, 96, msg, {
      fontFamily: FONT, fontSize: "14px", color: "#e8d59a", backgroundColor: "#140e08", padding: { x: 12, y: 7 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30);
    this.tweens.add({ targets: t, y: 84, alpha: 0, delay: 1500, duration: 300, onComplete: () => t.destroy() });
  }
  floatText(x, y, text, color) {
    const t = this.add.text(x, y, text, {
      fontFamily: TITLE, fontSize: "20px", color, fontStyle: "700",
      stroke: "#1a0c08", strokeThickness: 5,
    }).setOrigin(0.5).setDepth(12);
    t.setScale(0.6);
    this.tweens.add({ targets: t, y: y - 36, scale: 1.15, alpha: 0, duration: 520, ease: "Cubic.easeOut", onComplete: () => t.destroy() });
  }
  update(_, dtMs) {
    const dt = Math.min(0.05, dtMs / 1000);
    const { w, h } = this.view();
    const s = compute();
    let vx = this.stick.ax, vy = this.stick.ay;
    if (this.keys.A.isDown || this.keys.LEFT.isDown) vx -= 1;
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) vx += 1;
    if (this.keys.W.isDown || this.keys.UP.isDown) vy -= 1;
    if (this.keys.S.isDown || this.keys.DOWN.isDown) vy += 1;
    const mag = Math.hypot(vx, vy);
    if (mag > 1) { vx /= mag; vy /= mag; }
    const striking = this.time.now < this.strikeUntil;
    if (!striking) this.player.setVelocity(vx * 250, vy * 250);
    if (!striking) {
      if (vx) this.player.setFlipX(vx < 0);
      this.player.setScale(this.heroScale);
      this.player.setRotation(0);
      if (mag > 0.15 && this.time.now > (this.nextStep || 0)) {
        this.nextStep = this.time.now + 320;
        sfx("step");
      }
    }
    this.placeBlade();

    const px = this.player.x, py = this.player.y;
    const now = this.time.now / 1000;
    const reach = 150;
    const hurt = 26;

    for (const m of this.mobs) {
      if (m.hp <= 0) continue;
      const dHome = Phaser.Math.Distance.Between(px, py, m.homeX, m.homeY);
      const d = Phaser.Math.Distance.Between(px, py, m.sprite.x, m.sprite.y);
      const head = m.sprite.y - m.sprite.displayHeight * 0.95;
      const fighting = m.state === "combat";
      const overhead = fighting && m.kind !== "boss";
      m.barBg.setVisible(overhead).setPosition(m.sprite.x, head);
      m.bar.setVisible(overhead).setPosition(m.sprite.x - (m.barW || 30) / 2, head);
      if (m.shadow) m.shadow.setPosition(m.sprite.x, m.sprite.y + 6);
      m.bar.width = (m.barW || 30) * Math.max(0, m.hp / m.max);
      if (m.state === "idle") {
        if (m.kind === "boss") this.poseBoss(m, d);
        else m.sprite.y = m.homeY + Math.sin(this.time.now / 280 + m.homeX) * 1.4;
        if (d <= m.pull) {
          this.mobs.forEach((o) => {
            if (o.hp > 0 && Phaser.Math.Distance.Between(o.homeX, o.homeY, m.homeX, m.homeY) < 96) {
              o.state = "combat";
              o.sprite.setTint(0xffd0c0);
            }
          });
        }
        continue;
      }
      if (m.state === "combat") {
        if (dHome > m.leash || px < 24 || py < 70 || px > w - 24 || py > h - 36) {
          m.state = "leash";
          m.sprite.clearTint();
          continue;
        }
        const gap = (this.player.displayHeight + m.sprite.displayHeight) * 0.38;
        if (m.slamming) m.sprite.setVelocity(0, 0);
        else if (d < gap && d > 2) {
          const a = Math.atan2(m.sprite.y - py, m.sprite.x - px);
          m.sprite.setPosition(px + Math.cos(a) * gap, py + Math.sin(a) * gap);
          m.sprite.setVelocity(0, 0);
        } else if (d > gap + 4) this.physics.moveToObject(m.sprite, this.player, m.kind === "boss" ? 62 : 74);
        else m.sprite.setVelocity(0, 0);
        if (m.kind === "boss") this.poseBoss(m, d);
        if (d <= gap + 10) {
          const kindMult = m.kind === "boss" ? 1.5 : m.kind === "elite" ? 1.2 : 1;
          let taken = (2.1 + this.tier * 0.38) * kindMult * dt;
          if (this.guardUntil > this.time.now) taken *= 0.35;
          if (this.oathUntil > this.time.now) taken *= 0.7;
          this.hp -= taken;
        }
        continue;
      }
      if (m.state === "leash") {
        const ang = Math.atan2(m.homeY - m.sprite.y, m.homeX - m.sprite.x);
        m.sprite.setVelocity(Math.cos(ang) * 160, Math.sin(ang) * 160);
        if (Phaser.Math.Distance.Between(m.sprite.x, m.sprite.y, m.homeX, m.homeY) < 8) {
          m.sprite.setPosition(m.homeX, m.homeY).setVelocity(0, 0).clearTint();
          m.hp = m.max;
          m.state = "idle";
        }
      }
    }

    if (now >= this.nextSwing) {
      let best = null, bd = 999;
      for (const m of this.mobs) {
        if (m.hp <= 0 || m.state !== "combat") continue;
        const d = Phaser.Math.Distance.Between(px, py, m.sprite.x, m.sprite.y);
        if (d < reach && d < bd) { bd = d; best = m; }
      }
      if (best) this.landHit(best, s, px, py);
    }

    if (this.enrageAt && this.time.now > this.enrageAt) this.hp -= 40 * dt;

    if (!this.advancing) {
      const alive = this.mobs.some((m) => m.hp > 0);
      if (!alive && !this.doorOpen) {
        this.doorOpen = true;
        this.door.setFillStyle(0xffc070, 0.8);
        sfx("door");
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * (this.tier <= 4 ? 1 : 0.3));
        if (this.roomIndex === this.roomsTotal - 1) {
          if (this.forge) {
            this.toast(`${profile.cinders || 0} cinders — buy a brand at the forge`);
          } else if (this.world) {
            profile.lastWorld = Date.now();
            profile.medallions += 8;
            persist();
            this.toast("Terrace down. Honor is on the board.");
          } else {
            profile.currentTier = Math.max(profile.currentTier, this.tier);
            profile.lastClear = Date.now();
            persist();
            this.toast(`${marksOf(this.tier)} ${TIERS[this.tier].name} Marks — the vendor`);
          }
        } else this.toast("Room clear — walk through the door");
      }
      if (this.doorOpen && py < h * 0.24) {
        this.advancing = true;
        this.doorOpen = false;
        this.player.setVelocity(0, 0);
        if (this.roomIndex < this.roomsTotal - 1) {
          this.roomIndex++;
          if (this.roomIndex % 3 === 0) this.checkpoint = this.roomIndex;
          this.cameras.main.fadeOut(100, 7, 6, 10);
          const trip = ++this.travelId;
          this.time.delayedCall(100, () => {
            if (trip !== this.travelId) return;
            this.buildRoom(false);
            this.cameras.main.fadeIn(140, 7, 6, 10);
          });
        } else {
          this.toast(TIERS[this.tier].inst + " falls");
          const trip = ++this.travelId;
          this.time.delayedCall(450, () => {
            if (trip !== this.travelId) return;
            this.scene.start("mall");
          });
        }
      }
    }
    if (this.hp <= 0) {
      this.toast("Wiped — back to the checkpoint");
      this.cameras.main.flash(160, 80, 10, 10);
      this.roomIndex = this.checkpoint;
      this.doorOpen = false;
      const st = compute();
      this.hp = st.hp;
      this.maxHp = st.hp;
      this.buildRoom(false);
    }

    if (!this.joy) {
      this.joy = this.add.circle(0, 0, 46, 0x000000, 0.28).setStrokeStyle(2, 0xd4b56a, 0.45).setScrollFactor(0).setDepth(40).setVisible(false);
      this.joyNub = this.add.circle(0, 0, 16, 0xe8d59a, 0.9).setScrollFactor(0).setDepth(41).setVisible(false);
    }
    this.joy.setVisible(this.stick.down).setPosition(this.stick.sx, this.stick.sy);
    this.joyNub.setVisible(this.stick.down).setPosition(this.stick.sx + this.stick.ax * 26, this.stick.sy + this.stick.ay * 26);

    if (this.playerShadow) this.playerShadow.setPosition(this.player.x, this.player.y + 6);
    if (this.nameTag) this.nameTag.setPosition(this.player.x, this.player.y - this.player.displayHeight - 4);
    const cls = classOf();
    cls.skills.forEach((sk, i) => {
      const slot = this.skillSlots[i + 1];
      if (!slot) return;
      slot.label.setText(sk.name.slice(0, 5).toUpperCase());
      const left = Math.max(0, (this.cds[sk.id] || 0) - this.time.now);
      slot.shade.height = 30 * Math.min(1, left / (sk.cd * 1000));
    });
    const petHit = ((profile.howlUntil || 0) > Date.now() ? 0.45 : 0.8) * 1000;
    this.pets = this.pets.filter((p) => {
      if (this.time.now > p.until || !p.sprite.active) { p.sprite.destroy(); return false; }
      const foe = this.nearestFoe(999);
      if (!foe) return true;
      const ang = Phaser.Math.Angle.Between(p.sprite.x, p.sprite.y, foe.sprite.x, foe.sprite.y);
      p.sprite.x += Math.cos(ang) * 90 * dt;
      p.sprite.y += Math.sin(ang) * 90 * dt;
      if (this.time.now > p.next && Phaser.Math.Distance.Between(p.sprite.x, p.sprite.y, foe.sprite.x, foe.sprite.y) < 36) {
        p.next = this.time.now + petHit;
        this.hurtMob(foe, compute().hit * 0.45);
      }
      return true;
    });

    const bw = this._barW();
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.shownHp += (this.hp - this.shownHp) * Math.min(1, dt * 10);
    this.ghostHp += (this.hp - this.ghostHp) * Math.min(1, dt * 2.2);
    if (this.hp < (this._prevHp ?? this.hp) - 0.4) {
      this.cameras.main.flash(90, 120, 16, 12);
      sfx("hurt");
    }
    this._prevHp = this.hp;
    this.hpFg.width = bw * Math.max(0, this.shownHp / this.maxHp);
    this.hpGhost.width = bw * Math.max(0, this.ghostHp / this.maxHp);
    this.hpFg.setFillStyle(ratio < 0.25 ? 0xff3a32 : 0xc42018);
    const pulse = ratio < 0.25 ? 0.45 + Math.sin(this.time.now / 110) * 0.4 : 0.9;
    this.hpFrame.setStrokeStyle(2, ratio < 0.25 ? 0xff5048 : 0xf0d080, pulse);
    const cd = Math.max(0, this.nextSwing - this.time.now / 1000);
    const frac = s.swing > 0 ? Math.min(1, cd / s.swing) : 0;
    this.skillSlots[0].shade.height = 30 * frac;
    this.mpFg.width = bw * (1 - frac);
    this.hudH.setText(`${(s.haste * 100).toFixed(0)}%`);
    const boss = this.mobs.find((m) => m.kind === "boss" && m.hp > 0);
    const showBoss = !!boss;
    this.bossTrack.setVisible(showBoss);
    this.bossFill.setVisible(showBoss);
    this.bossFrame.setVisible(showBoss);
    this.bossName.setVisible(showBoss);
    if (boss) {
      const bbw = Math.min(300, w * 0.72);
      this.bossFill.width = bbw * (boss.hp / boss.max);
      this.bossName.setText(boss.kind === "boss" ? `${TIERS[this.tier].name.toUpperCase()} WARDEN` : "");
    }
  }
}
