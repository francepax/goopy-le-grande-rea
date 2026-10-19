// Headless simulation of goopy-web/game.js: stubs the browser, runs the fight at fixed steps.
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = process.argv[2], MODE = process.argv[3] || "normal", SEED = +(process.argv[4] || 1);
let s = SEED; Math.random = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const noop = () => {};
const ctxStub = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (k === "createRadialGradient" || k === "createImageData" || k === "getContext") ? () => ({ addColorStop: noop, data: new Uint8ClampedArray(256 * 256 * 4) }) : noop), set: (t, k, v) => { t[k] = v; return true; } });
const canvasStub = { getContext: () => ctxStub, width: 1280, height: 720 };
const sandbox = {
  console, Math, JSON, Promise, Object, Array, Number, String, RegExp, parseFloat, Set, Map, setTimeout,
  window: {}, location: { hash: "" }, navigator: {},
  performance: { now: () => 0 },
  requestAnimationFrame: noop, addEventListener: noop,
  document: { getElementById: () => canvasStub, createElement: () => canvasStub, fonts: { load: async () => {} } },
  Image: class { set src(v) { setTimeout(() => this.onload && this.onload(), 0); } },
  fetch: async (p) => { const f = path.join(ROOT, p); return { json: async () => JSON.parse(fs.readFileSync(f)), arrayBuffer: async () => new ArrayBuffer(4) }; },
};
sandbox.window.AudioContext = class { constructor() { this.state = "running"; this.destination = {}; } createGain() { return { gain: {}, connect: noop }; } createBufferSource() { return { connect: noop, start: noop, stop: noop }; } decodeAudioData() { return Promise.resolve({}); } resume() {} };
vm.createContext(sandbox);
let code = fs.readFileSync(path.join(ROOT, "game.js"), "utf8");
code += "\n;globalThis.__api = { loadAll, Level, keys, pressed, MODES, FIXED, get cam(){return cam;} };";
vm.runInContext(code, sandbox); s = SEED;
const api = sandbox.__api;
(async () => {
  await api.loadAll();
  const L = new api.Level(MODE);
  const log = []; let lastState = "", lastSmall = "", lastBig = "", lastTomb = "";
  let t = 0, hits = 0;
  const origTake = L.player.takeDamage.bind(L.player);
  L.player.takeDamage = (x) => { if (L.player.invuln <= 0 && !L.ended) hits++; L.player.invuln = 2; };
  while (t < 400 && !L.showResults) {
    // simple bot: keep shooting, face the boss, step away from it
    const boss = L.tomb.active ? L.tomb : (L.big.active ? L.big : L.small);
    api.keys.shoot = true; api.keys.up = L.tomb.active;
    const dx = boss.x - L.player.x;
    api.keys.left = false; api.keys.right = false;
    if (Math.abs(dx) < 260) { if (dx > 0) api.keys.left = true; else api.keys.right = true; }
    else if (L.player.facing !== Math.sign(dx) || (L.tomb.active && Math.abs(dx) > 420)) { if (dx > 0) api.keys.right = true; else api.keys.left = true; }
    L.fixedUpdate(api.FIXED); t += api.FIXED;
    for (const k in api.pressed) delete api.pressed[k];
    const st = L.state.name;
    if (st !== lastState) { log.push(`${t.toFixed(2)}s  stato -> ${st}  (boss HP ${L.health.toFixed(0)})`); lastState = st; }
    const sm = L.small.active ? L.small.anim.name : "-"; const bg = L.big.active ? L.big.anim.name : "-"; const tb = L.tomb.active ? L.tomb.anim.name : "-";
    for (const [nm, cur, prev] of [["small", sm, lastSmall], ["big", bg, lastBig], ["tomb", tb, lastTomb]]) {
      if (cur !== prev && /transform|punch_start|punch_blink|death_ground|death_loop|explode|tombstone_land|smash$|tombstone_death|^-$/.test(cur || "")) log.push(`${t.toFixed(2)}s  ${nm}: ${(cur || "").replace("anim_level_slime_", "")}`);
    }
    lastSmall = sm; lastBig = bg; lastTomb = tb;
    if (L.banner && L.banner.t === 0) {}
  }
  console.log(log.join("\n"));
  console.log(`fine: t=${t.toFixed(1)}s  vinto=${L.won}  risultati=${!!L.showResults}  colpi subiti=${hits}  tempo livello=${L.time.toFixed(1)}s  bossHP=${L.health}`);
})().catch((e) => { console.error("ERRORE", e); process.exit(1); });
