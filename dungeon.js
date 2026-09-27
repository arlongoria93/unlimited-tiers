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
    this.player = this.physics.add.sprite(0, 0, "hero", 0).setDepth(6).setOrigin(0.5, 0.88).setScale(0.34);
    this.heroScale = 0.34;
    this.playerShadow = this.add.ellipse(0, 0, 54, 16, 0x000000, 0.45).setDepth(5);
    this.player.play("hero-idle");
    this.player.body.setSize(70, 40);
    this.player.body.setOffset(61, 175);
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
    this.input.on("pointerdown", (p) => { this.stick.down = true; this.stick.sx = p.x; this.stick.sy = p.y; });
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
    this.hudBar.setPosition(w / 2, h - 86).setSize(w, 86);
    this.hint.setPosition(w / 2, h - 74);
    this.hudH.setPosition(16, h - 52);
    const barY = h - 26;
    this.hpBg.setPosition(w / 2, barY).setSize(bw, 12);
    this.hpGhost.setPosition(w / 2 - bw / 2, barY).setSize(bw, 12);
    this.hpFg.setPosition(w / 2 - bw / 2, barY);
    this.hpFg.height = 12;
    this.hpFrame.setPosition(w / 2, barY).setSize(bw + 8, 18);
    this.mallBtn.setPosition(w - 48, h - 52);
    this.mallLabel.setPosition(w - 48, h - 52);
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
    this.vignette.fillStyle(0x000000, 0.55);
    this.vignette.fillRect(0, 0, w, 18);
    this.vignette.fillRect(0, h - 18, w, 18);
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
    this.roomArt.setTexture(land ? "roomL" : "roomP");
    this.roomArt.setPosition(w / 2, h / 2);
    this.roomArt.setScale(Math.max(w / this.roomArt.width, h / this.roomArt.height));
    this.floorDim.setPosition(0, 0).setSize(w, h).setFillStyle(0x04060c, 0.34);
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
    this.gloom = this.add.rectangle(w / 2, h / 2, w, h, 0x03040a, 0.22).setDepth(2);
    if (this.lamps) this.lamps.forEach((lamp) => lamp.destroy());
    this.lamps = [];
    const spots = land
      ? [[0.13, 0.34], [0.13, 0.7], [0.87, 0.34], [0.87, 0.7]]
      : [[0.17, 0.28], [0.17, 0.64], [0.83, 0.3], [0.83, 0.66]];
    spots.forEach(([sx, sy], i) => {
      const lamp = this.add.image(w * sx, h * sy, "glow").setBlendMode(Phaser.BlendModes.ADD).setDepth(3).setAlpha(0.5);
      lamp.setScale(Math.max(1.1, w / 280));
      this.tweens.add({ targets: lamp, alpha: { from: 0.32, to: 0.62 }, duration: 380 + i * 90, yoyo: true, repeat: -1 });
      this.lamps.push(lamp);
    });
    if (this.props) this.props.forEach((p) => { p.img.destroy(); p.shadow.destroy(); });
    this.props = [];
    const places = land ? [[0.24, 0.74, 0.2], [0.76, 0.28, -0.4], [0.78, 0.76, 0.5]] : [[0.3, 0.76, 0.15], [0.72, 0.74, -0.35]];
    places.forEach(([px, py, rot]) => {
      const img = this.add.image(w * px, h * py, "debris").setDepth(4).setScale(land ? 0.22 : 0.32).setRotation(rot);
      const shadow = this.add.ellipse(w * px, h * py + 10, img.displayWidth * 0.7, 16, 0x000000, 0.4).setDepth(3);
      this.props.push({ img, shadow });
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
        const sc = p.kind === "boss" ? 0.48 : p.kind === "elite" ? 0.36 : 0.32;
        const sprite = this.physics.add.sprite(x, y, tex, 0).setDepth(6).setOrigin(0.5, 0.9).setScale(sc);
        sprite.play(tex + "-idle");
        sprite.body.setImmovable(true);
        const pull = p.kind === "boss" ? Math.min(120, w * 0.2) : Math.min(78, w * 0.15);
        const shadow = this.add.ellipse(x, y + 6, sc * 180, sc * 52, 0x000000, 0.5).setDepth(5);
        const wide = p.kind === "elite" ? 46 : 30;
        const head = y - sprite.displayHeight * 0.92;
        const barBg = this.add.rectangle(x, head, wide, p.kind === "elite" ? 5 : 3, 0x140808).setDepth(7).setVisible(false);
        const bar = this.add.rectangle(x - wide / 2, head, wide, p.kind === "elite" ? 5 : 3, 0x9a1c18).setOrigin(0, 0.5).setDepth(8).setVisible(false);
        if (p.kind === "elite") bar.setStrokeStyle(1, 0xd4b56a, 0.9);
        this.mobs.push({
          sprite, shadow, bar, barBg, barW: wide, kind: p.kind, homeX: x, homeY: y,
          hp: enemyHp(this.tier, p.kind) * (this.world ? 2 : 1), max: enemyHp(this.tier, p.kind) * (this.world ? 2 : 1),
          state: "idle", pull, leash: p.kind === "boss" ? 280 : 210,
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
    this.nextSwing = this.time.now / 1000 + s.swing;
    this.strikeUntil = this.time.now + 110;
    this.player.setFlipX(Math.cos(ang) < 0);
    this.player.setVelocity(Math.cos(ang) * 220, Math.sin(ang) * 220);
    this.tweens.add({ targets: this.player, rotation: ang * 0.25, duration: 70, yoyo: true });
    const arc = { t: 0 };
    const g = this.add.graphics().setDepth(9);
    this.tweens.add({
      targets: arc, t: 1, duration: 150,
      onUpdate: () => {
        g.clear();
        g.lineStyle(4, 0xfff1c4, 0.85 * (1 - arc.t));
        const a = ang - 1.2 + arc.t * 2.4;
        g.beginPath();
        g.arc(this.player.x, this.player.y - 28, 58, a, a + 0.85, false);
        g.strokePath();
      },
      onComplete: () => g.destroy(),
    });
    this.sparks.emitParticleAt(best.sprite.x, best.sprite.y - 10, 8);
    this.floatText(best.sprite.x, best.sprite.y - 22, `${s.hit}`, "#fff4d0");
    this.cameras.main.shake(best.hp <= 0 ? 140 : 70, best.hp <= 0 ? 0.007 : 0.003);
    tone(180 + Math.min(900, s.dps), 0.05);
    best.sprite.setTint(0xffffff);
    this.tweens.add({
      targets: best.sprite,
      scaleX: best.sprite.scaleX * 1.18,
      scaleY: best.sprite.scaleY * 0.82,
      duration: 50, yoyo: true,
    });
    if (best.hp <= 0) {
      best.state = "dead";
      this.sparks.emitParticleAt(best.sprite.x, best.sprite.y, 18);
      if (best.shadow) best.shadow.destroy();
      if (best.bar) best.bar.destroy();
      if (best.barBg) best.barBg.destroy();
      const mode = this.forge ? "forge" : this.world ? "world" : "pit";
      this.floatText(best.sprite.x, best.sprite.y - 40, grantKill(best.kind, this.tier, mode), "#7ee0e6");
      this.tweens.add({
        targets: best.sprite, alpha: 0, y: best.sprite.y - 36, angle: 28, duration: 280,
        onComplete: () => best.sprite.destroy(),
      });
    } else {
      this.time.delayedCall(70, () => { if (best.hp > 0) best.sprite.setTint(0xffd0c0); });
    }
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
  toast(msg) {
    const t = this.add.text(this.scale.width / 2, 96, msg, {
      fontFamily: FONT, fontSize: "14px", color: "#e8d59a", backgroundColor: "#140e08", padding: { x: 12, y: 7 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30);
    this.tweens.add({ targets: t, y: 84, alpha: 0, delay: 1500, duration: 300, onComplete: () => t.destroy() });
  }
  floatText(x, y, text, color) {
    const t = this.add.text(x, y, text, { fontFamily: FONT, fontSize: "13px", color, fontStyle: "700" }).setOrigin(0.5).setDepth(12);
    this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 420, onComplete: () => t.destroy() });
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
      if (mag > 0.15) {
        const bob = Math.sin(this.time.now / 90) * 0.035;
        this.player.setScale(this.heroScale + bob, this.heroScale - bob * 0.6);
        this.player.setRotation(vx * 0.12);
      } else {
        const breathe = 1 + Math.sin(this.time.now / 420) * 0.015;
        this.player.setScale(this.heroScale * breathe, this.heroScale * (2 - breathe));
        this.player.setRotation(0);
      }
    }

    const px = this.player.x, py = this.player.y;
    const now = this.time.now / 1000;
    const reach = 78;
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
        m.sprite.y = m.homeY + Math.sin(this.time.now / 280 + m.homeX) * 1.4;
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
        if (d > hurt + 8) this.physics.moveToObject(m.sprite, this.player, m.kind === "boss" ? 62 : 74);
        else m.sprite.setVelocity(0, 0);
        if (d <= hurt) {
          const kindMult = m.kind === "boss" ? 1.5 : m.kind === "elite" ? 1.2 : 1;
          this.hp -= (2.1 + this.tier * 0.38) * kindMult * dt;
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

    const bw = this._barW();
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.shownHp += (this.hp - this.shownHp) * Math.min(1, dt * 10);
    this.ghostHp += (this.hp - this.ghostHp) * Math.min(1, dt * 2.2);
    if (this.hp < (this._prevHp ?? this.hp) - 0.4) this.cameras.main.flash(90, 120, 16, 12);
    this._prevHp = this.hp;
    this.hpFg.width = bw * Math.max(0, this.shownHp / this.maxHp);
    this.hpGhost.width = bw * Math.max(0, this.ghostHp / this.maxHp);
    this.hpFg.setFillStyle(ratio < 0.25 ? 0xff3a32 : 0x9a1a18);
    const pulse = ratio < 0.25 ? 0.45 + Math.sin(this.time.now / 110) * 0.4 : 0.85;
    this.hpFrame.setStrokeStyle(2, ratio < 0.25 ? 0xff5048 : 0xc4a15a, pulse);
    this.hudH.setText(`SWING  ${s.swing.toFixed(2)}s`);
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
