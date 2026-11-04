/* Honk Empire arcade: three original 3D minigames drawn with three.js, loaded only when a game starts.
   Each game reports { won, score } and Honk Empire pays the prize (10% of current honks).
   Everything is drawn in Honk Empire's cartoon style: toon shading, ink outlines, a soft sky and puffy clouds. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { makeGoose } from "./honk-concert.js";

const INK = "#26283b";
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];

export const ARCADE_GAMES = [
  { id: "catch", name: "Bread Catch", goal: "Catch 15 points of bread in 45 seconds. Golden bread is worth 3, burnt toast costs 2. Catch 5 in a row for double points.", controls: "Move with A/D, the arrow keys or your mouse." },
  { id: "dash", name: "Lane Dash", goal: "You stole the park guard's lunch! Run 1000 m through town. One crash and he catches you, unless you have a shield.", controls: "A/D or arrows to switch lanes, W/Space to jump barriers, S/Down to slide under bars. On touch: swipe." },
  { id: "toss", name: "Bread Toss", goal: "Land 6 points on the drifting lily pads with 10 breads. Hit 3 in a row for a bonus point.", controls: "Aim with your mouse (or arrows), click or press Space to throw." }
];

/* ---------- cartoon look: toon materials + screen-space ink outlines ---------- */
const toonRamp = (() => {
  const t = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t;
})();
const toonCache = new Map(), smoothCache = new Map();
function toonMat(m) {
  if (!m || m.isMeshToonMaterial || m.isMeshBasicMaterial || m.isShaderMaterial) return m;
  if (toonCache.has(m.uuid)) return toonCache.get(m.uuid);
  const t = new THREE.MeshToonMaterial({ color: m.color ? m.color.clone() : 0xffffff, map: m.map || null, gradientMap: toonRamp, transparent: m.transparent, opacity: m.opacity, side: m.side,
    emissive: m.emissive ? m.emissive.clone() : 0x000000, emissiveIntensity: m.emissiveIntensity ?? 1, depthWrite: m.depthWrite });
  toonCache.set(m.uuid, t); return t;
}
// Outline thickness is in screen space, so it looks the same on tiny coins and big houses.
const outlineMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
outlineMat.onBeforeCompile = sh => {
  sh.vertexShader = sh.vertexShader.replace("#include <project_vertex>", `#include <project_vertex>
    vec4 dhN = projectionMatrix * vec4(normalize(normalMatrix * normal), 0.0);
    vec2 dhDir = normalize(dhN.xy + vec2(1e-5));
    dhDir.x *= projectionMatrix[0][0] / projectionMatrix[1][1];
    gl_Position.xy += dhDir * 0.0042 * gl_Position.w;`);
};
// Flat-shaded models have split normals at corners; a welded copy gives unbroken outlines.
function smoothGeo(g) {
  if (smoothCache.has(g.uuid)) return smoothCache.get(g.uuid);
  let s = new THREE.BufferGeometry(); s.setAttribute("position", g.getAttribute("position"));
  if (g.index) s.setIndex(g.index);
  s = mergeVertices(s, 1e-3); s.computeVertexNormals();
  smoothCache.set(g.uuid, s); return s;
}
const NO_OUTLINE = new Set(["PlaneGeometry", "CircleGeometry", "RingGeometry"]);
function toonify(obj, { outline = true } = {}) {
  const meshes = []; obj.traverse(o => { if (o.isMesh && !o.userData.toon && !o.userData.isOutline) meshes.push(o); });
  for (const o of meshes) {
    o.userData.toon = true;
    o.material = Array.isArray(o.material) ? o.material.map(toonMat) : toonMat(o.material);
    const transparent = [].concat(o.material).some(m => m.transparent && m.opacity < 1);
    if (!outline || o.isSkinnedMesh || transparent || o.userData.noOutline || NO_OUTLINE.has(o.geometry.type)) continue;
    const line = new THREE.Mesh(smoothGeo(o.geometry), outlineMat); line.userData.isOutline = true; line.castShadow = false; line.receiveShadow = false; line.raycast = () => {};
    o.add(line);
  }
  return obj;
}
function skyTexture(top, bottom) {
  const c = document.createElement("canvas"); c.width = 2; c.height = 256; const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(.62, bottom); gr.addColorStop(1, bottom);
  g.fillStyle = gr; g.fillRect(0, 0, 2, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function cloud(scene, x, y, z, s = 1) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: "#ffffff" });
  [[0, 0, 0, 1.6], [1.6, -.2, .2, 1.2], [-1.6, -.3, 0, 1.15], [.6, .7, -.2, 1.1]].forEach(([px, py, pz, r]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m); b.position.set(px, py, pz); g.add(b); });
  g.scale.set(s * 1.3, s * .8, s); g.position.set(x, y, z); toonify(g); scene.add(g); return g;
}

let cssDone = false;
function injectCss() {
  if (cssDone) return; cssDone = true;
  const s = document.createElement("style");
  s.textContent = `
  #arcade3d{position:fixed;inset:0;z-index:200;background:#bfe6f7;font-family:Nunito,system-ui,sans-serif;user-select:none;touch-action:none;color:${INK}}
  #arcade3d canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
  #arcade3d .a-top{position:absolute;top:12px;left:12px;right:12px;display:flex;gap:8px;align-items:flex-start;pointer-events:none;flex-wrap:wrap}
  #arcade3d .a-pill{padding:7px 13px;border:3px solid ${INK};border-radius:13px;background:#fffaf0;font-weight:900;box-shadow:0 3px 0 ${INK}}
  #arcade3d .a-pill b{font-family:Fredoka,sans-serif;font-size:20px}
  #arcade3d .a-quit{margin-left:auto;pointer-events:auto;padding:7px 13px;border:3px solid ${INK};border-radius:12px;background:#e05a4f;color:#fff;font:600 15px Fredoka,sans-serif;box-shadow:0 3px 0 ${INK};cursor:pointer}
  #arcade3d .a-msg{position:absolute;left:50%;top:20%;transform:translateX(-50%);width:min(92%,680px);text-align:center;pointer-events:none}
  #arcade3d .a-msg h1{margin:0;font:700 clamp(30px,6vw,56px) Fredoka,sans-serif;color:#f7c948;-webkit-text-stroke:6px ${INK};paint-order:stroke fill}
  #arcade3d .a-msg p{margin:8px 0 0;font:600 clamp(14px,2.2vw,20px) Fredoka,sans-serif;color:#fff;-webkit-text-stroke:4px ${INK};paint-order:stroke fill}
  #arcade3d .a-skip{position:absolute;right:14px;bottom:14px;padding:6px 12px;border:3px solid ${INK};border-radius:12px;background:#fffaf0;font:600 14px Fredoka,sans-serif;box-shadow:0 3px 0 ${INK}}
  #arcade3d .a-bars::before,#arcade3d .a-bars::after{content:"";position:absolute;left:0;right:0;height:9vh;background:${INK};z-index:1;transition:transform .5s}
  #arcade3d .a-bars::before{top:0}#arcade3d .a-bars::after{bottom:0}
  #arcade3d .a-bars.off::before{transform:translateY(-100%)}#arcade3d .a-bars.off::after{transform:translateY(100%)}
  #arcade3d .a-pop{position:absolute;pointer-events:none;font:700 26px Fredoka,sans-serif;-webkit-text-stroke:5px ${INK};paint-order:stroke fill;animation:apop .8s ease-out forwards}
  @keyframes apop{to{transform:translateY(-50px);opacity:0}}
  #arcade3d .a-res{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(400px,92%);padding:22px;border:4px solid ${INK};border-radius:22px;background:#fffaf0;text-align:center;box-shadow:0 8px 0 ${INK};z-index:3}
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
    root.innerHTML = `<canvas></canvas><div class="a-bars off"></div><div class="a-top"><div class="a-pill" data-score>Score <b>0</b></div><div class="a-pill" data-info></div><button class="a-quit" type="button">Quit</button></div>
      <div class="a-msg"><h1></h1><p></p></div><div class="a-skip hidden">Tap or press any key to skip</div><div class="a-res hidden"></div>`;
    document.body.appendChild(root);
    this.scoreEl = root.querySelector("[data-score] b"); this.infoEl = root.querySelector("[data-info]");
    this.msgH = root.querySelector(".a-msg h1"); this.msgP = root.querySelector(".a-msg p");
    root.querySelector(".a-quit").addEventListener("click", () => this.close(true));
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: root.querySelector("canvas"), antialias: true });
    r.setPixelRatio(Math.min(2, devicePixelRatio)); r.outputColorSpace = THREE.SRGBColorSpace; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const s = this.scene = new THREE.Scene(); s.background = skyTexture("#7cc4ee", "#d8f0fb"); s.fog = new THREE.Fog("#d8f0fb", 40, 90);
    this.cam = new THREE.PerspectiveCamera(55, 1, .1, 260);
    s.add(new THREE.HemisphereLight("#f2fbff", "#7fae5f", 1.5));
    const sun = this.sun = new THREE.DirectionalLight("#fff4dc", 2); sun.position.set(8, 20, 10); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0005;
    Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22 }); s.add(sun); s.add(sun.target);
    this.goose = makeGoose({ stage: false }); this.goose.root.traverse(o => { if (o.isMesh) o.castShadow = true; }); toonify(this.goose.root); s.add(this.goose.root);
    this.score = 0; this.state = "ready"; this.keys = new Set(); this.pointer = null;
    this.game = ({ catch: setupCatch, dash: setupDash, toss: setupToss })[id](this);
    this.message(this.def.name, this.def.goal + " " + this.def.controls);
    this.infoEl.textContent = this.game.info();
    this.onKeyDown = e => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
      if (e.code === "Escape") return this.close(true);
      this.keys.add(e.code);
      if (this.state === "ready" && this.game.skipIntro) { if (!e.repeat) this.game.skipIntro(); return; }
      if (!e.repeat) this.game.key?.(e.code);
    };
    this.onKeyUp = e => this.keys.delete(e.code);
    this.onResize = () => { r.setSize(innerWidth, innerHeight, false); this.cam.aspect = innerWidth / innerHeight; this.cam.updateProjectionMatrix(); };
    addEventListener("keydown", this.onKeyDown); addEventListener("keyup", this.onKeyUp); addEventListener("resize", this.onResize); this.onResize();
    root.addEventListener("pointermove", e => { this.pointer = { x: e.clientX / innerWidth * 2 - 1, y: -(e.clientY / innerHeight) * 2 + 1 }; });
    root.addEventListener("pointerdown", e => {
      if (e.target.closest("button,.a-res")) return;
      if (this.state === "ready" && this.game.skipIntro) { this.game.skipIntro(); return; }
      this.pointer = { x: e.clientX / innerWidth * 2 - 1, y: -(e.clientY / innerHeight) * 2 + 1 }; this.game.click?.(this.pointer);
    });
    this.t0 = performance.now(); this.last = this.t0; this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
    if (["localhost", "127.0.0.1"].includes(location.hostname)) window.__arcade = this; // local testing only
  }
  message(h, p = "") { this.msgH.textContent = h; this.msgP.textContent = p; }
  cinematic(on) { this.root.querySelector(".a-bars").classList.toggle("off", !on); this.root.querySelector(".a-skip").classList.toggle("hidden", !on); this.root.querySelector(".a-top").style.visibility = on ? "hidden" : ""; }
  addScore(n, at) {
    this.score = Math.max(0, this.score + n); this.scoreEl.textContent = this.score;
    if (at) this.pop((n > 0 ? "+" : "") + n, at, n > 0 ? "#f7c948" : "#e05a4f");
  }
  pop(text, at, color = "#f7c948") {
    const v = at.clone().project(this.cam), el = document.createElement("div"); el.className = "a-pop"; el.textContent = text; el.style.color = color;
    el.style.left = ((v.x + 1) / 2 * innerWidth - 20) + "px"; el.style.top = ((1 - v.y) / 2 * innerHeight - 30) + "px"; this.root.appendChild(el); setTimeout(() => el.remove(), 800);
  }
  beep(f, d = .1, type = "square", g = .08, when = 0) {
    if (this.muted || !this.ac) return;
    const t = this.ac.currentTime + when, o = this.ac.createOscillator(), gn = this.ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); gn.gain.setValueAtTime(.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + .01); gn.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(gn); gn.connect(this.ac.destination); o.start(t); o.stop(t + d + .02);
  }
  loop(now) {
    if (this.dead) return;
    const dt = Math.min(.05, (now - this.last) / 1000); this.last = now;
    const el = (now - this.t0) / 1000;
    // Games that load models first (Lane Dash) hold the countdown until they are ready; games with an intro hold it until the intro ends.
    if (this.state === "ready" && this.game.isReady && !this.game.isReady()) { this.message("Loading…", this.def.goal); this.t0 = now; }
    else if (this.state === "ready" && el > 2.6 && (!this.game.introDone || this.game.introDone())) { this.state = "play"; this.message("GO!"); this.playStart = now; setTimeout(() => { if (this.state === "play") this.message(""); }, 700); }
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
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true; toonify(g); scene.add(g); return g;
}
function tree(scene, x, z, s = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.25 * s, .35 * s, 2 * s, 8), new THREE.MeshStandardMaterial({ color: "#8b5a3c" })); trunk.position.set(0, s, 0); g.add(trunk);
  const leaf = new THREE.MeshStandardMaterial({ color: "#5fae4e" });
  [[0, 3.1, 0, 1.5], [.9, 2.6, .2, 1.05], [-.85, 2.7, -.1, 1.1], [0, 4.1, 0, 1]].forEach(([px, py, pz, r]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r * s, 14, 10), leaf); b.position.set(px * s, py * s, pz * s); g.add(b); });
  g.position.set(x, 0, z); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); toonify(g); scene.add(g); return g;
}
function bush(scene, x, z, s = 1) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: "#4f9a43" });
  [[0, .5, 0, .8], [.7, .4, .1, .6], [-.7, .4, 0, .62]].forEach(([px, py, pz, r]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r * s, 12, 9), m); b.position.set(px * s, py * s, pz * s); g.add(b); });
  g.position.set(x, 0, z); toonify(g); scene.add(g); return g;
}
function waddle(g, t, moving, speed = 10) {
  const sw = moving ? Math.sin(t * speed) * .6 : 0;
  g.legs[0].rotation.x = sw; g.legs[1].rotation.x = -sw;
  g.wingL.rotation.z = moving ? Math.sin(t * speed) * .15 : 0; g.wingR.rotation.z = -g.wingL.rotation.z;
  g.neckPivot.rotation.x = .1 + (moving ? Math.abs(Math.sin(t * speed)) * .08 : Math.sin(t * 2) * .04);
}
const breadMat = new THREE.MeshStandardMaterial({ color: "#e0a75e", roughness: .8 }), goldMat = new THREE.MeshStandardMaterial({ color: "#f7c948", emissive: "#a8790a", emissiveIntensity: .45 }), burntMat = new THREE.MeshStandardMaterial({ color: "#4a3328", roughness: .9 });
const breadGeo = { base: new THREE.BoxGeometry(.9, .45, .55), top: new THREE.CylinderGeometry(.28, .28, .9, 16, 1, false, 0, Math.PI) };
function makeBread(mat = breadMat) {
  const g = new THREE.Group(), base = new THREE.Mesh(breadGeo.base, mat); g.add(base);
  const top = new THREE.Mesh(breadGeo.top, mat); top.rotation.z = Math.PI / 2; top.position.y = .2; g.add(top);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return toonify(g);
}
// A soft round shadow that sits on the ground under a falling or flying object.
const blobTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(38,40,59,.55)"); gr.addColorStop(1, "rgba(38,40,59,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
function blobShadow(scene, r = .8) { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = .03; scene.add(m); return m; }
// Expanding ring for splashes and hits.
function ringFx(scene, pos, color = "#ffffff", life = .6, size = 2.2) {
  const m = new THREE.Mesh(new THREE.RingGeometry(.35, .5, 28), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.copy(pos); m.position.y = Math.max(.06, pos.y); scene.add(m);
  return { m, t: 0, life, size };
}
function stepFx(scene, list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i]; f.t += dt; const k = f.t / f.life;
    f.m.scale.setScalar(1 + k * f.size); f.m.material.opacity = Math.max(0, .9 * (1 - k));
    if (k >= 1) { scene.remove(f.m); list.splice(i, 1); }
  }
}

/* ---------- 1. Bread Catch ---------- */
function setupCatch(A) {
  const { scene, cam, goose } = A;
  ground(scene); for (let i = 0; i < 12; i++) tree(scene, rand(-30, 30), rand(-34, -16), rand(.8, 1.3));
  for (let i = 0; i < 10; i++) bush(scene, rand(-16, 16), rand(-14, -6), rand(.7, 1.2));
  [[-18, 15, -40, 1.6], [6, 18, -50, 2], [24, 14, -38, 1.4]].forEach(c => cloud(scene, ...c));
  const pond = new THREE.Mesh(new THREE.CircleGeometry(5, 32), new THREE.MeshStandardMaterial({ color: "#3a8fb7", roughness: .2 })); pond.rotation.x = -Math.PI / 2; pond.position.set(-12, .02, -6); toonify(pond); scene.add(pond);
  // Picnic blanket the goose runs on.
  const blanketTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? "#fffaf0" : "#e05a4f"; g.fillRect(x * 8, y * 8, 8, 8); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; return t; })();
  const blanket = new THREE.Mesh(new THREE.PlaneGeometry(18, 4), new THREE.MeshStandardMaterial({ map: blanketTex })); blanket.rotation.x = -Math.PI / 2; blanket.position.set(0, .02, 0); blanket.receiveShadow = true; toonify(blanket); scene.add(blanket);
  cam.position.set(0, 7, 13); cam.lookAt(0, 2.5, 0);
  goose.root.scale.setScalar(.75); goose.root.rotation.y = Math.PI; // face away so the camera sees its back and the falling bread
  const items = [], fx = []; let x = 0, spawn = 0, timeLeft = 45, caught = 0, streak = 0, best = 0;
  function drop(t) {
    const r = Math.random(), kind = r < .14 ? "gold" : r < .32 ? "burnt" : "bread";
    const m = makeBread(kind === "gold" ? goldMat : kind === "burnt" ? burntMat : breadMat);
    m.position.set(rand(-7, 7), 13, 0); scene.add(m);
    items.push({ m, kind, shadow: blobShadow(scene, .7), vy: -(4 + t * .12 + Math.random() * 2), spin: rand(-3, 3) });
  }
  const remove = (it, i) => { scene.remove(it.m); scene.remove(it.shadow); items.splice(i, 1); };
  return {
    info: () => `${Math.ceil(timeLeft)}s · ${caught} caught${streak >= 5 ? " · x2 STREAK " + streak : streak ? " · streak " + streak : ""}`,
    update(dt, t, playing) {
      let dir = 0; if (A.keys.has("KeyA") || A.keys.has("ArrowLeft")) dir -= 1; if (A.keys.has("KeyD") || A.keys.has("ArrowRight")) dir += 1;
      // Mouse/touch steers toward the pointer's horizontal position.
      const target = dir ? x + dir * 12 * dt : A.pointer ? A.pointer.x * 8.5 : x;
      const prevX = x; x = clamp(x + clamp(target - x, -12 * dt, 12 * dt), -7.5, 7.5);
      goose.root.position.set(x, 0, 0); goose.root.rotation.z = (x - prevX) * -1.5; waddle(goose, performance.now() / 1000, Math.abs(x - prevX) > .001);
      stepFx(scene, fx, dt);
      if (!playing) return;
      timeLeft = Math.max(0, 45 - t); spawn -= dt;
      if (spawn <= 0) { drop(t); spawn = Math.max(.35, .95 - t * .012); }
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i]; it.m.position.y += it.vy * dt; it.m.rotation.x += it.spin * dt; it.m.rotation.z += it.spin * dt * .5;
        const p = it.m.position;
        it.shadow.position.x = p.x; it.shadow.position.z = p.z; it.shadow.scale.setScalar(clamp(1.4 - p.y / 12, .3, 1.4));
        if (p.y < 2.6 && p.y > .8 && Math.abs(p.x - x) < 1.2) {
          let pts = it.kind === "gold" ? 3 : it.kind === "burnt" ? -2 : 1;
          if (pts > 0) { streak++; best = Math.max(best, streak); if (streak >= 5) pts *= 2; caught++; } else streak = 0;
          A.addScore(pts, p.clone()); A.beep(pts > 0 ? (pts > 1 ? 1320 : 880) + Math.min(streak, 10) * 30 : 160, .12, pts > 0 ? "triangle" : "sawtooth");
          if (streak === 5) A.pop("STREAK x2!", p.clone().add(new THREE.Vector3(0, 1.5, 0)), "#5fae4e");
          fx.push(ringFx(scene, new THREE.Vector3(x, 1.2, 0), pts > 0 ? "#f7c948" : "#e05a4f", .4, 1.5));
          goose.bang = 1; remove(it, i); continue;
        }
        if (p.y < .2) { if (it.kind !== "burnt") streak = 0; fx.push(ringFx(scene, new THREE.Vector3(p.x, .05, p.z), "#fffaf0", .4, 1.2)); remove(it, i); }
      }
      goose.neckPivot.rotation.x += (goose.bang = Math.max(0, goose.bang - dt * 5)) * .4;
    },
    over: () => timeLeft <= 0,
    won: () => A.score >= 15,
    summary: () => `${A.score} points (goal 15) · ${caught} breads caught · best streak ${best}`
  };
}

/* ---------- 2. Lane Dash: an endless 3-lane runner through a Kenney suburb (CC0 models in Games/runner) ---------- */
const RUN_DIR = "runner/";
const RUN_KEYS = {
  road: "city-roads/road-straight", barrier: "city-roads/construction-barrier", cone: "city-roads/construction-cone", lamp: "city-roads/light-square",
  houses: [..."abcdefgh"].map(c => "city-suburban/building-type-" + c), treeL: "city-suburban/tree-large", treeS: "city-suburban/tree-small", planter: "city-suburban/planter", fence: "city-suburban/fence",
  cars: ["sedan", "taxi", "police", "van", "delivery", "suv", "truck"].map(c => "car/" + c), box: "car/box",
  bread: "food/bread", coin: "platformer/coin-gold", crate: "platformer/crate",
  heart: "platformer/heart", star: "platformer/star", jewel: "platformer/jewel", spring: "platformer/spring"
};
const GUARD_MODEL = "dougworld/models/mini/character-male-b.glb"; // Kenney Mini Characters (CC0), shared with DougWorld
const DASH_GOAL = 1000; // metres to win the prize
function setupDash(A) {
  const { scene, cam, goose } = A;
  const LANES = [-2.8, 0, 2.8];
  scene.fog.near = 55; scene.fog.far = 135;
  const models = new Map(); let ready = false, guard = null;
  const loader = new GLTFLoader(), keys = Object.values(RUN_KEYS).flat();
  const loadGuard = loader.loadAsync(GUARD_MODEL).then(g => {
    const root = g.scene, box = new THREE.Box3().setFromObject(root), h = box.getSize(new THREE.Vector3()).y, s = 2.5 / h;
    root.scale.setScalar(s); root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    toonify(root);
    const mixer = new THREE.AnimationMixer(root), actions = {};
    for (const clip of g.animations) actions[clip.name] = mixer.clipAction(clip);
    const wrap = new THREE.Group(); wrap.add(root); scene.add(wrap);
    // Guard cap, attached to the head bone so it bobs with him.
    const cap = new THREE.Group(), navy = new THREE.MeshStandardMaterial({ color: "#2b3a67" });
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(.3, .33, .22, 18), navy); cap.add(crown);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .04, 18, 1, false, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: "#1c2340" })); brim.position.set(0, -.1, .14); cap.add(brim);
    const badge = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), new THREE.MeshStandardMaterial({ color: "#f7c948", emissive: "#a8790a", emissiveIntensity: .4 })); badge.position.set(0, 0, .31); cap.add(badge);
    toonify(cap); cap.position.set(0, 2.5 + .02, 0); wrap.add(cap); wrap.updateMatrixWorld(true);
    let head = null; root.traverse(o => { if (!head && o.isBone && /head/i.test(o.name)) head = o; });
    if (head) head.attach(cap);
    // "!" bubble shown when he spots the goose.
    const c = document.createElement("canvas"); c.width = c.height = 128; const cx = c.getContext("2d");
    cx.font = "900 110px Fredoka, Arial"; cx.textAlign = "center"; cx.lineWidth = 16; cx.strokeStyle = INK; cx.strokeText("!", 64, 108); cx.fillStyle = "#f7c948"; cx.fillText("!", 64, 108);
    const alertSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false })); alertSprite.scale.setScalar(1.2); alertSprite.position.y = 3.4; alertSprite.visible = false; wrap.add(alertSprite);
    guard = { wrap, mixer, actions, alertSprite, current: null,
      play(name, fade = .2) { const a = actions[name] || actions.idle; if (!a || this.current === a) return; a.reset().fadeIn(fade).play(); if (this.current) this.current.fadeOut(fade); this.current = a; } };
    guard.play("idle", 0);
  }).catch(err => console.warn("Lane Dash guard model failed", err));
  Promise.all([loadGuard, ...keys.map(k => loader.loadAsync(RUN_DIR + k + ".glb").then(g => {
    toonify(g.scene); // convert once; every clone shares the cartoon materials and outlines
    const box = new THREE.Box3().setFromObject(g.scene);
    models.set(k, { scene: g.scene, size: box.getSize(new THREE.Vector3()), center: box.getCenter(new THREE.Vector3()), min: box.min.clone() });
  }))]).then(() => { buildScenery(); setupIntro(); ready = true; }).catch(err => { console.warn("Lane Dash models failed, using simple shapes", err); setupIntro(); ready = true; });
  // Clone a model scaled so one axis matches a size, resting on y=0 and centred in x/z. Falls back to a box.
  function fit(key, size, axis = "y", fallbackColor = "#9aa1ad") {
    const g = new THREE.Group(), m = models.get(key);
    if (!m) { const b = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshStandardMaterial({ color: fallbackColor })); b.position.y = size / 2; g.add(b); toonify(g); }
    else { const c = m.scene.clone(), s = size / m.size[axis]; c.scale.setScalar(s); c.position.set(-m.center.x * s, -m.min.y * s, -m.center.z * s); g.add(c); }
    g.traverse(o => { if (o.isMesh && !o.userData.isOutline) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }

  // Ground, pavements, lawns and a recycled strip of road, houses, trees and streetlights, set well back from the lanes.
  ground(scene, "#7cc35f", 300);
  const strip = (x, w, color) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 300), new THREE.MeshStandardMaterial({ color })); m.rotation.x = -Math.PI / 2; m.position.set(x, .015, -100); m.receiveShadow = true; toonify(m); scene.add(m); };
  for (const sx of [-1, 1]) { strip(sx * 6.6, 3.4, "#d9d2c3"); strip(sx * 6.6 + sx * 1.8, .25, "#bdb5a5"); }
  [[-26, 22, -90, 2.4], [14, 26, -110, 3], [34, 20, -80, 2], [-6, 30, -130, 3.2]].forEach(c => cloud(scene, ...c));
  const scenery = []; const ROAD_TILE = 9.6, ROAD_N = 15, SPAN = ROAD_TILE * ROAD_N, ROW = 10.5, ROWS = 14;
  function buildScenery() {
    for (let i = 0; i < ROAD_N; i++) { const r = fit(RUN_KEYS.road, ROAD_TILE, "x"); r.rotation.y = Math.PI / 2; r.position.set(0, .01, 14 - i * ROAD_TILE); r.userData.span = SPAN; scene.add(r); scenery.push(r); } // the Kenney tile runs along x, so turn it to run down the lanes
    for (let i = 0; i < ROWS; i++) for (const side of [-1, 1]) {
      const z = 12 - i * ROW, add = o => { o.userData.span = ROWS * ROW; scene.add(o); scenery.push(o); };
      const h = fit(pick(RUN_KEYS.houses), rand(7.5, 10)); h.position.set(side * rand(19, 21), 0, z); h.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; add(h);
      const t = fit(Math.random() < .5 ? RUN_KEYS.treeL : RUN_KEYS.treeS, rand(4.5, 6.5)); t.position.set(side * rand(12, 13.5), 0, z - 5); add(t);
      if (i % 2 === 0) { const l = fit(RUN_KEYS.lamp, 5.4); l.position.set(side * 9.2, 0, z - 2); l.rotation.y = side < 0 ? -Math.PI / 2 : Math.PI / 2; add(l); }
      else { const f = fit(RUN_KEYS.fence, 2.6, "x"); f.position.set(side * 15.5, 0, z); f.rotation.y = Math.PI / 2; add(f); }
    }
  }

  cam.fov = 56; cam.updateProjectionMatrix();
  goose.root.scale.setScalar(.55); goose.root.rotation.y = Math.PI;
  let lane = 1, gx = 0, y = 0, vy = 0, slide = 0, speed = 16, dist = 0, coins = 0, alive = true, crashT = 0, spawnIn = 8, dustT = 0, playT = 0;
  const power = { shield: false, star: 0, magnet: 0, spring: 0 };
  const things = []; // obstacles, coins and power-ups moving toward the goose
  const props = []; // intro props that scroll away once the run starts
  const dust = [], dustGeo = new THREE.SphereGeometry(.18, 8, 6), dustMat = new THREE.MeshBasicMaterial({ color: "#f6edda", transparent: true, opacity: .7 });
  const shieldBubble = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 16), new THREE.MeshBasicMaterial({ color: "#e05a4f", transparent: true, opacity: .18, depthWrite: false })); shieldBubble.visible = false; scene.add(shieldBubble);
  const stripeTex = (() => { const c = document.createElement("canvas"); c.width = 128; c.height = 16; const g = c.getContext("2d"); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#fffaf0" : "#e05a4f"; g.fillRect(i * 16, 0, 16, 16); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const poleGeo = new THREE.CylinderGeometry(.06, .06, 2.2, 8), poleMat = new THREE.MeshStandardMaterial({ color: INK }), barGeo = new THREE.BoxGeometry(2.6, .38, .2), barMat = new THREE.MeshStandardMaterial({ map: stripeTex });

  /* ----- intro cutscene: the goose steals the guard's lunch, he spots it and gives chase ----- */
  const INTRO = 6.2; let introT = 0, introOn = true, stand = null, loaf = null, heyDone = false, runDone = false;
  function setupIntro() {
    stand = new THREE.Group();
    const table = fit(RUN_KEYS.crate, 1.1, "y", "#c68642"); stand.add(table);
    loaf = fit(RUN_KEYS.bread, 1, "x", "#d9a05b"); loaf.position.y = 1.15; stand.add(loaf);
    stand.position.set(2.6, 0, -1.6); scene.add(stand); props.push(stand);
    if (guard) { guard.wrap.position.set(4.4, 0, -2.4); guard.wrap.rotation.y = Math.PI * .8; } // on his lunch break, looking away
    goose.root.position.set(-2.4, 0, .6); goose.root.rotation.y = Math.PI / 2;
    A.cinematic(true);
  }
  const ease = k => k * k * (3 - 2 * k), mix = (a, b, k) => a + (b - a) * k;
  const camFrom = new THREE.Vector3(), lookFrom = new THREE.Vector3();
  function introUpdate(dt) {
    introT += dt; const t = introT;
    guard?.mixer.update(dt);
    if (t < 2) { // sneak up to the lunch
      const k = ease(clamp(t / 2, 0, 1)); goose.root.position.set(mix(-2.4, 1.3, k), 0, mix(.6, -.9, k)); goose.root.rotation.y = Math.atan2(2.6 - goose.root.position.x, -1.6 - goose.root.position.z);
      waddle(goose, performance.now() / 1000, k < 1, 7);
      cam.position.set(mix(.4, 1, k), 3, mix(9.5, 8.2, k)); cam.lookAt(1.2, 1.1, -1.4);
      if (t <= dt + 1e-6) A.message("", "Shh… the park guard is on his lunch break.");
    } else if (t < 3.2) { // grab it, guard turns around
      if (loaf.visible) { loaf.visible = false; A.beep(990, .1, "triangle"); A.message("", "*snatch*"); }
      waddle(goose, performance.now() / 1000, false);
      if (guard) { guard.wrap.rotation.y = mix(Math.PI * .8, Math.atan2(goose.root.position.x - 4.4, goose.root.position.z + 2.4), ease(clamp((t - 2.3) / .5, 0, 1))); }
      if (t > 2.6 && !heyDone) { heyDone = true; if (guard) guard.alertSprite.visible = true; A.message("HEY!", "Come back with my lunch!"); [520, 700].forEach((f, i) => A.beep(f, .15, "square", .09, i * .12)); }
      const k = ease(clamp((t - 2.3) / .8, 0, 1)); cam.position.set(mix(1, 2.2, k), mix(3, 2.4, k), mix(8.2, 3.2, k)); cam.lookAt(mix(1.2, 4.2, k), mix(1.1, 2, k), mix(-1.4, -2.4, k));
      if (guard && guard.alertSprite.visible) guard.alertSprite.scale.setScalar(1.2 + Math.sin(t * 20) * .12);
    } else if (t < INTRO) { // goose bolts down the road, guard sprints after it, camera swings behind
      if (!runDone) { runDone = true; guard?.play("sprint"); A.message("RUN!", ""); A.beep(330, .2, "sawtooth", .08); camFrom.copy(cam.position); lookFrom.set(4.2, 2, -2.4); }
      const k = ease(clamp((t - 3.2) / 2.2, 0, 1));
      goose.root.rotation.y = mix(goose.root.rotation.y, Math.PI, Math.min(1, dt * 8));
      goose.root.position.x = mix(goose.root.position.x, 0, Math.min(1, dt * 3)); goose.root.position.z = mix(goose.root.position.z, 0, Math.min(1, dt * 3));
      waddle(goose, performance.now() / 1000, true, 18);
      if (guard) { guard.wrap.rotation.y = mix(guard.wrap.rotation.y, Math.PI, Math.min(1, dt * 6)); guard.wrap.position.x = mix(guard.wrap.position.x, 2.8, Math.min(1, dt * 2)); guard.wrap.position.z = mix(guard.wrap.position.z, 2.2, Math.min(1, dt * 1.6)); if (t > 3.6) guard.alertSprite.visible = false; }
      stand.position.z += k * dt * 6;
      cam.position.set(mix(camFrom.x, 0, k), mix(camFrom.y, 5.2, k), mix(camFrom.z, 9.6, k));
      cam.lookAt(mix(lookFrom.x, 0, k), mix(lookFrom.y, 1.2, k), mix(lookFrom.z, -12, k));
      if (t > 5.2) A.message("", ARCADE_GAMES[1].controls);
    } else endIntro();
  }
  function endIntro() {
    if (!introOn) return; introOn = false; introT = INTRO;
    goose.root.position.set(0, 0, 0); goose.root.rotation.set(0, Math.PI, 0);
    if (loaf) loaf.visible = false;
    if (guard) { guard.alertSprite.visible = false; guard.wrap.position.set(2.8, 0, 2.2); guard.wrap.rotation.y = Math.PI; guard.play("sprint"); }
    cam.position.set(0, 5.2, 9.6); cam.lookAt(0, 1.2, -12);
    A.cinematic(false); A.message("Get ready…", "");
  }

  function add(obj, data) { scene.add(obj); things.push({ obj, ...data }); }
  function obstacle(kind, li, z) {
    let obj, len = 1.2;
    if (kind === "barrier") obj = fit(RUN_KEYS.barrier, 2.4, "x", "#f28c28");
    else if (kind === "overhead") {
      obj = new THREE.Group();
      for (const px of [-1.1, 1.1]) { const c = fit(RUN_KEYS.cone, 1.6, "y", "#f28c28"); c.position.x = px; obj.add(c); const pole = new THREE.Mesh(poleGeo, poleMat); pole.position.set(px, 1.1, 0); obj.add(pole); }
      const bar = new THREE.Mesh(barGeo, barMat); bar.position.y = 1.85; bar.castShadow = true; obj.add(bar); toonify(obj);
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
    const z = -110, r = Math.random(), lanes = [0, 1, 2].sort(() => Math.random() - .5);
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
  A.root.addEventListener("pointerdown", e => { if (!e.target.closest("button,.a-res") && A.state === "play") swipe = { x: e.clientX, y: e.clientY }; });
  A.root.addEventListener("pointerup", e => {
    if (!swipe) return; const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; swipe = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return jump();
    if (Math.abs(dx) > Math.abs(dy)) (dx < 0 ? left : right)(); else (dy < 0 ? jump : duck)();
  });
  let caughtShown = false;
  function crash() {
    if (power.shield) { power.shield = false; A.beep(300, .2, "square", .1); A.message("Shield saved you!"); setTimeout(() => { if (alive) A.message(""); }, 900); return false; }
    alive = false; crashT = 0; A.beep(110, .5, "sawtooth", .14); A.message("Crash!", `${Math.floor(dist)} m run`);
    if (guard) { guard.wrap.visible = true; guard.wrap.position.set(gx + 1.4, 0, 9); guard.wrap.rotation.y = Math.PI; guard.play("sprint"); }
    return true;
  }
  const powerName = { heart: "Shield", star: "Double points", jewel: "Coin magnet", spring: "Super jump" };
  return {
    isReady: () => ready,
    introDone: () => !introOn,
    skipIntro: () => { if (ready && introOn) endIntro(); },
    info: () => { const p = []; if (power.shield) p.push("Shield"); if (power.star > 0) p.push(`x2 ${Math.ceil(power.star)}s`); if (power.magnet > 0) p.push(`Magnet ${Math.ceil(power.magnet)}s`); if (power.spring > 0) p.push(`Super jump ${Math.ceil(power.spring)}s`); return `${Math.floor(dist)} / ${DASH_GOAL} m · ${coins} coins${p.length ? " · " + p.join(" · ") : ""}`; },
    key(code) { if (code === "KeyA" || code === "ArrowLeft") left(); if (code === "KeyD" || code === "ArrowRight") right(); if (code === "Space" || code === "KeyW" || code === "ArrowUp") jump(); if (code === "KeyS" || code === "ArrowDown") duck(); },
    update(dt, t, playing) {
      if (!ready) return;
      if (introOn) { introUpdate(dt); return; }
      const run = playing && alive;
      if (run) { speed = Math.min(34, 16 + t * .38); playT = t; }
      const v = run ? speed : alive ? 0 : Math.max(0, speed * (1 - crashT * 2));
      if (!alive) crashT += dt;
      // Goose: slide between lanes, jump arcs, slide squash, fast waddle.
      gx += (LANES[lane] - gx) * Math.min(1, dt * 15);
      vy -= (power.spring > 0 ? 24 : 30) * dt; y = Math.max(0, y + vy * dt); if (y === 0 && vy < 0) vy = 0;
      slide = Math.max(0, slide - dt);
      goose.root.position.set(gx, y, 0);
      goose.root.rotation.z = (gx - LANES[lane]) * .08; goose.root.rotation.x = alive ? 0 : Math.min(1.4, crashT * 5);
      goose.root.scale.set(.55, slide > 0 ? .32 : .55, .55);
      waddle(goose, performance.now() / 1000, (run || (alive && !playing)) && y === 0, 18);
      if (slide > 0) goose.neckPivot.rotation.x = 1.1;
      shieldBubble.visible = power.shield; shieldBubble.position.set(gx, y + 1.1, 0);
      // The guard chases for the first few seconds, falls behind, and returns to grab the goose after a crash.
      if (guard) {
        guard.mixer.update(dt);
        if (alive) {
          const behind = playing ? 2.2 + playT * 2.4 : 2.2, side = gx > .5 ? gx - 2.8 : gx + 2.8; // the lane next to the goose
          guard.wrap.position.x += (side - guard.wrap.position.x) * Math.min(1, dt * 3); guard.wrap.position.z = behind;
          guard.wrap.visible = behind < 14; guard.play("sprint");
        } else {
          guard.wrap.position.z = Math.max(1.3, guard.wrap.position.z - dt * 9); guard.wrap.position.x += (gx + 1.2 - guard.wrap.position.x) * Math.min(1, dt * 4);
          if (guard.wrap.position.z <= 1.31) { guard.play("pick-up"); if (!caughtShown) { caughtShown = true; guard.alertSprite.visible = true; A.message("Caught!", "The guard got his lunch back."); } }
        }
      }
      // Camera chases the goose; a crash swings it round to see the guard.
      const cz = alive ? 9.6 : 9.6 - Math.min(1, crashT * 1.2) * 3, cxTarget = alive ? gx * .5 : gx + 4;
      cam.position.x += (cxTarget - cam.position.x) * Math.min(1, dt * 5); cam.position.y = 5.2 + y * .3; cam.position.z = cz;
      cam.fov = 56 + Math.max(0, v - 16) * .35; cam.updateProjectionMatrix(); cam.lookAt(alive ? cam.position.x * .6 : gx, 1.2 + y * .3, alive ? -12 : 0);
      for (const s of scenery) { s.position.z += v * dt; if (s.position.z > 18) s.position.z -= s.userData.span; }
      for (let i = props.length - 1; i >= 0; i--) { props[i].position.z += v * dt; if (props[i].position.z > 20) { scene.remove(props[i]); props.splice(i, 1); } }
      A.sun.position.set(gx + 8, 20, 10); A.sun.target.position.set(gx, 0, -6);
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
          if (th.kind === "bread") { coins += 5 * mult; A.beep(990, .12, "triangle"); A.message("+5 bread bonus!"); setTimeout(() => { if (alive) A.message(""); }, 700); scene.remove(o); things.splice(i, 1); continue; }
          if (th.kind === "power") {
            const pw = th.power; if (pw === "heart") power.shield = true; else power[{ star: "star", jewel: "magnet", spring: "spring" }[pw]] = 10;
            A.beep(880, .25, "triangle", .1); A.message(powerName[pw] + "!"); setTimeout(() => { if (alive) A.message(""); }, 900); scene.remove(o); things.splice(i, 1); continue;
          }
          const clear = th.kind === "barrier" ? y > .95 : th.kind === "overhead" ? slide > 0 : power.spring > 0 && y > 2.6;
          if (!clear && !th.hit) { th.hit = true; if (!crash()) { scene.remove(o); things.splice(i, 1); } continue; }
        }
        if (o.position.z > 16) { scene.remove(o); things.splice(i, 1); }
      }
      A.score = coins + Math.floor(dist / 10) * mult; A.scoreEl.textContent = A.score;
    },
    over: () => (!alive && crashT > 2) || dist >= DASH_GOAL,
    won: () => dist >= DASH_GOAL,
    summary: () => dist >= DASH_GOAL ? `You ran ${DASH_GOAL} m with the guard's lunch and grabbed ${coins} coins!` : `Caught after ${Math.floor(dist)} of ${DASH_GOAL} m · ${coins} coins`
  };
}

/* ---------- 3. Bread Toss ---------- */
function setupToss(A) {
  const { scene, cam, goose } = A;
  ground(scene); for (let i = 0; i < 10; i++) tree(scene, rand(-28, 28), rand(-38, -30), rand(.9, 1.4));
  for (let i = 0; i < 8; i++) bush(scene, (i % 2 ? 1 : -1) * rand(17, 22), rand(-26, -4), rand(.8, 1.3));
  [[-20, 16, -50, 1.8], [10, 19, -60, 2.2]].forEach(c => cloud(scene, ...c));
  const pond = new THREE.Mesh(new THREE.CircleGeometry(14, 48), new THREE.MeshStandardMaterial({ color: "#3a8fb7", roughness: .15 })); pond.rotation.x = -Math.PI / 2; pond.position.set(0, .02, -14); pond.scale.set(1.3, 1, 1); toonify(pond); scene.add(pond);
  const shore = new THREE.Mesh(new THREE.RingGeometry(14, 14.8, 64), new THREE.MeshStandardMaterial({ color: "#d9cfa8" })); shore.rotation.x = -Math.PI / 2; shore.position.set(0, .025, -14); shore.scale.set(1.3, 1, 1); toonify(shore); scene.add(shore);
  cam.position.set(0, 6, 9); cam.lookAt(0, 0, -10);
  goose.root.scale.setScalar(.7); goose.root.position.set(0, 0, 3); goose.root.rotation.y = Math.PI;
  const pads = [{ x: -6, z: -10, r: 1.6, spd: 1.1, pts: 1 }, { x: 4, z: -15, r: 1.3, spd: -1.5, pts: 1 }, { x: 0, z: -21, r: .95, spd: 2.1, pts: 2 }].map((p, i) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r, .12, 28, 1, false, .35, Math.PI * 2 - .35), new THREE.MeshStandardMaterial({ color: p.pts > 1 ? "#f7c948" : "#5fae4e", roughness: .7 })); m.position.set(p.x, .1, p.z); m.receiveShadow = true;
    const flower = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), new THREE.MeshStandardMaterial({ color: "#d96aa7" })); flower.position.set(p.r * .4, .25, 0); m.add(flower);
    toonify(m); scene.add(m);
    return { ...p, m, phase: i * 2 };
  });
  const aim = new THREE.Mesh(new THREE.RingGeometry(.35, .5, 24), new THREE.MeshBasicMaterial({ color: "#e05a4f", side: THREE.DoubleSide })); aim.rotation.x = -Math.PI / 2; aim.position.set(0, .15, -12); scene.add(aim);
  // Dotted arc showing where the bread will fly.
  const dots = Array.from({ length: 14 }, () => { const d = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshBasicMaterial({ color: "#fffaf0", transparent: true, opacity: .85 })); scene.add(d); return d; });
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.15), aimPt = new THREE.Vector3(0, .15, -12), from = new THREE.Vector3(0, 2, 2.4);
  const fx = [];
  let throwsLeft = 10, hits = 0, flying = null, streak = 0;
  const arcPoint = (k, to, out) => out.lerpVectors(from, to, k).setY(mix(from.y, to.y, k) + Math.sin(k * Math.PI) * 6);
  const mix = (a, b, k) => a + (b - a) * k;
  function toss() {
    if (flying || throwsLeft <= 0 || A.state !== "play") return;
    throwsLeft--; const m = makeBread(); scene.add(m);
    flying = { m, to: aimPt.clone(), t: 0, dur: .9, shadow: blobShadow(scene, .6) };
    goose.bang = 1; A.beep(600, .08, "triangle");
  }
  return {
    info: () => `${throwsLeft} breads left · ${hits} points${streak >= 2 ? " · streak " + streak : ""}`,
    key(code) { if (code === "Space") toss(); },
    click() { toss(); },
    update(dt, t, playing) {
      const now = performance.now() / 1000;
      for (const p of pads) { p.m.position.x = clamp(Math.sin(now * p.spd * .6 + p.phase) * 9, -12, 12); p.m.rotation.y += dt * .3; }
      // Aim: mouse picks a spot on the pond; arrow keys nudge it.
      if (A.pointer) { ray.setFromCamera(new THREE.Vector2(A.pointer.x, A.pointer.y), cam); ray.ray.intersectPlane(plane, aimPt); }
      if (A.keys.has("ArrowLeft") || A.keys.has("KeyA")) { aimPt.x -= 10 * dt; A.pointer = null; } if (A.keys.has("ArrowRight") || A.keys.has("KeyD")) { aimPt.x += 10 * dt; A.pointer = null; }
      if (A.keys.has("ArrowUp") || A.keys.has("KeyW")) { aimPt.z -= 10 * dt; A.pointer = null; } if (A.keys.has("ArrowDown") || A.keys.has("KeyS")) { aimPt.z += 10 * dt; A.pointer = null; }
      aimPt.x = clamp(aimPt.x, -14, 14); aimPt.z = clamp(aimPt.z, -26, -4); aim.position.set(aimPt.x, .15, aimPt.z);
      aim.scale.setScalar(1 + Math.sin(now * 6) * .08);
      dots.forEach((d, i) => { arcPoint((i + 1) / (dots.length + 1), aimPt, d.position); d.visible = !flying && throwsLeft > 0; });
      goose.root.rotation.y = Math.atan2(aimPt.x, aimPt.z - 3); // face the aim spot (the goose model looks along +z)
      goose.bang = Math.max(0, goose.bang - dt * 4); goose.neckPivot.rotation.x = .1 + goose.bang * .6; waddle(goose, now, false);
      stepFx(scene, fx, dt);
      if (flying) {
        flying.t += dt; const k = Math.min(1, flying.t / flying.dur), f = flying;
        arcPoint(k, f.to, f.m.position); f.m.rotation.x += dt * 8;
        f.shadow.position.set(f.m.position.x, .2, f.m.position.z);
        if (k >= 1) {
          const land = f.to.clone(), hit = pads.find(p => Math.hypot(land.x - p.m.position.x, land.z - p.m.position.z) <= p.r);
          if (hit) {
            streak++; let pts = hit.pts; if (streak >= 3) { pts++; A.pop("STREAK +1", land.clone().add(new THREE.Vector3(0, 1.4, 0)), "#5fae4e"); }
            hits += pts; A.addScore(pts, land); A.beep(hit.pts > 1 ? 1320 : 990, .15, "triangle"); fx.push(ringFx(scene, land, "#f7c948", .6, 2));
          } else { streak = 0; A.beep(200, .12, "sine"); fx.push(ringFx(scene, land, "#ffffff", .7, 2.5), ringFx(scene, land, "#bfe6f7", .9, 3.5)); }
          scene.remove(f.m); scene.remove(f.shadow); flying = null;
        }
      }
    },
    over: () => throwsLeft <= 0 && !flying,
    won: () => hits >= 6,
    summary: () => `${hits} points from 10 breads (goal 6; the small gold pad is worth 2, and 3 hits in a row add a bonus point)`
  };
}
