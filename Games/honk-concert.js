/* Honk Empire secret concert: a 3D easter egg, loaded only when a player holds rhythm mode all the way to Sparkle.
   Cutscene → Round 1 (strum on the beat) → Round 2 (note highway) → finale and grade.
   Everything is drawn with three.js; the crowd uses Kenney Blocky Characters (CC0) from DougWorld's model folder.
   All music is original and synthesised live with Web Audio. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

const INK = "#26283b";
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

/* ---------------- Original rock song: "Honk Til Dawn" (E minor) ---------------- */
const ROOTS = [40, 48, 43, 50];                 // power-chord roots per bar: E C G D
const BASS = [28, 36, 31, 38];
const LEAD = [                                  // 8 bars × 8 eighth notes (null = rest)
  [76, null, 74, 76, 79, null, 76, 74], [72, null, 74, 76, 74, null, 72, 71],
  [71, 74, 79, null, 78, null, 74, null], [74, null, 78, 74, 71, null, 69, null],
  [64, 67, 69, 71, 74, 76, 79, null], [81, null, 79, 76, 79, null, 76, 74],
  [79, null, 78, 74, 71, 74, 78, null], [74, null, 76, null, 78, 79, 81, null]
];
const LANE_COLORS = ["#5fae4e", "#e05a4f", "#f7c948", "#3a8fb7"];
const LANE_KEYS = [["KeyD", "ArrowLeft", "Digit1"], ["KeyF", "ArrowDown", "Digit2"], ["KeyJ", "ArrowUp", "Digit3"], ["KeyK", "ArrowRight", "Digit4"]];
const PITCHES = [...new Set(LEAD.flat().filter(n => n !== null))].sort((a, b) => a - b);
const laneOf = n => Math.min(3, Math.floor(PITCHES.indexOf(n) * 4 / PITCHES.length));

let cssDone = false;
function injectCss() {
  if (cssDone) return; cssDone = true;
  const s = document.createElement("style");
  s.textContent = `
  #concert{position:fixed;inset:0;z-index:200;background:#120f22;font-family:Nunito,system-ui,sans-serif;color:#fff;user-select:none;touch-action:none}
  #concert canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
  #concert .c-fade{position:absolute;inset:0;background:#000;pointer-events:none;transition:opacity 1.2s}
  #concert .c-top{position:absolute;top:14px;left:14px;right:14px;display:flex;justify-content:space-between;align-items:flex-start;pointer-events:none}
  #concert .c-score{padding:8px 14px;border:3px solid ${INK};border-radius:14px;background:#fffaf0;color:${INK};font-weight:900;box-shadow:0 3px 0 ${INK}}
  #concert .c-score b{font-family:Fredoka,sans-serif;font-size:22px}
  #concert .c-btn{pointer-events:auto;padding:8px 14px;border:3px solid ${INK};border-radius:12px;background:#e05a4f;color:#fff;font:600 15px Fredoka,sans-serif;box-shadow:0 3px 0 ${INK};cursor:pointer}
  #concert .c-title{position:absolute;left:50%;top:7%;transform:translateX(-50%);text-align:center;pointer-events:none;width:min(92%,700px)}
  #concert .c-title h1{margin:0;font:700 clamp(30px,6vw,64px) Fredoka,sans-serif;color:#f7c948;-webkit-text-stroke:6px ${INK};paint-order:stroke fill;letter-spacing:.02em}
  #concert .c-title p{margin:6px 0 0;font:600 clamp(15px,2.4vw,22px) Fredoka,sans-serif;-webkit-text-stroke:4px ${INK};paint-order:stroke fill}
  #concert .c-judge{position:absolute;left:50%;top:58%;transform:translate(-50%,-50%);font:700 38px Fredoka,sans-serif;-webkit-text-stroke:6px ${INK};paint-order:stroke fill;pointer-events:none}
  #concert .c-judge.pop{animation:cpop .35s ease-out}
  @keyframes cpop{0%{transform:translate(-50%,-50%) scale(.5)}60%{transform:translate(-50%,-50%) scale(1.15)}}
  #concert .c-ring{position:absolute;left:50%;bottom:9%;width:110px;height:110px;margin-left:-55px;pointer-events:none}
  #concert .c-ring i{position:absolute;inset:0;border:7px solid #fffaf0;border-radius:50%;box-shadow:0 0 0 3px ${INK},inset 0 0 0 3px ${INK}}
  #concert .c-ring i.app{border-color:#f7c948}
  #concert .c-pads{position:absolute;left:50%;bottom:2%;transform:translateX(-50%);display:flex;gap:8px;width:min(560px,94%)}
  #concert .c-pads button{flex:1;height:58px;border:3px solid ${INK};border-radius:14px;color:${INK};font:700 18px Fredoka,sans-serif;box-shadow:0 4px 0 ${INK};cursor:pointer}
  #concert .c-pads button.hit{transform:translateY(3px);box-shadow:0 1px 0 ${INK}}
  #concert .c-results{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,92%);padding:22px;border:4px solid ${INK};border-radius:22px;background:#fffaf0;color:${INK};text-align:center;box-shadow:0 8px 0 ${INK}}
  #concert .c-results h2{margin:0;font:700 30px Fredoka,sans-serif}
  #concert .c-grade{font:700 86px Fredoka,sans-serif;color:#f28c28;-webkit-text-stroke:6px ${INK};paint-order:stroke fill;line-height:1.1}
  #concert .c-results p{margin:4px 0;font-weight:800}
  #concert .c-results .c-btn{margin-top:14px;background:#5fae4e;font-size:18px}
  #concert .hidden{display:none}`;
  document.head.appendChild(s);
}

export function startConcert(opts) { return new Concert(opts); }

class Concert {
  constructor({ audio, muted, onFinish }) {
    injectCss();
    this.ac = audio; this.onFinish = onFinish; this.dead = false;
    this.out = audio.createGain(); this.out.gain.value = muted ? 0 : 0.8; this.out.connect(audio.destination);
    this.dist = audio.createWaveShaper(); this.dist.curve = distortionCurve(260); this.dist.oversample = "4x";
    this.cab = audio.createBiquadFilter(); this.cab.type = "lowpass"; this.cab.frequency.value = 3200;
    this.dist.connect(this.cab); this.cab.connect(this.out);
    this.stats = { r1: { perfect: 0, good: 0, miss: 0 }, r2: { perfect: 0, good: 0, miss: 0 }, combo: 0, maxCombo: 0, score: 0 };
    this.hype = 0.2;
    this.buildDom(); this.buildScene();
    this.phase = "intro"; this.t0 = performance.now();
    this.keyHandler = e => this.onKey(e); addEventListener("keydown", this.keyHandler);
    this.resize = () => this.onResize(); addEventListener("resize", this.resize); this.onResize();
    this.crowdSound(0, 4, 0.25);
    this.loop = this.loop.bind(this); this.last = performance.now(); requestAnimationFrame(this.loop);
    requestAnimationFrame(() => { this.fade.style.opacity = "0"; });
  }

  /* ---------------- DOM ---------------- */
  buildDom() {
    const root = this.root = document.createElement("div"); root.id = "concert";
    root.innerHTML = `<canvas></canvas><div class="c-fade" style="opacity:1"></div>
      <div class="c-top"><div class="c-score hidden">Score <b>0</b> · Combo <b>0</b></div><button class="c-btn" type="button">Skip</button></div>
      <div class="c-title"><h1></h1><p></p></div><div class="c-judge"></div>
      <div class="c-ring hidden"><i></i><i class="app"></i></div>
      <div class="c-pads hidden">${LANE_COLORS.map((c, i) => `<button type="button" data-lane="${i}" style="background:${c}">${["D", "F", "J", "K"][i]}</button>`).join("")}</div>
      <div class="c-results hidden"></div>`;
    document.body.appendChild(root);
    this.canvas = root.querySelector("canvas"); this.fade = root.querySelector(".c-fade");
    this.scoreEl = root.querySelector(".c-score"); this.btn = root.querySelector(".c-btn");
    this.titleH = root.querySelector(".c-title h1"); this.titleP = root.querySelector(".c-title p");
    this.judgeEl = root.querySelector(".c-judge"); this.ring = root.querySelector(".c-ring"); this.appRing = root.querySelector(".c-ring .app");
    this.pads = root.querySelector(".c-pads"); this.results = root.querySelector(".c-results");
    this.btn.addEventListener("click", e => { e.stopPropagation(); if (this.phase === "intro") this.startRound1(); else this.finish(true); });
    root.addEventListener("pointerdown", e => { if (e.target.closest("button,.c-results")) return; if (this.phase === "r1") this.strum(); else if (this.phase === "intro" && performance.now() - this.t0 > 1500) this.startRound1(); });
    this.pads.addEventListener("pointerdown", e => { const b = e.target.closest("[data-lane]"); if (b) { e.preventDefault(); this.press(+b.dataset.lane); } });
  }
  title(h, p = "") { this.titleH.textContent = h; this.titleP.textContent = p; }
  judge(text, color) { const j = this.judgeEl; j.textContent = text; j.style.color = color; j.classList.remove("pop"); void j.offsetWidth; j.classList.add("pop"); clearTimeout(this.judgeT); this.judgeT = setTimeout(() => { j.textContent = ""; }, 500); }
  updateScore() { this.scoreEl.innerHTML = `Score <b>${this.stats.score}</b> · Combo <b>${this.stats.combo}</b>`; }

  /* ---------------- 3D scene ---------------- */
  buildScene() {
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    r.setPixelRatio(Math.min(2, devicePixelRatio)); r.outputColorSpace = THREE.SRGBColorSpace; r.autoClear = false;
    const s = this.scene = new THREE.Scene(); s.background = new THREE.Color("#140f2a"); s.fog = new THREE.Fog("#140f2a", 30, 70);
    this.cam = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    s.add(new THREE.HemisphereLight("#8f84ff", "#1b1430", 0.55));
    const key = new THREE.DirectionalLight("#ffe7c4", 0.6); key.position.set(4, 10, 12); s.add(key);
    const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .7, ...o });
    const box = (w, h, d, c, x, y, z, o) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o)); m.position.set(x, y, z); s.add(m); return m; };
    // Venue floor, stage, steps, speakers, amps and a lighting truss.
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat("#221a3d")); floor.rotation.x = -Math.PI / 2; s.add(floor);
    box(18, 1.4, 9, "#2f2a4a", 0, .7, 0); box(18.4, .12, 9.4, "#f28c28", 0, 1.43, 0, { emissive: "#f28c28", emissiveIntensity: .25 });
    for (const x of [-7.6, 7.6]) { box(2, 4, 1.6, "#15121f", x, 3.4, -1.5); for (const y of [2.5, 4.2]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .1, 24), mat("#3d4160", { metalness: .6 })); c.rotation.x = Math.PI / 2; c.position.set(x, y, -.68); s.add(c); } }
    for (const x of [-4.5, 4.5]) box(1.6, 1.2, 1, "#26283b", x, 2.05, -2.6);
    for (const x of [-8.6, 8.6]) box(.35, 9, .35, "#9aa1ad", x, 5.6, -3.6, { metalness: .8 });
    box(17.6, .35, .35, "#9aa1ad", 0, 9.9, -3.6, { metalness: .8 });
    // Big screen behind the band, redrawn every bar.
    this.screenCanvas = document.createElement("canvas"); this.screenCanvas.width = 512; this.screenCanvas.height = 192;
    this.screenTex = new THREE.CanvasTexture(this.screenCanvas); this.screenTex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(13, 4.9), new THREE.MeshBasicMaterial({ map: this.screenTex })); screen.position.set(0, 7.4, -4.2); s.add(screen);
    this.drawScreen(0);
    // Coloured spotlights with visible beams that sweep with the music.
    this.spots = [];
    ["#e05a4f", "#3a8fb7", "#f7c948", "#8a5cc9"].forEach((c, i) => {
      const x = -6 + i * 4, sp = new THREE.SpotLight(c, 60, 30, .38, .5, 1.2); sp.position.set(x, 9.6, -3.2); sp.target.position.set(0, 1.5, 0); s.add(sp, sp.target);
      const beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, 9, 24, 1, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      beam.geometry.translate(0, -4.5, 0); beam.position.copy(sp.position); s.add(beam);
      this.spots.push({ sp, beam, x, phase: i * 1.3 });
    });
    this.goose = makeGoose(); this.goose.root.position.set(0, 1.5, .6); s.add(this.goose.root);
    this.buildCrowd();
    this.confetti = makeConfetti(); s.add(this.confetti.points);
    this.buildHighway();
  }
  drawScreen(bar) {
    const g = this.screenCanvas.getContext("2d"), cols = ["#f28c28", "#e05a4f", "#8a5cc9", "#3a8fb7"];
    g.fillStyle = "#120f22"; g.fillRect(0, 0, 512, 192);
    for (let i = 0; i < 16; i++) { g.fillStyle = cols[(i + bar) % 4]; g.globalAlpha = .35; g.fillRect(i * 32, 0, 30, 192); }
    g.globalAlpha = 1; g.font = "700 64px Fredoka, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineWidth = 10; g.strokeStyle = INK; g.strokeText("HONK EMPIRE", 256, 82); g.fillStyle = "#f7c948"; g.fillText("HONK EMPIRE", 256, 82);
    g.font = "700 30px Fredoka, sans-serif"; g.lineWidth = 7; g.strokeText("LIVE · ONE NIGHT ONLY", 256, 148); g.fillStyle = "#fffaf0"; g.fillText("LIVE · ONE NIGHT ONLY", 256, 148);
    this.screenTex.needsUpdate = true;
  }
  buildCrowd() {
    this.crowd = [];
    const spots = [];
    for (let row = 0; row < 5; row++) for (let i = 0; i < 9; i++) spots.push([-9 + i * 2.25 + (row % 2) * 1.1 + (Math.random() - .5) * .5, 7 + row * 2.1 + (Math.random() - .5) * .5]);
    const fallback = () => spots.forEach(([x, z]) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(.35, .9, 4, 8), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random(), .5, .55) })); m.position.set(x, .8, z); this.scene.add(m); this.crowd.push({ obj: m, base: .8, phase: Math.random() * 6 }); });
    const keys = ["a", "b", "c", "d", "e", "f", "g", "h"].map(c => `dougworld/models/blocky/character-${c}.glb`);
    const loader = new GLTFLoader();
    Promise.all(keys.map(k => loader.loadAsync(k))).then(models => {
      if (this.dead) return;
      spots.forEach(([x, z], i) => {
        const g = models[i % models.length], inst = SkeletonUtils.clone(g.scene);
        const box = new THREE.Box3().setFromObject(g.scene), sc = 1.7 / box.getSize(new THREE.Vector3()).y;
        inst.scale.setScalar(sc); inst.position.set(x, -box.min.y * sc, z); inst.rotation.y = Math.PI + (Math.random() - .5) * .4; // face the stage
        this.scene.add(inst);
        const mixer = new THREE.AnimationMixer(inst), clip = THREE.AnimationClip.findByName(g.animations, Math.random() < .5 ? "emote-yes" : "idle") || g.animations[0];
        if (clip) { const a = mixer.clipAction(clip); a.time = Math.random() * clip.duration; a.play(); }
        this.crowd.push({ obj: inst, base: inst.position.y, phase: Math.random() * 6, mixer });
      });
    }).catch(fallback);
  }
  buildHighway() {
    // A separate overlay scene: four lanes running away from the camera, notes slide toward the hit line.
    const h = this.hw = new THREE.Scene(); this.hwCam = new THREE.PerspectiveCamera(55, 1, .1, 120);
    this.hwCam.position.set(0, 3.6, 6.6); this.hwCam.lookAt(0, 0, -7);
    h.add(new THREE.HemisphereLight("#ffffff", "#444466", 1.4));
    this.laneX = [-2.25, -.75, .75, 2.25];
    const track = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 60), new THREE.MeshBasicMaterial({ color: "#120f22", transparent: true, opacity: .78 })); track.rotation.x = -Math.PI / 2; track.position.z = -28; h.add(track);
    this.laneGlow = this.laneX.map((x, i) => {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 60), new THREE.MeshBasicMaterial({ color: LANE_COLORS[i], transparent: true, opacity: .1 })); strip.rotation.x = -Math.PI / 2; strip.position.set(x, .01, -28); h.add(strip);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.52, .09, 10, 32), new THREE.MeshBasicMaterial({ color: LANE_COLORS[i] })); ring.rotation.x = -Math.PI / 2; ring.position.set(x, .05, 0); h.add(ring);
      return { strip, ring };
    });
    const hitLine = new THREE.Mesh(new THREE.PlaneGeometry(6.4, .12), new THREE.MeshBasicMaterial({ color: "#fffaf0" })); hitLine.rotation.x = -Math.PI / 2; hitLine.position.y = .02; h.add(hitLine);
    this.noteGeo = new THREE.CylinderGeometry(.46, .46, .16, 28); this.noteMats = LANE_COLORS.map(c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: .45 }));
    this.notes = []; this.hw.visible = false;
  }
  onResize() { const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h, false); for (const c of [this.cam, this.hwCam]) { c.aspect = w / h; c.updateProjectionMatrix(); } }

  /* ---------------- Instruments ---------------- */
  noise() { if (!this.nbuf) { const ac = this.ac; this.nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = this.nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return this.nbuf; }
  env(node, t, peak, dur, att = .005) { const g = this.ac.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(.0001, t + dur); node.connect(g); return g; }
  osc(type, f, t, dur) { const o = this.ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(t + dur + .05); return o; }
  kick(t) { const o = this.osc("sine", 160, t, .3); o.frequency.exponentialRampToValueAtTime(40, t + .15); this.env(o, t, .9, .28).connect(this.out); }
  snare(t) { const n = this.ac.createBufferSource(); n.buffer = this.noise(); const f = this.ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1900; n.connect(f); this.env(f, t, .6, .2).connect(this.out); n.start(t); n.stop(t + .25); this.env(this.osc("triangle", 190, t, .12), t, .25, .1).connect(this.out); }
  hat(t, open) { const n = this.ac.createBufferSource(); n.buffer = this.noise(); const f = this.ac.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 8000; n.connect(f); this.env(f, t, open ? .18 : .1, open ? .3 : .05).connect(this.out); n.start(t); n.stop(t + .35); }
  crash(t) { const n = this.ac.createBufferSource(); n.buffer = this.noise(); const f = this.ac.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 5000; n.connect(f); this.env(f, t, .3, 1.6).connect(this.out); n.start(t); n.stop(t + 1.7); }
  sticks(t) { this.env(this.osc("square", 2400, t, .04), t, .15, .04).connect(this.out); }
  bass(n, t, d) { const o = this.osc("sawtooth", midi(n), t, d); const f = this.ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 500; o.connect(f); this.env(f, t, .45, d).connect(this.out); }
  power(root, t, d, gain = .22) { for (const st of [0, 7, 12]) { const o = this.osc("sawtooth", midi(root + st) * (1 + (Math.random() - .5) * .004), t, d); this.env(o, t, gain, d, .004).connect(this.dist); } }
  lead(n, t, d) { const o = this.osc("square", midi(n), t, d); const lfo = this.osc("sine", 5.5, t, d); const lg = this.ac.createGain(); lg.gain.value = 6; lfo.connect(lg); lg.connect(o.frequency); this.env(o, t, .12, d, .01).connect(this.dist); }
  clunk(t) { this.env(this.osc("square", 110, t, .12), t, .12, .1).connect(this.out); }
  crowdSound(t, dur, level) { const ac = this.ac, n = ac.createBufferSource(); n.buffer = this.noise(); n.loop = true; const f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1100; f.Q.value = .6; n.connect(f); const g = ac.createGain(), s = ac.currentTime + t; g.gain.setValueAtTime(.0001, s); g.gain.exponentialRampToValueAtTime(level, s + dur * .3); g.gain.exponentialRampToValueAtTime(.0001, s + dur); f.connect(g); g.connect(this.out); n.start(s); n.stop(s + dur + .1); }
  // Backing track for a section: drums and bass every bar, optional rhythm guitar chugs.
  backing(start, beat, bars, guitar) {
    for (let b = 0; b < bars; b++) for (let i = 0; i < 8; i++) {
      const t = start + (b * 4 + i / 2) * beat, bar = b % 4;
      if (i === 0 || i === 4 || (i === 5 && b % 2)) this.kick(t);
      if (i === 2 || i === 6) this.snare(t);
      this.hat(t, i === 7);
      this.bass(BASS[bar] + (i === 6 ? 7 : 0), t, beat * .45);
      if (guitar) this.power(ROOTS[bar], t, beat * .42, .09);
    }
    this.crash(start);
  }

  /* ---------------- Rounds ---------------- */
  startRound1() {
    if (this.phase !== "intro") return;
    this.phase = "r1"; this.title("Round 1: Keep the beat!", "Click or press Space exactly on each beat to strum the guitar");
    this.scoreEl.classList.remove("hidden"); this.ring.classList.remove("hidden"); this.btn.textContent = "Quit";
    this.beat = 60 / 125; const now = this.ac.currentTime; this.start = now + this.beat * 4 + .3;
    for (let i = 0; i < 4; i++) this.sticks(now + .3 + i * this.beat);
    this.beats = Array.from({ length: 32 }, (_, i) => ({ t: this.start + i * this.beat, hit: false, judged: false }));
    this.backing(this.start, this.beat, 8, false);
    this.r1End = this.start + 32 * this.beat;
  }
  strum() {
    const now = this.ac.currentTime; let best = null;
    for (const b of this.beats) if (!b.judged && Math.abs(b.t - now) < (best ? Math.abs(best.t - now) : 1)) best = b;
    if (!best || Math.abs(best.t - now) > .16) { this.clunk(now); return; }
    const err = Math.abs(best.t - now), i = this.beats.indexOf(best), bar = Math.floor(i / 4) % 4;
    best.judged = true;
    if (err <= .05) this.hitResult("r1", "perfect"); else if (err <= .1) this.hitResult("r1", "good"); else { this.hitResult("r1", "miss"); this.clunk(now); return; }
    this.power(ROOTS[bar], now, this.beat * .9, .2); this.goose.strum = 1; this.goose.bang = 1;
  }
  startRound2() {
    this.phase = "r2"; this.title("Round 2: Hit the notes!", "Press D F J K (or the arrow keys) as circles reach the line");
    this.ring.classList.add("hidden"); this.pads.classList.remove("hidden"); this.hw.visible = true;
    this.beat = 60 / 112; const now = this.ac.currentTime; this.start = now + this.beat * 4 + .4;
    for (let i = 0; i < 4; i++) this.sticks(now + .4 + i * this.beat);
    this.backing(this.start, this.beat, 16, true);
    // Chart: the lead line, played twice. First pass only on-beat notes, second pass every note.
    for (let bar = 0; bar < 16; bar++) LEAD[bar % 8].forEach((n, e) => {
      if (n === null || (bar < 8 && e % 2)) return;
      const lane = laneOf(n), mesh = new THREE.Mesh(this.noteGeo, this.noteMats[lane]);
      mesh.position.set(this.laneX[lane], .1, -60); this.hw.add(mesh);
      this.notes.push({ t: this.start + (bar * 4 + e / 2) * this.beat, lane, n, mesh, done: false });
    });
    this.r2End = this.start + 64 * this.beat;
  }
  press(lane) {
    if (this.phase !== "r2") return;
    const now = this.ac.currentTime, pad = this.pads.children[lane];
    pad.classList.add("hit"); setTimeout(() => pad.classList.remove("hit"), 90);
    this.laneGlow[lane].strip.material.opacity = .45;
    let best = null;
    for (const note of this.notes) if (!note.done && note.lane === lane && Math.abs(note.t - now) <= .14 && (!best || Math.abs(note.t - now) < Math.abs(best.t - now))) best = note;
    if (!best) return;
    best.done = true; const err = Math.abs(best.t - now);
    this.hitResult("r2", err <= .055 ? "perfect" : "good");
    this.lead(best.n, now, this.beat * .55); this.goose.strum = 1; this.goose.bang = .6;
    best.mesh.material = best.mesh.material.clone(); best.mesh.material.transparent = true; best.burst = 1; // fade this note alone
  }
  hitResult(round, kind) {
    const st = this.stats; st[round][kind]++;
    if (kind === "miss") { st.combo = 0; this.judge("MISS", "#e05a4f"); this.hype = Math.max(.1, this.hype - .08); }
    else { st.combo++; st.maxCombo = Math.max(st.maxCombo, st.combo); st.score += (kind === "perfect" ? 100 : 60) * (1 + Math.floor(st.combo / 10)); this.judge(kind === "perfect" ? "PERFECT!" : "GOOD", kind === "perfect" ? "#f7c948" : "#5fae4e"); this.hype = Math.min(1, this.hype + .04); }
    this.updateScore();
  }
  onKey(e) {
    if (e.repeat) return;
    if (e.code === "Escape") return this.finish(true);
    if (this.phase === "intro" && (e.code === "Space" || e.code === "Enter")) { e.preventDefault(); return this.startRound1(); }
    if (this.phase === "r1" && e.code === "Space") { e.preventDefault(); return this.strum(); }
    if (this.phase === "r2") { const lane = LANE_KEYS.findIndex(k => k.includes(e.code)); if (lane >= 0) { e.preventDefault(); this.press(lane); } }
  }

  /* ---------------- Main loop ---------------- */
  loop(now) {
    if (this.dead) return;
    const dt = Math.min(.05, (now - this.last) / 1000); this.last = now;
    const at = this.ac.currentTime, el = (now - this.t0) / 1000;
    // Camera: the intro cutscene swoops from the back of the crowd to a close-up of the goose.
    if (this.phase === "intro") {
      const k = ease(clamp((el - 1) / 5, 0, 1));
      this.cam.position.set(Math.sin(k * .6) * 6 * (1 - k), 8 - 3.6 * k, 30 - 18 * k);
      this.cam.lookAt(0, 2.2 + 1.9 * k, 0);
      if (el > 1.2 && !this.titleShown) { this.titleShown = true; this.title("THE GOOSE IS LIVE!", "One night only at the Honk Empire Arena"); }
      if (el > 6.2 && !this.promptShown) { this.promptShown = true; this.title("THE GOOSE IS LIVE!", "Click or press Space to start the show"); this.crowdSound(0, 3, .35); }
      if (el > 11) this.startRound1();
    } else if (this.phase === "r1" || this.phase === "between") {
      const beatPhase = this.start ? ((at - this.start) / this.beat) : 0;
      this.cam.position.set(Math.sin(el * .3) * 1.2, 4.4 + Math.sin(beatPhase * Math.PI) * .03, 12); this.cam.lookAt(0, 4.1, 0);
    } else {
      const k = clamp((el - (this.r2At || el)) / 2, 0, 1);
      this.cam.position.set(0, 4.4 + 2.4 * ease(k), 12 + 4 * ease(k)); this.cam.lookAt(0, 4.1 + .6 * ease(k), 0);
    }
    if (this.phase === "r1") {
      // Approach ring shrinks onto the target exactly on each beat; unhit beats become misses.
      const next = this.beats.find(b => !b.judged && b.t > at - .1);
      if (next) { const k = clamp((next.t - at) / this.beat, 0, 1); this.appRing.style.transform = `scale(${1 + k * 1.2})`; this.appRing.style.opacity = String(1 - k * .6); }
      for (const b of this.beats) if (!b.judged && at - b.t > .16) { b.judged = true; this.hitResult("r1", "miss"); }
      if (at > this.start - this.beat * .2 && at < this.start) this.title("Round 1: Keep the beat!", "GO!");
      if (at > this.r1End + .5) { this.phase = "between"; this.ring.classList.add("hidden"); this.title("The crowd goes wild!", "Get ready for round 2…"); this.crowdSound(0, 3, .45); this.confetti.burst(); this.betweenAt = el; }
    }
    if (this.phase === "between" && el - this.betweenAt > 3) { this.r2At = el; this.startRound2(); }
    if (this.phase === "r2") {
      const speed = 13;
      for (const note of this.notes) {
        if (note.burst) { note.burst -= dt * 4; note.mesh.scale.setScalar(1 + (1 - note.burst) * 1.5); note.mesh.material.opacity = Math.max(0, note.burst); if (note.burst <= 0) { this.hw.remove(note.mesh); note.burst = 0; note.gone = true; } continue; }
        if (note.gone) continue;
        note.mesh.position.z = -(note.t - at) * speed; note.mesh.visible = note.mesh.position.z > -58;
        if (!note.done && at - note.t > .14) { note.done = true; note.gone = true; this.hw.remove(note.mesh); this.hitResult("r2", "miss"); }
      }
      this.laneGlow.forEach(l => { l.strip.material.opacity += (.1 - l.strip.material.opacity) * Math.min(1, dt * 8); });
      if (at > this.start - .2 && at < this.start) this.title("Round 2: Hit the notes!", "GO!");
      if (at > this.r2End + 1) this.showResults();
    }
    // Shared animation: lights sweep, crowd bounces with the hype, the goose rocks out.
    const beatPos = this.start ? (at - this.start) / this.beat : el * 2;
    const pulse = Math.pow(1 - ((beatPos % 1) + 1) % 1, 3);
    this.spots.forEach((s, i) => { const a = el * .9 + s.phase; s.sp.target.position.set(Math.sin(a) * 6, 1.5, Math.cos(a * .7) * 5 + 3); s.beam.lookAt(s.sp.target.position); s.beam.rotateX(-Math.PI / 2); s.sp.intensity = 40 + pulse * 60 * this.hype; s.beam.material.opacity = .035 + pulse * .07; });
    const bar = Math.floor(beatPos / 4); if (bar !== this.lastBar) { this.lastBar = bar; this.drawScreen(bar); }
    for (const c of this.crowd) { c.obj.position.y = c.base + Math.max(0, Math.sin(beatPos * Math.PI + c.phase)) * .55 * this.hype; c.mixer?.update(dt); }
    animateGoose(this.goose, el, dt, pulse);
    this.confetti.update(dt);
    this.renderer.clear(); this.renderer.render(this.scene, this.cam);
    if (this.hw.visible) { this.renderer.clearDepth(); this.renderer.render(this.hw, this.hwCam); }
    requestAnimationFrame(this.loop);
  }

  /* ---------------- Ending ---------------- */
  showResults() {
    if (this.phase === "done") return;
    this.phase = "done"; this.hw.visible = false; this.pads.classList.add("hidden"); this.title("", "");
    this.confetti.burst(); this.confetti.burst(); this.crowdSound(0, 4, .5);
    const acc = r => { const tot = r.perfect + r.good + r.miss; return tot ? (r.perfect + r.good * .6) / tot : 0; };
    const a1 = acc(this.stats.r1), a2 = acc(this.stats.r2), total = (a1 + a2) / 2;
    this.grade = total >= .95 ? "S" : total >= .85 ? "A" : total >= .7 ? "B" : total >= .5 ? "C" : "D";
    this.results.innerHTML = `<h2>Show's over!</h2><div class="c-grade">${this.grade}</div>
      <p>Round 1 (beat): ${Math.round(a1 * 100)}% · Round 2 (notes): ${Math.round(a2 * 100)}%</p>
      <p>Best combo ${this.stats.maxCombo} · Score ${this.stats.score}</p>
      <button class="c-btn" type="button">Back to the pond</button>`;
    this.results.classList.remove("hidden"); this.btn.classList.add("hidden");
    this.results.querySelector("button").addEventListener("click", () => this.finish(false));
  }
  finish(quit) {
    if (this.dead) return;
    if (quit && this.phase !== "done") this.grade = "D";
    this.dead = true;
    removeEventListener("keydown", this.keyHandler); removeEventListener("resize", this.resize);
    this.out.gain.setTargetAtTime(.0001, this.ac.currentTime, .1); setTimeout(() => this.out.disconnect(), 500);
    this.renderer.dispose(); this.root.remove();
    this.onFinish?.({ grade: this.grade || "D", score: this.stats.score, quit });
  }
}

/* ---------------- The goose (built from simple shapes; stage gear = shades, guitar and mic) ---------------- */
// Also used by the arcade minigames (honk-arcade.js) with { stage: false } for a plain goose.
export function makeGoose({ stage = true } = {}) {
  const root = new THREE.Group(), mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .6, ...o });
  const white = mat("#fbfbf6"), orange = mat("#f28c28"), ink = mat(INK);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), white); body.scale.set(1.15, .85, 1.4); body.position.y = 1.25; root.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(.45, .9, 16), white); tail.position.set(0, 1.55, -1.45); tail.rotation.x = -2.2; root.add(tail);
  const wingL = new THREE.Mesh(new THREE.SphereGeometry(.6, 20, 14), mat("#e8e8e1")); wingL.scale.set(.35, .75, 1.2); wingL.position.set(1.05, 1.35, -.1); root.add(wingL);
  const wingR = wingL.clone(); wingR.position.x = -1.05; root.add(wingR);
  const neckPivot = new THREE.Group(); neckPivot.position.set(0, 1.8, .75); root.add(neckPivot);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.28, .36, 1.6, 16), white); neck.position.y = .75; neck.rotation.x = .18; neckPivot.add(neck);
  const head = new THREE.Group(); head.position.set(0, 1.62, .2); neckPivot.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(.48, 24, 18), white));
  const beak = new THREE.Mesh(new THREE.ConeGeometry(.2, .65, 16), orange); beak.rotation.x = Math.PI / 2; beak.position.set(0, -.05, .7); head.add(beak);
  for (const x of [-.22, .22]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.08, 12, 10), ink); eye.position.set(x, .12, .4); head.add(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(.24, .06, .06), ink); brow.position.set(x, .26, .4); brow.rotation.z = x > 0 ? .45 : -.45; head.add(brow);
  }
  const legs = [];
  for (const x of [-.32, .32]) { const leg = new THREE.Group(); leg.position.set(x, .58, .2); root.add(leg); const shin = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .55, 8), orange); shin.position.y = -.28; leg.add(shin); const foot = new THREE.Mesh(new THREE.BoxGeometry(.38, .07, .5), orange); foot.position.set(0, -.54, .15); leg.add(foot); legs.push(leg); }
  const guitar = new THREE.Group();
  if (!stage) return { root, neckPivot, head, guitar, wingL, wingR, legs, bang: 0, strum: 0 };
  // Cool shades for the stage.
  const shades = new THREE.Mesh(new THREE.BoxGeometry(.66, .14, .06), ink); shades.position.set(0, .13, .45); head.add(shades);
  // Guitar: a red body, black neck and headstock, slung across the goose.
  guitar.position.set(.1, 1.2, 1.25); guitar.rotation.set(0, 0, -.55); root.add(guitar);
  const gb = new THREE.Mesh(new THREE.CylinderGeometry(.55, .62, .18, 24), mat("#e05a4f", { roughness: .3 })); gb.rotation.x = Math.PI / 2; guitar.add(gb);
  const gn = new THREE.Mesh(new THREE.BoxGeometry(.14, 1.6, .1), ink); gn.position.set(0, 1, 0); guitar.add(gn);
  const gh = new THREE.Mesh(new THREE.BoxGeometry(.26, .32, .12), ink); gh.position.set(0, 1.9, 0); guitar.add(gh);
  const mic = new THREE.Group(); mic.position.set(-1.1, 0, 1.9); root.add(mic);
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 3.4, 8), mat("#9aa1ad", { metalness: .8 })); stand.position.y = 1.7; mic.add(stand);
  const micHead = new THREE.Mesh(new THREE.SphereGeometry(.14, 12, 10), ink); micHead.position.y = 3.45; mic.add(micHead);
  return { root, neckPivot, head, guitar, wingL, wingR, legs, bang: 0, strum: 0 };
}
function animateGoose(g, t, dt, pulse) {
  g.bang = Math.max(0, g.bang - dt * 4); g.strum = Math.max(0, g.strum - dt * 6);
  g.neckPivot.rotation.x = .1 + g.bang * .55 + Math.sin(t * 2) * .05;
  g.head.rotation.z = Math.sin(t * 3) * .08;
  g.guitar.rotation.z = -.55 + g.strum * .18;
  g.wingR.rotation.x = -g.strum * .6; g.wingL.rotation.z = Math.sin(t * 4) * .1;
  g.root.position.y = 1.5 + pulse * .08; g.root.rotation.y = Math.sin(t * .8) * .12;
}

/* ---------------- Confetti ---------------- */
function makeConfetti() {
  const n = 600, pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), col = new Float32Array(n * 3), cols = ["#f28c28", "#f7c948", "#5fae4e", "#3a8fb7", "#8a5cc9", "#e05a4f"].map(c => new THREE.Color(c));
  for (let i = 0; i < n; i++) { pos[i * 3 + 1] = -50; const c = cols[i % cols.length]; col.set([c.r, c.g, c.b], i * 3); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: .22, vertexColors: true }));
  let next = 0;
  return {
    points,
    burst() { for (let k = 0; k < 300; k++) { const i = next++ % n; pos.set([(Math.random() - .5) * 16, 10 + Math.random() * 2, (Math.random() - .5) * 8 + 4], i * 3); vel.set([(Math.random() - .5) * 4, Math.random() * 3, (Math.random() - .5) * 4], i * 3); } },
    update(dt) { for (let i = 0; i < n; i++) { if (pos[i * 3 + 1] < -10) continue; vel[i * 3 + 1] -= 6 * dt; for (let a = 0; a < 3; a++) pos[i * 3 + a] += vel[i * 3 + a] * dt; vel[i * 3] += (Math.random() - .5) * dt * 6; } geo.attributes.position.needsUpdate = true; }
  };
}
function distortionCurve(amount) { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (3 + amount) * x * 20 * Math.PI / 180 / (Math.PI + amount * Math.abs(x)); } return c; }
