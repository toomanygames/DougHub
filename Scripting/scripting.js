(() => {
"use strict";
const $ = id => document.getElementById(id);
const STORAGE_KEY = "doughub_scripting_project_v3";
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
function buildDocument(){const html=files.html||"";const css=files.css||"";const js=files.js||"";return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<style>\n'+css+'\n</style>\n</head>\n<body>\n'+html+'\n<script>\n'+js.replace(/<\/script/gi,"<\\/script")+'\n</script>\n</body>\n</html>';}
function runPreview(){saveCurrentFile();if(currentMode==="blocks")updateGenerated();const isBlocks=currentMode==="blocks",isFast=currentMode==="fast";const frame=$(isBlocks?"previewDialogFrame":isFast?"fastPreviewFrame":"previewFrame");if(frame)frame.srcdoc=buildDocument();const empty=$(isBlocks?"previewDialogEmpty":isFast?"fastPreviewEmpty":"previewEmpty");const status=$(isBlocks?"previewDialogStatus":isFast?"fastPreviewStatus":"previewStatus");if(empty)empty.hidden=true;if(status)status.textContent="Preview refreshed at "+new Date().toLocaleTimeString();setStatus("Preview updated");}
function setMode(mode){currentMode=mode;document.querySelectorAll(".mode-btn").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));$("codeMode").hidden=mode!=="code";$("blocksMode").hidden=mode!=="blocks";$("fastMode").hidden=mode!=="fast";if(mode==="blocks"){renderLibrary();renderBlocks();if(blocklyWorkspace){requestAnimationFrame(()=>{try{Blockly.svgResize(blocklyWorkspace);}catch(e){console.warn("Blockly resize failed",e);}});}}else if(mode==="code")renderFile();else renderFastStatus();persist();}


const FAST_TEMPLATES={
 clicker:{name:"Clicker Game",html:`<main class="game"><p class="eyebrow">DOUG ARCADE</p><h1>Click Rush</h1><p>Tap the crystal. Buy upgrades. Beat your best.</p><div class="stats"><span>Score <b id="score">0</b></span><span>Power <b id="power">1</b></span><span>Best <b id="best">0</b></span></div><button id="tap" class="crystal">✦<small>CLICK!</small></button><button id="upgrade" class="upgrade">Upgrade power · 10 points</button><p id="hint">Every click earns points.</p></main>`,css:`*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at top,#29245f,#080a19 65%);color:#f8f7ff;font:16px system-ui}.game{width:min(520px,calc(100% - 28px));padding:28px;text-align:center;border:1px solid #a5b4fc40;border-radius:24px;background:#11152c;box-shadow:0 20px 70px #0008}.eyebrow{color:#a5b4fc;letter-spacing:3px;font-size:11px;font-weight:900}h1{font-size:40px;margin:8px 0}p{color:#a8afce}.stats{display:flex;justify-content:space-around;gap:10px;margin:24px 0;padding:14px;background:#080a19;border-radius:14px}.stats span{display:grid;gap:5px;color:#a8afce;font-size:11px}.stats b{color:#fff;font-size:22px}.crystal{width:145px;height:145px;border:1px solid #d8b4fe;border-radius:38px;background:linear-gradient(135deg,#6366f1,#c026d3);color:white;font-size:55px;box-shadow:0 0 50px #8b5cf655;cursor:pointer;transition:transform .1s}.crystal:active{transform:scale(.92)}.crystal small{display:block;font-size:11px;letter-spacing:2px}.upgrade{display:block;width:100%;margin-top:20px;padding:14px;border:0;border-radius:12px;background:#312e81;color:white;font-weight:800;cursor:pointer}.upgrade:disabled{opacity:.45;cursor:not-allowed}#hint{font-size:12px}`,js:`let score=0,power=1,best=Number(localStorage.getItem("clickrush-best")||0);const $=id=>document.getElementById(id);function draw(){$("score").textContent=score;$("power").textContent=power;$("best").textContent=best;$("upgrade").disabled=score<10*power;$("upgrade").textContent="Upgrade power · "+(10*power)+" points"}$("tap").addEventListener("click",()=>{score+=power;if(score>best){best=score;localStorage.setItem("clickrush-best",best)}draw()});$("upgrade").addEventListener("click",()=>{const cost=10*power;if(score>=cost){score-=cost;power++;$("hint").textContent="Power upgraded! Keep going.";draw()}});draw();`},
 dodge:{name:"Dodge Game",html:`<main class="game"><p class="eyebrow">SURVIVAL MODE</p><h1>Dodge Zone</h1><p>Move with ← → or A / D. Don't touch the falling blocks.</p><div class="score">Score <b id="score">0</b> <span id="state">Ready</span></div><canvas id="game" width="420" height="520" aria-label="Dodge game"></canvas><button id="start">Start / restart</button></main>`,css:`*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at top,#22205a,#070914 70%);color:#fff;font:14px system-ui}.game{width:min(500px,calc(100% - 20px));padding:20px;text-align:center;border:1px solid #a5b4fc40;border-radius:20px;background:#10142a}.eyebrow{color:#a5b4fc;letter-spacing:3px;font-weight:900;font-size:10px}h1{font-size:32px;margin:8px}p{color:#aab0cd;line-height:1.5}.score{display:flex;justify-content:space-between;margin:15px 0;color:#c4b5fd}canvas{display:block;width:100%;height:auto;max-height:55vh;border-radius:12px;background:#070a18;border:1px solid #ffffff1c}button{margin-top:14px;padding:12px 20px;border:0;border-radius:10px;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;font-weight:800;cursor:pointer}`,js:`const c=document.getElementById("game"),ctx=c.getContext("2d"),keys={};let player={x:195,y:455,w:30,h:30},blocks=[],score=0,live=false,last=0,spawn=0;addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true;if(["ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault()});addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);function start(){player.x=195;blocks=[];score=0;live=true;last=performance.now();spawn=0;document.getElementById("state").textContent="Playing";requestAnimationFrame(loop)}function loop(t){if(!live)return;const dt=Math.min(32,t-last);last=t;spawn+=dt;if(spawn>650){spawn=0;blocks.push({x:Math.random()*390,y:-30,w:18+Math.random()*24,h:20+Math.random()*20,s:2+Math.random()*2+score/250})}if(keys.arrowleft||keys.a)player.x-=dt*.35;if(keys.arrowright||keys.d)player.x+=dt*.35;player.x=Math.max(0,Math.min(c.width-player.w,player.x));blocks.forEach(b=>b.y+=b.s*dt/16);blocks=blocks.filter(b=>b.y<c.height+40);for(const b of blocks){if(player.x<b.x+b.w&&player.x+player.w>b.x&&player.y<b.y+b.h&&player.y+player.h>b.y){live=false;document.getElementById("state").textContent="Game over";break}}score+=dt/1000;document.getElementById("score").textContent=Math.floor(score);ctx.clearRect(0,0,c.width,c.height);ctx.strokeStyle="#ffffff0b";for(let x=0;x<c.width;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,c.height);ctx.stroke()}ctx.fillStyle="#a78bfa";ctx.shadowColor="#8b5cf6";ctx.shadowBlur=15;ctx.fillRect(player.x,player.y,player.w,player.h);ctx.shadowBlur=0;ctx.fillStyle="#fb7185";blocks.forEach(b=>ctx.fillRect(b.x,b.y,b.w,b.h));if(live)requestAnimationFrame(loop)}document.getElementById("start").addEventListener("click",start);`},
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
function renderMyProjects(){const host=$("myProjectsList");if(!host)return;host.replaceChildren();const list=readProjects();if(!list.length){const empty=document.createElement("div");empty.className="my-project-empty";empty.innerHTML="<b>No saved projects yet</b><p>Click <strong>Save project</strong> to add your current work here.</p>";host.appendChild(empty);return}list.forEach(p=>{const card=document.createElement("article");card.className="my-project-card";const title=document.createElement("h3");title.textContent=p.projectName||"Untitled project";const info=document.createElement("p");info.textContent="Saved "+new Date(p.updatedAt||Date.now()).toLocaleString()+" · "+Object.keys(p.files||{}).length+" files";const actions=document.createElement("div");actions.className="my-project-actions";const open=document.createElement("button");open.className="btn primary small";open.textContent="Open project";open.addEventListener("click",()=>{files={...STARTERS,...p.files};blocks=Array.isArray(p.blocks)?p.blocks:[];if(blocklyWorkspace){blocklyWorkspace.clear();if(p.blocklyXml){try{Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(p.blocklyXml),blocklyWorkspace);}catch(e){console.warn("Could not open saved Blockly blocks",e);}}}activeFile=Object.prototype.hasOwnProperty.call(files,p.activeFile)?p.activeFile:"html";$("projectName").value=p.projectName||"Untitled project";scene=p.scene&&Array.isArray(p.scene.sprites)?p.scene:{background:"#172554",sprites:[]};renderFile();renderLibrary();renderBlocks();updateGenerated();renderScene();persist();dClose();setStatus("Opened project: "+$("projectName").value)});const del=document.createElement("button");del.className="btn danger small";del.textContent="Delete";del.addEventListener("click",()=>{if(!confirm("Delete this saved project?"))return;localStorage.setItem(PROJECTS_KEY,JSON.stringify(readProjects().filter(x=>x.id!==p.id)));renderMyProjects()});actions.append(open,del);card.append(title,info,actions);host.appendChild(card)});function dClose(){$("myProjectsDialog").close()}}
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
  if(!communityDb||!communityUser){communitySetStatus("Please sign in, then refresh DougCode before publishing.",true);return;}
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
function openPublishDialog(){if(!publishDialog)return;const title=$("communityTitle");if(title&&!title.value.trim())title.value=$("projectName").value.trim().slice(0,80);if(typeof publishDialog.showModal==="function")publishDialog.showModal();else publishDialog.setAttribute("open","");setTimeout(()=>title?.focus(),50);}
function closePublishDialog(){if(!publishDialog)return;if(typeof publishDialog.close==="function")publishDialog.close();else publishDialog.removeAttribute("open");}
$("openPublishDialog")?.addEventListener("click",openPublishDialog);
$("closePublishDialog")?.addEventListener("click",closePublishDialog);
$("cancelPublishDialog")?.addEventListener("click",closePublishDialog);
publishDialog?.addEventListener("click",event=>{if(event.target===publishDialog)closePublishDialog();});
$("publishGameForm")?.addEventListener("submit",event=>{event.preventDefault();communityPublish();});
communityInit();
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
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+c+'</style></head><body>'+h+'<script>'+j+'</script></body></html>';
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
  $("projectName").value=p.title||"My Coding Project";$("codeCommunityTitle").value=p.title||"";$("codeCommunityDescription").value=p.description||"";
  $("codeCommunityAllowCopy").checked=!!p.allow_copy;$("codeCommunityAllowDownload").checked=!!p.allow_download;
  activeFile="html";renderFile();persist();setMode("code");codeCommunitySetStatus("Editing your published project. Publish again to save changes.");
  $("codeCommunityProjects").scrollIntoView({behavior:"smooth",block:"start"});
}
async function codeCommunityPublish(){
  if(!codeCommunityDb||!codeCommunityUser){codeCommunitySetStatus("Please sign in again, then refresh this page.",true);return;}
  saveCurrentFile();
  const title=$("codeCommunityTitle").value.trim()||$("projectName").value.trim();
  const description=$("codeCommunityDescription").value.trim();
  if(!title){codeCommunitySetStatus("Add a project title before publishing.",true);$("codeCommunityTitle").focus();return;}
  const button=$("publishCodeProjectBtn");button.disabled=true;button.textContent="Publishing…";
  const payload={owner_id:codeCommunityUser.id,title:title.slice(0,80),description:description.slice(0,500),visibility:"public",allow_copy:$("codeCommunityAllowCopy").checked,allow_download:$("codeCommunityAllowDownload").checked,html_code:files.html||"",css_code:files.css||"",js_code:files.js||"",files:[{name:"index.html",type:"html",content:files.html||""},{name:"style.css",type:"css",content:files.css||""},{name:"main.js",type:"js",content:files.js||""}],entry_file:"index.html",runtime:"web"};
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
}

codeCommunityInit();

})();
