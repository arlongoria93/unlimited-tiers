const FONT = "Outfit, system-ui, sans-serif";
const TITLE = "Cinzel, Georgia, serif";

const TIERS = {
  0: { name: "Rust", inst: "Mall", haste: 0.05, hit: 16, hp: 160, color: 0x8a8a8a, rooms: 0, floor: 0x1a1814, fog: 0x2a2418 },
  1: { name: "Ember", inst: "Ember Pit", haste: 0.15, hit: 20, hp: 200, color: 0xe25a22, rooms: 5, floor: 0x2a120c, fog: 0x5a2010 },
  2: { name: "Wolfkeep", inst: "Wolfkeep", haste: 0.28, hit: 22, hp: 240, color: 0xc4844a, rooms: 5, floor: 0x1c1610, fog: 0x3a2a18 },
  3: { name: "Hollow", inst: "Pure Hollow", haste: 0.42, hit: 24, hp: 280, color: 0x5aaa5a, rooms: 6, floor: 0x101810, fog: 0x143018 },
  4: { name: "Gilded", inst: "Gilded Sty", haste: 0.60, hit: 26, hp: 340, color: 0xe0b43a, rooms: 6, floor: 0x221c0c, fog: 0x4a3a10 },
  5: { name: "Cloister", inst: "Silent Cloister", haste: 0.80, hit: 28, hp: 400, color: 0xc0c0d4, rooms: 7, floor: 0x16161c, fog: 0x2a2a38 },
  6: { name: "Blackwater", inst: "Blackwater Cut", haste: 1.05, hit: 30, hp: 470, color: 0x3a78b4, rooms: 7, floor: 0x0c141c, fog: 0x102838 },
  7: { name: "Coil", inst: "Coil of Stone", haste: 1.35, hit: 32, hp: 550, color: 0x4a9a58, rooms: 7, floor: 0x101610, fog: 0x183018 },
  8: { name: "Vault", inst: "Optional Vault", haste: 1.40, hit: 33, hp: 580, color: 0x8a64d0, rooms: 5, floor: 0x16101c, fog: 0x2a1840 },
  9: { name: "Gronn", inst: "Gronn Gate", haste: 1.70, hit: 36, hp: 680, color: 0xc05030, rooms: 8, floor: 0x1c100c, fog: 0x401810 },
  10: { name: "Arc", inst: "Arc Cage", haste: 2.05, hit: 38, hp: 800, color: 0x48b8e8, rooms: 8, floor: 0x0c1822, fog: 0x103848 },
  11: { name: "Bloodworks", inst: "Bloodworks", haste: 2.30, hit: 40, hp: 900, color: 0xc02828, rooms: 8, floor: 0x1a0a0a, fog: 0x401010 },
  12: { name: "Titan", inst: "Titan Vault", haste: 2.60, hit: 42, hp: 1000, color: 0x50e0e0, rooms: 9, floor: 0x0c1818, fog: 0x104040 },
  13: { name: "Pale", inst: "Pale Sanctum", haste: 2.90, hit: 44, hp: 1120, color: 0xd0e4ee, rooms: 8, floor: 0x14181c, fog: 0x283038 },
  14: { name: "Crucible", inst: "Ashen Crucible", haste: 3.20, hit: 46, hp: 1250, color: 0xf07828, rooms: 8, floor: 0x22140c, fog: 0x502010 },
  15: { name: "Court", inst: "Sunken Court", haste: 3.50, hit: 48, hp: 1400, color: 0x8870d8, rooms: 8, floor: 0x141018, fog: 0x281848 },
  16: { name: "Crown", inst: "Crown of the First", haste: 3.80, hit: 50, hp: 1600, color: 0xf0d060, rooms: 9, floor: 0x1c180c, fog: 0x4a3a10 },
};

const SLOTS = ["weapon", "armor", "ring", "trinket", "offset"];
const SHARE = { weapon: 0.5, armor: 0.25, ring: 0.125, trinket: 0.125, offset: 0 };
const NO_WEAPON = new Set([5, 6, 7, 8, 9, 10, 11, 15]);
const ELEMENTS = ["Ember Brand", "Tide Brand", "Thorn Brand", "Iron Brand"];
const W = { early: [0.28, 0.28, 0.22, 0.22], mid: [0.22, 0.26, 0.26, 0.26], late: [0.16, 0.24, 0.3, 0.3], wall: [0.12, 0.22, 0.33, 0.33], crown: [0.1, 0.18, 0.36, 0.36] };

function band(t) { return t <= 4 ? "early" : t <= 8 ? "mid" : t <= 12 ? "late" : t <= 15 ? "wall" : "crown"; }
let previewTier = null;

function swingTime(h) { return Math.max(0.2, 1 / (1 + Math.max(0, h))); }

function compute() {
  if (previewTier != null) {
    const T = TIERS[previewTier] || TIERS[0];
    const haste = T.haste;
    const swing = swingTime(haste);
    return { haste, hit: T.hit, hp: T.hp, swing, dps: T.hit / swing, preview: previewTier };
  }
  let haste = 0, hit = 8, hp = 80;
  const ts = {};
  for (const slot of SLOTS) {
    const it = itemOf(profile.equipped[slot]);
    if (!it) continue;
    const T = TIERS[it.tier] || TIERS[0];
    haste += T.haste * SHARE[slot];
    if (slot === "weapon") hit = T.hit;
    if (slot === "armor") hp = T.hp;
    ts[slot] = it.tier;
  }
  if (profile.vip) haste += 0.05;
  if (profile.rite) haste += 0.03;
  if (profile.equipped.offset) haste += 0.04;
  return { haste, hit, hp, swing: swingTime(haste), dps: hit / swingTime(haste), preview: null };
}

function expectedDps(tier) {
  const T = TIERS[tier] || TIERS[0];
  return T.hit / swingTime(T.haste);
}

function enemyHp(tier, kind) {
  const secs = kind === "boss" ? 75 : kind === "elite" ? 12 : 5;
  return Math.floor(expectedDps(tier) * secs);
}
function itemOf(id) {
  const m = /^T(\d+)_(weapon|armor|ring|trinket|offset)$/.exec(id);
  return m ? { tier: +m[1], slot: m[2], id } : null;
}
function blankProfile() {
  return {
    medallions: 24, fate: 2, vip: false, currentTier: 0,
    equipped: { weapon: "T0_weapon", armor: "T0_armor", ring: "T0_ring", trinket: "T0_trinket" },
    owned: ["T0_weapon", "T0_armor", "T0_ring", "T0_trinket"],
    attuned: { 0: true, 1: true }, pity: {}, slotLock: 0, luckRuns: 0, lastDaily: 0,
    marks: {},
  };
}
let profile = Object.assign(blankProfile(), JSON.parse(localStorage.getItem("ut_phaser") || "{}"));
const persist = () => localStorage.setItem("ut_phaser", JSON.stringify(profile));

function slotsFor(tier) {
  if (tier === 8) return ["offset"];
  const slots = [];
  if (tier !== 1 && !NO_WEAPON.has(tier)) slots.push("weapon");
  slots.push("armor", "ring", "trinket");
  if (tier >= 13) slots.push("offset");
  return slots;
}
function hasOffsetFor(tier) {
  if (tier < 14) return true;
  return profile.owned.some((id) => {
    const it = itemOf(id);
    return it && it.slot === "offset" && (it.tier === 8 || it.tier >= tier - 1);
  });
}
function canEnter(t) {
  if (profile.attuned[t]) return { ok: true, pay: false, why: "" };
  const need = t === 9 ? 7 : t - 1;
  if (!hasOffsetFor(t)) return { ok: false, pay: false, why: "Need Vault offset or the previous offset" };
  const pay = highestWeapon() < need;
  if (pay && profile.medallions < 20 * t) return { ok: false, pay: false, why: `Need a T${need} blade or ${20 * t} med` };
  return { ok: true, pay, why: "" };
}
function markCost(tier, slot) {
  const base = { weapon: 48, armor: 28, ring: 16, trinket: 16, offset: 22 }[slot] || 16;
  return base * tier;
}
function marksOf(tier) {
  return (profile.marks && profile.marks[tier]) || 0;
}
function addMarks(tier, n) {
  profile.marks = profile.marks || {};
  profile.marks[tier] = marksOf(tier) + n;
  persist();
}
function buyPiece(tier, slot) {
  const id = `T${tier}_${slot}`;
  if (profile.owned.includes(id)) return "Already owned";
  if (!slotsFor(tier).includes(slot)) return "Not sold here";
  if (tier === 12 && slot === "weapon" && !(profile.upgradeMarks > 0)) return "Need an Upgrade Mark from the Titan boss";
  const cost = markCost(tier, slot);
  if (marksOf(tier) < cost) return `Need ${cost - marksOf(tier)} more`;
  profile.marks[tier] -= cost;
  if (tier === 12 && slot === "weapon") profile.upgradeMarks--;
  profile.owned.push(id);
  profile.equipped[slot] = id;
  persist();
  return `Bought T${tier} ${slot}`;
}
function buyElement(index) {
  const cost = 24;
  const have = profile.cinders || 0;
  if (have < cost) return `Need ${cost - have} cinders`;
  profile.cinders = have - cost;
  profile.element = ELEMENTS[index];
  if (!profile.owned.includes("T1_weapon")) profile.owned.push("T1_weapon");
  profile.equipped.weapon = "T1_weapon";
  persist();
  return profile.element;
}
function grantKill(kind, tier, mode) {
  const gain = kind === "boss" ? 12 : kind === "elite" ? 3 : 1;
  if (mode === "forge") {
    profile.cinders = (profile.cinders || 0) + gain;
    persist();
    return `+${gain} cinder`;
  }
  if (mode === "world") {
    profile.honor = (profile.honor || 0) + gain;
    persist();
    return `+${gain} honor`;
  }
  addMarks(tier, gain);
  if (kind === "boss" && tier === 2 && !profile.wolfShard) {
    profile.wolfShard = true;
    persist();
    return `+${gain}  ·  Wolf Shard`;
  }
  if (kind === "boss" && tier === 12) {
    profile.upgradeMarks = (profile.upgradeMarks || 0) + 1;
    persist();
    return `+${gain}  ·  Upgrade Mark`;
  }
  return `+${gain} ${TIERS[tier].name}`;
}

function highestWeapon() {
  let b = 0;
  for (const id of profile.owned) {
    const it = itemOf(id);
    if (it && it.slot === "weapon") b = Math.max(b, it.tier);
  }
  return b;
}
function ownedSlots(tier) {
  const h = {};
  for (const id of profile.owned) {
    const it = itemOf(id);
    if (it && it.tier === tier) h[it.slot] = true;
  }
  return h;
}
function dropPiece(tier, src) {
  const have = ownedSlots(tier);
  const weights = W[band(tier)].slice();
  const luck = profile.luckRuns > 0 ? 2 : 1;
  const lock = profile.slotLock > 0;
  for (let i = 0; i < 4; i++) {
    if (have[SLOTS[i]] && lock) weights[i] = 0;
    if (!have[SLOTS[i]]) weights[i] *= luck;
  }
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  let r = Math.random() * sum, slot = "trinket";
  for (let i = 0; i < 4; i++) { r -= weights[i]; if (r <= 0) { slot = SLOTS[i]; break; } }
  profile.pity[tier] = (profile.pity[tier] || 0) + 1;
  const pityAt = tier <= 4 ? 5 : tier <= 8 ? 7 : tier <= 12 ? 8 : tier <= 15 ? 12 : 20;
  if (profile.pity[tier] >= pityAt) {
    slot = SLOTS.find((s) => !have[s]) || slot;
    profile.pity[tier] = 0;
  }
  const id = `T${tier}_${slot}`;
  let msg;
  if (profile.owned.includes(id)) {
    const c = 4 + tier;
    profile.medallions += c;
    msg = `Duplicate T${tier} ${slot}  +${c} med`;
  } else {
    profile.owned.push(id);
    if (slot === "weapon") profile.pity[tier] = 0;
    msg = `${src}  ·  T${tier} ${slot.toUpperCase()}`;
  }
  if (profile.luckRuns > 0) profile.luckRuns--;
  if (profile.slotLock > 0) profile.slotLock--;
  persist();
  return msg;
}

function actx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!actx.ctx) actx.ctx = new AC();
  if (actx.ctx.state === "suspended") actx.ctx.resume();
  return actx.ctx;
}
function burst(ctx, dur, peak, filterFreq, type) {
  const now = ctx.currentTime;
  const len = Math.max(0.02, dur);
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = type || "lowpass";
  filter.frequency.setValueAtTime(filterFreq, now);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + len);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(now);
  src.stop(now + len);
}
function blip(ctx, from, to, dur, peak, type) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || "sine";
  osc.frequency.setValueAtTime(Math.max(40, from), now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), now + dur);
  gain.gain.setValueAtTime(peak, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}
function sfx(kind) {
  const ctx = actx();
  if (!ctx) return;
  if (kind === "swing") {
    burst(ctx, 0.12, 0.05, 2200, "bandpass");
    blip(ctx, 640, 180, 0.09, 0.03, "sawtooth");
  } else if (kind === "hit") {
    burst(ctx, 0.08, 0.09, 900, "lowpass");
    blip(ctx, 220, 70, 0.08, 0.06, "triangle");
  } else if (kind === "kill") {
    burst(ctx, 0.16, 0.08, 1400, "lowpass");
    blip(ctx, 520, 880, 0.12, 0.04, "triangle");
    blip(ctx, 180, 60, 0.18, 0.05, "sine");
  } else if (kind === "hurt") {
    burst(ctx, 0.1, 0.06, 500, "lowpass");
    blip(ctx, 160, 70, 0.12, 0.05, "sawtooth");
  } else if (kind === "step") {
    burst(ctx, 0.04, 0.025, 280, "lowpass");
  } else if (kind === "door") {
    blip(ctx, 140, 60, 0.28, 0.05, "sine");
    burst(ctx, 0.22, 0.04, 400, "lowpass");
  }
}
function tone() { sfx("hit"); }
function makeTex(scene, key, w, h, draw) {
  const g = scene.make.graphics({ add: false });
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function bootTextures(scene) {
  makeTex(scene, "player", 40, 44, (g) => {
    g.fillStyle(0x0a0a10, 0.45); g.fillEllipse(20, 38, 22, 8);
    g.fillStyle(0x1a3040, 1); g.fillRoundedRect(10, 16, 20, 18, 4);
    g.fillStyle(0x7ee0e6, 1); g.fillCircle(20, 12, 8);
    g.fillStyle(0xd4b56a, 1); g.fillTriangle(28, 20, 38, 16, 30, 28);
    g.fillStyle(0xf2efe6, 1); g.fillCircle(20, 11, 3);
  });
  makeTex(scene, "spark", 10, 10, (g) => {
    g.fillStyle(0xfff2b0, 1); g.fillCircle(5, 5, 4);
  });
  makeTex(scene, "slash", 48, 48, (g) => {
    g.lineStyle(4, 0xe8f6ff, 0.95);
    g.beginPath(); g.arc(24, 24, 18, -0.6, 1.4); g.strokePath();
    g.lineStyle(2, 0x7ee0e6, 0.7);
    g.beginPath(); g.arc(24, 24, 14, -0.4, 1.2); g.strokePath();
  });
  makeTex(scene, "wallpx", 8, 8, (g) => { g.fillStyle(0x1a1a22, 1); g.fillRect(0, 0, 8, 8); });
  makeTex(scene, "goldpx", 8, 8, (g) => { g.fillStyle(0xd4b56a, 1); g.fillCircle(4, 4, 3); });
}

