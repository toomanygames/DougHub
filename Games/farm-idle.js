"use strict";
/* Farm Idle: plant, harvest, raise animals, build a farm, fill orders, and hold festivals.
   A living scene (day and night, four seasons, weather, critters) surrounds your plots. All art is drawn in code. */
(function(){
const SAVE_KEY = "dh-farm-idle-v1";
const FORCE_MUTE = /[?&]mute=1/.test(location.search);
const $ = id => document.getElementById(id);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const pick=a=>a[Math.floor(Math.random()*a.length)];
const SEASONS=["Spring","Summer","Autumn","Winter"];
const DAY_SEC=300, SEASON_SEC=600, MAX_PLOTS=36;

/* ---------- data ---------- */
const CROPS = [
  {n:"Wheat",       t:4,     v:2,        unlock:0,       col:"#e8c04a", s:2},
  {n:"Carrot",      t:10,    v:8,        unlock:60,      col:"#ff8a1f", s:0},
  {n:"Tomato",      t:25,    v:36,       unlock:400,     col:"#e53935", s:1},
  {n:"Corn",        t:60,    v:170,      unlock:2500,    col:"#fbc02d", s:1},
  {n:"Strawberry",  t:140,   v:820,      unlock:15000,   col:"#e6194b", s:0},
  {n:"Pumpkin",     t:300,   v:4100,     unlock:90000,   col:"#f57c00", s:2},
  {n:"Sunflower",   t:700,   v:21000,    unlock:600000,  col:"#ffd600", s:1},
  {n:"Golden Melon",t:1500,  v:120000,   unlock:5e6,      col:"#ffca28", s:3},
  {n:"Dragonfruit", t:3200,  v:700000,   unlock:4e7,      col:"#ff3d9a", s:1},
  {n:"Moonflower",  t:6000,  v:4.5e6,    unlock:3e8,      col:"#b39ddb", s:3, night:true},
  {n:"Starfruit",   t:12000, v:3e7,      unlock:2.5e9,    col:"#fff176", s:2},
  {n:"Crystal Beet",t:25000, v:2.2e8,    unlock:2.5e10,   col:"#4dd0e1", s:3}
];
const MOON=9;
const UP = {
  plots:{n:"New plot",   d:"Adds another plot to your farm.",               cost:l=>40*Math.pow(1.6,l)},
  fert: {n:"Fertilizer", d:"Crops grow 15% faster.",                         cost:l=>80*Math.pow(2.0,l), max:40},
  yield:{n:"Bigger harvest",d:"Every harvest is worth 25% more coins.",      cost:l=>120*Math.pow(2.2,l), max:60},
  clover:{n:"Lucky clover",d:"+3% chance that a harvest is worth 5 times as much.",cost:l=>500*Math.pow(2.6,l), max:15},
  hand: {n:"Farmhand",   d:"Harvests ready crops for you. Higher levels work faster and harvest more at once.",cost:l=>600*Math.pow(1.9,l), max:30},
  auto: {n:"Auto-planter",d:"Replants empty plots with the crop you have selected.",cost:l=>2500, max:1},
  scare:{n:"Scarecrow",  d:"Your farm keeps earning for 1 more hour while you are away.",cost:l=>2000*Math.pow(2.4,l), max:11},
  rain: {n:"Rain dance", d:"Rain clouds visit your farm more often.",        cost:l=>1500*Math.pow(2.3,l), max:10},
  happy:{n:"Happy animals",d:"Every animal makes 20% more coins.",           cost:l=>3000*Math.pow(2.1,l), max:30}
};
const UP_ORDER = ["plots","fert","yield","hand","auto","clover","scare","rain"];
const ANIMALS = [
  {id:"chicken",n:"Chicken", d:"Lays eggs all day.",            cost:100,   cps:0.6},
  {id:"sheep",  n:"Sheep",   d:"Soft wool, steady coins.",      cost:1500,  cps:6},
  {id:"cow",    n:"Cow",     d:"Fresh milk every morning.",     cost:2e4,   cps:70},
  {id:"pig",    n:"Pig",     d:"Finds truffles in the mud.",    cost:3e5,   cps:900},
  {id:"bee",    n:"Honeybee colony",d:"Sweet honey from the meadow.",cost:5e6,cps:1.3e4},
  {id:"alpaca", n:"Alpaca",  d:"Fancy fluffy fleece.",          cost:8e7,   cps:2e5},
  {id:"dragon", n:"Baby dragon",d:"Hoards coins. Very friendly.",cost:1.5e9, cps:3.5e6}
];
const BUILD = [
  {id:"greenhouse",n:"Greenhouse",d:"Crops grow 8% faster per level.",     max:10, cost:l=>800*Math.pow(2.2,l)},
  {id:"market",    n:"Market stall",d:"All coins x1.12 per level.",        max:10, cost:l=>1500*Math.pow(2.4,l)},
  {id:"windmill",  n:"Windmill",d:"Farmhands work 10% faster per level.",  max:10, cost:l=>4000*Math.pow(2.3,l)},
  {id:"well",      n:"Well",d:"Rain lasts 5 seconds longer per level.",    max:5,  cost:l=>1200*Math.pow(2.3,l)},
  {id:"silo",      n:"Silo",d:"Keep earning 30 minutes longer while you are away.",max:10,cost:l=>2500*Math.pow(2.2,l)},
  {id:"hive",      n:"Beehive",d:"Bees speed up a random crop every few seconds.",max:8,cost:l=>6000*Math.pow(2.5,l)}
];
const DECOR = [
  {id:"flowers", n:"Flower beds",   d:"Pretty! Golden butterflies visit more often.", gems:3},
  {id:"chime",   n:"Wind chimes",   d:"A soft tinkle in the breeze. +2% coins.",      gems:5},
  {id:"lanterns",n:"Lantern string",d:"Glows at night. +3% coins.",                   gems:6},
  {id:"pond",    n:"Duck pond",     d:"Calm ducks. Crops grow 5% faster.",            gems:8},
  {id:"cat",     n:"Barn cat",      d:"Naps on the barn roof. Orders pay 1 extra gem.",gems:8},
  {id:"dog",     n:"Farm dog",      d:"Collects animal goods and butterflies for you.",gems:12},
  {id:"fountain",n:"Fountain",      d:"Splashy. Crops grow 10% faster.",              gems:15},
  {id:"rainbow", n:"Rainbow arch",  d:"A permanent rainbow. +10% coins.",             gems:20}
];
const TREE = {
  soil:    {n:"Rich soil",        d:"All coins x1.25 per level.",                        max:15, cost:l=>1+l,       req:null, tier:1},
  sprout:  {n:"Quick sprouts",    d:"Crops grow 10% faster per level.",                  max:15, cost:l=>1+l,       req:"soil", tier:2},
  head:    {n:"Head start",       d:"Start every season with 1 more plot per level.",    max:8,  cost:l=>2+l*2,     req:"soil", tier:2},
  ranchers:{n:"Ranch heritage",   d:"Start every season with 3 chickens per level.",     max:5,  cost:l=>2+l*2,     req:"soil", tier:2},
  hands:   {n:"Tireless farmhand",d:"Level 1: start with a Farmhand. Level 2: start with the Auto-planter. Level 3: Farmhand starts at level 5.", max:3, cost:l=>[3,8,20][l], req:"sprout", tier:3},
  seeds:   {n:"Seed bank",        d:"Start every season with better seeds already unlocked (Carrot, Tomato, Corn, Strawberry).", max:4, cost:l=>[2,6,15,40][l], req:"head", tier:3},
  bounty:  {n:"Seasonal bounty",  d:"In-season crops sell for 20% more per level.",       max:5,  cost:l=>3+2*l,     req:"sprout", tier:3},
  compound:{n:"Compound interest",d:"Festivals give 15% more sunseeds per level.",       max:10, cost:l=>5+3*l,     req:"hands", tier:4},
  golden:  {n:"Golden hour",      d:"+2% chance per level that a harvest is golden (worth 10 times as much).", max:10, cost:l=>6+4*l, req:"seeds", tier:4},
  slumber: {n:"Long slumber",     d:"Earn for 2 more hours per level while you are away.", max:6, cost:l=>4+2*l,    req:"hands", tier:4},
  gemfind: {n:"Gem finder",       d:"Orders pay 1 more gem per level.",                  max:3,  cost:l=>6+4*l,     req:"bounty", tier:4}
};
const TREE_ORDER = ["soil","sprout","head","ranchers","hands","seeds","bounty","compound","golden","slumber","gemfind"];
const ACH = [
  {id:"h1",   n:"First harvest",       d:"Harvest a crop.",              ok:s=>s.harvests>=1},
  {id:"h100", n:"Green thumb",         d:"Harvest 100 crops.",           ok:s=>s.harvests>=100},
  {id:"h1k",  n:"Farmer",              d:"Harvest 1,000 crops.",         ok:s=>s.harvests>=1000},
  {id:"h10k", n:"Harvest master",      d:"Harvest 10,000 crops.",        ok:s=>s.harvests>=10000},
  {id:"h100k",n:"Legend of the land",  d:"Harvest 100,000 crops.",       ok:s=>s.harvests>=100000},
  {id:"c1k",  n:"First savings",       d:"Earn 1,000 coins in total.",   ok:s=>s.life>=1e3},
  {id:"c1m",  n:"Millionaire",         d:"Earn 1 million coins in total.",ok:s=>s.life>=1e6},
  {id:"c1b",  n:"Billionaire",         d:"Earn 1 billion coins in total.",ok:s=>s.life>=1e9},
  {id:"c1t",  n:"Tycoon",              d:"Earn 1 trillion coins in total.",ok:s=>s.life>=1e12},
  {id:"c1q",  n:"Farm empire",         d:"Earn 1 quadrillion coins in total.",ok:s=>s.life>=1e15},
  {id:"crops",n:"Seed collector",      d:"Unlock every crop in one season.",ok:s=>s.unlocked.every(Boolean)},
  {id:"p12",  n:"Big field",           d:"Own 12 plots.",                ok:s=>s.plots.length>=12},
  {id:"p24",  n:"Whole farm",          d:"Own 24 plots.",                ok:s=>s.plots.length>=24},
  {id:"p36",  n:"Farm country",        d:"Own 36 plots.",                ok:s=>s.plots.length>=36},
  {id:"hand10",n:"Hired help",         d:"Get the Farmhand to level 10.",ok:s=>(s.up.hand||0)>=10},
  {id:"r1",   n:"First festival",      d:"Hold a Harvest Festival.",     ok:s=>s.rebirths>=1},
  {id:"r5",   n:"Festival regular",    d:"Hold 5 Harvest Festivals.",    ok:s=>s.rebirths>=5},
  {id:"r20",  n:"Festival fanatic",    d:"Hold 20 Harvest Festivals.",   ok:s=>s.rebirths>=20},
  {id:"sun100",n:"Sunseed hoarder",    d:"Earn 100 sunseeds in total.",  ok:s=>s.sunEver>=100},
  {id:"an1",  n:"Animal friend",       d:"Own your first animal.",       ok:s=>animalTotal(s)>=1},
  {id:"an25", n:"Busy barnyard",       d:"Own 25 animals.",              ok:s=>animalTotal(s)>=25},
  {id:"an100",n:"Zookeeper",           d:"Own 100 animals.",             ok:s=>animalTotal(s)>=100},
  {id:"dragon",n:"Dragon keeper",      d:"Own a baby dragon.",           ok:s=>(s.ranch.dragon||0)>=1},
  {id:"b5",   n:"Builder",             d:"Reach level 5 on any building.",ok:s=>Object.values(s.build).some(v=>v>=5)},
  {id:"b10",  n:"Master builder",      d:"Max out any building.",        ok:s=>BUILD.some(b=>(s.build[b.id]||0)>=b.max)},
  {id:"o1",   n:"Special delivery",    d:"Fill an order.",               ok:s=>s.orderDone>=1},
  {id:"o25",  n:"Trusted supplier",    d:"Fill 25 orders.",              ok:s=>s.orderDone>=25},
  {id:"bf10", n:"Butterfly catcher",   d:"Catch 10 golden butterflies.", ok:s=>s.catches>=10},
  {id:"mast", n:"Crop master",         d:"Reach mastery level 3 on any crop.",ok:s=>CROPS.some((_,i)=>masteryOf(s,i)>=3)},
  {id:"decor",n:"Interior designer",   d:"Own 4 decorations.",           ok:s=>Object.keys(s.decor).length>=4},
  {id:"all",  n:"Picture perfect",     d:"Own every decoration.",        ok:s=>DECOR.every(d=>s.decor[d.id])}
];
function animalTotal(s){ return ANIMALS.reduce((a,x)=>a+(s.ranch[x.id]||0),0); }
const MASTERY=[20,100,500,2500,10000];
function masteryOf(s,i){ const n=(s.hc||{})[i]||0; let L=0; for(const t of MASTERY) if(n>=t) L++; return L; }

/* ---------- state ---------- */
function fresh(){
  return {v:2,coins:0,run:0,life:0,sun:0,sunEver:0,gems:0,rebirths:0,harvests:0,
    plots:[{c:-1,t:0},{c:-1,t:0},{c:-1,t:0},{c:-1,t:0}],unlocked:CROPS.map((_,i)=>i===0),
    sel:0,up:{},tree:{},ach:{},bulk:1,muted:false,last:Date.now(),played:0,
    ranch:{},build:{},decor:{},hc:{},orders:[],orderDone:0,catches:0};
}
let S = fresh();
function load(){
  try{ const raw=localStorage.getItem(SAVE_KEY); if(raw){ S=Object.assign(fresh(),JSON.parse(raw)); } }catch(_){}
  if(!Array.isArray(S.plots)||!S.plots.length) S.plots=fresh().plots;
  if(!Array.isArray(S.unlocked)) S.unlocked=fresh().unlocked;
  while(S.unlocked.length<CROPS.length) S.unlocked.push(false);
  S.unlocked.length=CROPS.length;
  for(const k of ["ranch","build","decor","hc","up","tree","ach"]) if(!S[k]||typeof S[k]!=="object") S[k]={};
  if(!Array.isArray(S.orders)) S.orders=[];
  if(FORCE_MUTE) S.muted=true;
}
function save(){ S.last=Date.now(); try{ localStorage.setItem(SAVE_KEY,JSON.stringify(S)); }catch(_){} }

/* ---------- formatting ---------- */
const SUF=["","K","M","B","T","Qa","Qi","Sx","Sp","Oc","No","Dc"];
function fmt(n){
  if(!isFinite(n)) return "0";
  if(n<1000) return String(Math.floor(n));
  let i=0; while(n>=1000 && i<SUF.length-1){ n/=1000; i++; }
  if(n>=1000) return n.toExponential(2).replace("+","");
  return (n>=100?n.toFixed(0):n>=10?n.toFixed(1):n.toFixed(2))+SUF[i];
}
function fmtTime(sec){ sec=Math.max(0,Math.round(sec)); if(sec<60) return sec+"s"; if(sec<3600) return Math.floor(sec/60)+"m "+(sec%60)+"s"; return Math.floor(sec/3600)+"h "+Math.floor(sec%3600/60)+"m"; }

/* ---------- runtime-only state ---------- */
let rainUntil=0, rainbowUntil=0, boom=null, cloudEl=null, nextCloud=Date.now()+25000, nextBoom=Date.now()+60000, handT=0, hiveT=0;
let nextButterfly=Date.now()+60000, orderT=0, birdT=6, timeShift=0, tab="up";
const prodT={}, bubbles={};
const lv=(obj,k)=>(obj[k]||0);
const nowT=()=>Date.now()+timeShift;
function dayPhase(){ return ((nowT()/1000)%DAY_SEC)/DAY_SEC; }
function seasonIdx(){ return Math.floor(nowT()/1000/SEASON_SEC)%4; }
function isNight(){ const p=dayPhase(); return p>=.76&&p<.96; }

/* ---------- derived values ---------- */
function basePlots(){ return 4 + lv(S.tree,"head"); }
function maxPlotUp(){ return Math.max(0, MAX_PLOTS - basePlots()); }
function achCount(){ return Object.keys(S.ach).length; }
function decorMult(){ return (S.decor.chime?1.02:1)*(S.decor.lanterns?1.03:1)*(S.decor.rainbow?1.1:1); }
function coinMult(){ return Math.pow(1.25,lv(S.up,"yield")) * Math.pow(1.25,lv(S.tree,"soil")) * (1+0.05*S.sunEver) * (1+0.03*achCount()) * Math.pow(1.12,lv(S.build,"market")) * decorMult() * (Date.now()<rainbowUntil?1.25:1); }
function speedMult(){ return Math.pow(1.15,lv(S.up,"fert")) * Math.pow(1.1,lv(S.tree,"sprout")) * (1+0.08*lv(S.build,"greenhouse")) * (S.decor.pond?1.05:1) * (S.decor.fountain?1.1:1) * (Date.now()<rainUntil?2:1); }
function farmhandLevel(){ return lv(S.up,"hand"); }
function handInterval(){ return 4/((1+0.25*farmhandLevel())*(1+0.1*lv(S.build,"windmill"))); }
function handBatch(){ return 1+Math.floor(farmhandLevel()/3); }
function hasAuto(){ return lv(S.up,"auto")>=1; }
function awayCapHours(){ return 1 + lv(S.up,"scare") + 2*lv(S.tree,"slumber") + 0.5*lv(S.build,"silo"); }
function boomMult(c){ return (boom && boom.c===c && Date.now()<boom.until)?3:1; }
function seasonMult(c){ return CROPS[c].s===seasonIdx()?(1.6+0.2*lv(S.tree,"bounty")):1; }
function cropValue(c){ return CROPS[c].v * coinMult() * boomMult(c) * seasonMult(c) * (1+0.1*masteryOf(S,c)); }
function sunGain(){ return Math.floor(Math.sqrt(S.run/20000) * Math.pow(1.15,lv(S.tree,"compound"))); }
function upCost(k){ return UP[k].cost(lv(S.up,k)); }
function upMax(k){ return k==="plots"?maxPlotUp():(UP[k].max||1); }
function ranchMult(){ return coinMult()*Math.pow(1.2,lv(S.up,"happy")); }
function animalCps(a){ return a.cps*(S.ranch[a.id]||0)*ranchMult(); }
function ranchCps(){ return ANIMALS.reduce((t,a)=>t+animalCps(a),0); }
function animalCost(a,n){ return a.cost*Math.pow(1.15,n); }

/* ---------- audio (silent while muted) ---------- */
let actx=null;
function beep(freq,dur,type,vol,slide){
  if(S.muted||FORCE_MUTE) return;
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==="suspended") actx.resume();
    const o=actx.createOscillator(), g=actx.createGain(); o.type=type||"sine"; o.frequency.value=freq;
    if(slide) o.frequency.exponentialRampToValueAtTime(slide,actx.currentTime+dur);
    g.gain.value=vol||0.05; g.gain.exponentialRampToValueAtTime(0.0001,actx.currentTime+dur);
    o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime+dur);
  }catch(_){}
}
const sfx={ plant:()=>beep(300,.08,"triangle",.04,420), harvest:()=>beep(620,.1,"sine",.05,900), buy:()=>beep(520,.12,"triangle",.05,780),
  ach:()=>{beep(660,.12,"sine",.05);setTimeout(()=>beep(880,.18,"sine",.05),110);}, fest:()=>{[440,554,659,880].forEach((f,i)=>setTimeout(()=>beep(f,.25,"triangle",.05),i*120));},
  coin:()=>{beep(1200,.08,"square",.02);setTimeout(()=>beep(1600,.12,"square",.02),70);},
  bird:()=>{beep(2200,.07,"sine",.015,3000);setTimeout(()=>beep(2600,.09,"sine",.015,2000),110);},
  cricket:()=>{for(let i=0;i<3;i++) setTimeout(()=>beep(4200,.04,"sine",.01),i*70);},
  chime:()=>{[1319,1568,1760].forEach((f,i)=>setTimeout(()=>beep(f,.5,"sine",.012),i*160));} };

/* ---------- crop art ---------- */
function cropSVG(i,st){
  const c=CROPS[i].col, g="#4caf50", g2="#2e7d32"; let s='<svg viewBox="0 0 64 64" aria-hidden="true">';
  if(st===0){
    s+=`<path d="M32 54V42" stroke="${g2}" stroke-width="3" stroke-linecap="round"/><path d="M32 44C24 44 20 38 20 34C28 34 32 38 32 44Z M32 44C40 44 44 38 44 34C36 34 32 38 32 44Z" fill="${g}"/>`;
  } else if(st===1){
    s+=`<path d="M32 56V30" stroke="${g2}" stroke-width="3.5" stroke-linecap="round"/><path d="M32 46C22 46 16 40 16 34C26 34 32 38 32 46Z M32 40C42 40 48 34 48 28C38 28 32 32 32 40Z" fill="${g}"/><circle cx="32" cy="26" r="5.5" fill="${c}"/>`;
  } else {
    switch(i){
      case 0:
        for(const x of [22,32,42]){
          s+=`<path d="M${x} 58V20" stroke="#b8941f" stroke-width="2.5" stroke-linecap="round"/>`;
          for(let k=0;k<4;k++){ s+=`<ellipse cx="${x-3.2}" cy="${20+k*7}" rx="3" ry="5" fill="${c}" transform="rotate(-25 ${x-3.2} ${20+k*7})"/><ellipse cx="${x+3.2}" cy="${23+k*7}" rx="3" ry="5" fill="${c}" transform="rotate(25 ${x+3.2} ${23+k*7})"/>`; }
        }
        break;
      case 1: s+=`<path d="M32 28C22 20 20 10 24 6C28 12 31 18 32 28Z M32 28C32 16 34 8 38 6C42 12 38 22 32 28Z M32 28C26 22 14 18 12 22C18 26 26 28 32 28Z" fill="${g}"/><path d="M20 26H44L33 60Q32 62 31 60Z" fill="${c}"/><path d="M26 34H38M28 42H36M30 50H34" stroke="#c75d00" stroke-width="2" stroke-linecap="round"/>`; break;
      case 2: s+=`<circle cx="32" cy="38" r="19" fill="${c}"/><ellipse cx="25" cy="30" rx="5" ry="3.5" fill="#fff" opacity=".35" transform="rotate(-30 25 30)"/><path d="M32 20L36 26L44 24L38 30L40 34L32 31L24 34L26 30L20 24L28 26Z" fill="${g2}"/>`; break;
      case 3:
        s+=`<path d="M32 54C16 48 12 34 20 20C24 28 28 38 32 54Z M32 54C48 48 52 34 44 20C40 28 36 38 32 54Z" fill="${g}"/><ellipse cx="32" cy="32" rx="10" ry="22" fill="${c}"/><g fill="#fff4b0" opacity=".7">`;
        for(let r=0;r<6;r++){ for(let q=0;q<3;q++){ s+=`<circle cx="${27+q*5}" cy="${18+r*6}" r="1.6"/>`; } }
        s+='</g>'; break;
      case 4:
        s+=`<path d="M32 58C14 46 12 28 22 22C28 19 36 19 42 22C52 28 50 46 32 58Z" fill="${c}"/><g fill="#ffe680">`;
        for(const [x,y] of [[24,28],[32,26],[40,28],[27,36],[37,36],[32,44],[24,40],[40,40]]){ s+=`<ellipse cx="${x}" cy="${y}" rx="1.4" ry="2"/>`; }
        s+=`</g><path d="M32 22L26 14L32 18L38 14Z M20 22L32 20L44 22L32 26Z" fill="${g2}"/>`; break;
      case 5: s+=`<ellipse cx="32" cy="38" rx="23" ry="18" fill="${c}"/><path d="M20 22C14 34 14 44 22 54M44 22C50 34 50 44 42 54M32 20V56" stroke="#c25e00" stroke-width="2.2" fill="none" stroke-linecap="round"/><rect x="29" y="12" width="6" height="12" rx="2" fill="#6d4c2a"/><path d="M35 18C42 12 48 14 48 18C44 22 38 22 35 18Z" fill="${g}"/>`; break;
      case 6:
        s+=`<path d="M32 58V30" stroke="${g2}" stroke-width="4" stroke-linecap="round"/><path d="M32 50C42 50 48 44 48 40C40 40 34 44 32 50Z" fill="${g}"/>`;
        for(let k=0;k<12;k++){ s+=`<ellipse cx="32" cy="14" rx="4" ry="9" fill="${c}" transform="rotate(${k*30} 32 28)"/>`; }
        s+=`<circle cx="32" cy="28" r="9" fill="#7a4a1a"/><circle cx="29" cy="25" r="2" fill="#a06a38"/>`; break;
      case 7: s+=`<circle cx="32" cy="36" r="21" fill="${c}"/><path d="M32 15C24 24 24 48 32 57M32 15C40 24 40 48 32 57M13 30C24 34 40 34 51 30M13 43C24 47 40 47 51 43" stroke="#b9800a" stroke-width="2" fill="none"/><path d="M48 12L50 18L56 20L50 22L48 28L46 22L40 20L46 18Z" fill="#fff"/><path d="M30 16C36 8 44 8 46 12C42 18 34 20 30 16Z" fill="${g}"/>`; break;
      case 8:
        s+=`<ellipse cx="32" cy="38" rx="19" ry="21" fill="${c}"/><g fill="#5cc85c">`;
        for(const [x,y,r] of [[14,30,-70],[16,46,-110],[50,30,70],[48,46,110],[32,14,0],[22,18,-35],[42,18,35]]){ s+=`<path d="M0 0L-4 -11L4 -11Z" transform="translate(${x} ${y}) rotate(${r})"/>`; }
        s+=`</g><ellipse cx="25" cy="30" rx="4" ry="6" fill="#fff" opacity=".3"/><g fill="#222" opacity=".6"><circle cx="30" cy="40" r="1"/><circle cx="36" cy="36" r="1"/><circle cx="34" cy="46" r="1"/><circle cx="27" cy="46" r="1"/></g>`; break;
      case 9:
        s+=`<path d="M32 58V34" stroke="${g2}" stroke-width="3.5" stroke-linecap="round"/><path d="M32 50C40 50 46 44 46 40C38 40 33 44 32 50Z" fill="${g}"/>`;
        for(let k=0;k<8;k++){ s+=`<ellipse cx="32" cy="17" rx="4.6" ry="10" fill="${k%2?"#e8dcff":c}" transform="rotate(${k*45} 32 30)"/>`; }
        s+=`<circle cx="32" cy="30" r="8" fill="#2a2a5a"/><path d="M34 25A6 6 0 1 0 34 35A4.5 5 0 1 1 34 25Z" fill="#fff6b8"/><circle cx="46" cy="14" r="1.6" fill="#fff"/><circle cx="14" cy="18" r="1.3" fill="#fff"/>`; break;
      case 10:
        s+=`<path d="M32 8L39 24L57 25L43 36L48 54L32 44L16 54L21 36L7 25L25 24Z" fill="${c}" stroke="#d9b800" stroke-width="2" stroke-linejoin="round"/><path d="M32 14L36 26M32 14L28 26M32 44L32 30" stroke="#e6c800" stroke-width="1.5" fill="none"/><ellipse cx="26" cy="24" rx="4" ry="2.4" fill="#fff" opacity=".5" transform="rotate(-25 26 24)"/>`; break;
      default:
        s+=`<path d="M32 52C20 46 14 36 18 24C24 28 30 36 32 52Z M32 52C44 46 50 36 46 24C40 28 34 36 32 52Z" fill="#2fa3a3"/><path d="M32 6L46 24L32 58L18 24Z" fill="${c}" stroke="#1e8a96" stroke-width="2" stroke-linejoin="round"/><path d="M32 6L32 58M18 24H46M32 6L24 24L32 58L40 24Z" stroke="#bff3f8" stroke-width="1.4" fill="none"/><path d="M24 20L28 14" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`;
    }
  }
  return s+'</svg>';
}

/* ---------- animal art (faces right) ---------- */
function animalSVG(id){
  const o="#4a3320", b={
  chicken:`<ellipse cx="18" cy="19" rx="11" ry="8" fill="#fff"/><path d="M8 17Q3 11 7 8Q10 13 12 15Z" fill="#fff"/><circle cx="28" cy="11" r="6" fill="#fff"/><path d="M25 5Q28 1 30 5Q32 2 33 6Z" fill="#e53935"/><path d="M33 10L38 12L33 14Z" fill="#ff9800"/><circle cx="29.5" cy="10" r="1.3" fill="${o}"/><path d="M15 27V31M21 27V31" stroke="#ff9800" stroke-width="2" stroke-linecap="round"/><ellipse cx="16" cy="19" rx="6" ry="4" fill="#f1ecdf"/>`,
  sheep:`<g fill="#fffaf0"><circle cx="12" cy="17" r="7"/><circle cx="19" cy="14" r="8"/><circle cx="26" cy="17" r="7"/><circle cx="17" cy="21" r="7"/><circle cx="24" cy="22" r="6"/></g><ellipse cx="32" cy="16" rx="5" ry="6" fill="#4a3a30"/><circle cx="33" cy="15" r="1" fill="#fff"/><path d="M13 27V31M24 27V31" stroke="#4a3a30" stroke-width="2.5" stroke-linecap="round"/>`,
  cow:`<rect x="6" y="11" width="24" height="14" rx="6" fill="#fff"/><circle cx="14" cy="15" r="3.5" fill="${o}"/><circle cx="24" cy="20" r="3" fill="${o}"/><rect x="28" y="7" width="10" height="11" rx="4" fill="#fff"/><rect x="32" y="13" width="7" height="5" rx="2.5" fill="#ffb3c1"/><path d="M29 7L27 3M36 7L38 3" stroke="#d9c9a0" stroke-width="2" stroke-linecap="round"/><circle cx="33" cy="11" r="1.1" fill="${o}"/><path d="M10 25V31M26 25V31" stroke="${o}" stroke-width="2.5" stroke-linecap="round"/>`,
  pig:`<ellipse cx="18" cy="19" rx="13" ry="8" fill="#ffb3c1"/><circle cx="30" cy="16" r="6.5" fill="#ffb3c1"/><ellipse cx="35" cy="18" rx="3.4" ry="2.6" fill="#ff8fa3"/><path d="M27 11L28 7L32 10Z" fill="#ff8fa3"/><circle cx="31" cy="14.5" r="1.1" fill="${o}"/><path d="M6 17Q2 15 5 12" stroke="#ff8fa3" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M11 26V30M24 26V30" stroke="#ff8fa3" stroke-width="3" stroke-linecap="round"/>`,
  bee:`<ellipse cx="17" cy="16" rx="7" ry="5" fill="#ffd23f"/><path d="M14 11V21M19 11V21" stroke="${o}" stroke-width="2.4"/><circle cx="24" cy="16" r="3.4" fill="${o}"/><ellipse cx="14" cy="8" rx="5" ry="3.4" fill="#e3f6ffcc" transform="rotate(-20 14 8)"/><ellipse cx="21" cy="7" rx="4.4" ry="3" fill="#e3f6ffcc"/><path d="M10 16L6 17" stroke="${o}" stroke-width="1.5"/>`,
  alpaca:`<ellipse cx="15" cy="21" rx="10" ry="7" fill="#f4e3c4"/><path d="M22 19L26 6" stroke="#f4e3c4" stroke-width="6" stroke-linecap="round"/><ellipse cx="29" cy="6" rx="5" ry="4" fill="#f4e3c4"/><path d="M26 3L25 0M30 3L31 0" stroke="#f4e3c4" stroke-width="2" stroke-linecap="round"/><circle cx="30" cy="5.5" r="1" fill="${o}"/><path d="M10 27V32M20 27V32" stroke="#d9c49a" stroke-width="2.5" stroke-linecap="round"/><path d="M6 15Q9 12 14 14" stroke="#ff8fab" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  dragon:`<ellipse cx="17" cy="20" rx="11" ry="8" fill="#6cd36c"/><path d="M10 14L14 6L18 13Z M18 13L23 6L25 14Z" fill="#4ab84a"/><circle cx="29" cy="14" r="6" fill="#6cd36c"/><circle cx="30.5" cy="12.5" r="1.4" fill="${o}"/><path d="M34 15L38 13L37 17Z" fill="#ff9800"/><path d="M6 21Q1 22 2 16" stroke="#4ab84a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M14 27V31M22 27V31" stroke="#4ab84a" stroke-width="3" stroke-linecap="round"/><ellipse cx="17" cy="23" rx="6" ry="4" fill="#d6f5a8"/>`,
  dog:`<ellipse cx="17" cy="19" rx="11" ry="6" fill="#c98a4b"/><circle cx="28" cy="14" r="6" fill="#c98a4b"/><path d="M24 9Q21 8 21 14Q23 14 25 12Z" fill="#8a5a2b"/><circle cx="30" cy="13" r="1.2" fill="#222"/><ellipse cx="33" cy="16" rx="2.4" ry="2" fill="#4a3320"/><path d="M6 17Q3 12 7 11" stroke="#c98a4b" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M12 24V30M23 24V30" stroke="#c98a4b" stroke-width="3" stroke-linecap="round"/>`
  };
  return `<svg viewBox="0 0 40 34" aria-hidden="true">${b[id]||""}</svg>`;
}

/* ---------- scene ---------- */
const SCENE_PAL=[
 {hill1:"#9bd36b",hill2:"#7cc255",gr:"#68b049",leaf:"#ff9ec4",tr:"#4aa233"},
 {hill1:"#7fcf5a",hill2:"#5fb83f",gr:"#4aa233",leaf:"#2f9a3a",tr:"#2f9a3a"},
 {hill1:"#d9b45a",hill2:"#c9923a",gr:"#b4802f",leaf:"#e8742a",tr:"#e8742a"},
 {hill1:"#eef6ff",hill2:"#dbe9f5",gr:"#c7dcec",leaf:"#f6fbff",tr:"#f6fbff"}];
const SKY=[[0,"#ff9f7a","#ffd9a8"],[.1,"#7ec8ff","#d9f3ff"],[.5,"#5bb8ff","#cfeeff"],[.68,"#ff8a5c","#ffd28a"],[.78,"#2b2f6b","#6b4a8a"],[.9,"#0e1233","#1c2656"],[1,"#ff9f7a","#ffd9a8"]];
function hex2(h){ return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16)); }
function mixHex(a,b,t){ const A=hex2(a),B=hex2(b); return "#"+A.map((v,i)=>Math.round(lerp(v,B[i],t)).toString(16).padStart(2,"0")).join(""); }
function skyAt(p){ for(let i=0;i<SKY.length-1;i++){ if(p<=SKY[i+1][0]){ const t=(p-SKY[i][0])/(SKY[i+1][0]-SKY[i][0]); return [mixHex(SKY[i][1],SKY[i+1][1],t),mixHex(SKY[i][2],SKY[i+1][2],t)]; } } return [SKY[0][1],SKY[0][2]]; }
function tree(x,y,sz,P,season){
  const trunk=`<rect x="${x-3*sz}" y="${y-18*sz}" width="${6*sz}" height="${18*sz}" rx="2" fill="#7a4a24"/>`;
  if(season===3) return trunk+`<circle cx="${x}" cy="${y-24*sz}" r="${13*sz}" fill="#cfe0ee"/><circle cx="${x-7*sz}" cy="${y-18*sz}" r="${8*sz}" fill="#e6f1fa"/><circle cx="${x+7*sz}" cy="${y-19*sz}" r="${8*sz}" fill="#e6f1fa"/>`;
  return trunk+`<circle cx="${x}" cy="${y-25*sz}" r="${14*sz}" fill="${P.tr}"/><circle cx="${x-8*sz}" cy="${y-19*sz}" r="${9*sz}" fill="${P.tr}"/><circle cx="${x+8*sz}" cy="${y-20*sz}" r="${9*sz}" fill="${P.tr}"/>`+(season===0?`<g fill="${P.leaf}"><circle cx="${x-5*sz}" cy="${y-28*sz}" r="${2*sz}"/><circle cx="${x+6*sz}" cy="${y-24*sz}" r="${2*sz}"/><circle cx="${x}" cy="${y-20*sz}" r="${2*sz}"/></g>`:"");
}
function sceneSVG(){
  const sn=seasonIdx(), P=SCENE_PAL[sn], B=S.build, D=S.decor; let s="";
  s+=`<defs><linearGradient id="gnd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.gr}"/><stop offset="1" stop-color="${mixHex(P.gr,"#2d6a1e",.35)}"/></linearGradient></defs>`;
  if(D.rainbow) s+=`<g opacity=".55" fill="none" stroke-width="7"><path d="M120 150A280 150 0 0 1 680 150" stroke="#ff595e"/><path d="M130 150A270 140 0 0 1 670 150" stroke="#ffca3a"/><path d="M140 150A260 130 0 0 1 660 150" stroke="#8ac926"/><path d="M150 150A250 120 0 0 1 650 150" stroke="#1982c4"/></g>`;
  s+=`<path d="M0 130Q120 70 260 118T540 100T800 120V200H0Z" fill="${P.hill1}"/><path d="M0 150Q160 104 340 140T640 128T800 144V200H0Z" fill="${P.hill2}"/>`;
  if(sn===3) s+=`<path d="M0 150Q160 104 340 140T640 128T800 144V152Q640 138 340 150T0 160Z" fill="#fff" opacity=".6"/>`;
  s+=tree(40,150,1,P,sn)+tree(250,146,.8,P,sn)+tree(372,150,.9,P,sn)+tree(600,148,.85,P,sn)+tree(770,150,1,P,sn);
  /* barn */
  s+=`<g><rect x="50" y="102" width="86" height="52" fill="#c0392b"/><path d="M44 104L93 66L142 104Z" fill="#8a2a20"/>${sn===3?'<path d="M44 104L93 66L142 104L132 104L93 76L54 104Z" fill="#fff"/>':""}<rect x="76" y="120" width="34" height="34" fill="#a93226" stroke="#fff" stroke-width="3"/><path d="M76 120L110 154M110 120L76 154" stroke="#fff" stroke-width="3"/><circle cx="93" cy="92" r="6" fill="#ffe9b0"/></g>`;
  if(D.cat) s+=`<g transform="translate(112 92)"><ellipse cx="0" cy="0" rx="9" ry="5" fill="#f08a2a"/><circle cx="8" cy="-3" r="4.4" fill="#f08a2a"/><path d="M5 -7L6 -11L9 -7ZM9 -7L11 -10L12 -5Z" fill="#f08a2a"/><path d="M-9 0Q-14 -3 -12 -8" stroke="#f08a2a" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
  if(lv(B,"silo")) s+=`<g><rect x="150" y="84" width="26" height="70" fill="#cfd6e0"/><path d="M150 84A13 13 0 0 1 176 84Z" fill="#9aa7b8"/><path d="M150 100H176M150 118H176M150 136H176" stroke="#9aa7b8" stroke-width="2"/></g>`;
  if(lv(B,"windmill")){ const sp=Math.max(1.2,6-lv(B,"windmill")*.4); s+=`<g><path d="M280 154L290 90H302L312 154Z" fill="#f2e4c4"/><rect x="287" y="118" width="18" height="36" rx="2" fill="#8a5a2b"/><g style="transform-origin:296px 86px;animation:wm ${sp}s linear infinite"><path d="M296 86L284 50L296 52ZM296 86L332 98L330 86ZM296 86L308 122L296 120ZM296 86L260 74L262 86Z" fill="#fff" stroke="#9a8a6a" stroke-width="1.5"/></g><circle cx="296" cy="86" r="5" fill="#8a5a2b"/></g>`; }
  if(lv(B,"greenhouse")) s+=`<g><path d="M392 154V120L420 104L448 120V154Z" fill="#bfe9f0" opacity=".85" stroke="#fff" stroke-width="2.5"/><path d="M420 104V154M406 112V154M434 112V154M392 136H448" stroke="#fff" stroke-width="1.8"/><g fill="#4caf50"><circle cx="402" cy="148" r="4"/><circle cx="420" cy="146" r="5"/><circle cx="438" cy="148" r="4"/></g></g>`;
  if(lv(B,"market")) s+=`<g><rect x="490" y="122" width="50" height="32" fill="#c9a06a"/><path d="M484 122L496 104H534L546 122Z" fill="#e53935"/><path d="M496 104L502 122M512 104L514 122M528 104L526 122" stroke="#fff" stroke-width="5"/><g fill="#ff8a1f"><circle cx="500" cy="134" r="5"/><circle cx="514" cy="136" r="5"/></g><g fill="#e53935"><circle cx="528" cy="134" r="5"/></g></g>`;
  if(D.fountain) s+=`<g><ellipse cx="582" cy="152" rx="18" ry="6" fill="#bfe9f0" stroke="#9aa7b8" stroke-width="2.5"/><rect x="579" y="132" width="6" height="20" fill="#cfd6e0"/><path d="M582 130Q572 120 570 138M582 130Q592 120 594 138" stroke="#8fd6ff" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>`;
  if(lv(B,"well")) s+=`<g><rect x="624" y="130" width="28" height="24" rx="3" fill="#a9a29a" stroke="#7d766e" stroke-width="2"/><path d="M628 130V112M648 130V112M624 112H652" stroke="#7a4a24" stroke-width="3" fill="none"/><path d="M622 112L638 100L654 112Z" fill="#8a5a2b"/></g>`;
  if(lv(B,"hive")) s+=`<g><rect x="700" y="130" width="22" height="24" rx="4" fill="#ffd23f" stroke="#c99200" stroke-width="2"/><path d="M700 138H722M700 146H722" stroke="#c99200" stroke-width="2"/><rect x="706" y="142" width="10" height="7" rx="3" fill="#4a3320"/><circle cx="728" cy="122" r="2.4" fill="#ffd23f"/><circle cx="696" cy="116" r="2.4" fill="#ffd23f"/></g>`;
  if(D.lanterns) s+=`<path d="M93 70Q130 96 163 86" stroke="#4a3320" stroke-width="1.5" fill="none"/><g class="lant"><circle cx="106" cy="84" r="4" fill="#ffd96b"/><circle cx="122" cy="90" r="4" fill="#ff9f7a"/><circle cx="140" cy="91" r="4" fill="#ffd96b"/><circle cx="154" cy="87" r="4" fill="#ff9f7a"/></g>`;
  s+=`<rect x="0" y="152" width="800" height="48" fill="url(#gnd)"/><path d="M0 154H800" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>`;
  s+=`<g stroke="#caa56a" stroke-width="3" stroke-linecap="round">`; for(let x=8;x<800;x+=38) s+=`<path d="M${x} 150V166"/>`; s+=`<path d="M0 156H800M0 162H800" stroke-width="2"/></g>`;
  if(D.flowers){ const fl=["#ff6b9a","#ffd23f","#fff","#b388ff"]; s+=`<g>`; for(let i=0;i<14;i++){ const x=170+i*13+(i%3)*4, y=176+(i%4)*3; s+=`<path d="M${x} ${y}v8" stroke="#2f9a3a" stroke-width="1.6"/><circle cx="${x}" cy="${y}" r="3.4" fill="${fl[i%4]}"/><circle cx="${x}" cy="${y}" r="1.2" fill="#ffd23f"/>`; } s+=`</g>`; }
  if(D.pond) s+=`<g><ellipse cx="360" cy="184" rx="44" ry="11" fill="#6ab7ff" stroke="#3f8fd6" stroke-width="2.5"/><ellipse cx="350" cy="182" rx="13" ry="3" fill="#fff" opacity=".35"/><g transform="translate(372 178)"><ellipse rx="7" ry="4.5" fill="#fff"/><circle cx="6" cy="-4" r="3.4" fill="#fff"/><path d="M9 -4L13 -3L9 -2Z" fill="#ff9800"/></g></g>`;
  if(D.chime) s+=`<g class="chm" style="transform-origin:700px 90px"><path d="M696 88H726" stroke="#7a4a24" stroke-width="3"/><path d="M700 88V106M708 88V112M716 88V104M724 88V110" stroke="#c9d6e8" stroke-width="3" stroke-linecap="round"/></g>`;
  return s;
}
function renderScene(){
  const sn=seasonIdx(); $("land").innerHTML=sceneSVG();
  const f=$("field"); f.dataset.season=sn; f.dataset.night=isNight()?"1":"0";
  $("seasonTag").textContent=SEASONS[sn];
  const k=sn===0?"petal":sn===2?"leaf":sn===3?"snow":"dust"; setFx(isNight()?"glow":k);
}
let fxKind="";
function setFx(kind){
  if(fxKind===kind) return; fxKind=kind; const fx=$("fx"); fx.className="fx "+kind; let h="";
  for(let i=0;i<(kind==="glow"?16:kind==="dust"?10:16);i++) h+=`<i class="pt" style="left:${Math.random()*100}%;${kind==="glow"||kind==="dust"?"top:"+(10+Math.random()*80)+"%;":""}animation-delay:${(-Math.random()*9).toFixed(2)}s;animation-duration:${(7+Math.random()*7).toFixed(1)}s"></i>`;
  fx.innerHTML=h;
}
let lastSeason=-1, lastNight=null;
function updateSky(){
  const p=dayPhase(), [t,b]=skyAt(p), sky=$("sky"); sky.style.background=`linear-gradient(180deg,${t},${b})`;
  const night=isNight(); const nightAmt=p>=.76&&p<.96?(p<.82?(p-.76)/.06:p>.9?(.96-p)/.06:1):0;
  $("stars").style.opacity=String(clamp(nightAmt,0,1)); $("shade").style.opacity=String((nightAmt*.3).toFixed(2));
  const orb=$("orb"), sunUp=p<.72;
  orb.className="orb "+(sunUp?"sun":"moon");
  const q=sunUp?p/.72:(p<.72?0:(p>=.72?(p-.72)/.28:0));
  orb.style.left=(8+q*84)+"%"; orb.style.top=(78-Math.sin(q*Math.PI)*62)+"%";
  document.body.style.background=`linear-gradient(180deg,${t} 0,${b} 24%,${mixHex(SCENE_PAL[seasonIdx()].hill1,"#8fd06b",.4)} 58%,${SCENE_PAL[seasonIdx()].gr} 100%)`;
  const sn=seasonIdx();
  if(sn!==lastSeason||night!==lastNight){ lastSeason=sn; lastNight=night; renderScene(); paintBanner(true); }
}

/* ---------- critters ---------- */
let critSig="";
function renderCritters(){
  const sig=ANIMALS.map(a=>Math.min(4,S.ranch[a.id]||0)).join(",")+"|"+(S.decor.dog?1:0);
  if(sig===critSig) return; critSig=sig;
  for(const k in bubbles){ delete bubbles[k]; }
  let h=""; let seed=7; const tot=ANIMALS.reduce((t,a)=>t+Math.min(4,S.ranch[a.id]||0),0)+(S.decor.dog?1:0); let idx=0;
  const rnd=()=>{ seed=(seed*9301+49297)%233280; return seed/233280; };
  ANIMALS.forEach(a=>{ const n=Math.min(4,S.ranch[a.id]||0);
    for(let i=0;i<n;i++){ const lx=(3+((idx++*0.618+rnd()*.08)%1)*80).toFixed(1); h+=`<div class="an ${a.id==="bee"?"bee":""}" data-a="${a.id}" style="left:${lx}%;bottom:${a.id==="bee"?(34+rnd()*24).toFixed(0):(2+(idx%3)*8+rnd()*3).toFixed(0)}px;animation-duration:${(16+rnd()*14).toFixed(1)}s;animation-delay:-${(rnd()*20).toFixed(1)}s">${animalSVG(a.id)}</div>`; } });
  if(S.decor.dog) h+=`<div class="an" data-a="dog" style="left:30%;bottom:6px;animation-duration:9s">${animalSVG("dog")}</div>`;
  $("critters").innerHTML=h;
}
function tickRanchBubbles(dt){
  ANIMALS.forEach(a=>{
    const n=S.ranch[a.id]||0; if(!n){ return; }
    const b=bubbles[a.id];
    if(b){ b.age+=dt; if(S.decor.dog&&b.age>4) collectBubble(a.id); return; }
    prodT[a.id]=(prodT[a.id]??(8+Math.random()*10))-dt;
    if(prodT[a.id]<=0){
      const host=document.querySelector(`#critters .an[data-a="${a.id}"]`); if(!host) return;
      const el=document.createElement("button"); el.type="button"; el.className="bub"; el.setAttribute("aria-label","Collect "+a.n+" goods");
      el.addEventListener("click",()=>collectBubble(a.id)); host.appendChild(el); bubbles[a.id]={el,age:0};
      prodT[a.id]=12+Math.random()*10;
    }
  });
}
function collectBubble(id){
  const b=bubbles[id]; if(!b) return; b.el.remove(); delete bubbles[id];
  const a=ANIMALS.find(x=>x.id===id), v=Math.max(5,animalCps(a)*15);
  S.coins+=v; S.run+=v; S.life+=v; sfx.coin(); toast("+"+fmt(v)+" coins from your "+a.n.toLowerCase()+"s"); refreshBtns();
}
function spawnButterfly(){
  const sc=$("scene"); if(sc.querySelector(".bfly")) return;
  const b=document.createElement("button"); b.type="button"; b.className="bfly"; b.setAttribute("aria-label","Golden butterfly: tap to catch");
  b.innerHTML=`<svg viewBox="0 0 30 26"><ellipse cx="9" cy="9" rx="8" ry="7" fill="#ffd23f" stroke="#fff" stroke-width="1.5"/><ellipse cx="21" cy="9" rx="8" ry="7" fill="#ffd23f" stroke="#fff" stroke-width="1.5"/><ellipse cx="10" cy="18" rx="5.5" ry="5" fill="#ffb300"/><ellipse cx="20" cy="18" rx="5.5" ry="5" fill="#ffb300"/><rect x="14" y="5" width="2.4" height="17" rx="1.2" fill="#4a3320"/></svg>`;
  b.addEventListener("click",()=>catchButterfly(b)); sc.appendChild(b); setTimeout(()=>b.remove(),11200);
  if(S.decor.dog) setTimeout(()=>{ if(b.isConnected) catchButterfly(b); },3500);
}
function catchButterfly(b){
  if(!b.isConnected) return; b.remove(); S.catches++;
  if(Math.random()<.55){ S.gems++; toast("Golden butterfly! +1 gem"); }
  else { const v=Math.max(50,ranchCps()*90,cropValue(S.sel)*S.plots.length*3); S.coins+=v; S.run+=v; S.life+=v; toast("Golden butterfly! +"+fmt(v)+" coins"); }
  sfx.ach(); checkAch(); refreshBtns();
}

/* ---------- farm actions ---------- */
function ensurePlots(){ const want=Math.min(MAX_PLOTS,basePlots()+lv(S.up,"plots")); while(S.plots.length<want) S.plots.push({c:-1,t:0}); }
function isReady(p){ return p.c>=0 && p.t>=CROPS[p.c].t; }
function plant(i,silent){ const p=S.plots[i]; if(!p||p.c>=0||!S.unlocked[S.sel]) return false; p.c=S.sel; p.t=0; if(!silent) sfx.plant(); return true; }
function harvest(i,auto){
  const p=S.plots[i]; if(!p||!isReady(p)) return 0;
  const c=p.c; let v=cropValue(c), tag="";
  if(Math.random()<0.03*lv(S.up,"clover")){ v*=5; tag=" x5"; }
  if(Math.random()<0.02*lv(S.tree,"golden")){ v*=10; tag=" GOLD"; }
  S.coins+=v; S.run+=v; S.life+=v; S.harvests++; S.hc[c]=(S.hc[c]||0)+1; p.c=-1; p.t=0;
  const before=masteryOf({hc:{[c]:S.hc[c]-1}},c), after=masteryOf(S,c); if(after>before) toast(CROPS[c].n+" mastery level "+after+"! Sells for more.");
  for(const o of S.orders){ if(o.c===c&&o.have<o.need) o.have++; }
  floatText(i,"+"+fmt(v)+tag,!!tag); if(!auto) burst(i,tag?"#ffd23f":CROPS[c].col);
  if(!auto||Math.random()<0.25) sfx.harvest();
  return v;
}
function harvestAll(){ let n=0; for(let i=0;i<S.plots.length;i++){ if(harvest(i,true)) n++; } if(n) sfx.harvest(); checkAch(); return n; }
function plantAll(){ let n=0; for(let i=0;i<S.plots.length;i++){ if(plant(i,true)) n++; } if(n) sfx.plant(); return n; }

/* ---------- orders ---------- */
function newOrder(){
  const open=[]; S.unlocked.forEach((u,i)=>{ if(u) open.push(i); });
  const recent=open.slice(-3), c=pick(Math.random()<.7?recent:open);
  const need=Math.max(6,Math.round(S.plots.length*(1+Math.random()*1.6)));
  return {c,need,have:0,mult:2+Math.random()*1.2,gems:1+(Math.random()<.25?1:0)};
}
function orderReward(o){ return {coins:o.need*cropValue(o.c)*o.mult,gems:o.gems+lv(S.tree,"gemfind")+(S.decor.cat?1:0)}; }
function fillOrders(){ while(S.orders.length<3) S.orders.push(newOrder()); }
function claimOrder(i){
  const o=S.orders[i]; if(!o||o.have<o.need) return; const r=orderReward(o);
  S.coins+=r.coins; S.run+=r.coins; S.life+=r.coins; S.gems+=r.gems; S.orderDone++; S.orders.splice(i,1); orderT=12;
  sfx.ach(); toast("Order filled: +"+fmt(r.coins)+" coins and "+r.gems+" gems"); checkAch(); save(); renderPanel();
}
function swapOrder(i){ if(!S.orders[i]) return; S.orders[i]=newOrder(); sfx.plant(); renderPanel(); }

/* ---------- ticking ---------- */
function simulate(dt){
  const sp=speedMult(), night=isNight();
  for(const p of S.plots){ if(p.c>=0){ const cr=CROPS[p.c], need=cr.t; if(p.t<need) p.t=Math.min(need,p.t+dt*sp*(cr.night&&night?2:1)); } }
  const rc=ranchCps(); if(rc>0){ const e=rc*dt; S.coins+=e; S.run+=e; S.life+=e; }
  if(farmhandLevel()>0){
    handT+=dt;
    if(handT>=handInterval()){
      handT=0; let left=handBatch();
      for(let i=0;i<S.plots.length&&left>0;i++){ if(harvest(i,true)) left--; }
      if(hasAuto()) plantAll();
      checkAch();
    }
  }
  const hl=lv(S.build,"hive");
  if(hl>0){ hiveT+=dt; if(hiveT>=Math.max(6,22-2*hl)){ hiveT=0; const g=S.plots.filter(p=>p.c>=0&&!isReady(p)); if(g.length){ const p=pick(g); p.t=Math.min(CROPS[p.c].t,p.t+CROPS[p.c].t*.3); } } }
  if(S.orders.length<3){ orderT-=dt; if(orderT<=0){ fillOrders(); orderT=0; if(tab==="orders") renderPanel(); } }
}
function offline(sec){
  const away=Math.min(sec,awayCapHours()*3600); if(away<30) return 0;
  const sp=speedMult(); let earned=0;
  if(farmhandLevel()>0 && hasAuto() && S.unlocked[S.sel]){
    const c=S.sel, per=CROPS[c].t/sp;
    const plotRate=S.plots.length/per, handRate=handBatch()/handInterval();
    earned+=Math.min(plotRate,handRate)*away*cropValue(c)*0.5;
  }
  earned+=ranchCps()*away*0.5;
  S.coins+=earned; S.run+=earned; S.life+=earned;
  for(const p of S.plots){ if(p.c>=0) p.t=Math.min(CROPS[p.c].t,p.t+away*sp); }
  return earned;
}

/* ---------- events: rain, rainbow, market boom, butterflies, ambience ---------- */
function spawnCloud(){
  if(cloudEl) return;
  cloudEl=document.createElement("button"); cloudEl.type="button"; cloudEl.className="cloud";
  cloudEl.style.left=(10+Math.random()*55)+"%"; cloudEl.innerHTML="<span>Tap for rain</span>";
  cloudEl.addEventListener("click",()=>{ startRain(); removeCloud(); });
  $("field").appendChild(cloudEl); setTimeout(removeCloud,18000);
  if(S.decor.dog) setTimeout(()=>{ if(cloudEl){ startRain(); removeCloud(); } },3500);
}
function removeCloud(){ if(cloudEl){ cloudEl.remove(); cloudEl=null; } }
let rainEl=null, rbEl=null;
function startRain(){
  const dur=30000+5000*lv(S.build,"well"); rainUntil=Date.now()+dur; toast("Rain! Crops grow twice as fast for "+Math.round(dur/1000)+" seconds."); beep(400,.3,"sine",.04,200);
  if(!rainEl){
    rainEl=document.createElement("div"); rainEl.className="rainfx"; let h="";
    for(let i=0;i<30;i++) h+=`<i style="left:${Math.random()*100}%;animation-delay:${(Math.random()*.7).toFixed(2)}s"></i>`;
    rainEl.innerHTML=h; $("field").appendChild(rainEl);
  }
}
function events(){
  const now=Date.now();
  if(now>=nextCloud){ spawnCloud(); nextCloud=now+(50000+Math.random()*50000)/(1+0.25*lv(S.up,"rain")); }
  if(rainEl && now>=rainUntil){ rainEl.remove(); rainEl=null; rainbowUntil=now+60000; toast("A rainbow! Coins x1.25 for 60 seconds."); sfx.chime(); }
  if(now<rainbowUntil&&!rbEl){ rbEl=document.createElement("div"); rbEl.className="rainbow"; $("scene").appendChild(rbEl); }
  if(rbEl&&now>=rainbowUntil){ rbEl.remove(); rbEl=null; }
  if(now>=nextBoom){
    const open=[]; S.unlocked.forEach((u,i)=>{ if(u) open.push(i); });
    const c=open[Math.floor(Math.random()*open.length)];
    boom={c,until:now+40000}; toast("Market boom: "+CROPS[c].n+" sells for 3x for 40 seconds!");
    nextBoom=now+70000+Math.random()*60000;
  }
  if(now>=nextButterfly){ spawnButterfly(); nextButterfly=now+(100000+Math.random()*80000)/(S.decor.flowers?2:1); }
}
function ambience(dt){
  birdT-=dt; if(birdT>0) return; birdT=7+Math.random()*10;
  if(isNight()) sfx.cricket(); else if(!(Date.now()<rainUntil)) sfx.bird();
  if(S.decor.chime&&Math.random()<.35) sfx.chime();
}

/* ---------- UI: field ---------- */
let plotEls=[];
function buildPlots(){
  const host=$("plots"); host.innerHTML=""; plotEls=[];
  S.plots.forEach((p,i)=>{
    const b=document.createElement("button"); b.type="button"; b.className="plot"; b.dataset.i=i; b.setAttribute("aria-label","Plot "+(i+1));
    b.innerHTML='<div class="empty">+</div><div class="crop"></div><div class="bar"><i></i></div>';
    host.appendChild(b); plotEls.push({el:b,crop:b.querySelector(".crop"),empty:b.querySelector(".empty"),bar:b.querySelector(".bar i"),st:-9,c:-9});
  });
}
function paintPlots(){
  if(plotEls.length!==S.plots.length) buildPlots();
  S.plots.forEach((p,i)=>{
    const e=plotEls[i]; let st=-1;
    if(p.c>=0){ const pr=p.t/CROPS[p.c].t; st=pr>=1?2:pr>=0.34?1:0; e.bar.style.width=Math.min(100,pr*100)+"%"; }
    if(st!==e.st||p.c!==e.c){
      e.st=st; e.c=p.c;
      e.crop.innerHTML=p.c>=0?cropSVG(p.c,st):"";
      e.empty.style.display=p.c>=0?"none":"";
      e.el.classList.toggle("ready",st===2);
    }
  });
}
function floatText(i,txt,gold){
  const e=plotEls[i]; if(!e) return; const s=document.createElement("span"); s.className="float"+(gold?" gold":""); s.textContent=txt;
  e.el.appendChild(s); setTimeout(()=>s.remove(),950);
}
function burst(i,col){
  const e=plotEls[i]; if(!e) return;
  for(let k=0;k<7;k++){ const s=document.createElement("i"); s.className="spark"; const a=k/7*6.283+Math.random()*.5, r=26+Math.random()*16;
    s.style.cssText=`left:calc(50% - 3px);top:calc(50% - 3px);background:${col};--dx:${Math.cos(a)*r}px;--dy:${Math.sin(a)*r-10}px`; e.el.appendChild(s); setTimeout(()=>s.remove(),720); }
}
function paintPicker(){
  const host=$("picker"); host.innerHTML="";
  CROPS.forEach((c,i)=>{
    if(!S.unlocked[i]) return;
    const b=document.createElement("button"); b.type="button"; b.className="seed"; b.setAttribute("aria-pressed",String(S.sel===i));
    const m=masteryOf(S,i);
    b.innerHTML=cropSVG(i,2)+'<span>'+c.n+(m?" "+"&#9733;".repeat(m):"")+(c.s===seasonIdx()?" (in season)":"")+'<small>'+fmt(cropValue(i))+' coins - '+fmtTime(c.t/speedMult())+'</small></span>';
    b.addEventListener("click",()=>{ S.sel=i; paintPicker(); });
    host.appendChild(b);
  });
}
function paintBanner(force){
  const now=Date.now(); let h="";
  const sn=seasonIdx(), inS=CROPS.filter(c=>c.s===sn).map(c=>c.n).join(", ");
  h+=`<span class="badge" style="background:#e6f4d4;box-shadow:0 2px 0 #9cc27a">${SEASONS[sn]}: ${inS} sell ${(1.6+0.2*lv(S.tree,"bounty")).toFixed(1)}x</span>`;
  if(isNight()) h+='<span class="badge" style="background:#c9d3ff;box-shadow:0 2px 0 #8a96d6">Night: Moonflower grows 2x</span>';
  if(now<rainUntil) h+='<span class="badge rain">Rain: crops grow 2x ('+Math.ceil((rainUntil-now)/1000)+'s)</span>';
  if(now<rainbowUntil) h+='<span class="badge" style="background:#ffd6f0;box-shadow:0 2px 0 #d68ab8">Rainbow: coins 1.25x ('+Math.ceil((rainbowUntil-now)/1000)+'s)</span>';
  if(boom && now<boom.until) h+='<span class="badge">Market boom: '+CROPS[boom.c].n+' sells 3x ('+Math.ceil((boom.until-now)/1000)+'s)</span>';
  const b=$("banner"); if(force||b.dataset.h!==h){ b.dataset.h=h; b.innerHTML=h; if(force) paintPicker(); }
}

/* ---------- UI: panel ---------- */
let btnRefs=[];
function card(o){
  const d=document.createElement("div"); d.className="card"+(o.locked?" locked":"")+(o.maxed?" maxed":"");
  d.innerHTML=`<div class="ic ${o.sp?"sp":""}">${o.icon||""}</div><div class="tx"><div class="nm">${o.name}</div><div class="ds">${o.desc}</div>${o.level?`<div class="lv">${o.level}</div>`:""}${o.prog!==undefined?`<div class="prog"><i style="width:${Math.min(100,o.prog*100)}%"></i></div>`:""}</div>`;
  if(o.btn){
    const b=document.createElement("button"); b.type="button"; b.className="buy"+(o.cur==="sun"?" sunbuy":""); b.innerHTML=o.btn; b.dataset.act=o.act; b.dataset.key=o.key; d.appendChild(b);
    btnRefs.push({b,cost:o.cost,cur:o.cur||"coins",can:o.can!==false});
  }
  if(o.extra){ const x=document.createElement("button"); x.type="button"; x.className="buy"; x.style.minWidth="60px"; x.innerHTML=o.extra; x.dataset.act=o.extraAct; x.dataset.key=o.key; d.appendChild(x); }
  return d;
}
function renderPanel(){
  const body=$("body"), top=body.scrollTop; body.innerHTML=""; btnRefs=[];
  ({up:renderUpgrades,ranch:renderRanch,build:renderBuild,orders:renderOrders,fest:renderFest,ach:renderAwards})[tab](body);
  refreshBtns(); body.scrollTop=top;
  document.querySelectorAll(".tab").forEach(t=>t.setAttribute("aria-selected",String(t.dataset.tab===tab)));
}
function secTitle(body,text){ const d=document.createElement("div"); d.className="sec"; d.textContent=text; body.appendChild(d); }
function bulkSeg(body){
  const seg=document.createElement("div"); seg.className="seg";
  [[1,"x1"],[10,"x10"],[1000,"Max"]].forEach(([n,l])=>{ const b=document.createElement("button"); b.type="button"; b.textContent="Buy "+l; b.setAttribute("aria-pressed",String(S.bulk===n)); b.dataset.act="bulk"; b.dataset.key=n; seg.appendChild(b); });
  body.appendChild(seg);
}
const bulkLabel=()=>S.bulk>1?"buy "+(S.bulk>=1000?"max":"x"+S.bulk):"coins";
function renderUpgrades(body){
  bulkSeg(body);
  secTitle(body,"Seed shop");
  CROPS.forEach((c,i)=>{
    if(S.unlocked[i]) return;
    const prev=i===0||S.unlocked[i-1];
    body.appendChild(card({icon:cropSVG(i,2),name:c.n+" seeds",desc:prev?`Grows in ${fmtTime(c.t)}. Worth ${fmt(c.v)} coins each. Best in ${SEASONS[c.s].toLowerCase()}.${c.night?" Grows 2x at night.":""}`:"Unlock the crop before this one first.",locked:!prev,
      btn:prev?`${fmt(c.unlock)}<small>unlock</small>`:`Locked`,act:"crop",key:i,cost:c.unlock,can:prev}));
  });
  if(S.unlocked.every(Boolean)){ const n=document.createElement("div"); n.className="ds"; n.textContent="Every crop is unlocked."; body.appendChild(n); }
  secTitle(body,"Farm upgrades");
  const icons={plots:"+",fert:"%",yield:"x",hand:"H",auto:"A",clover:"?",scare:"Z",rain:"R"};
  UP_ORDER.forEach(k=>{
    const L=lv(S.up,k), mx=upMax(k), u=UP[k], maxed=L>=mx;
    body.appendChild(card({icon:icons[k],name:u.n,desc:u.d,level:`Level ${L}${mx>1?" / "+mx:""}`,maxed,
      btn:maxed?"Maxed":`${fmt(upCost(k))}<small>${bulkLabel()}</small>`,act:"up",key:k,cost:maxed?Infinity:upCost(k),can:!maxed}));
  });
  secTitle(body,"Crop mastery");
  const m=document.createElement("div"); m.className="ds"; m.textContent="Harvest the same crop again and again to master it. Each mastery star makes that crop sell for 10% more (stars at "+MASTERY.map(fmt).join(", ")+" harvests).";
  body.appendChild(m);
}
function renderRanch(body){
  bulkSeg(body);
  const t=document.createElement("div"); t.className="fest"; t.innerHTML=`<h3>Your ranch</h3><p>Animals earn coins all day, even while you are away. Tap the glowing bubbles above them in the scene for bonus goods.</p><div class="gain">${fmt(ranchCps())} coins / second</div>`;
  body.appendChild(t);
  secTitle(body,"Animals");
  ANIMALS.forEach((a,i)=>{
    const n=S.ranch[a.id]||0, prev=i===0||(S.ranch[ANIMALS[i-1].id]||0)>=1||n>0;
    body.appendChild(card({icon:animalSVG(a.id),sp:true,name:a.n,desc:prev?`${a.d} Each makes ${fmt(a.cps*ranchMult())} coins/s.`:"Buy the animal before this one first.",level:n?`You own ${n}`:"",locked:!prev,
      btn:prev?`${fmt(animalCost(a,n))}<small>${bulkLabel()}</small>`:"Locked",act:"animal",key:a.id,cost:animalCost(a,n),can:prev}));
  });
  secTitle(body,"Care");
  const k="happy",L=lv(S.up,k),mx=UP[k].max,maxed=L>=mx;
  body.appendChild(card({icon:"&hearts;",name:UP[k].n,desc:UP[k].d,level:`Level ${L} / ${mx}`,maxed,btn:maxed?"Maxed":`${fmt(upCost(k))}<small>${bulkLabel()}</small>`,act:"up",key:k,cost:maxed?Infinity:upCost(k),can:!maxed}));
}
function renderBuild(body){
  bulkSeg(body);
  secTitle(body,"Buildings (they appear on your farm)");
  BUILD.forEach(b=>{
    const L=lv(S.build,b.id), maxed=L>=b.max;
    body.appendChild(card({icon:b.n[0],name:b.n,desc:b.d,level:`Level ${L} / ${b.max}`,maxed,btn:maxed?"Maxed":`${fmt(b.cost(L))}<small>${bulkLabel()}</small>`,act:"build",key:b.id,cost:maxed?Infinity:b.cost(L),can:!maxed}));
  });
  secTitle(body,"Decorations (permanent, bought with gems)");
  const g=document.createElement("div"); g.className="ds"; g.textContent="Earn gems by filling orders, catching golden butterflies and winning awards. Decorations stay forever, even after a festival.";
  body.appendChild(g);
  DECOR.forEach(d=>{
    const has=!!S.decor[d.id];
    body.appendChild(card({icon:d.n[0],name:d.n,desc:d.d,maxed:has,btn:has?"Owned":`${d.gems}<small>gems</small>`,act:"decor",key:d.id,cost:has?Infinity:d.gems,cur:"gem",can:!has}));
  });
}
function renderOrders(body){
  const t=document.createElement("div"); t.className="ds"; t.textContent="Deliver crops to neighbors for big coin rewards and gems. Harvests count toward every order that wants that crop.";
  body.appendChild(t); secTitle(body,"Order board ("+S.orderDone+" filled)");
  S.orders.forEach((o,i)=>{
    const r=orderReward(o), done=o.have>=o.need;
    body.appendChild(card({icon:cropSVG(o.c,2),name:`${o.need} ${CROPS[o.c].n}`,desc:`Reward: ${fmt(r.coins)} coins and ${r.gems} gems`,level:`${Math.min(o.have,o.need)} / ${o.need} delivered`,prog:o.have/o.need,
      btn:done?"Claim":"Not yet",act:"claim",key:i,cost:0,can:done,extra:done?"":"Swap",extraAct:"swap"}));
  });
  if(S.orders.length<3){ const n=document.createElement("div"); n.className="ds"; n.textContent="A new order is on its way..."; body.appendChild(n); }
}
function renderFest(body){
  const gain=sunGain();
  const f=document.createElement("div"); f.className="fest";
  f.innerHTML=`<h3>Harvest Festival</h3><p>Hold a festival to start a new season. Your coins, plots, crops, animals, buildings and farm upgrades reset, but you earn <b>sunseeds</b>. Sunseeds give a permanent +5% coins each and buy the permanent upgrades below. Gems, decorations and awards always stay.</p>
    <div class="gain">${gain>0?"+"+fmt(gain)+" sunseeds":"Not enough yet"}</div><p>${gain>0?"This season you earned "+fmt(S.run)+" coins.":"Earn about "+fmt(20000)+" coins this season to get your first sunseed ("+fmt(S.run)+" so far)."}</p>`;
  const b=document.createElement("button"); b.type="button"; b.className="big"; b.textContent="Hold the festival"; b.dataset.act="fest";
  b.style.flex="0 0 auto"; b.style.padding="10px 22px"; b.disabled=gain<1; if(gain<1) b.style.opacity=".5";
  f.appendChild(b); body.appendChild(f);
  secTitle(body,"Sunseed upgrades (permanent) - you have "+fmt(S.sun));
  let lastTier=0, tierEl=null;
  TREE_ORDER.forEach(k=>{
    const t=TREE[k];
    if(t.tier!==lastTier){ tierEl=document.createElement("div"); tierEl.className="tier"; body.appendChild(tierEl); lastTier=t.tier; }
    const L=lv(S.tree,k), maxed=L>=t.max, open=!t.req||lv(S.tree,t.req)>=1;
    tierEl.appendChild(card({icon:t.n[0],name:t.n,desc:open?t.d:"Requires "+TREE[t.req].n+" level 1.",level:`Level ${L} / ${t.max}`,locked:!open,maxed,
      btn:maxed?"Maxed":open?`${fmt(t.cost(L))}<small>sunseeds</small>`:"Locked",act:"tree",key:k,cost:maxed?Infinity:t.cost(L),cur:"sun",can:open&&!maxed}));
  });
}
function renderAwards(body){
  const st=document.createElement("div"); st.className="stats";
  [[fmt(S.harvests),"crops harvested"],[fmt(S.life),"coins earned, all time"],[String(S.rebirths),"festivals held"],[fmtTime(S.played),"time played"],[String(animalTotal(S)),"animals on the ranch"],[String(S.catches),"butterflies caught"]].forEach(([a,b])=>{
    const d=document.createElement("div"); d.className="stat"; d.innerHTML=`<b>${a}</b><span>${b}</span>`; st.appendChild(d);
  });
  body.appendChild(st);
  secTitle(body,`Awards ${achCount()} / ${ACH.length} (each gives +3% coins and 1 gem)`);
  ACH.forEach(a=>{
    const done=!!S.ach[a.id]; const d=document.createElement("div"); d.className="ach"+(done?" done":"");
    d.innerHTML=`<div class="mk">${done?"&#10003;":""}</div><div><div style="font:700 15px var(--display)">${a.n}</div><div style="color:var(--ink2);font-size:12px">${a.d}</div></div>`;
    body.appendChild(d);
  });
}
function refreshBtns(){
  btnRefs.forEach(r=>{ const have=r.cur==="sun"?S.sun:r.cur==="gem"?S.gems:S.coins; r.b.classList.toggle("afford",r.can&&have>=r.cost); });
  $("coins").textContent=fmt(S.coins);
  $("sunseeds").textContent=fmt(S.sun);
  $("gems").textContent=fmt(S.gems);
  $("sunChip").hidden=!(S.sunEver>0);
  $("gemChip").hidden=!(S.gems>0||S.orderDone>0||S.catches>0||Object.keys(S.decor).length>0);
  $("festDot").hidden=!(sunGain()>=1 && tab!=="fest");
  $("ordDot").hidden=!(S.orders.some(o=>o.have>=o.need) && tab!=="orders");
}

/* ---------- purchases ---------- */
function buyUp(k){
  let n=0; const mx=upMax(k);
  while(n<S.bulk && lv(S.up,k)<mx && S.coins>=upCost(k)){ S.coins-=upCost(k); S.up[k]=lv(S.up,k)+1; n++; }
  if(!n) return;
  if(k==="plots"){ ensurePlots(); buildPlots(); paintPlots(); }
  sfx.buy(); save(); renderPanel(); checkAch();
}
function buyAnimal(id){
  const a=ANIMALS.find(x=>x.id===id); let n=0;
  while(n<S.bulk && S.coins>=animalCost(a,S.ranch[id]||0)){ S.coins-=animalCost(a,S.ranch[id]||0); S.ranch[id]=(S.ranch[id]||0)+1; n++; }
  if(!n) return; sfx.buy(); renderCritters(); save(); renderPanel(); checkAch();
}
function buyBuild(id){
  const b=BUILD.find(x=>x.id===id); let n=0;
  while(n<S.bulk && lv(S.build,id)<b.max && S.coins>=b.cost(lv(S.build,id))){ S.coins-=b.cost(lv(S.build,id)); S.build[id]=lv(S.build,id)+1; n++; }
  if(!n) return; sfx.buy(); renderScene(); save(); renderPanel(); checkAch();
}
function buyDecor(id){
  const d=DECOR.find(x=>x.id===id); if(S.decor[id]||S.gems<d.gems) return;
  S.gems-=d.gems; S.decor[id]=1; sfx.ach(); toast(d.n+" added to your farm!"); renderScene(); critSig=""; renderCritters(); save(); renderPanel(); checkAch();
}
function buyCrop(i){
  const c=CROPS[i]; if(S.unlocked[i]||S.coins<c.unlock||!(i===0||S.unlocked[i-1])) return;
  S.coins-=c.unlock; S.unlocked[i]=true; S.sel=i; sfx.buy(); toast(c.n+" seeds unlocked!"); save(); paintPicker(); renderPanel(); checkAch();
}
function buyTree(k){
  const t=TREE[k], L=lv(S.tree,k); if(L>=t.max) return; if(t.req && lv(S.tree,t.req)<1) return;
  const c=t.cost(L); if(S.sun<c) return; S.sun-=c; S.tree[k]=L+1; sfx.buy(); save(); renderPanel();
}
function festival(){
  const gain=sunGain(); if(gain<1) return;
  ask("Hold the Harvest Festival?",`You will earn ${fmt(gain)} sunseeds. Your coins, plots, crops, animals, buildings and farm upgrades reset. Sunseeds, sunseed upgrades, gems, decorations and awards stay.`,"Hold festival",()=>{
    S.sun+=gain; S.sunEver+=gain; S.rebirths++; S.coins=0; S.run=0; S.up={}; S.ranch={}; S.build={}; S.hc=S.hc||{};
    const h=lv(S.tree,"hands"); if(h>=1) S.up.hand= h>=3?5:1; if(h>=2) S.up.auto=1;
    if(lv(S.tree,"ranchers")) S.ranch.chicken=3*lv(S.tree,"ranchers");
    S.unlocked=CROPS.map((_,i)=>i===0||i<=lv(S.tree,"seeds")); S.sel=lv(S.tree,"seeds");
    S.plots=[]; ensurePlots(); handT=0; boom=null; S.orders=[]; fillOrders(); critSig=""; renderCritters(); renderScene();
    sfx.fest(); toast("A new season begins. +"+fmt(gain)+" sunseeds!"); save(); buildPlots(); paintPlots(); paintPicker(); renderPanel(); checkAch();
  });
}

/* ---------- awards, toast, modal ---------- */
function checkAch(){ ACH.forEach(a=>{ if(!S.ach[a.id]&&a.ok(S)){ S.ach[a.id]=1; S.gems++; toast("Award: "+a.n+" (+1 gem)"); sfx.ach(); if(tab==="ach") renderPanel(); } }); }
function toast(t){ const d=document.createElement("div"); d.className="toast"; d.textContent=t; $("toasts").appendChild(d); setTimeout(()=>d.remove(),3200); while($("toasts").children.length>4) $("toasts").firstChild.remove(); }
function ask(title,text,okLabel,onYes,danger){
  const host=$("modalHost");
  host.innerHTML=`<div class="modal"><div class="box" role="dialog" aria-modal="true"><h2>${title}</h2><p>${text}</p><div class="row"><button type="button" id="mNo">Cancel</button><button type="button" id="mYes" class="${danger?"danger":"ok"}">${okLabel}</button></div></div></div>`;
  $("mNo").onclick=()=>{ host.innerHTML=""; }; $("mYes").onclick=()=>{ host.innerHTML=""; onYes(); }; $("mYes").focus();
}
function info(title,text){
  const host=$("modalHost");
  host.innerHTML=`<div class="modal"><div class="box" role="dialog" aria-modal="true"><h2>${title}</h2><p>${text}</p><div class="row"><button type="button" id="mYes" class="ok">Nice</button></div></div></div>`;
  $("mYes").onclick=()=>{ host.innerHTML=""; };
}

/* ---------- wiring ---------- */
function wire(){
  $("plots").addEventListener("click",e=>{
    const b=e.target.closest(".plot"); if(!b) return; const i=+b.dataset.i, p=S.plots[i]; if(!p) return;
    if(p.c<0){ if(plant(i)) paintPlots(); } else if(isReady(p)){ harvest(i); paintPlots(); checkAch(); refreshBtns(); }
  });
  $("plantAll").onclick=()=>{ plantAll(); paintPlots(); };
  $("harvestAll").onclick=()=>{ harvestAll(); paintPlots(); refreshBtns(); };
  $("tabs").addEventListener("click",e=>{ const t=e.target.closest(".tab"); if(!t) return; tab=t.dataset.tab; $("body").scrollTop=0; renderPanel(); });
  $("body").addEventListener("click",e=>{
    const b=e.target.closest("[data-act]"); if(!b) return; const a=b.dataset.act, k=b.dataset.key;
    if(a==="bulk"){ S.bulk=+k; renderPanel(); }
    else if(a==="up") buyUp(k); else if(a==="crop") buyCrop(+k); else if(a==="tree") buyTree(k); else if(a==="fest") festival();
    else if(a==="animal") buyAnimal(k); else if(a==="build") buyBuild(k); else if(a==="decor") buyDecor(k);
    else if(a==="claim") claimOrder(+k); else if(a==="swap") swapOrder(+k);
  });
  $("soundBtn").onclick=()=>{ if(FORCE_MUTE) return; S.muted=!S.muted; $("soundBtn").textContent=S.muted?"Sound off":"Sound on"; save(); };
  $("soundBtn").textContent=(S.muted||FORCE_MUTE)?"Sound off":"Sound on";
  const reset=document.createElement("button"); reset.type="button"; reset.className="iconbtn"; reset.textContent="Reset";
  reset.onclick=()=>ask("Erase your farm?","This deletes all progress, including sunseeds, gems and awards. It cannot be undone.","Erase everything",()=>{ localStorage.removeItem(SAVE_KEY); location.reload(); },true);
  $("soundBtn").after(reset);
  document.addEventListener("visibilitychange",()=>{ if(document.hidden) save(); });
  window.addEventListener("pagehide",save);
}

/* ---------- boot ---------- */
load(); ensurePlots(); fillOrders();
const away=(Date.now()-S.last)/1000;
wire(); buildPlots(); paintPlots(); paintPicker(); renderPanel(); renderCritters(); updateSky(); paintBanner(true);
if(away>=30 && S.harvests>0){
  const e=offline(away); paintPlots(); renderPanel();
  info("Welcome back!",`You were away for ${fmtTime(Math.min(away,awayCapHours()*3600))}.`+(e>0?` Your farm earned ${fmt(e)} coins while you were gone.`:` Your crops kept growing.`));
} else if(S.harvests===0 && S.life===0){ toast("Tap a plot to plant. Tap it again when it glows to harvest."); }
let lastT=Date.now(), uiT=0, saveT=0, skyT=0, ordT=0;
function step(dt){
  S.played+=dt; simulate(dt); events(); tickRanchBubbles(dt); ambience(dt);
  uiT+=dt; saveT+=dt; skyT+=dt; ordT+=dt;
  paintPlots(); paintBanner();
  if(skyT>=1){ skyT=0; updateSky(); }
  if(uiT>=0.4){ uiT=0; refreshBtns(); }
  if(ordT>=1.5){ ordT=0; if(tab==="orders") renderPanel(); }
  if(saveT>=5){ saveT=0; checkAch(); save(); try{ if(window.DHScores) DHScores.submit('farm-idle', S.life); }catch(_){} }
}
setInterval(()=>{
  const now=Date.now(); let dt=(now-lastT)/1000; lastT=now;
  if(dt>5){ offline(dt); dt=0.1; }
  step(dt);
},100);
window.__farm={S:()=>S,harvestAll,plantAll,buyUp,buyCrop,buyTree,buyAnimal,buyBuild,buyDecor,claimOrder,festival,fmt,CROPS,ANIMALS,startRain,renderPanel,
  setTab:t=>{tab=t;renderPanel();},step,shift:s=>{timeShift=s*1000;updateSky();},spawnButterfly,collectBubble,bubbles:()=>bubbles};
})();
