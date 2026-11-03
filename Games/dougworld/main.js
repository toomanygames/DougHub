/* DougWorld 3D — a multiplayer sandbox for DougHub.
   Rendering: Three.js. Multiplayer: Supabase Realtime broadcast + presence (peer to peer, no server code).
   Saves: localStorage, plus the private `dougworld_saves` table when signed in.
   Player scripts use a small built-in command language, never JavaScript, so a friend's build
   can never run code that reads your login or the rest of the site. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

const SB_URL = "https://agsqdqcsmsppcdqxlppj.supabase.co";
const SB_KEY = "sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52";
const sb = window.supabase ? window.supabase.createClient(SB_URL, SB_KEY) : null;
// Guests may join rooms only on a local dev server, so multiplayer can be tested without accounts.
const DEV = ["localhost", "127.0.0.1"].includes(location.hostname);

/* ============================== helpers ============================== */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const num = (v, d = 0, a = -1e4, b = 1e4) => { v = Number(v); return Number.isFinite(v) ? clamp(v, a, b) : d; };
const isHex = c => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c);
const hex = (c, d = "#cccccc") => (isHex(c) ? c.toLowerCase() : d);
const text = (s, n) => String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, n);
const rid = () => Math.random().toString(36).slice(2, 10);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const snap = v => Math.round(v * 4) / 4;
function toast(msg) { const el = document.createElement("div"); el.className = "toast"; el.textContent = msg; $("toasts").appendChild(el); setTimeout(() => el.remove(), 4000); }
// OpenMoji art (CC BY-SA 4.0) for the few interface icons, matching the rest of DougHub's games.
const EMOJI_RE = /\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*/gu;
const emojiFile = e => [...e].map(c => c.codePointAt(0).toString(16).toUpperCase()).filter(h => h !== "FE0F").join("-");
// Swaps emoji in text nodes only, so buttons keep their click handlers (rewriting innerHTML would drop them).
function emojify(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [];
  while (walker.nextNode()) if (walker.currentNode.nodeValue.search(EMOJI_RE) >= 0) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const frag = document.createDocumentFragment(); let last = 0; const s = node.nodeValue;
    for (const m of s.matchAll(EMOJI_RE)) {
      frag.append(s.slice(last, m.index));
      const img = document.createElement("img"); img.src = `openmoji/${emojiFile(m[0])}.svg`; img.alt = ""; img.draggable = false; img.style.cssText = "width:1.35em;height:1.35em;vertical-align:-.32em";
      frag.append(img); last = m.index + m[0].length;
    }
    frag.append(s.slice(last)); node.replaceWith(frag);
  }
}

/* ============================== constants ============================== */
const PLOTS = 8, PLOT_HALF = 15, PLOT_R = 58, HUB_R = 20, MAX_PARTS = 800, MAX_Y = 40;
const PLOT_COLORS = ["#f28c28", "#3a8fb7", "#5fae4e", "#8a5cc9", "#e05a4f", "#f7c948", "#2bb3a3", "#d96aa7"];
const plotOrigin = i => { const a = (i / PLOTS) * Math.PI * 2; return new THREE.Vector3(Math.round(Math.cos(a) * PLOT_R), 0, Math.round(Math.sin(a) * PLOT_R)); };
const SPAWN = new THREE.Vector3(0, 0, 4);
const PART_SHAPES = ["box", "sphere", "cylinder", "cone", "wedge"];
const AV_SHAPES = ["box", "sphere", "cylinder", "cone"];
const MATERIALS = ["solid", "glass", "neon", "metal", "grid"];
const AV_PARTS = { head: "Head", torso: "Body", armL: "Left arm", armR: "Right arm", legL: "Left leg", legR: "Right leg", hat: "Hat", back: "Backpack" };
const OPTIONAL_PARTS = ["hat", "back"];
const SWATCHES = ["#fffaf0", "#26283b", "#9aa1ad", "#e05a4f", "#f28c28", "#f7c948", "#5fae4e", "#2bb3a3", "#3a8fb7", "#8a5cc9", "#d96aa7", "#8b5a3c", "#f2c9a0", "#c68642", "#6b4423", "#ffffff"];
/* Kenney 3D models (CC0), stored in Games/dougworld/models. Only these keys may appear in shared data. */
const MODEL_DIR = "dougworld/models/";
const CHAR_MODELS = [..."abcdefghijklmnopqr"].map(c => "blocky/character-" + c).concat(["female-a", "female-b", "female-c", "male-a", "male-b", "male-c"].map(c => "mini/character-" + c));
const PET_MODELS = ["dog", "cat", "bunny", "fox", "panda", "penguin", "pig", "chick", "koala", "parrot", "tiger", "elephant"].map(a => "pets/animal-" + a);
const BUILD_MODELS = {
  Furniture: ["bedDouble", "bedSingle", "bedBunk", "bench", "chair", "chairCushion", "chairDesk", "desk", "table", "tableRound", "tableCoffee", "loungeSofa", "loungeSofaCorner", "loungeChair", "bookcaseOpen", "books", "televisionModern", "cabinetTelevision", "computerScreen", "laptop", "kitchenFridge", "kitchenStove", "kitchenSink", "kitchenCabinet", "kitchenMicrowave", "toaster", "bathtub", "toilet", "shower", "bathroomSink", "lampRoundFloor", "lampSquareTable", "ceilingFan", "pottedPlant", "plantSmall1", "rugRound", "rugRectangle", "speaker", "radio", "bear", "washer", "trashcan", "stairs", "cardboardBoxClosed", "coatRackStanding", "pillow"].map(n => "furniture/" + n),
  Nature: ["tree_oak", "tree_default", "tree_detailed", "tree_fat", "tree_pineRoundA", "tree_pineDefaultA", "tree_cone", "tree_palmTall", "tree_blocks", "plant_bush", "plant_bushLarge", "flower_redA", "flower_yellowA", "flower_purpleA", "mushroom_red", "mushroom_redGroup", "rock_largeA", "rock_smallA", "rock_tallA", "stump_round", "log", "log_stack", "campfire_stones", "fence_simple", "fence_gate", "tent_detailedOpen", "statue_obelisk", "statue_head", "pot_large", "lily_large", "sign", "grass_large"].map(n => "nature/" + n)
};
const MODEL_PARTS = [...BUILD_MODELS.Furniture, ...BUILD_MODELS.Nature];
const modelLabel = key => key.split("/").pop().replace(/^(animal|character)-/, "").replace(/_/g, " ").replace(/([a-z])([A-Z0-9])/g, "$1 $2").replace(/^./, c => c.toUpperCase());
const gltfLoader = new GLTFLoader(), gltfCache = new Map(), MODEL_SIZE = new Map();
function loadModel(key) {
  if (!gltfCache.has(key)) gltfCache.set(key, gltfLoader.loadAsync(MODEL_DIR + key + ".glb").then(g => {
    g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const box = new THREE.Box3().setFromObject(g.scene); g.size = box.getSize(new THREE.Vector3()); g.center = box.getCenter(new THREE.Vector3()); g.min = box.min.clone();
    MODEL_SIZE.set(key, g.size); collidersDirty = true; return g;
  }).catch(err => { console.warn("DougWorld model failed:", key, err); gltfCache.delete(key); throw err; }));
  return gltfCache.get(key);
}
const QUICK = ["Hi!", "Come here!", "Follow me!", "Nice build!", "Let's play tag!", "GG!", "LOL", "Help!", "Wait for me!", "Brb", "Wow!", "Bye!"];

/* ============================== account ============================== */
const me = { id: "local-" + rid(), name: "Player", signedIn: false, joined: Date.now(), plot: 0, points: 0, char: null };
async function loadAccount() {
  if (!sb) return;
  try {
    const { data } = await sb.auth.getSession();
    const user = data?.session?.user;
    if (!user) return;
    me.id = user.id; me.signedIn = true;
    me.name = user.user_metadata?.username || user.email?.split("@")[0] || "Player";
    const { data: profile } = await sb.from("profiles").select("username").eq("id", user.id).maybeSingle();
    if (profile?.username) me.name = profile.username;
  } catch (e) { console.warn("DougWorld sign-in check failed", e); }
}

/* ============================== textures ============================== */
const texLoader = new THREE.TextureLoader();
function tiled(url, rep) { const t = texLoader.load(url); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const TEX = { grass: tiled("dougworld/tex/proto-green-07.png", 75), plot: tiled("dougworld/tex/proto-light-07.png", 7.5), hub: tiled("dougworld/tex/proto-orange-07.png", 10), grid: tiled("dougworld/tex/proto-light-07.png", 1) };

function faceDataURL() {
  const c = document.createElement("canvas"); c.width = c.height = 96; const g = c.getContext("2d");
  g.fillStyle = "#26283b";
  g.beginPath(); g.ellipse(32, 40, 7, 10, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(64, 40, 7, 10, 0, 0, 7); g.fill();
  g.fillStyle = "#fff"; g.beginPath(); g.arc(34, 36, 3, 0, 7); g.arc(66, 36, 3, 0, 7); g.fill();
  g.strokeStyle = "#26283b"; g.lineWidth = 5; g.lineCap = "round"; g.beginPath(); g.arc(48, 56, 16, .25 * Math.PI, .75 * Math.PI); g.stroke();
  g.fillStyle = "#f28c2866"; g.beginPath(); g.arc(20, 60, 7, 0, 7); g.arc(76, 60, 7, 0, 7); g.fill();
  return c.toDataURL("image/png");
}
const DEFAULT_FACE = faceDataURL();
const TEX_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const partTexCache = new Map();
// A part's picture is drawn on top of its colour, so transparent areas show the colour underneath.
function partTexture(color, url) {
  const key = color + url.length + url.slice(-40);
  if (partTexCache.has(key)) return partTexCache.get(key);
  const c = document.createElement("canvas"); c.width = c.height = 96; const g = c.getContext("2d");
  g.fillStyle = color; g.fillRect(0, 0, 96, 96);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter;
  const img = new Image(); img.onload = () => { g.drawImage(img, 0, 0, 96, 96); tex.needsUpdate = true; }; img.src = url;
  partTexCache.set(key, tex); return tex;
}

/* ============================== scene ============================== */
const canvas = $("view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color("#bfe6f7");
scene.fog = new THREE.Fog("#bfe6f7", 90, 240);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
scene.add(new THREE.HemisphereLight("#e8f7ff", "#5f8f45", 1.1));
const sun = new THREE.DirectionalLight("#fff4dc", 1.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 160 });
scene.add(sun, sun.target);

function addMesh(geo, mat, pos, opts = {}) { const m = new THREE.Mesh(geo, mat); if (pos) m.position.copy(pos); m.receiveShadow = opts.receive !== false; m.castShadow = !!opts.cast; scene.add(m); return m; }
const groundMesh = addMesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ map: TEX.grass, roughness: 1 }));
groundMesh.rotation.x = -Math.PI / 2;
addMesh(new THREE.CylinderGeometry(HUB_R, HUB_R, 0.12, 64), new THREE.MeshStandardMaterial({ map: TEX.hub, roughness: .9 }), new THREE.Vector3(0, 0.05, 0));
addMesh(new THREE.CylinderGeometry(2.4, 2.6, 0.3, 32), new THREE.MeshStandardMaterial({ color: "#f7c948", roughness: .5 }), new THREE.Vector3(SPAWN.x, 0.15, SPAWN.z), { cast: true });
// Plots: a pale floor with a coloured border and a name sign for each owner.
const plotSigns = [];
for (let i = 0; i < PLOTS; i++) {
  const o = plotOrigin(i);
  addMesh(new THREE.BoxGeometry(PLOT_HALF * 2 + 1, 0.14, PLOT_HALF * 2 + 1), new THREE.MeshStandardMaterial({ color: PLOT_COLORS[i], roughness: .8 }), new THREE.Vector3(o.x, 0.04, o.z));
  addMesh(new THREE.BoxGeometry(PLOT_HALF * 2, 0.16, PLOT_HALF * 2), new THREE.MeshStandardMaterial({ map: TEX.plot, roughness: .9 }), new THREE.Vector3(o.x, 0.06, o.z));
  const toward = o.clone().normalize().multiplyScalar(-(PLOT_HALF + 2)).add(o);
  const sign = makeLabel("Empty plot", PLOT_COLORS[i]); sign.position.set(toward.x, 3.4, toward.z); sign.scale.multiplyScalar(1.4); scene.add(sign);
  addMesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 8), new THREE.MeshStandardMaterial({ color: "#8b5a3c" }), new THREE.Vector3(toward.x, 1.3, toward.z), { cast: true });
  plotSigns.push(sign);
}
// Park scenery from the Kenney Nature Kit, positioned from a fixed seed so every player sees the same park.
function placeScenery(key, x, z, scale, yaw = 0, y = 0) {
  loadModel(key).then(g => { const m = g.scene.clone(); m.scale.setScalar(scale); m.position.set(x, y, z); m.rotation.y = yaw; scene.add(m); }).catch(() => {});
}
(function park() {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const trees = ["nature/tree_oak", "nature/tree_default", "nature/tree_detailed", "nature/tree_fat", "nature/tree_pineRoundA", "nature/tree_pineDefaultA", "nature/tree_cone", "nature/tree_blocks"];
  const smalls = ["nature/plant_bush", "nature/plant_bushLarge", "nature/flower_redA", "nature/flower_yellowA", "nature/flower_purpleA", "nature/mushroom_redGroup", "nature/rock_smallA", "nature/rock_largeA", "nature/stump_round", "nature/grass_large", "nature/log"];
  const clear = (x, z, pad) => { if (Math.hypot(x, z) < HUB_R + pad) return false; for (let i = 0; i < PLOTS; i++) { const o = plotOrigin(i); if (Math.abs(x - o.x) < PLOT_HALF + pad && Math.abs(z - o.z) < PLOT_HALF + pad + 2) return false; } return true; };
  for (let n = 0; n < 90; n++) {
    const a = rnd() * Math.PI * 2, r = 25 + rnd() * 115, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (clear(x, z, 3)) placeScenery(trees[Math.floor(rnd() * trees.length)], x, z, 4.5 + rnd() * 2.5, rnd() * 6.28);
  }
  for (let n = 0; n < 160; n++) {
    const a = rnd() * Math.PI * 2, r = 22 + rnd() * 120, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (clear(x, z, 1.5)) placeScenery(smalls[Math.floor(rnd() * smalls.length)], x, z, 3 + rnd() * 2, rnd() * 6.28);
  }
  // Hub: a campfire circle with benches, a statue and flower beds.
  placeScenery("nature/statue_obelisk", 0, -9, 6);
  placeScenery("nature/campfire_stones", 9, -6, 4);
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + .4; placeScenery("furniture/bench", 9 + Math.cos(a) * 3.6, -6 + Math.sin(a) * 3.6, 3.2, -a + Math.PI / 2); }
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; placeScenery(["nature/flower_redA", "nature/flower_yellowA", "nature/flower_purpleA"][i % 3], Math.cos(a) * (HUB_R - 1.2), Math.sin(a) * (HUB_R - 1.2), 3.5, a); }
  placeScenery("nature/tent_detailedOpen", -10, -5, 5, 0.6);
  placeScenery("nature/sign", -3, 8, 3.5, Math.PI);
})();

/* ============================== labels & bubbles ============================== */
function makeLabel(str, bg = "#fffaf0", fg = "#26283b") {
  const c = document.createElement("canvas"), g = c.getContext("2d");
  g.font = "700 42px Fredoka, sans-serif"; const w = Math.min(900, g.measureText(str).width + 40);
  c.width = w; c.height = 64; g.font = "700 42px Fredoka, sans-serif";
  g.fillStyle = "#26283b"; roundRect(g, 0, 0, w, 64, 18); g.fill();
  g.fillStyle = bg; roundRect(g, 4, 4, w - 8, 56, 14); g.fill();
  g.fillStyle = fg; g.textBaseline = "middle"; g.textAlign = "center"; g.fillText(str, w / 2, 34);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: true }));
  s.scale.set(w / 64 * 0.45, 0.45, 1); s.userData.label = str; return s;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function setLabel(sprite, str, bg) { if (sprite.userData.label === str) return; const fresh = makeLabel(str, bg); sprite.material.map.dispose(); sprite.material.map = fresh.material.map; sprite.scale.x = fresh.scale.x * (sprite.scale.y / 0.45); sprite.scale.y = sprite.scale.y; sprite.userData.label = str; }
function bubble(obj3d, str, height, at) {
  const s = makeLabel(str, "#ffffff"); s.position.set(at ? at.x : 0, (at ? at.y : 0) + height + 0.9, at ? at.z : 0); s.scale.multiplyScalar(1.15); obj3d.add(s);
  setTimeout(() => { obj3d.remove(s); s.material.map.dispose(); s.material.dispose(); }, 3500);
}
// Parts are scaled meshes, so their bubbles hang off the build group just above the part instead.
function partBubble(b, pid, str) { const mesh = b.meshes.get(pid), p = b.parts.get(pid); if (mesh && p) bubble(b.group, str, partSize(p)[1] / 2, mesh.position); }

/* ============================== avatars ============================== */
// base: "blocks" (fully custom block body) or one of CHAR_MODELS (an animated Kenney character).
function defaultChar() {
  return { v: 1, base: "blocky/character-a", tint: "", size: [1, 1], pet: "pets/animal-dog", parts: {
    head: { shape: "box", color: "#f2c9a0", scale: [0.8, 0.8, 0.8], tex: DEFAULT_FACE },
    torso: { shape: "box", color: "#3a8fb7", scale: [0.9, 1, 0.5] },
    armL: { shape: "box", color: "#f2c9a0", scale: [0.28, 0.9, 0.28] }, armR: { shape: "box", color: "#f2c9a0", scale: [0.28, 0.9, 0.28] },
    legL: { shape: "box", color: "#26283b", scale: [0.36, 0.9, 0.36] }, legR: { shape: "box", color: "#26283b", scale: [0.36, 0.9, 0.36] },
    hat: { shape: "none", color: "#e05a4f", scale: [0.9, 0.4, 0.9] }, back: { shape: "none", color: "#f28c28", scale: [0.6, 0.7, 0.3] } } };
}
function cleanChar(c) {
  const def = defaultChar(), out = { v: 1, parts: {} };
  out.base = CHAR_MODELS.includes(c?.base) ? c.base : "blocks"; // older saves without a base are block bodies
  out.tint = isHex(c?.tint) ? c.tint.toLowerCase() : "";
  out.size = [num(c?.size?.[0], 1, 0.6, 1.6), num(c?.size?.[1], 1, 0.6, 1.6)];
  out.pet = PET_MODELS.includes(c?.pet) ? c.pet : "";
  let textured = 0;
  for (const k of Object.keys(AV_PARTS)) {
    const src = c?.parts?.[k] || {}, d = def.parts[k];
    const shape = (OPTIONAL_PARTS.includes(k) && src.shape === "none") ? "none" : (AV_SHAPES.includes(src.shape) ? src.shape : d.shape);
    const sc = Array.isArray(src.scale) ? src.scale : d.scale;
    const p = { shape, color: hex(src.color, d.color), scale: [0, 1, 2].map(i => num(sc[i], d.scale[i], 0.15, 2.5)) };
    if (typeof src.tex === "string" && src.tex.length <= 60000 && TEX_RE.test(src.tex) && textured < 5) { p.tex = src.tex; textured++; }
    out.parts[k] = p;
  }
  return out;
}
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1), sphere: new THREE.SphereGeometry(0.5, 24, 16),
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 24), cone: new THREE.ConeGeometry(0.5, 1, 24), wedge: wedgeGeometry()
};
function wedgeGeometry() {
  // A ramp that rises toward +z: bottom face, tall back face at +z, sloped top, two triangle sides.
  const A = [-.5, -.5, -.5], B = [.5, -.5, -.5], C = [.5, -.5, .5], D = [-.5, -.5, .5], E = [-.5, .5, .5], F = [.5, .5, .5];
  const tris = [[A, C, B], [A, D, C], [D, F, E], [D, C, F], [A, B, F], [A, F, E], [A, E, D], [B, C, F]];
  const pos = [], uv = [];
  tris.forEach(t => t.forEach((v, i) => { pos.push(...v); uv.push(i === 0 ? 0 : 1, i === 2 ? 1 : 0); }));
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
}
function avatarMaterial(part) {
  const plain = new THREE.MeshStandardMaterial({ color: part.color, roughness: .75 });
  if (!part.tex) return plain;
  const textured = new THREE.MeshStandardMaterial({ map: partTexture(part.color, part.tex), roughness: .75 });
  // On boxes the picture goes on the front face only (BoxGeometry face order: +x, -x, +y, -y, +z, -z).
  return part.shape === "box" ? [plain, plain, plain, plain, textured, plain] : textured;
}
function buildBlockAvatar(char) {
  const P = char.parts, root = new THREE.Group(), rig = {};
  const mesh = k => { const p = P[k]; const m = new THREE.Mesh(GEO[p.shape], avatarMaterial(p)); m.scale.set(...p.scale); m.castShadow = true; return m; };
  const legH = Math.max(P.legL.scale[1], P.legR.scale[1]), [tw, th, td] = P.torso.scale, headH = P.head.scale[1];
  for (const side of ["L", "R"]) {
    const leg = new THREE.Group(); leg.position.set((side === "L" ? 1 : -1) * tw / 4, legH, 0);
    const lm = mesh("leg" + side); lm.position.y = -P["leg" + side].scale[1] / 2; leg.add(lm); root.add(leg); rig["leg" + side] = leg;
    const arm = new THREE.Group(); const aw = P["arm" + side].scale[0];
    arm.position.set((side === "L" ? 1 : -1) * (tw / 2 + aw / 2 + 0.03), legH + th - 0.08, 0);
    const am = mesh("arm" + side); am.position.y = -P["arm" + side].scale[1] / 2 + 0.08; arm.add(am); root.add(arm); rig["arm" + side] = arm;
  }
  const torso = mesh("torso"); torso.position.y = legH + th / 2; root.add(torso);
  const head = mesh("head"); head.position.y = legH + th + headH / 2; root.add(head); rig.head = head;
  let height = legH + th + headH;
  if (P.hat.shape !== "none") { const hat = mesh("hat"); hat.position.y = height + P.hat.scale[1] / 2 - 0.04; root.add(hat); height += P.hat.scale[1] * 0.9; }
  if (P.back.shape !== "none") { const b = mesh("back"); b.position.set(0, legH + th * 0.55, -(td / 2 + P.back.scale[2] / 2)); root.add(b); }
  const body = new THREE.Group(); body.add(root);
  return { body, root, rig, height: clamp(height, 1.2, 4.5) };
}
function disposeTree(obj) { obj.traverse(o => { if (o.isSprite) { o.material.map?.dispose(); o.material.dispose(); } else if (o.material && !o.isMesh) o.material.dispose?.(); }); }
function buildAvatar(char, world = scene) {
  const av = char.base !== "blocks" ? buildModelAvatar(char) : buildBlockAvatar(char);
  if (char.pet) av.pet = buildPet(char.pet, world);
  return av;
}
function disposeAvatar(av) {
  if (!av) return; av.disposed = true;
  av.body.parent?.remove(av.body); av.mixer?.stopAllAction(); disposeTree(av.body);
  if (av.pet) { av.pet.disposed = true; av.pet.world.remove(av.pet.group); av.pet.mixer?.stopAllAction(); }
}
// Hats and backpacks from the block editor can be worn on Kenney characters too.
function attachAccessories(char, root, top) {
  const P = char.parts; let height = top;
  const mk = k => { const p = P[k]; const m = new THREE.Mesh(GEO[p.shape], avatarMaterial(p)); m.scale.set(...p.scale); m.castShadow = true; return m; };
  if (P.hat.shape !== "none") { const hat = mk("hat"); hat.position.y = top + P.hat.scale[1] / 2 - 0.1; root.add(hat); height += P.hat.scale[1] * 0.9; }
  if (P.back.shape !== "none") { const b = mk("back"); b.position.set(0, top * 0.55, -0.3 - P.back.scale[2] / 2); root.add(b); }
  return height;
}
function buildModelAvatar(char) {
  const body = new THREE.Group(), root = new THREE.Group(); body.add(root);
  const [sw, sh] = char.size, top = 1.8 * sh;
  const av = { body, root, rig: null, isModel: true, height: top, mixer: null, actions: {}, cur: "" };
  av.height = clamp(attachAccessories(char, root, top), 1.2, 4.5);
  loadModel(char.base).then(g => {
    if (av.disposed) return;
    const inst = SkeletonUtils.clone(g.scene), s = top / g.size.y;
    inst.scale.set(s * sw, s, s * sw); inst.position.y = -g.min.y * s;
    if (char.tint) inst.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.set(char.tint); } });
    root.add(inst); av.model = inst;
    av.mixer = new THREE.AnimationMixer(inst);
    for (const clip of g.animations) av.actions[clip.name] = av.mixer.clipAction(clip);
    playAnim(av, "idle");
  }).catch(() => {});
  return av;
}
// Animation names differ a little between Kenney packs, so each state lists what to try in order.
const ANIM_FALLBACK = { idle: ["idle"], walk: ["walk"], sprint: ["sprint", "run", "walk"], run: ["run", "sprint", "walk"], jump: ["jump", "walk"], fall: ["fall", "idle"], sit: ["sit", "idle"], wave: ["emote-yes", "interact-right", "idle"], dance: ["dance", "emote-yes", "idle"] };
function playAnim(av, name) {
  if (!av.mixer) return;
  const pick = (ANIM_FALLBACK[name] || [name]).find(n => av.actions[n]) || "idle";
  if (av.cur === pick || !av.actions[pick]) return;
  const next = av.actions[pick], prev = av.actions[av.cur];
  next.reset(); next.setLoop(pick === "jump" ? THREE.LoopOnce : THREE.LoopRepeat); next.clampWhenFinished = true; next.fadeIn(0.18).play();
  if (prev) prev.fadeOut(0.18);
  av.cur = pick;
}
function buildPet(key, world) {
  const group = new THREE.Group(); world.add(group);
  const pet = { key, group, world, mixer: null, actions: {}, cur: "", pos: new THREE.Vector3(), yaw: 0, placed: false };
  loadModel(key).then(g => {
    if (pet.disposed) return;
    const inst = SkeletonUtils.clone(g.scene), s = 0.8 / g.size.y;
    inst.scale.setScalar(s); inst.position.y = -g.min.y * s; group.add(inst);
    pet.mixer = new THREE.AnimationMixer(inst);
    for (const clip of g.animations) pet.actions[clip.name] = pet.mixer.clipAction(clip);
    playAnim(pet, "idle");
  }).catch(() => {});
  return pet;
}
const UP = new THREE.Vector3(0, 1, 0);
// Pets trot to a spot just behind and beside their owner, and catch up by teleporting if left far behind.
function updatePet(pet, ownerPos, ownerYaw, dt) {
  if (!pet) return;
  const target = ownerPos.clone().add(new THREE.Vector3(0.9, 0, -1.1).applyAxisAngle(UP, ownerYaw));
  if (!pet.placed || pet.pos.distanceTo(target) > 14) { pet.pos.copy(target); pet.placed = true; }
  const d = target.clone().sub(pet.pos); d.y = 0; const dist = d.length();
  const speed = dist > 4 ? 9 : dist > 0.45 ? 5 : 0;
  if (speed) { pet.pos.addScaledVector(d.normalize(), Math.min(dist, speed * dt)); pet.yaw = Math.atan2(d.x, d.z); }
  pet.pos.y += (ownerPos.y - pet.pos.y) * Math.min(1, dt * 8);
  pet.group.position.copy(pet.pos);
  let dy = pet.yaw - pet.group.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); pet.group.rotation.y += dy * Math.min(1, dt * 10);
  playAnim(pet, speed > 6 ? "run" : speed ? "walk" : "idle");
  pet.mixer?.update(dt);
}
// One entry point for both body types: block bodies swing procedurally, Kenney characters play their clips.
function animateAv(av, t, dt, state, emote) {
  if (!av.isModel) return animateRig(av, t, state === "walk" || state === "sprint", emote);
  av.root.position.y = 0; av.root.rotation.set(0, 0, 0);
  let name = state;
  const k = emote ? (performance.now() - emote.at) / 1000 : Infinity;
  if (emote && k <= emote.dur) {
    if (emote.e === "wave") name = "wave";
    if (emote.e === "sit") name = "sit";
    if (emote.e === "dance") { name = "dance"; av.root.rotation.y = k * 6; av.root.position.y = Math.abs(Math.sin(k * 10)) * 0.3; }
    if (emote.e === "flip") { av.root.position.y = Math.sin(Math.min(1, k / 0.8) * Math.PI) * 1.6; av.root.rotation.x = -Math.min(1, k / 0.8) * Math.PI * 2; }
  }
  playAnim(av, name); av.mixer?.update(dt);
}

/* Animate a rig: walking swings arms and legs; emotes override it for a moment. */
function animateRig(av, t, moving, emote) {
  const r = av.rig, swing = moving ? Math.sin(t * 9) * 0.7 : 0;
  r.legL.rotation.x = swing; r.legR.rotation.x = -swing; r.armL.rotation.x = -swing * .8; r.armR.rotation.x = swing * .8;
  r.armL.rotation.z = 0; r.armR.rotation.z = 0; av.root.position.y = 0; av.root.rotation.set(0, 0, 0);
  if (!emote) return;
  const k = (performance.now() - emote.at) / 1000;
  if (k > emote.dur) return;
  if (emote.e === "wave") { r.armR.rotation.z = -2.6 + Math.sin(k * 14) * 0.4; r.armR.rotation.x = 0; }
  if (emote.e === "dance") { av.root.rotation.y = k * 6; av.root.position.y = Math.abs(Math.sin(k * 10)) * 0.3; r.armL.rotation.z = 2.4; r.armR.rotation.z = -2.4; }
  if (emote.e === "flip") { av.root.position.y = Math.sin(Math.min(1, k / 0.8) * Math.PI) * 1.6; av.root.rotation.x = -Math.min(1, k / 0.8) * Math.PI * 2; }
  if (emote.e === "sit") { av.root.position.y = -0.45; r.legL.rotation.x = r.legR.rotation.x = -1.5; r.armL.rotation.x = r.armR.rotation.x = -0.4; }
}
const EMOTE_TIME = { wave: 2.2, dance: 4, flip: 0.8, sit: 9999 };

/* ============================== builds ============================== */
function cleanPart(p) {
  if (!p || typeof p !== "object") return null;
  const s = Array.isArray(p.s) ? p.s : [1, 1, 1], pos = Array.isArray(p.p) ? p.p : [0, 0.5, 0];
  // Model parts (Kenney furniture and nature) scale evenly, so their size is one number repeated.
  const isModel = p.shape === "model" && MODEL_PARTS.includes(p.model), k = num(s[0], 1, 0.25, 6);
  return {
    id: text(p.id, 12) || rid(),
    shape: isModel ? "model" : PART_SHAPES.includes(p.shape) ? p.shape : "box",
    model: isModel ? p.model : "",
    p: [num(pos[0], 0, -PLOT_HALF, PLOT_HALF), num(pos[1], .5, 0, MAX_Y), num(pos[2], 0, -PLOT_HALF, PLOT_HALF)],
    s: isModel ? [k, k, k] : [0, 1, 2].map(i => num(s[i], 1, 0.25, 30)),
    r: Math.round(num(p.r, 0, 0, 3)),
    c: hex(p.c, "#f6edda"),
    m: MATERIALS.includes(p.m) ? p.m : "solid",
    solid: p.solid !== false,
    name: text(p.name, 24), text: text(p.text, 60), script: text(p.script, 2000).replace(/\u0000/g, "")
  };
}
const builds = new Map(); // ownerId -> { owner, plot, parts:Map, meshes:Map, group, state:Map(runtime overlay), prog:Map(compiled scripts), timers }
function getBuild(owner) {
  let b = builds.get(owner);
  if (!b) { b = { owner, plot: -1, parts: new Map(), meshes: new Map(), group: new THREE.Group(), state: new Map(), prog: new Map(), timers: new Map() }; scene.add(b.group); builds.set(owner, b); }
  return b;
}
function placeBuildGroup(b) { if (b.plot < 0) { b.group.visible = false; return; } b.group.visible = true; b.group.position.copy(plotOrigin(b.plot)); }
const matCache = new Map();
function partMaterial(c, m, ghost, twoSided) {
  const key = c + m + (ghost ? "g" : "") + (twoSided ? "2" : "");
  if (matCache.has(key)) return matCache.get(key);
  let mat;
  if (ghost || m === "glass") mat = new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: ghost ? 0.22 : 0.38, roughness: .1, metalness: .1, depthWrite: false });
  else if (m === "neon") mat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.1, roughness: .4 });
  else if (m === "metal") mat = new THREE.MeshStandardMaterial({ color: c, metalness: .85, roughness: .28 });
  else if (m === "grid") mat = new THREE.MeshStandardMaterial({ color: c, map: TEX.grid, roughness: .8 });
  else mat = new THREE.MeshStandardMaterial({ color: c, roughness: .78 });
  if (twoSided) mat.side = THREE.DoubleSide; // the hand-built wedge mesh is drawn from both sides
  matCache.set(key, mat); return mat;
}
function stateOf(b, id) { let s = b.state.get(id); if (!s) { s = { open: false, lit: false, hidden: false, c: null, off: [0, 0, 0], spin: 0, tween: null }; b.state.set(id, s); } return s; }
// The real size of a part in blocks: model parts take their size from the model times their scale.
function partSize(p) {
  if (p.shape !== "model") return p.s;
  const sz = MODEL_SIZE.get(p.model); if (!sz) loadModel(p.model).catch(() => {});
  return sz ? [sz.x * p.s[0], sz.y * p.s[0], sz.z * p.s[0]] : [p.s[0], p.s[0], p.s[0]];
}
function makePartObject(b, part) {
  let obj;
  if (part.shape === "model") {
    obj = new THREE.Group(); obj.userData = { kind: "model:" + part.model };
    loadModel(part.model).then(g => {
      if (b.meshes.get(part.id) !== obj) return;
      const inst = g.scene.clone(); inst.position.copy(g.center).multiplyScalar(-1);
      inst.traverse(o => { if (o.isMesh) o.userData = { owner: b.owner, pid: part.id }; });
      obj.add(inst); const cur = b.parts.get(part.id); if (cur) refreshMesh(b, cur);
    }).catch(() => {});
  } else { obj = new THREE.Mesh(GEO[part.shape]); obj.castShadow = obj.receiveShadow = true; obj.userData = { kind: "prim" }; }
  obj.userData.owner = b.owner; obj.userData.pid = part.id;
  b.group.add(obj); b.meshes.set(part.id, obj); return obj;
}
function detachPartObject(b, id) {
  const mesh = b.meshes.get(id); if (!mesh) return;
  if (mesh.userData.light) { mesh.userData.light.dispose(); litCount--; }
  if (mesh.userData.sign) b.group.remove(mesh.userData.sign);
  b.group.remove(mesh); b.meshes.delete(id);
}
function refreshMesh(b, part) {
  let mesh = b.meshes.get(part.id);
  const kind = part.shape === "model" ? "model:" + part.model : "prim";
  if (mesh && mesh.userData.kind !== kind) { detachPartObject(b, part.id); mesh = null; }
  if (!mesh) mesh = makePartObject(b, part);
  const st = stateOf(b, part.id), size = partSize(part);
  if (kind === "prim") {
    mesh.geometry = GEO[part.shape];
    mesh.material = partMaterial(st.c || part.c, st.lit ? "neon" : part.m, st.open, part.shape === "wedge");
  }
  mesh.position.set(part.p[0] + st.off[0], part.p[1] + st.off[1], part.p[2] + st.off[2]);
  mesh.scale.set(...part.s);
  mesh.rotation.set(0, part.r * Math.PI / 2 + st.spin * Math.PI / 180, 0);
  mesh.visible = !st.hidden;
  // Lit parts get a real light, capped so big builds stay fast.
  if (st.lit && !mesh.userData.light && litCount < 12) { const l = new THREE.PointLight(st.c || part.c, 6, 12); mesh.add(l); mesh.userData.light = l; litCount++; }
  if (!st.lit && mesh.userData.light) { mesh.remove(mesh.userData.light); mesh.userData.light.dispose(); mesh.userData.light = null; litCount--; }
  // Signs: parts with text show it floating above them.
  if (part.text && (!mesh.userData.sign || mesh.userData.sign.userData.label !== part.text)) {
    if (mesh.userData.sign) b.group.remove(mesh.userData.sign);
    const s = makeLabel(part.text); b.group.add(s); mesh.userData.sign = s;
  }
  if (!part.text && mesh.userData.sign) { b.group.remove(mesh.userData.sign); mesh.userData.sign = null; }
  if (mesh.userData.sign) mesh.userData.sign.position.set(mesh.position.x, part.p[1] + size[1] / 2 + 0.6 + st.off[1], mesh.position.z);
  collidersDirty = true;
}
let litCount = 0;
function removeMesh(b, id) {
  detachPartObject(b, id); b.state.delete(id); b.prog.delete(id); stopTimers(b, id); collidersDirty = true;
}
// Raycasts hit the meshes inside model groups; walk up to whatever carries the part id.
function hitPartData(hit) { let o = hit?.object; while (o && o.userData.pid === undefined) o = o.parent; return o?.userData; }
function setParts(b, list) {
  for (const id of [...b.parts.keys()]) removeMesh(b, id);
  b.parts.clear();
  for (const raw of (list || []).slice(0, MAX_PARTS)) { const p = cleanPart(raw); if (p) { b.parts.set(p.id, p); compilePart(b, p); refreshMesh(b, p); } }
  if (b.owner === me.id) startBuildScripts(b);
}
function applyOp(b, op) {
  if (op.t === "add") { if (b.parts.size >= MAX_PARTS) return; const p = cleanPart(op.part); if (!p) return; b.parts.set(p.id, p); compilePart(b, p); refreshMesh(b, p); if (b.owner === me.id) startPartScripts(b, p); }
  else if (op.t === "del") { b.parts.delete(op.pid); removeMesh(b, op.pid); }
  else if (op.t === "upd") { const old = b.parts.get(op.pid); if (!old) return; const p = cleanPart({ ...old, ...op.props, id: old.id }); b.parts.set(p.id, p); if (old.script !== p.script) { stopTimers(b, p.id); compilePart(b, p); if (b.owner === me.id) startPartScripts(b, p); } refreshMesh(b, p); }
  else if (op.t === "load") setParts(b, op.parts);
}

/* ============================== collision ============================== */
let colliders = [], touchables = [], collidersDirty = true;
function rebuildColliders() {
  colliders = []; touchables = [];
  for (const b of builds.values()) {
    if (b.plot < 0) continue;
    const o = plotOrigin(b.plot);
    for (const p of b.parts.values()) {
      const st = stateOf(b, p.id);
      if (st.hidden) continue;
      const sz = partSize(p), quarter = p.r % 2 === 1, hx = (quarter ? sz[2] : sz[0]) / 2, hz = (quarter ? sz[0] : sz[2]) / 2, hy = sz[1] / 2;
      const cx = o.x + p.p[0] + st.off[0], cy = p.p[1] + st.off[1], cz = o.z + p.p[2] + st.off[2];
      const box = { b, p, min: [cx - hx, cy - hy, cz - hz], max: [cx + hx, cy + hy, cz + hz], wedge: p.shape === "wedge", dir: [[0, 1], [1, 0], [0, -1], [-1, 0]][p.r] };
      if (p.solid && !st.open) colliders.push(box);
      const prog = b.prog.get(p.id);
      if (prog && prog.touch.length) touchables.push(box);
    }
  }
  collidersDirty = false;
}
function overlaps(pos, w, h, box, pad = 0) {
  return pos.x + w + pad > box.min[0] && pos.x - w - pad < box.max[0] && pos.z + w + pad > box.min[2] && pos.z - w - pad < box.max[2] && pos.y + h + pad > box.min[1] && pos.y - pad < box.max[1];
}
function wedgeHeight(box, x, z) {
  const cx = (box.min[0] + box.max[0]) / 2, cz = (box.min[2] + box.max[2]) / 2;
  const len = box.dir[0] ? box.max[0] - box.min[0] : box.max[2] - box.min[2];
  const t = clamp(((x - cx) * box.dir[0] + (z - cz) * box.dir[1]) / len + 0.5, 0, 1);
  return box.min[1] + t * (box.max[1] - box.min[1]);
}

/* ============================== local player ============================== */
const P = { pos: SPAWN.clone(), vel: new THREE.Vector3(), yaw: 0, onGround: true, w: 0.32, checkpoint: null, emote: null, av: null, tag: null, lastStep: 0 };
function wearCharacter(char, broadcast = true) {
  me.char = cleanChar(char);
  disposeAvatar(P.av);
  P.av = buildAvatar(me.char); scene.add(P.av.body);
  P.tag = makeLabel(me.name, "#fff3c4"); P.tag.position.y = P.av.height + 0.45; P.av.body.add(P.tag);
  try { localStorage.setItem("dougworld-char", JSON.stringify(me.char)); } catch (e) { toast("This character is too big to autosave on this device."); }
  if (broadcast) send("char", { id: me.id, char: me.char });
}
const keys = new Set();
let joyVec = { x: 0, y: 0 }, jumpQueued = false;
function respawn() { const cp = P.checkpoint; P.pos.copy(cp || SPAWN); P.pos.y = (cp ? cp.y : 0) + 0.2; P.vel.set(0, 0, 0); }
function moveAxis(axis, d, h) {
  P.pos[axis] += d;
  for (const box of colliders) {
    if (!overlaps(P.pos, P.w, h, box)) continue;
    if (box.wedge) continue;
    if (axis === "y") {
      if (d <= 0) { P.pos.y = box.max[1]; P.vel.y = 0; P.onGround = true; } else { P.pos.y = box.min[1] - h; P.vel.y = 0; }
    } else {
      // Step up onto anything under half a block tall, so stairs and kerbs just work.
      if (box.max[1] - P.pos.y <= 0.55 && P.vel.y <= 0.1) { P.pos.y = box.max[1]; continue; }
      if (d > 0) P.pos[axis] = (axis === "x" ? box.min[0] : box.min[2]) - P.w - 0.001; else P.pos[axis] = (axis === "x" ? box.max[0] : box.max[2]) + P.w + 0.001;
      P.vel[axis] = 0;
    }
  }
}
function updatePlayer(dt, t) {
  if (collidersDirty) rebuildColliders();
  const h = P.av ? Math.max(1.2, P.av.height - 0.1) : 1.8;
  const typing = document.activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName);
  let fx = 0, fz = 0;
  if (!typing) { if (keys.has("KeyW") || keys.has("ArrowUp")) fz += 1; if (keys.has("KeyS") || keys.has("ArrowDown")) fz -= 1; if (keys.has("KeyA") || keys.has("ArrowLeft")) fx -= 1; if (keys.has("KeyD") || keys.has("ArrowRight")) fx += 1; }
  fx += joyVec.x; fz += joyVec.y;
  const len = Math.hypot(fx, fz); if (len > 1) { fx /= len; fz /= len; }
  const sin = Math.sin(cam.yaw), cos = Math.cos(cam.yaw);
  const dx = fx * cos - fz * sin, dz = -fx * sin - fz * cos;
  const speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 11 : 7;
  const k = 1 - Math.exp(-12 * dt);
  P.vel.x += (dx * speed - P.vel.x) * k; P.vel.z += (dz * speed - P.vel.z) * k;
  const moving = Math.hypot(dx, dz) > 0.1;
  if (moving) { P.yaw = Math.atan2(dx, dz); if (P.emote && P.emote.e === "sit") P.emote = null; }
  if ((jumpQueued || (!typing && keys.has("Space"))) && P.onGround) { P.vel.y = 11; P.onGround = false; if (P.emote?.e === "sit") P.emote = null; }
  jumpQueued = false;
  P.vel.y = Math.max(-50, P.vel.y - 30 * dt);
  P.onGround = false;
  moveAxis("x", P.vel.x * dt, h); moveAxis("z", P.vel.z * dt, h); moveAxis("y", P.vel.y * dt, h);
  for (const box of colliders) if (box.wedge && P.pos.x > box.min[0] && P.pos.x < box.max[0] && P.pos.z > box.min[2] && P.pos.z < box.max[2]) {
    const surf = wedgeHeight(box, P.pos.x, P.pos.z);
    if (P.pos.y < surf && P.pos.y > box.min[1] - 0.2 && surf - P.pos.y < 0.9) { P.pos.y = surf; if (P.vel.y < 0) P.vel.y = 0; P.onGround = true; }
  }
  if (Math.abs(P.pos.x) < 150 && Math.abs(P.pos.z) < 150 && P.pos.y <= 0) { P.pos.y = 0; if (P.vel.y < 0) P.vel.y = 0; P.onGround = true; }
  if (P.pos.y < -30) { respawn(); toast("Whoops! Back to your checkpoint."); }
  // Touch triggers fire once each time you step onto or into a part.
  const now = performance.now();
  for (const box of touchables) {
    const inside = overlaps(P.pos, P.w, h, box, 0.08), key = box.b.owner + ":" + box.p.id;
    if (inside && !touching.has(key)) { touching.add(key); fire(box.b, box.p, "touch"); }
    else if (!inside && touching.has(key) && now - (touchLeft.get(key) || 0) > 0) { touching.delete(key); }
  }
  if (P.av) {
    P.av.body.position.copy(P.pos);
    const cur = P.av.body.rotation.y; let diff = P.yaw - cur; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    P.av.body.rotation.y = cur + diff * Math.min(1, dt * 14);
    P.anim = !P.onGround ? (P.vel.y > 0 ? "jump" : "fall") : moving ? (speed > 7 ? "sprint" : "walk") : "idle";
    animateAv(P.av, t, dt, P.anim, P.emote);
    updatePet(P.av.pet, P.pos, P.yaw, dt);
    P.tag.position.y = P.av.height + 0.45;
  }
  netState(moving);
  gameTick(dt);
}
const touching = new Set(), touchLeft = new Map();

/* ============================== camera & input ============================== */
const cam = { yaw: Math.PI, pitch: 0.42, dist: 9 };
function updateCamera() {
  const h = P.av ? P.av.height * 0.85 : 1.6;
  const target = new THREE.Vector3(P.pos.x, P.pos.y + h, P.pos.z);
  const off = new THREE.Vector3(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch)).multiplyScalar(cam.dist);
  camera.position.copy(target).add(off); if (camera.position.y < 0.4) camera.position.y = 0.4;
  camera.lookAt(target);
  sun.position.set(P.pos.x + 30, 60, P.pos.z + 20); sun.target.position.copy(P.pos);
}
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();
addEventListener("keydown", e => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
  keys.add(e.code);
  if (e.code === "Space") e.preventDefault();
  if (!started) return;
  if (e.code === "KeyB") toggleBuild();
  if (e.code === "KeyR" && build.on) { brush.r = (brush.r + 1) % 4; updateGhost(); }
  if (e.code === "KeyZ" && (e.ctrlKey || e.metaKey)) undo();
  if (e.code === "Escape") { closeAllModals(); if (build.on) selectPart(null); }
  if (e.code === "KeyT") toggleQuick();
  if (/^Digit[1-4]$/.test(e.code)) emote(["wave", "dance", "flip", "sit"][+e.code.slice(5) - 1]);
});
addEventListener("keyup", e => keys.delete(e.code));
addEventListener("blur", () => keys.clear());
let drag = null;
canvas.addEventListener("contextmenu", e => e.preventDefault());
canvas.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, button: e.button, moved: 0, id: e.pointerId }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener("pointermove", e => {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (build.on) updateGhost();
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
  if (drag.button === 2 || drag.moved > 6 || e.pointerType === "touch") { cam.yaw -= dx * 0.006; cam.pitch = clamp(cam.pitch + dy * 0.005, -0.2, 1.35); }
});
canvas.addEventListener("pointerup", e => {
  if (!drag) return;
  const click = drag.moved <= 6 && drag.button !== 2; drag = null;
  if (!click) return;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (build.on) buildClick(e); else worldClick();
});
canvas.addEventListener("wheel", e => { cam.dist = clamp(cam.dist + Math.sign(e.deltaY) * 1.2, 3, 30); }, { passive: true });
const pointer = new THREE.Vector2(), ray = new THREE.Raycaster();
function partMeshes(owner) { const out = []; for (const b of builds.values()) if (!owner || b.owner === owner) out.push(...b.meshes.values()); return out.filter(m => m.visible); }
function worldClick() {
  ray.setFromCamera(pointer, camera);
  const hit = ray.intersectObjects(partMeshes(), true)[0];
  if (!hit || hit.distance > 40) return;
  const { owner, pid } = hitPartData(hit) || {}, b = builds.get(owner), p = b?.parts.get(pid);
  if (p) fire(b, p, "click");
}
// Touch joystick + jump for phones and tablets.
if (matchMedia("(pointer:coarse)").matches) {
  $("joy").classList.remove("hidden"); $("jumpBtn").classList.remove("hidden");
  const joy = $("joy"), knob = joy.querySelector("i");
  const moveJoy = e => { const r = joy.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2); const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } joyVec = { x, y: -y }; knob.style.transform = `translate(${x * 34}px,${y * 34}px)`; };
  joy.addEventListener("pointerdown", e => { joy.setPointerCapture(e.pointerId); moveJoy(e); });
  joy.addEventListener("pointermove", e => { if (joy.hasPointerCapture(e.pointerId)) moveJoy(e); });
  const stop = () => { joyVec = { x: 0, y: 0 }; knob.style.transform = ""; };
  joy.addEventListener("pointerup", stop); joy.addEventListener("pointercancel", stop);
  $("jumpBtn").addEventListener("pointerdown", () => { jumpQueued = true; });
}

/* ============================== sound ============================== */
let audio = null;
function sound(kind) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const notes = { ding: [[880, .08], [1320, .14]], beep: [[660, .1]], honk: [[420, .16]], boom: [[90, .35]], win: [[523, .1], [659, .1], [784, .1], [1046, .2]] }[kind] || [[600, .1]];
    let t = audio.currentTime;
    for (const [f, d] of notes) {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = kind === "honk" ? "sawtooth" : kind === "boom" ? "triangle" : "square"; o.frequency.setValueAtTime(f, t);
      if (kind === "boom") o.frequency.exponentialRampToValueAtTime(30, t + d);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.12, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + d + .02); t += d * .9;
    }
  } catch (e) { /* sound is optional */ }
}

/* ============================== scripting ==============================
   Lines look like:  on click: toggle; sound ding
   Triggers: on click | on touch | on start | on signal NAME | every N s
   Everything runs inside the game; scripts cannot reach the page, the network or your account. */
const COLOR_NAMES = { red: "#e05a4f", orange: "#f28c28", yellow: "#f7c948", green: "#5fae4e", teal: "#2bb3a3", blue: "#3a8fb7", purple: "#8a5cc9", pink: "#d96aa7", white: "#ffffff", black: "#26283b", gray: "#9aa1ad", grey: "#9aa1ad", brown: "#8b5a3c", gold: "#f2b705" };
const SOUNDS = ["ding", "beep", "honk", "boom", "win"];
function parseAction(raw) {
  const tok = raw.trim().split(/\s+/); const cmd = (tok[0] || "").toLowerCase(), a = tok.slice(1);
  const n = (i, lo, hi, d) => { const v = Number(a[i]); if (a[i] === undefined) { if (d === undefined) throw `"${cmd}" needs a number`; return d; } if (!Number.isFinite(v)) throw `"${a[i]}" is not a number`; return clamp(v, lo, hi); };
  switch (cmd) {
    case "say": return { cmd, text: text(a.join(" "), 80) || "..." };
    case "toggle": case "open": case "close": case "hide": case "show": case "checkpoint": case "respawn": return { cmd };
    case "light": { const v = (a[0] || "toggle").toLowerCase(); if (!["on", "off", "toggle"].includes(v)) throw `light needs on, off or toggle`; return { cmd, v }; }
    case "color": case "colour": { const c = (a[0] || "").toLowerCase(); const v = COLOR_NAMES[c] || (isHex(c) ? c : null); if (!v) throw `unknown colour "${a[0] || ""}"`; return { cmd: "color", v }; }
    case "move": return { cmd, d: [n(0, -20, 20), n(1, -20, 20), n(2, -20, 20)], t: n(3, .05, 10, 1) };
    case "spin": return { cmd, deg: n(0, -3600, 3600), t: n(1, .05, 20, .6) };
    case "teleport": {
      if ((a[0] || "").toLowerCase() === "to") { const name = text(a.slice(1).join(" "), 24); if (!name) throw "teleport to needs a part name"; return { cmd, to: name }; }
      return { cmd, p: [n(0, -PLOT_HALF, PLOT_HALF), n(1, 0, MAX_Y), n(2, -PLOT_HALF, PLOT_HALF)] };
    }
    case "launch": return { cmd, v: n(0, 0, 60, 18) };
    case "score": return { cmd, v: Math.round(n(0, -100, 100, 1)) };
    case "sound": { const s = (a[0] || "ding").toLowerCase(); if (!SOUNDS.includes(s)) throw `sound can be ${SOUNDS.join(", ")}`; return { cmd, v: s }; }
    case "send": { const s = text(a[0], 24).toLowerCase(); if (!s) throw "send needs a signal name"; return { cmd, v: s }; }
    case "wait": return { cmd, v: n(0, 0, 30) };
    default: throw `unknown command "${cmd}"`;
  }
}
function compile(src) {
  const prog = { click: [], touch: [], start: [], signal: {}, every: [], errors: [] };
  String(src || "").split(/\r?\n/).slice(0, 40).forEach((line, i) => {
    line = line.trim(); if (!line || line.startsWith("#") || line.startsWith("//")) return;
    try {
      let m, actions;
      const parseList = s => s.split(";").filter(x => x.trim()).slice(0, 20).map(parseAction);
      if ((m = /^on\s+(click|touch|start)\s*:\s*(.+)$/i.exec(line))) { actions = parseList(m[2]); prog[m[1].toLowerCase()].push(actions); }
      else if ((m = /^on\s+signal\s+([\w-]{1,24})\s*:\s*(.+)$/i.exec(line))) { const k = m[1].toLowerCase(); (prog.signal[k] = prog.signal[k] || []).push(parseList(m[2])); }
      else if ((m = /^every\s+([\d.]+)\s*s?\s*:\s*(.+)$/i.exec(line))) { prog.every.push({ secs: clamp(Number(m[1]) || 1, 0.5, 600), actions: parseList(m[2]) }); }
      else throw `start the line with "on click:", "on touch:", "on start:", "on signal NAME:" or "every 2s:"`;
    } catch (err) { prog.errors.push(`Line ${i + 1}: ${err}`); }
  });
  return prog;
}
function compilePart(b, p) { if (p.script.trim()) b.prog.set(p.id, compile(p.script)); else b.prog.delete(p.id); }
function fire(b, p, trigger, signal) {
  const prog = b.prog.get(p.id); if (!prog) return;
  const lists = trigger === "signal" ? prog.signal[signal] || [] : prog[trigger];
  for (const actions of lists) run(b, p, actions);
}
async function run(b, p, actions) {
  for (const act of actions) {
    if (!b.parts.has(p.id) || !builds.has(b.owner)) return;
    const st = stateOf(b, p.id);
    switch (act.cmd) {
      case "say": partBubble(b, p.id, act.text); send("say", { o: b.owner, pid: p.id, text: act.text }); break;
      case "toggle": setState(b, p, { open: !st.open }); break;
      case "open": setState(b, p, { open: true }); break;
      case "close": setState(b, p, { open: false }); break;
      case "hide": setState(b, p, { hidden: true }); break;
      case "show": setState(b, p, { hidden: false }); break;
      case "light": setState(b, p, { lit: act.v === "toggle" ? !st.lit : act.v === "on" }); break;
      case "color": setState(b, p, { c: act.v }); break;
      case "move": setState(b, p, { off: [st.off[0] + act.d[0], st.off[1] + act.d[1], st.off[2] + act.d[2]] }, act.t); await sleep(act.t * 1000); break;
      case "spin": setState(b, p, { spin: st.spin + act.deg }, act.t); await sleep(act.t * 1000); break;
      case "teleport": {
        const o = plotOrigin(b.plot); let target = null;
        if (act.to) { const dest = [...b.parts.values()].find(x => x.name.toLowerCase() === act.to.toLowerCase()); if (dest) target = new THREE.Vector3(o.x + dest.p[0], dest.p[1] + partSize(dest)[1] / 2 + 0.1, o.z + dest.p[2]); else toast(`No part named "${act.to}" to teleport to.`); }
        else target = new THREE.Vector3(o.x + act.p[0], act.p[1], o.z + act.p[2]);
        if (target) { P.pos.copy(target); P.vel.set(0, 0, 0); sound("beep"); }
        break;
      }
      case "launch": P.vel.y = act.v; P.onGround = false; break;
      case "score": me.points += act.v; send("pts", { id: me.id, v: me.points }); renderPlayers(); if (act.v > 0) toast(`+${act.v} point${act.v === 1 ? "" : "s"}`); break;
      case "checkpoint": { const o = plotOrigin(b.plot); P.checkpoint = new THREE.Vector3(o.x + p.p[0], p.p[1] + partSize(p)[1] / 2, o.z + p.p[2]); toast("Checkpoint saved!"); break; }
      case "respawn": respawn(); break;
      case "sound": sound(act.v); break;
      case "send": for (const other of b.parts.values()) if (b.prog.get(other.id)?.signal[act.v]) fire(b, other, "signal", act.v); break;
      case "wait": await sleep(act.v * 1000); break;
    }
  }
}
// Runtime changes (doors opening, lights, moving platforms) are shared live but never saved into the build.
function setState(b, p, props, tween = 0, remote = false) {
  const st = stateOf(b, p.id);
  if (tween && (props.off || props.spin !== undefined)) {
    st.tween = { from: { off: [...st.off], spin: st.spin }, to: { off: props.off || st.off, spin: props.spin ?? st.spin }, t0: performance.now(), dur: tween * 1000 };
    delete props.off; delete props.spin;
  }
  Object.assign(st, props); refreshMesh(b, p);
  if (!remote) send("pstate", { o: b.owner, pid: p.id, props: { ...props, ...(st.tween ? { off: st.tween.to.off, spin: st.tween.to.spin } : {}) }, tw: tween });
}
function tickTweens() {
  const now = performance.now();
  for (const b of builds.values()) for (const [id, st] of b.state) {
    if (!st.tween) continue; const p = b.parts.get(id); if (!p) { st.tween = null; continue; }
    const k = clamp((now - st.tween.t0) / st.tween.dur, 0, 1), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    st.off = st.tween.from.off.map((v, i) => v + (st.tween.to.off[i] - v) * e); st.spin = st.tween.from.spin + (st.tween.to.spin - st.tween.from.spin) * e;
    if (k >= 1) st.tween = null;
    refreshMesh(b, p);
  }
}
function stopTimers(b, id) { const t = b.timers.get(id); if (t) { t.forEach(clearInterval); b.timers.delete(id); } }
// Only the owner of a build runs its "every" loops and "on start" lines, so they happen once for everyone.
function startPartScripts(b, p) {
  const prog = b.prog.get(p.id); if (!prog) return;
  for (const actions of prog.start) run(b, p, actions);
  stopTimers(b, p.id);
  if (prog.every.length) b.timers.set(p.id, prog.every.map(ev => setInterval(() => run(b, p, ev.actions), ev.secs * 1000)));
}
function startBuildScripts(b) { for (const p of b.parts.values()) startPartScripts(b, p); }

/* ============================== building ============================== */
const build = { on: false, mode: "place", selected: null, undo: [], modelCat: "Furniture" };
const brush = { shape: "box", m: "solid", c: "#f28c28", s: [2, 1, 2], r: 0, solid: true, name: "", text: "", script: "" };
const ghost = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: "#5fae4e", transparent: true, opacity: .45, depthWrite: false }));
ghost.visible = false; scene.add(ghost);
const PRESETS = {
  Door: { shape: "box", s: [2, 3, 0.25], c: "#8b5a3c", m: "solid", name: "door", script: "on click: toggle; sound beep" },
  Light: { shape: "sphere", s: [0.75, 0.75, 0.75], c: "#f7c948", m: "solid", name: "lamp", script: "on click: light toggle" },
  Button: { shape: "cylinder", s: [0.75, 0.25, 0.75], c: "#e05a4f", m: "solid", name: "button", script: "on click: sound beep; send open" },
  "Jump pad": { shape: "box", s: [2, 0.25, 2], c: "#5fae4e", m: "neon", name: "jump pad", script: "on touch: launch 20; sound boom" },
  Teleporter: { shape: "cylinder", s: [2, 0.25, 2], c: "#8a5cc9", m: "neon", name: "teleporter", script: "on touch: teleport 0 12 0; sound beep" },
  Elevator: { shape: "box", s: [3, 0.5, 3], c: "#9aa1ad", m: "metal", name: "elevator", script: "on touch: wait 0.5; move 0 8 0 2; wait 3; move 0 -8 0 2" },
  Spinner: { shape: "box", s: [6, 0.5, 0.5], c: "#d96aa7", m: "solid", name: "spinner", script: "every 1s: spin 90 1" },
  Sign: { shape: "box", s: [2, 1.25, 0.25], c: "#fffaf0", m: "solid", name: "sign", text: "Welcome!", script: "" },
  Checkpoint: { shape: "box", s: [2, 0.25, 2], c: "#3a8fb7", m: "neon", name: "checkpoint", script: "on touch: checkpoint; sound ding" },
  Coin: { shape: "cylinder", s: [0.75, 0.25, 0.75], c: "#f2b705", m: "metal", name: "coin", solid: false, script: "on touch: score 1; sound ding; hide; wait 10; show\nevery 2s: spin 180 2" },
  Lava: { shape: "box", s: [4, 0.25, 4], c: "#e05a4f", m: "neon", name: "lava", script: "on touch: sound boom; respawn" }
};
function toggleBuild(force) {
  build.on = force ?? !build.on;
  if (build.on && me.plot < 0) { build.on = false; toast("All 8 plots are taken, so you can't build in this room."); }
  $("buildBar").classList.toggle("hidden", !build.on); $("buildBtn").classList.toggle("on", build.on);
  ghost.visible = false; if (!build.on) selectPart(null); else { renderBuildBar(); toast("Build mode: click to place. R rotates, Ctrl+Z undoes. Walk to your plot (look for your name)."); }
}
function myBuild() { return getBuild(me.id); }
function halfExtents(s, r) { return r % 2 ? [s[2] / 2, s[1] / 2, s[0] / 2] : [s[0] / 2, s[1] / 2, s[2] / 2]; }
function placementTarget() {
  ray.setFromCamera(pointer, camera);
  const mine = myBuild(); const hits = ray.intersectObjects([...mine.meshes.values()].filter(m => m.visible).concat(groundMesh), true);
  const hit = hits[0]; if (!hit || hit.distance > 80) return null;
  return hit;
}
function updateGhost() {
  if (!build.on || build.mode !== "place") { ghost.visible = false; return; }
  const hit = placementTarget(); if (!hit) { ghost.visible = false; return; }
  const n = hit.object === groundMesh ? new THREE.Vector3(0, 1, 0) : hit.face.normal.clone().transformDirection(hit.object.matrixWorld).round();
  const bs = partSize(brush), he = halfExtents(bs, brush.r);
  const c = hit.point.clone().add(new THREE.Vector3(n.x * he[0], n.y * he[1], n.z * he[2]));
  c.set(snap(c.x), Math.max(he[1], snap(c.y)), snap(c.z));
  const o = plotOrigin(me.plot), local = [c.x - o.x, c.y, c.z - o.z];
  const ok = Math.abs(local[0]) + he[0] <= PLOT_HALF + 0.01 && Math.abs(local[2]) + he[2] <= PLOT_HALF + 0.01 && local[1] + he[1] <= MAX_Y;
  ghost.geometry = GEO[brush.shape] || GEO.box; ghost.scale.set(...bs); ghost.rotation.set(0, brush.r * Math.PI / 2, 0); ghost.position.copy(c);
  ghost.material.color.set(ok ? brush.c : "#e05a4f"); ghost.visible = true; ghost.userData = { ok, local };
}
function myOp(op, record = true) {
  const b = myBuild();
  if (record) {
    let inverse;
    if (op.t === "add") inverse = { t: "del", pid: op.part.id };
    else if (op.t === "del") { const old = b.parts.get(op.pid); if (!old) return; inverse = { t: "add", part: { ...old } }; }
    else if (op.t === "upd") { const old = b.parts.get(op.pid); if (!old) return; inverse = { t: "upd", pid: op.pid, props: Object.fromEntries(Object.keys(op.props).map(k => [k, old[k]])) }; }
    else if (op.t === "load") inverse = { t: "load", parts: [...b.parts.values()] };
    build.undo.push(inverse); if (build.undo.length > 120) build.undo.shift();
  }
  applyOp(b, op); send("op", { id: me.id, ops: [op] }); saveCurrentBuild(); renderBuildBarCount();
}
function undo() { const inv = build.undo.pop(); if (!inv) return toast("Nothing to undo."); myOp(inv, false); if (build.selected && !myBuild().parts.has(build.selected)) selectPart(null); }
function buildClick() {
  const b = myBuild();
  if (build.mode === "place") {
    updateGhost(); if (!ghost.visible) return;
    if (!ghost.userData.ok) return toast("That's outside your plot. Build inside your coloured square.");
    if (b.parts.size >= MAX_PARTS) return toast(`Your plot is full (${MAX_PARTS} parts).`);
    const part = cleanPart({ ...brush, id: rid(), p: ghost.userData.local });
    myOp({ t: "add", part }); sound("beep");
    return;
  }
  ray.setFromCamera(pointer, camera);
  const hit = ray.intersectObjects([...b.meshes.values()], true)[0];
  if (!hit) return;
  const pid = hitPartData(hit)?.pid; if (!pid) return;
  if (build.mode === "erase") { myOp({ t: "del", pid }); if (build.selected === pid) selectPart(null); }
  else if (build.mode === "paint") myOp({ t: "upd", pid, props: { c: brush.c, m: brush.m } });
  else if (build.mode === "edit") selectPart(pid);
}
function renderBuildBarCount() { const el = $("partCount"); if (el) el.textContent = `${myBuild().parts.size}/${MAX_PARTS} parts`; }
function renderBuildBar() {
  const bar = $("buildBar");
  const seg = (items, cur, attr, label = x => x) => items.map(x => `<button class="btn sm ${x === cur ? "on" : "ghost"}" data-${attr}="${x}" type="button">${label(x)}</button>`).join("");
  bar.innerHTML = `
  <div><h4>Mode</h4><div class="seg">${seg(["place", "edit", "paint", "erase"], build.mode, "mode", x => x[0].toUpperCase() + x.slice(1))}</div>
   <h4 style="margin-top:8px">Shape</h4><div class="seg">${seg(PART_SHAPES, brush.shape, "shape")}</div>
   <h4 style="margin-top:8px">Material</h4><div class="seg">${seg(MATERIALS, brush.m, "mat")}</div></div>
  <div><h4>Colour</h4><div class="swatches" style="width:220px">${SWATCHES.map(c => `<button class="swatch ${c === brush.c ? "on" : ""}" style="background:${c}" data-color="${c}" type="button" aria-label="${c}"></button>`).join("")}</div>
   <div class="row" style="margin-top:6px"><input type="color" id="brushColor" value="${brush.c}"><span class="muted" style="font-size:12px">Custom colour</span></div></div>
  <div>${brush.shape === "model"
    ? `<h4>Model: ${esc(modelLabel(brush.model))}</h4><div class="sizes"><span>Scale</span><input type="range" min="0.25" max="6" step="0.25" value="${brush.s[0]}" data-size="model"><b>${brush.s[0]}</b></div>`
    : `<h4>Size (blocks)</h4><div class="sizes">${["Width", "Height", "Depth"].map((l, i) => `<span>${l}</span><input type="range" min="0.25" max="12" step="0.25" value="${brush.s[i]}" data-size="${i}"><b>${brush.s[i]}</b>`).join("")}</div>`}
   <h4 style="margin-top:8px">Gadgets</h4><div class="tools">${Object.keys(PRESETS).map(k => `<button class="btn sm butter" data-preset="${k}" type="button">${k}</button>`).join("")}</div>
   <h4 style="margin-top:8px">Models <span class="seg" style="display:inline-flex;margin-left:6px">${Object.keys(BUILD_MODELS).map(c => `<button class="btn sm ${c === build.modelCat ? "on" : "ghost"}" data-mcat="${c}" type="button">${c}</button>`).join("")}</span></h4>
   <div class="tools" style="max-height:92px;overflow:auto">${BUILD_MODELS[build.modelCat].map(k => `<button class="btn sm ${brush.shape === "model" && brush.model === k ? "on" : "ghost"}" data-model="${k}" type="button">${esc(modelLabel(k))}</button>`).join("")}</div></div>
  <div style="display:flex;flex-direction:column;gap:6px;align-items:stretch">
   <button class="btn sm ghost" data-act="rotate" type="button">Rotate (R)</button>
   <button class="btn sm ghost" data-act="undo" type="button">Undo</button>
   <button class="btn sm pond" data-act="houses" type="button">Save / load</button>
   <button class="btn sm berry" data-act="exit" type="button">Done</button>
   <span id="partCount" class="muted" style="font-size:11px;text-align:center"></span></div>`;
  renderBuildBarCount();
}
$("buildBar").addEventListener("click", e => {
  const t = e.target.closest("button"); if (!t) return; const d = t.dataset;
  if (d.mode) { build.mode = d.mode; if (d.mode !== "edit") selectPart(null); }
  if (d.shape) { if (brush.shape === "model") brush.s = [2, 1, 2]; brush.shape = d.shape; brush.model = ""; }
  if (d.mcat) build.modelCat = d.mcat;
  // Picking a model loads it first so the placement preview gets its real size.
  if (d.model) { Object.assign(brush, { shape: "model", model: d.model, s: [1, 1, 1], name: "", text: "", script: "", solid: true }); build.mode = "place"; loadModel(d.model).then(() => updateGhost()).catch(() => toast("That model couldn't load.")); }
  if (d.mat) brush.m = d.mat;
  if (d.color) brush.c = d.color;
  if (d.preset) { const pr = PRESETS[d.preset]; Object.assign(brush, { name: "", text: "", script: "", solid: true }, structuredClone(pr)); build.mode = "place"; toast(`${d.preset} ready: click your plot to place it. Edit it later to change its script.`); }
  if (d.act === "rotate") brush.r = (brush.r + 1) % 4;
  if (d.act === "undo") undo();
  if (d.act === "houses") openStuff("build");
  if (d.act === "exit") return toggleBuild(false);
  renderBuildBar(); updateGhost();
});
$("buildBar").addEventListener("input", e => {
  if (e.target.id === "brushColor") { brush.c = e.target.value; updateGhost(); }
  if (e.target.dataset.size === "model") { const k = +e.target.value; brush.s = [k, k, k]; e.target.nextElementSibling.textContent = e.target.value; updateGhost(); }
  else if (e.target.dataset.size) { brush.s[+e.target.dataset.size] = +e.target.value; e.target.nextElementSibling.textContent = e.target.value; updateGhost(); }
});
const SCRIPT_HELP = `on click: toggle; sound ding
on touch: launch 20
on start: say Hello!
on signal open: open
every 2s: spin 90 1

COMMANDS
say TEXT        toggle / open / close
light on|off|toggle   color red|#ff8800
move X Y Z [secs]     spin DEGREES [secs]
hide / show     teleport X Y Z
teleport to PARTNAME  launch POWER
score N         checkpoint / respawn
sound ding|beep|honk|boom|win
send SIGNAL     wait SECONDS`;
function selectPart(pid) {
  build.selected = pid; const panel = $("props");
  if (!pid) { panel.classList.add("hidden"); return; }
  const p = myBuild().parts.get(pid); if (!p) { panel.classList.add("hidden"); return; }
  panel.classList.remove("hidden");
  const prog = compile(p.script);
  panel.innerHTML = `<div class="row"><h3 style="flex:1">Edit part</h3><button class="btn sm ghost" data-p="close" type="button">×</button></div>
   <label class="field">Name (for teleport to)<input class="input" data-k="name" maxlength="24" value="${esc(p.name)}"></label>
   <label class="field">Sign text<input class="input" data-k="text" maxlength="60" value="${esc(p.text)}"></label>
   <div class="field">Position<div class="grid3">${[0, 1, 2].map(i => `<input class="input" type="number" step="0.25" data-pos="${i}" value="${p.p[i]}">`).join("")}</div></div>
   ${p.shape === "model"
    ? `<div class="field">Model: ${esc(modelLabel(p.model))}<div class="grid3"><input class="input" type="number" step="0.25" min="0.25" max="6" data-sz="model" value="${p.s[0]}" aria-label="Scale"></div></div>`
    : `<div class="field">Size<div class="grid3">${[0, 1, 2].map(i => `<input class="input" type="number" step="0.25" min="0.25" max="30" data-sz="${i}" value="${p.s[i]}">`).join("")}</div></div>
   <div class="row wrap"><input type="color" data-k="c" value="${p.c}"><select class="input" style="width:auto" data-k="m">${MATERIALS.map(m => `<option ${m === p.m ? "selected" : ""}>${m}</option>`).join("")}</select><select class="input" style="width:auto" data-k="shape">${PART_SHAPES.map(m => `<option ${m === p.shape ? "selected" : ""}>${m}</option>`).join("")}</select></div>`}
   <div class="row wrap"><button class="btn sm ghost" data-p="rot" type="button">Rotate</button><label class="chip"><input type="checkbox" data-k="solid" ${p.solid ? "checked" : ""}> Solid</label><button class="btn sm ghost" data-p="dup" type="button">Duplicate</button><button class="btn sm berry" data-p="del" type="button">Delete</button></div>
   <label class="field">Script<textarea class="input" id="scriptBox" spellcheck="false" maxlength="2000" placeholder="on click: toggle">${esc(p.script)}</textarea></label>
   <div id="scriptStatus" class="${prog.errors.length ? "err" : "ok"}">${prog.errors.length ? esc(prog.errors.join("\n")) : p.script.trim() ? "Script looks good." : "No script yet."}</div>
   <div class="row"><button class="btn sm leaf" data-p="savescript" type="button">Save script</button><button class="btn sm pond" data-p="test" type="button">Test click</button></div>
   <pre class="ref">${SCRIPT_HELP}</pre>`;
}
$("props").addEventListener("change", e => {
  const pid = build.selected, p = myBuild().parts.get(pid); if (!p) return; const t = e.target;
  if (t.dataset.k === "solid") return myOp({ t: "upd", pid, props: { solid: t.checked } });
  if (t.dataset.k) return myOp({ t: "upd", pid, props: { [t.dataset.k]: t.value } });
  if (t.dataset.pos) { const pos = [...p.p]; pos[+t.dataset.pos] = num(t.value, pos[+t.dataset.pos]); return myOp({ t: "upd", pid, props: { p: pos } }); }
  if (t.dataset.sz === "model") { const k = num(t.value, p.s[0], .25, 6); return myOp({ t: "upd", pid, props: { s: [k, k, k] } }); }
  if (t.dataset.sz) { const s = [...p.s]; s[+t.dataset.sz] = num(t.value, s[+t.dataset.sz], .25, 30); return myOp({ t: "upd", pid, props: { s } }); }
});
$("props").addEventListener("input", e => { if (e.target.id === "scriptBox") { const prog = compile(e.target.value), st = $("scriptStatus"); st.className = prog.errors.length ? "err" : "ok"; st.textContent = prog.errors.length ? prog.errors.join("\n") : "Script looks good. Press Save script."; } });
$("props").addEventListener("click", e => {
  const t = e.target.closest("button"); if (!t) return; const pid = build.selected, b = myBuild(), p = b.parts.get(pid); if (!p) return;
  const a = t.dataset.p;
  if (a === "close") selectPart(null);
  if (a === "rot") myOp({ t: "upd", pid, props: { r: (p.r + 1) % 4 } });
  if (a === "del") { myOp({ t: "del", pid }); selectPart(null); return; }
  if (a === "dup") { const copy = cleanPart({ ...p, id: rid(), p: [p.p[0], p.p[1] + partSize(p)[1], p.p[2]] }); myOp({ t: "add", part: copy }); selectPart(copy.id); return; }
  if (a === "savescript") { myOp({ t: "upd", pid, props: { script: $("scriptBox").value } }); toast("Script saved."); }
  if (a === "test") fire(b, b.parts.get(pid), "click");
  if (a !== "close") selectPart(pid);
});
function saveCurrentBuild() { try { localStorage.setItem("dougworld-build", JSON.stringify([...myBuild().parts.values()])); } catch (e) { /* quota: cloud save still works */ } }

/* ============================== remote players ============================== */
const players = new Map(); // id -> { id, name, plot, av, tag, pos, target, yaw, targetYaw, moving, emote, points, char }
function ensurePlayer(id, name) {
  let pl = players.get(id);
  if (!pl) { pl = { id, name: text(name, 24) || "Player", plot: -1, av: null, tag: null, pos: SPAWN.clone(), target: SPAWN.clone(), yaw: 0, targetYaw: 0, moving: false, emote: null, points: 0 }; players.set(id, pl); setPlayerChar(pl, defaultChar()); }
  if (name) pl.name = text(name, 24);
  return pl;
}
function setPlayerChar(pl, char) {
  pl.char = cleanChar(char);
  disposeAvatar(pl.av);
  pl.av = buildAvatar(pl.char); pl.av.body.position.copy(pl.pos); scene.add(pl.av.body);
  pl.tag = makeLabel(pl.name); pl.tag.position.y = pl.av.height + 0.45; pl.av.body.add(pl.tag);
}
function removePlayer(id) {
  const pl = players.get(id); if (!pl) return;
  disposeAvatar(pl.av);
  players.delete(id);
  const b = builds.get(id); if (b) { for (const pid of [...b.parts.keys()]) removeMesh(b, pid); scene.remove(b.group); builds.delete(id); }
  renderPlayers(); updatePlotSigns();
}
function updateRemote(dt, t) {
  for (const pl of players.values()) {
    if (!pl.av) continue;
    pl.pos.lerp(pl.target, 1 - Math.exp(-14 * dt));
    let d = pl.targetYaw - pl.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); pl.yaw += d * Math.min(1, dt * 12);
    pl.av.body.position.copy(pl.pos); pl.av.body.rotation.y = pl.yaw;
    animateAv(pl.av, t, dt, pl.anim || (pl.moving ? "walk" : "idle"), pl.emote);
    updatePet(pl.av.pet, pl.pos, pl.yaw, dt);
    if (pl.tag) { const isIt = game?.type === "tag" && game.it === pl.id; setLabel(pl.tag, isIt ? `${pl.name} (IT!)` : pl.name, isIt ? "#ffb4ad" : "#fffaf0"); }
  }
  if (P.tag) { const isIt = game?.type === "tag" && game.it === me.id; setLabel(P.tag, isIt ? `${me.name} (IT!)` : me.name, isIt ? "#ffb4ad" : "#fff3c4"); }
}

/* ============================== networking ============================== */
let channel = null, room = "", started = false, lastSent = 0, lastStateKey = "";
function send(event, payload) { if (channel) channel.send({ type: "broadcast", event, payload }).catch(() => {}); }
function netState(moving) {
  if (!channel) return;
  const now = performance.now(); if (now - lastSent < 80) return;
  const key = [P.pos.x.toFixed(2), P.pos.y.toFixed(2), P.pos.z.toFixed(2), P.yaw.toFixed(2), moving, P.anim].join();
  if (key === lastStateKey && now - lastSent < 2000) return;
  lastSent = now; lastStateKey = key;
  send("st", { id: me.id, p: [+P.pos.x.toFixed(2), +P.pos.y.toFixed(2), +P.pos.z.toFixed(2)], r: +P.yaw.toFixed(2), m: moving, a: P.anim });
}
function sendHello(reply) {
  send("hello", { id: me.id, name: me.name, plot: me.plot, char: me.char, points: me.points, reply });
  // Builds go in chunks so big houses stay under the realtime message size limit.
  const parts = [...myBuild().parts.values()];
  for (let i = 0; i < Math.max(1, parts.length); i += 150) send("bld", { id: me.id, plot: me.plot, first: i === 0, parts: parts.slice(i, i + 150) });
}
function onPresence() {
  const state = channel.presenceState(), seen = new Set();
  const members = [];
  for (const [key, metas] of Object.entries(state)) { const m = metas[0]; if (!m) continue; members.push({ id: key, name: m.name, plot: m.plot ?? -1, joined: m.joined || 0 }); }
  members.sort((a, b) => a.joined - b.joined || (a.id < b.id ? -1 : 1));
  // Plots: everyone keeps the plot they picked; if two people grabbed the same one, the earlier joiner keeps it.
  const taken = new Map();
  for (const m of members) { if (m.plot >= 0 && !taken.has(m.plot)) taken.set(m.plot, m.id); }
  const mine = members.find(m => m.id === me.id);
  if (mine && (me.plot < 0 || taken.get(me.plot) !== me.id)) {
    let free = -1; for (let i = 0; i < PLOTS; i++) if (!taken.has(i) || taken.get(i) === me.id) { free = i; break; }
    if (free !== me.plot) { me.plot = free; channel.track({ name: me.name, joined: me.joined, plot: me.plot }); setMyPlot(free); }
  }
  for (const m of members) {
    if (m.id === me.id) continue; seen.add(m.id);
    const pl = ensurePlayer(m.id, m.name);
    if (pl.plot !== m.plot) { pl.plot = m.plot; const b = getBuild(m.id); b.plot = m.plot; placeBuildGroup(b); collidersDirty = true; }
  }
  for (const id of [...players.keys()]) if (!seen.has(id)) removePlayer(id);
  host = members[0]?.id || me.id;
  renderPlayers(); updatePlotSigns();
  if (game && game.runner !== me.id && !seen.has(game.runner)) endGame("The game host left.");
}
let host = null;
function setMyPlot(i) {
  const b = myBuild(); b.plot = i; placeBuildGroup(b); collidersDirty = true;
  updatePlotSigns();
  if (i < 0) toast("This room is full of builders (8 plots), so you're visiting.");
}
function updatePlotSigns() {
  const owners = new Map(); if (me.plot >= 0) owners.set(me.plot, me.name + " (you)");
  for (const pl of players.values()) if (pl.plot >= 0) owners.set(pl.plot, pl.name);
  plotSigns.forEach((s, i) => setLabel(s, owners.has(i) ? owners.get(i) + "'s plot" : "Empty plot", PLOT_COLORS[i]));
}
async function joinRoom(code) {
  room = code;
  $("roomCode").textContent = code;
  history.replaceState(null, "", "?room=" + code);
  channel = sb.channel("dougworld-" + code, { config: { broadcast: { self: false }, presence: { key: me.id } } });
  channel
    .on("presence", { event: "sync" }, onPresence)
    .on("broadcast", { event: "hello" }, ({ payload: m }) => {
      if (!m?.id || m.id === me.id) return;
      const pl = ensurePlayer(m.id, m.name); pl.points = num(m.points, 0, -1e6, 1e6); setPlayerChar(pl, m.char);
      if (m.reply) sendHello(false);
      // Catch late joiners up on a running game, including the coins nobody has grabbed yet.
      if (game && game.runner === me.id) send("game", { ...game, coins: [...coinMeshes].map(([id, c]) => [id, +c.position.x.toFixed(1), +c.position.z.toFixed(1)]) });
      renderPlayers(); feed(`${pl.name} joined`);
    })
    .on("broadcast", { event: "bld" }, ({ payload: m }) => {
      if (!m?.id || m.id === me.id || !Array.isArray(m.parts)) return;
      const b = getBuild(m.id); b.plot = Math.round(num(m.plot, -1, -1, PLOTS - 1)); placeBuildGroup(b);
      if (m.first) setParts(b, m.parts); else for (const part of m.parts) applyOp(b, { t: "add", part });
    })
    .on("broadcast", { event: "op" }, ({ payload: m }) => { if (!m?.id || m.id === me.id || !Array.isArray(m.ops)) return; const b = getBuild(m.id); m.ops.slice(0, 50).forEach(op => applyOp(b, op)); })
    .on("broadcast", { event: "st" }, ({ payload: m }) => {
      const pl = players.get(m?.id); if (!pl || !Array.isArray(m.p)) return;
      pl.target.set(num(m.p[0]), num(m.p[1]), num(m.p[2])); pl.targetYaw = num(m.r); pl.moving = !!m.m;
      pl.anim = ["idle", "walk", "sprint", "jump", "fall"].includes(m.a) ? m.a : null;
      if (pl.moving && pl.emote?.e === "sit") pl.emote = null;
    })
    .on("broadcast", { event: "char" }, ({ payload: m }) => { const pl = players.get(m?.id); if (pl) setPlayerChar(pl, m.char); })
    .on("broadcast", { event: "pstate" }, ({ payload: m }) => {
      const b = builds.get(m?.o === me.id ? me.id : m?.o); const p = b?.parts.get(m.pid); if (!p || !m.props) return;
      const props = {};
      if ("open" in m.props) props.open = !!m.props.open; if ("lit" in m.props) props.lit = !!m.props.lit; if ("hidden" in m.props) props.hidden = !!m.props.hidden;
      if ("c" in m.props) props.c = hex(m.props.c, null); if (Array.isArray(m.props.off)) props.off = m.props.off.slice(0, 3).map(v => num(v, 0, -200, 200)); if ("spin" in m.props) props.spin = num(m.props.spin, 0, -1e6, 1e6);
      setState(b, p, props, num(m.tw, 0, 0, 20), true);
    })
    .on("broadcast", { event: "say" }, ({ payload: m }) => { const b = builds.get(m?.o); if (b) partBubble(b, m.pid, text(m.text, 80)); })
    .on("broadcast", { event: "quick" }, ({ payload: m }) => { const pl = players.get(m?.id); const msg = QUICK[m?.i]; if (pl && msg) { bubble(pl.av.body, msg, pl.av.height); feed(`${pl.name}: ${msg}`); } })
    .on("broadcast", { event: "emote" }, ({ payload: m }) => { const pl = players.get(m?.id); if (pl && EMOTE_TIME[m.e]) pl.emote = { e: m.e, at: performance.now(), dur: EMOTE_TIME[m.e] }; })
    .on("broadcast", { event: "pts" }, ({ payload: m }) => { const pl = players.get(m?.id); if (pl) { pl.points = num(m.v, 0, -1e6, 1e6); renderPlayers(); } })
    .on("broadcast", { event: "game" }, ({ payload: m }) => startGameFromNet(m))
    .on("broadcast", { event: "gact" }, ({ payload: m }) => gameAction(m));
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), 12000);
    channel.subscribe(async status => {
      if (status === "SUBSCRIBED") { clearTimeout(timer); await channel.track({ name: me.name, joined: me.joined, plot: -1 }); resolve(); }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { clearTimeout(timer); reject(new Error(status)); }
    });
  });
  // Wait for the first presence sync to pick a plot, then say hello with our character and build.
  await sleep(700);
  if (me.plot < 0 || me.plot === 0 && !channel.presenceState()[me.id]) onPresence();
  sendHello(true);
}

/* ============================== social ============================== */
function feed(msg) { const el = document.createElement("div"); el.className = "feed-item"; el.textContent = msg; $("feed").prepend(el); setTimeout(() => el.remove(), 6000); while ($("feed").children.length > 5) $("feed").lastChild.remove(); }
function renderPlayers() {
  const rows = [{ id: me.id, name: me.name + " (you)", plot: me.plot, points: me.points }, ...[...players.values()]];
  $("playerList").innerHTML = rows.map(r => `<div class="p-row"><span class="p-dot" style="background:${r.plot >= 0 ? PLOT_COLORS[r.plot] : "#fff"}"></span><span>${esc(r.name)}</span><span class="pts">${r.points || 0}</span></div>`).join("");
}
function toggleQuick() { const q = $("quickMenu"); q.classList.toggle("hidden"); $("feed").classList.toggle("hidden", !q.classList.contains("hidden")); }
$("quickMenu").innerHTML = QUICK.map((q, i) => `<button class="btn sm ghost" data-q="${i}" type="button">${q}</button>`).join("");
$("quickMenu").addEventListener("click", e => { const b = e.target.closest("[data-q]"); if (!b) return; const i = +b.dataset.q; bubble(P.av.body, QUICK[i], P.av.height); send("quick", { id: me.id, i }); toggleQuick(); });
$("quickBtn").addEventListener("click", toggleQuick);
function emote(e) { P.emote = { e, at: performance.now(), dur: EMOTE_TIME[e] }; send("emote", { id: me.id, e }); }
document.querySelectorAll("[data-emote]").forEach(b => b.addEventListener("click", () => emote(b.dataset.emote)));
$("inviteBtn").addEventListener("click", async () => {
  if (!room) return toast("You're playing solo. Start a room from the menu to invite friends.");
  const url = location.origin + location.pathname + "?room=" + room;
  try { await navigator.clipboard.writeText(url); toast("Invite link copied! Send it to your friends."); } catch (e) { toast("Room code: " + room); }
});

/* ============================== mini-games ============================== */
let game = null; // { type, runner, ends, coins:[[id,x,z]], it, itTime:{}, scores:{} }
const coinMeshes = new Map();
const coinGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.12, 20), coinMat = new THREE.MeshStandardMaterial({ color: "#f2b705", metalness: .7, roughness: .25, emissive: "#6b4a00", emissiveIntensity: .4 });
function allIds() { return [me.id, ...players.keys()]; }
function nameOf(id) { return id === me.id ? me.name : players.get(id)?.name || "Someone"; }
function startGame(type) {
  if (game) return toast("A game is already running.");
  const ends = Date.now() + (type === "coins" ? 60000 : 90000);
  const g = { type, runner: me.id, ends, scores: {}, itTime: {} };
  if (type === "coins") {
    g.coins = []; for (let i = 0; i < 45; i++) { const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 80; g.coins.push([rid(), +(Math.cos(a) * r).toFixed(1), +(Math.sin(a) * r).toFixed(1)]); }
  } else { const ids = allIds(); g.it = ids[Math.floor(Math.random() * ids.length)]; }
  send("game", g); startGameFromNet(g, true); closeAllModals();
}
function startGameFromNet(g, local = false) {
  if (!g || !["coins", "tag"].includes(g.type)) return;
  if (!local && game && game.runner === g.runner && game.ends === g.ends) return;
  clearGame();
  // Games last at most two minutes from now, whatever the sender claims.
  game = { type: g.type, runner: String(g.runner), ends: num(g.ends, Date.now(), Date.now(), Date.now() + 120000), scores: {}, itTime: {}, it: g.it, tagAt: performance.now() };
  if (g.type === "coins") for (const [id, x, z] of (g.coins || []).slice(0, 80)) { const m = new THREE.Mesh(coinGeo, coinMat); m.position.set(num(x, 0, -140, 140), 1, num(z, 0, -140, 140)); m.rotation.x = Math.PI / 2; m.castShadow = true; scene.add(m); coinMeshes.set(String(id), m); }
  sound("win"); toast(g.type === "coins" ? "Coin Rush! Grab as many coins as you can!" : `Tag! ${nameOf(g.it)} is IT. Run!`);
}
function clearGame() { for (const m of coinMeshes.values()) scene.remove(m); coinMeshes.clear(); game = null; $("banner").classList.add("hidden"); }
function gameAction(m) {
  if (!game || !m) return;
  if (m.k === "coin" && game.type === "coins") { const mesh = coinMeshes.get(m.cid); if (!mesh) return; scene.remove(mesh); coinMeshes.delete(m.cid); game.scores[m.by] = (game.scores[m.by] || 0) + 1; if (m.by !== me.id) sound("beep"); }
  if (m.k === "tag" && game.type === "tag" && m.from === game.it) { game.it = m.to; game.tagAt = performance.now(); toast(`${nameOf(m.to)} is IT!`); sound("honk"); }
}
function gameTick(dt) {
  if (!game) return;
  const left = game.ends - Date.now();
  if (left <= 0) return endGame();
  const banner = $("banner"); banner.classList.remove("hidden");
  if (game.type === "coins") {
    for (const [id, m] of coinMeshes) { m.rotation.z += dt * 3; if (m.position.distanceTo(new THREE.Vector3(P.pos.x, P.pos.y + 0.8, P.pos.z)) < 1.4) { const msg = { k: "coin", cid: id, by: me.id }; send("gact", msg); gameAction(msg); sound("ding"); } }
    banner.innerHTML = `Coin Rush · ${Math.ceil(left / 1000)}s<small>You: ${game.scores[me.id] || 0} coins · ${coinMeshes.size} left</small>`;
  } else {
    game.itTime[game.it] = (game.itTime[game.it] || 0) + dt;
    if (game.it === me.id && performance.now() - game.tagAt > 2500) {
      for (const pl of players.values()) if (pl.pos.distanceTo(P.pos) < 1.7) { const msg = { k: "tag", from: me.id, to: pl.id }; send("gact", msg); gameAction(msg); break; }
    }
    banner.innerHTML = `Tag · ${Math.ceil(left / 1000)}s<small>${game.it === me.id ? "You're IT! Tag someone!" : esc(nameOf(game.it)) + " is IT. Run!"}</small>`;
  }
}
function endGame(reason) {
  if (!game) return;
  let lines;
  if (game.type === "coins") lines = Object.entries(game.scores).sort((a, b) => b[1] - a[1]).map(([id, s], i) => `${i + 1}. ${nameOf(id)}: ${s} coins`);
  else lines = allIds().map(id => [id, game.itTime[id] || 0]).sort((a, b) => a[1] - b[1]).map(([id, s], i) => `${i + 1}. ${nameOf(id)}: ${s.toFixed(1)}s as IT`);
  clearGame(); sound("win");
  openModal("gamesModal", `<h2>${reason ? "Game over" : "Results"}</h2>${reason ? `<p class="muted">${esc(reason)}</p>` : ""}<div class="save-list">${(lines.length ? lines : ["Nobody scored!"]).map(l => `<div class="save-row"><b>${esc(l)}</b></div>`).join("")}</div><div class="row" style="margin-top:12px"><button class="btn" data-game="coins" type="button">Coin Rush again</button><button class="btn pond" data-game="tag" type="button">Play Tag</button></div>`);
}
function openGames() {
  openModal("gamesModal", `<h2>Games</h2><p class="muted">Anyone in the room can start a game. Everyone here joins in.</p>
   <div class="save-list">
    <div class="save-row"><b>Coin Rush<br><span class="muted" style="font-weight:700">60 seconds. Coins are scattered across the whole park. Grab the most!</span></b><button class="btn" data-game="coins" type="button">Start</button></div>
    <div class="save-row"><b>Tag<br><span class="muted" style="font-weight:700">90 seconds. Whoever is IT tags someone by running into them. Least time as IT wins.</span></b><button class="btn pond" data-game="tag" type="button">Start</button></div>
    <div class="save-row"><b>Obby &amp; parkour<br><span class="muted" style="font-weight:700">Build your own with Jump pads, Lava, Checkpoints, Coins and Elevators from the Gadgets list.</span></b><button class="btn leaf" data-open-build type="button">Build</button></div>
   </div>${channel ? "" : `<p class="notice">You're playing solo. Join a room to play these with friends.</p>`}`);
}
$("gamesModal").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.game) startGame(b.dataset.game); if ("openBuild" in b.dataset) { closeAllModals(); toggleBuild(true); } });

/* ============================== modals ============================== */
function openModal(id, html) {
  const m = $(id); if (html !== undefined) m.querySelector(".modal").innerHTML = html + `<button class="btn berry x" type="button" data-close>×</button>`;
  m.classList.remove("hidden");
}
function closeAllModals() { document.querySelectorAll(".modal-bg").forEach(m => m.classList.add("hidden")); }
document.addEventListener("click", e => { if (e.target.closest("[data-close]") || e.target.classList?.contains("modal-bg")) { const bg = e.target.closest(".modal-bg"); if (bg && bg.id !== "paintModal") bg.classList.add("hidden"); if (bg?.id === "charModal") editorClosed(); } });
$("gamesBtn").addEventListener("click", openGames);
$("buildBtn").addEventListener("click", () => toggleBuild());
$("helpBtn").addEventListener("click", () => openModal("helpModal", `<h2>How to play</h2>
 <div class="save-list">
  <div class="save-row"><b>Move</b><span>WASD or arrows · Shift to run · Space to jump</span></div>
  <div class="save-row"><b>Camera</b><span>Drag (or right-drag) to look · scroll to zoom</span></div>
  <div class="save-row"><b>Build</b><span>B toggles build mode · R rotates · Ctrl+Z undoes</span></div>
  <div class="save-row"><b>Gadgets</b><span>Click doors, buttons and lights to use them</span></div>
  <div class="save-row"><b>Social</b><span>T for quick chat · 1-4 for emotes</span></div>
 </div>
 <h2 style="margin-top:14px">Scripts</h2><p class="muted">Pick a part in Edit mode and type commands. Each line starts with a trigger.</p><pre class="ref">${SCRIPT_HELP}</pre>
 <p class="muted" style="font-size:12px">Characters, pets, furniture, nature models and textures: Kenney (CC0). Icons: OpenMoji (CC BY-SA 4.0). 3D engine: three.js (MIT).</p>`));

/* ============================== character editor ============================== */
const ed = { char: null, part: "head", renderer: null, scene: null, camera: null, av: null, yaw: 0.6, raf: 0 };
function openEditor() {
  ed.char = structuredClone(me.char); ed.part = "head";
  $("charModal").classList.remove("hidden");
  if (!ed.renderer) {
    const c = $("charPreview");
    ed.renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true }); ed.renderer.setPixelRatio(Math.min(2, devicePixelRatio)); ed.renderer.outputColorSpace = THREE.SRGBColorSpace;
    ed.scene = new THREE.Scene(); ed.scene.add(new THREE.HemisphereLight("#ffffff", "#c9b98f", 1.4)); const d = new THREE.DirectionalLight("#fff", 1.6); d.position.set(3, 5, 4); ed.scene.add(d);
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.1, 40), new THREE.MeshStandardMaterial({ color: "#f7c948" })); floor.position.y = -0.05; ed.scene.add(floor);
    ed.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    let dragging = null;
    c.addEventListener("pointerdown", e => { dragging = e.clientX; c.setPointerCapture(e.pointerId); });
    c.addEventListener("pointermove", e => { if (dragging !== null) { ed.yaw += (e.clientX - dragging) * 0.01; dragging = e.clientX; } });
    c.addEventListener("pointerup", () => { dragging = null; });
  }
  rebuildPreview(); renderEditorSide();
  cancelAnimationFrame(ed.raf);
  let prev = performance.now();
  const loop = now => {
    const dt = Math.min(0.05, ((now || performance.now()) - prev) / 1000); prev = now || performance.now();
    const c = $("charPreview"), w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * ed.renderer.getPixelRatio())) { ed.renderer.setSize(w, h, false); ed.camera.aspect = w / h; ed.camera.updateProjectionMatrix(); }
    if (ed.av) {
      ed.av.body.rotation.y = ed.yaw; const ht = ed.av.height; ed.camera.position.set(0, ht * 0.62, ht * 2.3 + 1.5); ed.camera.lookAt(0, ht * 0.5, 0);
      animateAv(ed.av, performance.now() / 1000, dt, "idle", null);
      if (ed.av.pet) { ed.av.pet.group.position.set(1.05, 0, 0.35); ed.av.pet.group.rotation.y = ed.yaw - 0.5; playAnim(ed.av.pet, "idle"); ed.av.pet.mixer?.update(dt); }
    }
    ed.renderer.render(ed.scene, ed.camera);
    if (!$("charModal").classList.contains("hidden")) ed.raf = requestAnimationFrame(loop);
  };
  loop();
}
function editorClosed() { cancelAnimationFrame(ed.raf); }
function rebuildPreview() { disposeAvatar(ed.av); ed.char = cleanChar(ed.char); ed.av = buildAvatar(ed.char, ed.scene); ed.scene.add(ed.av.body); }
const optionList = (list, cur, none) => (none ? `<option value="" ${cur ? "" : "selected"}>${none}</option>` : "") + list.map(k => `<option value="${k}" ${k === cur ? "selected" : ""}>${k.startsWith("blocky/") ? "Blocky " + k.slice(-1).toUpperCase() : k.startsWith("mini/") ? "Mini " + modelLabel(k) : modelLabel(k)}</option>`).join("");
function renderEditorSide() {
  const isModel = ed.char.base !== "blocks";
  // Kenney characters keep their own body; only the hat and backpack are block parts.
  if (isModel && !OPTIONAL_PARTS.includes(ed.part)) ed.part = "hat";
  const part = ed.char.parts[ed.part], optional = OPTIONAL_PARTS.includes(ed.part);
  const chips = Object.entries(AV_PARTS).filter(([k]) => !isModel || OPTIONAL_PARTS.includes(k));
  $("charSide").innerHTML = `<h2>Your character</h2>
   <div class="field">Body<div class="row"><button class="btn sm ghost" data-body="-1" type="button">‹</button><select class="input" id="bodySel">${optionList(CHAR_MODELS, isModel ? ed.char.base : "", "Custom blocks (build it yourself)")}</select><button class="btn sm ghost" data-body="1" type="button">›</button></div></div>
   ${isModel ? `<div class="field">Tint<div class="row"><input type="color" id="tintColor" value="${ed.char.tint || "#ffffff"}"><button class="btn sm ghost" data-ed="notint" type="button" ${ed.char.tint ? "" : "disabled"}>No tint</button></div></div>
   <div class="field">Body size<div class="sizes"><span>Width</span><input type="range" min="0.6" max="1.6" step="0.05" value="${ed.char.size[0]}" data-bsize="0"><b>${ed.char.size[0]}</b><span>Height</span><input type="range" min="0.6" max="1.6" step="0.05" value="${ed.char.size[1]}" data-bsize="1"><b>${ed.char.size[1]}</b></div></div>` : ""}
   <div class="field">Pet<div class="row"><button class="btn sm ghost" data-pet="-1" type="button">‹</button><select class="input" id="petSel">${optionList(PET_MODELS, ed.char.pet, "No pet")}</select><button class="btn sm ghost" data-pet="1" type="button">›</button></div></div>
   <div class="field">${isModel ? "Accessories" : "Parts"}<div class="part-chips">${chips.map(([k, l]) => `<button class="btn sm ${k === ed.part ? "on" : "ghost"}" data-part="${k}" type="button">${l}</button>`).join("")}</div></div>
   <div class="field">Shape<div class="seg">${(optional ? ["none", ...AV_SHAPES] : AV_SHAPES).map(s => `<button class="btn sm ${s === part.shape ? "on" : "ghost"}" data-shape="${s}" type="button">${s}</button>`).join("")}</div></div>
   <div class="field">Colour<div class="swatches">${SWATCHES.map(c => `<button class="swatch ${c === part.color ? "on" : ""}" style="background:${c}" data-color="${c}" type="button" aria-label="${c}"></button>`).join("")}</div><div class="row"><input type="color" id="partColor" value="${part.color}"><span class="muted" style="text-transform:none">Any colour</span></div></div>
   <div class="field">Size<div class="sizes">${["Width", "Height", "Depth"].map((l, i) => `<span>${l}</span><input type="range" min="0.15" max="2.5" step="0.05" value="${part.scale[i]}" data-scale="${i}"><b>${part.scale[i]}</b>`).join("")}</div></div>
   <div class="field">Picture on this part<div class="row wrap"><button class="btn sm plum" data-ed="draw" type="button">Draw</button><button class="btn sm pond" data-ed="upload" type="button">Upload image</button><button class="btn sm ghost" data-ed="notex" type="button" ${part.tex ? "" : "disabled"}>Remove</button></div><span class="muted" style="text-transform:none;font-size:11.5px">Shows on the front of boxes and all around round shapes. Up to 5 parts can have pictures.</span></div>
   <div class="row wrap"><button class="btn sm butter" data-ed="random" type="button">Random outfit</button><button class="btn sm ghost" data-ed="reset" type="button">Reset</button><button class="btn sm ghost" data-ed="saves" type="button">Save / load</button></div>
   <button class="btn leaf" data-ed="wear" type="button" style="font-size:17px">Wear it</button>`;
}
$("charSide").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return; const d = b.dataset, part = ed.char.parts[ed.part];
  const cycle = (list, cur, dir, allowNone) => { const all = allowNone ? ["", ...list] : list; return all[(all.indexOf(cur) + dir + all.length) % all.length]; };
  if (d.body) ed.char.base = cycle(CHAR_MODELS, ed.char.base === "blocks" ? "" : ed.char.base, +d.body, true) || "blocks";
  if (d.pet) ed.char.pet = cycle(PET_MODELS, ed.char.pet, +d.pet, true);
  if (d.ed === "notint") ed.char.tint = "";
  if (d.part) ed.part = d.part;
  if (d.shape) part.shape = d.shape;
  if (d.color) part.color = d.color;
  if (d.ed === "draw") return openPaint(part.tex);
  if (d.ed === "upload") return $("uploadInput").click();
  if (d.ed === "notex") delete part.tex;
  if (d.ed === "reset") ed.char = defaultChar();
  if (d.ed === "random") {
    const pick = list => list[Math.floor(Math.random() * list.length)];
    if (ed.char.base !== "blocks") { ed.char.base = pick(CHAR_MODELS); ed.char.tint = ""; }
    ed.char.pet = Math.random() < .8 ? pick(PET_MODELS) : "";
    for (const [k, p] of Object.entries(ed.char.parts)) { p.color = SWATCHES[Math.floor(Math.random() * SWATCHES.length)]; if (OPTIONAL_PARTS.includes(k)) p.shape = Math.random() < .5 ? "none" : AV_SHAPES[Math.floor(Math.random() * 4)]; } }
  if (d.ed === "saves") return openStuff("character");
  if (d.ed === "wear") { wearCharacter(ed.char); $("charModal").classList.add("hidden"); editorClosed(); toast("Looking good!"); return; }
  rebuildPreview(); renderEditorSide();
});
$("charSide").addEventListener("input", e => {
  const part = ed.char.parts[ed.part], t = e.target;
  if (t.id === "bodySel") { ed.char.base = t.value || "blocks"; rebuildPreview(); return renderEditorSide(); }
  if (t.id === "petSel") { ed.char.pet = t.value; return rebuildPreview(); }
  if (t.id === "tintColor") { ed.char.tint = t.value; rebuildPreview(); const nb = $("charSide").querySelector('[data-ed="notint"]'); if (nb) nb.disabled = false; return; }
  if (t.dataset.bsize) { ed.char.size[+t.dataset.bsize] = +t.value; t.nextElementSibling.textContent = t.value; return rebuildPreview(); }
  if (e.target.id === "partColor") { part.color = e.target.value; rebuildPreview(); }
  if (e.target.dataset.scale) { part.scale[+e.target.dataset.scale] = +e.target.value; e.target.nextElementSibling.textContent = e.target.value; rebuildPreview(); }
});
$("charBtn").addEventListener("click", openEditor);
// Uploads are redrawn onto a small canvas, which strips anything that isn't plain pixels (metadata, scripts in SVGs).
$("uploadInput").addEventListener("change", async e => {
  const file = e.target.files[0]; e.target.value = ""; if (!file) return;
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type) || file.size > 8e6) return toast("Pick a PNG, JPG, WebP or GIF under 8 MB.");
  try {
    const bmp = await createImageBitmap(file);
    const c = document.createElement("canvas"); c.width = c.height = 96; const g = c.getContext("2d");
    const s = Math.max(96 / bmp.width, 96 / bmp.height), w = bmp.width * s, h = bmp.height * s;
    g.drawImage(bmp, (96 - w) / 2, (96 - h) / 2, w, h);
    setPartPicture(compactDataURL(c));
  } catch (err) { toast("That image couldn't be read."); }
});
function compactDataURL(c) { let url = c.toDataURL("image/webp", 0.85); if (!url.startsWith("data:image/webp")) url = c.toDataURL("image/png"); if (url.length > 60000) url = c.toDataURL("image/jpeg", 0.7); return url; }
function setPartPicture(url) {
  const count = Object.entries(ed.char.parts).filter(([k, p]) => p.tex && k !== ed.part).length;
  if (count >= 5) return toast("Up to 5 parts can have pictures. Remove one first.");
  ed.char.parts[ed.part].tex = url; rebuildPreview(); renderEditorSide();
}

/* ============================== paint ============================== */
const paint = { color: "#26283b", size: 4, tool: "brush", down: false, last: null };
function openPaint(existing) {
  const c = $("paintCanvas"), g = c.getContext("2d"); g.clearRect(0, 0, 96, 96);
  if (existing) { const img = new Image(); img.onload = () => g.drawImage(img, 0, 0, 96, 96); img.src = existing; }
  $("paintTools").innerHTML = `<div class="swatches" style="width:288px">${SWATCHES.map(c => `<button class="swatch ${c === paint.color ? "on" : ""}" style="background:${c}" data-pc="${c}" type="button"></button>`).join("")}</div>
   <div class="row wrap" style="justify-content:center"><input type="color" id="paintColor" value="${paint.color}">${[1, 2, 4, 8].map(s => `<button class="btn sm ${s === paint.size ? "on" : "ghost"}" data-ps="${s}" type="button">${s}px</button>`).join("")}</div>
   <div class="row wrap" style="justify-content:center">${["brush", "eraser", "fill"].map(t => `<button class="btn sm ${t === paint.tool ? "on" : "ghost"}" data-pt="${t}" type="button">${t}</button>`).join("")}<button class="btn sm berry" data-pa="clear" type="button">Clear</button></div>
   <div class="row"><button class="btn ghost" data-pa="cancel" type="button">Cancel</button><button class="btn leaf" data-pa="done" type="button">Use drawing</button></div>`;
  $("paintModal").classList.remove("hidden");
}
$("paintTools").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return; const d = b.dataset, c = $("paintCanvas");
  if (d.pc) { paint.color = d.pc; if (paint.tool === "eraser") paint.tool = "brush"; }
  if (d.ps) paint.size = +d.ps; if (d.pt) paint.tool = d.pt;
  if (d.pa === "clear") c.getContext("2d").clearRect(0, 0, 96, 96);
  if (d.pa === "cancel") return $("paintModal").classList.add("hidden");
  if (d.pa === "done") { setPartPicture(compactDataURL(c)); $("paintModal").classList.add("hidden"); return; }
  const keep = c.getContext("2d").getImageData(0, 0, 96, 96); openPaint(); c.getContext("2d").putImageData(keep, 0, 0);
});
$("paintTools").addEventListener("input", e => { if (e.target.id === "paintColor") paint.color = e.target.value; });
(function paintCanvas() {
  const c = $("paintCanvas"), g = c.getContext("2d");
  const at = e => { const r = c.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * 96), Math.floor((e.clientY - r.top) / r.height * 96)]; };
  const dot = (x, y) => { const s = paint.size, o = Math.floor(s / 2); if (paint.tool === "eraser") g.clearRect(x - o, y - o, s, s); else { g.fillStyle = paint.color; g.fillRect(x - o, y - o, s, s); } };
  const line = (a, b) => { const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1); for (let i = 0; i <= n; i++) dot(Math.round(a[0] + (b[0] - a[0]) * i / n), Math.round(a[1] + (b[1] - a[1]) * i / n)); };
  function fill(x, y) {
    const img = g.getImageData(0, 0, 96, 96), d = img.data, idx = (x, y) => (y * 96 + x) * 4, t = d.slice(idx(x, y), idx(x, y) + 4);
    const col = new THREE.Color(paint.color), rgb = [col.r * 255, col.g * 255, col.b * 255].map(Math.round);
    if (t[0] === rgb[0] && t[1] === rgb[1] && t[2] === rgb[2] && t[3] === 255) return;
    const stack = [[x, y]], same = i => d[i] === t[0] && d[i + 1] === t[1] && d[i + 2] === t[2] && d[i + 3] === t[3];
    while (stack.length) { const [px, py] = stack.pop(); if (px < 0 || py < 0 || px > 95 || py > 95) continue; const i = idx(px, py); if (!same(i)) continue; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255; stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]); }
    g.putImageData(img, 0, 0);
  }
  c.addEventListener("pointerdown", e => { c.setPointerCapture(e.pointerId); const p = at(e); if (paint.tool === "fill") return fill(...p); paint.down = true; paint.last = p; dot(...p); });
  c.addEventListener("pointermove", e => { if (!paint.down) return; const p = at(e); line(paint.last, p); paint.last = p; });
  c.addEventListener("pointerup", () => { paint.down = false; });
})();

/* ============================== saves ============================== */
const LOCAL_SAVES = "dougworld-saves";
function localSaves() { try { return JSON.parse(localStorage.getItem(LOCAL_SAVES)) || { character: {}, build: {} }; } catch (e) { return { character: {}, build: {} }; } }
function writeLocal(all) { try { localStorage.setItem(LOCAL_SAVES, JSON.stringify(all)); return true; } catch (e) { toast("This device is out of save space. Try a cloud save or delete old saves."); return false; } }
let cloudOk = null;
async function cloudList(kind) {
  if (!me.signedIn || !sb) return [];
  const { data, error } = await sb.from("dougworld_saves").select("slot,name,updated_at").eq("kind", kind).order("updated_at", { ascending: false });
  if (error) { cloudOk = false; console.warn("DougWorld cloud saves:", error.message); return []; }
  cloudOk = true; return data;
}
let stuffKind = "build";
async function openStuff(kind = stuffKind) {
  stuffKind = kind; closeAllModals();
  openModal("stuffModal", `<h2>My stuff</h2><div class="tabs"><button class="btn sm ${kind === "build" ? "on" : "ghost"}" data-kind="build" type="button">Houses</button><button class="btn sm ${kind === "character" ? "on" : "ghost"}" data-kind="character" type="button">Characters</button></div><p class="muted">Loading…</p>`);
  const cloud = await cloudList(kind), local = localSaves()[kind];
  const rows = [...cloud.map(r => ({ where: "cloud", slot: r.slot, name: r.name, at: r.updated_at })), ...Object.entries(local).map(([slot, r]) => ({ where: "local", slot, name: r.name, at: r.at }))];
  const what = kind === "build" ? "house" : "character";
  $("stuffModal").querySelector(".modal").innerHTML = `<h2>My stuff</h2>
   <div class="tabs"><button class="btn sm ${kind === "build" ? "on" : "ghost"}" data-kind="build" type="button">Houses</button><button class="btn sm ${kind === "character" ? "on" : "ghost"}" data-kind="character" type="button">Characters</button></div>
   <div class="row"><input class="input" id="saveName" maxlength="40" placeholder="Name this ${what}"><button class="btn leaf" data-save="${me.signedIn && cloudOk !== false ? "cloud" : "local"}" type="button">Save</button></div>
   <p class="muted" style="font-size:12px;margin:6px 2px">${me.signedIn ? (cloudOk === false ? "Cloud saves aren't set up yet, so saves stay on this device." : "Saves go to your DougHub account so you can load them anywhere.") : "Log in to save to the cloud. For now saves stay on this device."}</p>
   <div class="save-list">${rows.length ? rows.map(r => `<div class="save-row"><span class="tag ${r.where}">${r.where}</span><b>${esc(r.name)}</b><button class="btn sm pond" data-load="${esc(r.slot)}" data-where="${r.where}" type="button">Load</button><button class="btn sm berry" data-del="${esc(r.slot)}" data-where="${r.where}" type="button">Delete</button></div>`).join("") : `<div class="notice">No saved ${what}s yet.</div>`}</div>
   ${kind === "build" ? `<div class="row" style="margin-top:12px"><button class="btn sm ghost" data-clear type="button">Clear my plot</button></div>` : ""}
   <button class="btn berry x" type="button" data-close>×</button>`;
}
$("stuffModal").addEventListener("click", async e => {
  const b = e.target.closest("button"); if (!b) return; const d = b.dataset, kind = stuffKind;
  if (d.kind) return openStuff(d.kind);
  if ("clear" in d) { if (confirm("Remove everything from your plot? You can undo with Ctrl+Z.")) { myOp({ t: "load", parts: [] }); toast("Plot cleared."); } return; }
  const current = () => kind === "build" ? { parts: [...myBuild().parts.values()] } : (ed.char && !$("charModal").classList.contains("hidden") ? cleanChar(ed.char) : me.char);
  if (d.save) {
    const name = text($("saveName").value.trim(), 40) || (kind === "build" ? "My house" : "My character"), slot = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || rid();
    if (d.save === "cloud") { const { error } = await sb.from("dougworld_saves").upsert({ user_id: me.id, kind, slot, name, data: current(), updated_at: new Date().toISOString() }); if (error) return toast("Couldn't save: " + error.message); }
    else { const all = localSaves(); all[kind][slot] = { name, at: Date.now(), data: current() }; if (!writeLocal(all)) return; }
    toast(`Saved "${name}"!`); return openStuff(kind);
  }
  if (d.load) {
    let data;
    if (d.where === "cloud") { const { data: row, error } = await sb.from("dougworld_saves").select("data").eq("kind", kind).eq("slot", d.load).maybeSingle(); if (error || !row) return toast("Couldn't load that save."); data = row.data; }
    else data = localSaves()[kind][d.load]?.data;
    if (!data) return toast("That save is empty.");
    if (kind === "build") { if (me.plot < 0) return toast("You need a plot to load a house."); myOp({ t: "load", parts: data.parts || [] }); toast("House loaded!"); closeAllModals(); }
    else { ed.char = cleanChar(data); if (!$("charModal").classList.contains("hidden")) { rebuildPreview(); renderEditorSide(); } wearCharacter(data); toast("Character loaded!"); closeAllModals(); }
    return;
  }
  if (d.del) {
    if (!confirm("Delete this save?")) return;
    if (d.where === "cloud") await sb.from("dougworld_saves").delete().eq("kind", kind).eq("slot", d.del);
    else { const all = localSaves(); delete all[kind][d.del]; writeLocal(all); }
    return openStuff(kind);
  }
});
$("stuffBtn").addEventListener("click", () => openStuff());

/* ============================== start ============================== */
async function start(mode, code) {
  started = true;
  $("lobby").classList.add("hidden"); $("hud").classList.remove("hidden");
  emojify($("hud").querySelector(".top-actions")); emojify($("socialBar"));
  let char = null, saved = null;
  try { char = JSON.parse(localStorage.getItem("dougworld-char")); saved = JSON.parse(localStorage.getItem("dougworld-build")); } catch (e) { /* fresh start */ }
  wearCharacter(char || defaultChar(), false);
  const b = myBuild(); b.plot = 0; placeBuildGroup(b); setParts(b, saved || starterHouse());
  if (mode === "solo") { me.plot = 0; setMyPlot(0); $("roomCode").textContent = "SOLO"; }
  else {
    me.plot = -1; b.plot = -1; placeBuildGroup(b);
    try { await joinRoom(code); toast(`Joined room ${code}. Share the invite so friends can join!`); }
    catch (e) { console.warn("DougWorld room join failed", e); toast("Couldn't connect to the room, so you're playing solo."); channel = null; room = ""; me.plot = 0; setMyPlot(0); $("roomCode").textContent = "SOLO"; }
  }
  renderPlayers(); updatePlotSigns(); respawn();
}
function starterHouse() {
  // A tiny starter hut with a working door, a lamp and a jump pad, so new players can see gadgets in action.
  const w = "#f6edda", roof = "#e05a4f", parts = [];
  const add = (shape, p, s, c, extra = {}) => parts.push({ id: rid(), shape, p, s, c, m: "solid", r: 0, solid: true, ...extra });
  add("box", [-4, 1.5, 0], [0.5, 3, 6], w); add("box", [4, 1.5, 0], [0.5, 3, 6], w); add("box", [0, 1.5, -3], [8.5, 3, 0.5], w);
  add("box", [-2.75, 1.5, 3], [3, 3, 0.5], w); add("box", [2.75, 1.5, 3], [3, 3, 0.5], w);
  add("box", [0, 1.5, 3], [2.5, 3, 0.25], "#8b5a3c", { name: "door", script: "on click: toggle; sound beep" });
  add("box", [0, 3.25, 0], [9, 0.5, 7], roof);
  add("sphere", [0, 2.6, 0], [0.6, 0.6, 0.6], "#f7c948", { name: "lamp", script: "on click: light toggle" });
  add("box", [0, 0.125, 7], [2, 0.25, 2], "#5fae4e", { m: "neon", name: "jump pad", script: "on touch: launch 20; sound boom" });
  add("box", [0, 4.5, 3.5], [3, 1.25, 0.25], "#fffaf0", { text: "Welcome to my house!" });
  return parts;
}
(async function lobby() {
  await loadAccount();
  const canMulti = me.signedIn || DEV;
  if (!me.signedIn && DEV) me.name = "Guest" + Math.floor(1000 + Math.random() * 9000);
  $("whoami").textContent = me.signedIn ? `Playing as ${me.name}` : DEV ? `Dev guest: ${me.name}` : "Not logged in";
  $("loginNotice").classList.toggle("hidden", me.signedIn);
  $("joinBtn").disabled = $("createBtn").disabled = !canMulti || !sb;
  const params = new URLSearchParams(location.search), preset = (params.get("room") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  if (preset) $("roomInput").value = preset;
  $("joinBtn").addEventListener("click", () => { const code = $("roomInput").value.toUpperCase().replace(/[^A-Z0-9]/g, ""); if (code.length < 4) return toast("Room codes are 4 to 6 letters or numbers."); start("room", code); });
  $("createBtn").addEventListener("click", () => { const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let code = ""; for (let i = 0; i < 5; i++) code += abc[Math.floor(Math.random() * abc.length)]; start("room", code); });
  $("soloBtn").addEventListener("click", () => start("solo"));
})();

/* ============================== loop ============================== */
let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; const t = now / 1000;
  if (started) { tickTweens(); updatePlayer(dt, t); updateRemote(dt, t); updateCamera(); }
  else { camera.position.set(Math.sin(t * 0.08) * 40, 22, Math.cos(t * 0.08) * 40); camera.lookAt(0, 0, 0); }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Local dev server only: a handle for automated testing. Never present on doughub.online.
if (DEV) window.__dw = { me, P, players, builds, myBuild, myOp, fire, compile, startGame, get game() { return game; }, keys, cam, emote, openEditor, openStuff, toggleBuild, wearCharacter, defaultChar, brush, build,
  step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) { tickTweens(); updatePlayer(dt, performance.now() / 1000); updateRemote(dt, performance.now() / 1000); } updateCamera(); renderer.render(scene, camera); } };
addEventListener("pagehide", () => { saveCurrentBuild(); if (channel) channel.unsubscribe(); });
