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
    this.player = this.physics.add.sprite(0, 0, "hero", 0).setDepth(6).setOrigin(0.5, 0.88).setScale(0.24);
    this.player.play("hero-idle");
    this.player.body.setSize(70, 40);
    this.player.body.setOffset(61, 175);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.walls);
    this.sparks = this.add.particles(0, 0, "spark", {
      lifespan: 420, speed: { min: 20, max: 80 }, scale: { start: 0.7, end: 0 },
      emitting: false, quantity: 6, blendMode: "ADD",
    }).setDepth(8);
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
    this.hudBar = this.add.rectangle(0, 0, 10, 78, 0x07060a, 0.78).setOrigin(0.5, 0).setScrollFactor(0).setDepth(20);
    this.hudH = this.add.text(16, 8, "", { fontFamily: FONT, fontSize: "13px", color: "#c8efe8" }).setScrollFactor(0).setDepth(21);
    this.hint = this.add.text(0, 28, "", { fontFamily: TITLE, fontSize: "13px", color: "#e8d59a" }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(21);
    this.hpBg = this.add.rectangle(0, 58, 10, 8, 0x2a1518).setScrollFactor(0).setDepth(21);
    this.hpFg = this.add.rectangle(0, 58, 10, 8, 0xc44).setOrigin(0, 0.5).setScrollFactor(0).setDepth(22);
    this.hpFrame = this.add.rectangle(0, 58, 10, 12).setStrokeStyle(1, 0xd4b56a, 0.35).setScrollFactor(0).setDepth(22);
    this.mallBtn = this.add.rectangle(0, 0, 104, 40, 0x1a1610).setStrokeStyle(1, 0xd4b56a, 0.45).setScrollFactor(0).setDepth(20).setInteractive();
    this.mallLabel = this.add.text(0, 0, "MALL", { fontFamily: TITLE, fontSize: "12px", color: "#e8d59a" }).setOrigin(0.5).setScrollFactor(0).setDepth(21);
    this.mallBtn.on("pointerup", () => this.scene.start("mall"));
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
    this.hudBar.setPosition(w / 2, h - 78).setSize(w, 78);
    this.hudH.setPosition(16, h - 70);
    this.hint.setPosition(w / 2, h - 50);
    this.hpBg.setPosition(w / 2, h - 22).setSize(bw, 8);
    this.hpFg.setPosition(w / 2 - bw / 2, h - 22);
    this.hpFrame.setPosition(w / 2, h - 22).setSize(bw + 4, 12);
    this.mallBtn.setPosition(w - 62, 28);
    this.mallLabel.setPosition(w - 62, 28);
    this.drawVignette(TIERS[this.tier].fog);
  }
  drawVignette(fog) {
    const { w, h } = this.view();
    this.vignette.clear();
    this.vignette.fillStyle(fog, 0.2);
    this.vignette.fillRect(0, h - 86, w, 86);
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
    this.floorDim.setPosition(0, 0).setSize(w, h).setFillStyle(T.floor, 0.1);
    this.walls.clear(true, true);
    this.mobs.forEach((m) => {
      m.sprite.destroy();
      if (m.ring) m.ring.destroy();
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
        const sc = p.kind === "boss" ? 0.34 : p.kind === "elite" ? 0.26 : 0.22;
        const sprite = this.physics.add.sprite(x, y, tex, 0).setDepth(5).setOrigin(0.5, 0.88).setScale(sc);
        sprite.play(tex + "-idle");
        sprite.body.setImmovable(true);
        const pull = p.kind === "boss" ? Math.min(120, w * 0.2) : Math.min(78, w * 0.15);
        const shadow = this.add.ellipse(x, y + 4, sc * 150, sc * 48, 0x000000, 0.4).setDepth(4);
        const ring = this.add.ellipse(x, y + 6, pull * 1.35, pull * 0.42).setStrokeStyle(1, 0xffb060, 0.22).setDepth(2);
        const head = y - sprite.displayHeight * 0.95;
        const barBg = this.add.rectangle(x, head, 36, 4, 0x1a1010).setDepth(7).setVisible(false);
        const bar = this.add.rectangle(x - 18, head, 36, 4, 0xc44).setOrigin(0, 0.5).setDepth(8).setVisible(false);
        this.mobs.push({
          sprite, ring, shadow, bar, barBg, kind: p.kind, homeX: x, homeY: y,
          hp: enemyHp(this.tier, p.kind) * (this.world ? 2 : 1), max: enemyHp(this.tier, p.kind) * (this.world ? 2 : 1),
          state: "idle", pull, leash: p.kind === "boss" ? 280 : 210,
        });
      }
    });

    this.enrageAt = last && this.tier >= 13 ? this.time.now + (this.tier === 16 ? 180000 : 140000) : 0;
    this.hint.setText(`${T.inst}   ${this.roomIndex + 1} / ${this.roomsTotal}`);
    this.fitHud();
    this.advancing = false;
    this._fitLock = false;
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
    this.player.setVelocity(vx * 250, vy * 250);
    if (vx) this.player.setFlipX(vx < 0);

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
      m.barBg.setVisible(fighting).setPosition(m.sprite.x, head);
      m.bar.setVisible(fighting).setPosition(m.sprite.x - 18, head);
      if (m.shadow) m.shadow.setPosition(m.sprite.x, m.sprite.y + 4);
      if (m.ring) m.ring.setPosition(m.sprite.x, m.sprite.y + 6);
      m.bar.width = 34 * Math.max(0, m.hp / m.max);
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
      if (best) {
        best.hp -= s.hit;
        this.nextSwing = now + s.swing;
        const slash = this.add.image(best.sprite.x, best.sprite.y, "slash").setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
        slash.setRotation(Phaser.Math.Angle.Between(px, py, best.sprite.x, best.sprite.y));
        this.tweens.add({ targets: slash, alpha: 0, scale: 1.4, duration: 140, onComplete: () => slash.destroy() });
        this.sparks.emitParticleAt(best.sprite.x, best.sprite.y, 7);
        this.floatText(best.sprite.x, best.sprite.y - 18, `${s.hit}`, "#fff4d0");
        tone(220 + Math.min(800, s.dps), 0.05);
        if (best.hp <= 0) {
          this.sparks.emitParticleAt(best.sprite.x, best.sprite.y, 16);
          best.state = "dead";
          best.sprite.destroy();
          if (best.ring) best.ring.destroy();
          if (best.shadow) best.shadow.destroy();
          if (best.bar) best.bar.destroy();
          if (best.barBg) best.barBg.destroy();
          const mode = this.forge ? "forge" : this.world ? "world" : "pit";
          this.floatText(best.sprite.x, best.sprite.y - 36, grantKill(best.kind, this.tier, mode), "#7ee0e6");
        }
      }
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

    const bw = this._barW();
    const bossSec = enemyHp(this.tier, "boss") / Math.max(0.01, s.dps);
    this.hudH.setText(`Swing ${s.swing.toFixed(2)}s  Hit ${s.hit}  DPS ${s.dps.toFixed(0)}  boss ~${bossSec.toFixed(0)}s`);
    this.hpFg.width = bw * Math.max(0, this.hp / this.maxHp);
    this.hpFg.setFillStyle(this.hp / this.maxHp < 0.3 ? 0xe04040 : 0xc44);
  }
}
