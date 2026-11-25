/* Fix-It Crew: Builder Bo and the machine buddies.
   An original 3D building game. Eight jobs around town: fix a fence, build a wall, dig a pond, pave a path,
   pour a foundation, paint a playhouse, raise a treehouse and open the Town Hall. Drawn with three.js, sounds synthesized live. */
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const $ = id => document.getElementById(id);
const INK = "#3a2410";
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const params = new URLSearchParams(location.search);
const FORCE_MUTE = params.get("mute") === "1";

/* ====================== save ====================== */
const SAVE_KEY = "dh-fix-it-crew-v1";
let save = { v: 2, unlocked: 1, stars: {}, best: {}, muted: false, coins: 0, earned: 0, hat: "hard", hats: ["hard"], ach: {}, vol: .35 };
try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (_) {}
if (!save.v || save.v < 2) { /* v2 added eight new jobs before the Town Hall, so the Town Hall moved to the end */
  const HALL_OLD = 7, HALL_NEW = 15; if (save.stars && save.stars[HALL_OLD]) { save.stars[HALL_NEW] = save.stars[HALL_OLD]; delete save.stars[HALL_OLD]; } if (save.best && save.best[HALL_OLD]) { save.best[HALL_NEW] = save.best[HALL_OLD]; delete save.best[HALL_OLD]; }
  save.unlocked = save.unlocked >= 8 ? (save.stars[HALL_NEW] ? 16 : 15) : save.unlocked; save.v = 2;
}
save.hats = save.hats || ["hard"]; save.ach = save.ach || {}; save.coins = save.coins || 0; save.earned = save.earned || 0; save.hat = save.hat || "hard"; if (typeof save.vol !== "number") save.vol = .35;
if (FORCE_MUTE) save.muted = true;
if (params.get("unlock")) save.unlocked = clamp(Number(params.get("unlock")) || 1, 1, 99);
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} };

/* ====================== sound ====================== */
let actx = null;
function tone(f, dur, type = "sine", vol = .1, slide) {
  if (save.muted || FORCE_MUTE) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime; o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + .05);
  } catch (_) {}
}
const sfx = {
  pick: () => { if (!playFile("toggle", .5)) tone(660, .08, "triangle", .08, 990); }, place: () => { const n = "placement-" + "abcd"[Math.floor(Math.random() * 4)]; if (!playFile(n, .7)) { tone(160, .12, "square", .09, 90); setTimeout(() => tone(240, .08, "triangle", .06), 60); } },
  dig: () => { if (!playFile("removal-a", .7)) tone(120, .25, "sawtooth", .07, 60); }, ding: () => { tone(988, .3, "sine", .1); setTimeout(() => tone(1319, .4, "sine", .09), 110); },
  fan: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, .35, "triangle", .1), i * 130)), hop: () => tone(420, .1, "triangle", .08, 700),
  honk: () => tone(280, .18, "square", .05, 220), tip: () => tone(100, .5, "sawtooth", .06, 50)
};

/* open-source sounds (Kenney, CC0) and music (Juhani Junkala, CC0) */
const SFXDIR = "fixit/sounds/", MUSICDIR = "../app/assets/music/";
const sfxFiles = {}; for (const n of ["placement-a", "placement-b", "placement-c", "placement-d", "removal-a", "rotate", "toggle"]) { try { const a = new Audio(SFXDIR + n + ".ogg"); a.preload = "auto"; sfxFiles[n] = a; } catch (_) {} }
function playFile(n, vol = .6) { if (save.muted || FORCE_MUTE) return false; const a = sfxFiles[n]; if (!a) return false; try { const c = a.cloneNode(); c.volume = vol; c.play().catch(() => {}); return true; } catch (_) { return false; } }
const TRACKS = { menu: "calm_home", town: "calm_sand", jobs: ["calm_peaceful", "calm_innocence", "calm_sand", "calm_home"] };
let bgm = null, bgmName = "", fadeT = null;
function setBgmVolume(v) { if (bgm) bgm.volume = clamp(v, 0, 1); }
function stopMusic() { const a = bgm; bgm = null; bgmName = ""; if (!a) return; let v = a.volume; const t = setInterval(() => { v -= .05; if (v <= 0) { clearInterval(t); try { a.pause(); } catch (_) {} } else a.volume = v; }, 60); }
function playMusic(name) {
  if (save.muted || FORCE_MUTE || !name) return; if (bgm && bgmName === name) return; stopMusic();
  try { const a = new Audio(MUSICDIR + name + ".ogg"); a.loop = true; a.volume = 0; bgm = a; bgmName = name; a.play().catch(() => {}); let v = 0; clearInterval(fadeT); fadeT = setInterval(() => { v += .03; if (!bgm || bgm !== a || v >= save.vol) { clearInterval(fadeT); if (bgm === a) a.volume = save.vol; } else a.volume = v; }, 80); } catch (_) {}
}

/* ====================== toon look ====================== */
const toonRamp = (() => { const t = new THREE.DataTexture(new Uint8Array([120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; })();
const toonCache = new Map(), smoothCache = new Map();
function toonMat(m) {
  if (!m || m.isMeshToonMaterial || m.isMeshBasicMaterial) return m; if (toonCache.has(m.uuid)) return toonCache.get(m.uuid);
  const t = new THREE.MeshToonMaterial({ color: m.color ? m.color.clone() : 0xffffff, map: m.map || null, gradientMap: toonRamp, transparent: m.transparent, opacity: m.opacity, side: m.side, emissive: m.emissive ? m.emissive.clone() : 0x000000 }); toonCache.set(m.uuid, t); return t;
}
const outlineMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
outlineMat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace("#include <project_vertex>", `#include <project_vertex>
  vec4 dhN = projectionMatrix * vec4(normalize(normalMatrix * normal), 0.0); vec2 dhDir = normalize(dhN.xy + vec2(1e-5)); dhDir.x *= projectionMatrix[0][0] / projectionMatrix[1][1]; gl_Position.xy += dhDir * 0.0036 * gl_Position.w;`); };
function smoothGeo(g) { if (smoothCache.has(g.uuid)) return smoothCache.get(g.uuid); let s = new THREE.BufferGeometry(); s.setAttribute("position", g.getAttribute("position")); if (g.index) s.setIndex(g.index); s = mergeVertices(s, 1e-3); s.computeVertexNormals(); smoothCache.set(g.uuid, s); return s; }
const NO_OUTLINE = new Set(["PlaneGeometry", "CircleGeometry", "RingGeometry"]);
function toonify(obj, outline = true) {
  const list = []; obj.traverse(o => { if (o.isMesh && !o.userData.toon && !o.userData.isOutline) list.push(o); });
  for (const o of list) {
    o.userData.toon = true; o.material = Array.isArray(o.material) ? o.material.map(toonMat) : toonMat(o.material); o.castShadow = true; o.receiveShadow = true;
    const tr = [].concat(o.material).some(m => m.transparent && m.opacity < 1);
    if (!outline || tr || o.userData.noOutline || NO_OUTLINE.has(o.geometry.type)) continue;
    const line = new THREE.Mesh(smoothGeo(o.geometry), outlineMat); line.userData.isOutline = true; line.raycast = () => {}; o.add(line);
  }
  return obj;
}
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .7, ...o });
const GEO = { box: (w, h, d) => new THREE.BoxGeometry(w, h, d), sph: r => new THREE.SphereGeometry(r, 18, 12), cyl: (a, b, h, s = 14) => new THREE.CylinderGeometry(a, b, h, s), cone: (r, h, s = 14) => new THREE.ConeGeometry(r, h, s), tor: (r, t) => new THREE.TorusGeometry(r, t, 8, 20) };
function M(geo, color, pos = [0, 0, 0], scl = [1, 1, 1], rot = [0, 0, 0]) { const m = new THREE.Mesh(geo, mat(color)); m.position.set(...pos); m.scale.set(...scl); m.rotation.set(...rot); return m; }
function grp(...kids) { const g = new THREE.Group(); kids.forEach(k => g.add(k)); return g; }

/* ====================== renderer / scene ====================== */
const canvas = $("view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, 1, .1, 400);
const hemi = new THREE.HemisphereLight(0xffffff, 0x9bd27a, 1.15); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d0, 1.6); sun.position.set(18, 30, 14); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 90 }); sun.shadow.bias = -.0006; scene.add(sun);
let world = new THREE.Group(); scene.add(world);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < .8 ? 62 : 48; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();

/* ====================== open-source 3D models (Kenney, CC0) ====================== */
const MODEL = {}, loader = new GLTFLoader();
const MODEL_LIST = ["building-small-a", "building-small-b", "building-small-c", "building-small-d", "building-garage", "grass-trees", "grass-trees-tall", "pavement-fountain", "pavement", "road-straight", "road-straight-lightposts", "road-corner", "road-intersection", "p-cloud", "p-flag", "p-coin", "p-brick", "p-grass-small"];
const RACING_LIST = ["vehicle-truck-green", "vehicle-truck-yellow", "vehicle-truck-red", "vehicle-truck-purple", "decoration-forest", "decoration-tents"];
function loadModel(path, key) { return new Promise(res => loader.load(path, g => { g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); MODEL[key] = g.scene; res(); }, undefined, () => res())); }
const modelsReady = Promise.all([...MODEL_LIST.map(n => loadModel("fixit/models/" + n + ".glb", n)), ...RACING_LIST.map(n => loadModel("fixit/models/racing/" + n + ".glb", n))]);
function kenney(name, scale = 1, shade = true) {
  const src = MODEL[name]; if (!src) return null; const c = src.clone(true); c.scale.setScalar(scale);
  c.traverse(o => { if (o.isMesh) { o.material = shade ? toonMat(o.material) : o.material; o.castShadow = true; o.receiveShadow = true; } }); return c;
}
let modelsLoaded = false; modelsReady.then(() => { modelsLoaded = true; try { if (!G) rebuildTitleBackdrop(); } catch (_) {} });

/* ====================== hats (shop) ====================== */
const HATS = [
  { id: "hard", name: "Hard hat", price: 0, dome: "#ffd23f", brim: "#ffc21f" }, { id: "red", name: "Red hard hat", price: 40, dome: "#e53935", brim: "#c62828" },
  { id: "blue", name: "Blue hard hat", price: 40, dome: "#3a8bff", brim: "#2a6fd6" }, { id: "green", name: "Green hard hat", price: 40, dome: "#4caf50", brim: "#388e3c" },
  { id: "pink", name: "Pink hard hat", price: 60, dome: "#ff8fb1", brim: "#ec6c97" }, { id: "white", name: "Foreman hat", price: 80, dome: "#ffffff", brim: "#dcdcdc" },
  { id: "cap", name: "Builder cap", price: 90, dome: "#3a5ba8", brim: "#2a4688" }, { id: "chef", name: "Chef hat", price: 140, dome: "#ffffff", brim: "#ffffff", extra: "chef" },
  { id: "party", name: "Party hat", price: 160, dome: "#ff6b8b", brim: "#ffd23f", extra: "party" }, { id: "wizard", name: "Wizard hat", price: 220, dome: "#7e57c2", brim: "#5e35b1", extra: "wizard" },
  { id: "crown", name: "Golden crown", price: 400, dome: "#ffd23f", brim: "#ffb000", extra: "crown" },
];
function applyHat(g) {
  const h = HATS.find(x => x.id === save.hat) || HATS[0], head = g.userData.head, dome = head.children[4], brim = head.children[5], lamp = head.children[6];
  dome.material.color.set(h.dome); brim.material.color.set(h.brim);
  if (h.extra === "chef") { dome.visible = false; brim.visible = false; lamp.visible = false; head.add(M(GEO.cyl(.5, .46, .5), "#ffffff", [0, .55, 0]), M(GEO.sph(.62), "#ffffff", [0, 1.0, 0], [1, .7, 1])); }
  else if (h.extra === "party") { dome.visible = false; brim.visible = false; lamp.visible = false; head.add(M(GEO.cone(.45, 1.1, 16), h.dome, [0, .95, 0]), M(GEO.sph(.12), h.brim, [0, 1.55, 0])); }
  else if (h.extra === "wizard") { dome.visible = false; lamp.visible = false; brim.scale.set(1.15, 1, 1.15); head.add(M(GEO.cone(.5, 1.5, 16), h.dome, [0, 1.0, 0]), M(GEO.sph(.1), "#ffd23f", [0, 1.8, 0])); }
  else if (h.extra === "crown") { dome.visible = false; brim.visible = false; lamp.visible = false; head.add(M(GEO.cyl(.5, .5, .3, 16), h.dome, [0, .55, 0])); for (let i = 0; i < 5; i++) head.add(M(GEO.cone(.1, .3, 6), h.dome, [Math.cos(i / 5 * 6.28) * .45, .85, Math.sin(i / 5 * 6.28) * .45])); head.add(M(GEO.sph(.09), "#e53935", [0, .7, .5])); }
  else if (h.id === "cap") { brim.scale.set(.6, 1, .9); brim.position.z = .45; lamp.visible = false; }
}

/* ====================== characters ====================== */
function makeBo() {
  const g = new THREE.Group(), skin = "#ffd2a6";
  const legL = grp(M(GEO.box(.34, .9, .38), "#3a5ba8", [0, -.45, 0]), M(GEO.box(.4, .22, .56), "#5b3a29", [0, -.95, .08])); legL.position.set(-.22, 1, 0);
  const legR = legL.clone(); legR.position.x = .22;
  const torso = M(GEO.cyl(.55, .6, 1.1), "#ff8a1f", [0, 1.65, 0]); const overall = M(GEO.cyl(.57, .62, .6), "#3a5ba8", [0, 1.35, 0]);
  const belt = M(GEO.box(1.3, .18, .8), "#8a5a2b", [0, 1.1, 0]); belt.scale.set(.9, 1, .9);
  const armL = grp(M(GEO.cyl(.15, .15, .8), "#ff8a1f", [0, -.4, 0]), M(GEO.sph(.19), skin, [0, -.85, 0])); armL.position.set(-.72, 2.05, 0);
  const armR = armL.clone(); armR.position.x = .72;
  const head = grp(M(GEO.sph(.52), skin), M(GEO.sph(.07), INK, [-.2, .06, .46]), M(GEO.sph(.07), INK, [.2, .06, .46]), M(GEO.sph(.12), "#ff9aa8", [0, -.12, .5], [1.4, .7, .5]),
    M(GEO.sph(.55, 18, 8), "#ffd23f", [0, .22, 0], [1, .85, 1]), M(GEO.cyl(.62, .62, .08), "#ffc21f", [0, .2, .12], [1, 1, 1.2]), M(GEO.box(.2, .1, .2), "#fff3a0", [0, .78, .02]));
  head.position.y = 2.65;
  const hat = head.children[4]; hat.geometry = new THREE.SphereGeometry(.55, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2); hat.position.set(0, .12, 0); hat.scale.set(1, 1, 1);
  g.add(legL, legR, overall, torso, belt, armL, armR, head); g.userData = { legL, legR, armL, armR, head };
  applyHat(g);
  toonify(g); return g;
}
function makeCritter(kind, col) {
  const g = new THREE.Group(), body = M(GEO.sph(.9), col, [0, 1.1, 0], [1, 1.05, 1.1]), head = M(GEO.sph(.62), col, [0, 2.25, .2]);
  g.add(body, head, M(GEO.sph(.09), INK, [-.24, 2.35, .74]), M(GEO.sph(.09), INK, [.24, 2.35, .74]), M(GEO.cyl(.2, .26, .5), "#5b3a29", [-.4, .25, 0]), M(GEO.cyl(.2, .26, .5), "#5b3a29", [.4, .25, 0]));
  if (kind === "pig") { g.add(M(GEO.cyl(.22, .24, .2), "#ff8fa3", [0, 2.15, .8], [1, 1, 1], [Math.PI / 2, 0, 0]), M(GEO.cone(.2, .4), col, [-.38, 2.78, .1], [1, 1, 1], [0, 0, .5]), M(GEO.cone(.2, .4), col, [.38, 2.78, .1], [1, 1, 1], [0, 0, -.5])); }
  else if (kind === "cow") { g.add(M(GEO.sph(.3), "#3a2e2a", [-.5, 1.4, .5]), M(GEO.sph(.26), "#3a2e2a", [.4, 1.0, -.6]), M(GEO.cone(.12, .4), "#f4e9d0", [-.4, 2.8, .2]), M(GEO.cone(.12, .4), "#f4e9d0", [.4, 2.8, .2]), M(GEO.cyl(.34, .38, .3), "#ffb3c1", [0, 2.1, .72], [1, 1, 1], [Math.PI / 2, 0, 0])); }
  else if (kind === "chicken") { g.add(M(GEO.cone(.16, .4), "#ff9800", [0, 2.2, .85], [1, 1, 1], [Math.PI / 2, 0, 0]), M(GEO.sph(.2), "#e53935", [0, 2.9, .2], [.5, 1, 1]), M(GEO.sph(.35), "#fff", [-.95, 1.2, 0], [.35, .9, 1.1]), M(GEO.sph(.35), "#fff", [.95, 1.2, 0], [.35, .9, 1.1])); }
  else if (kind === "duck") { g.add(M(GEO.box(.5, .14, .5), "#ff9800", [0, 2.12, .9]), M(GEO.sph(.35), col, [-.95, 1.2, 0], [.35, .9, 1.1]), M(GEO.sph(.35), col, [.95, 1.2, 0], [.35, .9, 1.1])); }
  else if (kind === "bear") { g.add(M(GEO.sph(.22), col, [-.45, 2.75, .1]), M(GEO.sph(.22), col, [.45, 2.75, .1]), M(GEO.sph(.28), "#e8c9a0", [0, 2.12, .6])); }
  else if (kind === "sheep") { for (let i = 0; i < 8; i++) g.add(M(GEO.sph(.5), "#fffaf0", [Math.cos(i) * .7, 1.1 + Math.sin(i * 2) * .3, Math.sin(i) * .7])); g.add(M(GEO.sph(.3), "#fffaf0", [0, 2.85, .1])); }
  toonify(g); return g;
}
function addFace(g, y, z, s = 1) {
  const eye = new THREE.Group(); for (const x of [-.32, .32]) { eye.add(M(GEO.sph(.26 * s), "#fff", [x * s, y, z])); eye.add(M(GEO.sph(.12 * s), INK, [x * s, y, z + .2 * s])); } const sm = M(GEO.tor(.2 * s, .035 * s), INK, [0, y - .3 * s, z + .05], [1, .6, 1], [0, 0, Math.PI]); sm.scale.set(1, .6, 1); eye.add(sm); g.add(eye);
}
function wheel(r = .5, w = .3) { const g = grp(M(GEO.cyl(r, r, w, 16), "#2b2b33", [0, 0, 0], [1, 1, 1], [0, 0, Math.PI / 2]), M(GEO.cyl(r * .5, r * .5, w + .04, 12), "#c9ced8", [0, 0, 0], [1, 1, 1], [0, 0, Math.PI / 2])); g.userData.wheel = true; return g; }
function makeVehicle(kind) {
  const g = new THREE.Group(), parts = {};
  if (kind === "digger") {
    g.add(M(GEO.box(2.6, .7, 3.8), "#3a3a44", [0, .45, 0]), M(GEO.box(2, .9, 2.4), "#ffc21f", [0, 1.2, .2]), M(GEO.box(1.7, 1.2, 1.5), "#ffd75e", [0, 2.1, .8]), M(GEO.box(1.4, .7, .1), "#bfe9f0", [0, 2.2, 1.57]));
    addFace(g, 2.2, 1.62, .55);
    const boom = new THREE.Group(); boom.position.set(0, 1.6, -.6); boom.add(M(GEO.box(.5, .5, 3.2), "#ffc21f", [0, 1, -1.4], [1, 1, 1], [-.5, 0, 0]));
    const arm = new THREE.Group(); arm.position.set(0, 2.2, -2.8); arm.add(M(GEO.box(.4, .4, 2.2), "#ffb000", [0, -.5, -.7], [1, 1, 1], [.9, 0, 0]));
    const bucket = M(GEO.box(1.2, .8, .9), "#8a8a96", [0, -1.5, -1.5]); arm.add(bucket); boom.add(arm); g.add(boom); parts.boom = boom; parts.arm = arm;
  } else if (kind === "mixer") {
    g.add(M(GEO.box(2.2, .6, 4.4), "#3a3a44", [0, .9, 0]), M(GEO.box(2, 1.5, 1.4), "#ff6b3a", [0, 1.9, 1.3]), M(GEO.box(1.7, .6, .1), "#bfe9f0", [0, 2.2, 2.02]));
    addFace(g, 1.9, 2.05, .5); const drum = grp(M(GEO.cyl(1.05, 1.05, 2.6, 18), "#f2f2f6", [0, 0, 0], [1, 1, 1], [Math.PI / 2, 0, 0]), M(GEO.cone(.9, 1, 14), "#ffd75e", [0, 0, -1.6], [1, 1, 1], [-Math.PI / 2, 0, 0]));
    for (let i = 0; i < 4; i++) drum.add(M(GEO.box(.18, .14, 2.3), "#ff6b3a", [Math.cos(i * 1.57) * 1.06, Math.sin(i * 1.57) * 1.06, 0], [1, 1, 1], [0, 0, i * 1.57])); drum.position.set(0, 2.1, -.9); drum.rotation.x = .15; g.add(drum); parts.drum = drum;
    for (const [x, z] of [[-1.15, 1.4], [1.15, 1.4], [-1.15, -1.3], [1.15, -1.3]]) { const w = wheel(.6, .4); w.position.set(x, .6, z); g.add(w); (parts.wheels = parts.wheels || []).push(w); }
  } else if (kind === "dumpy") {
    g.add(M(GEO.box(2.2, .6, 4.4), "#3a3a44", [0, .9, 0]), M(GEO.box(2, 1.5, 1.4), "#3a9a4a", [0, 1.9, 1.4]), M(GEO.box(1.7, .6, .1), "#bfe9f0", [0, 2.2, 2.12]));
    addFace(g, 1.9, 2.15, .5); const bed = new THREE.Group(); bed.position.set(0, 1.35, -1.9); bed.add(M(GEO.box(2.1, 1, 2.8), "#ffc21f", [0, .5, 1.3])); const load = M(GEO.cone(1.1, .8, 8), "#9a8a6a", [0, 1.15, 1.3], [1, .8, 1.2]); load.visible = false; bed.add(load); g.add(bed); parts.bed = bed; parts.load = load;
    for (const [x, z] of [[-1.15, 1.5], [1.15, 1.5], [-1.15, -.9], [1.15, -.9], [-1.15, -2.1], [1.15, -2.1]]) { const w = wheel(.55, .4); w.position.set(x, .55, z); g.add(w); (parts.wheels = parts.wheels || []).push(w); }
  }
  if (kind === "digger") { /* tracks */ for (const x of [-1.5, 1.5]) g.add(M(GEO.box(.7, .9, 4), "#2b2b33", [x, .45, 0])); }
  toonify(g); g.userData = { kind, parts, r: kind === "digger" ? 2.4 : 2.6 }; return g;
}
function makeCrane() {
  const g = new THREE.Group(); g.add(M(GEO.box(3, .5, 3), "#3a3a44", [0, .25, 0]), M(GEO.box(.9, 9, .9), "#ffc21f", [0, 4.8, 0]), M(GEO.box(1.4, 1.2, 1.4), "#ffd75e", [0, 9.6, 0]));
  addFace(g, 9.6, .72, .4); const boom = new THREE.Group(); boom.position.y = 9.6; boom.add(M(GEO.box(.5, .5, 9), "#ffc21f", [0, .3, 3.6]), M(GEO.box(1.4, 1.4, 1.4), "#8a8a96", [0, .3, -1.4])); const hook = new THREE.Group(); hook.position.set(0, 0, 7.4); hook.add(M(GEO.cyl(.05, .05, 6, 6), "#222", [0, -3, 0]), M(GEO.tor(.35, .1), "#ffb000", [0, -6.2, 0]));
  boom.add(hook); g.add(boom); toonify(g); g.userData = { boom, hook, r: 3 }; return g;
}

/* ====================== pieces ====================== */
const PAINT = ["#e53935", "#3a8bff", "#ffd23f", "#4caf50", "#b388ff", "#ff8a1f"];
function pieceMesh(item, ci = 0) {
  let m;
  if (item === "plank") m = M(GEO.box(.5, 2, .16), "#c9965a");
  else if (item === "brick") m = M(GEO.box(1.2, .55, .6), "#c0392b");
  else if (item === "beam") m = M(GEO.box(.38, 3, .38), "#a97538");
  else if (item === "floor") m = M(GEO.box(2.4, .25, 1.3), "#c9965a");
  else if (item === "roof") m = M(GEO.cone(3.3, 2, 4), "#c0392b", [0, 0, 0], [1, 1, 1], [0, Math.PI / 4, 0]);
  else if (item === "tile") m = M(GEO.box(3.4, .5, 4.2), "#c0392b");
  else if (item === "paint") m = grp(M(GEO.cyl(.38, .38, .6), "#eeeeee"), M(GEO.cyl(.4, .4, .12), PAINT[ci % PAINT.length], [0, .32, 0]), M(GEO.tor(.3, .04), "#888", [0, .45, 0], [1, 1, 1], [Math.PI / 2, 0, 0]));
  else m = M(GEO.box(.6, .6, .6), "#ccc");
  return toonify(m);
}
function ghost(item, w = 1) { const m = pieceMesh(item); m.traverse(o => { if (o.isMesh) { if (o.userData.isOutline) { o.visible = false; return; } o.material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .38 * w, depthWrite: false }); o.castShadow = false; } }); return m; }

/* ====================== particles ====================== */
const parts = [];
function poof(pos, n = 8, color = "#fff", up = 3, size = .22) { for (let i = 0; i < n; i++) { const p = new THREE.Mesh(GEO.sph(size), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9 })); p.position.copy(pos); const a = Math.random() * 6.28, s = 1 + Math.random() * 2.5; scene.add(p); parts.push({ m: p, v: new THREE.Vector3(Math.cos(a) * s, up * (.5 + Math.random()), Math.sin(a) * s), life: .6 + Math.random() * .4, t: 0, g: 6 }); } }
function confetti(pos, n = 70) { const cols = ["#ff6b8b", "#ffd23f", "#4fd1ff", "#8fe08f", "#c06ad8", "#ff8a1f"]; for (let i = 0; i < n; i++) { const p = new THREE.Mesh(GEO.box(.22, .06, .3), new THREE.MeshBasicMaterial({ color: cols[i % 6] })); p.position.copy(pos).add(new THREE.Vector3((Math.random() - .5) * 5, 3, (Math.random() - .5) * 5)); scene.add(p); parts.push({ m: p, v: new THREE.Vector3((Math.random() - .5) * 5, 5 + Math.random() * 6, (Math.random() - .5) * 5), life: 2.2 + Math.random(), t: 0, g: 7, spin: Math.random() * 8 }); } }
function updateParts(dt) { for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.t += dt; p.v.y -= p.g * dt; p.m.position.addScaledVector(p.v, dt); if (p.spin) { p.m.rotation.x += p.spin * dt; p.m.rotation.z += p.spin * dt; } if (p.m.material.transparent) p.m.material.opacity = clamp(1 - p.t / p.life, 0, 1); if (p.t >= p.life) { scene.remove(p.m); p.m.material.dispose(); parts.splice(i, 1); } } }

/* ====================== jobs ====================== */
const arcPts = (cx, cz, r, n, a0 = 0) => Array.from({ length: n }, (_, i) => { const a = a0 + i / n * Math.PI * 2; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; });
const JOBS = [
  { id: "fence", name: "Fix the Fence", who: "Mrs. Henny", kind: "chicken", col: "#fff3dc", npc: [-12, 2], par: 55, sky: ["#7ec8ff", "#e6f6ff"],
    intro: ["Oh dear! The farm fence has gaps and my chicks keep escaping.", "Grab planks from the pile and carry them to the glowing gaps. Walk into the pile to pick up, and walk to a gap to place."],
    done: "Cluck-tastic! Not a single chick can escape now.", vehicles: [],
    tasks: [{ t: "carry", item: "plank", label: "Carry planks to the fence gaps", pile: [9, 6], slots: [[-6, 1, -3, 0], [-2, 1, -3, 0], [2, 1, -3, 0], [6, 1, -3, 0]] }] },
  { id: "wall", name: "Build the Garden Wall", who: "Mr. Oink", kind: "pig", col: "#ffb3c1", npc: [11, 3], par: 75, sky: ["#8fd3ff", "#fff3d6"],
    intro: ["Hello! I would like a lovely brick wall around my vegetable garden.", "Carry bricks from the pile. The wall goes up row by row."],
    done: "Oink! Perfectly straight. The carrots are safe!", vehicles: [],
    tasks: [{ t: "carry", item: "brick", label: "Stack bricks into the wall", pile: [-9, 6], slots: [[-4, .3, -4, 0], [-1.6, .3, -4, 0], [.8, .3, -4, 0], [3.2, .3, -4, 0], [-2.8, .9, -4, 0], [-.4, .9, -4, 0], [2, .9, -4, 0], [-1.6, 1.5, -4, 0]] }] },
  { id: "pond", name: "Dig the Duck Pond", who: "Moo-ra", kind: "cow", col: "#fffdf6", npc: [-12, 4], par: 70, sky: ["#7ec8ff", "#dff4ff"],
    intro: ["Moo! The ducks need a pond and I have no hands for digging.", "Hop into Digger, drive to each ring and press Space to dig a hole."],
    done: "Moo-velous! Look at those ducks splash!", vehicles: [{ k: "digger", x: -6, z: 7 }],
    tasks: [{ t: "dig", label: "Dig five holes with Digger", spots: arcPts(0, -4, 5, 5, .3) }] },
  { id: "path", name: "Pave the Path", who: "Duckworth", kind: "duck", col: "#ffe27a", npc: [11, -9], par: 60, sky: ["#a9dcff", "#fff0c9"],
    intro: ["Quack! My front path is just mud and my shoes are very muddy.", "Hop into Mixy the cement mixer and drive through the rings in order to pour a path."],
    done: "Quack-tacular! My shoes thank you.", vehicles: [{ k: "mixer", x: 9, z: 7 }],
    tasks: [{ t: "pave", label: "Drive Mixy along the path", pts: [[9, 3], [6, -1], [2, -3], [-2, -4], [-5, -7], [-8, -9]] }] },
  { id: "gravel", name: "Pour the Foundation", who: "Barnaby", kind: "bear", col: "#a97a52", npc: [10, 0], par: 100, sky: ["#8fd3ff", "#ffe9bd"],
    intro: ["I am building a greenhouse and need a strong foundation.", "Drive Dumpy into the gravel pile to load up, then drive to the glowing square and press Space to tip. Then lay the corner bricks!"],
    done: "Beary good! That greenhouse will stand for years.", vehicles: [{ k: "dumpy", x: 6, z: 8 }],
    tasks: [{ t: "dump", label: "Dump four loads of gravel", loads: 4, pile: [10, 6], site: [-5, -4] }, { t: "carry", item: "brick", label: "Lay the corner bricks", pile: [8, 2], slots: [[-8, 1.25, -7, 0], [-2, 1.25, -7, 0], [-8, 1.25, -1, 0], [-2, 1.25, -1, 0]] }] },
  { id: "paint", name: "Paint the Playhouse", who: "Ms. Baa", kind: "sheep", col: "#fffaf0", npc: [-11, 5], par: 75, sky: ["#bfe3ff", "#fff4d8"],
    intro: ["Baaa! The little lambs have a new playhouse but it is so plain.", "Carry paint cans to the white walls. Each can makes a wall a bright color, then add the roof!"],
    done: "Baa-utiful! The lambs are going to love it.", vehicles: [],
    tasks: [{ t: "carry", item: "paint", label: "Paint the four walls", pile: [9, 6], recolor: true, slots: [[-3, 1.5, -5, 0], [3, 1.5, -5, 0], [0, 1.5, -8, 0], [0, 1.5, -2, 0]] }, { t: "carry", item: "roof", label: "Place the roof", pile: [9, 3], slots: [[0, 4.4, -5, 0]] }] },
  { id: "tree", name: "Raise the Treehouse", who: "Quackers", kind: "duck", col: "#ffffff", npc: [-11, 4], par: 110, sky: ["#9fd8ff", "#fff1cc"],
    intro: ["Quack quack! We ducklings want the BEST treehouse in the whole town.", "Carry floor boards, then beams, then the roof. Pieces fly up to the tree when you get close!"],
    done: "QUACK! Best. Treehouse. Ever.", vehicles: [],
    tasks: [{ t: "carry", item: "floor", label: "Add the floor boards", pile: [9, 6], slots: [[1.9, 3.2, -6, 0], [-1.9, 3.2, -6, 0], [0, 3.2, -4.1, Math.PI / 2], [0, 3.2, -7.9, Math.PI / 2]] },
      { t: "carry", item: "beam", label: "Raise the corner beams", pile: [9, 3], slots: [[-2.4, 5, -3.6, 0], [2.4, 5, -3.6, 0], [-2.4, 5, -8.4, 0], [2.4, 5, -8.4, 0]] }, { t: "carry", item: "roof", label: "Top it with a roof", pile: [8, 0], slots: [[0, 8, -6, 0]] }] },

  { id: "bridge", name: "Build the Brook Bridge", who: "Gus", kind: "bear", col: "#8d6e63", npc: [11, 2], par: 85, sky: ["#8fd3ff", "#e8f7ff"], time: "day",
    intro: ["Grr... I mean hello! My berry patch is across the brook and my paws get wet every day.", "Carry boards to lay the bridge, then raise the corner posts so nobody falls in."],
    done: "Beary nice! Dry paws and fresh berries for everyone.", vehicles: [],
    tasks: [{ t: "carry", item: "floor", label: "Lay the bridge boards", pile: [9, 6], slots: [[-1.3, .45, -2.2, Math.PI / 2], [1.3, .45, -2.2, Math.PI / 2], [-1.3, .45, -4.8, Math.PI / 2], [1.3, .45, -4.8, Math.PI / 2], [-1.3, .45, -7.4, Math.PI / 2], [1.3, .45, -7.4, Math.PI / 2], [-1.3, .45, -10, Math.PI / 2], [1.3, .45, -10, Math.PI / 2]] },
      { t: "carry", item: "beam", label: "Raise the corner posts", pile: [9, 2], slots: [[-2.9, 1.5, -1.6, 0], [2.9, 1.5, -1.6, 0], [-2.9, 1.5, -10.6, 0], [2.9, 1.5, -10.6, 0]] }] },
  { id: "lighthouse", name: "Raise the Lighthouse", who: "Skipper Moo", kind: "cow", col: "#fffdf6", npc: [-12, 3], par: 130, sky: ["#ffb27a", "#ffe2b0"], time: "sunset",
    intro: ["Ahoy! Ships keep getting lost out on the bay, and I need a lighthouse.", "Stack bricks for the base, lift the beams into place and top it with a cap. Easy as pie!"],
    done: "Moo-vellous! Not a ship will get lost tonight.", vehicles: [],
    tasks: [{ t: "carry", item: "brick", label: "Stack the base", pile: [-9, 6], slots: [[-2, .3, -6, 0], [2, .3, -6, 0], [0, .3, -8, Math.PI / 2], [0, .3, -4, Math.PI / 2], [-2, .9, -6, Math.PI / 2], [2, .9, -6, Math.PI / 2], [0, .9, -8, 0], [0, .9, -4, 0]] },
      { t: "carry", item: "beam", label: "Raise the tower beams", pile: [9, 4], slots: [[-1.4, 2.4, -4.6, 0], [1.4, 2.4, -4.6, 0], [-1.4, 2.4, -7.4, 0], [1.4, 2.4, -7.4, 0]] }, { t: "carry", item: "roof", label: "Place the lamp room roof", pile: [8, 0], slots: [[0, 5.4, -6, 0]] }] },
  { id: "bakery", name: "Open the Bakery", who: "Baker Hen", kind: "chicken", col: "#ffe0b2", npc: [11, -2], par: 150, sky: ["#8fd3ff", "#fff0c9"], time: "day",
    intro: ["Good morning, dear! The whole town wants fresh bread and I have no bakery yet.", "Pour the foundation with Dumpy, stack the oven walls, then paint the shutters and add the roof."],
    done: "Cluck-a-doodle-delicious! The first loaf is on the house.", vehicles: [{ k: "dumpy", x: 8, z: 9 }],
    tasks: [{ t: "dump", label: "Pour the foundation", loads: 3, pile: [12, 6], site: [-1, -6] }, { t: "carry", item: "brick", label: "Stack the oven walls", pile: [-10, 4], slots: [[-3, 1.3, -8, 0], [-.6, 1.3, -8, 0], [1.8, 1.3, -8, 0], [-3, 1.3, -4, 0], [1.8, 1.3, -4, 0], [-.6, 1.9, -8, 0]] },
      { t: "carry", item: "paint", label: "Paint the shutters", pile: [10, 2], recolor: true, slots: [[-3, 1.5, -5, 0], [3, 1.5, -5, 0]] }, { t: "carry", item: "roof", label: "Top it with a roof", pile: [8, -1], slots: [[0, 4.2, -6, 0]] }] },
  { id: "skate", name: "Build the Skate Park", who: "Skater Quack", kind: "duck", col: "#b2ebf2", npc: [-12, 5], par: 125, sky: ["#bcd2e0", "#d8e4ee"], time: "overcast",
    intro: ["Dude! The ducks need a skate bowl and I cannot dig with these wings.", "Dig the bowl with Digger first, then pave the ramps with Mixy. Gnarly!"],
    done: "Totally quacktastic! First trick coming up.", vehicles: [{ k: "digger", x: -6, z: 7 }, { k: "mixer", x: 9, z: 7 }],
    tasks: [{ t: "dig", label: "Dig the bowl", spots: arcPts(0, -5, 5.5, 5, .2) }, { t: "pave", label: "Pave the ramps", pts: [[9, 3], [5, -1], [1, -2], [-3, -3], [-6, -6], [-9, -9]] }] },
  { id: "barn", name: "Raise the Big Barn", who: "Farmer Bessie", kind: "cow", col: "#fffdf6", npc: [11, 3], par: 135, sky: ["#8fd3ff", "#ffeccb"], time: "day",
    intro: ["Moo! Harvest is coming and the hay has nowhere to go.", "Raise the four big corner beams, nail up the wall planks, then lift on the roof."],
    done: "Moo-nificent! That barn will hold hay for a hundred years.", vehicles: [],
    tasks: [{ t: "carry", item: "beam", label: "Raise the corner beams", pile: [9, 6], slots: [[-4, 1.5, -4, 0], [4, 1.5, -4, 0], [-4, 1.5, -9, 0], [4, 1.5, -9, 0]] },
      { t: "carry", item: "plank", label: "Nail up the wall planks", pile: [-9, 6], slots: [[-2, 1, -4, 0], [0, 1, -4, 0], [2, 1, -4, 0], [-2, 1, -9, 0], [0, 1, -9, 0], [2, 1, -9, 0]] }, { t: "carry", item: "roof", label: "Place the roof", pile: [8, 1], slots: [[0, 4.6, -6.5, 0]] }] },
  { id: "fountain", name: "Build the Town Fountain", who: "Lamb Chop", kind: "sheep", col: "#fffaf0", npc: [-12, 3], par: 135, sky: ["#ffb27a", "#ffe2b0"], time: "sunset",
    intro: ["Baa! The town square is so dull. It needs a fountain!", "Dig the basin with Digger, then ring it with bricks. I will turn the water on at the end."],
    done: "Baa-eautiful! Look at that water sparkle in the sunset.", vehicles: [{ k: "digger", x: -6, z: 7 }], reveal: { model: "pavement-fountain", pos: [0, -4], s: 6 },
    tasks: [{ t: "dig", label: "Dig the basin", spots: arcPts(0, -4, 4, 4, .8) }, { t: "carry", item: "brick", label: "Ring the basin with bricks", pile: [9, 6], slots: [[5.6,0.3,-4.0,1.57],[3.96,0.3,-0.04,0.79],[-0.0,0.3,1.6,0.0],[-3.96,0.3,-0.04,-0.79],[-5.6,0.3,-4.0,-1.57],[-3.96,0.3,-7.96,-2.36],[0.0,0.3,-9.6,-3.14],[3.96,0.3,-7.96,-3.93]] }] },
  { id: "windmill", name: "Raise the Windmill", who: "Barnaby Jr.", kind: "bear", col: "#a97a52", npc: [11, 1], par: 200, sky: ["#a9bccb", "#d3dde6"], time: "overcast", rain: true,
    intro: ["It is a bit drizzly but the grain will not grind itself!", "Pour the base with Dumpy, stack the tower, lift the sails with the crane and paint the door."],
    done: "Grr-eat work, even in the rain! The sails are turning.", vehicles: [{ k: "dumpy", x: 8, z: 9 }], crane: [6.5, -7],
    tasks: [{ t: "dump", label: "Pour the base", loads: 3, pile: [12, 5], site: [-1, -7] }, { t: "carry", item: "brick", label: "Stack the tower", pile: [-11, 4], slots: [[-3, 1.8, -9, 0], [-.5, 1.8, -9, 0], [2, 1.8, -9, 0], [-3, 1.8, -5, 0], [2, 1.8, -5, 0], [-.5, 2.4, -9, 0]] },
      { t: "lift", label: "Lift the sails with the crane", pile: [8, -3], parts: 3, slots: [[-2.2, 3.6, -7, 0], [0, 3.6, -7, 0], [2.2, 3.6, -7, 0]] }, { t: "carry", item: "paint", label: "Paint the door", pile: [-11, 7], recolor: true, slots: [[-1.2, 2.2, -4.7, 0], [1.2, 2.2, -4.7, 0]] }] },
  { id: "market", name: "Set Up the Night Market", who: "Madam Truffle", kind: "pig", col: "#ffb3c1", npc: [11, 4], par: 150, sky: ["#14204a", "#26376e"], time: "night",
    intro: ["Oink oink! Tonight is market night and the lanterns are already glowing.", "Set the counters, raise the stall posts and cover each stall with a roof."],
    done: "Oink-credible! Come one, come all, the night market is open!", vehicles: [],
    tasks: [{ t: "carry", item: "floor", label: "Set the stall counters", pile: [9, 6], slots: [[-6.5, 1.0, -5, 0], [0, 1.0, -5, 0], [6.5, 1.0, -5, 0]] },
      { t: "carry", item: "beam", label: "Raise the stall posts", pile: [-9, 6], slots: [[-7.7, 1.5, -4.2, 0], [-5.3, 1.5, -4.2, 0], [-1.2, 1.5, -4.2, 0], [1.2, 1.5, -4.2, 0], [5.3, 1.5, -4.2, 0], [7.7, 1.5, -4.2, 0]] },
      { t: "carry", item: "roof", label: "Cover the stalls", pile: [8, 0], slots: [[-6.5, 4.0, -5, 0], [0, 4.0, -5, 0], [6.5, 4.0, -5, 0]] }] },
  { id: "hall", final: true, name: "Open the Town Hall", who: "Mayor Cluck", kind: "chicken", col: "#ffd9a8", npc: [12, 0], par: 220, sky: ["#7ec8ff", "#fff0c4"],
    intro: ["Citizens! Today we build the new Town Hall, and the whole crew must help.", "Pour the foundation with Dumpy, stack the bricks, lift the roof with the crane (hold Space near it), and paint the doors!"],
    done: "Ladies and gentlechickens, the Town Hall is OPEN! Great job, crew!", vehicles: [{ k: "dumpy", x: 8, z: 9 }],
    crane: [6.5, -7],
    tasks: [{ t: "dump", label: "Pour the foundation", loads: 3, pile: [12, 5], site: [-1, -7] }, { t: "carry", item: "brick", label: "Build the walls", pile: [-11, 4], slots: [[-4, 1.8, -9, 0], [-1.5, 1.8, -9, 0], [1, 1.8, -9, 0], [3.5, 1.8, -9, 0], [-4, 1.8, -5, 0], [3.5, 1.8, -5, 0]] },
      { t: "lift", label: "Lift the roof with the crane", pile: [8, -3], parts: 3, slots: [[-2.2, 3.4, -7, 0], [0, 3.4, -7, 0], [2.2, 3.4, -7, 0]] }, { t: "carry", item: "paint", label: "Paint the front doors", pile: [-11, 7], recolor: true, slots: [[-1.2, 2.2, -4.7, 0], [1.2, 2.2, -4.7, 0]] }] }
];

/* ====================== world building ====================== */
function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
let G = null; // current game state
const ATMOS = {
  day:      { hemi: [0xffffff, 0x9bd27a, 1.15], sun: [0xfff2d0, 1.6], ground: "#7ec45a", patch: "#8fd06b" },
  sunset:   { hemi: [0xffd9b0, 0xb08a6a, .95], sun: [0xff9a55, 1.5], ground: "#78b050", patch: "#8cc060", sky: ["#ff9f6e", "#ffd9a0"] },
  night:    { hemi: [0x6f86d6, 0x2a3a5a, .7], sun: [0x93a8ff, .75], ground: "#3d7a4d", patch: "#468a58", sky: ["#14204a", "#26376e"] },
  overcast: { hemi: [0xdfe8f0, 0x8aa07a, 1.0], sun: [0xe8eef5, 1.0], ground: "#6fb056", patch: "#7cc063", sky: ["#9fb2c4", "#cdd8e2"] },
};
function buildEnvironment(job) {
  if (world) scene.remove(world);
  world = new THREE.Group(); scene.add(world);
  const at = ATMOS[job.time || "day"] || ATMOS.day, sky = at.sky || job.sky;
  scene.background = new THREE.Color(sky[1]); scene.fog = new THREE.Fog(sky[1], 60, 150);
  hemi.color.set(at.hemi[0]); hemi.groundColor.set(at.hemi[1]); hemi.intensity = at.hemi[2]; sun.color.set(at.sun[0]); sun.intensity = at.sun[1];
  const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 48), mat(at.ground)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(toonify(ground));
  const patch = new THREE.Mesh(new THREE.CircleGeometry(30, 40), mat(at.patch)); patch.rotation.x = -Math.PI / 2; patch.position.y = .02; patch.receiveShadow = true; world.add(toonify(patch));
  const r = rng(77 + job.id.length * 13);
  const haveModels = !!MODEL["road-straight"];
  /* road along the left side, with real road tiles and lamp posts when the models are loaded */
  if (haveModels) {
    for (let z = -66; z <= 66; z += 6) { const t = kenney(z % 12 === 0 ? "road-straight-lightposts" : "road-straight", 6, false); if (!t) break; t.rotation.y = Math.PI / 2; t.position.set(-26, .04, z); world.add(t); }
  } else { const road = new THREE.Mesh(new THREE.PlaneGeometry(6, 140), mat("#9a8a74")); road.rotation.x = -Math.PI / 2; road.position.set(-26, .03, 0); road.receiveShadow = true; world.add(toonify(road)); }
  /* trees */
  for (let i = 0; i < 34; i++) {
    const a = r() * 6.28, d = 32 + r() * 36; const x = Math.cos(a) * d, z = Math.sin(a) * d; let t = null;
    if (haveModels && r() < .85) { t = kenney(r() < .5 ? "grass-trees" : "grass-trees-tall", 5 + r() * 3); if (t) { t.rotation.y = r() * 6.28; } }
    if (!t) { t = grp(M(GEO.cyl(.35, .45, 2.2), "#7a4a24", [0, 1.1, 0]), M(GEO.sph(2 + r() * 1.2), r() < .5 ? "#3f9d3a" : "#4caf50", [0, 3.6, 0], [1, 1.15, 1])); toonify(t); }
    t.position.set(x, 0, z); world.add(t);
  }
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + .3, d = 60 + r() * 14, m = M(GEO.cone(14 + r() * 8, 22 + r() * 12, 6), i % 2 ? "#8aa0c8" : "#9ab0d4", [Math.cos(a) * d, 10, Math.sin(a) * d]); toonify(m); world.add(m); }
  /* houses: Kenney buildings, with the old boxes as a fallback */
  const houses = [[-20, -22, "#ff9aa8", "building-small-a"], [22, -20, "#8fd6ff", "building-small-b"], [-24, 20, "#ffd75e", "building-small-c"], [24, 18, "#b5e48c", "building-small-d"]];
  for (const [x, z, c, mdl] of houses) {
    let h = haveModels ? kenney(mdl, 7) : null;
    if (!h) { h = grp(M(GEO.box(5, 3.4, 4.4), c, [0, 1.7, 0]), M(GEO.cone(4, 2.2, 4), "#c0392b", [0, 4.5, 0], [1, 1, .9], [0, Math.PI / 4, 0]), M(GEO.box(1, 1.8, .15), "#8a5a2b", [0, .9, 2.25]), M(GEO.box(1, 1, .15), "#bfe9f0", [1.5, 2, 2.25])); toonify(h); }
    h.position.set(x, 0, z); h.rotation.y = Math.atan2(-x, -z) + (haveModels ? Math.PI : 0) * 0 + .3; world.add(h);
  }
  if (haveModels) { const f = kenney("pavement-fountain", 5); if (f) { f.position.set(27, .05, -2); world.add(f); } const st = kenney("decoration-tents", 3.2); if (st && job.id === "market") { st.position.set(-18, 0, 4); world.add(st); } }
  /* clouds */
  const clouds = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    let c = haveModels ? kenney("p-cloud", 9 + (i % 3) * 3, false) : null;
    if (c) { c.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = job.time === "night" ? .35 : .95; } }); }
    else { c = grp(M(GEO.sph(3), "#fff", [0, 0, 0], [1.6, .8, 1]), M(GEO.sph(2.4), "#fff", [3, -.3, 0], [1.4, .8, 1]), M(GEO.sph(2.2), "#fff", [-3, -.2, 0], [1.3, .8, 1])); c.children.forEach(k => k.material = new THREE.MeshBasicMaterial({ color: "#fff", transparent: true, opacity: .9 })); }
    c.position.set((i - 3) * 26 + 5, 34 + (i % 3) * 5, -50 + (i % 2) * 40); clouds.add(c);
  }
  world.add(clouds); world.userData.clouds = clouds;
  /* passing traffic on the road: Kenney trucks */
  world.userData.traffic = [];
  if (haveModels) { const names = ["vehicle-truck-green", "vehicle-truck-yellow", "vehicle-truck-red", "vehicle-truck-purple"]; for (let i = 0; i < 3; i++) { const t = kenney(names[(i + job.id.length) % 4], 2.4, false); if (!t) continue; t.position.set(-26 + (i % 2 ? -1.3 : 1.3), .05, -60 + i * 45); t.rotation.y = i % 2 ? 0 : Math.PI; world.add(t); world.userData.traffic.push({ m: t, dir: i % 2 ? 1 : -1, speed: 5 + i * 1.5 }); } }
  /* weather: rain and fireflies */
  if (job.rain) { const n = 500, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - .5) * 90; pos[i * 3 + 1] = Math.random() * 40; pos[i * 3 + 2] = (Math.random() - .5) * 90; } const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); const rain = new THREE.Points(g, new THREE.PointsMaterial({ color: "#cfe6ff", size: .18, transparent: true, opacity: .7 })); world.add(rain); world.userData.rain = rain; }
  if (job.time === "night") { const n = 70, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - .5) * 60; pos[i * 3 + 1] = .6 + Math.random() * 3; pos[i * 3 + 2] = (Math.random() - .5) * 60; } const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); const ff = new THREE.Points(g, new THREE.PointsMaterial({ color: "#fff6a0", size: .45, transparent: true, opacity: .9 })); world.add(ff); world.userData.flies = ff;
    const st = new Float32Array(300 * 3); for (let i = 0; i < 300; i++) { const a = Math.random() * 6.28, e = .15 + Math.random() * 1.1; st[i * 3] = Math.cos(a) * 120; st[i * 3 + 1] = 30 + Math.sin(e) * 70; st[i * 3 + 2] = Math.sin(a) * 120; } const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(st, 3)); world.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: "#fff", size: .9, sizeAttenuation: false }))); }
}
function bobArrow() { const a = grp(M(GEO.cone(.45, 1, 4), "#ff8a1f", [0, 0, 0], [1, 1, 1], [Math.PI, 0, 0])); a.children.forEach(k => k.material = new THREE.MeshBasicMaterial({ color: "#ff5a1f" })); a.userData.arrow = true; return a; }
function ring(r, color = "#ffd23f") { const m = new THREE.Mesh(new THREE.RingGeometry(r * .82, r, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .75, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = .08; return m; }

function startJob(i) {
  if (G && G.root) disposeJob();
  const job = JOBS[i]; buildEnvironment(job);
  G = { i, job, mode: "dialog", time: 0, ti: -1, carry: [], riding: null, vehicles: [], tasks: [], fly: [], npc: null, anim: 0, vel: new THREE.Vector3(), cool: 0, hold: 0, root: world, shake: 0, doneT: 0 };
  /* site dressing per job */
  if (job.id === "fence") { for (let k = -9; k <= 9; k++) { const x = k * 1.1; if ([-6, -2, 2, 6].some(g => Math.abs(g - x) < .9)) continue; const p = pieceMesh("plank"); p.position.set(x, 1, -3); world.add(p); } for (const y of [.55, 1.45]) { const rail = M(GEO.box(21, .18, .12), "#a97538", [0, y, -3.12]); world.add(toonify(rail)); } }
  if (job.id === "wall") { const base = M(GEO.box(11, .12, 1.4), "#a89a82", [0, .06, -4]); world.add(toonify(base)); for (let k = 0; k < 6; k++) { const c = M(GEO.cyl(.5, .6, .5), "#7a9a4a", [-7 + k * 2.8, .25, -1.5]); world.add(toonify(c)); } }
  if (job.id === "path") { const cot = grp(M(GEO.box(6, 4, 5), "#ffd9a8", [0, 2, 0]), M(GEO.cone(4.8, 2.6, 4), "#c0392b", [0, 5.3, 0], [1, 1, .85], [0, Math.PI / 4, 0]), M(GEO.box(1.2, 2.2, .2), "#8a5a2b", [0, 1.1, 2.55])); cot.position.set(-10, 0, -10.5); toonify(cot); world.add(cot); const mud = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 26), mat("#7a5a3a")); mud.rotation.x = -Math.PI / 2; mud.rotation.z = -.9; mud.position.set(0, .04, -2); world.add(mud); }
  if (job.id === "paint") { for (const [x, z, w, d] of [[-3, -5, .3, 4], [3, -5, .3, 4], [0, -8, 6, .3], [0, -2, 6, .3]]) { /* floor only */ } const fl = M(GEO.box(7, .2, 7), "#c9a06a", [0, .1, -5]); world.add(toonify(fl)); }
  if (job.id === "tree") { const tr = grp(M(GEO.cyl(1.1, 1.5, 10), "#7a4a24", [0, 5, 0]), M(GEO.sph(5), "#3f9d3a", [0, 11, 0], [1.2, .9, 1.2]), M(GEO.sph(3.2), "#4caf50", [-3.2, 10, 1], [1, .9, 1]), M(GEO.sph(3.2), "#4caf50", [3.2, 10, -1], [1, .9, 1])); tr.position.set(0, 0, -6); toonify(tr); world.add(tr); }
  if (job.id === "hall") { world.userData.found = null; }
  const water = (x, z, w, d, c = "#5db3ff") => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .88 })); m.rotation.x = -Math.PI / 2; m.position.set(x, .05, z); world.add(m); return m; };
  if (job.id === "bridge") { water(0, -6.3, 70, 7.2); for (const z of [-2.5, -10.1]) world.add(toonify(M(GEO.box(70, .3, 1.2), "#9a8a6a", [0, .12, z]))); }
  if (job.id === "lighthouse") { water(26, -4, 40, 60, "#4da3e8"); const base = M(GEO.cyl(4.6, 5, .4, 18), "#9a8a74", [0, .2, -6]); world.add(toonify(base)); }
  if (job.id === "bakery") { const sign = grp(M(GEO.cyl(.12, .12, 3), "#7a4a24", [0, 1.5, 0]), M(GEO.box(2.2, .9, .2), "#ffe0b2", [0, 3.1, 0])); sign.position.set(5, 0, -3); toonify(sign); world.add(sign); }
  if (job.id === "skate") { const slab = M(GEO.box(20, .2, 22), "#b8bcc4", [0, .1, -5]); world.add(toonify(slab)); }
  if (job.id === "barn") { for (let k = 0; k < 4; k++) world.add(toonify(M(GEO.cyl(.8, .8, 1.1, 14), "#e0c060", [-9 + k * 1.9, .55, -1.2], [1, 1, 1], [0, 0, Math.PI / 2]))); }
  if (job.id === "fountain") { for (let a = 0; a < 10; a++) { const t = M(GEO.box(2.4, .12, 2.4), a % 2 ? "#cfc8b8" : "#bdb5a2", [Math.cos(a / 10 * 6.28) * 9, .06, -4 + Math.sin(a / 10 * 6.28) * 9]); world.add(toonify(t)); } }
  if (job.id === "windmill") { const hill = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 12, 0, 6.28, 0, 1.2), mat("#8fcf6a")); hill.position.set(-1, -3.6, -7); world.add(toonify(hill)); }
  if (job.id === "market") { for (let k = -4; k <= 4; k++) { const l = M(GEO.sph(.28), ["#ff6b8b", "#ffd23f", "#4fd1ff", "#8fe08f"][k & 3], [k * 2.6, 3.4 + Math.sin(k) * .3, -3.6]); l.material = new THREE.MeshBasicMaterial({ color: l.material.color }); world.add(l); } const lampL = new THREE.PointLight(0xffd9a0, 40, 28); lampL.position.set(0, 4, -3); world.add(lampL); }
  /* NPC */
  G.npc = makeCritter(job.kind, job.col); G.npc.position.set(job.npc[0], 0, job.npc[1]); G.npc.rotation.y = Math.atan2(-job.npc[0], 6 - job.npc[1]); world.add(G.npc);
  /* vehicles */
  for (const v of job.vehicles) { const m = makeVehicle(v.k); m.position.set(v.x, 0, v.z); m.rotation.y = 0; world.add(m); G.vehicles.push({ m, kind: v.k, home: new THREE.Vector3(v.x, 0, v.z), speed: 0 }); }
  if (job.crane) { G.crane = makeCrane(); G.crane.position.set(job.crane[0], 0, job.crane[1]); G.crane.rotation.y = -Math.PI / 2; world.add(G.crane); }
  /* player */
  G.bo = makeBo(); G.bo.position.set(0, 0, 8); world.add(G.bo); G.pos = G.bo.position;
  /* build task objects */
  job.tasks.forEach(t => G.tasks.push(makeTask(t)));
  G.markers = []; $("jobName").textContent = job.name; renderTaskList();
  camera.position.set(0, 12, 22); camera.lookAt(0, 1, 4); camAng = 0;
}
function disposeJob() { scene.remove(G.root); G.root.traverse(o => { if (o.geometry) o.geometry.dispose?.(); }); for (const p of parts) scene.remove(p.m); parts.length = 0; }

function makeTask(spec) {
  const T = { spec, done: false, n: 0, objs: new THREE.Group(), slotMeshes: [], pileGroup: null, hole: 0, laid: 0, loaded: false, loads: 0, active: false };
  world.add(T.objs);
  if (spec.t === "carry" || spec.t === "lift") {
    spec.slots.forEach((s, k) => { let gm; if (spec.recolor) { gm = M(GEO.box(k === 4 ? 5 : (spec.slots.length === 2 ? 2 : 5.6), 3, .3), "#fbfbf6", [0, 0, 0]); if (spec.slots.length === 4) { gm.geometry = GEO.box(k < 2 ? .3 : 6, 3, k < 2 ? 4 : .3); } if (spec.slots.length === 2) gm.geometry = GEO.box(2, 3.6, .3); toonify(gm); } else { gm = ghost(spec.item || (spec.t === "lift" ? "tile" : "plank")); if (spec.t === "lift") { const gg = ghost("tile"); gm = gg; } } gm.position.set(s[0], s[1], s[2]); gm.rotation.y = s[3]; gm.visible = false; T.objs.add(gm); T.slotMeshes.push(gm); });
    if (spec.pile) { T.pileGroup = new THREE.Group(); T.pileGroup.position.set(spec.pile[0], 0, spec.pile[1]); const item = spec.t === "lift" ? "tile" : spec.item; for (let i = 0; i < 6; i++) { const p = pieceMesh(item, i); p.position.set((i % 3 - 1) * 1.1, (item === "plank" ? 1 : item === "beam" ? 1.5 : item === "roof" ? 1 : .3) + Math.floor(i / 3) * (item === "brick" ? .6 : item === "paint" ? .7 : .35), ((i * 7) % 3 - 1) * .5); if (item === "plank") p.rotation.z = 1.4 - (i % 2) * .1; if (item === "beam") p.rotation.z = 1.5; p.visible = i < 5; T.pileGroup.add(p); } const sign = M(GEO.cyl(.08, .08, 2.4), "#7a4a24", [1.8, 1.2, 1.4]); T.pileGroup.add(toonify(sign)); T.pileGroup.visible = false; T.objs.add(T.pileGroup); }
  } else if (spec.t === "dig") {
    T.rings = spec.spots.map(([x, z]) => { const r = ring(1.8); r.position.set(x, .08, z); r.visible = false; T.objs.add(r); return r; });
  } else if (spec.t === "pave") {
    T.rings = spec.pts.map(([x, z], k) => { const r = ring(k === 0 ? 1.6 : 1.8, k === 0 ? "#8fe08f" : "#ffd23f"); r.position.set(x, .08, z); r.visible = false; T.objs.add(r); return r; }); T.laid = 1;
  } else if (spec.t === "dump") {
    const pile = new THREE.Group(); for (let i = 0; i < 4; i++) pile.add(M(GEO.cone(1.8 - i * .2, 2.2, 8), "#9a8a6a", [i % 2 * 1.2 - .6, 1.1, (i % 3 - 1) * .9])); pile.position.set(spec.pile[0], 0, spec.pile[1]); toonify(pile); T.pileGroup = pile; pile.visible = false; T.objs.add(pile);
    const site = ring(3.2, "#ffd23f"); site.position.set(spec.site[0], .08, spec.site[1]); site.scale.set(1.0, 1, 1); site.visible = false; T.site = site; T.objs.add(site);
    const found = M(GEO.box(8, 1, 6), "#a89a82", [spec.site[0], .5, spec.site[1]]); found.scale.y = .02; found.position.y = .01; toonify(found); T.found = found; T.objs.add(found);
  }
  return T;
}
function renderTaskList() {
  $("taskList").innerHTML = G.tasks.map((T, k) => { const s = T.spec; const prog = s.t === "carry" || s.t === "lift" ? ` (${T.n}/${s.slots.length})` : s.t === "dig" ? ` (${T.n}/${s.spots.length})` : s.t === "pave" ? ` (${Math.max(0, T.laid - 1)}/${s.pts.length - 1})` : ` (${T.loads}/${s.loads})`; return `<li class="${T.done ? "done" : k === G.ti ? "now" : ""}"><b>${T.done ? "&#10003;" : k === G.ti ? "&#9654;" : "&bull;"}</b><span>${s.label}${k === G.ti || T.done ? prog : ""}</span></li>`; }).join("");
}
function activateTask(k) {
  G.ti = k; const T = G.tasks[k]; if (!T) return; T.active = true; const s = T.spec;
  if (T.pileGroup) T.pileGroup.visible = true; if (T.slotMeshes) T.slotMeshes.forEach((m, j) => m.visible = j >= T.n); if (T.rings) { T.rings.forEach(r => r.visible = false); } if (T.site) T.site.visible = false;
  if (s.t === "carry" && G.riding) leaveVehicle(); if (s.t === "lift" && G.riding) leaveVehicle();
  renderTaskList();
}
function completeTask(T) {
  T.done = true; T.active = false; sfx.ding(); poof(G.pos.clone().add(new THREE.Vector3(0, 2, 0)), 14, "#ffd23f", 4, .18);
  if (T.pileGroup) T.pileGroup.visible = false; if (T.rings) T.rings.forEach(r => r.visible = false); if (T.site) T.site.visible = false;
  if (G.ti + 1 < G.tasks.length) activateTask(G.ti + 1); else finishJob(); renderTaskList();
}

/* ====================== game flow ====================== */
function showScreen(id) { for (const s of ["title", "select", "result", "shop", "town"]) $(s).hidden = s !== id; $("hud").hidden = id !== null && id !== "hud"; $("touch").hidden = !(id === "hud") || !matchMedia("(pointer:coarse)").matches; }
let dlgLines = [], dlgI = 0, dlgWho = "", dlgDone = null, typeT = null;
function say(who, lines, done) { dlgWho = who; dlgLines = lines; dlgI = 0; dlgDone = done; $("dlg").hidden = false; showLine(); }
function showLine() { $("dlgWho").textContent = dlgWho; const txt = dlgLines[dlgI]; $("dlgTxt").textContent = ""; let n = 0; clearInterval(typeT); typeT = setInterval(() => { n++; $("dlgTxt").textContent = txt.slice(0, n); if (n >= txt.length) { clearInterval(typeT); typeT = null; } }, 18); $("dlgNext").textContent = dlgI >= dlgLines.length - 1 ? "Let's build!" : "Next"; }
function dlgNext() { if (typeT) { clearInterval(typeT); typeT = null; $("dlgTxt").textContent = dlgLines[dlgI]; return; } if (dlgI < dlgLines.length - 1) { dlgI++; showLine(); } else { $("dlg").hidden = true; const d = dlgDone; dlgDone = null; if (d) d(); } }
function beginPlay() { G.mode = "play"; G.time = 0; showScreen("hud"); $("hud").hidden = false; activateTask(0); sfx.hop(); }
function openJob(i) { playMusic(TRACKS.jobs[i % TRACKS.jobs.length]); showScreen("hud"); $("hud").hidden = true; $("touch").hidden = true; startJob(i); G.mode = "dialog"; say(G.job.who, G.job.intro, beginPlay); }
function stars(job, t) { return t <= job.par ? 3 : t <= job.par * 1.55 ? 2 : 1; }
function finishJob() {
  if (G.job.reveal && MODEL[G.job.reveal.model]) { const rv = kenney(G.job.reveal.model, G.job.reveal.s); if (rv) { rv.position.set(G.job.reveal.pos[0], .08, G.job.reveal.pos[1]); world.add(rv); poof(new THREE.Vector3(G.job.reveal.pos[0], 1.5, G.job.reveal.pos[1]), 24, "#bfe9ff", 5, .3); } }
  G.mode = "done"; G.doneT = 0; sfx.fan(); confetti(G.pos.clone(), 90); G.endStars = stars(G.job, G.time); const s = G.endStars;
  say(G.job.who, [G.job.done], null); $("dlgNext").textContent = "Yay!"; dlgDone = showResult;
}
function showResult() {
  const i = G.i, s = G.endStars; const first = !save.stars[i]; const reward = 10 + s * 15 + (first ? 20 : 0); save.coins += reward; save.earned += reward; save.stars[i] = Math.max(save.stars[i] || 0, s); save.best[i] = Math.min(save.best[i] || 1e9, Math.round(G.time)); save.unlocked = Math.max(save.unlocked, Math.min(JOBS.length, i + 2)); persist();
  try { const total = Object.values(save.stars).reduce((a, v) => a + v, 0); window.DHScores && DHScores.submit("fix-it-crew", total, { now: true }); } catch (_) {}
  $("hud").hidden = true; $("touch").hidden = true; $("dlg").hidden = true; showScreen("result");
  $("resTitle").textContent = JOBS[i].final ? "The Town Hall is open!" : "Job done!"; $("resStars").innerHTML = [1, 2, 3].map(n => n <= s ? "&#9733;" : "<i>&#9733;</i>").join("");
  $("resStats").textContent = `Time ${fmtT(G.time)}  -  3 stars at ${fmtT(G.job.par)}  -  best ${fmtT(save.best[i])}  -  +${reward} coins`; $("resCoins").textContent = save.coins + " coins"; checkAch();
  $("resLine").textContent = s === 3 ? "Perfect crew work!" : s === 2 ? "Great job! Can you beat the 3-star time?" : "Job finished! Try again for a faster time.";
  $("resNext").hidden = i >= JOBS.length - 1;
}
const fmtT = t => Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0");

/* ====================== input ====================== */
let camAng = 0, camZoom = 1;
addEventListener("wheel", e => { camZoom = clamp(camZoom + Math.sign(e.deltaY) * .08, .6, 1.5); }, { passive: true });
const keys = {}; let stick = { x: 0, y: 0 }, act = false, actPress = false, hopPress = false;
addEventListener("keydown", e => { if (e.repeat && (e.code === "Space" || e.code === "KeyE")) { keys[e.code] = true; return; } keys[e.code] = true; if (e.code === "Space") { actPress = true; if (G && G.mode === "play") e.preventDefault(); } if (e.code === "KeyE" || e.code === "ShiftLeft") hopPress = true;
  if ((e.code === "Enter" || e.code === "Space") && !$("dlg").hidden) { e.preventDefault(); dlgNext(); } });
addEventListener("keyup", e => { keys[e.code] = false; });
function inputVec() { let x = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), y = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0); x += stick.x; y += stick.y; const l = Math.hypot(x, y); return l > 1 ? [x / l, y / l] : [x, y]; }
const stickEl = $("stick"), knob = $("knob"); let stickId = null;
stickEl.addEventListener("pointerdown", e => { stickId = e.pointerId; stickEl.setPointerCapture(e.pointerId); moveStick(e); });
stickEl.addEventListener("pointermove", e => { if (e.pointerId === stickId) moveStick(e); });
const endStick = e => { if (e.pointerId === stickId) { stickId = null; stick = { x: 0, y: 0 }; knob.style.transform = ""; } }; stickEl.addEventListener("pointerup", endStick); stickEl.addEventListener("pointercancel", endStick);
function moveStick(e) { const r = stickEl.getBoundingClientRect(), dx = (e.clientX - r.left - r.width / 2) / (r.width / 2), dy = (e.clientY - r.top - r.height / 2) / (r.height / 2), l = Math.hypot(dx, dy), k = l > 1 ? 1 / l : 1; stick = { x: dx * k, y: dy * k }; knob.style.transform = `translate(${dx * k * 34}px,${dy * k * 34}px)`; }
$("actBtn").addEventListener("pointerdown", e => { e.preventDefault(); actPress = true; keys.Space = true; }); $("actBtn").addEventListener("pointerup", () => { keys.Space = false; }); $("actBtn").addEventListener("pointercancel", () => { keys.Space = false; });
$("hopBtn").addEventListener("pointerdown", e => { e.preventDefault(); hopPress = true; });

/* ====================== vehicles ====================== */
function boardVehicle(v) { G.riding = v; if (G.carry.length) { G.carry.forEach(c => G.bo.remove(c)); G.carry = []; } G.bo.visible = false; sfx.hop(); poof(v.m.position.clone().add(new THREE.Vector3(0, 2, 0)), 6, "#fff", 2); }
function leaveVehicle() { const v = G.riding; if (!v) return; G.riding = null; G.bo.visible = true; G.pos.copy(v.m.position).add(new THREE.Vector3(3, 0, 1.5)); G.pos.y = 0; sfx.hop(); }
function nearestVehicle(max = 4) { let b = null, bd = max; for (const v of G.vehicles) { const d = v.m.position.distanceTo(G.pos); if (d < bd) { bd = d; b = v; } } return b; }

/* ====================== update ====================== */
const tmp = new THREE.Vector3();
function flyPiece(mesh, to, onLand) { G.fly.push({ mesh, from: mesh.position.clone(), to: to.clone(), t: 0, onLand }); }
function update(dt) {
  if (!G) return; dt = Math.min(dt, .05);
  G.anim += dt; const clouds = world.userData.clouds; if (clouds) clouds.position.x = Math.sin(G.anim * .03) * 12;
  const wu = world.userData; if (wu.traffic) for (const t of wu.traffic) { t.m.position.z += t.dir * t.speed * dt; if (t.m.position.z > 70) t.m.position.z = -70; if (t.m.position.z < -70) t.m.position.z = 70; }
  if (wu.rain) { const a = wu.rain.geometry.attributes.position; for (let i = 0; i < a.count; i++) { let y = a.getY(i) - 26 * dt; if (y < 0) y = 40; a.setY(i, y); } a.needsUpdate = true; }
  if (wu.flies) { const a = wu.flies.geometry.attributes.position; for (let i = 0; i < a.count; i++) { a.setX(i, a.getX(i) + Math.sin(G.anim + i) * dt * .8); a.setY(i, clamp(a.getY(i) + Math.cos(G.anim * 1.3 + i * 2) * dt * .6, .5, 4)); } a.needsUpdate = true; }
  if (G.mode === "play") G.time += dt;
  /* NPC idle */
  if (G.npc) { G.npc.position.y = G.mode === "done" ? Math.abs(Math.sin(G.anim * 7)) * 1.2 : Math.max(0, Math.sin(G.anim * 2.4)) * .15; }
  const play = G.mode === "play";
  if (keys.KeyQ) camAng -= dt * 1.8; if (keys.KeyR) camAng += dt * 1.8;
  let [ix0, iy0] = play ? inputVec() : [0, 0]; const ca = Math.cos(camAng), sa = Math.sin(camAng); const ix = ix0 * ca + iy0 * sa, iy = -ix0 * sa + iy0 * ca; const moving = Math.hypot(ix, iy) > .05;
  if (play && hopPress && !G.digging && !G.tipping && !G.lifting) { if (G.riding) leaveVehicle(); else { const v = nearestVehicle(4.2); if (v) boardVehicle(v); } }
  hopPress = false;
  /* movement */
  const T = G.tasks[G.ti]; const sp = G.riding ? (G.riding.kind === "digger" ? 5 : 7.5) : 6.5;
  if (play) {
    G.vel.x = lerp(G.vel.x, ix * sp, Math.min(1, dt * 9)); G.vel.z = lerp(G.vel.z, iy * sp, Math.min(1, dt * 9));
    const obj = G.riding ? G.riding.m : G.bo; obj.position.x += G.vel.x * dt; obj.position.z += G.vel.z * dt;
    const r = Math.hypot(obj.position.x, obj.position.z); if (r > 34) { obj.position.x *= 34 / r; obj.position.z *= 34 / r; }
    if (moving) { const ty = Math.atan2(G.vel.x, G.vel.z) + (G.riding ? Math.PI * 0 : 0); let d = ty - obj.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); obj.rotation.y += d * Math.min(1, dt * 10); }
    if (G.riding) { G.pos.copy(G.riding.m.position); G.pos.y = 0; (G.riding.m.userData.parts.wheels || []).forEach(w => w.rotation.x += Math.hypot(G.vel.x, G.vel.z) * dt * 1.4); if (G.riding.kind === "digger" && !G.digging) G.riding.m.rotation.z = Math.sin(G.anim * 20) * .01 * (moving ? 1 : 0); }
  }
  if (play && save.trail && moving && !G.riding && Math.random() < .5) poof(G.pos.clone().add(new THREE.Vector3(0, .3, 0)), 1, ["#ffd23f", "#ff8fb1", "#8fe0ff"][Math.floor(Math.random() * 3)], 1.2, .12);
  /* Bo animation */
  { const u = G.bo.userData, s = Math.hypot(G.vel.x, G.vel.z) / 6.5, w = Math.sin(G.anim * 12) * s * .7; u.legL.rotation.x = w; u.legR.rotation.x = -w; u.armL.rotation.x = G.carry.length ? -1.2 : -w * .8; u.armR.rotation.x = G.carry.length ? -1.2 : w * .8; G.bo.position.y = Math.abs(Math.sin(G.anim * 12)) * s * .12; }
  if (G.mode !== "play") { G.vel.multiplyScalar(.8); }
  /* tasks */
  let prompt = "", holdShow = false; G.markerPos = null;
  if (play && T) {
    const s = T.spec; G.cool -= dt;
    const need = s.t === "dig" ? "digger" : s.t === "pave" ? "mixer" : s.t === "dump" ? "dumpy" : null;
    if (need) {
      const veh = G.vehicles.find(v => v.kind === need);
      if (!G.riding || G.riding.kind !== need) { if (G.riding) leaveVehicle(); if (veh) { G.markerPos = veh.m.position.clone().setY(5); prompt = "Walk into the " + (need === "digger" ? "Digger" : need === "mixer" ? "mixer" : "dump truck") + " to hop in"; if (veh.m.position.distanceTo(G.pos) < 3) boardVehicle(veh); } }
    }
    if (s.t === "carry" && T.slotMeshes[T.n]) {
      const next = T.slotMeshes[T.n]; const pile = s.pile; const dPile = Math.hypot(G.pos.x - pile[0], G.pos.z - pile[1]);
      if (G.carry.length === 0 || G.carry.length < 3) {
        G.markerPos = G.carry.length ? new THREE.Vector3(next.position.x, next.position.y + 3, next.position.z) : new THREE.Vector3(pile[0], 4.2, pile[1]);
        prompt = G.carry.length ? "Carry it to the glowing spot" : "Walk into the pile to pick up";
        if (dPile < 2.8 && G.cool <= 0 && G.carry.length < 3 && G.carry.length + T.n < s.slots.length) { const p = pieceMesh(s.item, T.n + G.carry.length); G.bo.add(p); p.position.set(0, 3.2 + G.carry.length * (s.item === "plank" || s.item === "beam" ? .35 : .7), 0); if (s.item === "plank") p.rotation.z = 1.5; if (s.item === "beam") p.rotation.z = 1.5; if (s.item === "roof") p.scale.setScalar(.4); if (s.item === "floor") p.scale.setScalar(.7); G.carry.push(p); G.cool = .22; sfx.pick(); poof(new THREE.Vector3(pile[0], 1, pile[1]), 3, "#fff", 1.5, .12); }
      } else { G.markerPos = new THREE.Vector3(next.position.x, next.position.y + 3, next.position.z); prompt = "Hands full! Carry it to the glowing spot"; }
      if (G.carry.length && next && Math.hypot(G.pos.x - next.position.x, G.pos.z - next.position.z) < 3.6 && G.cool <= 0) {
        const p = G.carry.pop(); const wp = new THREE.Vector3(); p.getWorldPosition(wp); G.bo.remove(p); p.scale.setScalar(1); p.rotation.set(0, 0, 0); p.position.copy(wp); scene.add(p); G.cool = .3; const slot = next, idx = T.n; T.n++; T.slotMeshes[idx].visible = false;
        const to = slot.position.clone();
        flyPiece(p, to, () => { scene.remove(p); sfx.place(); poof(to.clone(), 6, "#e6dcc4", 2, .2); if (s.recolor) { slot.visible = true; slot.traverse(o => { if (o.isMesh && !o.userData.isOutline) o.material = new THREE.MeshToonMaterial({ color: PAINT[idx % PAINT.length], gradientMap: toonRamp }); }); } else { const real = pieceMesh(s.item); real.position.copy(to); real.rotation.y = slot.rotation.y; world.add(real); } T.slotMeshes[idx + 1] && (T.slotMeshes[idx + 1].visible = true); renderTaskList(); if (T.n >= s.slots.length) completeTask(T); });
        if (s.item === "roof") p.scale.setScalar(1);
      }
    } else if (s.t === "dig") {
      const k = T.n; const sp0 = s.spots[k]; T.rings.forEach((r, j) => r.visible = j === k); const veh = G.riding && G.riding.kind === "digger" ? G.riding : null;
      if (veh && sp0) { const d = Math.hypot(veh.m.position.x - sp0[0], veh.m.position.z - sp0[1]); G.markerPos = new THREE.Vector3(sp0[0], 4, sp0[1]); prompt = d < 2.6 ? "Press Space to dig!" : "Drive onto the ring";
        if (d < 2.6 && actPress && !G.digging) { G.digging = { t: 0, k, spot: sp0 }; sfx.dig(); }
      }
      if (G.digging) { const dg = G.digging; dg.t += dt; const veh2 = G.riding; const b = veh2.m.userData.parts; b.boom.rotation.x = Math.sin(dg.t / 1.1 * Math.PI) * -.6; b.arm.rotation.x = Math.sin(dg.t / 1.1 * Math.PI) * .9; G.shake = .15; if (dg.t >= 1.1) { const [x, z] = dg.spot; const hole = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshBasicMaterial({ color: "#3a2410" })); hole.rotation.x = -Math.PI / 2; hole.position.set(x, .06, z); world.add(hole); for (let i = 0; i < 6; i++) { const m = M(GEO.sph(.5 + Math.random() * .3), "#8a5a2b", [x + Math.cos(i) * 2, .3, z + Math.sin(i) * 2], [1, .6, 1]); world.add(toonify(m)); } poof(new THREE.Vector3(x, 1, z), 10, "#a97a52", 3, .25); G.digging = null; T.n++; b.boom.rotation.x = 0; b.arm.rotation.x = 0; sfx.place(); renderTaskList(); if (T.n >= s.spots.length) { /* water and ducks */ const w = new THREE.Mesh(new THREE.CircleGeometry(4.6, 32), new THREE.MeshBasicMaterial({ color: "#6ab7ff", transparent: true, opacity: .85 })); w.rotation.x = -Math.PI / 2; w.position.set(0, .09, -4); world.add(w); G.ducks = []; for (let i = 0; i < 3; i++) { const d = makeCritter("duck", "#ffe27a"); d.scale.setScalar(.35); d.position.set(Math.cos(i * 2) * 2, .1, -4 + Math.sin(i * 2) * 2); world.add(d); G.ducks.push(d); } completeTask(T); } } }
    } else if (s.t === "pave") {
      const k = T.laid; const target = s.pts[k]; T.rings.forEach((r, j) => r.visible = j === k);
      if (G.riding && G.riding.kind === "mixer") { if (G.riding.m.userData.parts.drum) G.riding.m.userData.parts.drum.rotation.z += dt * 3; prompt = k === 1 && T.laid === 1 ? "Drive through the rings in order" : ""; }
      if (target) { G.markerPos = new THREE.Vector3(target[0], 4, target[1]); if (G.riding && G.riding.kind === "mixer") { const d = Math.hypot(G.pos.x - target[0], G.pos.z - target[1]); if (d < 2.4) { const a = s.pts[k - 1], len = Math.hypot(target[0] - a[0], target[1] - a[1]); const seg = new THREE.Mesh(GEO.box(3, .2, len + 1.2), mat("#d6d6dc")); seg.position.set((a[0] + target[0]) / 2, .12, (a[1] + target[1]) / 2); seg.rotation.y = Math.atan2(target[0] - a[0], target[1] - a[1]); seg.receiveShadow = true; world.add(toonify(seg)); poof(new THREE.Vector3(target[0], .5, target[1]), 6, "#d6d6dc", 1.5, .2); sfx.place(); T.laid++; renderTaskList(); if (T.laid >= s.pts.length) completeTask(T); } } }
    } else if (s.t === "dump") {
      const veh = G.riding && G.riding.kind === "dumpy" ? G.riding : null; const pl = s.pile, st = s.site; T.pileGroup.visible = !T.loaded; T.site.visible = T.loaded;
      if (veh) { const pr = veh.m.userData.parts;
        if (!T.loaded) { G.markerPos = new THREE.Vector3(pl[0], 4.5, pl[1]); prompt = "Drive into the gravel pile to load up"; if (Math.hypot(G.pos.x - pl[0], G.pos.z - pl[1]) < 3.4) { T.loaded = true; pr.load.visible = true; sfx.pick(); poof(new THREE.Vector3(pl[0], 1.5, pl[1]), 8, "#9a8a6a", 2, .2); } }
        else { G.markerPos = new THREE.Vector3(st[0], 4.5, st[1]); const d = Math.hypot(G.pos.x - st[0], G.pos.z - st[1]); prompt = d < 3.8 ? "Press Space to tip the load!" : "Drive to the glowing square"; if (d < 3.8 && actPress && !G.tipping) { G.tipping = { t: 0 }; sfx.tip(); } }
        if (G.tipping) { const tp = G.tipping; tp.t += dt; pr.bed.rotation.x = -Math.min(1, tp.t / .6) * .7; if (tp.t > .8) { pr.bed.rotation.x = 0; pr.load.visible = false; T.loaded = false; T.loads++; G.tipping = null; T.found.scale.y = .02 + T.loads / s.loads * .98; T.found.position.y = .5 * T.found.scale.y; poof(new THREE.Vector3(st[0], 1, st[1]), 10, "#9a8a6a", 3, .25); sfx.place(); renderTaskList(); if (T.loads >= s.loads) completeTask(T); } }
      }
    } else if (s.t === "lift") {
      const cr = G.crane, cp = cr.position; const dC = Math.hypot(G.pos.x - cp.x, G.pos.z - cp.z), pile = s.pile; const next = T.slotMeshes[T.n]; T.pileGroup.visible = true;
      G.markerPos = new THREE.Vector3(cp.x, 13, cp.z); const near = dC < 6;
      prompt = near ? "Hold Space to lift the roof piece" : "Walk to the crane"; holdShow = near;
      if (near && keys.Space && next && !G.lifting) { G.hold += dt / 1.5; if (G.hold >= 1) { G.hold = 0; G.lifting = { t: 0, to: next.position.clone(), idx: T.n }; T.n++; sfx.pick(); } } else if (!G.lifting) G.hold = Math.max(0, G.hold - dt * 2);
      if (G.lifting) { const L = G.lifting; L.t += dt; const bm = cr.userData.boom; const tgt = Math.atan2(L.to.x - cp.x, L.to.z - cp.z) - cr.rotation.y; bm.rotation.y = lerp(bm.rotation.y, tgt, Math.min(1, dt * 3)); if (!L.piece) { L.piece = pieceMesh("tile"); L.piece.position.set(pile[0], 1, pile[1]); scene.add(L.piece); L.from = L.piece.position.clone(); } const k = clamp(L.t / 1.6, 0, 1); L.piece.position.lerpVectors(L.from, L.to, k); L.piece.position.y += Math.sin(k * Math.PI) * 5; if (L.t >= 1.6) { scene.remove(L.piece); const real = pieceMesh("tile"); real.position.copy(L.to); world.add(real); T.slotMeshes[L.idx].visible = false; T.slotMeshes[L.idx + 1] && (T.slotMeshes[L.idx + 1].visible = true); sfx.place(); poof(L.to.clone(), 8, "#e6dcc4", 2, .2); G.lifting = null; bm.rotation.y = 0; renderTaskList(); if (T.n >= s.slots.length) completeTask(T); } }
      $("holdFill").style.width = Math.round(G.hold * 100) + "%";
    }
    if (G.carry.length) G.carry.forEach((c, k) => { c.rotation.y += dt * 2; });
  }
  actPress = false;
  $("holdBar").hidden = !holdShow || G.mode !== "play"; const pr = $("prompt"); pr.hidden = !prompt || G.mode !== "play"; if (prompt && pr.textContent !== prompt) pr.textContent = prompt;
  /* flying pieces */
  for (let i = G.fly.length - 1; i >= 0; i--) { const f = G.fly[i]; f.t += dt / .55; const k = clamp(f.t, 0, 1); f.mesh.position.lerpVectors(f.from, f.to, k); f.mesh.position.y += Math.sin(k * Math.PI) * 2.5; f.mesh.rotation.y += dt * 6; if (k >= 1) { G.fly.splice(i, 1); f.onLand(); } }
  /* ghost pulse + arrow */
  const T2 = G.tasks[G.ti]; if (T2 && T2.slotMeshes) T2.slotMeshes.forEach((m, j) => { if (j === T2.n && m.visible) m.traverse(o => { if (o.isMesh && o.material.isMeshBasicMaterial) o.material.opacity = .35 + Math.sin(G.anim * 6) * .15; }); });
  updateMarker(dt); updateParts(dt);
  if (G.ducks) G.ducks.forEach((d, i) => { d.position.y = .1 + Math.sin(G.anim * 3 + i) * .06; d.rotation.y += dt * .6; });
  /* time and hud */
  if (play) { $("time").textContent = fmtT(G.time); const s = stars(G.job, G.time); $("parStars").innerHTML = "&#9733;".repeat(s) + '<span style="color:#d8cdb0">' + "&#9733;".repeat(3 - s) + "</span>"; }
  /* camera */
  const focus = G.riding ? G.riding.m.position : G.pos, back = (G.riding ? 1.35 : 1) * camZoom, fx = focus.x * .85; tmp.set(fx + Math.sin(camAng) * (15 * back + 1), 11 * back + 1, focus.z + Math.cos(camAng) * (15 * back + 1));
  camera.position.lerp(tmp, Math.min(1, dt * 4)); if (G.shake > 0) { camera.position.x += (Math.random() - .5) * G.shake; camera.position.y += (Math.random() - .5) * G.shake; G.shake = Math.max(0, G.shake - dt); }
  camera.lookAt(fx, 1.5, focus.z - 1);
}
let arrow = null;
function updateMarker(dt) {
  if (!arrow) { arrow = bobArrow(); arrow.scale.setScalar(1.4); scene.add(arrow); }
  if (G.markerPos && G.mode === "play") { arrow.visible = true; arrow.position.copy(G.markerPos); arrow.position.y = G.markerPos.y + Math.sin(G.anim * 5) * .35 - 1.6; arrow.rotation.y += dt * 3; } else arrow.visible = false;
}
function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.05, (now - (frame.last || now)) / 1000); frame.last = now; if (townMode) { townTick(dt); renderer.render(scene, camera); return; } if (G) { update(dt); renderer.render(scene, camera); } else { renderer.render(scene, camera); } }

/* ====================== menus ====================== */
/* ====================== achievements ====================== */
const ACH = [
  { id: "first", name: "First job", desc: "Finish any job", ok: () => Object.keys(save.stars).length >= 1 },
  { id: "star3", name: "Perfect crew", desc: "Get 3 stars on a job", ok: () => Object.values(save.stars).some(v => v >= 3) },
  { id: "five", name: "Busy builder", desc: "Finish 5 jobs", ok: () => Object.keys(save.stars).length >= 5 },
  { id: "speed", name: "Speed crew", desc: "3 stars on 5 jobs", ok: () => Object.values(save.stars).filter(v => v >= 3).length >= 5 },
  { id: "rich", name: "Coin collector", desc: "Earn 300 coins", ok: () => save.earned >= 300 },
  { id: "dress", name: "Dressed to build", desc: "Own 3 hats", ok: () => save.hats.length >= 3 },
  { id: "town", name: "Town planner", desc: "Visit My Town", ok: () => !!save.ach.townVisit },
  { id: "all", name: "Master builder", desc: "Finish every job", ok: () => Object.keys(save.stars).length >= JOBS.length },
];
function toast(t) { const e = $("toast"); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { e.hidden = true; }, 3200); }
function checkAch() { for (const a of ACH) if (!save.ach[a.id] && a.ok()) { save.ach[a.id] = 1; persist(); toast("Badge unlocked: " + a.name); sfx.fan(); } }

/* ====================== crew shop ====================== */
function renderShop() {
  $("shopCoins").textContent = save.coins + " coins";
  $("hatGrid").innerHTML = HATS.map(h => { const own = save.hats.includes(h.id), on = save.hat === h.id; return `<button class="hat ${on ? "on" : ""}" data-h="${h.id}" type="button"><span class="sw" style="background:${h.dome}"></span><b>${h.name}</b><small>${on ? "Wearing" : own ? "Wear" : h.price + " coins"}</small></button>`; }).join("") +
    `<button class="hat ${save.trail ? "on" : ""}" data-h="trail" type="button"><span class="sw" style="background:linear-gradient(135deg,#ffd23f,#ff8fb1,#8fe0ff)"></span><b>Sparkle trail</b><small>${save.trail ? "On" : save.ownTrail ? "Turn on" : "200 coins"}</small></button>`;
  $("hatGrid").querySelectorAll(".hat").forEach(b => b.onclick = () => {
    const id = b.dataset.h;
    if (id === "trail") { if (!save.ownTrail) { if (save.coins < 200) return toast("Not enough coins yet"); save.coins -= 200; save.ownTrail = true; save.trail = true; sfx.fan(); } else save.trail = !save.trail; }
    else { const h = HATS.find(x => x.id === id); if (!save.hats.includes(id)) { if (save.coins < h.price) return toast("Not enough coins yet"); save.coins -= h.price; save.hats.push(id); sfx.ding(); } save.hat = id; }
    persist(); checkAch(); rebuildTitleBackdrop(); renderShop();
  });
  $("achList").innerHTML = ACH.map(a => `<li class="${save.ach[a.id] ? "got" : ""}"><b>${save.ach[a.id] ? "&#9733;" : "&#9734;"}</b><span>${a.name}<small>${a.desc}</small></span></li>`).join("");
}
function openShop() { $("dlg").hidden = true; G && G.root && disposeJob(); G = null; townMode = false; rebuildTitleBackdrop(); renderShop(); showScreen("shop"); }

/* ====================== my town ====================== */
let townMode = false, townAng = 0, townTraffic = [];
const TOWN_MODELS = ["building-small-a", "building-small-c", "building-garage", "building-small-b", "building-small-d", "building-small-c", "building-small-a", "building-small-d"];
function buildTown() {
  if (world) scene.remove(world); world = new THREE.Group(); scene.add(world); townTraffic = [];
  const at = ATMOS.day; scene.background = new THREE.Color("#bfe6ff"); scene.fog = new THREE.Fog("#bfe6ff", 80, 190); hemi.color.set(at.hemi[0]); hemi.groundColor.set(at.hemi[1]); hemi.intensity = at.hemi[2]; sun.color.set(at.sun[0]); sun.intensity = at.sun[1];
  const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 48), mat("#7ec45a")); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(toonify(ground));
  if (MODEL["road-straight"]) { for (let k = -60; k <= 60; k += 6) { for (const [x, z, ry] of [[k, 0, Math.PI / 2], [0, k, 0]]) { if (k === 0) continue; const t = kenney(Math.abs(k) % 12 === 0 ? "road-straight-lightposts" : "road-straight", 6, false); t.position.set(x, .04, z); t.rotation.y = ry; world.add(t); } } const c = kenney("road-intersection", 6, false); if (c) { c.position.set(0, .04, 0); world.add(c); } }
  const done = i => (save.stars[i] || 0) > 0; const n = JOBS.length - 1; let built = 0;
  JOBS.forEach((j, i) => {
    let x, z; if (j.final) { x = 0; z = -14; } else { const ring = i < 8 ? 0 : 1, k = ring ? i - 8 : i, cnt = ring ? n - 8 : 8, a = k / cnt * 6.2832 + (ring ? .4 : 0), r = ring ? 40 : 24; x = Math.cos(a) * r; z = Math.sin(a) * r; if (Math.abs(x) < 6 || Math.abs(z) < 6) { x += x < 0 ? -7 : 7; z += z < 0 ? -7 : 7; } }
    if (done(i)) { built++; const mdl = j.id === "fountain" ? "pavement-fountain" : TOWN_MODELS[i % TOWN_MODELS.length]; const b = kenney(mdl, j.final ? 14 : j.id === "fountain" ? 6 : 8); if (b) { b.position.set(x, .05, z); b.rotation.y = Math.atan2(-x, -z) + Math.PI; world.add(b); if (save.stars[i] >= 3) { const f = kenney("p-flag", 4, true); if (f) { f.position.set(x + 3, .05, z + 3); world.add(f); } } } }
    else { const plot = M(GEO.cyl(4, 4, .12, 20), "#b79a6a", [x, .06, z]); world.add(toonify(plot)); const sign = grp(M(GEO.cyl(.1, .1, 2), "#7a4a24", [0, 1, 0]), M(GEO.box(1.6, .9, .12), "#fff8e6", [0, 2.1, 0])); sign.position.set(x, 0, z); toonify(sign); world.add(sign); }
  });
  for (let i = 0; i < 40; i++) { const a = i * 2.4, d = 52 + (i % 7) * 4; const t = kenney(i % 2 ? "grass-trees" : "grass-trees-tall", 6); if (t) { t.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); world.add(t); } }
  const names = ["vehicle-truck-green", "vehicle-truck-yellow", "vehicle-truck-red", "vehicle-truck-purple"]; names.forEach((nm, k) => { const t = kenney(nm, 2.6, false); if (!t) return; t.position.set(k % 2 ? 1.4 : -1.4, .05, -50 + k * 30); world.add(t); townTraffic.push({ m: t, speed: 7 + k, axis: "z", dir: k % 2 ? 1 : -1 }); });
  $("townTitle").textContent = "My Town"; $("townSub").textContent = built + " of " + JOBS.length + " buildings built. Finish jobs to grow your town. Gold flags mean 3 stars.";
}
function openTown() { $("dlg").hidden = true; G && G.root && disposeJob(); G = null; townMode = true; buildTown(); save.ach.townVisit = 1; persist(); checkAch(); playMusic(TRACKS.town); showScreen("town"); }
function closeTown() { townMode = false; rebuildTitleBackdrop(); renderCards(); playMusic(TRACKS.menu); showScreen("select"); }
function townTick(dt) { townAng += dt * .08; const R = 62; camera.position.set(Math.cos(townAng) * R, 30, Math.sin(townAng) * R); camera.lookAt(0, 3, -4); for (const t of townTraffic) { t.m.position.z += t.dir * t.speed * dt; if (t.m.position.z > 60) t.m.position.z = -60; if (t.m.position.z < -60) t.m.position.z = 60; } if (world.userData.clouds) world.userData.clouds.position.x += dt; }

function renderCards() {
  $("selCoins").textContent = save.coins + " coins"; $("cards").innerHTML = JOBS.map((j, i) => { const locked = i >= save.unlocked, s = save.stars[i] || 0; return `<button class="card ${locked ? "locked" : ""}" data-i="${i}" ${locked ? "disabled" : ""} type="button"><div class="num">JOB ${i + 1}</div><h3>${locked ? "???" : j.name}</h3><p>${locked ? "Finish the previous job to unlock." : "For " + j.who + ". 3 stars under " + fmtT(j.par) + "."}</p><div class="star">${[1, 2, 3].map(n => n <= s ? "&#9733;" : "<i>&#9733;</i>").join("")}</div></button>`; }).join("");
  $("cards").querySelectorAll(".card:not(.locked)").forEach(b => b.addEventListener("click", () => openJob(+b.dataset.i)));
}
$("playBtn").onclick = () => { playMusic(TRACKS.menu); renderCards(); showScreen("select"); }; $("howBtn").onclick = () => { $("howTxt").hidden = !$("howTxt").hidden; };
$("selBack").onclick = () => showScreen("title"); $("selShop").onclick = openShop; $("selTown").onclick = openTown; $("shopBack").onclick = () => { renderCards(); showScreen("select"); }; $("townBack").onclick = closeTown;
$("dlgNext").onclick = dlgNext; $("dlgSkip").onclick = () => { clearInterval(typeT); typeT = null; dlgI = dlgLines.length - 1; $("dlgTxt").textContent = dlgLines[dlgI]; dlgNext(); };
$("resAgain").onclick = () => openJob(G.i); $("resNext").onclick = () => openJob(G.i + 1); $("resMenu").onclick = () => { playMusic(TRACKS.menu); renderCards(); showScreen("select"); };
$("sndBtn").onclick = () => { if (FORCE_MUTE) return; save.muted = !save.muted; persist(); $("sndBtn").textContent = save.muted ? "Sound off" : "Sound on"; if (save.muted) stopMusic(); else playMusic(G && G.job ? TRACKS.jobs[G.i % TRACKS.jobs.length] : TRACKS.menu); };
$("vol").value = Math.round(save.vol * 100); $("vol").oninput = () => { save.vol = $("vol").value / 100; setBgmVolume(save.vol); persist(); };
$("sndBtn").textContent = (save.muted || FORCE_MUTE) ? "Sound off" : "Sound on";
showScreen("title");
/* title backdrop */
function rebuildTitleBackdrop() {
buildEnvironment(JOBS[0]); camera.position.set(0, 9, 26); camera.lookAt(0, 3, 0);
{ const bo = makeBo(); bo.position.set(-3, 0, 12); bo.rotation.y = .4; world.add(bo); const d = makeVehicle("digger"); d.position.set(4, 0, 11); d.rotation.y = -.5; world.add(d); const m = makeVehicle("mixer"); m.position.set(-9, 0, 8); m.rotation.y = .6; world.add(m); camera.position.set(0, 6, 28); camera.lookAt(0, 2, 10); }
}
rebuildTitleBackdrop();
requestAnimationFrame(frame);
window.__fix = { JOBS, HATS, ACH, openTown, openShop, save, get G() { return G; }, openJob, beginPlay, step: s => { const n = Math.round(s / .03); for (let i = 0; i < n; i++) update(.03); renderer.render(scene, camera); }, setKey: (k, v) => { keys[k] = v; }, press: () => { actPress = true; }, hop: () => { hopPress = true; }, dlgNext, save, teleport: (x, z) => { if (G.riding) { G.riding.m.position.set(x, 0, z); } else G.pos.set(x, 0, z); } };
