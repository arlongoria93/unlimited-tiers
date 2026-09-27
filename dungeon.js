class DungeonScene extends Phaser.Scene {
  constructor() { super("dungeon"); }
  init(data) { this.tier = data.tier || 1; }
  create() {
    bootTextures(this);
    const T = TIERS[this.tier];
    this.roomsTotal = T.rooms;
    this.roomIndex = 0;
    this.checkpoint = 0;
    this.enrageAt = 0;
    const s = compute();
    this.hp = s.hp; this.maxHp = s.hp; this.nextSwing = 0;
    this.stick = { ax: 0, ay: 0, down: false };
    makeTex(this, "floor", 64, 64, (g) => {
      g.fillStyle(T.floor, 1); g.fillRect(0, 0, 64, 64);
      g.lineStyle(1, T.color, 0.08); g.strokeRect(0.5, 0.5, 63, 63);
      g.fillStyle(T.color, 0.05); g.fillRect(8, 8, 6, 6); g.fillRect(40, 36, 5, 5);
    });
    makeTex(this, "trash", 36, 36, (g) => {
      g.fillStyle(0x000000, 0.35); g.fillEllipse(18, 30, 18, 6);
      g.fillStyle(T.color, 1); g.fillCircle(18, 16, 12);
      g.fillStyle(0x1a0c0c, 1); g.fillCircle(14, 14, 2.4); g.fillCircle(22, 14, 2.4);
    });
    makeTex(this, "elite", 42, 42, (g) => {
      g.fillStyle(0x000000, 0.35); g.fillEllipse(21, 36, 22, 7);
      g.fillStyle(0xe0c070, 1); g.fillCircle(21, 18, 14);
      g.fillStyle(T.color, 1); g.fillTriangle(21, 2, 16, 12, 26, 12);
      g.fillStyle(0x1a0c0c, 1); g.fillCircle(16, 17, 2.6); g.fillCircle(26, 17, 2.6);
    });
    makeTex(this, "boss", 64, 64, (g) => {
      g.fillStyle(0x000000, 0.4); g.fillEllipse(32, 56, 36, 10);
      g.fillStyle(0x6a1820, 1); g.fillCircle(32, 30, 22);
      g.fillStyle(T.color, 1); g.fillTriangle(32, 4, 22, 22, 42, 22);
      g.fillStyle(0xffe8a0, 1); g.fillCircle(24, 28, 3.2); g.fillCircle(40, 28, 3.2);
    });
    makeTex(this, "ring", 160, 160, (g) => {
      g.lineStyle(3, T.color, 0.35); g.strokeCircle(80, 80, 74);
      g.lineStyle(1, 0xffffff, 0.12); g.strokeCircle(80, 80, 68);
    });
    makeTex(this, "torch", 16, 28, (g) => {
      g.fillStyle(0x3a2a18, 1); g.fillRect(6, 12, 4, 14);
      g.fillStyle(0xffb040, 1); g.fillCircle(8, 10, 6);
      g.fillStyle(0xfff2b0, 1); g.fillCircle(8, 8, 3);
    });
    this.cameras.main.setBackgroundColor(T.floor);
    this.physics.world.setBounds(0, 0, 720, 1280);
    this.add.tileSprite(360, 640, 720, 1280, "floor").setDepth(0);
    this.walls = this.physics.add.staticGroup();
    this.mobs = [];
    this.door = null;
    this.player = this.physics.add.sprite(360, 1040, "player").setDepth(6);
    this.player.body.setCircle(14, 6, 10);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.walls);
    this.sparks = this.add.particles(0, 0, "spark", {
      lifespan: 420, speed: { min: 20, max: 80 }, scale: { start: 0.7, end: 0 },
      emitting: false, quantity: 6, blendMode: "ADD",
    }).setDepth(8);
    this.vignette = this.add.graphics().setScrollFactor(0).setDepth(15);
    this.drawVignette(T.fog);
    this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT");
    this.input.on("pointerdown", (p) => { this.stick.down = true; this.stick.sx = p.x; this.stick.sy = p.y; });
    this.input.on("pointerup", () => { this.stick.down = false; this.stick.ax = 0; this.stick.ay = 0; });
    this.input.on("pointermove", (p) => {
      if (!this.stick.down) return;
      const dx = p.x - this.stick.sx, dy = p.y - this.stick.sy;
      const m = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, m / 48);
      this.stick.ax = (dx / m) * k; this.stick.ay = (dy / m) * k;
    });
    this.add.rectangle(360, 0, 720, 86, 0x07060a, 0.72).setOrigin(0.5, 0).setScrollFactor(0).setDepth(20);
    this.hudH = this.add.text(16, 10, "", { fontFamily: FONT, fontSize: "13px", color: "#c8efe8" }).setScrollFactor(0).setDepth(21);
    this.hint = this.add.text(360, 32, "", { fontFamily: TITLE, fontSize: "13px", color: "#e8d59a" }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(21);
    this.add.rectangle(360, 68, 300, 8, 0x2a1518).setScrollFactor(0).setDepth(21);
    this.hpFg = this.add.rectangle(210, 68, 300, 8, 0xc44).setOrigin(0, 0.5).setScrollFactor(0).setDepth(22);
    this.add.rectangle(360, 68, 304, 12).setStrokeStyle(1, 0xd4b56a, 0.25).setScrollFactor(0).setDepth(22);
    const mall = this.add.rectangle(64, 1244, 104, 36, 0x1a1610).setStrokeStyle(1, 0xd4b56a, 0.45).setScrollFactor(0).setDepth(20).setInteractive();
    this.add.text(64, 1244, "MALL", { fontFamily: TITLE, fontSize: "12px", color: "#e8d59a" }).setOrigin(0.5).setScrollFactor(0).setDepth(21);
    mall.on("pointerup", () => this.scene.start("mall"));
    this.buildRoom();
    this.cameras.main.fadeIn(220, 7, 6, 10);
  }
  drawVignette(fog) {
    this.vignette.clear();
    this.vignette.fillStyle(fog, 0.18);
    this.vignette.fillRect(0, 0, this.scale.width, 90);
    this.vignette.fillRect(0, this.scale.height - 90, this.scale.width, 90);
  }
  buildRoom() {
    this.walls.clear(true, true);
    this.mobs.forEach((m) => { m.sprite.destroy(); if (m.ring) m.ring.destroy(); if (m.bar) m.bar.destroy(); if (m.barBg) m.barBg.destroy(); });
    this.mobs = [];
    if (this.door) this.door.destroy();
    if (this.torches) this.torches.forEach((t) => t.destroy());
    this.torches = [];
    this.doorOpen = false;
    const T = TIERS[this.tier];
    const last = this.roomIndex === this.roomsTotal - 1;
    [[360, 40, 720, 28], [360, 1260, 720, 28], [16, 640, 28, 1280], [704, 640, 28, 1280]].forEach((w) => {
      const wall = this.walls.create(w[0], w[1], "wallpx");
      wall.setDisplaySize(w[2], w[3]).setTint(T.floor).refreshBody();
    });
    this.door = this.add.rectangle(360, 58, 96, 18, 0x6a2424).setStrokeStyle(2, 0xd4b56a, 0.35).setDepth(3);
    [[48, 120], [672, 120], [48, 980], [672, 980]].forEach((p) => {
      const tch = this.add.image(p[0], p[1], "torch").setDepth(2);
      this.tweens.add({ targets: tch, scale: { from: 0.95, to: 1.12 }, duration: 380, yoyo: true, repeat: -1 });
      this.torches.push(tch);
    });
    this.player.setPosition(360, 1080);
    const packs = last
      ? [{ kind: "boss", x: 360, y: 430, n: 1 }]
      : [{ kind: "trash", x: 220, y: 540, n: 2 }, { kind: "trash", x: 520, y: 390, n: this.tier >= 5 ? 2 : 1 }];
    if (!last && this.tier >= 9 && this.roomIndex % 2 === 1) packs.push({ kind: "elite", x: 360, y: 270, n: 1 });
    packs.forEach((p) => {
      for (let i = 0; i < p.n; i++) {
        const x = p.x + (i - (p.n - 1) / 2) * 36;
        const y = p.y + (i % 2) * 16;
        const sprite = this.physics.add.sprite(x, y, p.kind).setDepth(5);
        sprite.body.setImmovable(true);
        const pull = p.kind === "boss" ? 118 : 76;
        const ring = this.add.image(x, y, "ring").setDisplaySize(pull * 2, pull * 2).setDepth(1).setAlpha(0.8);
        this.tweens.add({ targets: ring, alpha: { from: 0.35, to: 0.85 }, duration: 900, yoyo: true, repeat: -1 });
        const barBg = this.add.rectangle(x, y - 28, 34, 4, 0x2a1515).setDepth(7);
        const bar = this.add.rectangle(x - 17, y - 28, 34, 4, 0xc44).setOrigin(0, 0.5).setDepth(8);
        this.mobs.push({ sprite, ring, bar, barBg, kind: p.kind, homeX: x, homeY: y, hp: enemyHp(this.tier, p.kind), max: enemyHp(this.tier, p.kind), state: "idle", pull, leash: p.kind === "boss" ? 250 : 196 });
      }
    });
    this.enrageAt = last && this.tier >= 13 ? this.time.now + (this.tier === 16 ? 180000 : 140000) : 0;
    this.hint.setText(`${T.inst}   ${this.roomIndex + 1} / ${this.roomsTotal}`);
  }
  toast(msg) {
    const t = this.add.text(360, 100, msg, { fontFamily: FONT, fontSize: "14px", color: "#e8d59a", backgroundColor: "#140e08", padding: { x: 12, y: 7 } }).setOrigin(0.5).setScrollFactor(0).setDepth(30);
    this.tweens.add({ targets: t, y: 88, alpha: 0, delay: 1500, duration: 300, onComplete: () => t.destroy() });
  }
  floatText(x, y, text, color) {
    const t = this.add.text(x, y, text, { fontFamily: FONT, fontSize: "13px", color, fontStyle: "700" }).setOrigin(0.5).setDepth(12);
    this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 420, onComplete: () => t.destroy() });
  }
  update(_, dtMs) {
    const dt = Math.min(0.05, dtMs / 1000);
    const s = compute();
    let vx = this.stick.ax, vy = this.stick.ay;
    if (this.keys.W.isDown || this.keys.UP.isDown) vy -= 1;
    if (this.keys.S.isDown || this.keys.DOWN.isDown) vy += 1;
    if (this.keys.A.isDown || this.keys.LEFT.isDown) vx -= 1;
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) vx += 1;
    const mag = Math.hypot(vx, vy);
    if (mag > 1) { vx /= mag; vy /= mag; }
    this.player.setVelocity(vx * 250, vy * 250);
    if (vx || vy) this.player.setFlipX(vx < 0);
    const px = this.player.x, py = this.player.y;
    const now = this.time.now / 1000;
    for (const m of this.mobs) {
      if (m.hp <= 0) continue;
      const dHome = Phaser.Math.Distance.Between(px, py, m.homeX, m.homeY);
      const d = Phaser.Math.Distance.Between(px, py, m.sprite.x, m.sprite.y);
      m.barBg.setPosition(m.sprite.x, m.sprite.y - 28);
      m.bar.setPosition(m.sprite.x - 17, m.sprite.y - 28);
      m.bar.width = 34 * Math.max(0, m.hp / m.max);
      if (m.state === "idle") {
        m.sprite.y = m.homeY + Math.sin(this.time.now / 280 + m.homeX) * 1.4;
        if (d <= m.pull) {
          this.mobs.forEach((o) => {
            if (o.hp > 0 && Phaser.Math.Distance.Between(o.homeX, o.homeY, m.homeX, m.homeY) < 92) {
              o.state = "combat"; o.sprite.setTint(0xffd0c0);
            }
          });
        }
        continue;
      }
      if (m.state === "combat") {
        if (dHome > m.leash) { m.state = "leash"; m.sprite.clearTint(); continue; }
        if (d > 36) this.physics.moveToObject(m.sprite, this.player, 96);
        else {
          m.sprite.setVelocity(0, 0);
          this.hp -= (7 + this.tier * 1.5) * dt * (m.kind === "boss" ? 2.1 : m.kind === "elite" ? 1.3 : 1);
        }
        continue;
      }
      if (m.state === "leash") {
        const ang = Math.atan2(m.homeY - m.sprite.y, m.homeX - m.sprite.x);
        m.sprite.setVelocity(Math.cos(ang) * 170, Math.sin(ang) * 170);
        if (Phaser.Math.Distance.Between(m.sprite.x, m.sprite.y, m.homeX, m.homeY) < 8) {
          m.sprite.setPosition(m.homeX, m.homeY).setVelocity(0, 0).clearTint();
          m.hp = m.max; m.state = "idle";
        }
      }
    }
    if (now >= this.nextSwing) {
      let best = null, bd = 999;
      for (const m of this.mobs) {
        if (m.hp <= 0 || m.state !== "combat") continue;
        const d = Phaser.Math.Distance.Between(px, py, m.sprite.x, m.sprite.y);
        if (d < 46 && d < bd) { bd = d; best = m; }
      }
      if (best) {
        best.hp -= s.hit;
        this.nextSwing = now + s.swing;
        const sl = this.add.image(best.sprite.x, best.sprite.y, "slash").setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
        sl.setRotation(Phaser.Math.Angle.Between(px, py, best.sprite.x, best.sprite.y));
        this.tweens.add({ targets: sl, alpha: 0, scale: 1.4, duration: 140, onComplete: () => sl.destroy() });
        this.sparks.emitParticleAt(best.sprite.x, best.sprite.y, 7);
        this.floatText(best.sprite.x, best.sprite.y - 18, `${s.hit}`, "#fff4d0");
        this.cameras.main.shake(40, 0.002);
        if (best.hp <= 0) {
          this.sparks.emitParticleAt(best.sprite.x, best.sprite.y, 16);
          best.state = "dead";
          best.sprite.destroy();
          if (best.ring) best.ring.destroy();
          if (best.bar) best.bar.destroy();
          if (best.barBg) best.barBg.destroy();
          profile.medallions += best.kind === "boss" ? 5 : best.kind === "elite" ? 2 : 1;
        }
      }
    }
    if (this.enrageAt && this.time.now > this.enrageAt) this.hp -= 70 * dt;
    const alive = this.mobs.some((m) => m.hp > 0);
    if (!alive && !this.doorOpen) {
      this.doorOpen = true;
      this.door.setFillStyle(0x1e5a32);
      this.tweens.add({ targets: this.door, scaleX: 1.08, yoyo: true, duration: 180, repeat: 2 });
      if (this.roomIndex === this.roomsTotal - 1) {
        this.toast(dropPiece(this.tier, TIERS[this.tier].inst));
        profile.currentTier = Math.max(profile.currentTier, this.tier);
        const nxt = this.tier === 8 ? 9 : this.tier + 1;
        if (nxt <= 16 && highestWeapon() >= (nxt === 9 ? 7 : this.tier)) profile.attuned[nxt] = true;
        persist();
      } else this.toast("Room clear — walk through the door");
    }
    if (this.doorOpen && py < 92) {
      if (this.roomIndex < this.roomsTotal - 1) {
        this.roomIndex++;
        if (this.roomIndex % 3 === 0) this.checkpoint = this.roomIndex;
        this.cameras.main.fadeOut(120, 7, 6, 10);
        this.time.delayedCall(120, () => { this.buildRoom(); this.cameras.main.fadeIn(160, 7, 6, 10); });
      } else {
        this.toast(TIERS[this.tier].inst + " falls");
        this.time.delayedCall(500, () => this.scene.start("mall"));
      }
    }
    if (this.hp <= 0) {
      this.toast("Wiped — checkpoint");
      this.cameras.main.flash(180, 80, 10, 10);
      this.roomIndex = this.checkpoint;
      const st = compute();
      this.hp = st.hp; this.maxHp = st.hp;
      this.buildRoom();
    }
    this.hudH.setText(`Haste  ${(s.haste * 100).toFixed(0)}%     Swing  ${s.swing.toFixed(2)}s     Med  ${profile.medallions}`);
    this.hpFg.width = 300 * Math.max(0, this.hp / this.maxHp);
    this.hpFg.setFillStyle(this.hp / this.maxHp < 0.3 ? 0xe04040 : 0xc44);
  }
}
