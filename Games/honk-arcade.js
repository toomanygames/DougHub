/* Honk Empire arcade: three original 3D minigames drawn with three.js, loaded only when a game starts.
   Each game reports { won, score } and Honk Empire pays the prize (10% of current honks). */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { makeGoose } from "./honk-concert.js";

const INK = "#26283b";
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

export const ARCADE_GAMES = [
  { id: "catch", name: "Bread Catch", goal: "Catch 15 points of bread in 45 seconds. Golden bread is worth 3, burnt toast costs 2.", controls: "Move with A/D, the arrow keys or your mouse." },
  { id: "dash", name: "Lane Dash", goal: "Run 1000 m through town. One crash ends the run unless you have a shield.", controls: "A/D or arrows to switch lanes, W/Space to jump barriers, S/Down to slide under bars. On touch: swipe." },
  { id: "toss", name: "Bread Toss", goal: "Land 6 of 10 breads on the drifting lily pads.", controls: "Aim with your mouse (or arrows), click or press Space to throw." }
];

let cssDone = false;
function injectCss() {
  if (cssDone) return; cssDone = true;
  const s = document.createElement("style");
  s.textContent = `
  #arcade3d{position:fixed;inset:0;z-index:200;background:#bfe6f7;font-family:Nunito,system-ui,sans-serif;user-select:none;touch-action:none;color:${INK}}
  #arcade3d canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
  #arcade3d .a-top{position:absolute;top:12px;left:12px;right:12px;display:flex;gap:8px;align-items:flex-start;pointer-events:none}
  #arcade3d .a-pill{padding:7px 13px;border:3px solid ${INK};border-radius:13px;background:#fffaf0;font-weight:900;box-shadow:0 3px 0 ${INK}}
  #arcade3d .a-pill b{font-family:Fredoka,sans-serif;font-size:20px}
  #arcade3d .a-quit{margin-left:auto;pointer-events:auto;padding:7px 13px;border:3px solid ${INK};border-radius:12px;background:#e05a4f;color:#fff;font:600 15px Fredoka,sans-serif;box-shadow:0 3px 0 ${INK};cursor:pointer}
  #arcade3d .a-msg{position:absolute;left:50%;top:22%;transform:translateX(-50%);width:min(92%,640px);text-align:center;pointer-events:none}
  #arcade3d .a-msg h1{margin:0;font:700 clamp(30px,6vw,56px) Fredoka,sans-serif;color:#f7c948;-webkit-text-stroke:6px ${INK};paint-order:stroke fill}
  #arcade3d .a-msg p{margin:8px 0 0;font:600 clamp(14px,2.2vw,20px) Fredoka,sans-serif;color:#fff;-webkit-text-stroke:4px ${INK};paint-order:stroke fill}
  #arcade3d .a-pop{position:absolute;pointer-events:none;font:700 26px Fredoka,sans-serif;-webkit-text-stroke:5px ${INK};paint-order:stroke fill;animation:apop .8s ease-out forwards}
  @keyframes apop{to{transform:translateY(-50px);opacity:0}}
  #arcade3d .a-res{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(400px,92%);padding:22px;border:4px solid ${INK};border-radius:22px;background:#fffaf0;text-align:center;box-shadow:0 8px 0 ${INK}}
  #arcade3d .a-res h2{margin:0 0 6px;font:700 30px Fredoka,sans-serif}
  #arcade3d .a-res p{margin:4px 0;font-weight:800}
  #arcade3d .a-res button{margin-top:14px;padding:10px 18px;border:3px solid ${INK};border-radius:13px;background:#5fae4e;color:#fff;font:600 18px Fredoka,sans-serif;box-shadow:0 4px 0 ${INK};cursor:pointer}
  #arcade3d .hidden{display:none}`;
  document.head.appendChild(s);
}

export function startArcadeGame(id, opts) { return new Arcade(id, opts); }

class Arcade {
  constructor(id, { audio, muted, prizeText, onFinish }) {
    injectCss();
    this.def = ARCADE_GAMES.find(g => g.id === id); this.ac = audio; this.muted = muted; this.onFinish = onFinish; this.prizeText = prizeText;
    const root = this.root = document.createElement("div"); root.id = "arcade3d";
    root.innerHTML = `<canvas></canvas><div class="a-top"><div class="a-pill" data-score>Score <b>0</b></div><div class="a-pill" data-info></div><button class="a-quit" type="button">Quit</button></div>
      <div class="a-msg"><h1></h1><p></p></div><div class="a-res hidden"></div>`;
    document.body.appendChild(root);
    this.scoreEl = root.querySelector("[data-score] b"); this.infoEl = root.querySelector("[data-info]");
    this.msgH = root.querySelector(".a-msg h1"); this.msgP = root.querySelector(".a-msg p");
    root.querySelector(".a-quit").addEventListener("click", () => this.close(true));
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: root.querySelector("canvas"), antialias: true });
    r.setPixelRatio(Math.min(2, devicePixelRatio)); r.outputColorSpace = THREE.SRGBColorSpace; r.shadowMap.enabled = true;
    const s = this.scene = new THREE.Scene(); s.background = new THREE.Color("#bfe6f7"); s.fog = new THREE.Fog("#bfe6f7", 40, 90);
    this.cam = new THREE.PerspectiveCamera(55, 1, .1, 200);
    s.add(new THREE.HemisphereLight("#e8f7ff", "#5f8f45", 1.2));
    const sun = new THREE.DirectionalLight("#fff4dc", 1.8); sun.position.set(8, 20, 10); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20 }); s.add(sun);
    this.goose = makeGoose({ stage: false }); this.goose.root.traverse(o => { if (o.isMesh) o.castShadow = true; }); s.add(this.goose.root);
    this.score = 0; this.state = "ready"; this.keys = new Set(); this.pointer = null;
    this.game = ({ catch: setupCatch, dash: setupDash, toss: setupToss })[id](this);
    this.message(this.def.name, this.def.goal + " " + this.def.controls);
    this.infoEl.textContent = this.game.info();
    this.onKeyDown = e => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault(); if (e.code === "Escape") return this.close(true); this.keys.add(e.code); if (!e.repeat) this.game.key?.(e.code); };
    this.onKeyUp = e => this.keys.delete(e.code);
    this.onResize = () => { r.setSize(innerWidth, innerHeight, false); this.cam.aspect = innerWidth / innerHeight; this.cam.updateProjectionMatrix(); };
    addEventListener("keydown", this.onKeyDown); addEventListener("keyup", this.onKeyUp); addEventListener("resize", this.onResize); this.onResize();
    root.addEventListener("pointermove", e => { this.pointer = { x: e.clientX / innerWidth * 2 - 1, y: -(e.clientY / innerHeight) * 2 + 1 }; });
    root.addEventListener("pointerdown", e => { if (e.target.closest("button,.a-res")) return; this.pointer = { x: e.clientX / innerWidth * 2 - 1, y: -(e.clientY / innerHeight) * 2 + 1 }; this.game.click?.(this.pointer); });
    this.t0 = performance.now(); this.last = this.t0; this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
    if (["localhost", "127.0.0.1"].includes(location.hostname)) window.__arcade = this; // local testing only
  }
  message(h, p = "") { this.msgH.textContent = h; this.msgP.textContent = p; }
  addScore(n, at) {
    this.score = Math.max(0, this.score + n); this.scoreEl.textContent = this.score;
    if (at) { const v = at.clone().project(this.cam), el = document.createElement("div"); el.className = "a-pop"; el.textContent = (n > 0 ? "+" : "") + n; el.style.color = n > 0 ? "#f7c948" : "#e05a4f"; el.style.left = ((v.x + 1) / 2 * innerWidth - 20) + "px"; el.style.top = ((1 - v.y) / 2 * innerHeight - 30) + "px"; this.root.appendChild(el); setTimeout(() => el.remove(), 800); }
  }
  beep(f, d = .1, type = "square", g = .08) {
    if (this.muted || !this.ac) return;
    const t = this.ac.currentTime, o = this.ac.createOscillator(), gn = this.ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); gn.gain.setValueAtTime(.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + .01); gn.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(gn); gn.connect(this.ac.destination); o.start(t); o.stop(t + d + .02);
  }
  loop(now) {
    if (this.dead) return;
    const dt = Math.min(.05, (now - this.last) / 1000); this.last = now;
    const el = (now - this.t0) / 1000;
    // Games that load models first (Lane Dash) hold the countdown until they are ready.
    if (this.state === "ready" && this.game.isReady && !this.game.isReady()) { this.message("Loading…", this.def.goal); this.t0 = now; }
    else if (this.state === "ready" && el > 2.6) { this.state = "play"; this.message("GO!"); this.playStart = now; setTimeout(() => { if (this.state === "play") this.message(""); }, 700); }
    this.game.update(dt, this.state === "play" ? (now - this.playStart) / 1000 : 0, this.state === "play");
    this.infoEl.textContent = this.game.info();
    if (this.state === "play" && this.game.over()) this.end();
    this.renderer.render(this.scene, this.cam);
    requestAnimationFrame(this.loop);
  }
  end() {
    this.state = "done"; const won = this.game.won();
    this.won = won; this.beep(won ? 880 : 220, .4, won ? "triangle" : "sawtooth", .1);
    const res = this.root.querySelector(".a-res");
    res.innerHTML = `<h2>${won ? "You win!" : "So close!"}</h2><p>${this.game.summary()}</p><p>${won ? this.prizeText : "Win to earn the prize."}</p><button type="button">Back to the pond</button>`;
    res.classList.remove("hidden"); res.querySelector("button").addEventListener("click", () => this.close(false));
  }
  close(quit) {
    if (this.dead) return; this.dead = true;
    removeEventListener("keydown", this.onKeyDown); removeEventListener("keyup", this.onKeyUp); removeEventListener("resize", this.onResize);
    this.renderer.dispose(); this.root.remove();
    this.onFinish?.({ won: !quit && this.state === "done" && this.won, score: this.score, quit });
  }
}

/* ---------- shared scenery ---------- */
function ground(scene, color = "#6aae4f", size = 120) {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true; scene.add(g); return g;
}
function tree(scene, x, z, s = 1) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.25 * s, .35 * s, 2 * s, 8), new THREE.MeshStandardMaterial({ color: "#8b5a3c" })); trunk.position.set(x, s, z); trunk.castShadow = true; scene.add(trunk);
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.6 * s, 3.4 * s, 10), new THREE.MeshStandardMaterial({ color: "#4f9a43", roughness: .9 })); top.position.set(x, 3.4 * s, z); top.castShadow = true; scene.add(top);
}
function waddle(g, t, moving, speed = 10) {
  const sw = moving ? Math.sin(t * speed) * .6 : 0;
  g.legs[0].rotation.x = sw; g.legs[1].rotation.x = -sw;
  g.wingL.rotation.z = moving ? Math.sin(t * speed) * .15 : 0; g.wingR.rotation.z = -g.wingL.rotation.z;
  g.neckPivot.rotation.x = .1 + (moving ? Math.abs(Math.sin(t * speed)) * .08 : Math.sin(t * 2) * .04);
}
const breadMat = new THREE.MeshStandardMaterial({ color: "#d9a05b", roughness: .8 }), goldMat = new THREE.MeshStandardMaterial({ color: "#f7c948", emissive: "#a8790a", emissiveIntensity: .5, metalness: .4, roughness: .35 }), burntMat = new THREE.MeshStandardMaterial({ color: "#3b2a22", roughness: .9 });
function makeBread(mat = breadMat) {
  const g = new THREE.Group(), base = new THREE.Mesh(new THREE.BoxGeometry(.9, .45, .55), mat); g.add(base);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .9, 16, 1, false, 0, Math.PI), mat); top.rotation.z = Math.PI / 2; top.position.y = .2; g.add(top);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
}

/* ---------- 1. Bread Catch ---------- */
function setupCatch(A) {
  const { scene, cam, goose } = A;
  ground(scene); for (let i = 0; i < 12; i++) tree(scene, rand(-30, 30), rand(-30, -14), rand(.8, 1.3));
  const pond = new THREE.Mesh(new THREE.CircleGeometry(5, 32), new THREE.MeshStandardMaterial({ color: "#3a8fb7", roughness: .2 })); pond.rotation.x = -Math.PI / 2; pond.position.set(-12, .02, -6); scene.add(pond);
  cam.position.set(0, 7, 13); cam.lookAt(0, 2.5, 0);
  goose.root.scale.setScalar(.75); goose.root.rotation.y = Math.PI; // face away so the camera sees its back and the falling bread
  const items = []; let x = 0, spawn = 0, timeLeft = 45, caught = 0;
  function drop(t) {
    const r = Math.random(), kind = r < .14 ? "gold" : r < .32 ? "burnt" : "bread";
    const m = makeBread(kind === "gold" ? goldMat : kind === "burnt" ? burntMat : breadMat);
    m.position.set(rand(-7, 7), 13, 0); scene.add(m);
    items.push({ m, kind, vy: -(4 + t * .12 + Math.random() * 2), spin: rand(-3, 3) });
  }
  return {
    info: () => `${Math.ceil(timeLeft)}s · ${caught} caught`,
    update(dt, t, playing) {
      let dir = 0; if (A.keys.has("KeyA") || A.keys.has("ArrowLeft")) dir -= 1; if (A.keys.has("KeyD") || A.keys.has("ArrowRight")) dir += 1;
      // Mouse/touch steers toward the pointer's horizontal position.
      const target = dir ? x + dir * 12 * dt : A.pointer ? A.pointer.x * 8.5 : x;
      const prevX = x; x = clamp(x + clamp(target - x, -12 * dt, 12 * dt), -7.5, 7.5);
      goose.root.position.set(x, 0, 0); waddle(goose, performance.now() / 1000, Math.abs(x - prevX) > .001);
      if (!playing) return;
      timeLeft = Math.max(0, 45 - t); spawn -= dt;
      if (spawn <= 0) { drop(t); spawn = Math.max(.35, .95 - t * .012); }
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i]; it.m.position.y += it.vy * dt; it.m.rotation.x += it.spin * dt; it.m.rotation.z += it.spin * dt * .5;
        const p = it.m.position;
        if (p.y < 2.6 && p.y > .8 && Math.abs(p.x - x) < 1.2) {
          const pts = it.kind === "gold" ? 3 : it.kind === "burnt" ? -2 : 1;
          A.addScore(pts, p.clone()); if (pts > 0) caught++; A.beep(pts > 0 ? (pts > 1 ? 1320 : 880) : 160, .12, pts > 0 ? "triangle" : "sawtooth");
          goose.bang = 1; scene.remove(it.m); items.splice(i, 1); continue;
        }
        if (p.y < .2) { scene.remove(it.m); items.splice(i, 1); }
      }
      goose.neckPivot.rotation.x += (goose.bang = Math.max(0, goose.bang - dt * 5)) * .4;
    },
    over: () => timeLeft <= 0,
    won: () => A.score >= 15,
    summary: () => `${A.score} points (goal 15) · ${caught} breads caught`
  };
}

/* ---------- 2. Lane Dash: an endless 3-lane runner through a Kenney suburb (CC0 models in Games/runner) ---------- */
const RUN_DIR = "runner/";
const RUN_KEYS = {
  road: "city-roads/road-straight", barrier: "city-roads/construction-barrier", cone: "city-roads/construction-cone", lamp: "city-roads/light-square",
  houses: [..."abcdefgh"].map(c => "city-suburban/building-type-" + c), treeL: "city-suburban/tree-large", treeS: "city-suburban/tree-small", planter: "city-suburban/planter",
  cars: ["sedan", "taxi", "police", "van", "delivery", "suv", "truck"].map(c => "car/" + c), box: "car/box",
  bread: "food/bread", coin: "platformer/coin-gold", crate: "platformer/crate",
  heart: "platformer/heart", star: "platformer/star", jewel: "platformer/jewel", spring: "platformer/spring"
};
const DASH_GOAL = 1000; // metres to win the prize
function setupDash(A) {
  const { scene, cam, goose } = A;
  const LANES = [-2.6, 0, 2.6];
  const models = new Map(); let ready = false;
  const loader = new GLTFLoader(), keys = Object.values(RUN_KEYS).flat();
  Promise.all(keys.map(k => loader.loadAsync(RUN_DIR + k + ".glb").then(g => {
    const box = new THREE.Box3().setFromObject(g.scene);
    models.set(k, { scene: g.scene, size: box.getSize(new THREE.Vector3()), center: box.getCenter(new THREE.Vector3()), min: box.min.clone() });
  }))).then(() => { buildScenery(); ready = true; }).catch(err => { console.warn("Lane Dash models failed, using simple shapes", err); ready = true; });
  // Clone a model scaled so one axis matches a size, resting on y=0 and centred in x/z. Falls back to a box.
  function fit(key, size, axis = "y", fallbackColor = "#9aa1ad") {
    const g = new THREE.Group(), m = models.get(key);
    if (!m) { const b = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshStandardMaterial({ color: fallbackColor })); b.position.y = size / 2; g.add(b); }
    else { const c = m.scene.clone(), s = size / m.size[axis]; c.scale.setScalar(s); c.position.set(-m.center.x * s, -m.min.y * s, -m.center.z * s); g.add(c); }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }
  const pick = list => list[Math.floor(Math.random() * list.length)];

  // Ground, pavements and a recycled strip of road, houses, trees and streetlights.
  ground(scene, "#6aae4f", 260);
  for (const sx of [-6.1, 6.1]) { const walk = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 260), new THREE.MeshStandardMaterial({ color: "#c9c3b6", roughness: 1 })); walk.rotation.x = -Math.PI / 2; walk.position.set(sx, .015, -80); walk.receiveShadow = true; scene.add(walk); }
  const scenery = []; const ROAD_TILE = 9.6, SPAN = ROAD_TILE * 14;
  function buildScenery() {
    for (let i = 0; i < 14; i++) { const r = fit(RUN_KEYS.road, ROAD_TILE, "x"); r.rotation.y = Math.PI / 2; r.position.set(0, .01, 12 - i * ROAD_TILE); scene.add(r); scenery.push(r); } // the Kenney tile runs along x, so turn it to run down the lanes
    for (let i = 0; i < 15; i++) for (const side of [-1, 1]) {
      const z = 10 - i * 9.3;
      const h = fit(pick(RUN_KEYS.houses), rand(7, 9.5)); h.position.set(side * rand(12, 13.5), 0, z); h.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(h); scenery.push(h);
      const t = fit(Math.random() < .5 ? RUN_KEYS.treeL : RUN_KEYS.treeS, rand(4, 6)); t.position.set(side * 8.4, 0, z - 4.6); scene.add(t); scenery.push(t);
      if (i % 2 === 0) { const l = fit(RUN_KEYS.lamp, 5.2); l.position.set(side * 7, 0, z - 2); l.rotation.y = side < 0 ? -Math.PI / 2 : Math.PI / 2; scene.add(l); scenery.push(l); }
      else { const p = fit(RUN_KEYS.planter, 1.1); p.position.set(side * 7.1, 0, z - 2); scene.add(p); scenery.push(p); }
    }
  }

  cam.fov = 62; cam.updateProjectionMatrix();
  goose.root.scale.setScalar(.55); goose.root.rotation.y = Math.PI;
  let lane = 1, gx = 0, y = 0, vy = 0, slide = 0, speed = 16, dist = 0, coins = 0, alive = true, crashT = 0, spawnIn = 8, dustT = 0;
  const power = { shield: false, star: 0, magnet: 0, spring: 0 };
  const things = []; // obstacles, coins and power-ups moving toward the goose
  const dust = [], dustGeo = new THREE.SphereGeometry(.18, 8, 6), dustMat = new THREE.MeshBasicMaterial({ color: "#f6edda", transparent: true, opacity: .7 });
  const shieldBubble = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 16), new THREE.MeshBasicMaterial({ color: "#e05a4f", transparent: true, opacity: .18, depthWrite: false })); shieldBubble.visible = false; scene.add(shieldBubble);
  const stripeTex = (() => { const c = document.createElement("canvas"); c.width = 128; c.height = 16; const g = c.getContext("2d"); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#fffaf0" : "#e05a4f"; g.fillRect(i * 16, 0, 16, 16); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();

  function add(obj, data) { scene.add(obj); things.push({ obj, ...data }); }
  function obstacle(kind, li, z) {
    let obj, len = 1.2;
    if (kind === "barrier") obj = fit(RUN_KEYS.barrier, 2.3, "x", "#f28c28");
    else if (kind === "overhead") {
      obj = new THREE.Group();
      for (const px of [-1.05, 1.05]) { const c = fit(RUN_KEYS.cone, 1.6, "y", "#f28c28"); c.position.x = px; obj.add(c); const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.2, 8), new THREE.MeshStandardMaterial({ color: "#26283b" })); pole.position.set(px, 1.1, 0); obj.add(pole); }
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.5, .38, .2), new THREE.MeshStandardMaterial({ map: stripeTex })); bar.position.y = 1.85; bar.castShadow = true; obj.add(bar);
    } else if (kind === "crates") { obj = new THREE.Group(); for (let i = 0; i < 2; i++) { const c = fit(RUN_KEYS.crate, 1.3, "y", "#c68642"); c.position.y = i * 1.3; c.rotation.y = rand(-.2, .2); obj.add(c); } len = 1.4; }
    else { obj = fit(pick(RUN_KEYS.cars), 4.4, "z", "#3a8fb7"); obj.rotation.y = Math.PI; len = 4.4; } // cars face the goose
    obj.position.set(LANES[li], 0, z);
    add(obj, { kind, lane: li, len, moving: kind === "car" && Math.random() < .45 ? rand(5, 9) : 0 });
  }
  function coinLine(li, z, n, yArc) {
    for (let i = 0; i < n; i++) {
      const c = fit(RUN_KEYS.coin, .85, "y", "#f7c948"); const lift = yArc ? Math.sin(i / (n - 1) * Math.PI) * 2.2 : 0;
      c.position.set(LANES[li], .7 + lift, z - i * 2.3); add(c, { kind: "coin", lane: li, len: .8 });
    }
  }
  function spawnRow() {
    const z = -100, r = Math.random(), lanes = [0, 1, 2].sort(() => Math.random() - .5);
    if (r < .22) { const kind = Math.random() < .5 ? "barrier" : "overhead"; lanes.forEach(li => obstacle(kind, li, z)); if (kind === "barrier") coinLine(lanes[0], z + 3, 5, true); }
    else if (r < .55) { obstacle(Math.random() < .5 ? "car" : "crates", lanes[0], z); obstacle(pick(["car", "crates", "barrier", "overhead"]), lanes[1], z - rand(0, 6)); coinLine(lanes[2], z, 6, false); }
    else if (r < .85) { obstacle(pick(["car", "barrier", "overhead", "crates"]), lanes[0], z); coinLine(lanes[1], z + 2, 5, false); if (Math.random() < .3) { const b = fit(RUN_KEYS.bread, 1.1, "x", "#d9a05b"); b.position.set(LANES[lanes[2]], .8, z); add(b, { kind: "bread", lane: lanes[2], len: 1 }); } }
    else { obstacle("car", lanes[0], z); coinLine(lanes[1], z, 8, false); }
    if (Math.random() < .14) { const kind = pick(["heart", "star", "jewel", "spring"]); const p = fit(RUN_KEYS[kind], 1.1, "y", "#8a5cc9"); p.position.set(LANES[lanes[lanes.length - 1]], 1, z - 10); add(p, { kind: "power", power: kind, lane: lanes[lanes.length - 1], len: 1 }); }
  }
  const left = () => { if (alive && lane > 0) { lane--; A.beep(520, .05); } };
  const right = () => { if (alive && lane < 2) { lane++; A.beep(520, .05); } };
  const jump = () => { if (alive && y <= .01) { vy = power.spring > 0 ? 15.5 : 10.5; slide = 0; A.beep(720, .08, "triangle"); } };
  const duck = () => { if (!alive) return; if (y > .01) vy = -22; slide = .75; A.beep(300, .06, "triangle"); };
  // Swipes for phones and tablets; a tap jumps.
  let swipe = null;
  A.root.addEventListener("pointerdown", e => { if (!e.target.closest("button,.a-res")) swipe = { x: e.clientX, y: e.clientY }; });
  A.root.addEventListener("pointerup", e => {
    if (!swipe) return; const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; swipe = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return jump();
    if (Math.abs(dx) > Math.abs(dy)) (dx < 0 ? left : right)(); else (dy < 0 ? jump : duck)();
  });
  function crash() {
    if (power.shield) { power.shield = false; A.beep(300, .2, "square", .1); A.message("Shield saved you!"); setTimeout(() => { if (alive) A.message(""); }, 900); return false; }
    alive = false; crashT = 0; A.beep(110, .5, "sawtooth", .14); A.message("Crash!", `${Math.floor(dist)} m run`); return true;
  }
  const powerName = { heart: "Shield", star: "Double points", jewel: "Coin magnet", spring: "Super jump" };
  return {
    isReady: () => ready,
    info: () => { const p = []; if (power.shield) p.push("Shield"); if (power.star > 0) p.push(`x2 ${Math.ceil(power.star)}s`); if (power.magnet > 0) p.push(`Magnet ${Math.ceil(power.magnet)}s`); if (power.spring > 0) p.push(`Super jump ${Math.ceil(power.spring)}s`); return `${Math.floor(dist)} / ${DASH_GOAL} m · ${coins} coins${p.length ? " · " + p.join(" · ") : ""}`; },
    key(code) { if (code === "KeyA" || code === "ArrowLeft") left(); if (code === "KeyD" || code === "ArrowRight") right(); if (code === "Space" || code === "KeyW" || code === "ArrowUp") jump(); if (code === "KeyS" || code === "ArrowDown") duck(); },
    update(dt, t, playing) {
      const run = playing && alive;
      if (run) speed = Math.min(34, 16 + t * .38);
      const v = run ? speed : alive ? 0 : Math.max(0, speed * (1 - crashT * 2));
      if (!alive) crashT += dt;
      // Goose: slide between lanes, jump arcs, slide squash, fast waddle.
      gx += (LANES[lane] - gx) * Math.min(1, dt * 15);
      vy -= (power.spring > 0 ? 24 : 30) * dt; y = Math.max(0, y + vy * dt); if (y === 0 && vy < 0) vy = 0;
      slide = Math.max(0, slide - dt);
      goose.root.position.set(gx, y, 0);
      goose.root.rotation.z = (gx - LANES[lane]) * .08; goose.root.rotation.x = alive ? 0 : Math.min(1.4, crashT * 5);
      goose.root.scale.set(.55, slide > 0 ? .32 : .55, .55);
      waddle(goose, performance.now() / 1000, run && y === 0, 18);
      if (slide > 0) goose.neckPivot.rotation.x = 1.1;
      shieldBubble.visible = power.shield; shieldBubble.position.set(gx, y + 1.1, 0);
      // Camera chases the goose, widening a little as the run speeds up.
      cam.position.x += (gx * .55 - cam.position.x) * Math.min(1, dt * 6); cam.position.y = 4.3 + y * .35; cam.position.z = 8.2;
      cam.fov = 60 + (v - 16) * .45; cam.updateProjectionMatrix(); cam.lookAt(cam.position.x * .6, 1.3 + y * .3, -9);
      for (const s of scenery) { s.position.z += v * dt; if (s.position.z > 16) s.position.z -= s.userData.span || (s.userData.span = (scenery.indexOf(s) < 14 ? SPAN : 15 * 9.3)); }
      // Dust puffs from the goose's feet.
      dustT -= dt; if (run && y === 0 && dustT <= 0) { dustT = .07; const d = new THREE.Mesh(dustGeo, dustMat.clone()); d.position.set(gx + rand(-.3, .3), .15, .6); scene.add(d); dust.push({ d, life: .5 }); }
      for (let i = dust.length - 1; i >= 0; i--) { const p = dust[i]; p.life -= dt; p.d.position.z += v * dt * .6; p.d.scale.setScalar(1 + (.5 - p.life) * 2); p.d.material.opacity = Math.max(0, p.life * 1.4); if (p.life <= 0) { scene.remove(p.d); dust.splice(i, 1); } }
      if (!run) return;
      dist += v * dt; for (const k of ["star", "magnet", "spring"]) power[k] = Math.max(0, power[k] - dt);
      spawnIn -= v * dt; if (spawnIn <= 0) { spawnRow(); spawnIn = rand(17, 26) * Math.pow(speed / 16, .35); }
      const mult = power.star > 0 ? 2 : 1, inLane = Math.abs(gx - LANES[lane]) < 1.3 ? lane : -1;
      for (let i = things.length - 1; i >= 0; i--) {
        const th = things[i], o = th.obj; o.position.z += (v + (th.moving || 0)) * dt;
        if (th.kind === "coin" || th.kind === "power") o.rotation.y += dt * 4;
        if (th.kind === "coin" && power.magnet > 0 && o.position.z > -14 && o.position.z < 2) { o.position.x += (gx - o.position.x) * Math.min(1, dt * 8); o.position.y += (y + .8 - o.position.y) * Math.min(1, dt * 8); }
        const near = Math.abs(o.position.z) < th.len / 2 + .55, sameLane = th.kind === "coin" && power.magnet > 0 ? Math.abs(o.position.x - gx) < 1.4 : th.lane === inLane;
        if (near && sameLane) {
          if (th.kind === "coin" && Math.abs(o.position.y - (y + .8)) < 1.6) { coins += mult; A.beep(1300 + (coins % 5) * 80, .05, "triangle", .05); scene.remove(o); things.splice(i, 1); continue; }
          if (th.kind === "bread") { coins += 5 * mult; A.addScore(0); A.beep(990, .12, "triangle"); A.message("+5 bread bonus!"); setTimeout(() => { if (alive) A.message(""); }, 700); scene.remove(o); things.splice(i, 1); continue; }
          if (th.kind === "power") {
            const pw = th.power; if (pw === "heart") power.shield = true; else power[{ star: "star", jewel: "magnet", spring: "spring" }[pw]] = 10;
            A.beep(880, .25, "triangle", .1); A.message(powerName[pw] + "!"); setTimeout(() => { if (alive) A.message(""); }, 900); scene.remove(o); things.splice(i, 1); continue;
          }
          const clear = th.kind === "barrier" ? y > .95 : th.kind === "overhead" ? slide > 0 : power.spring > 0 && y > 2.6;
          if (!clear && !th.hit) { th.hit = true; if (!crash()) { scene.remove(o); things.splice(i, 1); } continue; }
        }
        if (o.position.z > 14) { scene.remove(o); things.splice(i, 1); }
      }
      A.score = coins + Math.floor(dist / 10) * mult; A.scoreEl.textContent = A.score;
    },
    over: () => (!alive && crashT > 1.2) || dist >= DASH_GOAL,
    won: () => dist >= DASH_GOAL,
    summary: () => dist >= DASH_GOAL ? `You ran ${DASH_GOAL} m and grabbed ${coins} coins!` : `Ran ${Math.floor(dist)} of ${DASH_GOAL} m · ${coins} coins`
  };
}

/* ---------- 3. Bread Toss ---------- */
function setupToss(A) {
  const { scene, cam, goose } = A;
  ground(scene); for (let i = 0; i < 10; i++) tree(scene, rand(-28, 28), rand(-34, -26), rand(.9, 1.4));
  const pond = new THREE.Mesh(new THREE.CircleGeometry(14, 48), new THREE.MeshStandardMaterial({ color: "#3a8fb7", roughness: .15 })); pond.rotation.x = -Math.PI / 2; pond.position.set(0, .02, -14); pond.scale.set(1.3, 1, 1); scene.add(pond);
  cam.position.set(0, 6, 9); cam.lookAt(0, 0, -10);
  goose.root.scale.setScalar(.7); goose.root.position.set(0, 0, 3); goose.root.rotation.y = Math.PI;
  const pads = [{ x: -6, z: -10, r: 1.6, spd: 1.1, pts: 1 }, { x: 4, z: -15, r: 1.3, spd: -1.5, pts: 1 }, { x: 0, z: -21, r: .95, spd: 2.1, pts: 2 }].map((p, i) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r, .12, 28), new THREE.MeshStandardMaterial({ color: p.pts > 1 ? "#f7c948" : "#5fae4e", roughness: .7 })); m.position.set(p.x, .1, p.z); m.receiveShadow = true; scene.add(m);
    const flower = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), new THREE.MeshStandardMaterial({ color: "#d96aa7" })); flower.position.set(p.r * .4, .25, 0); m.add(flower);
    return { ...p, m, phase: i * 2 };
  });
  const aim = new THREE.Mesh(new THREE.RingGeometry(.35, .5, 24), new THREE.MeshBasicMaterial({ color: "#e05a4f", side: THREE.DoubleSide })); aim.rotation.x = -Math.PI / 2; aim.position.set(0, .15, -12); scene.add(aim);
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.15), aimPt = new THREE.Vector3(0, .15, -12);
  let throwsLeft = 10, hits = 0, flying = null;
  function toss() {
    if (flying || throwsLeft <= 0 || A.state !== "play") return;
    throwsLeft--; const m = makeBread(); scene.add(m);
    flying = { m, from: new THREE.Vector3(0, 2, 2.4), to: aimPt.clone(), t: 0, dur: .9 };
    goose.bang = 1; A.beep(600, .08, "triangle");
  }
  return {
    info: () => `${throwsLeft} breads left · ${hits} hits`,
    key(code) { if (code === "Space") toss(); },
    click() { toss(); },
    update(dt, t, playing) {
      const now = performance.now() / 1000;
      for (const p of pads) p.m.position.x = clamp(Math.sin(now * p.spd * .6 + p.phase) * 9, -12, 12);
      // Aim: mouse picks a spot on the pond; arrow keys nudge it.
      if (A.pointer) { ray.setFromCamera(new THREE.Vector2(A.pointer.x, A.pointer.y), cam); ray.ray.intersectPlane(plane, aimPt); }
      if (A.keys.has("ArrowLeft") || A.keys.has("KeyA")) { aimPt.x -= 10 * dt; A.pointer = null; } if (A.keys.has("ArrowRight") || A.keys.has("KeyD")) { aimPt.x += 10 * dt; A.pointer = null; }
      if (A.keys.has("ArrowUp") || A.keys.has("KeyW")) { aimPt.z -= 10 * dt; A.pointer = null; } if (A.keys.has("ArrowDown") || A.keys.has("KeyS")) { aimPt.z += 10 * dt; A.pointer = null; }
      aimPt.x = clamp(aimPt.x, -14, 14); aimPt.z = clamp(aimPt.z, -26, -4); aim.position.set(aimPt.x, .15, aimPt.z);
      goose.root.rotation.y = Math.atan2(aimPt.x, aimPt.z - 3); // face the aim spot (the goose model looks along +z)
      goose.bang = Math.max(0, goose.bang - dt * 4); goose.neckPivot.rotation.x = .1 + goose.bang * .6; waddle(goose, now, false);
      if (flying) {
        flying.t += dt; const k = Math.min(1, flying.t / flying.dur), f = flying;
        f.m.position.lerpVectors(f.from, f.to, k); f.m.position.y += Math.sin(k * Math.PI) * 6; f.m.rotation.x += dt * 8;
        if (k >= 1) {
          const land = f.to.clone(), hit = pads.find(p => Math.hypot(land.x - p.m.position.x, land.z - p.m.position.z) <= p.r);
          if (hit) { hits += hit.pts; A.addScore(hit.pts, land); A.beep(hit.pts > 1 ? 1320 : 990, .15, "triangle"); }
          else { A.beep(200, .12, "sine"); }
          scene.remove(f.m); flying = null;
        }
      }
    },
    over: () => throwsLeft <= 0 && !flying,
    won: () => hits >= 6,
    summary: () => `${hits} points from 10 breads (goal 6; the small gold pad is worth 2)`
  };
}
