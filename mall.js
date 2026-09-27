class MallScene extends Phaser.Scene {
  constructor() { super("mall"); }
  create() {
    const { width: w, height: h } = this.scale;
    bootTextures(this);
    this.cameras.main.setBackgroundColor(0x07060a);

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x140e08, 0x140e08, 0x07060a, 0x07060a, 1);
    bg.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) {
      const x = Phaser.Math.Between(10, w), y = Phaser.Math.Between(0, h);
      this.add.circle(x, y, Phaser.Math.Between(1, 2), 0xd4b56a, 0.15);
    }
    this.add.rectangle(w / 2, 0, w, 6, 0xd4b56a).setOrigin(0.5, 0).setAlpha(0.7);

    const land = w > h;
    this.add.text(w / 2, land ? 10 : 22, "UNLIMITED", {
      fontFamily: TITLE, fontSize: Math.min(land ? 26 : 34, w * 0.08) + "px", color: "#e8d59a",
    }).setOrigin(0.5, 0);
    this.add.text(w / 2, land ? 38 : 58, "T I E R S", {
      fontFamily: TITLE, fontSize: "12px", color: "#7ee0e6",
    }).setOrigin(0.5, 0);

    const s = compute();
    this.add.text(w / 2, land ? 56 : 82, `Haste ${(s.haste * 100).toFixed(0)}%   Swing ${s.swing.toFixed(2)}s   Med ${profile.medallions}`, {
      fontFamily: FONT, fontSize: "13px", color: "#c8c4b8",
    }).setOrigin(0.5, 0);

    const cols = land ? 8 : 4;
    const pad = 8;
    const top = land ? 82 : 112;
    const rowCount = Math.ceil(16 / cols);
    const bh = Math.max(46, Math.min(64, (h - top - 58 - pad * rowCount) / rowCount));
    const bw = (w - pad * (cols + 1)) / cols;
    for (let t = 1; t <= 16; t++) {
      const col = (t - 1) % cols, row = Math.floor((t - 1) / cols);
      const x = pad + col * (bw + pad) + bw / 2;
      const y = top + row * (bh + pad) + bh / 2;
      const locked = !profile.attuned[t] && highestWeapon() < (t === 9 ? 7 : t - 1) && profile.medallions < 20 * t;
      const card = this.add.rectangle(x, y, bw, bh, locked ? 0x121018 : 0x16141c)
        .setStrokeStyle(2, TIERS[t].color, locked ? 0.25 : 0.9)
        .setInteractive({ useHandCursor: true });
      if (!locked) {
        const glow = this.add.rectangle(x, y, bw + 6, bh + 6, TIERS[t].color, 0.07);
        glow.setDepth(card.depth - 1);
      }
      this.add.text(x, y - 12, `T${t}`, { fontFamily: TITLE, fontSize: "15px", color: locked ? "#555" : "#f0ead8" }).setOrigin(0.5);
      this.add.text(x, y + 8, TIERS[t].name, { fontFamily: FONT, fontSize: "11px", color: locked ? "#555" : "#9aa8a8" }).setOrigin(0.5);
      this.add.text(x, y + 22, profile.attuned[t] ? "OPEN" : locked ? "SEALED" : "ATTUNE", {
        fontFamily: FONT, fontSize: "9px", color: profile.attuned[t] ? "#7ee0e6" : "#7a7468",
      }).setOrigin(0.5);
      card.on("pointerover", () => card.setFillStyle(0x1e1c28));
      card.on("pointerout", () => card.setFillStyle(locked ? 0x121018 : 0x16141c));
      card.on("pointerup", () => this.enter(t, locked));
    }

    this.btn(w * 0.18, h - 28, "VENDOR", () => this.scene.start("vendor"));
    this.btn(w * 0.5, h - 28, "DAILIES", () => this.dailies());
    this.btn(w * 0.82, h - 28, "EQUIP BEST", () => this.equipBest());

    const s0 = compute();
    this.formula = this.add.text(w / 2, h - 108, "swing = max(0.20, 1 / (1 + haste))", {
      fontFamily: FONT, fontSize: "11px", color: "#8a8680",
    }).setOrigin(0.5);
    this.feelReadout = this.add.text(w / 2, h - 90, "", {
      fontFamily: FONT, fontSize: "13px", color: "#7ee0e6",
    }).setOrigin(0.5);
    this.dummy = this.add.circle(w - 36, h - 150, 22, 0x3a2418).setStrokeStyle(2, 0xd4b56a);
    this.add.text(w - 36, h - 150, "DUMMY", { fontFamily: FONT, fontSize: "8px", color: "#e8d59a" }).setOrigin(0.5);
    this.nextSwingAt = 0;
    this.paintFeel(s0);

    const chips = [null, 0, 1, 4, 7, 12];
    const cw = Math.min(52, (w - 24) / chips.length - 4);
    chips.forEach((tier, i) => {
      const x = 16 + cw / 2 + i * (cw + 4);
      const on = previewTier === tier;
      const chip = this.add.rectangle(x, h - 68, cw, 26, on ? 0x2a2214 : 0x141218)
        .setStrokeStyle(1, on ? 0xd4b56a : 0x3a3428).setInteractive({ useHandCursor: true });
      this.add.text(x, h - 68, tier == null ? "MINE" : `T${tier}`, {
        fontFamily: FONT, fontSize: "11px", color: on ? "#e8d59a" : "#c8c4b8",
      }).setOrigin(0.5);
      chip.on("pointerup", () => { previewTier = tier; this.scene.restart(); });
    });

    this.scale.on("resize", () => this.scene.restart());
  }
  paintFeel(s) {
    const tag = s.preview == null ? "your gear" : `preview T${s.preview} full set`;
    this.feelReadout.setText(`${tag}   ${(s.haste * 100).toFixed(0)}% haste   ${s.swing.toFixed(2)}s   hit ${s.hit}   ${s.dps.toFixed(0)} dps`);
  }
  btn(x, y, label, fn) {
    const r = this.add.rectangle(x, y, 108, 38, 0x1a1610).setStrokeStyle(1, 0xd4b56a, 0.45).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontFamily: TITLE, fontSize: "11px", color: "#e8d59a" }).setOrigin(0.5);
    r.on("pointerup", fn);
  }
  enter(t, locked) {
    if (locked) return this.toast("Sealed");
    if (!profile.attuned[t]) {
      const need = t === 9 ? 7 : t - 1;
      if (highestWeapon() < need) {
        const cost = 20 * t;
        if (profile.medallions < cost) return this.toast(`Need T${need} blade or ${cost} med`);
        profile.medallions -= cost;
      }
      profile.attuned[t] = true; persist();
    }
    this.cameras.main.fadeOut(180, 7, 6, 10);
    previewTier = null;
    this.time.delayedCall(180, () => this.scene.start("dungeon", { tier: t }));
  }
  dailies() {
    const now = Date.now();
    if (now - (profile.lastDaily || 0) < 20 * 3600 * 1000) return this.toast("Already claimed");
    const pay = (10 + (profile.currentTier || 1) * 2) * 3;
    profile.medallions += pay; profile.lastDaily = now; persist();
    this.toast(`Tribute +${pay} medallions`);
    this.time.delayedCall(500, () => this.scene.restart());
  }
  equipBest() {
    for (const slot of SLOTS) {
      let best = -1, id = profile.equipped[slot];
      for (const own of profile.owned) {
        const it = itemOf(own);
        if (it && it.slot === slot && it.tier >= best) { best = it.tier; id = own; }
      }
      profile.equipped[slot] = id;
    }
    persist(); this.toast("Best set equipped"); this.time.delayedCall(400, () => this.scene.restart());
  }
  toast(msg) {
    const t = this.add.text(this.scale.width / 2, 108, msg, {
      fontFamily: FONT, fontSize: "13px", color: "#e8d59a", backgroundColor: "#1a140c", padding: { x: 12, y: 7 },
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: 96, alpha: 0, delay: 1400, duration: 280, onComplete: () => t.destroy() });
  }
  update() {
    const s = compute();
    if (this.time.now < this.nextSwingAt) return;
    this.nextSwingAt = this.time.now + s.swing * 1000;
    this.dummy.setFillStyle(0xffe0a0);
    this.time.delayedCall(70, () => this.dummy && this.dummy.setFillStyle(0x3a2418));
    const pop = this.add.text(this.dummy.x, this.dummy.y - 28, `+${s.hit}`, {
      fontFamily: FONT, fontSize: "13px", color: "#fff4d0",
    }).setOrigin(0.5).setDepth(5);
    this.tweens.add({ targets: pop, y: pop.y - 18, alpha: 0, duration: Math.min(400, s.swing * 800), onComplete: () => pop.destroy() });
  }
}

class ShopScene extends Phaser.Scene {
  constructor() { super("shop"); }
  create() {
    const { width: w, height: h } = this.scale;
    this.cameras.main.setBackgroundColor(0x07060a);
    this.add.rectangle(w / 2, 0, w, 6, 0xd4b56a).setOrigin(0.5, 0);
    this.add.text(w / 2, 24, "FORTUNE DESK", { fontFamily: TITLE, fontSize: "22px", color: "#e8d59a" }).setOrigin(0.5, 0);
    this.add.text(w / 2, 54, "Extra marks for the tier you are on. Never the piece itself.", {
      fontFamily: FONT, fontSize: "12px", color: "#8a8680", wordWrap: { width: w - 40 },
    }).setOrigin(0.5, 0);
    this.add.text(20, 80, `Med ${profile.medallions}    Fate ${profile.fate}${profile.vip ? "    VIP" : ""}`, {
      fontFamily: FONT, fontSize: "13px", color: "#7ee0e6",
    });
    const rows = [
      ["Fate Roll", "1 Fate or 40 Med", () => this.roll()],
      ["Slot Lock ×3", "80 Med", () => this.buy(80, () => { profile.slotLock = 3; }, "Lock armed")],
      ["Luck Flask", "25 Med", () => this.buy(25, () => { profile.luckRuns = 1; }, "Flask sipped")],
      ["3 Fate Stones", "100 Med", () => this.buy(100, () => { profile.fate += 3; }, "+3 Fate")],
      ["VIP  +5% haste", "200 Med", () => this.vip()],
    ];
    rows.forEach((row, i) => {
      const y = 118 + i * 56;
      this.add.rectangle(w / 2, y, w - 24, 48, 0x141218).setStrokeStyle(1, 0x3a3428);
      this.add.text(28, y, row[0], { fontFamily: FONT, fontSize: "15px", color: "#efeae0" }).setOrigin(0, 0.5);
      const b = this.add.rectangle(w - 78, y, 116, 30, 0x2a2214).setStrokeStyle(1, 0xd4b56a, 0.5).setInteractive({ useHandCursor: true });
      this.add.text(w - 78, y, row[1], { fontFamily: FONT, fontSize: "11px", color: "#e8d59a" }).setOrigin(0.5);
      b.on("pointerup", row[2]);
    });
    const back = this.add.rectangle(w / 2, h - 34, 150, 38, 0x1a1610).setStrokeStyle(1, 0xd4b56a, 0.45).setInteractive();
    this.add.text(w / 2, h - 34, "MALL", { fontFamily: TITLE, fontSize: "12px", color: "#e8d59a" }).setOrigin(0.5);
    back.on("pointerup", () => this.scene.start("mall"));
    this.scale.on("resize", () => this.scene.restart());
  }
  toast(msg) {
    const t = this.add.text(this.scale.width / 2, 88, msg, {
      fontFamily: FONT, fontSize: "13px", color: "#e8d59a", backgroundColor: "#1a140c", padding: { x: 10, y: 6 },
    }).setOrigin(0.5);
    this.time.delayedCall(1400, () => t.destroy());
  }
  buy(cost, fn, msg) {
    if (profile.medallions < cost) return this.toast("Not enough medallions");
    profile.medallions -= cost; fn(); persist(); this.toast(msg);
    this.time.delayedCall(350, () => this.scene.restart());
  }
  vip() {
    if (profile.vip) return this.toast("Already VIP");
    this.buy(200, () => { profile.vip = true; profile.fate += 1; }, "VIP marked");
  }
  roll() {
    const t = Math.max(1, profile.currentTier || 1);
    if (profile.fate >= 1) profile.fate--;
    else if (profile.medallions >= 40) profile.medallions -= 40;
    else return this.toast("Need Fate or 40 med");
    const n = 20 + t * 4;
    addMarks(t, n);
    this.toast(`+${n} ${TIERS[t].name} Marks`);
    this.time.delayedCall(600, () => this.scene.restart());
  }
}

class VendorScene extends Phaser.Scene {
  constructor() { super("vendor"); }
  init(data) { this.tier = data.tier || Math.max(1, profile.currentTier || 1); }
  create() {
    const { width: w, height: h } = this.scale;
    const t = this.tier;
    const T = TIERS[t];
    this.cameras.main.setBackgroundColor(0x07060a);
    this.add.rectangle(w / 2, 0, w, 6, T.color).setOrigin(0.5, 0);
    this.add.text(w / 2, 16, `${T.name.toUpperCase()} VENDOR`, {
      fontFamily: TITLE, fontSize: "20px", color: "#e8d59a",
    }).setOrigin(0.5, 0);
    this.add.text(w / 2, 44, `${marksOf(t)} ${T.name} Marks   ·   only from ${T.inst}`, {
      fontFamily: FONT, fontSize: "13px", color: "#7ee0e6",
    }).setOrigin(0.5, 0);
    this.add.text(w / 2, 66, "Marks from this tier only. They do not buy the next set.", {
      fontFamily: FONT, fontSize: "11px", color: "#8a8680", wordWrap: { width: w - 32 },
    }).setOrigin(0.5, 0);

    SLOTS.forEach((slot, i) => {
      const y = 108 + i * 58;
      const id = `T${t}_${slot}`;
      const owned = profile.owned.includes(id);
      const cost = markCost(t, slot);
      this.add.rectangle(w / 2, y, w - 24, 50, 0x141218).setStrokeStyle(1, owned ? 0x1e5a32 : 0x3a3428);
      this.add.text(24, y - 8, slot.toUpperCase(), { fontFamily: TITLE, fontSize: "13px", color: "#efeae0" }).setOrigin(0, 0.5);
      const share = Math.round(SHARE[slot] * 100);
      this.add.text(24, y + 12, `${share}% of this tier's haste`, { fontFamily: FONT, fontSize: "11px", color: "#8a8680" }).setOrigin(0, 0.5);
      const label = owned ? "OWNED" : `${cost} marks`;
      const b = this.add.rectangle(w - 78, y, 120, 32, owned ? 0x14301c : 0x2a2214)
        .setStrokeStyle(1, 0xd4b56a, 0.5).setInteractive({ useHandCursor: true });
      this.add.text(w - 78, y, label, { fontFamily: FONT, fontSize: "12px", color: "#e8d59a" }).setOrigin(0.5);
      if (!owned) b.on("pointerup", () => { this.toast(buyPiece(t, slot)); this.time.delayedCall(280, () => this.scene.restart({ tier: t })); });
    });

    this.btn(w * 0.22, h - 28, "PREV", () => this.scene.restart({ tier: Math.max(1, t - 1) }));
    this.btn(w * 0.5, h - 28, "MALL", () => this.scene.start("mall"));
    this.btn(w * 0.78, h - 28, "NEXT", () => this.scene.restart({ tier: Math.min(16, t + 1) }));
    this.scale.on("resize", () => this.scene.restart({ tier: t }));
  }
  btn(x, y, label, fn) {
    const r = this.add.rectangle(x, y, 96, 36, 0x1a1610).setStrokeStyle(1, 0xd4b56a, 0.45).setInteractive();
    this.add.text(x, y, label, { fontFamily: TITLE, fontSize: "12px", color: "#e8d59a" }).setOrigin(0.5);
    r.on("pointerup", fn);
  }
  toast(msg) {
    const t = this.add.text(this.scale.width / 2, 90, msg, {
      fontFamily: FONT, fontSize: "13px", color: "#e8d59a", backgroundColor: "#1a140c", padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(5);
    this.time.delayedCall(900, () => t.destroy());
  }
}

