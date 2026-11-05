/* Bundt Bakery: a cozy cake-baking game.
   Customers order a bundt cake. Measure, mix, pour, bake, cool, flip, glaze and decorate it, then serve it for stars and coins.
   Spend coins in the Pantry Shop on new flavors, glazes, toppings, pans and kitchen upgrades.
   All art is drawn in code and all sounds are synthesized live. Customers are DougHub's own animal characters. */
(() => {
"use strict";
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const pick = a => a[Math.floor(Math.random() * a.length)];
const FORCE_MUTE = /[?&]mute=1/.test(location.search);
const INK = "#5b3a29";

/* ====================== data ====================== */
const FLAVORS = [
  { id: "vanilla", name: "Vanilla", extra: "Vanilla", icon: "#fff1c9", baked: ["#f6e4b4", "#e9b865", "#a8641f"], batter: "#f6e4b4", cost: 0, desc: "A classic, buttery crumb." },
  { id: "chocolate", name: "Chocolate", extra: "Cocoa", icon: "#6b3e26", baked: ["#8a5a3a", "#5a3320", "#2a160c"], batter: "#7a4a2e", cost: 0, desc: "Rich, dark and fudgy." },
  { id: "lemon", name: "Lemon", extra: "Lemon zest", icon: "#ffe14f", baked: ["#fbeb9a", "#efc84a", "#b88a1a"], batter: "#f8e57a", cost: 60, desc: "Bright and zesty." },
  { id: "strawberry", name: "Strawberry", extra: "Strawberries", icon: "#ff6b8b", baked: ["#f9bfcc", "#ec8aa0", "#a84a62"], batter: "#f7a6b8", cost: 90, desc: "Sweet pink berry cake." },
  { id: "carrot", name: "Carrot", extra: "Carrots", icon: "#ff8a2a", baked: ["#efb872", "#d98a3a", "#8a4a16"], batter: "#e9a25a", cost: 130, desc: "Spiced and moist." },
  { id: "redvelvet", name: "Red Velvet", extra: "Red velvet", icon: "#c0262d", baked: ["#cf5a60", "#a8323a", "#5a1218"], batter: "#c74a52", cost: 180, desc: "Velvety and bold." },
  { id: "matcha", name: "Matcha", extra: "Matcha", icon: "#7ab648", baked: ["#b5d68a", "#8fb85a", "#4a6a28"], batter: "#a8cc78", cost: 220, desc: "Earthy green tea." },
  { id: "pumpkin", name: "Pumpkin Spice", extra: "Pumpkin", icon: "#e0791c", baked: ["#e8b36e", "#c9772a", "#7a3a10"], batter: "#e3a560", cost: 260, desc: "Cozy fall flavors." }
];
const GLAZES = [
  { id: "none", name: "No glaze", color: "#ffffff", cost: 0 },
  { id: "vanilla", name: "Vanilla glaze", color: "#fff6e4", cost: 0 },
  { id: "chocolate", name: "Chocolate drizzle", color: "#4a2a1c", cost: 40 },
  { id: "strawberry", name: "Strawberry glaze", color: "#ff9db4", cost: 70 },
  { id: "caramel", name: "Caramel drizzle", color: "#d99a4a", cost: 110 },
  { id: "blueberry", name: "Blueberry glaze", color: "#8a9aff", cost: 150 }
];
const TOPPINGS = [
  { id: "none", name: "No toppings", cost: 0 },
  { id: "sprinkles", name: "Rainbow sprinkles", cost: 0 },
  { id: "sugar", name: "Powdered sugar", cost: 30 },
  { id: "berries", name: "Berries", cost: 60 },
  { id: "nuts", name: "Chopped nuts", cost: 90 },
  { id: "flowers", name: "Sugar flowers", cost: 140 },
  { id: "chips", name: "Chocolate chips", cost: 170 },
  { id: "hearts", name: "Candy hearts", cost: 220 }
];
const PANS = [
  { id: "classic", name: "Classic pan", lobes: 12, amp: 7, cost: 0, desc: "The trusty original." },
  { id: "swirl", name: "Swirl pan", lobes: 8, amp: 10, cost: 150, desc: "Wide, swirly ridges. +5 coins per cake." },
  { id: "flower", name: "Flower pan", lobes: 6, amp: 17, cost: 250, desc: "Petal-shaped cakes. +5 coins per cake." },
  { id: "crown", name: "Crown pan", lobes: 16, amp: 12, cost: 350, desc: "A fancy crown edge. +5 coins per cake." }
];
const UPGRADES = [
  { id: "oven", name: "Better oven", desc: "A wider golden zone when baking.", costs: [80, 160, 260] },
  { id: "mixer", name: "Stand mixer", desc: "Batter needs fewer stirs.", costs: [70, 140] },
  { id: "hand", name: "Steady hands", desc: "A wider target when pouring batter.", costs: [90, 180] },
  { id: "rack", name: "Cooling rack", desc: "Cakes cool faster.", costs: [60, 120] }
];
const C = (n, f) => ({ name: n, img: "characters/" + f + ".svg" });
const CUSTOMERS = [C("Santa Bear", "seasonal/winter/santa-bear"), C("Elf Fox", "seasonal/winter/elf-fox"), C("Snow Penguin", "seasonal/winter/snow-penguin"), C("Candy Bunny", "seasonal/winter/candy-bunny"), C("Red-Nose Reindeer", "seasonal/winter/red-nose-reindeer"),
  C("Heart Panda", "seasonal/valentine/heart-panda"), C("Rose Bunny", "seasonal/valentine/rose-bunny"), C("Cupid Pig", "seasonal/valentine/cupid-pig"), C("Love Fox", "seasonal/valentine/love-fox"), C("Sweetheart Bear", "seasonal/valentine/sweetheart-bear"),
  C("Blossom Bunny", "seasonal/spring/blossom-bunny"), C("Rainy Day Duck", "seasonal/spring/rain-duck"), C("Daisy Frog", "seasonal/spring/daisy-frog"), C("Rainbow Chick", "seasonal/spring/rainbow-chick"), C("Garden Panda", "seasonal/spring/garden-panda"),
  C("Sunny Duck", "seasonal/summer/sunny-duck"), C("Beach Pig", "seasonal/summer/beach-pig"), C("Surf Frog", "seasonal/summer/surf-frog"), C("Pool Penguin", "seasonal/summer/pool-penguin"), C("Sun King Bear", "seasonal/summer/sun-bear"),
  C("Leafy Bear", "seasonal/harvest/leaf-bear"), C("Corn Pig", "seasonal/harvest/corn-pig"), C("Scarecrow Frog", "seasonal/harvest/scarecrow-frog"), C("Patch Bunny", "seasonal/harvest/patch-bunny"), C("Harvest Moon Fox", "seasonal/harvest/moon-fox"),
  C("Pumpkin Bear", "halloween/pumpkin-bear"), C("Witch Frog", "halloween/witch-frog"), C("Bat Owl", "halloween/bat-owl"), C("Ghost Rabbit", "halloween/ghost-rabbit"), C("Vampire Dog", "halloween/vampire-dog")];
const STEPS = [["ingredients", "Measure", "Tap the jars to add the scoops on the recipe."], ["mix", "Mix", "Drag in circles around the bowl to stir."], ["pour", "Pour", "Hold to pour batter. Stop inside the green band!"],
  ["bake", "Bake", "Take the cake out when it is golden and in the green zone."], ["cool", "Cool and flip", "Wait for the steam to fade, then flip the pan."], ["decorate", "Decorate", "Glaze it, then add toppings. Match the order!"]];
const byId = (list, id) => list.find(x => x.id === id) || list[0];

/* ====================== save ====================== */
const SAVE_KEY = "dh-bundt-bakery-v1";
let save = { coins: 40, totalStars: 0, served: 0, day: 1, flavors: ["vanilla", "chocolate"], glazes: ["none", "vanilla"], toppings: ["none", "sprinkles"], pans: ["classic"], pan: "classic", up: { oven: 0, mixer: 0, hand: 0, rack: 0 }, cases: [], muted: false };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) save = Object.assign(save, s, { up: Object.assign(save.up, s.up || {}) }); } catch (_) {}
if (FORCE_MUTE) save.muted = true;
const params = new URLSearchParams(location.search);
if (params.get("coins")) save.coins = Number(params.get("coins")) || save.coins;
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} }

/* ====================== sound (soft synthesized effects) ====================== */
const sfx = {
  ctx: null,
  ensure() {
    if (save.muted || FORCE_MUTE) return false;
    if (!this.ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return false; this.ctx = new A(); }
    if (this.ctx.state === "suspended") this.ctx.resume(); return true;
  },
  tone(f, dur, type = "sine", vol = .12, slide) {
    if (!this.ensure()) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + .05);
  },
  pop() { this.tone(520, .09, "triangle", .12, 780); },
  ding() { this.tone(988, .5, "sine", .14); setTimeout(() => this.tone(1319, .6, "sine", .1), 110); },
  whoosh() { this.tone(300, .35, "sawtooth", .05, 90); },
  sparkle() { [880, 1175, 1568].forEach((f, i) => setTimeout(() => this.tone(f, .3, "triangle", .09), i * 90)); },
  pour(on) { if (on) this.tone(200, .12, "sawtooth", .03, 160); },
  oops() { this.tone(220, .3, "square", .06, 130); }
};

/* ====================== helpers ====================== */
let toastT = 0;
function toast(msg) { const d = document.createElement("div"); d.className = "toast"; d.textContent = msg; $("toasts").appendChild(d); setTimeout(() => d.remove(), 2600); }
const SCREENS = ["title", "bake", "result", "shop"];
function showScreen(n) { for (const s of SCREENS) $(s).hidden = s !== n; if (n !== "bake") tickFn = null; }
function updateStats() { $("coins").textContent = save.coins; $("day").textContent = save.day; $("starTotal").textContent = save.totalStars; $("soundBtn").textContent = save.muted ? "Sound off" : "Sound on"; }
let tickFn = null;
function advance(dt) { if (tickFn) tickFn(dt); }
let lastT = performance.now();
setInterval(() => { const now = performance.now(); advance(Math.min(.1, (now - lastT) / 1000)); lastT = now; }, 33);
function svgPoint(svg, e) { const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; return { x: (e.clientX - r.left) / r.width * vb.width, y: (e.clientY - r.top) / r.height * vb.height }; }
function capture(el, e) { try { el.setPointerCapture(e.pointerId); } catch (_) {} }
function mixColor(a, b, t) { const pa = a.match(/\w\w/g).map(h => parseInt(h, 16)), pb = b.match(/\w\w/g).map(h => parseInt(h, 16)); return "#" + pa.map((v, i) => Math.round(lerp(v, pb[i], t)).toString(16).padStart(2, "0")).join(""); }
function bakeColor(fl, p) { const [a, b, c] = fl.baked; p = clamp(p, 0, 1.2); return p < .7 ? mixColor(a, b, p / .7) : mixColor(b, c, clamp((p - .7) / .4, 0, 1)); }

/* ====================== orders ====================== */
function unlocked(list, ids) { return list.filter(x => ids.includes(x.id)); }
function newOrder() {
  const flavor = pick(unlocked(FLAVORS, save.flavors)), glaze = pick(unlocked(GLAZES, save.glazes)), top = pick(unlocked(TOPPINGS, save.toppings));
  const count = top.id === "none" ? 0 : top.id === "sugar" ? 2 : 4 + Math.floor(Math.random() * 4);
  return { who: pick(CUSTOMERS), flavor: flavor.id, glaze: glaze.id, topping: top.id, count };
}
function orderText(o) {
  const fl = byId(FLAVORS, o.flavor), g = byId(GLAZES, o.glaze), t = byId(TOPPINGS, o.topping);
  return `One ${fl.name.toLowerCase()} bundt cake ${o.glaze === "none" ? "with no glaze" : "with " + g.name.toLowerCase()}${o.topping === "none" ? "" : " and " + t.name.toLowerCase()}, please!`;
}
function renderCustomer() {
  const o = run.order, fl = byId(FLAVORS, o.flavor), g = byId(GLAZES, o.glaze), t = byId(TOPPINGS, o.topping);
  $("custImg").src = o.who.img; $("custImg").alt = o.who.name;
  $("bubble").textContent = orderText(o);
  $("ticket").innerHTML = `<h4>${o.who.name.toUpperCase()}'S ORDER</h4><ul><li>Flavor: <b>${fl.name}</b></li><li>Glaze: <b>${g.id === "none" ? "None" : g.name}</b></li><li>Toppings: <b>${t.id === "none" ? "None" : t.name + (o.count ? " (about " + o.count + ")" : "")}</b></li></ul>`;
}

/* ====================== the baking run ====================== */
let run = null;
function startOrder() {
  sfx.ensure(); run = { order: newOrder(), step: -1, sc: {}, mism: {} }; renderCustomer(); showScreen("bake"); nextStep();
}
function renderDots() { $("dots").innerHTML = STEPS.map((_, i) => `<i class="${i < run.step ? "done" : i === run.step ? "on" : ""}"></i>`).join(""); }
function nextStep() {
  tickFn = null; run.step++;
  if (run.step >= STEPS.length) return finishCake();
  const [id, title, hint] = STEPS[run.step]; renderDots(); $("stepTitle").textContent = title; $("stepHint").textContent = hint; $("foot").innerHTML = ""; $("stage").innerHTML = "";
  STEP[id]();
}
function footBtn(label, fn, cls = "") { const b = document.createElement("button"); b.type = "button"; b.className = "btn small " + cls; b.textContent = label; b.addEventListener("click", fn); $("foot").appendChild(b); return b; }
function setNote(txt, bad) { const n = $("note"); if (n) { n.textContent = txt; n.className = "note" + (bad ? " bad" : ""); } }

/* ---------- art ---------- */
function jarSVG(content, lid) { return `<svg viewBox="0 0 56 62" aria-hidden="true"><rect x="12" y="2" width="32" height="9" rx="3" fill="${lid}" stroke="${INK}" stroke-width="2.5"/><path d="M10 12 H46 V52 Q46 58 40 58 H16 Q10 58 10 52Z" fill="#fffdf8" stroke="${INK}" stroke-width="2.5"/><path d="M13 30 H43 V51 Q43 55 39 55 H17 Q13 55 13 51Z" fill="${content}" stroke="${INK}" stroke-width="1.5" opacity=".95"/><path d="M16 15 V26" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/></svg>`; }
function bowlSVG(layers, extraTop) {
  const rects = layers.map((c, i) => `<rect x="30" y="${150 - 12 * (i + 1)}" width="200" height="12" fill="${c}"/>`).join("");
  return `<svg id="bowlSvg" class="stageSvg" viewBox="0 0 260 180" style="max-width:300px"><defs><clipPath id="bowlClip"><path d="M26 70 Q26 160 130 160 Q234 160 234 70Z"/></clipPath></defs>
    <ellipse cx="130" cy="168" rx="86" ry="8" fill="#0002"/><g clip-path="url(#bowlClip)"><rect x="26" y="60" width="208" height="110" fill="#fff4e8"/>${rects}</g>
    <path d="M26 70 Q26 160 130 160 Q234 160 234 70Z" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><ellipse cx="130" cy="70" rx="104" ry="12" fill="none" stroke="${INK}" stroke-width="4"/>
    <path d="M44 100 Q50 140 80 150" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>${extraTop || ""}</svg>`;
}
function cakeSide(fl, p, rise, opts = {}) {
  const c1 = bakeColor(fl, p), c2 = mixColor(c1, "#3a1c0a", .25), h = 64 * rise;
  const ridges = [-52, -28, 0, 28, 52].map(x => `<path d="M${x} -2 Q${x * 1.05} ${-h * .5} ${x * .7} ${-h + 4}" fill="none" stroke="${c2}" stroke-width="3" stroke-linecap="round" opacity=".6"/>`).join("");
  return `<g><path d="M-84 0 C-92 ${-h * .6} -64 ${-h - 4} 0 ${-h - 6} C64 ${-h - 4} 92 ${-h * .6} 84 0Z" fill="${c1}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>${ridges}
    <ellipse cx="0" cy="${-h - 4}" rx="26" ry="7" fill="${c2}" stroke="${INK}" stroke-width="3"/>${opts.crack ? `<path d="M-30 ${-h * .8} l10 14 -8 12 14 16" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` : ""}${opts.burnt ? `<path d="M-60 ${-h * .6} q60 -34 120 0" fill="none" stroke="#1a0a04" stroke-width="6" opacity=".4"/>` : ""}</g>`;
}
function panSide() { return `<g><path d="M-96 -6 L-86 -62 Q-84 -70 -74 -70 H74 Q84 -70 86 -62 L96 -6 Q96 4 86 4 H-86 Q-96 4 -96 -6Z" fill="#9aa4b4" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-80 -56 H80" stroke="#fff" stroke-width="4" opacity=".5" stroke-linecap="round"/><path d="M-22 -70 L-14 -6 H14 L22 -70Z" fill="#8892a0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></g>`; }

/* ---------- step 1: measure ---------- */
function stepIngredients() {
  const o = run.order, fl = byId(FLAVORS, o.flavor);
  const defs = [{ k: "flour", n: "Flour", c: "#fffaf0", lid: "#d9b48a", need: 3 }, { k: "sugar", n: "Sugar", c: "#ffffff", lid: "#ff9db4", need: 2 }, { k: "butter", n: "Butter", c: "#ffe27a", lid: "#f2b134", need: 1 },
    { k: "eggs", n: "Eggs", c: "#ffe9c4", lid: "#c98a52", need: 2 }, { k: "milk", n: "Milk", c: "#eaf4ff", lid: "#6fa8e8", need: 1 }, { k: "extra", n: fl.extra, c: fl.icon, lid: "#8a5a3a", need: 1 }];
  run.added = {}; defs.forEach(d => run.added[d.k] = 0); const log = [];
  $("stage").innerHTML = `<div id="bowlWrap"></div><div class="jars">${defs.map(d => `<button class="jar" type="button" data-k="${d.k}" aria-label="Add ${d.n}">${jarSVG(d.c, d.lid)}<b>${d.n}</b><span class="cnt" id="c_${d.k}">0/${d.need}</span></button>`).join("")}</div><div class="note" id="note">Recipe: 3 flour, 2 sugar, 1 butter, 2 eggs, 1 milk, 1 ${fl.extra.toLowerCase()}.</div>`;
  const refresh = () => {
    $("bowlWrap").innerHTML = bowlSVG(log.map(k => defs.find(d => d.k === k).c));
    for (const d of defs) { const a = run.added[d.k], el = $("c_" + d.k); el.textContent = a + "/" + d.need; el.className = "cnt" + (a === d.need ? " ok" : a > d.need ? " bad" : ""); }
    const exact = defs.every(d => run.added[d.k] === d.need); setNote(exact ? "Perfect recipe!" : "Recipe: 3 flour, 2 sugar, 1 butter, 2 eggs, 1 milk, 1 " + fl.extra.toLowerCase() + ".", false);
  };
  document.querySelectorAll("#stage .jar").forEach(j => j.addEventListener("click", () => { run.added[j.dataset.k]++; log.push(j.dataset.k); sfx.pop(); refresh(); $("bowlSvg").classList.remove("pop"); void $("bowlSvg").getBoundingClientRect(); $("bowlSvg").classList.add("pop"); }));
  footBtn("Undo", () => { const k = log.pop(); if (k) { run.added[k]--; refresh(); } }, "alt");
  footBtn("Done measuring", () => { const err = defs.reduce((s, d) => s + Math.abs(run.added[d.k] - d.need), 0), tot = defs.reduce((s, d) => s + d.need, 0); run.sc.ing = clamp(1 - err / tot * 1.4, 0, 1); nextStep(); });
  refresh();
}

/* ---------- step 2: mix ---------- */
function stepMix() {
  const fl = byId(FLAVORS, run.order.flavor), need = Math.PI * 2 * (4 - save.up.mixer * .8); let prog = 0, last = null, down = false, done = false;
  $("stage").innerHTML = `<svg id="mixSvg" class="stageSvg" viewBox="0 0 300 300"><circle cx="150" cy="150" r="132" fill="#fff4e8" stroke="${INK}" stroke-width="5"/><circle cx="150" cy="150" r="112" fill="${mixColor("#f6ecd0", fl.batter, 0)}" id="batter"/>
    <g id="swirl" transform="rotate(0 150 150)"><path d="M150 150 m0 0 q20 -30 50 -10 q30 26 -4 56 q-44 26 -78 -14 q-34 -50 20 -82 q56 -26 94 18" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity=".5"/>
    <g id="lumps" fill="#fffaf0" opacity=".9"><circle cx="110" cy="120" r="9"/><circle cx="190" cy="130" r="7"/><circle cx="150" cy="190" r="10"/><circle cx="120" cy="180" r="6"/><circle cx="195" cy="180" r="8"/></g></g>
    <g id="whisk"><path d="M0 0 L0 -70" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M0 0 C-22 0 -22 30 0 30 C22 30 22 0 0 0 M-8 2 C-14 18 -8 28 0 30 M8 2 C14 18 8 28 0 30" fill="none" stroke="#c9ced8" stroke-width="3.5" stroke-linecap="round"/><circle cx="0" cy="-70" r="7" fill="#ff8fab" stroke="${INK}" stroke-width="3"/></g></svg>
    <div class="meter"><i id="mixBar" style="width:0%"></i></div><div class="note" id="note">Press and drag around the bowl.</div>`;
  const svg = $("mixSvg"), whisk = $("whisk");
  const place = (x, y) => whisk.setAttribute("transform", `translate(${x} ${y})`); place(150, 150);
  const update = () => {
    const t = clamp(prog / need, 0, 1); $("mixBar").style.width = t * 100 + "%"; $("swirl").setAttribute("transform", `rotate(${prog * 40} 150 150)`); $("batter").setAttribute("fill", mixColor("#f6ecd0", fl.batter, t));
    $("lumps").setAttribute("opacity", String((1 - t) * .9));
    if (t >= 1 && !done) { done = true; setNote("Smooth, creamy batter!"); sfx.sparkle(); run.sc.mix = 1; footBtn("To the pan", () => nextStep()); }
  };
  svg.addEventListener("pointerdown", e => { down = true; capture(svg, e); const p = svgPoint(svg, e); last = Math.atan2(p.y - 150, p.x - 150); place(p.x, p.y); });
  svg.addEventListener("pointermove", e => {
    const p = svgPoint(svg, e), dx = p.x - 150, dy = p.y - 150, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    if (down) { place(clamp(p.x, 30, 270), clamp(p.y, 30, 270)); if (last !== null && r > 22 && r < 140) { let d = a - last; if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; prog += Math.abs(d); update(); } }
    last = a;
  });
  const up = () => { down = false; }; svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up); svg.addEventListener("pointerleave", up);
  footBtn("Stir (tap)", () => { prog += .9; sfx.pop(); update(); place(150 + Math.cos(prog) * 40, 150 + Math.sin(prog) * 40); }, "alt");
  window.__stirNow = () => { prog = need; update(); };
}

/* ---------- step 3: pour ---------- */
function stepPour() {
  let level = 0, pouring = false, locked = false; const center = .62, half = .085 + save.up.hand * .025;
  const top = 205 - (.62 + half) * 135, bot = 205 - (.62 - half) * 135;
  $("stage").innerHTML = `<svg id="pourSvg" class="stageSvg" viewBox="0 0 320 260"><defs><clipPath id="panClip"><path d="M64 70 L74 205 Q74 212 82 212 H238 Q246 212 246 205 L256 70Z"/></clipPath></defs>
    <rect x="50" y="${top}" width="220" height="${bot - top}" fill="#8fe0a8" opacity=".45"/><text x="276" y="${(top + bot) / 2 + 4}" font-size="12" font-weight="800" fill="#3f8a68" font-family="Nunito">fill here</text>
    <g clip-path="url(#panClip)"><rect id="batterFill" x="50" y="205" width="220" height="0" fill="${byId(FLAVORS, run.order.flavor).batter}"/></g>
    <path d="M64 70 L74 205 Q74 212 82 212 H238 Q246 212 246 205 L256 70" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M142 70 L150 205 H170 L178 70Z" fill="#8892a0" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <g id="pitcher" transform="translate(70 18) rotate(0)"><path d="M0 0 H60 L54 44 Q54 52 46 52 H14 Q6 52 6 44Z" fill="#fff4e8" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M60 8 Q74 8 74 22" fill="none" stroke="${INK}" stroke-width="4"/><path d="M10 18 H50 V44 H10Z" fill="${byId(FLAVORS, run.order.flavor).batter}" opacity=".9"/></g>
    <rect id="stream" x="98" y="44" width="9" height="0" rx="4" fill="${byId(FLAVORS, run.order.flavor).batter}" stroke="${INK}" stroke-width="2"/></svg>
    <div class="note" id="note">Press and hold the button to pour.</div>`;
  const btn = footBtn("Hold to pour", () => {}, "warm"); btn.id = "pourBtn";
  const draw = () => {
    const h = level * 135, surf = 205 - h; $("batterFill").setAttribute("y", surf); $("batterFill").setAttribute("height", h + 8);
    const s = $("stream"); s.setAttribute("height", pouring ? Math.max(0, surf - 44) : 0);
    $("pitcher").setAttribute("transform", `translate(70 18) rotate(${pouring ? -22 : 0} 30 30)`);
  };
  const finish = () => {
    if (locked) return; locked = true; pouring = false; draw(); const d = Math.abs(level - center); let sc = d <= half ? 1 : Math.max(.35, 1 - (d - half) * 3.2); if (level >= 1) sc = .35;
    run.sc.pour = sc; run.fill = level; btn.disabled = true;
    setNote(level >= 1 ? "Overflowing! A bit messy." : d <= half ? "Perfect fill!" : level < center ? "A little low, but okay." : "A bit full, but okay.", level >= 1 || d > half); if (sc >= .95) sfx.sparkle();
    footBtn("Into the oven", () => nextStep());
  };
  const go = e => { if (locked) return; e && e.preventDefault(); pouring = true; capture(btn, e); sfx.pour(true); };
  const stop = () => { if (pouring) { pouring = false; finish(); } };
  btn.addEventListener("pointerdown", go); btn.addEventListener("pointerup", stop); btn.addEventListener("pointercancel", stop); btn.addEventListener("lostpointercapture", stop);
  btn.addEventListener("keydown", e => { if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); if (!e.repeat) go(); } }); btn.addEventListener("keyup", e => { if (e.code === "Space" || e.code === "Enter") stop(); });
  tickFn = dt => { if (pouring && !locked) { level += .2 * dt; if (level >= 1) { level = 1; finish(); } draw(); } };
  window.__pourState = () => ({ level, center, half });
  draw();
}

/* ---------- step 4: bake ---------- */
function stepBake() {
  const fl = byId(FLAVORS, run.order.flavor); let p = 0, out = false; const zc = .72, zh = .085 + save.up.oven * .03, bakeSec = 8.5;
  $("stage").innerHTML = `<svg id="ovenSvg" class="stageSvg" viewBox="0 0 340 250"><rect x="30" y="14" width="280" height="226" rx="26" fill="#e8ecf2" stroke="${INK}" stroke-width="5"/><rect x="30" y="14" width="280" height="44" rx="22" fill="#cfd6e2" stroke="${INK}" stroke-width="5"/>
    <circle cx="80" cy="36" r="9" fill="#ff8fab" stroke="${INK}" stroke-width="3"/><circle cx="116" cy="36" r="9" fill="#ffd36b" stroke="${INK}" stroke-width="3"/><circle cx="152" cy="36" r="9" fill="#8fd6b5" stroke="${INK}" stroke-width="3"/>
    <rect x="52" y="72" width="236" height="150" rx="16" fill="#2a1a12" stroke="${INK}" stroke-width="5"/><rect id="glow" x="56" y="76" width="228" height="142" rx="13" fill="#ff9a3a" opacity=".35"/>
    <path d="M62 196 H278" stroke="#9aa4b4" stroke-width="5" stroke-linecap="round"/><g transform="translate(170 196)"><g id="panG">${panSide()}</g><g id="cakeG"></g></g></svg>
    <div class="meter" id="gauge"><span class="zone" style="left:${(zc - zh) * 100 / 1.12}%;width:${zh * 2 * 100 / 1.12}%"></span><i id="bakeBar" style="width:0%"></i><span class="needle" id="needle" style="left:0%"></span></div><div class="note" id="note">Baking... watch the color and the green zone.</div>`;
  const draw = () => {
    const rise = (.35 + .65 * Math.min(p, .85) / .85) * (.55 + run.fill * .6 > 1.1 ? 1.1 : .55 + run.fill * .6);
    $("cakeG").innerHTML = cakeSide(fl, p, clamp(rise, .3, 1.15), { burnt: p > .95 }); $("glow").setAttribute("opacity", String(.25 + .25 * Math.sin(p * 40)));
    $("bakeBar").style.width = clamp(p / 1.12, 0, 1) * 100 + "%"; $("needle").style.left = clamp(p / 1.12, 0, 1) * 100 + "%";
    const d = Math.abs(p - zc); setNote(p < zc - zh - .1 ? "Still pale and gooey..." : p < zc - zh ? "Getting close..." : d <= zh ? "Golden brown! Take it out now!" : p < 1.0 ? "A little dark..." : "Smoke! Quick!", d > zh && p > zc);
  };
  const takeOut = () => {
    if (out) return; out = true; tickFn = null; const d = Math.abs(p - zc); let sc = d <= zh ? 1 : Math.max(.3, 1 - (d - zh) * 3.2); if (p >= 1.1) sc = .3;
    run.sc.bake = sc; run.bakeP = p; sfx.ding(); setNote(sc >= .95 ? "Perfectly golden!" : p < zc ? "A bit pale, but it will do." : "A little too brown, but still cake!", sc < .95);
    footBtn("Let it cool", () => nextStep()); document.getElementById("takeOut").disabled = true;
  };
  const b = footBtn("Take it out!", takeOut, "warm"); b.id = "takeOut";
  tickFn = dt => { p += dt / bakeSec; if (p >= 1.1) { p = 1.1; draw(); takeOut(); return; } draw(); };
  window.__bakeState = () => ({ p, zc, zh });
  draw();
}

/* ---------- step 5: cool and flip ---------- */
function stepCool() {
  const fl = byId(FLAVORS, run.order.flavor); let cool = 0, flipped = false; const coolSec = 4.5 / (1 + save.up.rack * .35), p = run.bakeP;
  const rise = clamp(.55 + run.fill * .6, .5, 1.1);
  $("stage").innerHTML = `<svg id="flipSvg" class="stageSvg" viewBox="0 0 340 250"><ellipse cx="170" cy="226" rx="120" ry="14" fill="#fff" stroke="${INK}" stroke-width="4"/><path d="M60 214 H280" stroke="#d6dbe4" stroke-width="3" stroke-linecap="round"/><g transform="translate(170 214)"><g id="panG2">${panSide()}</g><g id="cakeG2" style="transition:transform .7s cubic-bezier(.3,1.4,.5,1)">${cakeSide(fl, p, rise)}</g></g>
    <g id="steam" transform="translate(170 110)"><path class="steam" d="M-40 0 q-10 -16 0 -30" fill="none" stroke="#c9ced8" stroke-width="6" stroke-linecap="round"/><path class="steam" style="animation-delay:.7s" d="M0 6 q-10 -18 0 -34" fill="none" stroke="#c9ced8" stroke-width="6" stroke-linecap="round"/><path class="steam" style="animation-delay:1.4s" d="M40 0 q-10 -16 0 -30" fill="none" stroke="#c9ced8" stroke-width="6" stroke-linecap="round"/></g></svg>
    <div class="meter"><span class="zone" style="left:80%;width:20%"></span><i id="coolBar" style="width:0%;background:linear-gradient(90deg,#ff9a5a,#8fd6e8)"></i></div><div class="note" id="note">It is steaming hot. Let it cool...</div>`;
  const flip = () => {
    if (flipped) return; flipped = true; tickFn = null; const good = cool >= .8; run.sc.flip = good ? 1 : Math.max(.35, .4 + cool * .7); sfx.whoosh();
    $("panG2").style.transition = "transform .8s ease-in"; $("panG2").style.transform = "translateY(-110px) rotate(180deg)"; $("steam").style.display = "none";
    setTimeout(() => { $("cakeG2").style.transform = "translateY(10px)"; if (!good) { $("cakeG2").innerHTML = cakeSide(fl, p, rise, { crack: true }); setNote("Oh no, it cracked! Wait for the steam next time.", true); sfx.oops(); } else { setNote("It slid out perfectly!"); sfx.sparkle(); } footBtn("Decorate!", () => nextStep()); }, 800);
    document.getElementById("flipBtn").disabled = true;
  };
  const b = footBtn("Flip it!", flip, "warm"); b.id = "flipBtn";
  tickFn = dt => { cool = Math.min(1, cool + dt / coolSec); $("coolBar").style.width = cool * 100 + "%"; $("steam").style.opacity = String(Math.max(0, 1 - cool * 1.2)); if (cool >= .8 && !flipped) setNote("Cool enough. Flip it!"); };
  window.__coolState = () => ({ cool });
}

/* ---------- step 6: decorate ---------- */
const SPRINKLE = ["#ff6b8b", "#ffd23f", "#4fd1ff", "#8fe08f", "#c06ad8"];
function stepDecorate() {
  const o = run.order, fl = byId(FLAVORS, o.flavor), pan = byId(PANS, save.pan), p = clamp(run.bakeP || .72, 0, 1.1), cake = { cx: 170, cy: 170, R: 142, r: 52 };
  const glazePts = [], tops = [], actions = []; let tool = { kind: o.glaze !== "none" ? "glaze" : "top", id: o.glaze !== "none" ? o.glaze : (o.topping !== "none" ? o.topping : "sprinkles") };
  if (tool.kind === "glaze" && !save.glazes.includes(tool.id)) tool = { kind: "glaze", id: "vanilla" };
  const glazeList = unlocked(GLAZES, save.glazes).filter(g => g.id !== "none"), topList = unlocked(TOPPINGS, save.toppings).filter(t => t.id !== "none");
  $("stage").innerHTML = `<div id="deco"><canvas id="decoCanvas" width="680" height="680" aria-label="Your cake"></canvas><div class="tools"><h5>GLAZE</h5><div class="pal" id="palG"></div><h5>TOPPINGS</h5><div class="pal" id="palT"></div><div class="note" id="note">Pick a glaze, then drag over the cake.</div></div></div>`;
  const cv = $("decoCanvas"), ctx = cv.getContext("2d");
  const shapeR = a => cake.R + pan.amp * Math.sin(pan.lobes * a) * .6;
  function ringPath() { ctx.beginPath(); for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2, r = shapeR(a); const x = cake.cx + Math.cos(a) * r, y = cake.cy + Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); }
  function glazeColor(id) { return byId(GLAZES, id).color; }
  function drawTopping(t) {
    ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.rot); const s = t.s;
    if (t.id === "sprinkles") { for (let i = 0; i < 7; i++) { ctx.strokeStyle = SPRINKLE[(i + t.seed) % 5]; ctx.lineWidth = 3.4; ctx.lineCap = "round"; ctx.beginPath(); const ax = Math.cos(i * 2.2 + t.seed) * 11, ay = Math.sin(i * 2.2 + t.seed) * 11, a = i * 1.1; ctx.moveTo(ax, ay); ctx.lineTo(ax + Math.cos(a) * 6, ay + Math.sin(a) * 6); ctx.stroke(); } }
    else if (t.id === "sugar") { for (let i = 0; i < 46; i++) { const a = i * 2.4 + t.seed, r = (i % 9) * 6 + 2; ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 1.7 + (i % 3) * .5, 0, 7); ctx.fill(); } }
    else if (t.id === "berries") { ctx.fillStyle = "#d8284a"; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 9 * s, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#ffffff99"; ctx.beginPath(); ctx.arc(-3, -3, 2.6, 0, 7); ctx.fill(); ctx.fillStyle = "#2f9a4a"; ctx.beginPath(); ctx.arc(0, -8 * s, 3, 0, 7); ctx.fill(); }
    else if (t.id === "nuts") { ctx.fillStyle = "#b8803a"; ctx.strokeStyle = INK; ctx.lineWidth = 1.8; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(Math.cos(i * 2.1) * 6, Math.sin(i * 2.1) * 6, 5.5, 4, i, 0, 7); ctx.fill(); ctx.stroke(); } }
    else if (t.id === "flowers") { ctx.strokeStyle = INK; ctx.lineWidth = 1.8; for (let i = 0; i < 5; i++) { ctx.fillStyle = "#ffb6d0"; ctx.beginPath(); ctx.ellipse(Math.cos(i * 1.256) * 6.5, Math.sin(i * 1.256) * 6.5, 5.5, 4, i * 1.256, 0, 7); ctx.fill(); ctx.stroke(); } ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.arc(0, 0, 3.6, 0, 7); ctx.fill(); }
    else if (t.id === "chips") { ctx.fillStyle = "#3a2014"; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); const x = Math.cos(i * 2.2) * 7, y = Math.sin(i * 2.2) * 7; ctx.moveTo(x, y - 5); ctx.lineTo(x + 4.5, y + 4); ctx.lineTo(x - 4.5, y + 4); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
    else if (t.id === "hearts") { ctx.fillStyle = "#ff6b8b"; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 7); ctx.bezierCurveTo(-14, -2, -8, -13, 0, -5); ctx.bezierCurveTo(8, -13, 14, -2, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
  function draw() {
    ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, 340, 340);
    ctx.fillStyle = "#fff"; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(170, 170, 166, 0, 7); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.shadowColor = "#0003"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4; ringPath(); const g = ctx.createRadialGradient(170, 170, 40, 170, 170, 150); g.addColorStop(0, bakeColor(fl, p * .9)); g.addColorStop(1, bakeColor(fl, p)); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ringPath(); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = mixColor(bakeColor(fl, p), "#3a1c0a", .3); ctx.lineWidth = 2.5; ctx.globalAlpha = .45; for (let i = 0; i < pan.lobes * 2; i++) { const a = i / (pan.lobes * 2) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(170 + Math.cos(a) * 58, 170 + Math.sin(a) * 58); ctx.lineTo(170 + Math.cos(a) * 128, 170 + Math.sin(a) * 128); ctx.stroke(); } ctx.globalAlpha = 1;
    // glaze
    for (const q of glazePts) { ctx.fillStyle = glazeColor(q.id); ctx.beginPath(); ctx.arc(q.x, q.y, 15, 0, 7); ctx.fill(); }
    for (const q of glazePts) { const dd = Math.hypot(q.x - 170, q.y - 170); if (dd > 118) { ctx.fillStyle = glazeColor(q.id); ctx.beginPath(); ctx.ellipse(170 + (q.x - 170) / dd * (shapeR(Math.atan2(q.y - 170, q.x - 170)) + 3), 170 + (q.y - 170) / dd * (shapeR(Math.atan2(q.y - 170, q.x - 170)) + 3), 7, 11 + (q.s % 5) * 2, Math.atan2(q.y - 170, q.x - 170) + Math.PI / 2, 0, 7); ctx.fill(); } }
    if (glazePts.length) { ctx.globalAlpha = .55; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.lineCap = "round"; for (const q of glazePts) { if (q.s % 3 === 0) { ctx.beginPath(); ctx.moveTo(q.x - 6, q.y - 6); ctx.lineTo(q.x - 2, q.y - 9); ctx.stroke(); } } ctx.globalAlpha = 1; }
    // hole
    ctx.beginPath(); ctx.arc(170, 170, cake.r, 0, 7); const hg = ctx.createRadialGradient(170, 170, 8, 170, 170, cake.r); hg.addColorStop(0, "#fff"); hg.addColorStop(1, "#eadbc8"); ctx.fillStyle = hg; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
    for (const t of tops) drawTopping(t);
  }
  function coverage() { let hit = 0, n = 0; for (let i = 0; i < 260; i++) { const a = i * 2.399, r = cake.r + 10 + ((i * 37) % 100) / 100 * (cake.R - cake.r - 24); const x = 170 + Math.cos(a) * r, y = 170 + Math.sin(a) * r; n++; if (glazePts.some(q => (q.x - x) * (q.x - x) + (q.y - y) * (q.y - y) < 20 * 20)) hit++; } return hit / n; }
  function inRing(x, y) { const dd = Math.hypot(x - 170, y - 170), a = Math.atan2(y - 170, x - 170); return dd > cake.r + 4 && dd < shapeR(a) - 3; }
  const palette = () => {
    $("palG").innerHTML = glazeList.map(g => `<button class="tool ${tool.kind === "glaze" && tool.id === g.id ? "sel" : ""}" data-k="glaze" data-id="${g.id}" type="button"><i style="background:${g.color}"></i>${g.name}</button>`).join("");
    $("palT").innerHTML = topList.map(t => `<button class="tool ${tool.kind === "top" && tool.id === t.id ? "sel" : ""}" data-k="top" data-id="${t.id}" type="button">${t.name}</button>`).join("");
    document.querySelectorAll("#deco .tool").forEach(b => b.addEventListener("click", () => { tool = { kind: b.dataset.k, id: b.dataset.id }; palette(); setNote(tool.kind === "glaze" ? "Drag over the cake to glaze it." : "Tap or drag to place toppings."); sfx.pop(); }));
  };
  let drawing = false, lastP = null, stroke = null;
  const pt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 340, y: (e.clientY - r.top) / r.height * 340 }; };
  const addAt = (x, y, first) => {
    if (tool.kind === "glaze") { if (!inRing(x, y)) return; if (lastP && Math.hypot(x - lastP.x, y - lastP.y) < 5 && !first) return; const q = { x, y, id: tool.id, s: glazePts.length }; glazePts.push(q); stroke.items.push(q); lastP = { x, y }; }
    else { if (!inRing(x, y) || tops.length >= 70) return; if (lastP && Math.hypot(x - lastP.x, y - lastP.y) < 22 && !first) return; const t = { x, y, id: tool.id, rot: Math.random() * 6.28, s: .9 + Math.random() * .3, seed: Math.floor(Math.random() * 9) }; tops.push(t); stroke.items.push(t); lastP = { x, y }; sfx.pop(); }
    draw();
  };
  cv.addEventListener("pointerdown", e => { drawing = true; capture(cv, e); lastP = null; stroke = { kind: tool.kind, items: [] }; const q = pt(e); addAt(q.x, q.y, true); });
  cv.addEventListener("pointermove", e => { if (!drawing) return; const q = pt(e); addAt(q.x, q.y, false); });
  const end = () => { if (drawing && stroke && stroke.items.length) actions.push(stroke); drawing = false; stroke = null; };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end); cv.addEventListener("pointerleave", end);
  footBtn("Undo", () => { const a = actions.pop(); if (!a) return; for (const it of a.items) { const arr = a.kind === "glaze" ? glazePts : tops; const i = arr.indexOf(it); if (i >= 0) arr.splice(i, 1); } draw(); }, "alt");
  footBtn("Clear", () => { glazePts.length = 0; tops.length = 0; actions.length = 0; draw(); }, "alt");
  footBtn("Done decorating", () => {
    const cover = coverage(), tally = {}; for (const q of glazePts) tally[q.id] = (tally[q.id] || 0) + 1; const used = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0] || "none";
    let glazeSc, glazeBad = false;
    if (o.glaze === "none") glazeSc = glazePts.length === 0 ? 1 : .4; else { const base = clamp(cover / .65, 0, 1); glazeBad = used !== o.glaze; glazeSc = glazeBad ? base * .45 : base; }
    const same = tops.filter(t => t.id === o.topping).length; let topSc, topBad = false;
    if (o.topping === "none") topSc = tops.length === 0 ? 1 : .4; else { topBad = same < Math.ceil(tops.length / 2) || same === 0; topSc = clamp(same / o.count, 0, 1) * (topBad ? .5 : 1); }
    run.sc.glaze = glazeSc; run.sc.top = topSc; run.mism = { glaze: glazeBad, top: topBad }; run.cover = cover;
    const big = document.createElement("canvas"); big.width = 340; big.height = 340; big.getContext("2d").drawImage(cv, 0, 0, 340, 340); run.image = big.toDataURL("image/jpeg", .85);
    const th = document.createElement("canvas"); th.width = th.height = 96; th.getContext("2d").drawImage(cv, 0, 0, 96, 96); run.thumb = th.toDataURL("image/jpeg", .7); nextStep();
  }, "warm");
  palette(); draw();
  window.__deco = { addAt: (x, y) => { stroke = { kind: tool.kind, items: [] }; lastP = null; addAt(x, y, true); actions.push(stroke); stroke = null; }, setTool: (k, id) => { tool = { kind: k, id }; palette(); }, glazeCount: () => glazePts.length, topCount: () => tops.length, cake };
}
const STEP = { ingredients: stepIngredients, mix: stepMix, pour: stepPour, bake: stepBake, cool: stepCool, decorate: stepDecorate };

/* ====================== serving ====================== */
const LINES = { 5: ["It is PERFECT! I could cry.", "A masterpiece! Best bundt in town!", "Wow! Five stars and a hug!"], 4: ["Delicious! Almost perfect.", "So tasty! I will be back.", "Lovely work, baker!"], 3: ["Pretty good! Nice effort.", "Tasty enough! Keep practicing.", "Not bad at all."], 2: ["Hmm... it is a little rough.", "I have had better, but thanks.", "A bit odd, but I will eat it."], 1: ["Oh dear... it is an adventure.", "I will take it... to go.", "We all start somewhere!"] };
function finishCake() {
  const w = { ing: .2, mix: .05, pour: .15, bake: .25, flip: .1, glaze: .13, top: .12 }; let total = 0; for (const k in w) total += w[k] * (run.sc[k] ?? 0);
  let stars = total >= .93 ? 5 : total >= .82 ? 4 : total >= .66 ? 3 : total >= .45 ? 2 : 1; const wrong = run.mism.glaze || run.mism.top; if (wrong) stars = Math.min(stars, 3);
  const coins = 15 + stars * 12 + (stars === 5 ? 15 : 0) + (save.pan !== "classic" ? 5 : 0);
  save.coins += coins; save.totalStars += stars; save.served++; if (save.served % 4 === 0) save.day++;
  if (run.thumb) { save.cases.unshift(run.thumb); save.cases = save.cases.slice(0, 8); } persist(); updateStats();
  try { window.DHScores && DHScores.submit("bundt-bakery", save.totalStars, { now: true }); } catch (_) {}
  $("resultImg").src = run.image || ""; $("resultStars").innerHTML = [1, 2, 3, 4, 5].map(n => n <= stars ? "&#9733;" : "<i>&#9733;</i>").join("");
  $("resultLine").textContent = run.order.who.name + ": " + pick(LINES[stars]) + (wrong ? " (But that was not quite what I ordered...)" : "") + "  +" + coins + " coins";
  const pct = k => Math.round((run.sc[k] ?? 0) * 100) + "%";
  $("resultBreak").innerHTML = [["Measuring", "ing"], ["Mixing", "mix"], ["Pouring", "pour"], ["Baking", "bake"], ["Flipping", "flip"], ["Glaze", "glaze"], ["Toppings", "top"]].map(([n, k]) => `<div><b>${pct(k)}</b>${n}</div>`).join("");
  sfx.sparkle(); showScreen("result"); run.stars = stars; run.coins = coins;
}

/* ====================== shop ====================== */
function owned(kind, id) { return kind === "flavors" ? save.flavors.includes(id) : kind === "glazes" ? save.glazes.includes(id) : kind === "toppings" ? save.toppings.includes(id) : save.pans.includes(id); }
function buy(kind, item) { if (save.coins < item.cost || owned(kind, item.id)) return; save.coins -= item.cost; save[kind].push(item.id); sfx.sparkle(); toast(item.name + " unlocked!"); persist(); updateStats(); renderShop(); }
function renderShop() {
  const sec = (title, kind, list) => `<div class="sec">${title}</div><div class="shopGrid">${list.filter(x => x.id !== "none").map(x => { const has = owned(kind, x.id), cls = has ? "owned" : "";
    const action = kind === "pans" && has ? (save.pan === x.id ? `<b>In use</b>` : `<button class="btn small alt" data-use="${x.id}" type="button">Use this pan</button>`) : has ? `<b>Owned</b>` : `<button class="btn small warm" data-buy="${kind}:${x.id}" type="button" ${save.coins < x.cost ? "disabled" : ""}>Buy for ${x.cost}</button>`;
    return `<div class="shopCard ${cls}"><h4>${x.name}</h4><p>${x.desc || ""}</p>${action}</div>`; }).join("")}</div>`;
  const ups = `<div class="sec">Kitchen upgrades</div><div class="shopGrid">${UPGRADES.map(u => { const lvl = save.up[u.id], next = u.costs[lvl];
    return `<div class="shopCard ${next === undefined ? "owned" : ""}"><h4>${u.name} (level ${lvl}/${u.costs.length})</h4><p>${u.desc}</p>${next === undefined ? "<b>Maxed out</b>" : `<button class="btn small warm" data-up="${u.id}" type="button" ${save.coins < next ? "disabled" : ""}>Upgrade for ${next}</button>`}</div>`; }).join("")}</div>`;
  $("shopBody").innerHTML = `<div class="chip"><span>${save.coins}</span><small>coins to spend</small></div>` + sec("Flavors", "flavors", FLAVORS) + sec("Glazes", "glazes", GLAZES) + sec("Toppings", "toppings", TOPPINGS.map(t => ({ ...t, desc: "" }))) + sec("Pans", "pans", PANS) + ups;
  $("shopBody").querySelectorAll("[data-buy]").forEach(b => b.addEventListener("click", () => { const [k, id] = b.dataset.buy.split(":"), list = { flavors: FLAVORS, glazes: GLAZES, toppings: TOPPINGS, pans: PANS }[k]; buy(k, byId(list, id)); }));
  $("shopBody").querySelectorAll("[data-use]").forEach(b => b.addEventListener("click", () => { save.pan = b.dataset.use; persist(); renderShop(); toast("Pan changed!"); }));
  $("shopBody").querySelectorAll("[data-up]").forEach(b => b.addEventListener("click", () => { const u = UPGRADES.find(x => x.id === b.dataset.up), c = u.costs[save.up[u.id]]; if (save.coins >= c) { save.coins -= c; save.up[u.id]++; sfx.sparkle(); toast(u.name + " upgraded!"); persist(); updateStats(); renderShop(); } }));
}
let shopFrom = "title";
function openShop(from) { shopFrom = from; renderShop(); showScreen("shop"); }

/* ====================== title and wiring ====================== */
function showTitle() {
  showScreen("title"); updateStats(); const cs = $("case"); cs.innerHTML = save.cases.map(s => `<img src="${s}" alt="A cake you baked">`).join(""); $("caseWrap").hidden = !save.cases.length;
  $("playBtn").textContent = save.served ? "Next customer" : "Start baking";
}
$("playBtn").addEventListener("click", startOrder); $("shopBtn").addEventListener("click", () => openShop("title"));
$("nextBtn").addEventListener("click", startOrder); $("resShopBtn").addEventListener("click", () => openShop("result"));
$("shopBack").addEventListener("click", () => { if (shopFrom === "result") showScreen("result"); else showTitle(); });
$("soundBtn").addEventListener("click", () => { if (FORCE_MUTE) return; save.muted = !save.muted; persist(); updateStats(); if (!save.muted) sfx.ensure(); });
updateStats(); showTitle();
window.__bundt = { get save() { return save; }, get run() { return run; }, STEPS, startOrder, nextStep, advanceTime(sec) { const n = Math.max(1, Math.round(sec / .033)); for (let i = 0; i < n; i++) advance(.033); }, finishCake, showTitle };
})();
