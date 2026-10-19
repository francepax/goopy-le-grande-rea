// Goopy Le Grande — browser reconstruction of Cuphead's SlimeLevel.
// Behaviour, numbers and timings come from the shipped Assembly-CSharp.dll (read with REA + an IL dump);
// sprites, animation timings, layout and sounds come from the game's own asset files.
// See RICOSTRUZIONE.md for where each value was found.
"use strict";

// ---------------------------------------------------------------- constants
const W = 1280, H = 720, FIXED = 1 / 60;
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// LevelProperties.Slime.GetMode (IL) — one entry per difficulty.
// State: [healthTrigger, name, jump, punch, tombstone]
function J(groundDelay, hjV, hjH, hjG, ljV, ljH, ljG, numMin, numMax, pattern, bigInit) {
  return { groundDelay, hjV, hjH, hjG, ljV, ljH, ljG, numMin, numMax, pattern, bigInit };
}
function T(moveSpeed, delayMin, delayMax, anticipationHold, offsets) {
  return { moveSpeed, delayMin, delayMax, anticipationHold, offsets };
}
const NO_TOMB = T(0, 0, 1, 0, "");
const MODES = {
  simple: {
    label: "SEMPLICE", health: 1000,
    states: [
      { at: 10.0, name: "Main", jump: J(0.35, 2300, 700, 6500, 2200, 670, 6500, 5, 8, "LJ,LJ,HJ,LJ,RJ,HJ,LJ,HJ,LJ,HJ", 4), punch: { preHold: 0.85, mainHold: 0.4 }, tomb: NO_TOMB },
      { at: 0.8, name: "Generic", jump: J(0.35, 2350, 750, 6500, 2200, 700, 6500, 5, 8, "HJ,HJ,LJ,HJ,LJ,RJ,HJ,LJ,LJ,HJ,LJ", 6), punch: { preHold: 0.85, mainHold: 0.4 }, tomb: NO_TOMB },
      { at: 0.56, name: "BigSlime", jump: J(0.45, 2850, 820, 7500, 2320, 785, 7500, 5, 8, "LJ,HJ,RJ,LJ,HJ,RJ,LJ,LJ,HJ,HJ,LJ,HJ,LJ,HJ", 2), punch: { preHold: 0.65, mainHold: 0.4 }, tomb: NO_TOMB },
    ],
  },
  normal: {
    label: "NORMALE", health: 1200,
    states: [
      { at: 10.0, name: "Main", jump: J(0.2, 2350, 840, 6500, 2000, 780, 6500, 5, 8, "HJ,LJ,HJ,LJ,D.5, LJ,RJ,HJ,LJ,HJ,LJ,LJ,HJ,RJ,LJ,LJ", 3), punch: { preHold: 0.65, mainHold: 0.4 }, tomb: T(950, 2, 4, 0.35, "-130,70,0,130,-70,0") },
      { at: 0.76, name: "BigSlime", jump: J(0.3, 2850, 820, 7500, 2250, 760, 7500, 5, 8, "HJ,HJ,LJ,HJ,RJ,LJ,D.5, LJ,HL,LJ,RJ,HJ,LJ,LJ,HJ,LJ,LJ", 2), punch: { preHold: 0.65, mainHold: 0.4 }, tomb: T(950, 2, 4, 0.35, "-130,70,0,130,-70,0") },
      { at: 0.31, name: "Tombstone", jump: J(0.3, 2850, 820, 7500, 2250, 760, 7500, 5, 8, "HJ,HJ,LJ,HJ,RJ,LJ,D.5, LJ,HL,LJ,RJ,HJ,LJ,LJ,HJ,LJ,LJ", 2), punch: { preHold: 0.65, mainHold: 0.4 }, tomb: T(950, 2, 4, 0.35, "-130,70,0,130,-70,0") },
    ],
  },
  expert: {
    label: "ESPERTO", health: 1400,
    states: [
      { at: 10.0, name: "Main", jump: J(0.001, 2585, 840, 7150, 2200, 780, 7150, 5, 8, "HJ,LJ,HJ,LJ,D.5, LJ,RJ,HJ,LJ,HJ,LJ,LJ,HJ,RJ,LJ,LJ", 3), punch: { preHold: 0.65, mainHold: 0.4 }, tomb: T(1050, 1.5, 4, 0.35, "-150,80,0,140,-80,0,-160,0,150,-90,0") },
      { at: 0.76, name: "BigSlime", jump: J(0.05, 2565, 738, 7200, 2025, 685, 7200, 5, 8, "HJ,LJ,HJ,RJ,LJ,LJ,D.5, LJ,RJ,HL,LJ,RJ,HJ,LJ,HJ,LJ,LJ", 2), punch: { preHold: 0.65, mainHold: 0.4 }, tomb: T(1050, 1.5, 4, 0.35, "-150,80,0,140,-80,0,-160,0,150,-90,0") },
      { at: 0.36, name: "Tombstone", jump: J(0.05, 2565, 738, 7200, 2025, 685, 7200, 5, 8, "HJ,LJ,HJ,RJ,LJ,LJ,D.5, LJ,RJ,HL,LJ,RJ,HJ,LJ,HJ,LJ,LJ", 2), punch: { preHold: 0.65, mainHold: 0.4 }, tomb: T(1050, 1.5, 4, 0.35, "-150,80,0,140,-80,0,-160,0,150,-90,0") },
    ],
  },
};
const MODE_KEYS = ["simple", "normal", "expert"];

// LevelPlayerMotor.Properties (IL constructor constants)
const PM = {
  moveSpeed: 490, maxSpeedY: 1620, timeToMaxY: 7.3, jumpHoldMin: 0.01, jumpHoldMax: 0.16, jumpPower: -0.755,
  dashSpeed: 1100, dashTime: 0.3, hitStunTime: 0.3, hitJumpPower: -0.6, hitKnockback: 300,
};
// WeaponProperties.LevelWeaponPeashot.Basic
const PEASHOT = { damage: 4, speed: 2250, rate: 0.11 };
// LevelPlayerColliderManager (prefab data): center/size
const PCOL = {
  default: { cy: 62, w: 50, h: 105 }, air: { cy: 57, w: 50, h: 50 },
  duck: { cy: 25, w: 50, h: 35 }, dash: { cy: 55, w: 100, h: 45 },
};
// Scene data (level20 / SlimeLevel MonoBehaviour)
const GROUND_Y = -245, PLAYER_BOUND = 658 - 25, SPAWN_X = -410;

// ---------------------------------------------------------------- assets
let DATA = null, SPR = null, ANIM = null, PAGES = [], AUDIO_INDEX = {};
const AC = new (window.AudioContext || window.webkitAudioContext)();
const BUF = {};
let musicNode = null;
const master = AC.createGain(); master.gain.value = 0.9; master.connect(AC.destination);
let loadProgress = { done: 0, total: 1, label: "" };

async function loadAll() {
  DATA = await (await fetch("assets/assets.json")).json();
  SPR = DATA.sprites; ANIM = DATA.anims;
  AUDIO_INDEX = await (await fetch("assets/audio.json")).json();
  const TEST = window.__TEST || null;
  const audioKeys = TEST ? [] : Object.keys(AUDIO_INDEX);
  loadProgress.total = DATA.pages.length + audioKeys.length;
  loadProgress.label = "Carico gli sprite…";
  await Promise.all(DATA.pages.map((src, i) => new Promise((res, rej) => {
    const pre = document.getElementById("page" + i);
    if (pre && pre.complete) { PAGES[i] = pre; loadProgress.done++; res(); return; }
    const img = new Image();
    img.onload = () => { PAGES[i] = img; loadProgress.done++; res(); };
    img.onerror = rej; img.src = "assets/" + src;
  })));
  loadProgress.label = "Carico i suoni…";
  await Promise.all(audioKeys.map(async (k) => {
    try {
      const ab = await (await fetch("assets/" + AUDIO_INDEX[k])).arrayBuffer();
      BUF[k] = await AC.decodeAudioData(ab);
    } catch (e) { console.warn("audio", k, e); }
    loadProgress.done++;
  }));
  try { await document.fonts.load('40px "CupheadVogue"'); } catch (e) { /* font optional */ }
}

const SFX_GROUPS = {};
function sfx(name, vol = 1) {
  // AudioManager.Play("slime_small_jump") -> one random sfx_slime_small_jump_NN
  if (!SFX_GROUPS[name]) {
    const re = new RegExp("^sfx_" + name + "(_\\d+|_[a-e])?$");
    SFX_GROUPS[name] = Object.keys(BUF).filter((k) => re.test(k));
  }
  const g = SFX_GROUPS[name];
  if (!g.length) return null;
  return playBuffer(g[(Math.random() * g.length) | 0], vol);
}
function playBuffer(key, vol = 1, loop = false) {
  const b = BUF[key]; if (!b) return null;
  const src = AC.createBufferSource(); src.buffer = b; src.loop = loop;
  const g = AC.createGain(); g.gain.value = vol;
  src.connect(g); g.connect(master); src.start();
  return { src, g, stop() { try { src.stop(); } catch (e) {} } };
}
function startMusic() {
  stopMusic();
  musicNode = playBuffer("MUS_Slime", 0.55, true);
}
function stopMusic() { if (musicNode) { musicNode.stop(); musicNode = null; } }

// ---------------------------------------------------------------- helpers
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, bExclusive) => Math.floor(a + Math.random() * (bExclusive - a)); // UnityEngine.Random.Range(int,int)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeInOutSine = (s, e, t) => s + (e - s) * (-(Math.cos(Math.PI * clamp(t, 0, 1)) - 1) / 2); // EaseUtils type 14

function* wait(sec) { let t = 0; while (t < sec) t += yield; }
function* until(fn) { while (!fn()) yield; }

class Runner {
  constructor() { this.list = []; }
  start(gen) { const c = { gen, done: false }; this.list.push(c); c.gen.next(0); return c; }
  stopAll() { this.list.forEach((c) => (c.done = true)); this.list = []; }
  update(dt) {
    for (const c of this.list.slice()) {
      if (c.done) continue;
      const r = c.gen.next(dt);
      if (r.done) c.done = true;
    }
    this.list = this.list.filter((c) => !c.done);
  }
}

// Animator: plays exported clips (frames + durations + events)
class Animator {
  constructor(owner) { this.owner = owner; this.name = null; this.t = 0; this.done = false; this.next = null; }
  play(name, next = null, keepTime = false) {
    const a = ANIM[name];
    if (!a) { console.warn("missing anim", name); return; }
    const t = keepTime ? this.t : 0;
    this.name = name; this.a = a; this.t = t; this.done = false; this.next = next;
    this.total = a.frames.reduce((s, f) => s + f[1], 0);
    this.fireEvents(-1, 0);
  }
  ensure(name, next = null, keepTime = false) { if (this.name !== name) this.play(name, next, keepTime); }
  fireEvents(t0, t1) {
    if (!this.a || !this.a.events || !this.owner || !this.owner.onAnimEvent) return;
    for (const e of this.a.events) if (e[0] > t0 && e[0] <= t1) this.owner.onAnimEvent(e[1], this.name);
  }
  update(dt) {
    if (!this.a || this.done) return;
    const t0 = this.t; this.t += dt;
    this.fireEvents(t0, Math.min(this.t, this.total));
    if (this.t >= this.total) {
      if (this.a.loop && !this.next) { this.t %= this.total; this.fireEvents(-1, this.t); }
      else if (this.next) { const n = this.next; this.play(n); }
      else { this.t = this.total; this.done = true; }
    }
  }
  frame() {
    if (!this.a) return null;
    let t = this.t;
    for (const f of this.a.frames) { if (t < f[1]) return f[0]; t -= f[1]; }
    return this.a.frames[this.a.frames.length - 1][0];
  }
}

// ---------------------------------------------------------------- rendering
const cam = { x: 0, y: 0, shakeAmt: 0, shakeTime: 0, shakeLeft: 0, ox: 0, oy: 0 };
function shake(amount, time) { cam.shakeAmt = Math.max(cam.shakeAmt * (cam.shakeLeft > 0 ? 1 : 0), amount); cam.shakeTime = time; cam.shakeLeft = time; }
const toScreen = (x, y) => [x - cam.x - cam.ox + W / 2, H / 2 - (y - cam.y - cam.oy)];

function drawSprite(name, x, y, flip = false, opts = {}) {
  const s = SPR[name]; if (!s) return;
  const [p, px, py, w, h, ax, ay] = s;
  const [X, Y] = toScreen(x, y);
  ctx.save();
  ctx.translate(X, Y);
  if (opts.rot) ctx.rotate(-opts.rot);
  const sx = (opts.sx || 1) * (flip ? -1 : 1), sy = opts.sy || 1;
  if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  if (opts.flash) ctx.filter = "brightness(1.25)";
  ctx.drawImage(PAGES[p], px, py, w, h, -ax, -ay, w, h);
  ctx.restore();
}

function drawSpriteScreen(name, X, Y, scale = 1) {
  const s = SPR[name]; if (!s) return;
  const [p, px, py, w, h, ax, ay] = s;
  ctx.drawImage(PAGES[p], px, py, w, h, X - ax * scale, Y - ay * scale, w * scale, h * scale);
}

let showHitboxes = false;
function debugCircle(x, y, r, color) {
  if (!showHitboxes) return;
  const [X, Y] = toScreen(x, y);
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}
function debugBox(b, color) {
  if (!showHitboxes) return;
  const [X, Y] = toScreen(b.x - b.w / 2, b.y + b.h / 2);
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(X, Y, b.w, b.h); ctx.restore();
}

// shapes: {type:'c',x,y,r} or {type:'b',x,y,w,h} in world coords
function circleBox(c, b) {
  const nx = clamp(c.x, b.x - b.w / 2, b.x + b.w / 2), ny = clamp(c.y, b.y - b.h / 2, b.y + b.h / 2);
  return (c.x - nx) ** 2 + (c.y - ny) ** 2 <= c.r * c.r;
}
function boxBox(a, b) { return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h; }
function shapeHitsBox(s, b) { return s.type === "c" ? circleBox(s, b) : boxBox(s, b); }
function pointInShape(px, py, s, pad = 0) {
  if (s.type === "c") return (px - s.x) ** 2 + (py - s.y) ** 2 <= (s.r + pad) ** 2;
  return Math.abs(px - s.x) <= s.w / 2 + pad && Math.abs(py - s.y) <= s.h / 2 + pad;
}

// ---------------------------------------------------------------- input
const keys = {}, pressed = {};
const KEYMAP = {
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
  KeyZ: "jump", Space: "jump", KeyJ: "jump", KeyX: "shoot", KeyK: "shoot", ShiftLeft: "dash", ShiftRight: "dash", KeyC: "dash", KeyL: "dash",
  Enter: "start", Escape: "pause", KeyP: "pause", KeyH: "debug", KeyR: "restart",
};
addEventListener("keydown", (e) => {
  const k = KEYMAP[e.code]; if (!k) return;
  e.preventDefault();
  if (!keys[k]) pressed[k] = true;
  keys[k] = true;
  if (AC.state === "suspended") AC.resume();
});
addEventListener("keyup", (e) => { const k = KEYMAP[e.code]; if (k) { keys[k] = false; e.preventDefault(); } });
let padPrev = {};
function pollGamepad() {
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].find((g) => g) : null;
  if (!gp) return;
  const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, b = (i) => gp.buttons[i] && gp.buttons[i].pressed;
  const st = {
    left: ax < -0.4 || b(14), right: ax > 0.4 || b(15), up: ay < -0.5 || b(12), down: ay > 0.5 || b(13),
    jump: b(0), shoot: b(2), dash: b(1) || b(5), start: b(9), pause: b(9) && false,
  };
  for (const k in st) {
    if (st[k] && !padPrev[k]) { pressed[k] = true; if (AC.state === "suspended") AC.resume(); }
    if (st[k] !== padPrev[k]) keys[k] = st[k];
  }
  padPrev = st;
}

// ---------------------------------------------------------------- effects
class Effect {
  constructor(anim, x, y, flip = false, opts = {}) {
    this.anim = new Animator(null); this.anim.play(anim); this.x = x; this.y = y; this.flip = flip; this.opts = opts; this.dead = false;
  }
  update(dt) { this.anim.update(dt); if (this.anim.done || (this.anim.a.loop && this.anim.t + dt >= this.anim.total)) this.dead = true; }
  draw() { const f = this.anim.frame(); if (f) drawSprite(f, this.x, this.y, this.flip, this.opts); }
}

// ---------------------------------------------------------------- player
class Player {
  constructor(level) {
    this.level = level; this.x = SPAWN_X; this.y = GROUND_Y; this.facing = 1;
    this.grounded = true; this.vyNorm = 0; this.vxHit = 0;
    this.hp = 3; this.invuln = 0; this.stun = 0; this.dead = false;
    this.jumpState = 0; this.jumpTimer = 0; this.dashT = 0; this.airDashUsed = false; this.dashDir = 1;
    this.parryT = 0; this.ducking = false; this.shootTimer = 0; this.shooting = false; this.aim = "forward";
    this.anim = new Animator(this); this.state = "intro"; this.anim.play("anim_player_intro_cuphead", "anim_player_idle");
    this.fireLoop = null;
  }
  get vy() { return -PM.maxSpeedY * this.vyNorm; } // VelocityManager.Total: Ease(linear, maxY, -maxY, y/2+0.5)
  hurtbox() {
    let c = PCOL.default;
    if (this.dashT > 0) c = PCOL.dash; else if (!this.grounded) c = PCOL.air; else if (this.ducking) c = PCOL.duck;
    return { type: "b", x: this.x, y: this.y + c.cy, w: c.w, h: c.h };
  }
  takeDamage(srcX) {
    if (this.dead || this.invuln > 0 || this.level.ended) return;
    this.hp--;
    sfx("player_hit");
    this.level.effects.push(new Effect("anim_effect_player_hit_a", this.x, this.y + 60));
    shake(10, 0.3);
    if (this.hp <= 0) { this.die(); return; }
    this.invuln = 2.0; this.stun = PM.hitStunTime; this.dashT = 0;
    this.vyNorm = PM.hitJumpPower; this.grounded = false; this.jumpState = 2;
    this.vxHit = (this.x < srcX ? -1 : 1) * PM.hitKnockback;
  }
  die() {
    this.dead = true; this.hp = 0; this.stopFire();
    sfx("player_death");
    this.anim.play("anim_player_death_level_start", "anim_player_death_level_idle_no_parry");
    this.level.onPlayerDeath();
  }
  stopFire() { if (this.fireLoop) { this.fireLoop.stop(); this.fireLoop = null; } }
  fixedUpdate(dt) {
    const L = this.level;
    if (this.dead) { this.y += 60 * dt * (this.anim.name === "anim_player_death_level_idle_no_parry" ? 1 : 0); return; }
    if (this.state === "intro") { if (this.anim.name !== "anim_player_intro_cuphead") this.state = "play"; else return; }
    const canAct = L.fighting && !L.ended;
    const inL = canAct && keys.left, inR = canAct && keys.right, inU = canAct && keys.up, inD = canAct && keys.down;
    if (this.invuln > 0) this.invuln -= dt;

    // dash
    if (this.dashT > 0) {
      this.dashT -= dt;
      this.x += this.dashDir * PM.dashSpeed * dt;
      if (this.dashT <= 0 && !this.grounded) this.vyNorm = 0;
    } else if (canAct && pressed.dash && this.stun <= 0 && (this.grounded || !this.airDashUsed)) {
      this.dashT = PM.dashTime; this.dashDir = this.facing; if (!this.grounded) this.airDashUsed = true;
      this.ducking = false; sfx("player_dash");
      this.level.effects.push(new Effect("anim_effect_player_dash_a", this.x - this.facing * 40, this.y + 50, this.facing < 0));
      this.anim.play(this.grounded ? "anim_player_dash_ground_pre" : "anim_player_dash_air_pre", this.grounded ? "anim_player_dash_ground" : "anim_player_dash_air");
    }
    const dashing = this.dashT > 0;

    // horizontal walking (HandleWalking)
    let dir = 0;
    if (!dashing && this.stun <= 0) {
      if (inL && !inR) dir = -1; else if (inR && !inL) dir = 1;
      if (dir) this.facing = dir;
      this.ducking = this.grounded && inD;
      const lockAim = this.grounded && this.shooting && inU && !dir; // standing aim up
      if (!this.ducking && !lockAim) this.x += dir * PM.moveSpeed * dt;
    }
    if (this.stun > 0) { this.stun -= dt; this.x += this.vxHit * dt; this.vxHit *= 0.9; }

    // jumping (HandleJumping) + falling (HandleFalling)
    if (!dashing && this.stun <= 0) {
      if (this.jumpState === 0 && this.grounded && pressed.jump && canAct) {
        sfx("player_jump", 0.8);
        this.jumpState = 1; this.grounded = false; this.vyNorm = PM.jumpPower; this.jumpTimer = FIXED; this.ducking = false;
      } else if (!this.grounded && pressed.jump && canAct && this.parryT <= 0 && this.jumpState !== 1) {
        this.parryT = 0.27; this.anim.play("anim_player_parry"); // parry slap (nothing pink to parry in this fight)
      }
      if (this.jumpState === 1) {
        if ((this.jumpTimer >= PM.jumpHoldMin && !keys.jump) || this.jumpTimer >= PM.jumpHoldMax) { this.jumpState = 2; this.jumpTimer = 0; }
        else this.vyNorm = PM.jumpPower;
        this.jumpTimer += dt;
      }
    }
    if (this.parryT > 0) this.parryT -= dt;
    if (!this.grounded && !dashing) {
      this.vyNorm = clamp(this.vyNorm + (PM.maxSpeedY / (PM.timeToMaxY * 60)) * dt, -10, 1);
      this.y += this.vy * dt;
      if (this.y <= GROUND_Y && this.vyNorm > 0) {
        this.y = GROUND_Y; this.grounded = true; this.jumpState = 0; this.airDashUsed = false; this.vyNorm = 0;
        sfx("player_land_ground", 0.6);
        this.level.effects.push(new Effect("anim_effect_player_grounded_a", this.x, this.y));
      }
    }
    this.x = clamp(this.x, -PLAYER_BOUND, PLAYER_BOUND);

    // shooting (LevelPlayerWeaponManager + WeaponPeashot)
    this.shooting = canAct && keys.shoot && !dashing && this.stun <= 0;
    if (this.shooting) {
      if (inU && dir) this.aim = "diag_up"; else if (inU) this.aim = "up";
      else if (!this.grounded && inD && dir) this.aim = "diag_down"; else if (!this.grounded && inD) this.aim = "down";
      else this.aim = "forward";
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) { this.fire(); this.shootTimer += PEASHOT.rate; }
      if (!this.fireLoop) { sfx("player_default_fire_start", 0.35); this.fireLoop = playBuffer("sfx_player_default_fire_loop_01", 0.3, true); }
    } else { this.shootTimer = 0; this.stopFire(); }
    this.pickAnim(dir, inU);
  }
  muzzle() {
    const f = this.facing;
    if (this.ducking) return [this.x + f * 75, this.y + 30, 0];
    switch (this.aim) {
      case "up": return [this.x + f * 18, this.y + 150, Math.PI / 2];
      case "diag_up": return [this.x + f * 55, this.y + 120, Math.PI / 4];
      case "down": return [this.x + f * 8, this.y + 5, -Math.PI / 2];
      case "diag_down": return [this.x + f * 50, this.y + 20, -Math.PI / 4];
      default: return [this.x + f * 62, this.y + (this.grounded ? 62 : 55), 0];
    }
  }
  fire() {
    const [mx, my, a] = this.muzzle();
    const ang = this.facing > 0 ? a : Math.PI - a;
    const spread = rand(-0.02, 0.02);
    this.level.bullets.push(new Bullet(mx, my, ang + spread));
    this.level.effects.push(new Effect("anim_weapon_peashot_basic_flash_a", mx, my, this.facing < 0));
  }
  pickAnim(dir, inU) {
    const A = this.anim;
    if (this.stun > 0) { A.ensure(this.grounded ? "anim_player_hit_ground" : "anim_player_hit_air"); return; }
    if (this.dashT > 0) return;
    if (!this.grounded) { if (this.parryT > 0) return; A.ensure("anim_player_jump"); return; }
    if (this.ducking) {
      if (this.shooting) A.ensure("anim_player_duck_shooting_hold");
      else if (A.name !== "anim_player_duck_idle" && A.name !== "anim_player_duck_transition_in") A.play("anim_player_duck_transition_in", "anim_player_duck_idle");
      return;
    }
    const runNames = ["anim_player_run", "anim_player_run_shoot_forward", "anim_player_run_shoot_diagonal_up"];
    if (dir) {
      const n = this.shooting ? (this.aim === "diag_up" ? runNames[2] : runNames[1]) : runNames[0];
      A.ensure(n, null, runNames.includes(A.name));
      return;
    }
    if (this.shooting) A.ensure(this.aim === "up" ? "anim_player_shoot_up_hold" : "anim_player_shoot_forward_hold");
    else A.ensure("anim_player_idle");
  }
  update(dt) { this.anim.update(dt); }
  draw() {
    const f = this.anim.frame(); if (!f) return;
    const blink = this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0;
    drawSprite(f, this.x, this.y, this.facing < 0, { alpha: blink ? 0.35 : 1 });
    debugBox(this.hurtbox(), "#3f6");
  }
}

class Bullet {
  constructor(x, y, ang) { this.x = x; this.y = y; this.ang = ang; this.vx = Math.cos(ang) * PEASHOT.speed; this.vy = Math.sin(ang) * PEASHOT.speed; this.anim = new Animator(null); this.anim.play("anim_peashot_basic_loop"); this.dead = false; }
  update(dt, level) {
    this.x += this.vx * dt; this.y += this.vy * dt; this.anim.update(dt);
    if (Math.abs(this.x - cam.x) > 760 || this.y > 460 || this.y < -420) { this.dead = true; return; }
    for (const boss of level.bossParts()) {
      if (!boss.canBeHit()) continue;
      if (boss.hurtShapes().some((s) => pointInShape(this.x, this.y, s, 8))) {
        this.dead = true; level.damageBoss(PEASHOT.damage, boss);
        level.effects.push(new Effect("anim_peashot_basic_die", this.x, this.y, this.vx < 0));
        if (Math.random() < 0.35) sfx("player_shoot_hit", 0.25);
        return;
      }
    }
  }
  draw() { const f = this.anim.frame(); if (f) drawSprite(f, this.x, this.y, false, { rot: this.ang }); }
}

// ---------------------------------------------------------------- Goopy (SlimeLevelSlime)
class Slime {
  constructor(level, big) {
    this.level = level; this.big = big;
    // scene: Slime pos (369,-247) / BigSlime spawned on TurnBig; serialized fields from level20
    this.x = big ? 1144 : 369; this.y = -247; this.onGroundY = -247;
    this.maxX = big ? 500 : 560; this.punchMaxX = 200; this.punchMinX = big ? -425 : -1000; this.shadowMaxY = big ? 350 : 300;
    this.facing = 0; // Direction: 0 = Left (scale +1), 1 = Right (scale -1)
    this.active = !big; this.dead = false; this.inAir = false; this.vy = 0; this.gravity = 0;
    this.firstTime = true; this.firstPunch = false; this.wantsToTransform = false; this.dieOnLand = false;
    this.props = level.state; // CurrentPropertyState
    this.jumpsBeforeFirstPunch = level.mode.states[0].jump.bigInit; // LevelInit: from the state active at level start
    this.anim = new Animator(this); this.co = new Runner();
    this.goingUp = false; this.turning = false; this.flash = 0; this.questionMarks = null; this.state = "intro";
    if (!big) this.anim.play(this.A("intro"), this.A("intro_loop"));
  }
  A(s) { return "anim_level_slime_" + (this.big ? "big" : "small") + "_slime_" + s; }
  get scaleX() { return this.facing === 1 ? -1 : 1; }
  canBeHit() { return this.active && !this.dead; }
  local(lx, ly) { return [this.x + lx * this.scaleX, this.y + ly]; }
  shapes() {
    const n = this.anim.name || "", s = [];
    const punching = /_punch$|_punch_hold$/.test(n) || (/_punch_end$/.test(n) && this.anim.t < 0.1);
    if (!this.big) {
      if (punching) { // anim_level_slime_small_slime_punch_hold: circle (-390,210) r170, arm box (28,154) 65x310
        const [gx, gy] = this.local(-390, 210); s.push({ type: "c", x: gx, y: gy, r: 170 });
        const [bx, by] = this.local(28, 154); s.push({ type: "b", x: bx, y: by, w: 65, h: 310 });
      } else { const [cx, cy] = this.local(0, 75); s.push({ type: "c", x: cx, y: cy, r: 80 }); }
    } else {
      const [cx, cy] = this.local(0, 130); s.push({ type: "c", x: cx, y: cy, r: 160 });
      if (punching) { // big punch_hold: circle (-550,180) r110, arm box (-285,175) 330x42
        const [gx, gy] = this.local(-550, 180); s.push({ type: "c", x: gx, y: gy, r: 110 });
        const [bx, by] = this.local(-285, 175); s.push({ type: "b", x: bx, y: by, w: 330, h: 42 });
      }
    }
    return s;
  }
  hurtShapes() { return this.shapes(); }
  // ---- coroutines (SlimeLevelSlime.jump_cr / punch_cr / turn_cr)
  startJump() { this.state = "jump"; this.co.start(this.jumpCr()); }
  *jumpCr() {
    let P = this.props.jump;
    const pattern = P.pattern.split(",");
    let i = randInt(0, pattern.length);
    let numJumpsLeft = 0;
    if (this.firstTime && this.big) { numJumpsLeft = P.bigInit; this.firstTime = false; }
    else numJumpsLeft = randInt(P.numMin, P.numMax);
    this.toSquish();
    let delay = P.groundDelay;
    for (;;) {
      if (pattern[i][0] === "D") { delay = parseFloat(pattern[i].substring(1)) || 0; i = (i + 1) % pattern.length; continue; }
      yield* until(() => this.anim.name === this.A("jump_squish_loop"));
      sfx(this.big ? "slime_big_jump" : "slime_small_jump", 0.8);
      yield* wait(delay);
      this.anim.play(this.A("jump_squish_end"), this.A("jump_up"));
      yield* until(() => this.anim.name === this.A("jump_up"));
      P = this.props.jump;
      let high = pattern[i][0] === "H";
      if (pattern[i][0] === "R") high = Math.random() < 0.5;
      this.vy = high ? P.hjV : P.ljV;
      let speedX = high ? P.hjH : P.ljH;
      this.gravity = high ? P.hjG : P.ljG;
      this.inAir = true; let moveDir = this.facing; this.goingUp = true;
      while (this.goingUp || this.y > this.onGroundY) {
        const dt = yield;
        this.vy -= this.gravity * dt;
        const vx = moveDir === 0 ? -speedX : speedX;
        this.x += vx * dt; this.y += this.vy * dt;
        if (this.vy < 0 && this.goingUp) { this.goingUp = false; if (!this.turning) this.anim.play(this.A("jump_apex"), this.A("jump_down")); }
        if ((moveDir === 0 && this.x < -this.maxX) || (moveDir === 1 && this.x > this.maxX)) {
          this.x = moveDir === 0 ? -this.maxX : this.maxX;
          moveDir = moveDir === 0 ? 1 : 0;
          if (!this.goingUp) speedX = 0;
          this.turn();
        }
      }
      // land
      this.y = this.onGroundY; this.inAir = false; delay = P.groundDelay;
      let coef = high ? 1.5 : 1.0; coef *= this.big ? 2 : 1;
      shake(5 * coef, 0.2 * coef);
      this.level.effects.push(new Effect(this.A(Math.random() < 0.5 ? "dust_a" : "dust_b"), this.x, this.y, this.facing === 1));
      if (this.wantsToTransform && this.x > -350 && this.x < 350) { this.transform(); return; }
      if (this.dieOnLand) { this.anim.play(this.A("death_ground"), this.A("death_loop")); this.onDeathAnim(); return; }
      this.toSquish();
      if (this.big && !this.firstPunch) {
        this.jumpsBeforeFirstPunch--;
        if (this.jumpsBeforeFirstPunch === 0) { this.firstPunch = true; yield* this.punch(true); return; }
      } else {
        numJumpsLeft--;
        if (numJumpsLeft <= 0 && this.inPunchPosition()) { yield* this.punch(false); return; }
      }
      i = (i + 1) % pattern.length;
    }
  }
  toSquish() { this.turning = false; this.anim.play(this.A("jump_squish_start"), this.A("jump_squish_loop")); }
  turn() {
    // turn_cr: play the up/down turn clip, then flip facing at its end
    this.turning = true;
    const n = this.goingUp ? this.A("jump_up_turn") : this.A("jump_down_turn");
    this.anim.play(n);
    this.co.start((function* (self) {
      yield* until(() => self.anim.done || self.anim.name !== n);
      self.facing = self.facing === 0 ? 1 : 0; self.turning = false;
      if (self.inAir) self.anim.play(self.goingUp ? self.A("jump_up") : self.A("jump_down"));
    })(this));
  }
  inPunchPosition() {
    const p = this.level.player;
    if (p.x > this.x && this.x < this.punchMaxX && this.x > this.punchMinX) return true;
    if (p.x < this.x && this.x > -this.punchMaxX && this.x < -this.punchMinX) return true;
    return false;
  }
  *punch(blink) {
    this.state = "punch";
    const p = this.level.player;
    const punchDirection = p.x > this.x ? 1 : 0;
    const turnNeeded = punchDirection !== this.facing;
    yield* until(() => this.anim.name === this.A("jump_squish_loop"));
    const pre = this.A("punch_pre_hold");
    if (blink) this.anim.play(this.A(turnNeeded ? "punch_blink_start_turn" : "punch_blink_start"), pre);
    else this.anim.play(this.A(turnNeeded ? "punch_start_turn" : "punch_start"), pre);
    yield* until(() => this.anim.name === pre);
    yield* wait(this.props.punch.preHold);
    this.anim.play(this.A("punch"), this.A("punch_hold"));
    yield* until(() => this.anim.name === this.A("punch_hold"));
    yield* wait(this.props.punch.mainHold);
    this.anim.play(this.A("punch_end"));
    yield* until(() => this.anim.done);
    this.startJump();
  }
  transform() {
    this.state = "transform"; this.co.stopAll();
    this.anim.play(this.A("transform"));
  }
  onAnimEvent(name) {
    switch (name) {
      case "PunchTurn": this.facing = this.facing === 0 ? 1 : 0; break;
      case "SmallStretchPunchAudio": sfx("slime_small_stretch_punch", 0.8); break;
      case "BigPunchAudio": sfx("slime_big_punch", 0.8); sfx("slime_big_punch_voice", 0.7); break;
      case "SmallLandAudio": sfx("slime_small_land", 0.8); break;
      case "BigLandAudio": sfx("slime_big_land", 0.9); break;
      case "BlinkAudio": sfx("slime_blink", 0.7); break;
      case "IntroAudio": sfx("slime_small_intro_anim", 0.9); break;
      case "SmallTransformAudio": sfx("slime_small_transform", 0.9); break;
      case "BigDeathAudio": sfx("slime_big_death", 0.9); sfx("slime_big_death_voice", 0.8); break;
      case "QuestionMarksOn": this.questionMarks = ["a", "b", "c"].map((k) => { const a = new Animator(null); a.play(`anim_level_slime_question_mark_${k}_start`, `anim_level_slime_question_mark_${k}_loop`); return a; }); break;
      case "QuestionMarksOff": if (this.questionMarks) this.questionMarks.forEach((a, i) => a.play(`anim_level_slime_question_mark_${"abc"[i]}_end`)); break;
      case "TurnBig": this.level.turnBig(this); break;
    }
  }
  deathTransform() {
    // SlimeLevelSlime.DeathTransform: die on landing if airborne, otherwise immediately
    if (this.dead) return;
    if (this.inAir) { this.dieOnLand = true; return; }
    this.die();
  }
  die() {
    this.co.stopAll(); this.dead = true; this.state = "dead";
    this.anim.play(this.A("death_ground"), this.A("death_loop"));
    this.onDeathAnim();
  }
  onDeathAnim() {
    this.dead = true; this.co.stopAll();
    if (this.level.mode.states.length < 3 || this.level.modeKey === "simple") { this.level.knockout(); return; }
    // transformToTombstone_cr: wait for Death_Loop, then 3.5 s, then the tombstone drops
    this.co.start((function* (self) {
      yield* until(() => self.anim.name === self.A("death_loop"));
      yield* wait(3.5);
      self.level.tomb.startIntro(self.x);
    })(this));
  }
  update(dt) {
    if (!this.active) return;
    this.co.update(dt);
    this.anim.update(dt);
    if (this.questionMarks) this.questionMarks.forEach((a) => a.update(dt));
    if (this.flash > 0) this.flash -= dt;
    if (this.state === "transform" && this.anim.done) this.active = false;
  }
  draw() {
    if (!this.active) return;
    // shadow while airborne (updateShadow)
    if (this.inAir) {
      const sh = ANIM["anim_level_slime_small_slime_shadow"];
      const k = clamp(Math.floor(((this.y - this.onGroundY) / this.shadowMaxY) * sh.frames.length), 0, sh.frames.length - 1);
      const [sx, sy] = this.local(-129, 187);
      drawSprite(sh.frames[k][0], sx, this.onGroundY + 187, this.facing === 1);
    }
    const f = this.anim.frame();
    const [x, y] = this.local(-126, 184);
    if (f) drawSprite(f, x, y, this.facing === 1, { flash: this.flash > 0 });
    if (this.questionMarks) {
      [[-209, 226], [0, 403], [209, 226]].forEach(([qx, qy], i) => {
        const a = this.questionMarks[i]; if (a.done) return;
        const [X, Y] = this.local(qx, qy); const fr = a.frame(); if (fr) drawSprite(fr, X, Y);
      });
    }
    if (showHitboxes) this.shapes().forEach((s) => s.type === "c" ? debugCircle(s.x, s.y, s.r, "#f44") : debugBox(s, "#f44"));
  }
}

// ---------------------------------------------------------------- tombstone (SlimeLevelTombstone)
class Tombstone {
  constructor(level) {
    this.level = level; this.x = 0; this.y = 590; this.active = false; this.direction = 0; // 0 = left, 1 = right
    this.anim = new Animator(this); this.co = new Runner(); this.dealDamage = false; this.receiver = true;
    this.wantsToSmash = false; this.offsetIndex = 0; this.flash = 0; this.dead = false; this.radius = 100; this.dirt = null;
  }
  get props() { return this.level.state.tomb; }
  canBeHit() { return this.active && this.receiver && !this.dead && this.y <= -80; }
  hurtShapes() { return [{ type: "c", x: this.x - 15, y: this.y + 170, r: 100 }]; }
  // anim_level_slime_tombstone_smash animates the circle: offset (-15, 0), radius 100 -> 250
  damageShapes() { return [{ type: "c", x: this.x - 15, y: this.y, r: 250 }]; }
  shapes() { return this.dealDamage ? this.damageShapes() : this.hurtShapes(); }
  startIntro(x) {
    this.x = clamp(x, -500, 500); this.y = 550; this.active = true;
    this.offsetIndex = randInt(0, this.props.offsets.length);
    this.co.start(this.introCr());
  }
  *introCr() {
    sfx("slime_tombstone_drop_onto_slime");
    this.falling = true; // draw the first landing frame while it drops
    // TweenPositionY(550 -> -80, 0.2 s, linear); crush_slime_cr explodes the big slime once y <= 70
    let t = 0, crushed = false;
    while (t < 0.2) {
      const dt = yield; t += dt;
      this.y = 550 + (-80 - 550) * clamp(t / 0.2, 0, 1);
      if (!crushed && this.y <= 70) { crushed = true; this.level.explodeBig(); }
    }
    this.y = -80; this.falling = false;
    if (!crushed) this.level.explodeBig();
    shake(20, 0.7);
    this.level.effects.push(new Effect("anim_level_slime_tombstone_dust", this.x, this.y + 10));
    this.anim.play("anim_level_slime_tombstone_land");
    yield* until(() => this.anim.done);
    this.startMove();
  }
  startMove() { this.wantsToSmash = false; this.co.start(this.moveCr()); this.co.start(this.waitForSmashCr()); }
  *waitForSmashCr() { yield* wait(rand(this.props.delayMin, this.props.delayMax)); this.wantsToSmash = true; }
  *slideTo(endX, onStep) {
    const startX = this.x, moveTime = Math.abs(startX - endX) / this.props.moveSpeed;
    let t = 0;
    while (t < moveTime) {
      const dt = yield; t += dt;
      this.x = easeInOutSine(startX, endX, t / moveTime);
      if (onStep && onStep()) return true;
    }
    return false;
  }
  *moveCr() {
    this.direction = Math.random() < 0.5 ? 0 : 1;
    const offsets = this.props.offsets.split(",").map((s) => parseFloat(s) || 0);
    this.offsetIndex = (this.offsetIndex + 1) % offsets.length;
    const offset = offsets[this.offsetIndex];
    let justStarted = true;
    while (!this.wantsToSmash) {
      yield* this.startMoveAnim(justStarted);
      yield* this.slideTo(this.direction === 1 ? 500 : -500);
      this.direction = this.direction === 1 ? 0 : 1; justStarted = false;
    }
    yield* this.startMoveAnim(false);
    const p = this.level.player; let targetX = 0;
    const centered = yield* this.slideTo(this.direction === 1 ? 500 : -500, () => {
      targetX = p.x + offset;
      return (this.direction === 1 && this.x > targetX) || (this.direction === 0 && this.x < targetX);
    });
    if (!centered) targetX = p.x + offset;
    this.x = clamp(targetX, -500, 500);
    this.dirt = null;
    yield* this.smashCr();
  }
  *startMoveAnim(first) {
    const n = this.direction === 1 ? "anim_level_slime_tombstone_move_right" : "anim_level_slime_tombstone_move_left";
    this.anim.play(n + "_start", n);
    yield* until(() => this.anim.name === n);
    this.dirt = new Animator(null); this.dirt.play("anim_level_slime_tombstone_dirt");
    if (first) sfx("slime_tombstone_taunts", 0.8);
    sfx("slime_tombstone_slide", 0.6);
  }
  *smashCr() {
    this.anim.play("anim_level_slime_tombstone_smash_start", "anim_level_slime_tombstone_smash_pre_hold");
    yield* until(() => this.anim.name === "anim_level_slime_tombstone_smash_pre_hold");
    sfx("slime_tombstone_splat_start", 0.9);
    yield* wait(this.props.anticipationHold);
    this.anim.play("anim_level_slime_tombstone_smash");
    sfx("slime_tombstone_splat", 0.9);
    yield* until(() => this.anim.done);
    this.startMove();
  }
  onAnimEvent(name) {
    switch (name) {
      case "DisableDamageReceiver": this.receiver = false; break;
      case "EnableDamageReceiver": this.receiver = true; break;
      case "EnableDamageDealer": this.dealDamage = true; break;
      case "DisableDamageDealer": this.dealDamage = false; break;
      case "OnSmash":
        shake(30, 0.7);
        this.level.effects.push(new Effect("anim_level_slime_tombstone_slam_dust_back", this.x, this.y));
        this.level.effectsFront.push(new Effect("anim_level_slime_tombstone_slam_dust_front", this.x, this.y));
        break;
      case "TombstoneTauntsAudio": sfx("slime_tombstone_taunts", 0.8); break;
    }
  }
  onBossDeath() {
    this.dead = true; this.co.stopAll(); this.dealDamage = false; this.dirt = null;
    this.anim.play("anim_level_slime_tombstone_death");
    sfx("slime_tombstone_death");
  }
  update(dt) {
    if (!this.active) return;
    this.co.update(dt); this.anim.update(dt);
    if (this.dirt) this.dirt.update(dt);
    if (this.flash > 0) this.flash -= dt;
  }
  draw() {
    if (!this.active) return;
    const f = this.falling ? ANIM["anim_level_slime_tombstone_land"].frames[0][0] : this.anim.frame();
    if (f) drawSprite(f, this.x - 35, this.y, false, { flash: this.flash > 0 });
    if (this.dirt) { const d = this.dirt.frame(); if (d) drawSprite(d, this.x, this.y - 70, this.direction !== 1); }
    if (showHitboxes) { this.hurtShapes().forEach((s) => debugCircle(s.x, s.y, s.r, "#f44")); if (this.dealDamage) this.damageShapes().forEach((s) => debugCircle(s.x, s.y, s.r, "#fa0")); }
  }
}

// ---------------------------------------------------------------- level
class Level {
  constructor(modeKey) {
    this.modeKey = modeKey; this.mode = MODES[modeKey];
    this.total = this.mode.health; this.health = this.total;
    this.stateIndex = 0; this.state = this.mode.states[0];
    this.player = new Player(this);
    this.small = new Slime(this, false); this.big = new Slime(this, true); this.tomb = new Tombstone(this);
    this.bullets = []; this.effects = []; this.effectsFront = [];
    this.time = 0; this.fighting = false; this.ended = false; this.won = false; this.banner = null;
    this.co = new Runner(); this.co.start(this.introCr());
    this.bgAnims = { stream: new Animator(null) }; this.bgAnims.stream.play("slime_bg_stream");
    cam.x = 0;
  }
  bossParts() { return [this.small, this.big, this.tomb]; }
  *introCr() {
    this.banner = { text: "READY?", t: 0 };
    yield* wait(0.4);
    sfx("level_announcer_0001", 1);
    yield* wait(1.8);
    this.banner = { text: "WALLOP!", t: 0 };
    sfx("level_announcer_0002", 1);
    yield* wait(1.0);
    this.banner = null;
    // OnLevelStart: smallSlime.IntroContinue(); slimePattern_cr waits 1 s before the first jump
    this.fighting = true;
    this.small.anim.play(this.small.A("jump_squish_start"), this.small.A("jump_squish_loop"));
    yield* wait(1.0);
    this.small.startJump();
  }
  damageBoss(dmg, part) {
    if (this.ended || !this.fighting) return;
    part.flash = 0.05;
    this.health = Math.max(0, this.health - dmg);
    const frac = this.health / this.total;
    // Level timeline: next state when health fraction drops below its trigger
    while (this.stateIndex + 1 < this.mode.states.length && frac <= this.mode.states[this.stateIndex + 1].at) {
      this.stateIndex++; this.state = this.mode.states[this.stateIndex];
      this.onStateChanged();
    }
    if (this.health <= 0) this.onBossDeath();
  }
  onStateChanged() {
    const name = this.state.name;
    if (name === "BigSlime") { this.reachedBig = true; this.small.wantsToTransform = true; }
    else if (name === "Tombstone") { this.big.deathTransform(); }
    if (!this.reachedBig) this.small.props = this.state;
    this.big.props = this.state;
  }
  onBossDeath() {
    if (this.tomb.active) { this.tomb.onBossDeath(); this.knockout(); }
    else if (this.big.active) { this.big.deathTransform(); if (!this.big.dieOnLand) this.knockout(); }
    else this.knockout();
  }
  turnBig(small) {
    const b = this.big;
    b.x = small.x; b.y = small.y; b.facing = small.facing; b.active = true; b.props = this.state;
    b.startJump();
    small.active = false;
  }
  explodeBig() {
    if (!this.big.active) return;
    this.effects.push(new Effect("anim_level_slime_big_slime_explode", this.big.x, this.big.y + 100, this.big.facing === 1));
    this.big.active = false;
  }
  knockout() {
    if (this.ended) return;
    this.ended = true; this.won = true; this.player.stopFire();
    this.banner = { text: "KNOCKOUT!", t: 0 };
    sfx("level_knockout_bell"); sfx("level_knockout_boom"); sfx("level_announcer_knockout", 1);
    this.co.start((function* (self) { yield* wait(3.5); self.banner = null; self.showResults = true; })(this));
  }
  onPlayerDeath() {
    this.ended = true;
    this.co.start((function* (self) { yield* wait(2.5); self.showDeathCard = true; })(this));
  }
  fixedUpdate(dt) {
    this.co.update(dt);
    if (this.fighting && !this.ended) this.time += dt;
    this.player.fixedUpdate(dt);
    for (const p of this.bossParts()) p.update(dt);
    this.player.update(dt);
    // contact damage (OnCollisionPlayer -> DamageDealer.DealDamage)
    if (!this.ended) {
      const hb = this.player.hurtbox();
      for (const part of [this.small, this.big]) {
        if (!part.active || part.dead) continue;
        if (part.shapes().some((s) => shapeHitsBox(s, hb))) this.player.takeDamage(part.x);
      }
      if (this.tomb.active && this.tomb.dealDamage && this.tomb.damageShapes().some((s) => shapeHitsBox(s, hb))) this.player.takeDamage(this.tomb.x);
    }
    this.bullets.forEach((b) => b.update(dt, this)); this.bullets = this.bullets.filter((b) => !b.dead);
    for (const list of [this.effects, this.effectsFront]) list.forEach((e) => e.update(dt));
    this.effects = this.effects.filter((e) => !e.dead); this.effectsFront = this.effectsFront.filter((e) => !e.dead);
    this.bgAnims.stream.update(dt);
    if (this.banner) this.banner.t += dt;
    // camera follows the player along the path (-100 .. 100)
    const target = clamp(this.player.x * (100 / PLAYER_BOUND), -100, 100);
    cam.x += (target - cam.x) * Math.min(1, dt * 4);
    if (cam.shakeLeft > 0) {
      cam.shakeLeft -= dt; const k = cam.shakeLeft / cam.shakeTime;
      cam.ox = rand(-1, 1) * cam.shakeAmt * k; cam.oy = rand(-1, 1) * cam.shakeAmt * k;
    } else { cam.ox = cam.oy = 0; }
  }
  drawBackground(front) {
    const FG = 1332646295;
    const layers = DATA.background.filter((l) => l.enabled && (front ? l.layer === FG : l.layer !== FG));
    const order = (l) => (l.name === "slime_bg_stream" ? -199 : l.order);
    layers.sort((a, b) => order(a) - order(b));
    for (const l of layers) {
      const spr = l.name === "slime_bg_stream" ? this.bgAnims.stream.frame() : l.sprite;
      drawSprite(spr, l.x, l.y, l.sx < 0, { sx: Math.abs(l.sx), sy: l.sy, alpha: l.alpha });
    }
  }
  draw() {
    this.drawBackground(false);
    this.tomb.draw();
    this.big.draw(); this.small.draw();
    this.effects.forEach((e) => e.draw());
    this.player.draw();
    this.bullets.forEach((b) => b.draw());
    this.effectsFront.forEach((e) => e.draw());
    this.drawBackground(true);
  }
}

// ---------------------------------------------------------------- screens & HUD
function outlinedText(text, x, y, size, fill = "#fff", align = "center") {
  ctx.save();
  ctx.font = `${size}px CupheadVogue, Georgia, serif`; ctx.textAlign = align; ctx.textBaseline = "middle";
  ctx.lineJoin = "round"; ctx.lineWidth = Math.max(4, size / 7); ctx.strokeStyle = "#1a1210";
  if (fill !== "#1a1210") ctx.strokeText(text, x, y); // dark text on light cards needs no outline
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
  ctx.restore();
}
function drawHUD(level) {
  const p = level.player;
  ctx.save();
  ctx.fillStyle = p.hp <= 1 ? (Math.floor(performance.now() / 200) % 2 ? "#e33" : "#fff") : "#f4efe1";
  ctx.strokeStyle = "#1a1210"; ctx.lineWidth = 4;
  roundRect(24, H - 64, 110, 40, 8); ctx.fill(); ctx.stroke();
  ctx.restore();
  outlinedText(p.hp > 0 ? `HP. ${p.hp}` : "DEAD", 79, H - 43, 26, p.hp <= 1 ? "#fff" : "#1a1210");
  if (showHitboxes) {
    ctx.save(); ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(W - 360, 10, 350, 92); ctx.fillStyle = "#fff"; ctx.font = "15px monospace";
    ctx.fillText(`boss HP ${level.health.toFixed(0)}/${level.total}  stato ${level.state.name}`, W - 350, 30);
    const s = level.small.active ? level.small : level.big;
    ctx.fillText(`slime: ${s.state}  ${s.anim.name ? s.anim.name.replace("anim_level_slime_", "") : ""}`, W - 350, 52);
    ctx.fillText(`tomba: ${level.tomb.active ? (level.tomb.dealDamage ? "SMASH!" : level.tomb.anim.name.replace("anim_level_slime_tombstone_", "")) : "-"}`, W - 350, 74);
    ctx.fillText(`tempo ${level.time.toFixed(1)}s  (H = nascondi)`, W - 350, 96);
    ctx.restore();
  }
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function drawBanner(b) {
  if (!b) return;
  const s = Math.min(1, b.t / 0.15);
  ctx.save(); ctx.translate(W / 2, H / 2 - 40); ctx.scale(0.6 + 0.4 * s, 0.6 + 0.4 * s);
  outlinedText(b.text, 0, 0, b.text === "KNOCKOUT!" ? 130 : 110, b.text === "KNOCKOUT!" ? "#e8c54a" : "#f4efe1");
  ctx.restore();
}

// film grain + vignette, like Cuphead's screen overlay
const grain = document.createElement("canvas"); grain.width = grain.height = 256;
(function makeGrain() {
  const g = grain.getContext("2d"), id = g.createImageData(256, 256);
  for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0);
})();
function drawOverlay() {
  ctx.save();
  ctx.globalAlpha = 0.06; ctx.globalCompositeOperation = "overlay";
  const ox = Math.random() * 256, oy = Math.random() * 256;
  for (let x = -ox; x < W; x += 256) for (let y = -oy; y < H; y += 256) ctx.drawImage(grain, x, y);
  ctx.restore();
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, "rgba(40,25,10,0)"); g.addColorStop(1, "rgba(40,25,10,0.45)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "rgba(255,240,215,0.12)"; ctx.fillRect(0, 0, W, H); ctx.restore();
}

// ---------------------------------------------------------------- main loop
let scene = "loading", level = null, modeSel = 1, paused = false, acc = 0, last = performance.now();

function titleScreen() {
  ctx.fillStyle = "#211a14"; ctx.fillRect(0, 0, W, H);
  if (DATA) {
    const save = cam.x; cam.x = 0;
    const fakeLevelBg = DATA.background.filter((l) => l.enabled).sort((a, b) => (a.layer === b.layer ? a.order - b.order : a.layer === 1332646295 ? 1 : -1));
    ctx.globalAlpha = 0.45; fakeLevelBg.forEach((l) => drawSprite(l.sprite, l.x, l.y, false, { sx: Math.abs(l.sx), sy: l.sy })); ctx.globalAlpha = 1;
    const idle = ANIM["anim_level_slime_small_slime_intro_loop"]; const fr = idle.frames[Math.floor(performance.now() / 70) % idle.frames.length][0];
    drawSprite(fr, 420 - 126, -150 + 184);
    cam.x = save;
  }
  outlinedText("GOOPY LE GRANDE", W / 2, 110, 84, "#f4efe1");
  outlinedText("ricostruzione da reverse engineering", W / 2, 175, 30, "#e8c54a");
  MODE_KEYS.forEach((k, i) => outlinedText((i === modeSel ? "▶ " : "") + MODES[k].label + (i === modeSel ? " ◀" : ""), W / 2 - 200, 290 + i * 62, i === modeSel ? 46 : 38, i === modeSel ? "#fff" : "#b9ad95"));
  outlinedText("Premi INVIO o Z per iniziare", W / 2, 520, 34, "#f4efe1");
  ctx.save(); ctx.font = "19px Georgia, serif"; ctx.fillStyle = "#f4efe1"; ctx.textAlign = "center";
  ctx.fillText("Frecce / WASD: muovi e mira   •   Z / Spazio: salta (in aria: parry)   •   X: spara   •   Shift / C: dash", W / 2, 600);
  ctx.fillText("Giù: abbassati   •   Su: mira in alto   •   H: mostra hitbox   •   Esc: pausa   •   R: ricomincia", W / 2, 630);
  ctx.fillText("Sprite, suoni e numeri estratti dalla tua copia di Cuphead — solo per uso personale.", W / 2, 680);
  ctx.restore();
}

function loadingScreen() {
  ctx.fillStyle = "#211a14"; ctx.fillRect(0, 0, W, H);
  const p = loadProgress.done / loadProgress.total;
  ctx.fillStyle = "#f4efe1"; ctx.fillRect(W / 2 - 300, H / 2 + 30, 600 * p, 18);
  ctx.strokeStyle = "#f4efe1"; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - 300, H / 2 + 30, 600, 18);
  ctx.font = "28px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText(loadProgress.label || "Caricamento…", W / 2, H / 2 - 10);
}

function deathCard(L) {
  ctx.fillStyle = "rgba(20,12,8,0.6)"; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.fillStyle = "#f4efe1"; ctx.strokeStyle = "#1a1210"; ctx.lineWidth = 6; roundRect(W / 2 - 300, 150, 600, 380, 18); ctx.fill(); ctx.stroke(); ctx.restore();
  outlinedText("SEI MORTO!", W / 2, 215, 64, "#e33");
  const prog = 1 - L.health / L.total;
  ctx.save(); ctx.strokeStyle = "#1a1210"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(W / 2 - 220, 330); ctx.lineTo(W / 2 + 220, 330); ctx.stroke();
  L.mode.states.slice(1).forEach((s) => { const x = W / 2 - 220 + 440 * (1 - s.at); ctx.beginPath(); ctx.arc(x, 330, 8, 0, 7); ctx.fillStyle = "#1a1210"; ctx.fill(); });
  ctx.restore();
  drawSpriteScreen("cuphead_idle_0001", W / 2 - 220 + 440 * prog, 318, 0.45);
  outlinedText(`Boss: ${(prog * 100).toFixed(0)}%   tempo ${L.time.toFixed(1)}s`, W / 2, 400, 30, "#1a1210");
  outlinedText("INVIO / Z: riprova     ESC: menu", W / 2, 470, 30, "#1a1210");
}

function resultsCard(L) {
  ctx.fillStyle = "rgba(20,12,8,0.6)"; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.fillStyle = "#f4efe1"; ctx.strokeStyle = "#1a1210"; ctx.lineWidth = 6; roundRect(W / 2 - 320, 120, 640, 460, 18); ctx.fill(); ctx.stroke(); ctx.restore();
  outlinedText("VITTORIA!", W / 2, 185, 70, "#e8c54a");
  const t = L.time, hp = L.player.hp;
  // simplified grade: Level.GoalTimes = 120 s for every mode (from GetMode)
  let score = (t <= 120 ? 2 : t <= 180 ? 1 : 0) + hp;
  const grade = L.modeKey === "simple" ? "C" : ["C", "B-", "B", "B+", "A-", "A"][Math.min(5, score)];
  outlinedText(`Tempo: ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`, W / 2, 280, 40, "#1a1210");
  outlinedText(`Punti vita: ${hp}/3`, W / 2, 335, 40, "#1a1210");
  outlinedText(`Difficoltà: ${L.mode.label}`, W / 2, 390, 40, "#1a1210");
  outlinedText(`Voto: ${grade}`, W / 2, 455, 54, "#e33");
  outlinedText("INVIO / Z: rigioca     ESC: menu", W / 2, 535, 28, "#1a1210");
}

function startLevel() {
  level = new Level(MODE_KEYS[modeSel]); scene = "game"; paused = false; startMusic();
}

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  pollGamepad();
  if (pressed.debug) { showHitboxes = !showHitboxes; delete pressed.debug; }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (scene === "loading") loadingScreen();
  else if (scene === "title") {
    if (pressed.up) modeSel = (modeSel + 2) % 3;
    if (pressed.down) modeSel = (modeSel + 1) % 3;
    if (pressed.start || pressed.jump) { if (AC.state === "suspended") AC.resume(); startLevel(); }
    titleScreen();
  } else if (scene === "game") {
    if (pressed.pause && !level.showResults && !level.showDeathCard) { paused = !paused; delete pressed.pause; }
    if (pressed.restart) { delete pressed.restart; startLevel(); }
    let stepped = false;
    if (!paused) {
      acc += dt;
      while (acc >= FIXED) { level.fixedUpdate(FIXED); for (const k in pressed) if (k !== "start" && k !== "pause") delete pressed[k]; acc -= FIXED; stepped = true; }
    }
    if (!stepped && !paused) { // high refresh rate: keep presses for the next physics step
      level.draw(); drawOverlay(); drawHUD(level); drawBanner(level.banner);
      requestAnimationFrame(frame); return;
    }
    level.draw();
    drawOverlay();
    drawHUD(level);
    drawBanner(level.banner);
    if (paused) { ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(0, 0, W, H); outlinedText("PAUSA", W / 2, H / 2, 90); outlinedText("Esc: riprendi   R: ricomincia", W / 2, H / 2 + 80, 30); }
    if (level.showDeathCard || level.showResults) {
      level.showDeathCard ? deathCard(level) : resultsCard(level);
      if (pressed.start || pressed.jump) startLevel();
      else if (pressed.pause) { stopMusic(); scene = "title"; }
    }
  }
  for (const k in pressed) delete pressed[k];
  requestAnimationFrame(frame);
}

loadAll().then(() => { if (scene === "test") return; scene = "title"; if (location.hash === "#autostart") { modeSel = 1; startLevel(); } })
  .catch((e) => { scene = "error"; console.error(e); ctx.fillStyle = "#300"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#fff"; ctx.font = "24px monospace"; ctx.fillText("Errore di caricamento: " + e, 40, 80); ctx.fillText("Avvia con ./avvia.sh (serve un server locale).", 40, 120); });
requestAnimationFrame(frame);

// expose for automated checks
window.__goopy = {
  get level() { return level; }, MODES, PM, Level, keys, pressed, FIXED, loadAll,
  setHitboxes(v) { showHitboxes = v; },
  render(L) { ctx.setTransform(1, 0, 0, 1, 0, 0); L.draw(); drawOverlay(); drawHUD(L); drawBanner(L.banner); if (L.showResults) resultsCard(L); if (L.showDeathCard) deathCard(L); },
  title() { titleScreen(); },
  initSync(data) { DATA = data; SPR = data.sprites; ANIM = data.anims; data.pages.forEach((_, i) => (PAGES[i] = document.getElementById("page" + i))); scene = "test"; },
};
