/* Honk & Roll: The Goose Gig.
   A 3D music-battle game that continues the Honk Empire goose story: kicked out of the nest, one goose chases a music career.
   Five levels, five genres, five rivals, cutscenes. Everything is drawn with three.js and every sound is synthesized live with Web Audio.
   No downloaded art or audio. The goose model comes from Honk Empire's concert (honk-concert.js). */
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { makeGoose } from "./honk-concert.js";

const $ = id => document.getElementById(id);
const INK = "#26283b";
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
function rngFrom(seed) { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const params = new URLSearchParams(location.search);
const FORCE_MUTE = params.get("mute") === "1";           // tests: never start audio
const SPEED = clamp(Number(params.get("speed")) || 1, .25, 8);   // tests only: run the battle clock faster

/* ====================== save data ====================== */
const SAVE_KEY = "dh-goose-gig-v1";
let save = { unlocked: 1, stars: {}, best: {}, seenIntro: false, seenFinale: false, volume: .8, muted: false, dadLeftAt: 0 };
try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (_) {}
if (FORCE_MUTE) save.muted = true;
if (params.get("unlock")) save.unlocked = clamp(Number(params.get("unlock")) || 1, 1, 5);
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} }

/* ====================== levels ====================== */
const LEVELS = [
  { id: "pond", name: "Lily Pad Open Mic", genre: "Folk Pop", bpm: 96, rival: "Freddie Frog", kind: "frog", acc: .6, density: .5, vary: .15,
    root: 57, scale: [0, 2, 4, 7, 9], chordRoots: [0, 5, 7, 0], chordQual: [[0, 4, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]], swing: 0, voice: "banjo", costume: "none",
    drums: { kick: "1000001010000000", snare: "0000100000001000", hat: "1010101010101010" }, bass: [0, -1, -1, -1, 7, -1, -1, -1, 0, -1, -1, -1, 7, -1, -1, -1], bassKind: "pluck",
    sky: ["#ffb35a", "#ffe6a8"], fog: "#ffe6a8", crowd: ["#7bd88f", "#f6c85f", "#ff8fb1", "#8ecbff"],
    intro: "A banjo-playing frog owns the open mic at the pond. Nobody has ever followed him on stage.",
    taunt: "Ribbit. Kid, the pond only has room for one famous amphibian. Hop along.", win: "Okay... okay. That was actually croak-ing good.", lose: "Ribbit! Better luck next time, little honker." },
  { id: "barn", name: "Hoedown at the Barn", genre: "Country Hoedown", bpm: 118, rival: "Daisy the Cow", kind: "cow", acc: .7, density: .6, vary: .2,
    root: 55, scale: [0, 2, 4, 7, 9], chordRoots: [0, 5, 7, 0], chordQual: [[0, 4, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]], swing: 0, voice: "fiddle", costume: "hat",
    drums: { kick: "1000100010001000", snare: "0000100000001000", hat: "1010101010101010" }, bass: [0, -1, 7, -1, 0, -1, 7, -1, 0, -1, 7, -1, 0, -1, 7, -1], bassKind: "pluck",
    sky: ["#ff8a4a", "#ffd08a"], fog: "#ffd08a", crowd: ["#f2d27a", "#c97b4a", "#f7f0dc", "#8fb46a"],
    intro: "Daisy runs the loudest barn in the county. Her fiddle has put three roosters out of work.",
    taunt: "Moo-ve over, honker. I've been milkin' this stage for years.", win: "Well, butter my biscuit. You can really play, kid.", lose: "Better practice, city goose. This is a real farm." },
  { id: "neon", name: "Neon Alley Rave", genre: "Synthwave Dance", bpm: 126, rival: "DJ Whiskers", kind: "rat", acc: .78, density: .68, vary: .25,
    root: 45, scale: [0, 3, 5, 7, 10], chordRoots: [0, 8, 3, 10], chordQual: [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]], swing: 0, voice: "synth", costume: "phones",
    drums: { kick: "1000100010001000", snare: "0000100000001000", hat: "0010001000100010" }, bass: [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0], bassKind: "pump",
    sky: ["#150a3a", "#4a1b78"], fog: "#2a0f55", crowd: ["#ff4fd8", "#42f5e3", "#a56bff", "#ffe14f"],
    intro: "Deep in the city, a rat with two turntables rules the midnight scene. The bass is strong. The rats are stronger.",
    taunt: "Squeak squeak. Your little honks can't beat my drops, feather-brain.", win: "Wait, that drop was... better than mine?!", lose: "Squeak! Back to the pond, pond-life." },
  { id: "quarry", name: "Rock Quarry Riot", genre: "Heavy Rock", bpm: 138, rival: "Grizzly Thrash", kind: "bear", acc: .85, density: .75, vary: .3,
    root: 40, scale: [0, 3, 5, 7, 10], chordRoots: [0, 8, 3, 10], chordQual: [[0, 7, 12], [0, 7, 12], [0, 7, 12], [0, 7, 12]], swing: 0, voice: "guitar", costume: "punk",
    drums: { kick: "1001001010010010", snare: "0000100000001000", hat: "1010101010101010" }, bass: [0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0], bassKind: "pump",
    sky: ["#2a0a14", "#8a2a2a"], fog: "#4a1418", crowd: ["#222", "#b4442f", "#444a5a", "#8a8a8a"],
    intro: "At the old quarry, a bear in a studded vest has turned every amp up to eleven. Grown ducks have cried.",
    taunt: "GRAAAH. You wanna rock? You gotta SURVIVE my riffs, goose.", win: "Roar... respect. You shred, little goose.", lose: "Too soft, kid! Come back when you're heavier." },
  { id: "theater", name: "Grand Duck Theater", genre: "Swing Jazz", bpm: 132, rival: "Maestro Von Swan", kind: "swan", acc: .92, density: .8, vary: .3,
    root: 53, scale: [0, 3, 5, 6, 7, 10], chordRoots: [2, 7, 0, 9], chordQual: [[0, 3, 7, 10], [0, 4, 7, 10], [0, 4, 7, 11], [0, 4, 7, 10]], swing: .3, voice: "sax", costume: "tux",
    drums: { kick: "1000000010000000", snare: "0000000100000001", hat: "1001100110011001" }, bass: [0, -1, -1, -1, 4, -1, -1, -1, 7, -1, -1, -1, 5, -1, -1, -1], bassKind: "pluck",
    sky: ["#2a0a2e", "#7a2a4a"], fog: "#3a1030", crowd: ["#f5e6c8", "#d9a441", "#8a1f3a", "#2a2a3a"],
    intro: "The final stage: the legendary Grand Duck Theater. The Maestro has never lost. He also has never smiled.",
    taunt: "Honk? How... provincial. Come, let me show you what a REAL note sounds like.", win: "Magnifique. I have not been moved like this since... never.", lose: "A charming amateur. Do try again, dear." }
];

/* ====================== sound: everything is synthesized ====================== */
let clock = 0;                  // game seconds (pauses with the game, runs faster in test mode)
const sfx = {
  ctx: null, master: null, noise: null,
  get on() { return !save.muted && !FORCE_MUTE; },
  ensure() {
    if (!this.on) return false;
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return false;
      this.ctx = new C(); this.master = this.ctx.createGain(); const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp); comp.connect(this.ctx.destination);
      const len = this.ctx.sampleRate, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this.noise = buf;
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    this.master.gain.value = save.volume; return true;
  },
  at(gameT) { return this.ctx.currentTime + Math.max(0, (gameT - clock) / SPEED); },
  env(g, t, a, d, peak) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); },
  osc(type, f, t, dur, peak, a = .005, dest) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    this.env(g, t, a, dur, peak); o.connect(g); g.connect(dest || this.master); o.start(t); o.stop(t + a + dur + .05); return { o, g };
  },
  noiseHit(t, dur, peak, hp, dest) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noise; const f = this.ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
    const g = this.ctx.createGain(); this.env(g, t, .002, dur, peak); s.connect(f); f.connect(g); g.connect(dest || this.master); s.start(t); s.stop(t + dur + .05);
  },
  kick(t, v = 1) { const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .12); this.env(g, t, .002, .22, .9 * v); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + .3); },
  snare(t, v = 1) { this.noiseHit(t, .16, .5 * v, 1500); this.osc("triangle", 190, t, .09, .35 * v); },
  hat(t, v = 1) { this.noiseHit(t, .05, .22 * v, 7000); },
  bass(t, f, dur, kind) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lp = this.ctx.createBiquadFilter(); lp.type = "lowpass";
    o.type = kind === "pump" ? "sawtooth" : "triangle"; o.frequency.setValueAtTime(f, t); lp.frequency.setValueAtTime(kind === "pump" ? 700 : 500, t); lp.frequency.exponentialRampToValueAtTime(160, t + dur);
    this.env(g, t, .006, dur, kind === "pump" ? .34 : .5); o.connect(lp); lp.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + .1);
  },
  chord(t, notes, dur, wave) { for (const n of notes) this.osc(wave, midi(n), t, dur, .07, .04); },
  lead(voice, t, f, dur, v = 1) {
    const c = this.ctx;
    if (voice === "banjo") { this.osc("triangle", f, t, .32, .5 * v, .002); this.osc("square", f * 2, t, .06, .12 * v, .001); return; }
    const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter(); lp.type = "lowpass"; o.frequency.setValueAtTime(f, t);
    if (voice === "fiddle") { o.type = "sawtooth"; lp.frequency.value = 2600; const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 6; lg.gain.value = f * .012; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + .3); this.env(g, t, .04, dur, .3 * v); }
    else if (voice === "synth") { o.type = "sawtooth"; const o2 = c.createOscillator(); o2.type = "sawtooth"; o2.frequency.setValueAtTime(f * 1.007, t); o2.connect(lp); o2.start(t); o2.stop(t + dur + .2); lp.frequency.setValueAtTime(3600, t); lp.frequency.exponentialRampToValueAtTime(500, t + dur); this.env(g, t, .008, dur * .9, .22 * v); }
    else if (voice === "guitar") { o.type = "sawtooth"; const ws = c.createWaveShaper(), curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 6); } ws.curve = curve; o.connect(ws); ws.connect(lp); lp.frequency.value = 3200; this.env(g, t, .004, dur * 1.4, .22 * v); lp.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur * 1.4 + .2); return; }
    else if (voice === "sax") { o.type = "sawtooth"; const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1100; bp.Q.value = 1.2; const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5; lg.gain.value = f * .01; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + .3); o.connect(bp); bp.connect(g); this.env(g, t, .05, dur, .5 * v); g.connect(this.master); o.start(t); o.stop(t + dur + .3); return; }
    else { o.type = "square"; lp.frequency.value = 1800; this.env(g, t, .01, dur, .2 * v); }
    o.connect(lp); lp.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + .3);
  },
  honk(t, f, dur = .22, v = 1) {
    const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter();
    o.type = "sawtooth"; o2.type = "square"; o.frequency.setValueAtTime(f * 1.1, t); o.frequency.exponentialRampToValueAtTime(f, t + .06); o2.frequency.setValueAtTime(f * .5, t);
    b1.type = "bandpass"; b1.frequency.value = 700; b1.Q.value = 3; b2.type = "bandpass"; b2.frequency.value = 1500; b2.Q.value = 4;
    this.env(g, t, .008, dur, .55 * v); o.connect(b1); o2.connect(b2); b1.connect(g); b2.connect(g); g.connect(this.master); o.start(t); o2.start(t); o.stop(t + dur + .1); o2.stop(t + dur + .1);
  },
  cheer(t) { this.noiseHit(t, 1.4, .35, 1200); this.noiseHit(t + .1, 1.1, .25, 2500); },
  boo(t) { for (const f of [150, 190]) this.osc("sawtooth", f, t, 1.1, .12, .15); },
  click(t, hi) { this.osc("square", hi ? 1600 : 1100, t, .06, .25); }
};

/* ====================== toon look (same style as Honk Empire's arcade) ====================== */
const toonRamp = (() => { const t = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; })();
const toonCache = new Map(), smoothCache = new Map();
function toonMat(m) {
  if (!m || m.isMeshToonMaterial || m.isMeshBasicMaterial || m.isShaderMaterial) return m;
  if (toonCache.has(m.uuid)) return toonCache.get(m.uuid);
  const t = new THREE.MeshToonMaterial({ color: m.color ? m.color.clone() : 0xffffff, map: m.map || null, gradientMap: toonRamp, transparent: m.transparent, opacity: m.opacity, side: m.side, emissive: m.emissive ? m.emissive.clone() : 0x000000, emissiveIntensity: m.emissiveIntensity ?? 1, depthWrite: m.depthWrite });
  toonCache.set(m.uuid, t); return t;
}
const outlineMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
outlineMat.onBeforeCompile = sh => {
  sh.vertexShader = sh.vertexShader.replace("#include <project_vertex>", `#include <project_vertex>
    vec4 dhN = projectionMatrix * vec4(normalize(normalMatrix * normal), 0.0);
    vec2 dhDir = normalize(dhN.xy + vec2(1e-5));
    dhDir.x *= projectionMatrix[0][0] / projectionMatrix[1][1];
    gl_Position.xy += dhDir * 0.0042 * gl_Position.w;`);
};
function smoothGeo(g) {
  if (smoothCache.has(g.uuid)) return smoothCache.get(g.uuid);
  let s = new THREE.BufferGeometry(); s.setAttribute("position", g.getAttribute("position")); if (g.index) s.setIndex(g.index);
  s = mergeVertices(s, 1e-3); s.computeVertexNormals(); smoothCache.set(g.uuid, s); return s;
}
const NO_OUTLINE = new Set(["PlaneGeometry", "CircleGeometry", "RingGeometry"]);
function toonify(obj, { outline = true } = {}) {
  const meshes = []; obj.traverse(o => { if (o.isMesh && !o.userData.toon && !o.userData.isOutline) meshes.push(o); });
  for (const o of meshes) {
    o.userData.toon = true; o.material = Array.isArray(o.material) ? o.material.map(toonMat) : toonMat(o.material);
    const transparent = [].concat(o.material).some(m => m.transparent && m.opacity < 1);
    if (!outline || o.isSkinnedMesh || o.isInstancedMesh || transparent || o.userData.noOutline || NO_OUTLINE.has(o.geometry.type)) continue;
    const line = new THREE.Mesh(smoothGeo(o.geometry), outlineMat); line.userData.isOutline = true; line.castShadow = false; line.receiveShadow = false; line.raycast = () => {}; o.add(line);
  }
  return obj;
}
function skyTexture(top, bottom) {
  const c = document.createElement("canvas"); c.width = 2; c.height = 256; const g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, top); gr.addColorStop(.62, bottom); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .7, ...o });
const G = { sph: (r = 1) => new THREE.SphereGeometry(r, 20, 14), box: (w = 1, h = 1, d = 1) => new THREE.BoxGeometry(w, h, d), cyl: (rt, rb, h, s = 14) => new THREE.CylinderGeometry(rt, rb, h, s), cone: (r, h, s = 14) => new THREE.ConeGeometry(r, h, s), tor: (r, t) => new THREE.TorusGeometry(r, t, 10, 24), cap: (r, l) => new THREE.CapsuleGeometry(r, l, 6, 12) };
function mesh(geo, color, pos = [0, 0, 0], scl = [1, 1, 1], rot = [0, 0, 0], o = {}) { const m = new THREE.Mesh(geo, typeof color === "object" ? color : mat(color, o)); m.position.set(...pos); m.scale.set(...scl); m.rotation.set(...rot); return m; }

/* ====================== renderer, camera, world ====================== */
const canvas = $("view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, 1, .1, 200); scene.add(camera);
const world = new THREE.Group(); scene.add(world);
const lights = { hemi: new THREE.HemisphereLight("#ffffff", "#665544", 1.1), sun: new THREE.DirectionalLight("#ffffff", 1.2), spotG: new THREE.SpotLight("#ffd23f", 0, 40, .5, .5), spotR: new THREE.SpotLight("#ff5d7a", 0, 40, .5, .5) };
lights.sun.position.set(6, 12, 10); scene.add(lights.hemi, lights.sun, lights.spotG, lights.spotR, lights.spotG.target, lights.spotR.target);
let hwRef = null;
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (hwRef) { const portrait = w / h < 1; hwRef.position.y = portrait ? -.6 : -1.25; hwRef.scale.setScalar(portrait ? .92 : 1); }
}
addEventListener("resize", resize); resize();
function clearWorld() {
  for (let i = world.children.length - 1; i >= 0; i--) { const c = world.children[i]; world.remove(c); c.traverse(o => { if (o.geometry && !smoothCache.has(o.geometry.uuid) && !o.userData.isOutline) o.geometry.dispose?.(); }); }
  actors.goose = actors.rival = actors.crowd = actors.dad = actors.mom = actors.kid = null; animated.length = 0;
}
const actors = {}; const animated = [];   // animated: functions (t, dt, ctx)

/* ---------- characters ---------- */
function costume(goose, kind) {
  const head = goose.head;
  if (kind === "hat") { const h = new THREE.Group(); h.add(mesh(G.cyl(.7, .7, .08), "#7a4a22", [0, .45, 0])); h.add(mesh(G.cyl(.4, .45, .45), "#8a5a2c", [0, .7, 0])); h.add(mesh(G.cyl(.46, .46, .09), "#c93b3b", [0, .52, 0])); head.add(h); }
  if (kind === "phones") { head.add(mesh(G.tor(.52, .07), "#22222b", [0, .1, 0], [1, 1, 1], [Math.PI / 2, 0, 0])); for (const x of [-.52, .52]) head.add(mesh(G.cyl(.2, .2, .18, 16), "#ff4fd8", [x, .08, 0], [1, 1, 1], [0, 0, Math.PI / 2], { emissive: "#ff4fd8", emissiveIntensity: .6 })); head.add(mesh(G.box(.62, .14, .08), "#111", [0, .14, .46])); }
  if (kind === "punk") { for (let i = 0; i < 5; i++) head.add(mesh(G.cone(.1, .5 - Math.abs(i - 2) * .06, 6), "#ff3d6e", [0, .5 - Math.abs(i - 2) * .04, -.25 + i * .14], [1, 1, 1], [0, 0, 0])); head.add(mesh(G.box(.6, .1, .07), "#111", [0, .13, .45])); }
  if (kind === "tux") { head.add(mesh(G.cyl(.38, .4, .5), "#15151d", [0, .62, 0])); head.add(mesh(G.cyl(.52, .52, .07), "#15151d", [0, .4, 0])); const bow = new THREE.Group(); bow.position.set(0, 1.0, .55); for (const s of [-1, 1]) bow.add(mesh(G.cone(.22, .36, 4), "#c0213b", [s * .2, 0, 0], [1, 1, .5], [0, 0, s * Math.PI / 2])); bow.add(mesh(G.sph(.1), "#c0213b")); goose.neckPivot.add(bow); }
}
function buildGoose(kind, { stage = false } = {}) {
  const g = makeGoose({ stage }); costume(g, kind);
  const root = new THREE.Group(); root.add(g.root); g.holder = root;
  toonify(root); g.hit = 0; g.kind = kind; return g;
}
function animateGoose(g, t, beat, dt, o = {}) {
  g.hit = Math.max(0, g.hit - dt * 4);
  const bob = Math.abs(Math.sin(beat * Math.PI)) * (o.energy ?? .5);
  g.neckPivot.rotation.x = .12 + g.hit * .6 + bob * .12; g.head.rotation.z = Math.sin(t * 3) * .06 + (o.tilt || 0);
  g.wingR.rotation.x = -g.hit * .8; g.wingL.rotation.x = -g.hit * .8; g.wingL.rotation.z = Math.sin(t * 4) * .08;
  g.root.position.y = bob * .12; g.root.rotation.y = o.yaw ?? 0;
  if (g.guitar) g.guitar.rotation.z = -.55 + g.hit * .15;
}

/* ---------- rivals ---------- */
function makeRival(kind) {
  const root = new THREE.Group(), r = { root, hit: 0, kind, parts: {}, mood: 0 };
  const eye = (parent, x, y, z, s = .1) => { parent.add(mesh(G.sph(s * 1.6), "#fff", [x, y, z])); parent.add(mesh(G.sph(s), "#111", [x, y, z + s * 1.1])); };
  const head = new THREE.Group(), body = new THREE.Group(); root.add(body); root.add(head);
  if (kind === "frog") {
    body.add(mesh(G.sph(1), "#4cae4c", [0, 1.1, 0], [1.1, .85, .95])); body.add(mesh(G.sph(.8), "#c9f0a0", [0, 1.0, .5], [.9, .75, .6]));
    head.position.set(0, 2.15, .15); head.add(mesh(G.sph(.8), "#58c258", [0, 0, 0], [1.2, .75, 1])); eye(head, -.45, .55, .45, .17); eye(head, .45, .55, .45, .17);
    r.parts.mouth = mesh(G.box(.9, .1, .1), "#1d4d1d", [0, -.15, .75]); head.add(r.parts.mouth);
    for (const x of [-.7, .7]) { body.add(mesh(G.sph(.45), "#45a045", [x, .35, .4], [1.3, .5, 1.6])); }
    r.parts.armL = new THREE.Group(); r.parts.armR = new THREE.Group();
    for (const [a, x] of [[r.parts.armL, -.95], [r.parts.armR, .95]]) { a.position.set(x, 1.35, .3); a.add(mesh(G.cyl(.15, .12, .9), "#4cae4c", [0, -.4, 0])); root.add(a); }
    const banjo = new THREE.Group(); banjo.position.set(0, 1.05, 1.0); banjo.rotation.set(0, 0, -.5); banjo.add(mesh(G.cyl(.55, .55, .16, 24), "#c8924a", [0, 0, 0], [1, 1, 1], [Math.PI / 2, 0, 0])); banjo.add(mesh(G.cyl(.4, .4, .17, 24), "#f4f0e0", [0, 0, 0], [1, 1, 1], [Math.PI / 2, 0, 0])); banjo.add(mesh(G.box(.14, 1.6, .1), "#5a3820", [0, 1.1, 0])); root.add(banjo); r.parts.inst = banjo;
  } else if (kind === "cow") {
    body.add(mesh(G.sph(1), "#fafafa", [0, 1.25, 0], [1.2, .95, 1.1]));
    for (const [x, y, z, s] of [[-.5, 1.6, .7, .32], [.55, 1.3, .8, .28], [.1, 1.8, -.4, .3], [-.7, 1.0, -.2, .3]]) body.add(mesh(G.sph(s), "#202020", [x, y, z], [1, 1, .5]));
    head.position.set(0, 2.35, .35); head.add(mesh(G.sph(.65), "#fafafa", [0, 0, 0], [1, .95, 1])); head.add(mesh(G.sph(.4), "#ffb3c4", [0, -.2, .5], [1.1, .7, .8]));
    eye(head, -.28, .15, .5, .1); eye(head, .28, .15, .5, .1); for (const s of [-1, 1]) { head.add(mesh(G.cone(.1, .35, 8), "#e9dcb0", [s * .45, .65, 0], [1, 1, 1], [0, 0, -s * .5])); head.add(mesh(G.sph(.22), "#e8e8e8", [s * .7, .25, 0], [1.3, .5, .8], [0, 0, s * .5])); }
    r.parts.mouth = mesh(G.box(.4, .06, .1), "#7a3040", [0, -.3, .88]); head.add(r.parts.mouth);
    for (const x of [-.55, .55]) for (const z of [-.5, .5]) body.add(mesh(G.cyl(.16, .14, .9), "#f0f0f0", [x, .45, z]));
    r.parts.armL = new THREE.Group(); r.parts.armR = new THREE.Group();
    for (const [a, x] of [[r.parts.armL, -.75], [r.parts.armR, .75]]) { a.position.set(x, 1.8, .6); a.add(mesh(G.cyl(.14, .12, .9), "#f0f0f0", [0, -.4, 0])); root.add(a); }
    const fiddle = new THREE.Group(); fiddle.position.set(.05, 1.95, 1.0); fiddle.rotation.set(.2, 0, -.9); fiddle.add(mesh(G.sph(.5), "#a8602a", [0, 0, 0], [.8, 1.2, .35])); fiddle.add(mesh(G.box(.1, .9, .08), "#3a2412", [0, .85, 0])); root.add(fiddle); r.parts.inst = fiddle;
    r.parts.bow = mesh(G.cyl(.025, .025, 1.5), "#e9dcb0", [.2, 1.95, 1.15], [1, 1, 1], [0, 0, 1.2]); root.add(r.parts.bow);
    root.add(mesh(G.sph(.2), "#e0b020", [0, 1.5, 1.3]));    // cowbell
  } else if (kind === "rat") {
    body.add(mesh(G.sph(1), "#8d93a3", [0, 1.15, 0], [.95, 1, .85])); body.add(mesh(G.sph(.65), "#c9ccd8", [0, 1.0, .5], [.8, .9, .5]));
    head.position.set(0, 2.2, .1); head.add(mesh(G.sph(.7), "#9aa0b2", [0, 0, 0], [1, .9, 1.1])); head.add(mesh(G.cone(.28, .55, 12), "#9aa0b2", [0, -.1, .8], [1, 1, 1], [Math.PI / 2, 0, 0]));
    head.add(mesh(G.sph(.1), "#ff8fb0", [0, -.1, 1.1])); eye(head, -.28, .2, .55, .1); eye(head, .28, .2, .55, .1);
    for (const s of [-1, 1]) { head.add(mesh(G.cyl(.38, .38, .08, 20), "#e8a8b8", [s * .62, .65, -.1], [1, 1, 1], [Math.PI / 2, 0, 0])); for (const y of [-.05, .08]) head.add(mesh(G.cyl(.012, .012, .9), "#ddd", [s * .45, y - .1, .95], [1, 1, 1], [0, 0, Math.PI / 2 + s * .12])); }
    head.add(mesh(G.tor(.7, .07), "#15151d", [0, .15, 0], [1, 1, 1], [Math.PI / 2, 0, 0])); for (const s of [-1, 1]) head.add(mesh(G.cyl(.24, .24, .2, 16), "#42f5e3", [s * .72, .02, 0], [1, 1, 1], [0, 0, Math.PI / 2], { emissive: "#42f5e3", emissiveIntensity: .8 }));
    r.parts.mouth = mesh(G.box(.3, .05, .06), "#401020", [0, -.3, 1.0]); head.add(r.parts.mouth);
    const deck = new THREE.Group(); deck.position.set(0, 1.0, 1.35); deck.add(mesh(G.box(2.3, .22, 1.0), "#17172a")); for (const x of [-.65, .65]) { const d = mesh(G.cyl(.38, .38, .06, 24), "#0a0a14", [x, .15, 0]); d.userData.noOutline = true; deck.add(d); r.parts["disc" + (x < 0 ? "L" : "R")] = d; deck.add(mesh(G.sph(.06), "#ff4fd8", [x, .2, 0])); }
    deck.add(mesh(G.box(.3, .14, .5), "#42f5e3", [0, .15, 0], [1, 1, 1], [0, 0, 0], { emissive: "#42f5e3", emissiveIntensity: .6 })); root.add(deck); r.parts.inst = deck;
    r.parts.armL = new THREE.Group(); r.parts.armR = new THREE.Group(); for (const [a, x] of [[r.parts.armL, -.85], [r.parts.armR, .85]]) { a.position.set(x, 1.6, .4); a.add(mesh(G.cyl(.13, .11, .9), "#8d93a3", [0, -.4, .2], [1, 1, 1], [-.6, 0, 0])); root.add(a); }
  } else if (kind === "bear") {
    body.add(mesh(G.sph(1), "#6b4425", [0, 1.35, 0], [1.3, 1.2, 1.0])); body.add(mesh(G.box(1.5, 1.4, .1), "#15151d", [0, 1.35, .95]));
    for (let i = 0; i < 6; i++) body.add(mesh(G.cone(.07, .22, 6), "#cfd3dc", [-.8 + i * .32, 1.95, .98], [1, 1, 1], [Math.PI / 2, 0, 0]));
    head.position.set(0, 2.7, .25); head.add(mesh(G.sph(.8), "#7a4e2b", [0, 0, 0], [1.1, 1, 1])); head.add(mesh(G.sph(.4), "#d7b48a", [0, -.2, .6], [1.1, .8, .8])); head.add(mesh(G.sph(.12), "#111", [0, -.05, .98]));
    for (const s of [-1, 1]) { head.add(mesh(G.sph(.25), "#6b4425", [s * .65, .65, 0])); } eye(head, -.3, .22, .72, .08); eye(head, .3, .22, .72, .08);
    head.add(mesh(G.box(1.8, .14, .9), "#d1203b", [0, .42, 0], [.9, 1, 1])); for (let i = 0; i < 5; i++) head.add(mesh(G.cone(.09, .45, 6), "#ff3d6e", [0, .85, -.4 + i * .2]));
    r.parts.mouth = mesh(G.box(.5, .08, .1), "#3a0f18", [0, -.38, .94]); head.add(r.parts.mouth);
    for (const x of [-.6, .6]) body.add(mesh(G.cyl(.28, .25, 1.0), "#5a381d", [x, .5, 0]));
    r.parts.armL = new THREE.Group(); r.parts.armR = new THREE.Group(); for (const [a, x] of [[r.parts.armL, -1.25], [r.parts.armR, 1.25]]) { a.position.set(x, 2.0, .4); a.add(mesh(G.cyl(.25, .2, 1.0), "#6b4425", [0, -.45, .1], [1, 1, 1], [-.5, 0, 0])); root.add(a); }
    const gtr = new THREE.Group(); gtr.position.set(.1, 1.5, 1.25); gtr.rotation.set(0, 0, -.7); gtr.add(mesh(G.box(.95, 1.25, .16), "#c01a2a", [0, 0, 0])); gtr.add(mesh(G.box(.16, 1.9, .12), "#111", [0, 1.4, 0])); gtr.add(mesh(G.box(.3, .35, .12), "#111", [0, 2.5, 0])); root.add(gtr); r.parts.inst = gtr;
  } else if (kind === "swan") {
    body.add(mesh(G.sph(1), "#fdfdfd", [0, 1.15, -.1], [1, .85, 1.35])); body.add(mesh(G.box(1.5, 1.0, 1.0), "#15151d", [0, 1.1, .85], [.85, 1, .55]));
    const neck = new THREE.Group(); neck.position.set(0, 1.5, .55); body.add(neck); for (let i = 0; i < 6; i++) neck.add(mesh(G.sph(.28 - i * .01), "#fdfdfd", [0, i * .34, Math.sin(i * .5) * .3]));
    head.position.set(0, 3.6, .75); head.add(mesh(G.sph(.42), "#fdfdfd")); head.add(mesh(G.cone(.17, .55, 12), "#ff9c2a", [0, -.05, .55], [1, 1, 1], [Math.PI / 2, 0, 0])); eye(head, -.2, .12, .33, .06); eye(head, .2, .12, .33, .06);
    head.add(mesh(G.tor(.13, .02), "#e0b020", [.2, .12, .4])); head.add(mesh(G.cyl(.32, .34, .45), "#15151d", [0, .55, 0])); head.add(mesh(G.cyl(.48, .48, .06), "#15151d", [0, .33, 0]));
    r.parts.mouth = mesh(G.box(.2, .04, .06), "#7a3000", [0, -.1, .8]); head.add(r.parts.mouth);
    for (const s of [-1, 1]) { const w = mesh(G.sph(.7), "#f4f4f4", [s * 1.0, 1.35, -.15], [.3, .8, 1.2], [0, 0, s * .25]); body.add(w); }
    body.add(mesh(G.sph(.2), "#c0213b", [0, 2.0, .95], [1.4, .8, .5]));
    r.parts.armL = new THREE.Group(); r.parts.armR = new THREE.Group(); r.parts.armR.position.set(.75, 1.7, .55); r.parts.armL.position.set(-.75, 1.7, .55); root.add(r.parts.armL, r.parts.armR);
    const sax = new THREE.Group(); sax.position.set(.3, 1.6, 1.15); sax.rotation.set(.2, 0, -.2); sax.add(mesh(G.cyl(.1, .14, 1.4), "#e8b830", [0, .3, 0], [1, 1, 1], [0, 0, 0], { metalness: .7, roughness: .3 })); sax.add(mesh(G.tor(.35, .1), "#e8b830", [.35, -.4, 0], [1, 1, 1], [0, 0, Math.PI * .5], { metalness: .7, roughness: .3 })); sax.add(mesh(G.cone(.3, .5, 14), "#e8b830", [.7, -.15, 0], [1, 1, 1], [0, 0, Math.PI], { metalness: .7, roughness: .3 })); root.add(sax); r.parts.inst = sax;
  }
  r.parts.head = head; r.parts.body = body; toonify(root); return r;
}
function animateRival(r, t, beat, dt, energy) {
  r.hit = Math.max(0, r.hit - dt * 5);
  const bob = Math.abs(Math.sin(beat * Math.PI)) * energy;
  r.parts.head.rotation.x = r.hit * .35 + bob * .08; r.parts.head.rotation.z = Math.sin(t * 2.2) * .05;
  if (r.parts.mouth) r.parts.mouth.scale.y = 1 + r.hit * 5;
  if (r.parts.armL) { r.parts.armL.rotation.x = -.7 - r.hit * .5 + Math.sin(t * 8) * r.hit * .2; r.parts.armR.rotation.x = -.7 - r.hit * .3; }
  if (r.parts.inst) r.parts.inst.rotation.z += Math.sin(t * 30) * r.hit * .01;
  if (r.parts.discL) { r.parts.discL.rotation.y += dt * 4; r.parts.discR.rotation.y -= dt * 3; }
  if (r.parts.bow) r.parts.bow.rotation.z = 1.2 + Math.sin(t * 20) * r.hit * .3;
  r.root.position.y = (r.baseY || 0) + bob * .12;
}

/* ---------- crowd (instanced beans) ---------- */
function makeCrowd(colors, count = 54) {
  const bodyG = G.cap(.32, .45), headG = G.sph(.3), armG = G.cyl(.07, .07, .55, 8);
  const bodies = new THREE.InstancedMesh(bodyG, new THREE.MeshToonMaterial({ gradientMap: toonRamp }), count), heads = new THREE.InstancedMesh(headG, new THREE.MeshToonMaterial({ gradientMap: toonRamp, color: "#ffe2c4" }), count),
    arms = new THREE.InstancedMesh(armG, new THREE.MeshToonMaterial({ gradientMap: toonRamp }), count * 2);
  const slots = [], rng = rngFrom(77), col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / 9), cx = i % 9; let sx = (cx - 4) * 1.55 + (rng() - .5) * .7 + (row % 2) * .6; if (Math.abs(sx) < 1.7) sx = (sx < 0 ? -1 : 1) * (1.7 + Math.abs(sx) * .4); slots.push({ x: sx, z: 4.6 + row * 1.35 + rng() * .3, ph: rng() * 6.28, amp: .5 + rng() * .5 });
    col.set(colors[i % colors.length]); bodies.setColorAt(i, col); arms.setColorAt(i * 2, col); arms.setColorAt(i * 2 + 1, col);
  }
  const group = new THREE.Group(); group.add(bodies, heads, arms);
  const d = new THREE.Object3D();
  return { group, update(t, beat, energy) {
    for (let i = 0; i < count; i++) {
      const s = slots[i], hop = Math.max(0, Math.sin(beat * Math.PI + s.ph)) * energy * s.amp * .55, y = .65 + hop;
      d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.position.set(s.x, y, s.z); d.updateMatrix(); bodies.setMatrixAt(i, d.matrix);
      d.position.set(s.x, y + .72, s.z); d.updateMatrix(); heads.setMatrixAt(i, d.matrix);
      for (const side of [-1, 1]) { const up = energy * (1.3 + Math.sin(t * 6 + s.ph + side) * .3); d.position.set(s.x + side * .38, y + .35 + up * .25, s.z); d.rotation.set(0, 0, side * (.25 + up * .8)); d.updateMatrix(); arms.setMatrixAt(i * 2 + (side > 0 ? 1 : 0), d.matrix); }
    }
    bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = arms.instanceMatrix.needsUpdate = true;
  } };
}

/* ---------- venues ---------- */
function stageBase(topColor, sideColor) {
  const g = new THREE.Group(); g.add(mesh(G.box(15, .8, 6.2), sideColor, [0, .4, 0])); g.add(mesh(G.box(15.4, .12, 6.6), topColor, [0, .84, 0])); return g;
}
function beamCone(color) { const m = new THREE.Mesh(G.cone(1.6, 9, 20), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .0, depthWrite: false, blending: THREE.AdditiveBlending })); m.userData.noOutline = true; return m; }
function buildVenue(L) {
  const sky = L.sky; scene.background = skyTexture(sky[0], sky[1]); scene.fog = new THREE.Fog(L.fog, 28, 80);
  const v = { beams: [], neon: [], flames: [], extra: [] };
  const ground = mesh(G.cyl(60, 60, .4, 40), L.id === "theater" ? "#4a2a1a" : L.id === "neon" ? "#1a1626" : L.id === "quarry" ? "#4a3a36" : L.id === "barn" ? "#8a6a3a" : "#4f9e4a", [0, -.2, 0]); world.add(ground);
  const stage = stageBase(L.id === "neon" ? "#26203c" : L.id === "theater" ? "#7a4a2a" : L.id === "quarry" ? "#3a3a44" : "#a8793f", L.id === "neon" ? "#17122a" : L.id === "theater" ? "#4a2a18" : "#6e4a28"); world.add(stage);
  const dec = (m, x, y, z) => { m.position.set(x, y, z); world.add(m); return m; };
  if (L.id === "pond") {
    dec(mesh(G.cyl(9, 9, .2, 40), "#4bb0e6", [0, 0, 0]), -16, .02, -8).userData.noOutline = true;
    for (let i = 0; i < 6; i++) dec(mesh(G.cyl(.9, .9, .08, 18), "#3f9f4f"), -18 + (i % 3) * 5, .2, -10 + Math.floor(i / 3) * 5);
    const rng = rngFrom(5); for (let i = 0; i < 14; i++) { const x = (rng() - .5) * 70, z = -14 - rng() * 22; const tr = new THREE.Group(); tr.add(mesh(G.cyl(.35, .45, 2.2), "#7a5230", [0, 1.1, 0])); tr.add(mesh(G.sph(1.9), "#3f8f3f", [0, 3.2, 0])); tr.position.set(x, 0, z); world.add(tr); }
    dec(mesh(G.cyl(.08, .08, 4.5), "#6e4a28"), -5.8, 3, -2.4); dec(mesh(G.box(3.2, 1.3, .12), "#d8b26a"), -5.8, 5.3, -2.4);   // open mic sign
    for (let i = 0; i < 9; i++) dec(mesh(G.sph(.12), "#fff3a0", [0, 0, 0], [1, 1, 1], [0, 0, 0], { emissive: "#fff3a0", emissiveIntensity: .8 }), -6 + i * 1.5, 5.8 - Math.sin(i / 8 * Math.PI) * -.4, -2.4);
  } else if (L.id === "barn") {
    const barn = new THREE.Group(); barn.add(mesh(G.box(14, 8, 5), "#b2392d", [0, 4, 0])); barn.add(mesh(G.box(5, 6, .2), "#f4ecd8", [0, 3.2, 2.55])); barn.add(mesh(G.cone(8.2, 4, 4), "#6a2a22", [0, 10, 0], [1, 1, .5], [0, Math.PI / 4, 0])); barn.add(mesh(G.box(.4, 6.2, .1), "#f4ecd8", [0, 3.2, 2.7], [1, 1, 1], [0, 0, .78])); barn.position.set(0, 0, -5.5); world.add(barn);
    for (let i = 0; i < 6; i++) dec(mesh(G.cyl(.9, .9, 1.1, 18), "#e0c060", [0, 0, 0], [1, 1, 1], [0, 0, Math.PI / 2]), -12 + i * 4.5, .6, -2.4 + (i % 2) * 11);
    for (let i = 0; i < 12; i++) { dec(mesh(G.box(.2, 1.6, .2), "#e8e0cc"), -18 + i * 3.4, .8, 17); dec(mesh(G.box(3.4, .15, .1), "#e8e0cc"), -16.3 + i * 3.4, 1.1, 17); }
    for (let i = 0; i < 4; i++) dec(mesh(G.cyl(.6, .6, 1.4, 14), "#c9c9d2"), -9 + i * 6, .7, -12);   // silos feel
    for (let i = 0; i < 9; i++) dec(mesh(G.sph(.11), "#ffd34a", [0, 0, 0], [1, 1, 1], [0, 0, 0], { emissive: "#ffd34a", emissiveIntensity: .9 }), -6 + i * 1.5, 6.3, -2.4);
  } else if (L.id === "neon") {
    for (const x of [-12, 12]) dec(mesh(G.box(3, 14, 22), "#2a2038"), x, 7, -2);
    dec(mesh(G.box(30, 14, 1.2), "#1c1530"), 0, 7, -10);
    const col = ["#ff4fd8", "#42f5e3", "#ffe14f", "#a56bff"]; for (let i = 0; i < 8; i++) { const bar = mesh(G.box(.3, 6 + (i % 3) * 1.4, .3), "#111", [0, 0, 0], [1, 1, 1], [0, 0, 0], { emissive: col[i % 4], emissiveIntensity: 1 }); bar.userData.noOutline = true; dec(bar, -10.5 + i * 3, 4, -9.2); v.neon.push(bar); }
    const sign = mesh(G.tor(2.2, .22), "#111", [0, 0, 0], [1, 1, 1], [0, 0, 0], { emissive: "#ff4fd8", emissiveIntensity: 1 }); sign.userData.noOutline = true; dec(sign, 0, 8.5, -9); v.neon.push(sign);
    for (let i = 0; i < 12; i++) { const tile = mesh(G.box(1.2, .06, 1.2), "#111", [0, 0, 0], [1, 1, 1], [0, 0, 0], { emissive: col[i % 4], emissiveIntensity: .7 }); tile.userData.noOutline = true; dec(tile, -6.6 + i * 1.2, .93, 2.6); v.neon.push(tile); }
  } else if (L.id === "quarry") {
    const rng = rngFrom(11); for (let i = 0; i < 16; i++) { const a = rng() * Math.PI - Math.PI, r = 14 + rng() * 12; const rock = mesh(new THREE.DodecahedronGeometry(2.5 + rng() * 3, 0), "#5a5a66", [Math.cos(a) * r, 2 + rng() * 2, -8 - Math.abs(Math.sin(a)) * r], [1, 1.5 + rng(), 1], [rng(), rng(), 0]); world.add(rock); }
    for (const x of [-6.2, 6.2]) { const amp = new THREE.Group(); for (let i = 0; i < 3; i++) { amp.add(mesh(G.box(2, 1.6, 1.2), "#17171d", [0, .8 + i * 1.62, 0])); amp.add(mesh(G.cyl(.55, .55, .1, 18), "#2a2a33", [0, .8 + i * 1.62, .65], [1, 1, 1], [Math.PI / 2, 0, 0])); } amp.position.set(x, .9, -2); world.add(amp); }
    for (const x of [-16, 16, -9, 9]) { const f = new THREE.Group(); f.add(mesh(G.cyl(.6, .7, 1.3, 10), "#3a2a2a", [0, .65, 0])); const fl = mesh(G.cone(.7, 2, 8), "#ff8a2a", [0, 2.2, 0], [1, 1, 1], [0, 0, 0], { emissive: "#ff5a10", emissiveIntensity: 1.3 }); fl.userData.noOutline = true; f.add(fl); f.position.set(x, 0, 7.5 + (Math.abs(x) < 10 ? -4 : 0)); world.add(f); v.flames.push(fl); }
  } else {
    for (const s of [-1, 1]) { const cur = new THREE.Group(); for (let i = 0; i < 8; i++) cur.add(mesh(G.box(1.2, 14, .5), i % 2 ? "#8a1f3a" : "#a8284a", [i * 1.05, 7, Math.sin(i * 1.7) * .2])); cur.position.set(s * (s < 0 ? 13 : 5.5), 0, -3); world.add(cur); }
    dec(mesh(G.box(30, 16, .6), "#2a1228"), 0, 8, -9);
    dec(mesh(G.tor(8, .5), "#d9a441", [0, 0, 0], [1, 1, 1], [0, 0, 0], { metalness: .6, roughness: .35 }), 0, 8, -8.5);
    for (const x of [-14, 14]) dec(mesh(G.cyl(.8, .9, 14, 14), "#d9a441"), x, 7, -3);
    const ch = new THREE.Group(); ch.add(mesh(G.tor(1.3, .12), "#d9a441", [0, 0, 0], [1, 1, 1], [Math.PI / 2, 0, 0])); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ch.add(mesh(G.sph(.16), "#fff3b0", [Math.cos(a) * 1.3, -.2, Math.sin(a) * 1.3], [1, 1, 1], [0, 0, 0], { emissive: "#fff3b0", emissiveIntensity: 1 })); } ch.position.set(0, 11, 2); world.add(ch); v.extra.push(ch);
    for (let i = 0; i < 3; i++) dec(mesh(G.box(24, .5, 1.6), "#6a3a22"), 0, .25 + i * .5, 10 + i * 2.2);
  }
  // spot beams over each performer
  for (const x of [-3, 3.2]) { const b = beamCone(x < 0 ? "#ffd23f" : "#ff5d7a"); b.position.set(x, 5.6, .6); world.add(b); v.beams.push(b); }
  // light colors for the level
  lights.hemi.color.set(L.id === "neon" ? "#6a4aff" : L.id === "quarry" ? "#ff7a5a" : L.id === "theater" ? "#ffd7a8" : "#fff4dc"); lights.hemi.groundColor.set(L.id === "neon" ? "#1a0a3a" : "#5a4a3a");
  lights.hemi.intensity = L.id === "neon" ? .9 : 1.15; lights.sun.color.set(L.id === "neon" ? "#9a7aff" : L.id === "quarry" ? "#ff9a6a" : "#fff0d0"); lights.sun.intensity = L.id === "neon" ? .8 : 1.1;
  toonify(world);
  return v;
}
const hillY = (x, z) => { const r = Math.hypot(x, z); return r < 22 ? -5.2 + 8 * Math.sqrt(1 - (r / 22) * (r / 22)) : -.4; };
function buildNestScene() {
  scene.background = skyTexture("#2b1b5a", "#ff9a5a"); scene.fog = new THREE.Fog("#ff9a5a", 40, 120);
  lights.hemi.color.set("#ffd7a8"); lights.hemi.groundColor.set("#4a3a5a"); lights.hemi.intensity = 1.0; lights.sun.color.set("#ffb070"); lights.sun.intensity = 1.3; lights.sun.position.set(-20, 6, 20);
  lights.spotG.intensity = 0; lights.spotR.intensity = 0;
  const hill = mesh(G.sph(1), "#5aa84a", [0, -5.2, 0], [22, 8, 22]); world.add(hill);
  world.add(mesh(G.cyl(80, 80, .4, 40), "#4a8a46", [0, -.6, 0]));
  const pond = mesh(G.cyl(11, 11, .2, 40), "#4bb0e6", [20, -.4, 0]); pond.userData.noOutline = true; world.add(pond);
  for (let i = 0; i < 5; i++) world.add(mesh(G.cyl(.9, .9, .1, 18), "#3f9f4f", [14 + i * 2.7, -.28, -2 + (i % 2) * 4]));
  const nest = new THREE.Group(); nest.add(mesh(G.tor(2.1, .55), "#b8893a", [0, .55, 0], [1, 1, 1], [Math.PI / 2, 0, 0])); nest.add(mesh(G.cyl(1.8, 1.9, .5, 20), "#c89a46", [0, .4, 0]));
  for (const [x, z] of [[-.7, .3], [.2, -.6], [.7, .5]]) nest.add(mesh(G.sph(.34), "#fff6dc", [x, .95, z], [.8, 1, .8])); nest.position.set(0, 3, 0); world.add(nest); world.userData.nest = nest;
  const rng = rngFrom(8); for (let i = 0; i < 12; i++) { const x = -35 + rng() * 25, z = -20 - rng() * 20; const tr = new THREE.Group(); tr.add(mesh(G.cyl(.4, .5, 2.6), "#7a5230", [0, 1.3, 0])); tr.add(mesh(G.sph(2.2), "#3f8f3f", [0, 3.6, 0])); tr.position.set(x, 0, z); world.add(tr); }
  const sun = mesh(G.sph(6), "#ffd27a", [0, 0, 0], [1, 1, .1], [0, 0, 0], { emissive: "#ffb03a", emissiveIntensity: 1.2 }); sun.userData.noOutline = true; sun.position.set(-34, 9, -30); world.add(sun); world.userData.sun = sun;
  toonify(world);
}

/* ====================== subtitles, bars, cutscene runner ====================== */
let cut = null, subtitleType = null;
const bars = { top: document.createElement("div"), bottom: document.createElement("div") };
for (const [k, b] of Object.entries(bars)) { b.style.cssText = "position:fixed;left:0;right:0;height:0;background:#000;z-index:7;pointer-events:none;transition:height .5s;" + (k === "top" ? "top:0" : "bottom:0"); document.body.appendChild(b); }
function showBars(on) { bars.top.style.height = bars.bottom.style.height = on ? "8vh" : "0"; }
function say(who, text) {
  const box = $("subtitle"); clearInterval(subtitleType);
  if (!text) { box.hidden = true; return; }
  box.hidden = false; $("subWho").textContent = who || ""; const el = $("subText"); el.textContent = ""; let i = 0;
  subtitleType = setInterval(() => { i += 2; el.textContent = text.slice(0, i); if (i >= text.length) clearInterval(subtitleType); }, 22);
  box.dataset.full = text;
}
function finishText() { const box = $("subtitle"); clearInterval(subtitleType); $("subText").textContent = box.dataset.full || ""; }
function runCutscene(script, done) {
  state.mode = "cutscene"; highway.visible = false; showScreen(null); $("hud").hidden = true; $("touch").hidden = true; showBars(true); $("skipCut").hidden = false;
  cut = { script, i: -1, t: 0, shot: null, done, locked: 0 }; nextShot();
}
function nextShot() {
  if (!cut) return; cut.i++;
  if (cut.i >= cut.script.length) return endCutscene();
  cancelSpeech(); cut.shot = cut.script[cut.i]; cut.t = 0; cut.shot.setup && cut.shot.setup();
  const s = cut.shot; say(s.who, s.text); cut.hold = s.text ? Math.max(1.2, s.text.length * .045) : 0; speakShot(s);
}
function endCutscene() { cancelSpeech(); const d = cut && cut.done; cut = null; say(null, null); showBars(false); $("skipCut").hidden = true; if (d) d(); }
function advance() { if (!cut) return; const box = $("subtitle"); if (box.hidden || cut.t < .35) return; if ($("subText").textContent.length < (box.dataset.full || "").length) { finishText(); return; } nextShot(); }
function updateCutscene(dt) {
  if (!cut) return; cut.t += dt; const s = cut.shot; if (!s) return;
  const k = clamp(cut.t / s.dur, 0, 1), e = s.linear ? k : ease(k);
  if (s.cam) { const c = s.cam; camera.position.set(lerp(c.from[0], c.to[0], e), lerp(c.from[1], c.to[1], e), lerp(c.from[2], c.to[2], e)); const l = c.lookTo || c.look; camera.lookAt(lerp(c.look[0], l[0], e), lerp(c.look[1], l[1], e), lerp(c.look[2], l[2], e)); }
  s.update && s.update(k, cut.t, dt);
  if (cut.t >= s.dur && (!cut.speaking || cut.t > s.dur + 9)) nextShot();
}

/* ---------- voices: Mom and Dad speak with the browser's built-in voices (like Siri); the goose honks ---------- */
let voiceList = [];
function loadVoices() { try { voiceList = (window.speechSynthesis && speechSynthesis.getVoices() || []).filter(v => /^en/i.test(v.lang)); } catch (_) { voiceList = []; } }
if ("speechSynthesis" in window) { loadVoices(); try { speechSynthesis.addEventListener("voiceschanged", loadVoices); } catch (_) {} }
function pickVoice(role) {
  const male = /\b(David|Mark|Daniel|Alex|Fred|James|George|Guy|Ryan|Aaron|Thomas|Oliver|Arthur|Gordon)\b|\bMale\b/i, female = /\b(Zira|Samantha|Victoria|Karen|Susan|Hazel|Aria|Jenny|Moira|Tessa|Serena|Fiona|Allison|Ava|Kate|Joanna)\b|\bFemale\b/i;
  const m = voiceList.find(v => male.test(v.name)), f = voiceList.find(v => female.test(v.name));
  return role === "dad" ? (m || voiceList[0] || null) : (f || voiceList.find(v => v !== m) || voiceList[0] || null);
}
function cancelSpeech() { try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (_) {} if (cut) { clearTimeout(cut.speakGuard); cut.speaking = false; } }
function speakShot(s) {
  cancelSpeech();
  if (!sfx.on || !s.text) return;
  if (s.who === "GOOSE") { if (sfx.ensure()) { const t = sfx.ctx.currentTime; sfx.honk(t, 330, .18, .9); sfx.honk(t + .27, 392, .24, .9); } return; }
  const role = s.who === "DAD" ? "dad" : s.who === "MOM" ? "mom" : null;
  if (!role || !("speechSynthesis" in window)) return;
  const text = s.text.replace(/\(.*?\)/g, "").replace(/\.\.\./g, ", ").replace(/\s+/g, " ").trim(); if (!text) return;
  try {
    loadVoices(); const u = new SpeechSynthesisUtterance(text); u.voice = pickVoice(role); u.lang = "en-US";
    u.pitch = role === "dad" ? .6 : 1.35; u.rate = role === "dad" ? .92 : 1.04; u.volume = clamp(save.volume, 0, 1);
    cut.speaking = true; const done = () => { if (cut && cut.shot === s) cut.speaking = false; }; u.onend = done; u.onerror = done;
    cut.speakGuard = setTimeout(done, Math.max(4000, text.length * 130)); speechSynthesis.speak(u);
  } catch (_) { cut.speaking = false; }
}

/* ---------- cutscene scripts ---------- */
function placeFamily() {
  const mom = buildGoose("none"), dad = buildGoose("none"), kid = buildGoose("none", { stage: true });
  // dad: flat cap + glasses; mom: pink scarf
  dad.head.add(mesh(G.cyl(.5, .52, .16), "#6b5a3a", [0, .42, 0])); dad.head.add(mesh(G.box(.7, .05, .5), "#6b5a3a", [0, .4, .35])); dad.head.add(mesh(G.tor(.1, .02), "#222", [-.22, .12, .43])); dad.head.add(mesh(G.tor(.1, .02), "#222", [.22, .12, .43]));
  mom.neckPivot.add(mesh(G.tor(.36, .12), "#ff7aa8", [0, .5, 0], [1, 1, 1], [Math.PI / 2, 0, 0])); mom.head.add(mesh(G.sph(.2), "#c07a50", [0, .55, -.15]));
  toonify(dad.holder); toonify(mom.holder);
  mom.holder.scale.setScalar(1.05); dad.holder.scale.setScalar(1.18); kid.holder.scale.setScalar(.62);
  actors.mom = mom; actors.dad = dad; actors.kid = kid; for (const a of [mom, dad, kid]) world.add(a.holder);
  const nest = world.userData.nest;
  mom.holder.position.set(-2.6, 3.4, 1.2); mom.holder.rotation.y = .6; dad.holder.position.set(2.8, 3.4, 1.0); dad.holder.rotation.y = -.7; kid.holder.position.set(0, 3.5, .3); kid.holder.rotation.y = 0;
  return { mom, dad, kid, nest };
}
function openingScript() {
  const A = {};
  const splash = (x, z) => { for (let i = 0; i < 3; i++) { const r = mesh(G.tor(1, .06), "#ffffff", [x, -.2, z], [1, 1, 1], [Math.PI / 2, 0, 0], { transparent: true, opacity: .8 }); r.userData.ring = i; world.add(r); A["ring" + i] = r; } };
  return [
    { dur: 3.6, who: "NARRATOR", text: "The Pond. 6:42 PM. A perfectly normal evening for a perfectly normal family.", setup() { Object.assign(A, placeFamily()); A.kid.hit = 0; }, cam: { from: [-12, 7, 24], to: [-6, 5, 18], look: [4, 3, 0] }, update(k, t, dt) { animateGoose(A.kid, t, t * 2, dt, { energy: .2 }); animateGoose(A.mom, t, 0, dt, { energy: .1 }); animateGoose(A.dad, t, 0, dt, { energy: .1 }); } },
    { dur: 4, who: "NARRATOR", text: "Except one goose has been practicing the guitar since 4 AM.", cam: { from: [2.8, 4.4, 5], to: [1.6, 4.1, 4.2], look: [0, 4, .3] }, update(k, t, dt) { const b = t * 3.2; A.kid.hit = Math.max(0, Math.sin(b * Math.PI) * .9); A.kid.strum = 1; animateGoose(A.kid, t, b, dt, { energy: .9 }); A.kid.holder.rotation.z = Math.sin(b * Math.PI) * .06; A.mom.holder.rotation.z = Math.sin(t * 11) * .04; A.dad.holder.rotation.z = -Math.sin(t * 9) * .04; } },
    { dur: 3.2, who: "DAD", text: "Son. We need to talk about this... music thing.", cam: { from: [4.2, 5.2, 4.5], to: [3.4, 5, 3.6], look: [2.8, 4.8, 1] }, update(k, t, dt) { animateGoose(A.dad, t, t, dt, { energy: .3, tilt: .12 }); animateGoose(A.kid, t, 0, dt, { energy: .2 }); A.dad.hit = Math.abs(Math.sin(t * 6)) * .4; } },
    { dur: 3.4, who: "MOM", text: "A guitar? Sweetheart, that is not a real job.", cam: { from: [-4.2, 5.2, 4.5], to: [-3.4, 5, 3.6], look: [-2.6, 4.8, 1.2] }, update(k, t, dt) { animateGoose(A.mom, t, t, dt, { energy: .3, tilt: -.12 }); A.mom.hit = Math.abs(Math.sin(t * 6)) * .4; } },
    { dur: 3.2, who: "GOOSE", text: "HONK!   (Translation: But it is my DREAM!)", cam: { from: [0, 4.6, 4.6], to: [0, 4.4, 3.4], look: [0, 4.3, .3] }, update(k, t, dt) { A.kid.hit = .8 + Math.sin(t * 14) * .2; animateGoose(A.kid, t, t * 2, dt, { energy: .6 }); A.kid.holder.position.y = 3.5 + Math.abs(Math.sin(t * 7)) * .15; } },
    { dur: 3.6, who: "DAD", text: "You're nineteen. Out you go, kid. Come back when you've got a career.", cam: { from: [4.8, 4.8, 6.5], to: [3.8, 4.6, 5.2], look: [2.2, 4.6, 1] }, update(k, t, dt) { animateGoose(A.dad, t, t, dt, { energy: .2 }); A.dad.hit = Math.abs(Math.sin(t * 5)) * .35; A.dad.neckPivot.rotation.x = .3; } },
    { dur: 3.3, text: "", who: "", cam: { from: [3, 6, 31], to: [8, 6.5, 29], look: [7, 5, 0] }, setup() { say(null, null); }, update(k, t, dt) { const swing = Math.sin(clamp(k * 3, 0, 1) * Math.PI) * 1.1; A.mom.holder.position.x = -2.6 + clamp(k * 3, 0, 1) * 1.8; A.mom.legs[0].rotation.x = -swing; animateGoose(A.mom, t, 0, dt, { energy: .1 }); if (k > .3) { const f = clamp((k - .3) / .55, 0, 1); A.kid.holder.position.set(lerp(0, 22, f), 3.5 + Math.sin(f * Math.PI) * 11 - f * 3.8, lerp(.3, 1, f)); A.kid.holder.rotation.z = f * 9; if (f >= 1 && !A.splashed) { A.splashed = true; splash(22, 1); A.kid.holder.rotation.z = 0; } } if (A.splashed) for (let i = 0; i < 3; i++) { const r = A["ring" + i], p = (t * .8 + i * .3) % 1; r.scale.setScalar(.5 + p * 4); r.material.opacity = (1 - p) * .8; } } },
    { dur: 3.4, who: "NARRATOR", text: "KICKED OUT OF THE NEST.", cam: { from: [12, 3.4, 14], to: [17, 2.8, 10], look: [22, 1.2, 1] }, update(k, t, dt) { A.kid.holder.position.set(22, -.1 + Math.sin(t * 2) * .05, 1); A.kid.holder.rotation.set(0, -2.2, 0); animateGoose(A.kid, t, t, dt, { energy: .3 }); for (let i = 0; i < 3; i++) { const r = A["ring" + i]; if (r) { const p = (t * .8 + i * .3) % 1; r.scale.setScalar(.5 + p * 4); r.material.opacity = (1 - p) * .8; } } } },
    { dur: 3.2, who: "DAD", text: "...Well. I'm gonna go grab some milk.", setup() { A.dad.holder.position.set(2.8, 3.4, 1.0); A.dad.holder.rotation.y = -.7; }, cam: { from: [8, 5.2, 9], to: [6, 4.8, 7], look: [2.8, 4.4, 1] }, update(k, t, dt) { animateGoose(A.dad, t, t, dt, { energy: .2 }); A.dad.hit = Math.abs(Math.sin(t * 5)) * .3; } },
    { dur: 2.8, who: "MOM", text: "We don't even drink milk.", cam: { from: [-6, 5, 8], to: [-4.4, 4.8, 6.4], look: [-1, 4.4, 1.2] }, update(k, t, dt) { animateGoose(A.mom, t, t, dt, { energy: .2 }); A.mom.hit = Math.abs(Math.sin(t * 6)) * .4; } },
    { dur: 3, who: "DAD", text: "Then I'll be right back.", cam: { from: [6, 5, 8], to: [4.6, 4.8, 6.4], look: [2.8, 4.4, 1] }, update(k, t, dt) { animateGoose(A.dad, t, t, dt, { energy: .2 }); A.dad.hit = Math.abs(Math.sin(t * 5)) * .3; } },
    { dur: 7.5, who: "NARRATOR", text: "And that is the last time anyone saw Dad.", linear: true, cam: { from: [-6, 2.2, 5], to: [-9, 2.0, 9], look: [-4, 3.4, 14], lookTo: [-30, 3.2, 70] },
      setup() { A.dad.holder.rotation.y = Math.PI * .85; A.dad.holder.position.set(-9, hillY(-9, 12), 12); A.dad.holder.scale.setScalar(1.18); },
      update(k, t, dt) { const p = k; { const dx = lerp(-9, -34, p), dz = lerp(12, 74, p); A.dad.holder.position.set(dx, hillY(dx, dz), dz); } A.dad.holder.scale.setScalar(1.18 * lerp(1, .55, p)); A.dad.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 9 + i * Math.PI) * .7; }); A.dad.holder.rotation.y = Math.PI * .98; A.dad.holder.rotation.z = Math.sin(t * 9) * .03; world.userData.sun.position.y = lerp(9, -6, k); } },
    { dur: 3.6, who: "NARRATOR", text: "(Dad has been gone for milk ever since.)", cam: { from: [-26, 4, 60], to: [-26, 4.4, 62], look: [-38, 3, 80] }, update() { } }
  ];
}
function levelIntroScript(L, i) {
  const cam0 = [-10, 6, 20], cam1 = [10, 5, 17];
  return [
    { dur: 3.6, who: `LEVEL ${i + 1}: ${L.name.toUpperCase()}`, text: L.intro, cam: { from: cam0, to: cam1, look: [0, 2.2, 0] }, update(k, t, dt) { stageIdle(t, dt, .5); } },
    { dur: 3.4, who: L.rival.toUpperCase(), text: L.taunt, cam: { from: [8, 3.2, 8], to: [6, 3.4, 6.4], look: [3.2, 2.4, -.2] }, update(k, t, dt) { stageIdle(t, dt, .6); actors.rival.hit = Math.abs(Math.sin(t * 5)) * .5; } },
    { dur: 2.6, who: "GOOSE", text: "HONK.   (Translation: Let's do this.)", cam: { from: [-2, 3, 8], to: [-3, 3.4, 6.2], look: [-3, 2.4, 0] }, update(k, t, dt) { stageIdle(t, dt, .6); actors.goose.hit = Math.abs(Math.sin(t * 6)) * .7; } }
  ];
}
function levelOutroScript(L, won) {
  return [
    { dur: 3.4, who: L.rival.toUpperCase(), text: won ? L.win : L.lose, cam: { from: [8, 3.2, 8], to: [6, 3.4, 6.4], look: [3.2, 2.4, -.2] }, setup() { sfx.ensure() && (won ? sfx.cheer(sfx.at(clock)) : sfx.boo(sfx.at(clock))); }, update(k, t, dt) { stageIdle(t, dt, won ? 1 : .3); actors.rival.hit = won ? 0 : Math.abs(Math.sin(t * 6)) * .5; if (won) actors.rival.root.rotation.z = Math.sin(clamp(k * 2, 0, 1) * Math.PI * .5) * .25; } }
  ];
}
function finaleScript() {
  const A = {};
  const carton = () => { const m = new THREE.Group(); m.add(mesh(G.box(.45, .7, .45), "#f4f8ff", [0, 0, 0])); m.add(mesh(G.box(.45, .15, .45), "#4a7be0", [0, .42, 0])); m.add(mesh(G.cone(.3, .2, 4), "#4a7be0", [0, .6, 0], [1, 1, 1], [0, Math.PI / 4, 0])); toonify(m); return m; };
  const DAD_END = [1.4, .86, 1.7], MOM_END = [2.7, .86, 1.9], FACE_GOOSE = 5.213;      // facing the goose (about -1.07 rad)
  const walkTo = (g, from, end, k, t, turnStart) => {
    const z = lerp(from, end[2], k), onStage = z < 3.1, x = lerp(end[0] > 2 ? 1.1 : 0, end[0], clamp((k - .7) / .3, 0, 1));
    g.holder.position.set(x, onStage ? lerp(.2, end[1], clamp((3.1 - z) / 1.4, 0, 1)) : .2, z);
    g.holder.rotation.y = lerp(Math.PI, FACE_GOOSE, clamp((k - turnStart) / (1 - turnStart), 0, 1));
    g.legs.forEach((l, i) => { l.rotation.x = k < .98 ? Math.sin(t * 8 + i * Math.PI) * .6 : 0; });
  };
  const still = (t, dt, tag) => { stageIdle(t, dt, 1); animateGoose(A.dad, t, t, dt, { energy: .1 }); animateGoose(A.mom, t, t, dt, { energy: .1 }); if (tag === "dad") A.dad.hit = Math.abs(Math.sin(t * 6)) * .4; if (tag === "mom") A.mom.hit = Math.abs(Math.sin(t * 6)) * .4; };
  return [
    { dur: 3.2, who: "NARRATOR", text: "Months later. The Grand Duck Theater is still cheering.", cam: { from: [0, 5.5, 24], to: [0, 4.6, 16], look: [0, 2.6, 0] },
      setup() {
        const mom = buildGoose("none"), dad = buildGoose("none");
        dad.head.add(mesh(G.cyl(.5, .52, .16), "#6b5a3a", [0, .42, 0])); dad.head.add(mesh(G.box(.7, .05, .5), "#6b5a3a", [0, .4, .35])); toonify(dad.holder);
        mom.neckPivot.add(mesh(G.tor(.36, .12), "#ff7aa8", [0, .5, 0], [1, 1, 1], [Math.PI / 2, 0, 0])); toonify(mom.holder);
        dad.holder.scale.setScalar(.9); mom.holder.scale.setScalar(.85); A.dad = dad; A.mom = mom; world.add(dad.holder, mom.holder);
        A.milk = carton(); A.milk.position.set(.55, 1.25, .9); dad.holder.add(A.milk);
        dad.holder.position.set(0, .2, 30); dad.holder.rotation.y = Math.PI; mom.holder.position.set(1.1, .2, 31.5); mom.holder.rotation.y = Math.PI;
        actors.goose.holder.position.set(-1, .86, .5); actors.goose.holder.rotation.y = .5; actors.rival.root.position.set(6.4, .86, -.4); actors.rival.root.rotation.y = -.5;
      }, update(k, t, dt) { still(t, dt); } },
    { dur: 7, who: "", text: "", linear: true, cam: { from: [0, 4.2, 21], to: [0, 3.2, 10], look: [0, 1.8, 16], lookTo: [0, 1.6, 4] },
      update(k, t, dt) { walkTo(A.dad, 30, DAD_END, k, t, .78); walkTo(A.mom, 31.5, MOM_END, k, t, .8); still(t, dt); } },
    { dur: 3.6, who: "DAD", text: "Sorry I'm late, kid. Long line at the milk store.", cam: { from: [-.3, 3.3, 10.5], to: [.4, 3.1, 9], look: [1.6, 2.5, 1.7] }, update(k, t, dt) { still(t, dt, "dad"); } },
    { dur: 3.2, who: "MOM", text: "It has been seven months.", cam: { from: [1.2, 3.3, 10.5], to: [1.8, 3.1, 9], look: [2.6, 2.5, 1.9] }, update(k, t, dt) { still(t, dt, "mom"); } },
    { dur: 3.6, who: "DAD", text: "The prices were wild. Anyway... I heard you on the radio. I'm proud of you.", cam: { from: [-.3, 3.3, 10.5], to: [.4, 3.1, 9], look: [1.6, 2.5, 1.7] }, update(k, t, dt) { still(t, dt, "dad"); } },
    { dur: 3.2, who: "GOOSE", text: "HONK.   (Translation: Dad... you came back.)", cam: { from: [-1.1, 3.3, 10], to: [-.6, 3.1, 8.8], look: [-1, 2.4, .5] }, update(k, t, dt) { actors.goose.hit = .6 + Math.sin(t * 8) * .3; still(t, dt); } },
    { dur: 3.4, who: "DAD", text: "I got you the milk, too.", cam: { from: [-.3, 3.3, 10.5], to: [.4, 3.1, 9], look: [1.6, 2.5, 1.7] }, update(k, t, dt) { A.milk.rotation.z = Math.sin(t * 3) * .2; A.milk.position.y = 1.25 + Math.sin(t * 5) * .05; still(t, dt, "dad"); } },
    { dur: 3.6, who: "GOOSE", text: "HONK.   (Translation: ...I'm lactose intolerant.)", cam: { from: [-1.1, 3.3, 10], to: [-.6, 3.1, 8.8], look: [-1, 2.4, .5] }, update(k, t, dt) { actors.goose.hit = .5 + Math.sin(t * 9) * .4; still(t, dt); } },
    { dur: 4.4, who: "NARRATOR", text: "THE END.   HONK & ROLL.", cam: { from: [0, 6, 25], to: [0, 5, 17], look: [0, 3, 0] }, update(k, t, dt) { still(t, dt); } }
  ];
}

/* ====================== stage performers ====================== */
let venue = null, crowd = null, curLevel = null;
function buildLevelWorld(i) {
  clearWorld(); const L = LEVELS[i]; curLevel = L; venue = buildVenue(L);
  const goose = buildGoose(L.costume); goose.holder.position.set(-3, .86, .2); goose.holder.rotation.y = .12; goose.holder.scale.setScalar(.95); world.add(goose.holder); actors.goose = goose;
  const mic = new THREE.Group(); mic.add(mesh(G.cyl(.04, .04, 2.2), "#9aa1ad", [0, 1.1, 0])); mic.add(mesh(G.sph(.13), "#222", [0, 2.25, 0])); mic.position.set(-3.5, .86, 1.5); toonify(mic); world.add(mic);
  const rival = makeRival(L.kind); rival.root.position.set(3.2, .86, -.4); rival.root.rotation.y = -.25; rival.baseY = .86; world.add(rival.root); actors.rival = rival;
  crowd = makeCrowd(L.crowd); world.add(crowd.group); actors.crowd = crowd;
  return L;
}
function stageIdle(t, dt, energy) {
  const bpm = curLevel ? curLevel.bpm : 100, beat = t * bpm / 60;
  if (actors.goose) animateGoose(actors.goose, t, beat, dt, { energy });
  if (actors.rival) animateRival(actors.rival, t, beat, dt, energy);
  if (crowd) crowd.update(t, beat, energy * .8);
  if (venue) venueFx(t, beat, energy);
}
function venueFx(t, beat, energy, turn) {
  const flash = Math.max(0, Math.sin(beat * Math.PI));
  venue.neon.forEach((m, i) => { m.material.emissiveIntensity = .5 + .9 * Math.max(0, Math.sin(beat * Math.PI + i * .7)); });
  venue.flames.forEach((f, i) => { f.scale.set(1 + Math.sin(t * 9 + i) * .12, 1 + Math.sin(t * 11 + i * 2) * .25, 1 + Math.sin(t * 8) * .1); });
  venue.extra.forEach(c => { c.rotation.y = t * .4; });
  const gOn = turn === "goose" ? 1 : turn === "rival" ? .25 : .6, rOn = turn === "rival" ? 1 : turn === "goose" ? .25 : .6;
  venue.beams[0].material.opacity = .14 * gOn + .04 * flash; venue.beams[1].material.opacity = .14 * rOn + .04 * flash;
  lights.spotG.intensity = 18 * gOn; lights.spotR.intensity = 18 * rOn;
  lights.spotG.position.set(-3, 9, 5); lights.spotG.target.position.set(-3, 1.4, .2); lights.spotR.position.set(3.2, 9, 5); lights.spotR.target.position.set(3.2, 1.4, -.4);
}

/* ====================== the battle ====================== */
const LANES = 3, LANE_X = [-.62, 0, .62], LANE_COL = ["#ff6b8b", "#ffd23f", "#4fd1ff"], TRAVEL = 1.6, HW_SPEED = 2.3, PHRASE_BEATS = 16, PHRASES = 8, LEAD_BEATS = 4;
const highway = new THREE.Group(); highway.position.set(0, -1.25, -3.1); highway.rotation.x = .55; camera.add(highway); highway.visible = false; hwRef = highway; resize();
const hwMats = { plane: new THREE.MeshBasicMaterial({ color: "#1a1138", transparent: true, opacity: .42, depthTest: false }), line: new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: .35, depthTest: false }) };
const hwPlane = new THREE.Mesh(new THREE.PlaneGeometry(LANES * .62 + .26, TRAVEL * HW_SPEED + .6), hwMats.plane); hwPlane.rotation.x = -Math.PI / 2; hwPlane.position.set(0, -.02, -TRAVEL * HW_SPEED / 2 + .2); hwPlane.renderOrder = 1; highway.add(hwPlane);
for (let l = 0; l < LANES; l++) { const m = new THREE.Mesh(new THREE.RingGeometry(.19, .25, 28), new THREE.MeshBasicMaterial({ color: LANE_COL[l], transparent: true, opacity: .95, depthTest: false })); m.rotation.x = -Math.PI / 2; m.position.set(LANE_X[l], 0, 0); m.renderOrder = 3; highway.add(m); hwMats["ring" + l] = m; const sep = new THREE.Mesh(new THREE.PlaneGeometry(.025, TRAVEL * HW_SPEED + .6), hwMats.line); sep.rotation.x = -Math.PI / 2; sep.position.set(LANE_X[l] + .31, -.01, -TRAVEL * HW_SPEED / 2 + .2); sep.renderOrder = 2; highway.add(sep); }
const noteGeo = new THREE.CylinderGeometry(.18, .18, .1, 22);
const noteMats = { solid: LANE_COL.map(c => new THREE.MeshBasicMaterial({ color: c, depthTest: false })), ghost: LANE_COL.map(c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .45, depthTest: false })), dead: new THREE.MeshBasicMaterial({ color: "#666", transparent: true, opacity: .35, depthTest: false }) };
let battle = null;

function makePattern(rng, L) {
  const notes = []; let lane = Math.floor(rng() * LANES), run = 0;
  for (let s = 0; s < 30; s++) {
    const p = L.density * (s % 2 === 0 ? 1.12 : .72); if (rng() > p) continue;
    let next = rng() < .55 ? clamp(lane + (rng() < .5 ? -1 : 1), 0, LANES - 1) : Math.floor(rng() * LANES); if (next === lane) run++; else run = 0; if (run >= 2) { next = (next + 1 + Math.floor(rng() * 2)) % LANES; run = 0; }
    lane = next; notes.push({ beat: s * .5, lane });
  }
  return notes;
}
function buildBattle(i, attempt) {
  const L = LEVELS[i], spb = 60 / L.bpm, rng = rngFrom(i * 977 + attempt * 131 + 7), notes = [];
  const t0 = clock + LEAD_BEATS * spb + .4;
  for (let k = 0; k < PHRASES / 2; k++) {
    const base = makePattern(rng, L);
    for (const owner of ["rival", "goose"]) {
      const p = k * 2 + (owner === "rival" ? 0 : 1);
      const pat = owner === "rival" ? base : base.map(n => rng() < L.vary ? { beat: n.beat, lane: (n.lane + 1 + Math.floor(rng() * 2)) % LANES } : n);
      for (const n of pat) { const bar = Math.floor((p * PHRASE_BEATS + n.beat) / 4); const deg = (n.lane * 2 + bar) % L.scale.length; notes.push({ t: t0 + (p * PHRASE_BEATS + n.beat) * spb, lane: n.lane, phrase: p, owner, hit: false, judged: false, rivalHit: owner === "rival" ? rng() < L.acc : false, played: false, mesh: null, pitch: L.root + 24 + L.scale[deg] + (n.lane === 2 ? 12 : 0), done: false }); }
    }
  }
  notes.sort((a, b) => a.t - b.t);
  const perSide = notes.filter(n => n.owner === "goose").length;
  return { i, L, spb, t0, notes, step: 0, nextStep: 0, score: { goose: 0, rival: 0 }, combo: 0, maxCombo: 0, hits: { perfect: 0, good: 0, miss: 0 }, phrase: -1, perSide, over: false, endAt: t0 + PHRASES * PHRASE_BEATS * spb + 1.2, meter: 50, counted: -1 };
}
function startBattle(i, attempt = 0) {
  state.mode = "battle"; state.attempt = attempt; document.body.classList.add("inbattle"); document.body.classList.remove("paused"); showScreen(null); $("hud").hidden = false; showBars(false); $("touch").hidden = !isTouch();
  buildLevelWorld(i); battle = buildBattle(i, attempt); highway.visible = true;
  $("rivalName").textContent = battle.L.rival.toUpperCase(); $("levelName").textContent = `LEVEL ${i + 1}  ${battle.L.name.toUpperCase()}  (${battle.L.genre})`;
  $("rivalScore").textContent = "0"; $("gooseScore").textContent = "0"; $("meterFill").style.width = "50%"; $("combo").hidden = true; $("phaseBanner").hidden = true;
  if (sfx.ensure()) { }
  say(null, null);
}
function judgeText(txt, color) { const el = $("judge"); el.textContent = txt; el.style.color = color; el.classList.remove("show"); void el.offsetWidth; el.classList.add("show"); }
function setBanner(listen) { const b = $("phaseBanner"); b.hidden = false; b.className = listen ? "listen" : "play"; b.textContent = listen ? "LISTEN" : "YOUR TURN"; hwMats.plane.color.set(listen ? "#3a1030" : "#2a2060"); }
function updateScores() { $("rivalScore").textContent = Math.round(battle.score.rival); $("gooseScore").textContent = Math.round(battle.score.goose); const g = battle.score.goose, r = battle.score.rival, scale = Math.max(250, battle.perSide * 100 * .25); battle.meter = clamp(50 + 50 * (g - r) / scale, 4, 96); $("meterFill").style.width = battle.meter + "%"; }
function pressLane(l) {
  if (!battle || state.mode !== "battle" || battle.over) return;
  const down = document.querySelector(`#touch [data-lane="${l}"]`); if (down) { down.classList.add("down"); setTimeout(() => down.classList.remove("down"), 90); }
  const ph = battle.phrase, isGoose = ph >= 0 && ph % 2 === 1;
  let best = null, bd = 1;
  for (const n of battle.notes) { if (n.owner !== "goose" || n.judged || n.lane !== l) continue; const d = Math.abs(n.t - clock); if (d < bd && d <= .16) { bd = d; best = n; } if (n.t - clock > .3) break; }
  const L = battle.L, g = actors.goose; g.hit = 1;
  if (best) {
    best.judged = true; const perfect = bd <= .07, good = bd <= .13;
    if (perfect || good) { best.hit = true; battle.combo++; battle.maxCombo = Math.max(battle.maxCombo, battle.combo); const mult = 1 + Math.min(.5, Math.floor(battle.combo / 8) * .1); battle.score.goose += (perfect ? 100 : 60) * mult; battle.hits[perfect ? "perfect" : "good"]++; judgeText(perfect ? "PERFECT!" : "GOOD", perfect ? "#ffd23f" : "#9be7ff"); }
    else { battle.combo = 0; battle.hits.miss++; judgeText("OFF BEAT", "#ff8fa8"); }
    if (sfx.ensure()) sfx.honk(sfx.ctx.currentTime, midi(best.pitch), .22);
    popNote(best);
  } else {
    if (isGoose || (ph === 0 && false)) { battle.combo = 0; battle.score.goose = Math.max(0, battle.score.goose - 15); judgeText("OOPS", "#ff8fa8"); }
    if (sfx.ensure()) sfx.honk(sfx.ctx.currentTime, midi(L.root + 24 + L.scale[l * 2 % L.scale.length] + (l === 2 ? 12 : 0)), .18, .7);
  }
  updateScores(); const c = $("combo"); c.hidden = battle.combo < 3; c.firstChild.textContent = battle.combo;
}
function popNote(n) { if (n.mesh) { n.mesh.userData.pop = 1; } }
function noteMesh(n) {
  const rival = n.owner === "rival", m = new THREE.Mesh(noteGeo, rival ? noteMats.ghost[n.lane] : noteMats.solid[n.lane]); m.renderOrder = 4; m.position.x = LANE_X[n.lane]; highway.add(m); return m;
}
function updateBattle(dt) {
  const b = battle; if (!b) return; const L = b.L, spb = b.spb, beatNow = (clock - b.t0) / spb;
  // countdown
  const cd = $("count");
  if (clock < b.t0) { const left = Math.ceil((b.t0 - clock) / spb); cd.hidden = false; const txt = left > 3 ? "" : String(left); if (cd.textContent !== txt) { cd.textContent = txt; if (txt && sfx.ensure()) sfx.click(sfx.at(clock), left === 1); } } else if (!cd.hidden) { cd.textContent = "HONK!"; if (clock > b.t0 + spb) cd.hidden = true; }
  // backing track
  if (sfx.ensure()) scheduleBacking(b);
  // phrase changes
  const phrase = clock < b.t0 ? -1 : Math.min(PHRASES - 1, Math.floor(beatNow / PHRASE_BEATS));
  if (phrase !== b.phrase && !b.over) { b.phrase = phrase; if (phrase >= 0) { setBanner(phrase % 2 === 0); $("hud").dataset.turn = phrase % 2 === 0 ? "rival" : "goose"; } }
  const turn = b.phrase < 0 ? null : b.phrase % 2 === 0 ? "rival" : "goose";
  // notes
  for (const n of b.notes) {
    if (n.done) continue; const dtn = n.t - clock;
    if (!n.mesh && dtn < TRAVEL + .1) n.mesh = noteMesh(n);
    if (n.mesh) {
      n.mesh.position.z = -dtn * HW_SPEED; const pop = n.mesh.userData.pop || 0; if (pop) { n.mesh.userData.pop = Math.max(0, pop - dt * 6); n.mesh.scale.setScalar(1 + (1 - pop) * 1.2); if (n.mesh.userData.pop === 0) { highway.remove(n.mesh); n.done = true; continue; } }
    }
    if (n.owner === "rival") {
      if (!n.played && dtn <= 0) { n.played = true; if (n.rivalHit) { b.score.rival += 100; actors.rival.hit = 1; if (n.mesh) { n.mesh.userData.pop = 1; } } else if (n.mesh) { n.mesh.material = noteMats.dead; } updateScores(); }
      if (dtn < -.35) { if (n.mesh) highway.remove(n.mesh); n.done = true; }
    } else {
      if (!n.judged && dtn < -.13) { n.judged = true; b.combo = 0; b.hits.miss++; if (n.mesh) n.mesh.material = noteMats.dead; judgeText("MISS", "#ff8fa8"); updateScores(); }
      if (n.judged && !n.hit && dtn < -.4) { if (n.mesh) highway.remove(n.mesh); n.done = true; }
    }
  }
  // autoplay for tests
  if (state.auto) for (const n of b.notes) { if (n.owner === "goose" && !n.judged && n.t - clock <= .005 && n.t - clock > -.1) pressLane(n.lane); }
  // pose the stage
  const e = clamp(.35 + b.meter / 160, .35, 1), beat = (clock) * L.bpm / 60;
  animateGoose(actors.goose, clock, beat, dt, { energy: turn === "goose" ? .9 : .4 }); animateRival(actors.rival, clock, beat, dt, turn === "rival" ? .9 : .4);
  crowd.update(clock, beat, e); venueFx(clock, beat, e, turn);
  // camera: drift to whoever is performing
  const fx = turn === "rival" ? 1.7 : turn === "goose" ? -1.7 : 0, wide = innerWidth / innerHeight < 1 ? 5 : 0;
  const tgt = new THREE.Vector3(fx * .9, 3.3, 11.2 + wide), look = new THREE.Vector3(fx * .5, 2.6, 0);
  camera.position.lerp(tgt, 1 - Math.pow(.02, dt)); const lk = state.lookAt || (state.lookAt = look.clone()); lk.lerp(look, 1 - Math.pow(.02, dt)); camera.lookAt(lk);
  camera.fov = 52 + Math.max(0, Math.sin(beat * Math.PI)) * .6 + (innerWidth / innerHeight < 1 ? 14 : 0); camera.updateProjectionMatrix();
  // end
  if (!b.over && clock >= b.endAt) finishBattle();
}
function scheduleBacking(b) {
  const L = b.L, stepDur = b.spb / 4, ahead = clock + .3; const kick = L.drums.kick, snare = L.drums.snare, hat = L.drums.hat;
  while (true) {
    const i = b.nextStep, swingShift = (i % 4 === 2 ? L.swing * stepDur : 0), tGame = b.t0 - LEAD_BEATS * b.spb + i * stepDur + swingShift; if (tGame > ahead) break; b.nextStep++;
    if (tGame < clock - .1) continue; const t = sfx.at(tGame);
    const j = i - LEAD_BEATS * 4;                       // steps since the first beat of the battle
    if (j < 0) { if (i % 4 === 0) sfx.hat(t, .8); continue; }
    const s16 = j % 16, bar = Math.floor(j / 16), chord = bar % 4;
    if (kick[s16] === "1") sfx.kick(t); if (snare[s16] === "1") sfx.snare(t); if (hat[s16] === "1") sfx.hat(t, i % 8 === 2 ? 1 : .6);
    if (bar % 4 === 3 && s16 >= 12 && L.id !== "pond") sfx.snare(t, .5);
    const deg = L.bass[s16]; if (deg >= 0) sfx.bass(t, midi(L.root + L.chordRoots[chord] + deg), stepDur * (L.bassKind === "pump" ? 1.6 : 3), L.bassKind);
    if (s16 === 0 || (s16 === 8 && L.id !== "neon")) sfx.chord(t, L.chordQual[chord].map(x => L.root + 12 + L.chordRoots[chord] + x), stepDur * 7, L.id === "quarry" ? "sawtooth" : L.id === "neon" ? "sawtooth" : "triangle");
  }
  // rival lead voice, scheduled just ahead of its note
  for (const n of b.notes) { if (n.owner !== "rival" || n.sched) continue; if (n.t - clock > .3) break; n.sched = true; if (n.rivalHit && n.t >= clock - .05) sfx.lead(L.voice, sfx.at(n.t), midi(n.pitch), b.spb * .45); }
}
function finishBattle() {
  const b = battle; b.over = true; document.body.classList.remove("inbattle", "paused"); highway.visible = false; $("hud").hidden = true; $("touch").hidden = true; $("combo").hidden = true;
  const g = Math.round(b.score.goose), r = Math.round(b.score.rival), won = g > r, total = b.hits.perfect + b.hits.good + b.hits.miss, acc = total ? (b.hits.perfect + b.hits.good * .6) / total : 0;
  let stars = 0; if (won) { stars = 1; if (g >= r * 1.05) stars = 2; if (g >= r * 1.2 && acc >= .85) stars = 3; }
  const res = { won, g, r, stars, acc, maxCombo: b.maxCombo, hits: b.hits, level: b.i };
  if (won) { save.unlocked = Math.max(save.unlocked, Math.min(5, b.i + 2)); save.stars[b.i] = Math.max(save.stars[b.i] || 0, stars); save.best[b.i] = Math.max(save.best[b.i] || 0, g); persist(); const sum = Object.values(save.best).reduce((a, v) => a + v, 0); try { window.DHScores && DHScores.submit("goose-gig", sum, { now: true }); } catch (_) {} }
  // reset the camera shot and play the outro before the result screen
  buildLevelWorld(b.i); camera.fov = 52; camera.updateProjectionMatrix();
  runCutscene(levelOutroScript(b.L, won), () => showResult(res));
}
function showResult(res) {
  state.mode = "result"; const L = LEVELS[res.level], last = res.won && res.level === 4;
  $("resultTitle").textContent = res.won ? (res.stars === 3 ? "Perfect Show!" : "You won the crowd!") : "The crowd wasn't feeling it";
  $("resultStars").innerHTML = [1, 2, 3].map(n => n <= res.stars ? "&#9733;" : "<i>&#9733;</i>").join("");
  $("resultStats").innerHTML = `<div>You: <b>${res.g}</b></div><div>${L.rival}: <b>${res.r}</b></div><div>Accuracy: <b>${Math.round(res.acc * 100)}%</b></div><div>Best combo: <b>${res.maxCombo}</b></div>`;
  $("resultLine").textContent = res.won ? (last ? "You beat the Maestro. The theater is on its feet..." : `Next up: ${LEVELS[res.level + 1].name}.`) : "Listen to the rival's phrase, then play it back as the notes reach the glowing line.";
  const btns = $("resultBtns"); btns.innerHTML = "";
  const add = (txt, cls, fn) => { const b = document.createElement("button"); b.className = "btn " + cls; b.type = "button"; b.textContent = txt; b.addEventListener("click", fn); btns.appendChild(b); };
  if (res.won) { if (last) add("Watch the ending", "", () => { showScreen(null); buildLevelWorld(4); runCutscene(finaleScript(), () => { save.seenFinale = true; persist(); showScreen("title"); toTitleWorld(); }); }); else add("Next level", "", () => playLevel(res.level + 1)); }
  add("Retry", res.won ? "alt" : "", () => playLevel(res.level, true)); add("Level select", "alt", () => { showScreen("levels"); renderLevels(); toTitleWorld(); });
  showScreen("result");
}

/* ====================== menus & flow ====================== */
const state = { mode: "title", attempt: 0, auto: false };
const SCREENS = ["title", "how", "levels", "pause", "result"];
function showScreen(name) { for (const s of SCREENS) $(s).hidden = s !== name; }
function isTouch() { return matchMedia("(pointer:coarse)").matches || "ontouchstart" in window; }
function renderLevels() {
  $("cards").innerHTML = LEVELS.map((L, i) => { const locked = i >= save.unlocked, st = save.stars[i] || 0; return `<button class="card ${locked ? "locked" : ""}" data-level="${i}" ${locked ? "disabled" : ""}><span class="num">LEVEL ${i + 1}</span><h3>${L.name}</h3><span class="meta">${L.genre} &middot; ${L.bpm} BPM</span><span class="rival">vs ${L.rival}</span><span class="stars">${[1, 2, 3].map(n => n <= st ? "&#9733;" : "<i>&#9733;</i>").join("")}</span>${locked ? '<span class="meta">Beat the previous level to unlock</span>' : save.best[i] ? `<span class="meta">Best: ${save.best[i]}</span>` : ""}</button>`; }).join("");
  document.querySelectorAll("#cards .card:not(.locked)").forEach(c => c.addEventListener("click", () => playLevel(Number(c.dataset.level))));
}
function playLevel(i, retry = false) {
  sfx.ensure(); const attempt = retry ? state.attempt + 1 : 0;
  buildLevelWorld(i);
  if (retry) return startBattle(i, attempt);
  runCutscene(levelIntroScript(LEVELS[i], i), () => startBattle(i, attempt));
}
function toTitleWorld() {
  state.mode = "title"; clearWorld(); buildLevelWorld(0); highway.visible = false; $("hud").hidden = true; $("touch").hidden = true; showBars(false);
  camera.fov = 52; camera.updateProjectionMatrix(); updateDadCounter(); $("rewatchEndBtn").hidden = !save.seenFinale;
}
function updateDadCounter() {
  const el = $("dadCounter"); if (!save.dadLeftAt) { el.hidden = true; return; }
  const days = Math.max(0, Math.floor((Date.now() - save.dadLeftAt) / 86400000)); el.hidden = false; el.textContent = `Days since Dad went out for milk: ${days}`;
}
function startGame() {
  sfx.ensure();
  if (!save.seenIntro) {
    clearWorld(); buildNestScene(); highway.visible = false;
    runCutscene(openingScript(), () => { save.seenIntro = true; save.dadLeftAt = Date.now(); persist(); toTitleWorld(); showScreen("levels"); renderLevels(); });
  } else { showScreen("levels"); renderLevels(); }
}
function pause(on) {
  if (state.mode !== "battle" || !battle || battle.over) return;
  state.paused = on; document.body.classList.toggle("paused", on); showScreen(on ? "pause" : null); if (sfx.ctx) on ? sfx.ctx.suspend() : sfx.ctx.resume();
}

/* ====================== input ====================== */
const KEYS = { KeyA: 0, ArrowLeft: 0, KeyJ: 0, KeyS: 1, ArrowDown: 1, KeyK: 1, KeyD: 2, ArrowRight: 2, KeyL: 2 };
addEventListener("keydown", e => {
  if (e.repeat) return;
  if (state.mode === "cutscene" && (e.code === "Space" || e.code === "Enter")) { e.preventDefault(); advance(); return; }
  if (e.code === "Escape" || e.code === "KeyP") { if (state.mode === "battle") { pause(!state.paused); } return; }
  if (state.mode === "battle" && !state.paused && e.code in KEYS) { e.preventDefault(); pressLane(KEYS[e.code]); }
});
document.querySelectorAll("#touch button").forEach(b => b.addEventListener("pointerdown", e => { e.preventDefault(); if (state.mode === "battle" && !state.paused) pressLane(Number(b.dataset.lane)); }));
$("subtitle").addEventListener("click", advance);
canvas.addEventListener("pointerdown", () => { if (state.mode === "cutscene") advance(); });
$("skipCut").addEventListener("click", () => { if (cut) { cut.i = cut.script.length; endCutscene(); } });
$("playBtn").addEventListener("click", startGame);
$("levelsBtn").addEventListener("click", () => { sfx.ensure(); showScreen("levels"); renderLevels(); });
$("levelsBack").addEventListener("click", () => showScreen("title"));
function rewatch(kind) {
  sfx.ensure(); highway.visible = false; battle = null; document.body.classList.remove("inbattle", "paused");
  if (kind === "opening") { clearWorld(); buildNestScene(); runCutscene(openingScript(), () => { toTitleWorld(); showScreen("title"); }); }
  else { buildLevelWorld(4); runCutscene(finaleScript(), () => { toTitleWorld(); showScreen("title"); }); }
}
$("rewatchBtn").addEventListener("click", () => rewatch("opening")); $("rewatchEndBtn").addEventListener("click", () => rewatch("ending"));
$("howBtn").addEventListener("click", () => showScreen("how")); $("howBack").addEventListener("click", () => showScreen("title"));
$("pauseBtn").addEventListener("click", () => pause(true)); $("resumeBtn").addEventListener("click", () => pause(false));
$("retryBtn").addEventListener("click", () => { state.paused = false; document.body.classList.remove("paused"); if (sfx.ctx) sfx.ctx.resume(); playLevel(battle.i, true); });
$("quitBtn").addEventListener("click", () => { state.paused = false; battle = null; document.body.classList.remove("inbattle", "paused"); if (sfx.ctx) sfx.ctx.resume(); highway.visible = false; $("hud").hidden = true; $("touch").hidden = true; toTitleWorld(); showScreen("levels"); renderLevels(); });
const soundBtn = $("sound");
function syncSound() { soundBtn.textContent = save.muted ? "Sound off" : "Sound on"; soundBtn.setAttribute("aria-pressed", String(save.muted)); }
soundBtn.addEventListener("click", () => { if (FORCE_MUTE) return; save.muted = !save.muted; persist(); syncSound(); if (!save.muted) sfx.ensure(); else if (sfx.ctx) sfx.ctx.suspend(); });
document.addEventListener("visibilitychange", () => { if (document.hidden && state.mode === "battle" && !state.paused) pause(true); });

/* ====================== main loop ====================== */
let last = performance.now();
function step(dt, now) {
  if (!state.paused) clock += dt * SPEED;
  if (state.mode === "cutscene") updateCutscene(dt);
  else if (state.mode === "battle" && !state.paused) updateBattle(dt * SPEED);
  else if (state.mode === "title" || state.mode === "result") {
    const t = now / 1000; camera.position.set(Math.sin(t * .12) * 9, 4.2, 15 + Math.cos(t * .1) * 2); camera.lookAt(0, 2.2, 0); stageIdle(t, dt, .45);
  }
}
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  step(dt, now); renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
syncSound(); toTitleWorld(); showScreen("title"); requestAnimationFrame(frame);
/* test hooks (also handy for debugging) */
window.__gig = { state, save, get battle() { return battle; }, get clock() { return clock; }, LEVELS, playLevel, startBattle, pressLane, skipCutscene() { if (cut) { cut.i = cut.script.length; endCutscene(); } }, advance, speaking() { return !!(cut && cut.speaking); }, advanceTime(sec) { const n = Math.max(1, Math.round(sec / .033)); for (let i = 0; i < n; i++) step(.033, performance.now()); renderer.render(scene, camera); }, jumpShot(i) { if (cut) { cut.i = i - 1; nextShot(); } }, runFinale() { buildLevelWorld(4); runCutscene(finaleScript(), () => toTitleWorld()); }, runOpening() { clearWorld(); buildNestScene(); runCutscene(openingScript(), () => toTitleWorld()); }, get cut() { return cut; }, scene, camera, renderer };
