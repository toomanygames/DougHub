/* Honk Empire arcade: three original 3D minigames drawn with three.js, loaded only when a game starts.
   Each game reports { won, score } and Honk Empire pays the prize (10% of current honks). */
import * as THREE from "three";
import { makeGoose } from "./honk-concert.js";

const INK = "#26283b";
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

export const ARCADE_GAMES = [
  { id: "catch", name: "Bread Catch", goal: "Catch 15 points of bread in 45 seconds. Golden bread is worth 3, burnt toast costs 2.", controls: "Move with A/D, the arrow keys or your mouse." },
  { id: "dash", name: "Lane Dash", goal: "Survive 40 seconds of rocks and fences. You have 3 lives.", controls: "Switch lanes with A/D or arrows (or click left/right). Jump fences with Space or W." },
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
    if (this.state === "ready" && el > 2.6) { this.state = "play"; this.message("GO!"); this.playStart = now; setTimeout(() => { if (this.state === "play") this.message(""); }, 700); }
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

/* ---------- 2. Lane Dash ---------- */
function setupDash(A) {
  const { scene, cam, goose } = A;
  ground(scene, "#6aae4f", 200);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(9, 200), new THREE.MeshStandardMaterial({ color: "#c9b58f", roughness: 1 })); road.rotation.x = -Math.PI / 2; road.position.set(0, .01, -60); road.receiveShadow = true; scene.add(road);
  const stripes = []; for (let i = 0; i < 24; i++) for (const lx of [-1.5, 1.5]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(.12, 2), new THREE.MeshBasicMaterial({ color: "#fffaf0" })); s.rotation.x = -Math.PI / 2; s.position.set(lx, .02, -i * 6); scene.add(s); stripes.push(s); }
  const side = []; for (let i = 0; i < 16; i++) for (const sx of [-8, 8]) { const g = new THREE.Group(); scene.add(g); side.push(g); g.position.set(sx + rand(-1, 1), 0, -i * 10); const tr = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.6, 9), new THREE.MeshStandardMaterial({ color: "#4f9a43" })); tr.position.y = 2.6; g.add(tr); const tk = new THREE.Mesh(new THREE.CylinderGeometry(.25, .3, 1.4, 8), new THREE.MeshStandardMaterial({ color: "#8b5a3c" })); tk.position.y = .7; g.add(tk); }
  cam.position.set(0, 5.5, 9); cam.lookAt(0, 1.5, -6);
  goose.root.scale.setScalar(.6); goose.root.rotation.y = Math.PI;
  const LANES = [-3, 0, 3], obs = []; let lane = 1, gx = 0, y = 0, vy = 0, lives = 3, hurt = 0, spawn = 1, timeLeft = 40, feathers = 0, alive = true;
  const rockMat = new THREE.MeshStandardMaterial({ color: "#9aa1ad", roughness: .9 }), fenceMat = new THREE.MeshStandardMaterial({ color: "#8b5a3c" }), featherMat = new THREE.MeshStandardMaterial({ color: "#fffaf0", emissive: "#f7c948", emissiveIntensity: .3 });
  function spawnRow(t) {
    const kind = Math.random() < .35 ? "fence" : "rock", free = Math.floor(Math.random() * 3);
    LANES.forEach((lx, i) => {
      let m, type;
      if (kind === "fence") { m = new THREE.Group(); for (const px of [-1.1, 1.1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.2, 1, .2), fenceMat); post.position.set(px, .5, 0); m.add(post); } const rail = new THREE.Mesh(new THREE.BoxGeometry(2.6, .2, .15), fenceMat); rail.position.y = .7; m.add(rail); type = "fence"; }
      else if (i !== free) { m = new THREE.Mesh(new THREE.DodecahedronGeometry(.9), rockMat); m.position.y = .7; type = "rock"; }
      else if (Math.random() < .7) { m = new THREE.Mesh(new THREE.ConeGeometry(.25, .9, 8), featherMat); m.position.y = 1.1; m.rotation.z = .5; type = "feather"; }
      if (!m) return;
      m.position.x = lx; m.position.z = -70; m.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(m);
      obs.push({ m, type, lane: i, hit: false });
    });
  }
  const left = () => { lane = Math.max(0, lane - 1); A.beep(500, .05); }, right = () => { lane = Math.min(2, lane + 1); A.beep(500, .05); }, jump = () => { if (y <= 0.01) { vy = 9; A.beep(700, .08, "triangle"); } };
  return {
    info: () => `${Math.ceil(timeLeft)}s · ${lives} ${lives === 1 ? "life" : "lives"}`,
    key(code) { if (code === "KeyA" || code === "ArrowLeft") left(); if (code === "KeyD" || code === "ArrowRight") right(); if (code === "Space" || code === "KeyW" || code === "ArrowUp") jump(); },
    click(p) { if (p.y > .35) jump(); else if (p.x < -.15) left(); else if (p.x > .15) right(); else jump(); },
    update(dt, t, playing) {
      const speed = playing && alive ? 16 + t * .45 : 0;
      gx += (LANES[lane] - gx) * Math.min(1, dt * 14);
      vy -= 28 * dt; y = Math.max(0, y + vy * dt); if (y === 0) vy = Math.max(0, vy);
      goose.root.position.set(gx, y, 0); waddle(goose, performance.now() / 1000, speed > 0, 16);
      hurt = Math.max(0, hurt - dt); goose.root.visible = hurt <= 0 || Math.floor(hurt * 12) % 2 === 0;
      for (const s of stripes) { s.position.z += speed * dt; if (s.position.z > 10) s.position.z -= 144; }
      for (const s of side) { s.position.z += speed * dt; if (s.position.z > 12) s.position.z -= 160; }
      if (!playing || !alive) return;
      timeLeft = Math.max(0, 40 - t); spawn -= dt;
      if (spawn <= 0) { spawnRow(t); spawn = Math.max(.65, 1.5 - t * .02); }
      for (let i = obs.length - 1; i >= 0; i--) {
        const o = obs[i]; o.m.position.z += speed * dt; if (o.type === "feather") o.m.rotation.y += dt * 4;
        if (!o.hit && Math.abs(o.m.position.z) < .9 && Math.abs(o.m.position.x - gx) < 1.3) {
          if (o.type === "feather") { o.hit = true; feathers++; A.addScore(1, o.m.position.clone()); A.beep(1200, .08, "triangle"); scene.remove(o.m); obs.splice(i, 1); continue; }
          const cleared = o.type === "fence" && y > .9;
          if (!cleared && hurt <= 0) { o.hit = true; lives--; hurt = 1.5; A.beep(140, .3, "sawtooth", .12); if (lives <= 0) { alive = false; A.message("Ouch!", "Out of lives"); } }
        }
        if (o.m.position.z > 12) { scene.remove(o.m); obs.splice(i, 1); }
      }
      if (alive) { A.score = feathers + Math.floor(t * 2); A.scoreEl.textContent = A.score; }
    },
    over: () => !alive || timeLeft <= 0,
    won: () => alive && timeLeft <= 0,
    summary: () => alive ? `Survived 40 seconds with ${lives} ${lives === 1 ? "life" : "lives"} · ${feathers} feathers` : `Knocked out with ${Math.ceil(timeLeft)}s left · ${feathers} feathers`
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
