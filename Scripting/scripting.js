(() => {
"use strict";
const $ = id => document.getElementById(id);
const STORAGE_KEY = "doughub_scripting_project_v3";
let studioKind="game";
let dbClient=null;
const STARTERS = {
  html: `<main class="app">
  <p class="eyebrow">MY FIRST PROJECT</p>
  <h1>Hello, world! 👋</h1>
  <p>Edit this HTML, then press <strong>Run preview</strong>.</p>
  <button id="helloButton">Click me</button>
  <p id="message" aria-live="polite"></p>
</main>`,
  css: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: system-ui, sans-serif;
  color: #f8fafc;
  background: #0b1024;
}
.app {
  width: min(560px, calc(100% - 40px));
  padding: 32px;
  border: 1px solid #ffffff22;
  border-radius: 22px;
  background: #151b35;
  box-shadow: 0 24px 70px #0005;
}
.eyebrow { color: #a5b4fc; font-size: 12px; letter-spacing: 2px; }
button {
  border: 0; border-radius: 10px; padding: 11px 16px;
  color: white; background: linear-gradient(135deg,#6366f1,#a855f7);
  cursor: pointer; font-weight: 800;
}
#message { color: #c4b5fd; }`,
  js: `const button = document.querySelector("#helloButton");
const message = document.querySelector("#message");

button?.addEventListener("click", () => {
  message.textContent = "It works! You just ran JavaScript.";
  console.log("Hello from DougHub Scripting Editor!");
});`
};
const BLOCKS = [
  {type:"onload",cat:"events",label:"When page loads",fields:[],code:()=> 'document.addEventListener("DOMContentLoaded", () => {\n  console.log("Page ready!");\n});'},
  {type:"click",cat:"events",label:"When element is clicked",fields:[["selector","#myButton"]],code:f=> 'document.querySelector('+JSON.stringify(f.selector)+')?.addEventListener("click", () => {\n  console.log("Clicked!");\n});'},
  {type:"keydown",cat:"events",label:"When a key is pressed",fields:[["key","Enter"]],code:f=> 'document.addEventListener("keydown", (event) => {\n  if (event.key === '+JSON.stringify(f.key)+') {\n    console.log("Key pressed!");\n  }\n});'},
  {type:"log",cat:"output",label:"Log a message",fields:[["message","Hello from my code!"]],code:f=> 'console.log('+JSON.stringify(f.message)+');'},
  {type:"alert",cat:"output",label:"Show an alert",fields:[["message","Hello!"]],code:f=> 'alert('+JSON.stringify(f.message)+');'},
  {type:"text",cat:"output",label:"Set element text",fields:[["selector","#message"],["text","It works!"]],code:f=> 'document.querySelector('+JSON.stringify(f.selector)+')?.textContent = '+JSON.stringify(f.text)+';'},
  {type:"let",cat:"variables",label:"Create a variable",fields:[["name","score"],["value","0"]],code:f=> 'let '+safeIdentifier(f.name,'score')+' = '+safeExpression(f.value,'0')+';'},
  {type:"set",cat:"variables",label:"Set a variable",fields:[["name","score"],["value","10"]],code:f=> safeIdentifier(f.name,'score')+' = '+safeExpression(f.value,'10')+';'},
  {type:"change",cat:"variables",label:"Change variable by",fields:[["name","score"],["value","1"]],code:f=> safeIdentifier(f.name,'score')+' += '+safeExpression(f.value,'1')+';'},
  {type:"if",cat:"logic",label:"If condition is true",fields:[["condition","score > 0"]],code:f=> 'if ('+safeExpression(f.condition,'score > 0')+') {\n  console.log("Condition is true");\n}'},
  {type:"ifelse",cat:"logic",label:"If / else condition",fields:[["condition","score > 0"]],code:f=> 'if ('+safeExpression(f.condition,'score > 0')+') {\n  console.log("True branch");\n} else {\n  console.log("False branch");\n}'},
  {type:"repeat",cat:"loops",label:"Repeat code N times",fields:[["count","5"]],code:f=> 'for (let i = 0; i < Math.max(0, Math.min(1000, Number('+JSON.stringify(f.count)+') || 0)); i++) {\n  console.log("Loop", i + 1);\n}'},
  {type:"while",cat:"loops",label:"While condition is true",fields:[["condition","count < 5"]],code:f=> '// Make sure the condition eventually becomes false.\nwhile ('+safeExpression(f.condition,'count < 5')+') {\n  console.log("Looping");\n  break; // Remove break after adding your own update.\n}'},
  {type:"query",cat:"web",label:"Find an element",fields:[["name","myElement"],["selector","#myElement"]],code:f=> 'const '+safeIdentifier(f.name,'myElement')+' = document.querySelector('+JSON.stringify(f.selector)+');'},
  {type:"class",cat:"web",label:"Add a CSS class",fields:[["selector","#myElement"],["class","active"]],code:f=> 'document.querySelector('+JSON.stringify(f.selector)+')?.classList.add('+JSON.stringify(f.class)+');'},
  {type:"function",cat:"functions",label:"Create a function",fields:[["name","myFunction"]],code:f=> 'function '+safeIdentifier(f.name,'myFunction')+'() {\n  console.log("Function called");\n}\n'+safeIdentifier(f.name,'myFunction')+'();'},
  {type:"comment",cat:"functions",label:"Add a code comment",fields:[["text","Explain what this code does"]],code:f=> '// '+String(f.text||"").replace(/[\r\n]+/g," ")}
];
function safeIdentifier(value,fallback){const s=String(value||"").trim();return /^[A-Za-z_$][\w$]*$/.test(s)?s:fallback;}
function safeExpression(value,fallback){const s=String(value||"").trim();return s && s.length<160 && !/[;{}]/.test(s)?s:fallback;}
let files={...STARTERS},activeFile="html",blocks=[],activeCategory="all",currentMode="code",user=null;
function setStatus(message,isError=false){$("status").textContent=message;$("status").style.color=isError?"#fca5a5":"#a5b4fc";}
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({files,blocks,projectName:$("projectName").value,activeFile}));}catch(e){setStatus("Browser storage is unavailable",true);}}
function restore(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");if(saved&&saved.files){files={...STARTERS,...saved.files};blocks=Array.isArray(saved.blocks)?saved.blocks:[];$("projectName").value=saved.projectName||"My Community Game";activeFile=Object.prototype.hasOwnProperty.call(files,saved.activeFile)?saved.activeFile:"html";}}catch(e){console.warn("Could not restore local project",e);}}
function fileLabel(key){return ({html:"index.html",css:"style.css",js:"main.js"})[key]||key;}
function renderFileTabs(){const host=$("fileTabs");if(!host)return;host.innerHTML="";Object.keys(files).forEach(key=>{const btn=document.createElement("button");btn.type="button";btn.className="file-tab"+(key===activeFile?" active":"");btn.dataset.file=key;btn.title=fileLabel(key);const label=document.createElement("span");label.textContent=fileLabel(key);btn.appendChild(label);if(!["html","css","js"].includes(key)){const remove=document.createElement("span");remove.className="remove-file";remove.textContent="×";remove.title="Remove "+key;remove.setAttribute("role","button");remove.setAttribute("aria-label","Remove "+key);remove.addEventListener("click",e=>{e.stopPropagation();if(!confirm("Remove "+key+" from this project?"))return;delete files[key];if(activeFile===key)activeFile="html";renderFile();persist();});btn.appendChild(remove);}host.appendChild(btn);});}
function renderFile(){renderFileTabs();$("activeFileLabel").textContent=fileLabel(activeFile);$("codeEditor").value=files[activeFile]||"";updateLineCount();}
function updateLineCount(){const code=$("codeEditor").value;$("lineCount").textContent=(code.split("\n").length)+" line"+(code.split("\n").length===1?"":"s");}
function switchFile(file){saveCurrentFile();activeFile=file;renderFile();persist();}
function saveCurrentFile(){files[activeFile]=$("codeEditor").value;updateLineCount();persist();}
function buildDocument(){const html=files.html||"";const css=files.css||"";const js=files.js||"";let assets=[];try{assets=JSON.parse(files["assets.json"]||"[]");if(!Array.isArray(assets))assets=[];}catch(_){}const bootstrap='<script>window.DougHubAssets='+JSON.stringify(assets).replace(/<\//g,"<\\/")+'</script>';return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"}}</script>\n<style>\n'+css+'\n</style>\n</head>\n<body>\n'+html+'\n'+bootstrap+'\n<script>\n'+js.replace(/<\/script/gi,"<\\/script")+'\n</script>\n</body>\n</html>';}
function runPreview(){saveCurrentFile();if(currentMode==="blocks")updateGenerated();const isBlocks=currentMode==="blocks",isFast=currentMode==="fast";const frame=$(isBlocks?"previewDialogFrame":isFast?"fastPreviewFrame":"previewFrame");if(frame)frame.srcdoc=buildDocument();const empty=$(isBlocks?"previewDialogEmpty":isFast?"fastPreviewEmpty":"previewEmpty");const status=$(isBlocks?"previewDialogStatus":isFast?"fastPreviewStatus":"previewStatus");if(empty)empty.hidden=true;if(status)status.textContent="Preview refreshed at "+new Date().toLocaleTimeString();setStatus("Preview updated");}
function setMode(mode){currentMode=mode;document.querySelectorAll(".mode-btn").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));$("codeMode").hidden=mode!=="code";$("blocksMode").hidden=mode!=="blocks";$("fastMode").hidden=mode!=="fast";if(mode==="blocks"){renderLibrary();renderBlocks();if(blocklyWorkspace){requestAnimationFrame(()=>{try{Blockly.svgResize(blocklyWorkspace);}catch(e){console.warn("Blockly resize failed",e);}});}}else if(mode==="code")renderFile();else renderFastStatus();persist();}

function setStudioKind(kind){
  studioKind=kind==="project"?"project":"game";
  const modeParams=new URLSearchParams(location.search);
  if(studioKind==="project")modeParams.set("kind","project");else modeParams.delete("kind");
  history.replaceState(null,"",location.pathname+(modeParams.toString()?"?"+modeParams.toString():"")+location.hash);
  document.querySelectorAll("[data-studio-kind]").forEach(button=>{
    const active=button.dataset.studioKind===studioKind;
    button.classList.toggle("active",active);
    button.setAttribute("aria-pressed",String(active));
  });
  const project=studioKind==="project";
  $("studioKindHeading").textContent=project?"Projects":"Game Creator";
  $("studioKindDescription").textContent=project
    ?"Build websites, apps, tools, experiments, and other coding projects — not just games. All editor, JavaScript, blocks, preview, save, and export tools stay available."
    :"Build playable games with code, visual blocks, templates, previews, and Community Games publishing.";
  $("projectName").previousElementSibling.textContent=project?"Project":"Game";
  $("openPublishDialog").textContent=project?"Publish project ↗":"Publish game ↗";
  $("codeCommunityProjects").hidden=!project;
  $("communityTitle").previousElementSibling.childNodes[0].textContent=project?"Project title":"Game title";
  $("communityDescription").previousElementSibling.childNodes[0].textContent=project?"What does your project do?":"What is your game about?";
  $("publishDialogTitle").textContent=project?"Publish your project":"Publish your game";
  $("publishGameDialog").querySelector(".publish-dialog-header .eyebrow").textContent=project?"DOUGCODE · COMMUNITY PROJECTS":"DOUG GAMES · COMMUNITY";
  $("publishGameDialog").querySelector(".publish-dialog-header p").textContent=project
    ?"Give your coding project a name and a short description. It will be public and playable as a web project by other DougHub users."
    :"Give your game a name and a short description. It will be public and playable by other DougHub users.";
  $("publishProjectBtn").textContent=project?"Publish web project ↗":"Publish to Community Games ↗";
  $("fastMode").querySelector(".fast-welcome h1").textContent=project?"Make a coding project. Fast.":"Make something fun. Fast.";
  $("fastMode").querySelector(".fast-welcome p").textContent=project
    ?"Start from a web-page or blank-project template, then switch to JavaScript or Visual Blocks whenever you want."
    :"Pick a game starter, customize it, and play instantly. You can switch to Code or Visual Blocks any time.";
  $("fastMode").querySelector(".fast-games-panel .panel-head h2").textContent=project?"Project starters":"Game starters";
  $("fastMode").querySelector(".fast-play-panel .panel-head h2").textContent=project?"Project preview":"Live preview";
  $("fastPreviewFrame").title=project?"Coding project preview":"Game preview";
  $("fastPreviewEmpty").querySelector("span").textContent=project?"Choose a project template to begin.":"Choose a template to make it playable.";
  document.querySelectorAll("[data-fast-template]").forEach(button=>{
    const gameTemplate=["clicker","dodge","zombie"].includes(button.dataset.fastTemplate);
    button.hidden=project&&gameTemplate;
    const cta=button.querySelector(".fast-template-cta");
    if(cta&&project)cta.textContent=button.dataset.fastTemplate==="landing"?"Create website ↗":button.dataset.fastTemplate==="quiz"?"Create project ↗":"Start building ↗";
    else if(cta)cta.textContent=gameTemplate?"Create game ↗":button.dataset.fastTemplate==="landing"?"Create page ↗":"Create project ↗";
  });
  $("codeCommunityTitle").placeholder=project?"My coding project":"My awesome project";
  $("codeCommunityDescription").placeholder=project?"What does this website, app, tool, or program do?":"What does your project do?";
  $("publishCodeProjectBtn").textContent=project?"Publish Project":"Publish Code Project";
}
document.querySelectorAll("[data-studio-kind]").forEach(button=>button.addEventListener("click",()=>setStudioKind(button.dataset.studioKind)));



const FAST_TEMPLATES={
 clicker:{name:"Clicker Game",html:`<main class="game"><p class="eyebrow">DOUG ARCADE</p><h1>Click Rush</h1><p>Tap the crystal. Buy upgrades. Beat your best.</p><div class="stats"><span>Score <b id="score">0</b></span><span>Power <b id="power">1</b></span><span>Best <b id="best">0</b></span></div><button id="tap" class="crystal">✦<small>CLICK!</small></button><button id="upgrade" class="upgrade">Upgrade power · 10 points</button><p id="hint">Every click earns points.</p></main>`,css:`*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at top,#29245f,#080a19 65%);color:#f8f7ff;font:16px system-ui}.game{width:min(520px,calc(100% - 28px));padding:28px;text-align:center;border:1px solid #a5b4fc40;border-radius:24px;background:#11152c;box-shadow:0 20px 70px #0008}.eyebrow{color:#a5b4fc;letter-spacing:3px;font-size:11px;font-weight:900}h1{font-size:40px;margin:8px 0}p{color:#a8afce}.stats{display:flex;justify-content:space-around;gap:10px;margin:24px 0;padding:14px;background:#080a19;border-radius:14px}.stats span{display:grid;gap:5px;color:#a8afce;font-size:11px}.stats b{color:#fff;font-size:22px}.crystal{width:145px;height:145px;border:1px solid #d8b4fe;border-radius:38px;background:linear-gradient(135deg,#6366f1,#c026d3);color:white;font-size:55px;box-shadow:0 0 50px #8b5cf655;cursor:pointer;transition:transform .1s}.crystal:active{transform:scale(.92)}.crystal small{display:block;font-size:11px;letter-spacing:2px}.upgrade{display:block;width:100%;margin-top:20px;padding:14px;border:0;border-radius:12px;background:#312e81;color:white;font-weight:800;cursor:pointer}.upgrade:disabled{opacity:.45;cursor:not-allowed}#hint{font-size:12px}`,js:`let score=0,power=1,best=Number(localStorage.getItem("clickrush-best")||0);const $=id=>document.getElementById(id);function draw(){$("score").textContent=score;$("power").textContent=power;$("best").textContent=best;$("upgrade").disabled=score<10*power;$("upgrade").textContent="Upgrade power · "+(10*power)+" points"}$("tap").addEventListener("click",()=>{score+=power;if(score>best){best=score;localStorage.setItem("clickrush-best",best)}draw()});$("upgrade").addEventListener("click",()=>{const cost=10*power;if(score>=cost){score-=cost;power++;$("hint").textContent="Power upgraded! Keep going.";draw()}});draw();`},
 dodge:{name:"Dodge Game",html:`<main class="game"><p class="eyebrow">SURVIVAL MODE</p><h1>Dodge Zone</h1><p>Move with ← → or A / D. Don't touch the falling blocks.</p><div class="score">Score <b id="score">0</b> <span id="state">Ready</span></div><canvas id="game" width="420" height="520" aria-label="Dodge game"></canvas><button id="start">Start / restart</button></main>`,css:`*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at top,#22205a,#070914 70%);color:#fff;font:14px system-ui}.game{width:min(500px,calc(100% - 20px));padding:20px;text-align:center;border:1px solid #a5b4fc40;border-radius:20px;background:#10142a}.eyebrow{color:#a5b4fc;letter-spacing:3px;font-weight:900;font-size:10px}h1{font-size:32px;margin:8px}p{color:#aab0cd;line-height:1.5}.score{display:flex;justify-content:space-between;margin:15px 0;color:#c4b5fd}canvas{display:block;width:100%;height:auto;max-height:55vh;border-radius:12px;background:#070a18;border:1px solid #ffffff1c}button{margin-top:14px;padding:12px 20px;border:0;border-radius:10px;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;font-weight:800;cursor:pointer}`,js:`const c=document.getElementById("game"),ctx=c.getContext("2d"),keys={};let player={x:195,y:455,w:30,h:30},blocks=[],score=0,live=false,last=0,spawn=0;addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true;if(["ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault()});addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);function start(){player.x=195;blocks=[];score=0;live=true;last=performance.now();spawn=0;document.getElementById("state").textContent="Playing";requestAnimationFrame(loop)}function loop(t){if(!live)return;const dt=Math.min(32,t-last);last=t;spawn+=dt;if(spawn>650){spawn=0;blocks.push({x:Math.random()*390,y:-30,w:18+Math.random()*24,h:20+Math.random()*20,s:2+Math.random()*2+score/250})}if(keys.arrowleft||keys.a)player.x-=dt*.35;if(keys.arrowright||keys.d)player.x+=dt*.35;player.x=Math.max(0,Math.min(c.width-player.w,player.x));blocks.forEach(b=>b.y+=b.s*dt/16);blocks=blocks.filter(b=>b.y<c.height+40);for(const b of blocks){if(player.x<b.x+b.w&&player.x+player.w>b.x&&player.y<b.y+b.h&&player.y+player.h>b.y){live=false;document.getElementById("state").textContent="Game over";break}}score+=dt/1000;document.getElementById("score").textContent=Math.floor(score);ctx.clearRect(0,0,c.width,c.height);ctx.strokeStyle="#ffffff0b";for(let x=0;x<c.width;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,c.height);ctx.stroke()}ctx.fillStyle="#a78bfa";ctx.shadowColor="#8b5cf6";ctx.shadowBlur=15;ctx.fillRect(player.x,player.y,player.w,player.h);ctx.shadowBlur=0;ctx.fillStyle="#fb7185";blocks.forEach(b=>ctx.fillRect(b.x,b.y,b.w,b.h));if(live)requestAnimationFrame(loop)}document.getElementById("start").addEventListener("click",start);`},
 zombie:{name:"Dead Town — Zombie Survival",html:`<header id="hud"><b>DEAD TOWN <small> SURVIVAL TEST</small></b><div><span>HEALTH <strong id="hp">100</strong></span><span>AMMO <strong id="ammo">24</strong></span><span>KILLS <strong id="kills">0</strong></span><span>SUPPLIES <strong id="supplies">0</strong></span><span>WEAPON <strong id="weaponName">PISTOL</strong></span></div></header><p id="help">WASD move · Mouse aim · Click shoot · 1–5 switch weapons · E scavenge · R reload</p><div id="lootPrompt"></div><div id="status">Choose a room to begin</div><div id="onlineMenu"><b>DEAD TOWN ONLINE</b><p>Join a shared room with friends. PvP is enabled.</p><input id="roomCode" maxlength="12" value="TOWN01" aria-label="Room code"><button id="joinRoom">JOIN ROOM</button><small id="netStatus">Not connected</small></div><canvas id="world"></canvas>`,css:`*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#171d1b;color:#fff;font:13px system-ui}#world{width:100%;height:100%;display:block;touch-action:none}#hud{position:fixed;z-index:2;top:14px;left:14px;right:14px;display:flex;justify-content:space-between;align-items:flex-start;text-shadow:0 2px 8px #000}#hud b{font-size:18px;letter-spacing:2px}#hud small{display:block;color:#aab7af;font-size:9px}#hud div{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;max-width:68%}#hud span{background:#07100edb;border:1px solid #ffffff25;border-radius:8px;padding:8px 11px;color:#aebbb4;font-size:9px}#hud strong{display:block;color:#fff;font-size:18px}#help,#status{position:fixed;z-index:2;background:#07100edb;border:1px solid #ffffff25;border-radius:8px;padding:9px 12px}#help{bottom:14px;left:14px;color:#c3cec8}#lootPrompt{position:fixed;z-index:3;bottom:58px;left:50%;transform:translateX(-50%);padding:9px 13px;border:1px solid #d5e6ad55;border-radius:8px;background:#101a16eF;color:#e5efcf;display:none;white-space:nowrap}#status{top:85px;left:50%;transform:translateX(-50%);white-space:nowrap}#onlineMenu{position:fixed;z-index:5;inset:0;margin:auto;width:min(360px,calc(100% - 32px));height:max-content;padding:22px;border:1px solid #c1d7a855;border-radius:14px;background:#101a16f2;box-shadow:0 20px 70px #000b;display:grid;gap:10px}#onlineMenu p,#onlineMenu small{margin:0;color:#b8c5ba;font-size:12px}#onlineMenu input,#onlineMenu button{font:inherit;padding:11px;border-radius:7px;border:1px solid #ffffff33;background:#0a100d;color:#fff}#onlineMenu button{background:#b4d47e;color:#142015;font-weight:900;cursor:pointer}`,js:`(async()=>{const status=document.getElementById("status");try{const T=await import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js");const {GLTFLoader}=await import("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js");const scene=new T.Scene();scene.background=new T.Color(0x89938b);scene.fog=new T.Fog(0x89938b,35,100);const camera=new T.PerspectiveCamera(48,innerWidth/innerHeight,.1,180),renderer=new T.WebGLRenderer({canvas:document.getElementById("world"),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;scene.add(new T.HemisphereLight(0xdce6dd,0x34352e,2));const sun=new T.DirectionalLight(0xffe4c4,2);sun.position.set(-20,30,12);sun.castShadow=true;scene.add(sun);const floor=new T.Mesh(new T.PlaneGeometry(160,160),new T.MeshStandardMaterial({color:0x465047}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);const road=new T.Mesh(new T.PlaneGeometry(110,10),new T.MeshStandardMaterial({color:0x282e2e}));road.rotation.x=-Math.PI/2;road.position.y=.03;scene.add(road);for(const rx of [-28,28]){const cross=new T.Mesh(new T.PlaneGeometry(9,110),new T.MeshStandardMaterial({color:0x282e2e}));cross.rotation.x=-Math.PI/2;cross.position.set(rx,.035,0);scene.add(cross);for(let z=-48;z<52;z+=8){const mark=new T.Mesh(new T.PlaneGeometry(.13,3),new T.MeshBasicMaterial({color:0xbeb69b}));mark.rotation.x=-Math.PI/2;mark.position.set(rx,.055,z);scene.add(mark)}}for(const sx of [-33,-23,23,33]){const walk=new T.Mesh(new T.PlaneGeometry(2,110),new T.MeshStandardMaterial({color:0x77786d}));walk.rotation.x=-Math.PI/2;walk.position.set(sx,.045,0);scene.add(walk)}for(let x=-48;x<52;x+=8){const dash=new T.Mesh(new T.PlaneGeometry(3,.13),new T.MeshBasicMaterial({color:0xbeb69b}));dash.rotation.x=-Math.PI/2;dash.position.set(x,.05,0);scene.add(dash)}const mats=[0x77766b,0x655f56,0x69736b].map(c=>new T.MeshStandardMaterial({color:c})),solidBuildings=[];const windowMat=new T.MeshStandardMaterial({color:0x263d42,emissive:0x152a2d,emissiveIntensity:.35,roughness:.25}),doorMat=new T.MeshStandardMaterial({color:0x302b25,roughness:.9});for(let x=-42;x<=42;x+=14)for(let z=-42;z<=42;z+=14){if(Math.abs(z)<5||Math.abs(Math.abs(x)-28)<7)continue;const w=7+Math.random()*3,d=7+Math.random()*3,h=4+Math.random()*7;const b=new T.Mesh(new T.BoxGeometry(w,h,d),mats[Math.floor(Math.random()*mats.length)]);b.position.set(x,h/2,z);b.castShadow=true;b.receiveShadow=true;scene.add(b);solidBuildings.push({x,z,w,d});for(const wx of [-w*.25,w*.25])for(const wy of [Math.min(2.2,h*.38),Math.min(3.7,h*.72)]){const win=new T.Mesh(new T.BoxGeometry(1,.85,.12),windowMat);win.position.set(wx,wy,-d/2-.07);b.add(win)}const door=new T.Mesh(new T.BoxGeometry(1.1,1.9,.14),doorMat);door.position.set(0,.96,-d/2-.08);b.add(door);const roof=new T.Mesh(new T.BoxGeometry(w+.25,.25,d+.25),new T.MeshStandardMaterial({color:0x454943}));roof.position.y=h/2+.1;b.add(roof)}const loader=new GLTFLoader(),assets=Array.isArray(window.DougHubAssets)?window.DougHubAssets:[];async function model(re){const a=assets.find(x=>re.test(x.name||"")&&/\\.(glb|gltf)$/i.test(x.name||""));if(!a)return null;try{return await loader.loadAsync(a.url)}catch(e){console.warn("Asset load failed",a.name,e);return null}}const assetCache=new Map();async function assetModel(re){const a=assets.find(x=>re.test(x.name||"")&&/\\.(glb|gltf)$/i.test(x.name||""));if(!a)return null;if(assetCache.has(a.url))return assetCache.get(a.url);try{const loaded=await loader.loadAsync(a.url);assetCache.set(a.url,loaded);return loaded}catch(e){console.warn("Environment asset load failed",a.name,e);return null}}function addProp(g,x,z,scale=1,rot=Math.random()*Math.PI*2){const m=g.clone(true);m.position.set(x,0,z);m.rotation.y=rot;m.scale.setScalar(scale);m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});scene.add(m);return m}async function buildTownProps(){const specs=[[/StreetLights/i,[[ -32,-8],[-8,-8],[16,-8],[40,-8],[-32,8],[16,8]],1],[/TrafficLight_[12]/i,[[-8,-7],[8,7]],1],[/Container_(Green|Red)/i,[[-25,14],[27,-16]],1],[/Barrel/i,[[-17,5],[-19,7],[20,-4]],.9],[/Pallet(_Broken)?/i,[[13,12],[-30,-14]],1],[/TrashBag_[12]/i,[[-11,12],[23,10],[-35,3]],1],[/FireHydrant/i,[[4,-6],[-38,-6]],1],[/Vehicle_Pickup(_Armored)?/i,[[-22,-2]],1],[/Vehicle_Truck(_Armored)?/i,[[31,2]],1],[/Vehicle_Sports(_Armored)?/i,[[-4,23],[38,-24]],1]];for(const [re,spots,scale] of specs){const asset=await assetModel(re);if(!asset)continue;spots.forEach(([x,z],i)=>addProp(asset.scene,x,z,scale,(i%2?1:-1)*Math.PI/2))}const tower=await assetModel(/WaterTower/i);if(tower)addProp(tower.scene,48,43,1,0)}const human=await model(/Characters_(Shaun|Matt|Sam|Lis)/i),infected=await model(/Zombie_(Basic|Chubby|Arm)/i);function fallback(color){const g=new T.Group(),m=new T.Mesh(new T.CapsuleGeometry(.45,.8,4,8),new T.MeshStandardMaterial({color}));m.position.y=1;m.castShadow=true;g.add(m);return g}await buildTownProps();const player=new T.Group();scene.add(player);const weaponProfiles={pistol:{label:"PISTOL",clip:12,reload:900},rifle:{label:"RIFLE",clip:30,reload:1250},shotgun:{label:"SHOTGUN",clip:6,reload:1450},smg:{label:"SMG",clip:30,reload:1050},axe:{label:"AXE",clip:Infinity,reload:0}};let activeWeapon="pistol";const weaponHolder=new T.Group();weaponHolder.position.set(.42,1,.25);player.add(weaponHolder);async function equipWeapon(kind){activeWeapon=weaponProfiles[kind]?kind:"pistol";weaponHolder.clear();const loaded=await assetModel(new RegExp(activeWeapon,"i"));if(loaded){const mesh=loaded.scene.clone(true);mesh.scale.setScalar(activeWeapon==="axe"?.32:.22);mesh.rotation.y=Math.PI;weaponHolder.add(mesh)}else{const metal=new T.MeshStandardMaterial({color:activeWeapon==="axe"?0x9ca3af:0x303a3d,metalness:.55,roughness:.4});const body=new T.Mesh(new T.BoxGeometry(activeWeapon==="shotgun"?.16:.1,.13,activeWeapon==="axe"?.18:.48),metal);weaponHolder.add(body);if(activeWeapon==="axe"){const blade=new T.Mesh(new T.BoxGeometry(.42,.3,.08),metal);blade.position.set(.1,.1,0);weaponHolder.add(blade)}}document.getElementById("weaponName").textContent=weaponProfiles[activeWeapon].label;document.getElementById("ammo").textContent=activeWeapon==="axe"?"∞":ammo}let pm=null;if(human){player.add(human.scene);human.scene.scale.setScalar(.85);if(human.animations.length){pm=new T.AnimationMixer(human.scene);const idle=human.animations.find(a=>/idle/i.test(a.name));if(idle)pm.clipAction(idle).play()}}else player.add(fallback(0x438db5));const zombies=[];function spawn(x,z){const g=new T.Group();let mixer=null;if(infected){const m=infected.scene.clone(true);m.scale.setScalar(.8);g.add(m);if(infected.animations.length){mixer=new T.AnimationMixer(m);const run=infected.animations.find(a=>/run/i.test(a.name))||infected.animations.find(a=>/idle/i.test(a.name));if(run)mixer.clipAction(run).play()}}else g.add(fallback(0x75845d));g.position.set(x,0,z);scene.add(g);zombies.push({g,hp:3,mixer,hit:0})}for(let i=0;i<12;i++)spawn((Math.random()-.5)*65,(Math.random()-.5)*65);let health=100,ammo=12,kills=0,supplies=0,yaw=0,reload=false,localDowned=0;const pickups=[];function spawnPickup(x,z,type="ammo",id=crypto.randomUUID()){const g=new T.Group(),color=type==="med" ? 0x5ee0a0 : 0xe6c86d;const box=new T.Mesh(new T.BoxGeometry(.65,.5,.65),new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.16}));box.position.y=.35;box.castShadow=true;g.add(box);const ring=new T.Mesh(new T.TorusGeometry(.55,.045,6,20),new T.MeshBasicMaterial({color}));ring.rotation.x=Math.PI/2;ring.position.y=.08;g.add(ring);g.position.set(x,0,z);scene.add(g);pickups.push({g,type,id})}for(let i=0;i<16;i++)spawnPickup((Math.random()-.5)*76,(Math.random()-.5)*76,i%5===0?"med":"ammo");await equipWeapon("pistol");function tryScavenge(){let nearest=null,dist=2.6;for(const p of pickups){const d=p.g.position.distanceTo(player.position);if(d<dist){dist=d;nearest=p}}if(!nearest)return;if(online&&roomChannel){if(hostId===playerId)hostCollect({id:playerId,pickupId:nearest.id});else sendEvent("collect",{id:playerId,pickupId:nearest.id});return}scene.remove(nearest.g);pickups.splice(pickups.indexOf(nearest),1);supplies++;if(nearest.type==="med")health=Math.min(100,health+25);else ammo=Math.min(60,ammo+12);localHealth=health;document.getElementById("supplies").textContent=supplies;document.getElementById("hp").textContent=health;document.getElementById("ammo").textContent=ammo;status.textContent=nearest.type==="med"?"Medical supplies collected":"Ammunition collected"}const playerId=crypto.randomUUID(),remotePlayers=new Map(),playerStates=new Map(),shotCooldowns=new Map();let roomChannel=null,hostId=playerId,online=false,lastNetwork=0,lastWorld=0,worldRevision=0,roomCode="",localAmmo=24,localHealth=100;const {createClient}=await import("https://esm.sh/@supabase/supabase-js@2");const db=createClient("https://agsqdqcsmsppcdqxlppj.supabase.co","sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52");function remoteMesh(id){let item=remotePlayers.get(id);if(item)return item;const mesh=human?human.scene.clone(true):fallback(0xd2b77c);mesh.scale.setScalar(human ? 0.85 : 1);scene.add(mesh);item={mesh,health:100};remotePlayers.set(id,item);return item}function updateLocalHud(){health=localHealth;document.getElementById("hp").textContent=health;document.getElementById("ammo").textContent=ammo}function sendEvent(event,payload){if(roomChannel&&online)roomChannel.send({type:"broadcast",event,payload})}function applyWorld(payload){if(!payload||!Array.isArray(payload.zombies)||!Array.isArray(payload.pickups))return;while(zombies.length<payload.zombies.length)spawn(payload.zombies[zombies.length]?.x||0,payload.zombies[zombies.length]?.z||0);while(zombies.length>payload.zombies.length){const dead=zombies.pop();scene.remove(dead.g)}payload.zombies.forEach((p,i)=>{const z=zombies[i];z.g.position.lerp(new T.Vector3(p.x,0,p.z),.72);z.hp=p.hp;z.g.rotation.y=p.rot||0});const incoming=new Set(payload.pickups.map(p=>p.id));for(const p of [...pickups])if(!incoming.has(p.id)){scene.remove(p.g);pickups.splice(pickups.indexOf(p),1)}for(const p of payload.pickups)if(!pickups.some(x=>x.id===p.id))spawnPickup(p.x,p.z,p.type,p.id);for(const [id,state] of Object.entries(payload.players||{})){if(id===playerId){const wasDown=localHealth<=0;localHealth=state.health;health=localHealth;if(wasDown&&localHealth>0&&Number.isFinite(state.x))player.position.set(state.x,0,state.z||0);document.getElementById("hp").textContent=health;ammo=state.ammo??ammo;document.getElementById("ammo").textContent=ammo}else{const item=remotePlayers.get(id);if(item){item.health=state.health;if(Number.isFinite(state.x))item.mesh.position.set(state.x,0,state.z||0)}}}if(payload.kills!=null){kills=payload.kills;document.getElementById("kills").textContent=kills}worldRevision=payload.revision||worldRevision}function hostBroadcastWorld(){if(hostId!==playerId||!roomChannel)return;const ps={};for(const [id,p] of playerStates)ps[id]={health:p.health??100,ammo:p.ammo??24,x:p.x,z:p.z,yaw:p.yaw};ps[playerId]={health:localHealth,ammo,x:player.position.x,z:player.position.z,yaw};sendEvent("world",{revision:++worldRevision,zombies:zombies.map(z=>({x:z.g.position.x,z:z.g.position.z,hp:z.hp,rot:z.g.rotation.y})),pickups:pickups.map(p=>({id:p.id,x:p.g.position.x,z:p.g.position.z,type:p.type})),players:Object.fromEntries([...playerStates].map(([id,p])=>[id,{health:p.health??100,ammo:p.ammo??24,x:p.x,z:p.z,yaw:p.yaw}])),kills})}function hostHandleShot(p){if(hostId!==playerId||!p||!playerStates.has(p.id))return;const shooter=playerStates.get(p.id),now=performance.now(),last=shotCooldowns.get(p.id)||0,weapon=p.weapon||"pistol",cfg={pistol:[.32,28,1,1],rifle:[.12,42,1,2],shotgun:[.75,13,5,1],smg:[.09,23,1,1],axe:[.55,2.4,1,3]}[weapon]||[.32,28,1,1];if(now-last<cfg[0]*1000)return;if(weapon!=="axe"){if((shooter.ammo??0)<=0)return;if(p.id!==playerId)shooter.ammo--;playerStates.set(p.id,shooter)}shotCooldowns.set(p.id,now);let hits=0;for(const z of zombies){const dx=z.g.position.x-shooter.x,dz=z.g.position.z-shooter.z,d=Math.hypot(dx,dz),a=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(a-p.yaw),Math.cos(a-p.yaw));if(d<=cfg[1]&&Math.abs(delta)<(weapon==="shotgun"?.32:.17)){z.hp-=cfg[3];hits++;if(z.hp<=0){spawnPickup(z.g.position.x,z.g.position.z,Math.random()<.2?"med":"ammo");scene.remove(z.g);zombies.splice(zombies.indexOf(z),1);kills++;setTimeout(()=>{if(hostId===playerId){spawn((Math.random()-.5)*70,(Math.random()-.5)*70);hostBroadcastWorld()}},4500)}}}if(hits)status.textContent="Hit confirmed";const others=[...playerStates.entries()].filter(([id])=>id!==p.id);for(const [id,target] of others){const dx=target.x-shooter.x,dz=target.z-shooter.z,along=dx*p.dx+dz*p.dz,side=Math.abs(dx*p.dz-dz*p.dx);if(along>0&&along<cfg[1]&&side<.85){target.health=Math.max(0,(target.health??100)-12);if(id===playerId){localHealth=target.health;health=localHealth;document.getElementById("hp").textContent=localHealth}playerStates.set(id,target)}}hostBroadcastWorld()}function hostCollect(p){if(hostId!==playerId||!p||!playerStates.has(p.id))return;const who=playerStates.get(p.id);const item=pickups.find(x=>x.id===p.pickupId);if(!item||Math.hypot(item.g.position.x-who.x,item.g.position.z-who.z)>2.8)return;scene.remove(item.g);pickups.splice(pickups.indexOf(item),1);if(p.id===playerId){if(item.type==="med")localHealth=Math.min(100,localHealth+25);else ammo=Math.min(60,ammo+12);health=localHealth;document.getElementById("hp").textContent=localHealth;document.getElementById("ammo").textContent=ammo}else{const state=playerStates.get(p.id);state.health=item.type==="med"?Math.min(100,(state.health??100)+25):(state.health??100);state.ammo=item.type==="ammo"?Math.min(60,(state.ammo??24)+12):(state.ammo??24);playerStates.set(p.id,state)}supplies++;document.getElementById("supplies").textContent=supplies;hostBroadcastWorld()}function updateHostSimulation(dt){if(hostId!==playerId)return;for(const z of zombies){let target=localHealth>0?{x:player.position.x,z:player.position.z,id:playerId}:null,best=target?Math.hypot(target.x-z.g.position.x,target.z-z.g.position.z):Infinity;for(const [id,p] of playerStates){if(id===playerId||(p.health??100)<=0)continue;const d=Math.hypot(p.x-z.g.position.x,p.z-z.g.position.z);if(d<best){best=d;target={...p,id}}}if(!target)continue;const dx=target.x-z.g.position.x,dz=target.z-z.g.position.z,d=Math.hypot(dx,dz);if(d>1.6){z.g.position.x+=dx/d*dt*1.55;z.g.position.z+=dz/d*dt*1.55;z.g.rotation.y=Math.atan2(dx,dz)}else if(target.id===playerId){z.hit+=dt;if(z.hit>1.1){localHealth=Math.max(0,localHealth-5);health=localHealth;document.getElementById("hp").textContent=localHealth;z.hit=0}}else{const p=playerStates.get(target.id);p.hit=(p.hit||0)+dt;if(p.hit>1.1){p.health=Math.max(0,(p.health??100)-5);p.hit=0;playerStates.set(target.id,p)}}}if(localHealth<=0){localDowned+=dt;if(localDowned>5){localHealth=100;health=100;player.position.set(0,0,0);playerStates.set(playerId,{x:0,z:0,yaw,health:100,ammo});localDowned=0;status.textContent="You are back in the fight"}}else localDowned=0;for(const [id,p] of playerStates){if(id===playerId||(p.health??100)>0)continue;p.downed=(p.downed||0)+dt;if(p.downed>5){p.health=100;p.x=(Math.random()-.5)*12;p.z=(Math.random()-.5)*12;p.downed=0;playerStates.set(id,p)}}}async function joinRoom(){const code=document.getElementById("roomCode").value.trim().toUpperCase();if(!/^[A-Z0-9_-]{3,12}$/.test(code)){status.textContent="Use 3–12 letters or numbers for the room code";return}const button=document.getElementById("joinRoom");button.disabled=true;status.textContent="Connecting…";roomCode=code;for(const p of [...pickups]){scene.remove(p.g);pickups.splice(pickups.indexOf(p),1)}try{roomChannel=db.channel("dead-town-"+code,{config:{presence:{key:playerId},broadcast:{self:false}}});roomChannel.on("presence",{event:"sync"},()=>{const state=roomChannel.presenceState(),ids=Object.keys(state).sort();hostId=ids[0]||playerId;const seen=new Set();for(const [id,entries] of Object.entries(state)){const v=entries?.[0];if(id===playerId||!v)continue;seen.add(id);const item=remoteMesh(id);item.mesh.position.lerp(new T.Vector3(v.x||0,0,v.z||0),.6);item.mesh.rotation.y=v.rot||0;playerStates.set(id,{x:v.x||0,z:v.z||0,yaw:v.yaw||0,health:v.health??100,ammo:v.ammo??24})}for(const [id,item] of remotePlayers)if(!seen.has(id)){scene.remove(item.mesh);remotePlayers.delete(id);playerStates.delete(id)}document.getElementById("netStatus").textContent=Object.keys(state).length+" player(s) online";if(hostId===playerId&&!pickups.length){for(let i=0;i<16;i++)spawnPickup((Math.random()-.5)*76,(Math.random()-.5)*76,i%5===0?"med":"ammo")}});roomChannel.on("broadcast",{event:"player"},({payload})=>{if(!payload||payload.id===playerId)return;const item=remoteMesh(payload.id);item.mesh.position.lerp(new T.Vector3(payload.x,0,payload.z),.65);item.mesh.rotation.y=payload.rot||0;const previous=playerStates.get(payload.id)||{};playerStates.set(payload.id,{...previous,x:payload.x,z:payload.z,yaw:payload.yaw,health:previous.health??payload.health??100,ammo:previous.ammo??payload.ammo??12})});roomChannel.on("broadcast",{event:"shot"},({payload})=>{if(payload?.id!==playerId)hostHandleShot(payload)});roomChannel.on("broadcast",{event:"collect"},({payload})=>{if(payload?.id!==playerId)hostCollect(payload)});roomChannel.on("broadcast",{event:"world"},({payload})=>{if(hostId!==playerId)applyWorld(payload)});await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error("Connection timed out")),10000);roomChannel.subscribe(async state=>{if(state==="SUBSCRIBED"){try{await roomChannel.track({id:playerId,x:player.position.x,z:player.position.z,rot:yaw,yaw,health:localHealth,ammo});clearTimeout(timeout);resolve()}catch(e){clearTimeout(timeout);reject(e)}}else if(state==="CHANNEL_ERROR"||state==="TIMED_OUT"){clearTimeout(timeout);reject(Error("Room connection failed: "+state))}})});const count=Object.keys(roomChannel.presenceState()).length;if(count>8)throw Error("Room is full (8 players maximum)");online=true;playerStates.set(playerId,{x:player.position.x,z:player.position.z,yaw,health:localHealth,ammo});document.getElementById("onlineMenu").style.display="none";document.getElementById("netStatus").textContent="Connected to "+code;status.textContent="Online · PvP enabled · "+code;if(hostId===playerId){for(let i=0;i<16;i++)if(!pickups[i])spawnPickup((Math.random()-.5)*76,(Math.random()-.5)*76,i%5===0?"med":"ammo");hostBroadcastWorld()}}catch(e){status.textContent=e.message;button.disabled=false;if(roomChannel){await db.removeChannel(roomChannel);roomChannel=null}}}document.getElementById("joinRoom").addEventListener("click",joinRoom);addEventListener("pagehide",()=>{if(roomChannel)db.removeChannel(roomChannel)});const keys={};addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==="e")tryScavenge();if(["1","2","3","4","5"].includes(e.key)){const choices=["pistol","rifle","shotgun","smg","axe"];equipWeapon(choices[Number(e.key)-1])}if(e.key.toLowerCase()==="r"&&activeWeapon!=="axe"&&ammo<weaponProfiles[activeWeapon].clip&&!reload){reload=true;status.textContent="Reloading "+weaponProfiles[activeWeapon].label;setTimeout(()=>{ammo=weaponProfiles[activeWeapon].clip;reload=false;document.getElementById("ammo").textContent=ammo;status.textContent="Stay alert"},weaponProfiles[activeWeapon].reload)}});addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);const canvas=document.getElementById("world");canvas.addEventListener("pointermove",e=>{yaw=Math.atan2(e.clientX-innerWidth/2,e.clientY-innerHeight/2)});function shoot(){if((activeWeapon!=="axe"&&!ammo)||reload)return;if(activeWeapon!=="axe")ammo--;document.getElementById("ammo").textContent=activeWeapon==="axe"?"∞":ammo;const shot={id:playerId,x:player.position.x,z:player.position.z,dx:Math.sin(yaw),dz:Math.cos(yaw),yaw,weapon:activeWeapon};if(online&&roomChannel){if(hostId===playerId){const own=playerStates.get(playerId)||{};playerStates.set(playerId,{...own,x:player.position.x,z:player.position.z,yaw,health:localHealth,ammo});hostHandleShot(shot)}else sendEvent("shot",shot)}else{const profile={pistol:[28,1,.17],rifle:[42,2,.11],shotgun:[13,1,.34],smg:[23,1,.2],axe:[2.4,3,.7]}[activeWeapon]||[28,1,.17];let target=null,range=profile[0];for(const z of zombies){const dx=z.g.position.x-player.position.x,dz=z.g.position.z-player.position.z,d=Math.hypot(dx,dz),a=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(a-yaw),Math.cos(a-yaw));if(d<range&&Math.abs(delta)<profile[2]){range=d;target=z}}if(target){target.hp-=profile[1];if(target.hp<=0){spawnPickup(target.g.position.x,target.g.position.z,Math.random()<.18?"med":"ammo");scene.remove(target.g);zombies.splice(zombies.indexOf(target),1);kills++;document.getElementById("kills").textContent=kills;spawn((Math.random()-.5)*70,(Math.random()-.5)*70)}}}}canvas.addEventListener("pointerdown",e=>{if(e.button===0)shoot()});let last=performance.now();function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;let dx=(keys.d?1:0)-(keys.a?1:0),dz=(keys.s?1:0)-(keys.w?1:0),len=Math.hypot(dx,dz)||1;if(localHealth>0){const nextX=T.MathUtils.clamp(player.position.x+dx/len*dt*5,-55,55),nextZ=T.MathUtils.clamp(player.position.z+dz/len*dt*5,-55,55),blocked=solidBuildings.some(b=>Math.abs(nextX-b.x)<b.w/2+.65&&Math.abs(nextZ-b.z)<b.d/2+.65);if(!blocked){player.position.x=nextX;player.position.z=nextZ}}player.rotation.y=yaw;if(online&&roomChannel&&now-lastNetwork>100){lastNetwork=now;const state={id:playerId,x:player.position.x,z:player.position.z,rot:yaw,yaw,health:localHealth,ammo};sendEvent("player",state);if(hostId===playerId)playerStates.set(playerId,{...state})}if(online&&hostId===playerId){updateHostSimulation(dt);if(now-lastWorld>120){lastWorld=now;hostBroadcastWorld()}}const lootPrompt=document.getElementById("lootPrompt");let nearbyLoot=false;for(const p of pickups){p.g.rotation.y+=dt*.7;const d=p.g.position.distanceTo(player.position);if(d<2.6)nearbyLoot=true}lootPrompt.style.display=nearbyLoot?"block":"none";lootPrompt.textContent=nearbyLoot?"Press E to scavenge":" ";const dest=new T.Vector3(player.position.x+Math.sin(yaw)*11,13,player.position.z+Math.cos(yaw)*11);camera.position.lerp(dest,.12);camera.lookAt(player.position.x,0,player.position.z);for(const z of zombies){if(!online){const zx=player.position.x-z.g.position.x,zz=player.position.z-z.g.position.z,zd=Math.hypot(zx,zz);if(zd>1.6){z.g.position.x+=zx/zd*dt*1.55;z.g.position.z+=zz/zd*dt*1.55;z.g.rotation.y=Math.atan2(zx,zz)}else{z.hit+=dt;if(z.hit>1.1){health=Math.max(0,health-5);localHealth=health;z.hit=0;document.getElementById("hp").textContent=health;if(!health)status.textContent="Overrun! You will return in five seconds"}}}z.mixer?.update(dt)}if(online&&hostId===playerId){if(localHealth<=0)status.textContent="Overrun! Waiting for help or restart";if(now-lastWorld>120){lastWorld=now;hostBroadcastWorld()}}if(!online&&localHealth<=0){localDowned+=dt;if(localDowned>5){health=100;localHealth=100;player.position.set(0,0,0);localDowned=0;status.textContent="You are back in the fight"}}pm?.update(dt);renderer.render(scene,camera);requestAnimationFrame(frame)}addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});status.textContent=(human?"Survivor model loaded":"Placeholder survivor")+" · "+(infected?"Zombie model loaded":"Placeholder zombies");requestAnimationFrame(frame)}catch(e){console.error(e);status.textContent="3D engine could not load. Check preview connection."}})();`},
 quiz:{name:"Quiz Challenge",html:`<main class="quiz"><p class="eyebrow">BRAIN BOOST</p><h1>Quick Quiz</h1><div class="progress"><span id="progress"></span></div><p id="counter">Question 1 of 5</p><h2 id="question"></h2><div id="answers" class="answers"></div><p id="feedback" aria-live="polite"></p><button id="next" hidden>Next question →</button></main>`,css:`*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at top,#29245f,#080a19 70%);font:15px system-ui;color:#f8f7ff}.quiz{width:min(520px,calc(100% - 26px));padding:28px;border:1px solid #a5b4fc40;border-radius:22px;background:#11152d}.eyebrow{color:#a5b4fc;letter-spacing:3px;font-weight:900;font-size:10px}h1{margin:8px 0 20px;font-size:34px}.progress{height:5px;background:#292d48;border-radius:8px;overflow:hidden}.progress span{display:block;height:100%;width:20%;background:linear-gradient(90deg,#6366f1,#c084fc);transition:width .2s}#counter{font-size:11px;color:#aab0cd}h2{font-size:20px;line-height:1.45}.answers{display:grid;gap:9px}.answers button, #next{padding:13px;border:1px solid #a5b4fc35;border-radius:11px;background:#0b0e20;color:#fff;text-align:left;cursor:pointer}.answers button:hover{border-color:#a78bfa}.answers button.correct{background:#14532d}.answers button.wrong{background:#7f1d1d}#next{margin-top:14px;background:linear-gradient(135deg,#6366f1,#a855f7);font-weight:800}#feedback{min-height:20px;color:#c4b5fd;font-size:12px}`,js:`const questions=[{q:"Which language styles web pages?",a:["HTML","CSS","SQL","Python"],c:1},{q:"What does JS stand for?",a:["Java Source","Just Software","JavaScript","Jumbo Script"],c:2},{q:"Which one is a loop?",a:["for","color","title","border"],c:0},{q:"What does HTML structure?",a:["Web page content","Database passwords","Wi-Fi","Images only"],c:0},{q:"Which is a boolean value?",a:["maybe","true","ten","hello"],c:1}];let index=0,score=0,locked=false;const $=id=>document.getElementById(id);function draw(){locked=false;$("counter").textContent="Question "+(index+1)+" of "+questions.length;$("progress").style.width=((index+1)/questions.length*100)+"%";$("question").textContent=questions[index].q;$("answers").replaceChildren();$("feedback").textContent="";$("next").hidden=true;questions[index].a.forEach((answer,i)=>{const b=document.createElement("button");b.textContent=answer;b.addEventListener("click",()=>{if(locked)return;locked=true;const ok=i===questions[index].c;if(ok)score++;b.classList.add(ok?"correct":"wrong");[...$("answers").children].forEach((el,n)=>{el.disabled=true;if(n===questions[index].c)el.classList.add("correct")});$("feedback").textContent=ok?"Correct!":"Not quite — the answer is "+questions[index].a[questions[index].c]+".";$("next").hidden=false;$("next").textContent=index===questions.length-1?"See results →":"Next question →"});$("answers").appendChild(b)})} $("next").addEventListener("click",()=>{if(!locked)return;if(index<questions.length-1){index++;draw()}else{$("question").textContent="You scored "+score+" / "+questions.length+"!";$("answers").replaceChildren();$("feedback").textContent=score===5?"Perfect score!":"Play again to improve your score.";$("next").textContent="Play again";$("next").hidden=false;$("next").onclick=()=>{index=0;score=0;$("next").onclick=null;draw()}}});draw();`},
 landing:{name:"Cool Web Page",html:`<main class="hero"><nav><b>YOUR BRAND</b><span>Home　 About　 Projects</span></nav><section><p class="eyebrow">YOUR NEXT BIG IDEA</p><h1>Build something<br><em>brilliant.</em></h1><p>A clean, modern page for your next project, game, or community.</p><button id="action">Explore the idea ↗</button><p id="message"></p></section><div class="orb"><span>✦</span></div></main>`,css:`*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 75% 20%,#3730a355,transparent 45%),#080a19;color:#f8f7ff;font:15px system-ui}.hero{max-width:850px;margin:auto;padding:28px;min-height:100vh;display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden}nav{display:flex;justify-content:space-between;gap:12px;color:#a5b4fc;font-size:12px}section{position:relative;z-index:1;margin:auto 0;width:min(540px,100%)}.eyebrow{color:#a5b4fc;letter-spacing:3px;font-size:10px;font-weight:900}h1{font-size:clamp(42px,8vw,76px);line-height:1;letter-spacing:-3px}em{font-style:normal;color:#c4b5fd}section p:not(.eyebrow){max-width:390px;color:#a8afce;line-height:1.8}button{padding:14px 18px;border:0;border-radius:11px;background:linear-gradient(135deg,#6366f1,#a855f7);color:white;font-weight:800;cursor:pointer}.orb{position:absolute;right:4%;top:28%;width:230px;height:230px;display:grid;place-items:center;border:1px solid #a5b4fc50;border-radius:50%;background:radial-gradient(circle,#a855f733,#6366f10b 65%);box-shadow:0 0 90px #6366f133}.orb span{font-size:70px;color:#c4b5fd}@media(max-width:650px){nav span{display:none}.orb{width:100px;height:100px;right:8%;top:20%}.orb span{font-size:35px}section{margin-top:90px}}`,js:`document.getElementById("action").addEventListener("click",()=>{document.getElementById("message").textContent="Nice — now make this page yours!";});`},
 blank:{name:"My Fast Project",html:STARTERS.html,css:STARTERS.css,js:STARTERS.js}
};
function loadFastTemplate(key){const t=FAST_TEMPLATES[key];if(!t)return;files={...STARTERS,html:t.html,css:t.css,js:t.js};activeFile="html";$("projectName").value=t.name;blocks=[];renderFile();renderLibrary();renderBlocks();updateGenerated();persist();setMode("fast");runPreview();$("fastPreviewStatus").textContent=t.name+" is ready to play";setStatus("Loaded "+t.name)}
function renderFastStatus(){const s=$("fastPreviewStatus");if(s&&!s.textContent.trim())s.textContent="Choose a template to begin"}
document.querySelectorAll("[data-fast-template]").forEach(b=>b.addEventListener("click",()=>loadFastTemplate(b.dataset.fastTemplate)));
document.querySelectorAll("[data-go-mode]").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.goMode)));
$("fastRunBtn")?.addEventListener("click",()=>{runPreview();$("fastPreviewStatus").textContent="Preview refreshed at "+new Date().toLocaleTimeString()});
function openFastChat(){const drawer=$("fastChatDrawer"),backdrop=$("fastChatBackdrop");drawer?.classList.add("open");drawer?.setAttribute("aria-hidden","false");if(backdrop)backdrop.hidden=false;document.body.style.overflow="hidden";$("fastChatClose")?.focus()}
function closeFastChat(){const drawer=$("fastChatDrawer"),backdrop=$("fastChatBackdrop");drawer?.classList.remove("open");drawer?.setAttribute("aria-hidden","true");if(backdrop)backdrop.hidden=true;document.body.style.overflow=""}
$("fastChatBtn")?.addEventListener("click",openFastChat);$("fastChatClose")?.addEventListener("click",closeFastChat);$("fastChatBackdrop")?.addEventListener("click",closeFastChat);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeFastChat()});

function addBlock(type){const def=BLOCKS.find(b=>b.type===type);if(!def)return;const fields={};def.fields.forEach(([name,value])=>fields[name]=value);blocks.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random(),type,fields});renderBlocks();updateGenerated();persist();}
function renderLibrary(){const box=$("blockLibrary");box.innerHTML="";const q=$("blockSearch").value.trim().toLowerCase();const found=BLOCKS.filter(b=>(activeCategory==="all"||b.cat===activeCategory)&&(b.label+" "+b.cat+" "+b.fields.map(x=>x[0]).join(" ")).toLowerCase().includes(q));if(!found.length){box.innerHTML='<div class="block-empty">No blocks match that search.</div>';return;}found.forEach(def=>{const btn=document.createElement("button");btn.type="button";btn.className="scratch-block "+def.cat;btn.textContent=def.label;btn.draggable=true;btn.title="Click or drag this block into your script";btn.addEventListener("click",()=>addBlock(def.type));btn.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/plain",def.type);e.dataTransfer.effectAllowed="copy";});box.appendChild(btn);});}
function blockCode(block){const def=BLOCKS.find(b=>b.type===block.type);if(!def)return "// Unknown block";const fields={};def.fields.forEach(([name,value])=>fields[name]=value);Object.assign(fields,block.fields||{});try{return def.code(fields);}catch(e){return "// Could not generate this block";}}
function renderBlocks(){const box=$("blockWorkspace");box.innerHTML="";if(!blocks.length){const empty=document.createElement("div");empty.className="workspace-empty";empty.innerHTML='<span>🧩</span><b>Your script starts here</b><p>Add an event or statement block to begin.</p>';box.appendChild(empty);return;}blocks.forEach((block,index)=>{const def=BLOCKS.find(b=>b.type===block.type);if(!def)return;const row=document.createElement("div");row.className="code-block "+def.cat;row.draggable=true;row.dataset.index=String(index);const title=document.createElement("span");title.textContent=def.label;row.appendChild(title);(def.fields||[]).forEach(([name,defaultValue])=>{const input=document.createElement("input");input.value=(block.fields&&block.fields[name])??defaultValue;input.setAttribute("aria-label",name);input.title=name;input.addEventListener("input",()=>{block.fields=block.fields||{};block.fields[name]=input.value;updateGenerated();persist();});row.appendChild(input);});const remove=document.createElement("button");remove.type="button";remove.className="block-remove";remove.textContent="×";remove.title="Remove block";remove.setAttribute("aria-label","Remove "+def.label);remove.addEventListener("click",()=>{blocks.splice(index,1);renderBlocks();updateGenerated();persist();});row.appendChild(remove);row.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/plain",String(index));e.dataTransfer.setData("application/x-doughub-block","move");row.classList.add("dragging");});row.addEventListener("dragend",()=>row.classList.remove("dragging"));row.addEventListener("dragover",e=>e.preventDefault());row.addEventListener("drop",e=>{e.preventDefault();const moving=Number(e.dataTransfer.getData("text/plain"));if(e.dataTransfer.getData("application/x-doughub-block")==="move"&&Number.isInteger(moving)&&moving!==index&&moving>=0&&moving<blocks.length){const [item]=blocks.splice(moving,1);blocks.splice(index,0,item);renderBlocks();updateGenerated();persist();}});box.appendChild(row);});}
function updateGenerated(){const code=blocks.map(blockCode).join("\n\n");$("generatedCode").textContent=code||"// Add blocks to generate JavaScript.";if(blocks.length)files.js=code;persist();}

let blocklyWorkspace=null;
const BLOCKLY_XML_KEY="doughub_dougcode_blockly_xml_v1";
function initBlockly(){
  if(!window.Blockly||!$("blockWorkspace")){setStatus("Blockly couldn't load. Check your connection and refresh.",true);return;}
  const B=window.Blockly;
  const define=(type,json)=>B.Blocks[type]||(B.Blocks[type]={init(){this.jsonInit(json);}});
  define("dh_when_start",{type:"dh_when_start",message0:"when game starts",message1:"do %1",args1:[{type:"input_statement",name:"DO"}],colour:45,tooltip:"Runs once when the game preview starts."});
  define("dh_log",{type:"dh_log",message0:"print message %1",args0:[{type:"field_input",name:"MESSAGE",text:"Hello, game!"}],previousStatement:null,nextStatement:null,colour:285,tooltip:"Writes a message to the browser console."});
  define("dh_alert",{type:"dh_alert",message0:"show popup %1",args0:[{type:"field_input",name:"MESSAGE",text:"Hello!"}],previousStatement:null,nextStatement:null,colour:285});
  define("dh_set_text",{type:"dh_set_text",message0:"set text of %1 to %2",args0:[{type:"field_input",name:"SELECTOR",text:"#message"},{type:"field_input",name:"TEXT",text:"It works!"}],previousStatement:null,nextStatement:null,colour:285,tooltip:"Changes the text of an HTML element, such as #message."});
  define("dh_set_background",{type:"dh_set_background",message0:"set page background to %1",args0:[{type:"field_colour",name:"COLOUR",colour:"#172554"}],previousStatement:null,nextStatement:null,colour:160});
  define("dh_move_sprite",{type:"dh_move_sprite",message0:"move element %1 to x %2 y %3",args0:[{type:"field_input",name:"SELECTOR",text:"#player"},{type:"field_number",name:"X",value:100,min:-10000,max:10000,precision:1},{type:"field_number",name:"Y",value:100,min:-10000,max:10000,precision:1}],previousStatement:null,nextStatement:null,colour:210,tooltip:"Moves an element with the selected CSS id or selector."});
  define("dh_add_class",{type:"dh_add_class",message0:"add class %1 to element %2",args0:[{type:"field_input",name:"CLASS",text:"active"},{type:"field_input",name:"SELECTOR",text:"#player"}],previousStatement:null,nextStatement:null,colour:160});
  define("dh_wait",{type:"dh_wait",message0:"wait %1 seconds",args0:[{type:"field_number",name:"SECONDS",value:1,min:0,max:60,precision:.1}],previousStatement:null,nextStatement:null,colour:20});
  define("dh_show_hide",{type:"dh_show_hide",message0:"%1 element %2",args0:[{type:"field_dropdown",name:"ACTION",options:[["show","show"],["hide","hide"]]},{type:"field_input",name:"SELECTOR",text:"#player"}],previousStatement:null,nextStatement:null,colour:285,tooltip:"Show or hide an element using a CSS selector."});
  define("dh_set_colour",{type:"dh_set_colour",message0:"set text colour of %1 to %2",args0:[{type:"field_input",name:"SELECTOR",text:"#message"},{type:"field_colour",name:"COLOUR",colour:"#ffffff"}],previousStatement:null,nextStatement:null,colour:160});
  define("dh_set_size",{type:"dh_set_size",message0:"set size of %1 to %2 percent",args0:[{type:"field_input",name:"SELECTOR",text:"#player"},{type:"field_number",name:"SIZE",value:100,min:10,max:300,precision:5}],previousStatement:null,nextStatement:null,colour:210});
  define("dh_create_element",{type:"dh_create_element",message0:"create %1 with text %2",args0:[{type:"field_dropdown",name:"TAG",options:[["paragraph","p"],["heading","h2"],["button","button"],["div","div"]]},{type:"field_input",name:"TEXT",text:"Hello!"}],previousStatement:null,nextStatement:null,colour:160,tooltip:"Adds a new element to the page."});
  const xmlTextToDom=(xml)=>B.utils?.xml?.textToDom?B.utils.xml.textToDom(xml):B.Xml.textToDom(xml);
  const toolbox=xmlTextToDom(`<xml id="toolbox" style="display:none"><category name="Events" colour="#fbbf24"><block type="dh_when_start"/></category><category name="Looks" colour="#a855f7"><block type="dh_set_text"/><block type="dh_set_background"/><block type="dh_set_colour"/><block type="dh_show_hide"/><block type="dh_set_size"/><block type="dh_create_element"/><block type="dh_alert"/></category><category name="Sprites / Motion" colour="#3b82f6"><block type="dh_move_sprite"/><block type="dh_add_class"/></category><category name="Output" colour="#a855f7"><block type="dh_log"/><block type="dh_wait"/><block type="text_print"/></category><category name="Logic" colour="#38bdf8"><block type="controls_if"/><block type="logic_compare"/><block type="logic_operation"/><block type="logic_boolean"/><block type="logic_negate"/></category><category name="Loops / Control" colour="#f97316"><block type="controls_repeat_ext"><value name="TIMES"><shadow type="math_number"><field name="NUM">5</field></shadow></value></block><block type="controls_whileUntil"/><block type="controls_for"/></category><category name="Math" colour="#22c55e"><block type="math_number"/><block type="math_arithmetic"/><block type="math_single"/><block type="math_round"/><block type="math_modulo"/></category><category name="Text" colour="#14b8a6"><block type="text"/><block type="text_join"/><block type="text_length"/><block type="text_print"/></category><category name="Lists" colour="#0d9488"><block type="lists_create_with"/><block type="lists_length"/><block type="lists_isEmpty"/><block type="lists_getIndex"/></category><category name="Variables" colour="#fb923c" custom="VARIABLE"></category><category name="Functions" colour="#64748b" custom="PROCEDURE"></category></xml>`);
  try{
    blocklyWorkspace=B.inject("blockWorkspace",{toolbox,grid:{spacing:24,length:3,colour:"#ffffff12",snap:true},zoom:{controls:true,wheel:true,startScale:1,maxScale:1.8,minScale:.55,scaleSpeed:1.1},trashcan:true,move:{scrollbars:true,drag:true,wheel:true},sounds:false});
    const saved=localStorage.getItem(BLOCKLY_XML_KEY);
    if(saved){try{const dom=xmlTextToDom(saved);B.Xml.domToWorkspace(dom,blocklyWorkspace);}catch(e){console.warn("Couldn't restore Blockly workspace",e);}}
    else if(Array.isArray(blocks)&&blocks.length){
      // Keep older DougCode projects usable by translating supported legacy blocks.
      blocks.forEach(old=>{const map={onload:"dh_when_start",log:"dh_log",alert:"dh_alert",text:"dh_set_text",class:"dh_add_class"};const type=map[old.type];if(!type)return;try{const b=blocklyWorkspace.newBlock(type);const f=old.fields||{};if(type==="dh_log"||type==="dh_alert")b.setFieldValue(String(f.message||"Hello!"),"MESSAGE");if(type==="dh_set_text"){b.setFieldValue(String(f.selector||"#message"),"SELECTOR");b.setFieldValue(String(f.text||"It works!"),"TEXT");}if(type==="dh_add_class"){b.setFieldValue(String(f.class||"active"),"CLASS");b.setFieldValue(String(f.selector||"#myElement"),"SELECTOR");}b.initSvg();b.render();}catch(_){}});
    }
    blocklyWorkspace.addChangeListener(()=>{updateGenerated();persistBlockly();});
    $("workspaceEmpty")?.remove();
    updateGenerated();
  }catch(e){console.error("Blockly initialization failed",e);setStatus("Blockly failed to initialize. Refresh to retry.",true);}
}
function persistBlockly(){if(!blocklyWorkspace)return;try{const dom=Blockly.Xml.workspaceToDom(blocklyWorkspace);localStorage.setItem(BLOCKLY_XML_KEY,Blockly.Xml.domToText(dom));}catch(e){console.warn("Blockly save failed",e);}}
function generateBlocklyBlock(block){
  const q=v=>JSON.stringify(String(v??""));
  const chain=b=>{let out="";let cur=b;while(cur){out+=generateOne(cur);cur=cur.getNextBlock();}return out;};
  const input=(b,name)=>b.getInputTargetBlock(name);
  const value=(b,name,fallback)=>{const t=input(b,name);if(!t)return fallback;switch(t.type){case "math_number":return String(t.getFieldValue("NUM"));case "text":return q(t.getFieldValue("TEXT"));case "logic_boolean":return t.getFieldValue("BOOL")==="TRUE"?"true":"false";case "logic_compare":{const op=({"EQ":"===","NEQ":"!==","LT":"<","LTE":"<=","GT":">","GTE":">="})[t.getFieldValue("OP")]||"===";return "("+value(t,"A","0")+" "+op+" "+value(t,"B","0")+")";}case "logic_operation":return "("+value(t,"A","false")+" "+(t.getFieldValue("OP")==="OR"?"||":"&&")+" "+value(t,"B","false")+")";case "math_arithmetic":{const op=({"ADD":"+","MINUS":"-","MULTIPLY":"*","DIVIDE":"/","POWER":"**"})[t.getFieldValue("OP")]||"+";return "("+value(t,"A","0")+" "+op+" "+value(t,"B","0")+")";}case "logic_negate":return "(!"+value(t,"BOOL","false")+")";case "variables_get":return safeIdentifier(t.getField("VAR")?.getText?.()||"variable","variable");default:return "0";}};
  const statements=(b,name)=>chain(input(b,name));
  function generateOne(b){
    switch(b.type){
      case "dh_when_start":return 'document.addEventListener("DOMContentLoaded", async () => {\n'+statements(b,"DO")+"});\n";
      case "dh_log":return "console.log("+q(b.getFieldValue("MESSAGE"))+");\n";
      case "dh_alert":return "alert("+q(b.getFieldValue("MESSAGE"))+");\n";
      case "dh_set_text":return "document.querySelector("+q(b.getFieldValue("SELECTOR"))+")?.textContent = "+q(b.getFieldValue("TEXT"))+";\n";
      case "dh_set_background":return "document.body.style.backgroundColor = "+q(b.getFieldValue("COLOUR"))+";\n";
      case "dh_move_sprite":return "{ const el=document.querySelector("+q(b.getFieldValue("SELECTOR"))+"); if(el){el.style.position=el.style.position||'absolute';el.style.left="+Number(b.getFieldValue("X"))+"+'px';el.style.top="+Number(b.getFieldValue("Y"))+"+'px';} }\n";
      case "dh_add_class":return "document.querySelector("+q(b.getFieldValue("SELECTOR"))+")?.classList.add("+q(b.getFieldValue("CLASS"))+");\n";
      case "dh_show_hide":return "{const el=document.querySelector("+q(b.getFieldValue("SELECTOR"))+");if(el)el.style.display="+q(b.getFieldValue("ACTION")==="hide"?"none":"")+";}\n";
      case "dh_set_colour":return "document.querySelector("+q(b.getFieldValue("SELECTOR"))+")?.style.setProperty('color',"+q(b.getFieldValue("COLOUR"))+");\n";
      case "dh_set_size":return "document.querySelector("+q(b.getFieldValue("SELECTOR"))+")?.style.setProperty('transform','scale("+Math.max(10,Math.min(300,Number(b.getFieldValue("SIZE"))||100))/100+")');\n";
      case "dh_create_element":return "{const el=document.createElement("+q(b.getFieldValue("TAG"))+");el.textContent="+q(b.getFieldValue("TEXT"))+";document.body.appendChild(el);}\n";
      case "dh_wait":return "await new Promise(resolve=>setTimeout(resolve,"+Math.max(0,Math.min(60000,Number(b.getFieldValue("SECONDS"))*1000||0))+"));\n";
      case "controls_repeat_ext":return "for(let repeatIndex=0;repeatIndex<Math.max(0,Math.min(1000,Number("+value(b,"TIMES","5")+ ")||0));repeatIndex++){\n"+statements(b,"DO")+"}\n";
      case "controls_whileUntil":return "while("+value(b,"BOOL","false")+"){\n"+statements(b,"DO")+"break;\n}\n";
      case "controls_if":{let out="if("+value(b,"IF0","false")+"){\n"+statements(b,"DO0")+"}";for(let i=1;i<8;i++){if(!b.getInput("IF"+i))break;out+=" else if("+value(b,"IF"+i,"false")+"){\n"+statements(b,"DO"+i)+"}";}if(b.getInput("ELSE"))out+=" else {\n"+statements(b,"ELSE")+"}";return out+"\n";}
      case "text_print":return "console.log("+value(b,"TEXT","''")+");\n";
      default:return "// Unsupported block: "+b.type+"\n";
    }
  }
  return generateOne(block);
}
function renderBlocks(){if(!blocklyWorkspace)return;updateGenerated();}
function updateGenerated(){if(!$("generatedCode"))return;let code="";if(blocklyWorkspace){const tops=blocklyWorkspace.getTopBlocks(true);code=tops.map(generateBlocklyBlock).join("\\n");}else code=blocks.map(blockCode).join("\\n\\n");$("generatedCode").textContent=code||"// Drag blocks into the workspace to generate JavaScript.";if(code)files.js=code;persist();}
function saveProject(){saveCurrentFile();persist();saveToMyProjects();}
function download(filename,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportHTML(){saveCurrentFile();const name=($("projectName").value.trim()||"my-project").replace(/[^a-z0-9-_]+/gi,"-").replace(/^-|-$/g,"").slice(0,60)||"my-project";download(name+".html",buildDocument(),"text/html;charset=utf-8");setStatus("Standalone HTML exported");}
async function copyCurrent(){saveCurrentFile();try{await navigator.clipboard.writeText(files[activeFile]);setStatus("Copied current file");}catch(e){$("codeEditor").focus();$("codeEditor").select();setStatus("Press Ctrl+C to copy the selected code");}}
async function loadAccount(){const label=$("accountLabel");if(!label)return;try{const client=dbClient||(dbClient=window.supabase?.createClient("https://agsqdqcsmsppcdqxlppj.supabase.co","sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52"));if(!client){label.textContent="Local project";return;}const {data:{session}}=await client.auth.getSession();if(!session){label.textContent="Local project";return;}const {data}=await client.from("profiles").select("username").eq("id",session.user.id).maybeSingle();label.textContent=data?.username?"@"+data.username:"Signed in";}catch(e){label.textContent="Local project";}}
async function loadProjectFromUrl(){
 const id=new URLSearchParams(location.hash.slice(1)).get("project");
 if(!id)return false;
 setStatus("Loading saved project…");
 try{
  const create=window.supabase?.createClient;
  if(!create)throw new Error("Supabase is unavailable.");
  const client=dbClient||(dbClient=create("https://agsqdqcsmsppcdqxlppj.supabase.co","sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52"));
  const result=await client.from("code_projects").select("id,title,html_code,css_code,js_code,files,entry_file,runtime").eq("id",id).maybeSingle();
  if(result.error)throw result.error;
  const row=result.data;
  if(!row)throw new Error("Project not found or permission denied.");
  const next={...STARTERS};
  let gotHtml=false,gotCss=false,gotJs=false;
  const entry=String(row.entry_file||"index.html").toLowerCase();
  for(const item of (Array.isArray(row.files)?row.files:[])){
   if(!item||typeof item!=="object")continue;
   const name=String(item.name||item.filename||"").trim();
   if(!name)continue;
   const body=String(item.content??item.code??"");
   const lower=name.toLowerCase(),ext=lower.split(".").pop();
   if(ext==="html"&&(!gotHtml||lower===entry)){next.html=body;gotHtml=true;}
   else if(ext==="css"&&!gotCss){next.css=body;gotCss=true;}
   else if(ext==="js"&&!gotJs){next.js=body;gotJs=true;}
   else next[name]=body;
  }
  if(!gotHtml&&row.html_code)next.html=row.html_code;
  if(!gotCss&&row.css_code)next.css=row.css_code;
  if(!gotJs&&row.js_code)next.js=row.js_code;
  files=next;blocks=[];activeFile="html";$("projectName").value=row.title||"Untitled project";
  renderFile();renderLibrary();renderBlocks();updateGenerated();
  setStatus("Loaded saved project: "+(row.title||"Untitled project"));
 }catch(err){console.error("DougCode project load failed:",err);setStatus("Couldn't open project: "+(err.message||"Unknown error"),true);}
 return true;
}
$("fileTabs").addEventListener("click",e=>{const btn=e.target.closest(".file-tab");if(btn)switchFile(btn.dataset.file);});
$("addFileBtn").addEventListener("click",()=>{$("newFileName").value="";$("newFileType").value=".js";$("addFileDialog").showModal();$("newFileName").focus();});
$("cancelAddFile").addEventListener("click",()=>$("addFileDialog").close());
$("addFileForm").addEventListener("submit",e=>{e.preventDefault();const ext=$("newFileType").value;let name=$("newFileName").value.trim().replace(/[^a-zA-Z0-9._-]/g,"-").replace(/^\.+|\.+$/g,"");if(!name){$("newFileName").focus();return;}if(name.toLowerCase().endsWith(ext))name=name.slice(0,-ext.length);name+=ext;if(Object.prototype.hasOwnProperty.call(files,name)){setStatus("A file with that name already exists.",true);return;}const starters={".html":"<!doctype html>\n<html><body><h1>New page</h1></body></html>",".css":"/* Add your styles here */\n",".js":"// Add your JavaScript here\n",".ts":"// TypeScript source file\n",".json":"{\n  \"name\": \"my-game\"\n}",".py":"# Python source file\n",".java":"public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, game!\");\n    }\n}",".c":"#include <stdio.h>\n\nint main(void) {\n    printf(\"Hello, game!\\n\");\n    return 0;\n}",".cpp":"#include <iostream>\nint main() { std::cout << \"Hello, game!\\n\"; }\n",".cs":"using System;\nclass Program { static void Main() { Console.WriteLine(\"Hello, game!\"); } }\n",".php":"<?php\necho \"Hello, game!\";\n",".sql":"-- SQL script\n",".sh":"#!/bin/sh\necho \"Hello, game!\"\n",".lua":"print(\"Hello, game!\")\n",".xml":"<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<root />\n",".svg":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"#8b5cf6\"/></svg>\n",".md":"# Project notes\n",".txt":"",".csv":"name,value\n",".yaml":"name: my-game\n",".toml":"name = \"my-game\"\n"};files[name]=starters[ext]??"";activeFile=name;renderFile();persist();$("addFileDialog").close();setStatus("Created "+name);});
$("codeEditor").addEventListener("input",()=>{saveCurrentFile();});
$("codeEditor").addEventListener("keydown",e=>{if(e.key==="Tab"){e.preventDefault();const el=e.currentTarget,start=el.selectionStart,end=el.selectionEnd;el.setRangeText("  ",start,end,"end");saveCurrentFile();}if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();runPreview();}});
document.querySelectorAll(".mode-btn").forEach(btn=>btn.addEventListener("click",()=>setMode(btn.dataset.mode)));
function openPreview(){saveCurrentFile();runPreview();if(currentMode==="blocks"){const d=$("previewDialog");if(d&&typeof d.showModal==="function")d.showModal();else if(d)d.setAttribute("open","");}}
$("previewBtn").addEventListener("click",openPreview);
$("refreshPreviewBtn")?.addEventListener("click",runPreview);
$("closePreviewBtn")?.addEventListener("click",()=>{const d=$("previewDialog");if(d?.close)d.close();else d?.removeAttribute("open");});
$("previewDialog")?.addEventListener("click",e=>{if(e.target===$("previewDialog"))$("previewDialog").close();});

$("saveBtn").addEventListener("click",saveProject);
$("downloadBtn").addEventListener("click",exportHTML);
$("copyCodeBtn").addEventListener("click",copyCurrent);
$("projectName").addEventListener("input",persist);
$("blockSearch")?.addEventListener("input",renderLibrary);
$("blockCategories")?.addEventListener("click",e=>{const btn=e.target.closest("[data-category]");if(!btn)return;activeCategory=btn.dataset.category;document.querySelectorAll(".category").forEach(b=>b.classList.toggle("active",b===btn));renderLibrary();});

$("generateBtn").addEventListener("click",()=>{updateGenerated();setStatus("JavaScript generated from blocks");});
$("clearBlocksBtn").addEventListener("click",()=>{blocks=[];renderBlocks();updateGenerated();setStatus("Block workspace cleared");});
const blockZoomSlider=$("blockZoom"),blockZoomValue=$("blockZoomValue"),legacyBlockWorkspace=$("blockWorkspace");
function applyBlockZoom(value){const zoom=Math.max(75,Math.min(160,Number(value)||100));if(legacyBlockWorkspace)legacyBlockWorkspace.style.zoom=zoom+"%";if(blockZoomValue)blockZoomValue.textContent=zoom+"%";if(blockZoomSlider)blockZoomSlider.value=String(zoom);}
blockZoomSlider?.addEventListener("input",()=>applyBlockZoom(blockZoomSlider.value));
$("resetBlockZoom")?.addEventListener("click",()=>applyBlockZoom(100));
applyBlockZoom(100);
$("viewGeneratedBtn").addEventListener("click",()=>{if(!blocks.length){setStatus("Add blocks first to generate JavaScript",true);return;}files.js=$("generatedCode").textContent;activeFile="js";renderFile();setMode("code");$("codeEditor").focus();});



const PROJECTS_KEY="doughub_scripting_projects_v1";
let scene={background:"#172554",sprites:[{id:"sprite-1",emoji:"🐱",name:"Player",x:22,y:42}]};
function readProjects(){try{const v=JSON.parse(localStorage.getItem(PROJECTS_KEY)||"[]");return Array.isArray(v)?v:[]}catch(_){return []}}
function snapshotProject(){saveCurrentFile();return {files:{...files},blocks:JSON.parse(JSON.stringify(blocks)),blocklyXml:blocklyWorkspace?Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(blocklyWorkspace)):localStorage.getItem(BLOCKLY_XML_KEY)||"",projectName:$("projectName").value.trim()||"Untitled project",activeFile,scene:JSON.parse(JSON.stringify(scene)),updatedAt:Date.now()}}
function saveToMyProjects(){const p=snapshotProject();const list=readProjects();const i=list.findIndex(x=>(x.projectName||"").toLowerCase()===p.projectName.toLowerCase());if(i>=0)p.id=list[i].id;else p.id=(crypto.randomUUID?crypto.randomUUID():String(Date.now()));try{localStorage.setItem(PROJECTS_KEY,JSON.stringify([p,...list.filter(x=>x.id!==p.id)].slice(0,50)));setStatus("Saved “"+p.projectName+"” to My Projects")}catch(_){setStatus("Couldn't save to My Projects. Browser storage may be full.",true)}}
function ensureMyProjects(){if($("myProjectsDialog"))return;const d=document.createElement("dialog");d.id="myProjectsDialog";d.innerHTML='<div class="my-projects-head"><div><div class="eyebrow">YOUR WORKSPACE</div><h2>My Projects</h2><p style="margin:4px 0 0;color:#9aa4c0;font-size:12px">Projects saved in this browser on this device.</p></div><button class="dialog-close" id="closeMyProjects" type="button" aria-label="Close projects">×</button></div><div id="myProjectsList" class="my-projects-list"></div>';document.body.appendChild(d);$("closeMyProjects").addEventListener("click",()=>d.close());d.addEventListener("click",e=>{if(e.target===d)d.close()})}
function renderMyProjects(){const host=$("myProjectsList");if(!host)return;host.replaceChildren();const list=readProjects();if(!list.length){const empty=document.createElement("div");empty.className="my-project-empty";empty.innerHTML="<b>No saved projects yet</b><p>Click <strong>Save project</strong> to add your current work here.</p>";host.appendChild(empty);return}list.forEach(p=>{const card=document.createElement("article");card.className="my-project-card";const title=document.createElement("h3");title.textContent=p.projectName||"Untitled project";const info=document.createElement("p");info.textContent="Saved "+new Date(p.updatedAt||Date.now()).toLocaleString()+" · "+Object.keys(p.files||{}).length+" files";const actions=document.createElement("div");actions.className="my-project-actions";const open=document.createElement("button");open.className="btn primary small";open.textContent="Open project";open.addEventListener("click",()=>{files={...STARTERS,...p.files};blocks=Array.isArray(p.blocks)?p.blocks:[];if(blocklyWorkspace){blocklyWorkspace.clear();if(p.blocklyXml){try{Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(p.blocklyXml),blocklyWorkspace);}catch(e){console.warn("Could not open saved Blockly blocks",e);}}}activeFile=Object.prototype.hasOwnProperty.call(files,p.activeFile)?p.activeFile:"html";$("projectName").value=p.projectName||"Untitled project";scene=p.scene&&Array.isArray(p.scene.sprites)?p.scene:{background:"#172554",sprites:[]};renderFile();renderLibrary();renderBlocks();updateGenerated();renderScene();renderGameAssetList();persist();dClose();setStatus("Opened project: "+$("projectName").value)});const del=document.createElement("button");del.className="btn danger small";del.textContent="Delete";del.addEventListener("click",()=>{if(!confirm("Delete this saved project?"))return;localStorage.setItem(PROJECTS_KEY,JSON.stringify(readProjects().filter(x=>x.id!==p.id)));renderMyProjects()});actions.append(open,del);card.append(title,info,actions);host.appendChild(card)});function dClose(){$("myProjectsDialog").close()}}
function ensureSceneBuilder(){
 if($("sceneBuilder"))return;
 const section=document.createElement("section");
 section.id="sceneBuilder";section.className="scene-builder panel";
 section.innerHTML='<button class="scene-builder-toggle" id="sceneBuilderToggle" type="button" aria-expanded="false" aria-controls="sceneBuilderContent"><span class="scene-builder-toggle-copy"><span class="scene-builder-toggle-title">🎨 Backgrounds &amp; Sprites</span><span class="scene-builder-toggle-help">Customize your game background colour and add, name, or move characters and objects.</span></span><span class="scene-builder-chevron" aria-hidden="true">›</span></button><div class="scene-builder-content" id="sceneBuilderContent" hidden><div class="scene-builder-head"><div><h3>🎨 Game background &amp; sprites</h3><p>Choose the background colour, then add and position characters or objects on your game scene.</p></div><button class="btn small" id="addSceneSprite" type="button">＋ Add sprite</button></div><div class="scene-builder-grid"><div class="scene-controls"><label>Game background colour <input id="sceneBackground" type="color" value="#172554" aria-label="Game background colour"></label><div class="scene-sprite-row"><input id="sceneEmoji" type="text" maxlength="8" value="⭐" aria-label="Sprite emoji" placeholder="Emoji"><input id="sceneSpriteName" type="text" maxlength="24" value="Sprite" aria-label="Sprite name" placeholder="Sprite name"><button class="btn small" id="addNamedSprite" type="button">Add sprite</button></div><small style="color:#8792af;font-size:10px">Drag sprites on the stage to position them.</small></div><div id="sceneStage" class="scene-stage" aria-label="Game background and sprite preview"><span class="scene-stage-label">Game background preview</span></div></div><div class="scene-builder-footer"><span id="sceneBuilderStatus" class="scene-builder-status">Background and sprite changes are saved with your project.</span><button class="btn primary small" id="applySceneBtn" type="button">Apply scene to project</button></div></div>';
 const target=$("blocksMode");if(!target){console.warn("Scene builder skipped: blocks mode container is missing.");return;}
 target.insertBefore(section,target.firstChild);
 const q=id=>section.querySelector("#"+id);
 const toggle=q("sceneBuilderToggle"),content=q("sceneBuilderContent"),background=q("sceneBackground"),add=q("addSceneSprite"),addNamed=q("addNamedSprite"),apply=q("applySceneBtn");
 if(toggle&&content)toggle.addEventListener("click",()=>{const open=toggle.getAttribute("aria-expanded")!=="true";toggle.setAttribute("aria-expanded",String(open));content.hidden=!open;});
 background?.addEventListener("input",e=>{scene.background=e.target.value;renderScene()});
 add?.addEventListener("click",()=>addSceneSprite("⭐","Sprite"));
 addNamed?.addEventListener("click",()=>addSceneSprite(q("sceneEmoji")?.value.trim()||"⭐",q("sceneSpriteName")?.value.trim()||"Sprite"));
 apply?.addEventListener("click",applySceneToProject);
 renderScene();
}
function addSceneSprite(emoji,name){scene.sprites.push({id:(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random()),emoji:String(emoji).slice(0,8),name:String(name).slice(0,24),x:12+Math.random()*65,y:18+Math.random()*62});renderScene();$("sceneBuilderStatus").textContent="Sprite added. Drag it to place it."}
function renderScene(){const stage=$("sceneStage");if(!stage)return;stage.style.backgroundColor=scene.background||"#172554";const color=$("sceneBackground");if(color&&color.value!==scene.background)color.value=scene.background||"#172554";stage.querySelectorAll(".scene-sprite").forEach(el=>el.remove());scene.sprites.forEach(s=>{const el=document.createElement("div");el.className="scene-sprite";el.style.left=Math.max(0,Math.min(90,s.x))+"%";el.style.top=Math.max(10,Math.min(78,s.y))+"%";el.draggable=true;el.title="Drag to move "+s.name;const emoji=document.createElement("span");emoji.textContent=s.emoji;const name=document.createElement("small");name.textContent=s.name;const remove=document.createElement("button");remove.className="scene-sprite-remove";remove.type="button";remove.textContent="×";remove.title="Remove sprite";remove.addEventListener("click",e=>{e.stopPropagation();scene.sprites=scene.sprites.filter(x=>x.id!==s.id);renderScene()});el.append(emoji,name,remove);el.addEventListener("dragstart",e=>{e.dataTransfer.setData("application/x-dh-sprite",s.id);e.dataTransfer.effectAllowed="move"});stage.appendChild(el)});stage.ondragover=e=>{if(Array.from(e.dataTransfer.types).includes("application/x-dh-sprite"))e.preventDefault()};stage.ondrop=e=>{const id=e.dataTransfer.getData("application/x-dh-sprite");if(!id)return;e.preventDefault();const r=stage.getBoundingClientRect(),s=scene.sprites.find(x=>x.id===id);if(!s)return;s.x=Math.max(0,Math.min(88,(e.clientX-r.left)/r.width*100));s.y=Math.max(10,Math.min(76,(e.clientY-r.top)/r.height*100));renderScene()}}
function applySceneToProject(){saveCurrentFile();const markup=scene.sprites.map(s=>'<button class="dh-game-sprite" style="left:'+Math.max(0,Math.min(90,s.x))+'%;top:'+Math.max(10,Math.min(78,s.y))+'%" aria-label="'+escapeAttr(s.name)+'"><span>'+escapeHtml(s.emoji)+'</span><small>'+escapeHtml(s.name)+'</small></button>').join("\n");const stage='<div id="dhGameStage" aria-label="Game scene">\n'+markup+'\n</div>';const match=files.html.match(/<div\s+id=["']dhGameStage["'][^>]*>[\s\S]*?<\/div>/i);files.html=match?files.html.replace(match[0],stage):stage+"\n"+files.html;const cssText='\n/* Scene builder: sprites and background */\n#dhGameStage{position:relative;min-height:320px;overflow:hidden;border-radius:14px;background:'+scene.background+';background-image:linear-gradient(#ffffff0a 1px,transparent 1px),linear-gradient(90deg,#ffffff0a 1px,transparent 1px);background-size:24px 24px}\n.dh-game-sprite{position:absolute;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:48px;padding:5px;border:1px solid #ffffff55;border-radius:12px;background:#0002;color:white;font:inherit;cursor:pointer;transform:translate(-50%,-50%)}\n.dh-game-sprite span{font-size:30px;line-height:1.1}.dh-game-sprite small{font-size:10px;text-shadow:0 1px 3px #000}';files.css=(files.css||"").replace(/\/\* Scene builder: sprites and background \*\/[\s\S]*$/,"").trimEnd()+cssText;files.js=(files.js||"").replace(/\/\* Scene builder sprite click behaviour \*\/[\s\S]*$/,"").trimEnd()+'\n\n/* Scene builder sprite click behaviour */\ndocument.querySelectorAll("#dhGameStage .dh-game-sprite").forEach(sprite=>sprite.addEventListener("click",()=>{sprite.style.transform="translate(-50%,-50%) scale(1.12)";setTimeout(()=>sprite.style.transform="translate(-50%,-50%)",140)}));\n';activeFile="html";renderFile();persist();setStatus("Sprites and background applied to your project");$("sceneBuilderStatus").textContent="Scene applied. Run preview to test it."}
function escapeHtml(v){return String(v).replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]))}
function escapeAttr(v){return escapeHtml(v).replace(/'/g,"&#39;")}
try{const saved=JSON.parse(localStorage.getItem("doughub_scripting_scene_v1")||"null");if(saved&&Array.isArray(saved.sprites))scene=saved}catch(_){}
ensureMyProjects();ensureSceneBuilder();
$("myProjectsBtn")?.addEventListener("click",()=>{renderMyProjects();$("myProjectsDialog").showModal()});

/* Community Games publishing: playable output goes to Doug Games' community_games table. */
let communityDb=null,communityUser=null,communityUsername="Creator";
let communityCanPublishOfficial=false;
function communitySetStatus(message,isError=false){const el=$("communityPublishStatus");if(el){el.textContent=message;el.classList.toggle("error",!!isError);}}
async function communityInit(){
  const create=window.supabase?.createClient;
  if(!create){communitySetStatus("Community Games could not connect to Supabase.",true);return;}
  communityDb=dbClient||(dbClient=create("https://agsqdqcsmsppcdqxlppj.supabase.co","sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52"));
  try{
    const {data:{session},error}=await communityDb.auth.getSession();
    if(error)throw error;
    communityUser=session?.user||null;
    if(!communityUser){communitySetStatus("Sign in to publish your game to Community Games.",true);return;}
    const {data:profile,error:profileError}=await communityDb.from("profiles").select("username,staff_role,is_admin,is_developer,is_owner").eq("id",communityUser.id).maybeSingle();
    if(profileError)throw profileError;
    communityUsername=profile?.username||communityUser.user_metadata?.username||communityUser.email?.split("@")[0]||"Creator";
    const role=String(profile?.staff_role||"").trim().toLowerCase();
    communityCanPublishOfficial=["admin","developer","owner"].includes(role)||profile?.is_admin===true||profile?.is_developer===true||profile?.is_owner===true;
    const officialOption=$("officialGameOption");
    if(officialOption)officialOption.hidden=!communityCanPublishOfficial;
    if(!communityCanPublishOfficial&&$("publishAsOfficial"))$("publishAsOfficial").checked=false;
    communitySetStatus("Ready to publish as "+communityUsername+(communityCanPublishOfficial?" · staff publishing enabled":"")+".");
  }catch(e){console.error("Community Games setup failed:",e);communitySetStatus("Couldn't check your sign-in. Refresh and try again.",true);}
}
async function communityPublish(){
  if(!communityDb||!communityUser){communitySetStatus("Your project is saved locally in this browser. Sign in to publish it to Community Games.",true);return;}
  saveCurrentFile();
  const title=($("communityTitle").value.trim()||$("projectName").value.trim()).slice(0,80);
  const description=$("communityDescription").value.trim().slice(0,500);
  if(!title){communitySetStatus("Add a game title before publishing.",true);$("communityTitle").focus();return;}
  if(!description){communitySetStatus("Add a short game description before publishing.",true);$("communityDescription").focus();return;}
  const button=$("publishProjectBtn");button.disabled=true;button.textContent="Publishing…";
  try{
    const wantsOfficial=$("publishAsOfficial")?.checked===true;
    if(wantsOfficial&&!communityCanPublishOfficial){communitySetStatus("Only Admin, Developer, or Owner staff can publish official DougHub games.",true);return;}
    const payload={title,description,author:communityUsername,category:"Arcade",code:buildDocument(),creator_id:communityUser.id,is_official:wantsOfficial};
    const {error}=await communityDb.from("community_games").insert(payload);
    if(error)throw error;
    communitySetStatus(wantsOfficial?"Published as an official DougHub game! It will be marked in Doug Games → Community Games.":"Published! Your game is now in Doug Games → Community Games. It may take a refresh to appear.");
    setStatus("Game published to Community Games");
  }catch(e){console.error("Community Game publish failed:",e);communitySetStatus("Couldn't publish: "+(e.message||"check your connection and try again"),true);}
  finally{button.disabled=false;button.textContent="Publish to Community Games";}
}
const publishDialog=$("publishGameDialog");
function openPublishDialog(){
  if(studioKind==="project"){
    const section=$("codeCommunityProjects");
    section.hidden=false;
    $("codeCommunityTitle").value=$("projectName").value.trim().slice(0,80);
    section.scrollIntoView({behavior:"smooth",block:"start"});
    $("codeCommunityTitle").focus({preventScroll:true});
    return;
  }
  if(!publishDialog)return;
  const title=$("communityTitle");
  if(title&&!title.value.trim())title.value=$("projectName").value.trim().slice(0,80);
  if(typeof publishDialog.showModal==="function")publishDialog.showModal();else publishDialog.setAttribute("open","");
  setTimeout(()=>title?.focus(),50);
}
function closePublishDialog(){if(!publishDialog)return;if(typeof publishDialog.close==="function")publishDialog.close();else publishDialog.removeAttribute("open");}
$("openPublishDialog")?.addEventListener("click",openPublishDialog);
$("closePublishDialog")?.addEventListener("click",closePublishDialog);
$("cancelPublishDialog")?.addEventListener("click",closePublishDialog);
publishDialog?.addEventListener("click",event=>{if(event.target===publishDialog)closePublishDialog();});
$("publishGameForm")?.addEventListener("submit",event=>{event.preventDefault();communityPublish();});
communityInit();
setStudioKind(new URLSearchParams(location.search).get("kind")==="project"?"project":"game");
renderLibrary();renderBlocks();loadAccount();
if(!new URLSearchParams(location.hash.slice(1)).get("project")){
 restore();renderFile();renderLibrary();renderBlocks();updateGenerated();
}else loadProjectFromUrl();
// Initialize Blockly only after the library scripts and restored project state are ready.
initBlockly();

/* Community Projects — saved in the existing code_projects table. */
let codeCommunityDb=null, codeCommunityUser=null, codeCommunityRows=[], selectedCodeCommunityProject=null, editingCodeCommunityId=null;
function codeCommunitySetStatus(message,isError=false){const el=$("codeCommunityPublishStatus");if(el){el.textContent=message;el.classList.toggle("error",!!isError);}}
function codeCommunitySafeName(value){return String(value||"my-project").replace(/[^a-z0-9-_]+/gi,"-").replace(/^-|-$/g,"").slice(0,60)||"my-project";}
function codeCommunityDocument(project){
  const h=String(project.html_code||"");
  const c=String(project.css_code||"");
  const j=String(project.js_code||"").replace(/<\/script/gi,"<\\/script");
  let assets=[];
  try{const item=(project.files||[]).find(f=>String(f.name||"").toLowerCase()==="assets.json");assets=item?JSON.parse(item.content||"[]"):[];if(!Array.isArray(assets))assets=[];}catch(_){assets=[];}
  const bootstrap='<script>window.DougHubAssets='+JSON.stringify(assets).replace(/<\//g,"<\\/")+'</script>';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"}}</script><style>'+c+'</style></head><body>'+h+bootstrap+'<script>'+j+'</script></body></html>';
}
function codeCommunityAllCode(project){
  return "// "+String(project.title||"Community Project")+"\n\n/* index.html */\n"+String(project.html_code||"")+"\n\n/* style.css */\n"+String(project.css_code||"")+"\n\n/* main.js */\n"+String(project.js_code||"");
}
function codeCommunityCanCopy(p){return !!codeCommunityUser&&p.owner_id===codeCommunityUser.id||!!p.allow_copy;}
function codeCommunityCanDownload(p){return !!codeCommunityUser&&p.owner_id===codeCommunityUser.id||!!p.allow_download;}
function codeCommunityRender(){
  const box=$("codeCommunityProjectSlider"); if(!box)return;
  const q=String($("codeCommunitySearch").value||"").trim().toLowerCase();
  const items=codeCommunityRows.filter(p=>!q||String(p.title||"").toLowerCase().includes(q)||String(p.description||"").toLowerCase().includes(q)||String(p.runtime||"web").toLowerCase().includes(q));
  box.replaceChildren();
  if(!items.length){const empty=document.createElement("div");empty.className="community-loading";empty.textContent=codeCommunityRows.length?"No projects match that search.":"No public projects yet. Be the first to publish one!";box.appendChild(empty);}
  items.forEach(p=>{
    const card=document.createElement("article");card.className="community-project-card";
    const top=document.createElement("div");
    const title=document.createElement("h3");title.className="community-project-title";title.textContent=p.title||"Untitled project";
    const desc=document.createElement("p");desc.className="community-project-description";desc.textContent=p.description||"No description provided.";
    const tags=document.createElement("div");tags.className="community-project-tags";
    const runtime=document.createElement("span");runtime.className="community-tag";runtime.textContent=p.runtime||"web";
    const copy=document.createElement("span");copy.className="community-tag";copy.textContent=p.allow_copy?"↗ Code copying allowed":"🔒 Copying disabled";
    const download=document.createElement("span");download.className="community-tag";download.textContent=p.allow_download?"↓ Download allowed":"🔒 Download disabled";
    tags.append(runtime,copy,download);top.append(title,desc,tags);
    const actions=document.createElement("div");actions.className="community-project-actions";
    const preview=document.createElement("button");preview.type="button";preview.className="btn primary";preview.textContent="▶ Preview";preview.addEventListener("click",()=>codeCommunityOpenPreview(p));actions.appendChild(preview);
    if(codeCommunityCanCopy(p)){const b=document.createElement("button");b.type="button";b.className="btn";b.textContent="Copy code";b.addEventListener("click",()=>codeCommunityCopy(p));actions.appendChild(b);}
    if(codeCommunityCanDownload(p)){const b=document.createElement("button");b.type="button";b.className="btn";b.textContent="Download";b.addEventListener("click",()=>codeCommunityDownload(p));actions.appendChild(b);}
    if(codeCommunityUser&&p.owner_id===codeCommunityUser.id){const b=document.createElement("button");b.type="button";b.className="btn";b.textContent="Edit";b.addEventListener("click",()=>codeCommunityLoadIntoEditor(p));actions.appendChild(b);}
    card.append(top,actions);box.appendChild(card);
  });
  $("codeCommunityProjectCount").textContent=items.length+" project"+(items.length===1?"":"s");
}
async function codeCommunityLoad(){
  const box=$("codeCommunityProjectSlider");box.innerHTML='<div class="community-loading">Loading community projects…</div>';
  try{
    const {data:{session}}=await codeCommunityDb.auth.getSession();codeCommunityUser=session?.user||null;
    const {data,error}=await codeCommunityDb.from("code_projects").select("id,owner_id,title,description,visibility,allow_copy,allow_download,html_code,css_code,js_code,files,entry_file,runtime,created_at,updated_at").eq("visibility","public").order("updated_at",{ascending:false}).limit(100);
    if(error)throw error;codeCommunityRows=data||[];codeCommunityRender();
  }catch(e){console.error("Community Projects failed to load:",e);box.innerHTML='<div class="community-loading">Could not load projects. Please refresh and try again.</div>';$("codeCommunityProjectCount").textContent="Projects unavailable";}
}
async function codeCommunityCopy(p){
  if(!codeCommunityCanCopy(p)){codeCommunitySetStatus("The creator has disabled code copying.",true);return;}
  try{await navigator.clipboard.writeText(codeCommunityAllCode(p));codeCommunitySetStatus("Project source copied.");}
  catch(e){const area=document.createElement("textarea");area.value=codeCommunityAllCode(p);area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();const ok=document.execCommand("copy");area.remove();codeCommunitySetStatus(ok?"Project source copied.":"Couldn't copy automatically. Please try again.",!ok);}
}
function codeCommunityDownload(p){
  if(!codeCommunityCanDownload(p)){codeCommunitySetStatus("The creator has disabled downloads.",true);return;}
  const blob=new Blob([codeCommunityDocument(p)],{type:"text/html;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=codeCommunitySafeName(p.title)+".html";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function codeCommunityOpenPreview(p){
  selectedCodeCommunityProject=p;
  $("codeCommunityPreviewTitle").textContent=p.title||"Untitled project";
  $("codeCommunityPreviewDescription").textContent=p.description||"No description provided.";
  $("codeCommunityPreviewPermissions").textContent=(p.allow_copy?"Code copying allowed":"Code copying disabled")+" · "+(p.allow_download?"Downloads allowed":"Downloads disabled");
  $("codeCommunityPreviewAuthor").textContent=(p.owner_id===codeCommunityUser?.id?"Your project":"Community project")+" · "+(p.runtime||"web");
  $("codeCommunityPreviewFrame").srcdoc=codeCommunityDocument(p);
  $("codeCommunityCopyCodeBtn").hidden=!codeCommunityCanCopy(p);
  $("codeCommunityDownloadBtn").hidden=!codeCommunityCanDownload(p);
  $("editCodeProjectBtn").hidden=!(codeCommunityUser&&p.owner_id===codeCommunityUser.id);
  const dlg=$("codeCommunityPreviewDialog");if(!dlg.open)dlg.showModal();
}
function codeCommunityLoadIntoEditor(p){
  if(!codeCommunityUser||p.owner_id!==codeCommunityUser.id)return;
  editingCodeCommunityId=p.id;
  files.html=String(p.html_code||STARTERS.html);files.css=String(p.css_code||STARTERS.css);files.js=String(p.js_code||"");
  for(const item of (Array.isArray(p.files)?p.files:[])){
    if(item&&item.name&&item.name!=="index.html"&&item.name!=="style.css"&&item.name!=="main.js"&&typeof item.content==="string")files[item.name]=item.content;
  }
  $("projectName").value=p.title||"My Coding Project";$("codeCommunityTitle").value=p.title||"";$("codeCommunityDescription").value=p.description||"";
  $("codeCommunityAllowCopy").checked=!!p.allow_copy;$("codeCommunityAllowDownload").checked=!!p.allow_download;
  activeFile="html";renderFile();persist();setMode("code");renderGameAssetList();codeCommunitySetStatus("Editing your published project. Publish again to save changes.");
  $("codeCommunityProjects").scrollIntoView({behavior:"smooth",block:"start"});
}
async function codeCommunityPublish(){
  if(!codeCommunityDb||!codeCommunityUser){codeCommunitySetStatus("Your project is saved locally in this browser. Sign in to publish it to Community Projects.",true);return;}
  saveCurrentFile();
  const title=$("codeCommunityTitle").value.trim()||$("projectName").value.trim();
  const description=$("codeCommunityDescription").value.trim();
  if(!title){codeCommunitySetStatus("Add a project title before publishing.",true);$("codeCommunityTitle").focus();return;}
  const button=$("publishCodeProjectBtn");button.disabled=true;button.textContent="Publishing…";
  const payload={owner_id:codeCommunityUser.id,title:title.slice(0,80),description:description.slice(0,500),visibility:"public",allow_copy:$("codeCommunityAllowCopy").checked,allow_download:$("codeCommunityAllowDownload").checked,html_code:files.html||"",css_code:files.css||"",js_code:files.js||"",files:[{name:"index.html",type:"html",content:files.html||""},{name:"style.css",type:"css",content:files.css||""},{name:"main.js",type:"js",content:files.js||""},...Object.entries(files).filter(([name])=>name!=="html"&&name!=="css"&&name!=="js").map(([name,content])=>({name,type:name.split(".").pop(),content:String(content)}))],entry_file:"index.html",runtime:"web"};
  try{
    let q=codeCommunityDb.from("code_projects");
    if(editingCodeCommunityId)q=q.update(payload).eq("id",editingCodeCommunityId).eq("owner_id",codeCommunityUser.id);
    else q=q.insert(payload);
    const {data,error}=await q.select("id,owner_id,title,description,visibility,allow_copy,allow_download,html_code,css_code,js_code,files,entry_file,runtime,created_at,updated_at").single();
    if(error)throw error;
    editingCodeCommunityId=data.id;selectedCodeCommunityProject=data;
    $("projectName").value=title;persist();codeCommunitySetStatus("Published! Your project is now in Community Projects.");await codeCommunityLoad();codeCommunityOpenPreview(data);
  }catch(e){console.error("Project publish failed:",e);codeCommunitySetStatus("Couldn't publish: "+(e.message||"check your connection and try again"),true);}
  finally{button.disabled=false;button.textContent=editingCodeCommunityId?"Update published project":"Publish to Community Projects";}
}
function gameAssetManifest(){
  try{const value=JSON.parse(files["assets.json"]||"[]");return Array.isArray(value)?value:[];}catch(_){return [];}
}
function saveGameAssetManifest(items){
  files["assets.json"]=JSON.stringify(items,null,2);
  persist();saveToMyProjects();renderGameAssetList();
}
function renderGameAssetList(){
  const host=$("gameAssetList");if(!host)return;
  host.replaceChildren();
  const items=gameAssetManifest();
  if(!items.length){const empty=document.createElement("div");empty.className="game-asset-empty";empty.textContent="No 3D assets added yet.";host.appendChild(empty);return;}
  for(const item of items){
    const row=document.createElement("div");row.className="game-asset-row";
    const info=document.createElement("div");info.className="game-asset-info";
    const name=document.createElement("strong");name.textContent=item.name||"Asset";
    const meta=document.createElement("small");meta.textContent=(item.kind||"Asset")+" · "+(item.size?Math.round(item.size/1024)+" KB":"");
    info.append(name,meta);
    const actions=document.createElement("div");actions.className="game-asset-actions";
    const link=document.createElement("a");link.href=item.url;link.target="_blank";link.rel="noopener noreferrer";link.textContent="Open";
    const copy=document.createElement("button");copy.type="button";copy.className="text-btn";copy.textContent="Copy URL";copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(item.url);setStatus("Asset URL copied");}catch(_){setStatus("Couldn't copy asset URL",true);}});
    actions.append(link,copy);row.append(info,actions);host.appendChild(row);
  }
}
function ensureGameAssetManager(){
  if($("gameAssetManager"))return;
  const anchor=$("fileTabs")?.parentElement;
  if(!anchor)return;
  const panel=document.createElement("section");panel.id="gameAssetManager";panel.className="game-asset-manager";
  panel.innerHTML='<div class="game-asset-head"><div><strong>3D Game Assets</strong><small>Import GLB / glTF models, textures, and model data into this project.</small></div><label class="btn small primary game-asset-upload-label" for="gameAssetInput">＋ Import assets</label><input id="gameAssetInput" type="file" multiple accept=".glb,.gltf,.bin,.png,.jpg,.jpeg,.webp,.ktx2,.json" hidden></div><div id="gameAssetStatus" class="game-asset-status">Sign in to upload shared assets. Your asset manifest is saved with this project.</div><div id="gameAssetList" class="game-asset-list"></div>';
  const style=document.createElement("style");style.textContent=".game-asset-manager{margin:12px 0 16px;padding:14px;border:1px solid #ffffff18;border-radius:14px;background:#0b1024}.game-asset-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.game-asset-head strong,.game-asset-head small{display:block}.game-asset-head small,.game-asset-status,.game-asset-row small{color:#9aa4c0;font-size:11px;margin-top:4px}.game-asset-upload-label{cursor:pointer}.game-asset-status{margin:10px 0}.game-asset-list{display:grid;gap:7px}.game-asset-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 10px;border:1px solid #ffffff12;border-radius:9px;background:#ffffff06}.game-asset-info{min-width:0}.game-asset-info strong,.game-asset-info small{display:block;overflow-wrap:anywhere}.game-asset-actions{display:flex;align-items:center;gap:12px;flex-shrink:0}.game-asset-actions a{color:#a5b4fc;font-size:12px;text-decoration:none}.game-asset-empty{font-size:12px;color:#8792ae;padding:8px 0}";
  anchor.insertBefore(style,anchor.querySelector(".editor-caption")||null);
  anchor.insertBefore(panel,anchor.querySelector(".editor-caption")||null);
  $("gameAssetInput").addEventListener("change",async event=>{
    const selected=Array.from(event.target.files||[]);event.target.value="";
    if(!selected.length)return;
    if(!codeCommunityDb||!codeCommunityUser){$("gameAssetStatus").textContent="Sign in to DougHub before uploading shared game assets.";return;}
    const project=codeCommunitySafeName($("projectName").value);
    const button=$("gameAssetInput");
    button.disabled=true;$("gameAssetStatus").textContent="Uploading "+selected.length+" asset(s)…";
    let manifest=gameAssetManifest(),uploaded=0;
    try{
      for(const file of selected){
        if(file.size>50*1024*1024)throw new Error(file.name+" is over the 50 MB per-file limit.");
        const safe=file.name.replace(/[^a-z0-9._-]/gi,"_").slice(-120);
        const path=codeCommunityUser.id+"/"+project+"/"+safe;
        const type=file.type||(safe.toLowerCase().endsWith(".glb")?"model/gltf-binary":safe.toLowerCase().endsWith(".gltf")?"model/gltf+json":"application/octet-stream");
        const {error}=await codeCommunityDb.storage.from("game-assets").upload(path,file,{upsert:true,contentType:type,cacheControl:"3600"});
        if(error)throw error;
        const {data}=codeCommunityDb.storage.from("game-assets").getPublicUrl(path);
        manifest=manifest.filter(x=>x.path!==path);
        manifest.push({name:file.name,path,url:data.publicUrl,kind:/\.(glb|gltf)$/i.test(file.name)?"3D model":/\.(png|jpe?g|webp|ktx2)$/i.test(file.name)?"Texture":"Model data",size:file.size,contentType:type});
        uploaded++;
        $("gameAssetStatus").textContent="Uploaded "+uploaded+" of "+selected.length+"…";
      }
      saveGameAssetManifest(manifest);
      $("gameAssetStatus").textContent="Imported "+uploaded+" asset(s). Their public URLs are saved in assets.json.";
      setStatus("Imported "+uploaded+" game asset(s)");
    }catch(error){
      $("gameAssetStatus").textContent="Upload failed: "+(error.message||"Unknown error");
      setStatus("Game asset upload failed: "+(error.message||"Unknown error"),true);
    }finally{button.disabled=false;}
  });
  renderGameAssetList();
}
function codeCommunityInit(){
  const create=window.supabase?.createClient;
  if(!create){codeCommunitySetStatus("Community Projects could not connect to Supabase.",true);$("codeCommunityProjectSlider").textContent="Community Projects are unavailable right now.";return;}
  codeCommunityDb=dbClient||(dbClient=create("https://agsqdqcsmsppcdqxlppj.supabase.co","sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52"));
  $("codeCommunitySearch").addEventListener("input",codeCommunityRender);
  $("refreshCodeProjectsBtn").addEventListener("click",codeCommunityLoad);
  $("publishCodeProjectBtn").addEventListener("click",codeCommunityPublish);
  $("codeCommunityPrev").addEventListener("click",()=>$("codeCommunityProjectSlider").scrollBy({left:-500,behavior:"smooth"}));
  $("codeCommunityNext").addEventListener("click",()=>$("codeCommunityProjectSlider").scrollBy({left:500,behavior:"smooth"}));
  $("closeCodeProjectPreview").addEventListener("click",()=>$("codeCommunityPreviewDialog").close());
  $("codeCommunityPreviewDialog").addEventListener("click",e=>{if(e.target===$("codeCommunityPreviewDialog"))$("codeCommunityPreviewDialog").close();});
  $("codeCommunityCopyCodeBtn").addEventListener("click",()=>selectedCodeCommunityProject&&codeCommunityCopy(selectedCodeCommunityProject));
  $("codeCommunityDownloadBtn").addEventListener("click",()=>selectedCodeCommunityProject&&codeCommunityDownload(selectedCodeCommunityProject));
  $("editCodeProjectBtn").addEventListener("click",()=>{if(selectedCodeCommunityProject){$("codeCommunityPreviewDialog").close();codeCommunityLoadIntoEditor(selectedCodeCommunityProject);}});
  $("codeCommunityTitle").addEventListener("input",()=>{if(!editingCodeCommunityId)$("publishCodeProjectBtn").textContent="Publish to Community Projects";});
  codeCommunityLoad();
  ensureGameAssetManager();
}

codeCommunityInit();

})();
