/* DougHub shared game navigation and third-party credits. */
(() => {
"use strict";
const id=(location.pathname.split("/").pop()||"").replace(/\.html$/i,"");
const sources={
"bubble-grove":{name:"Bubble Grove",author:"mashukui (马哥python说)",project:"Web Games — Bubble Shooter",url:"https://github.com/mashukui/web-games",license:"MIT",licenseUrl:"https://github.com/mashukui/web-games/blob/main/LICENSE",detail:"Gameplay logic, canvas-drawn bubble visuals and interface adapted from the upstream Bubble Shooter game."},
"crystal-breaker":{name:"Crystal Breaker",author:"mashukui (马哥python说)",project:"Web Games — Breakout",url:"https://github.com/mashukui/web-games",license:"MIT",licenseUrl:"https://github.com/mashukui/web-games/blob/main/LICENSE",detail:"Open-source Breakout port is planned; this title has not yet been migrated."},
"puzzle":{name:"Doug Puzzle 2048",author:"Gabriele Cirulli and contributors",project:"2048",url:"https://github.com/gabrielecirulli/2048",license:"MIT",licenseUrl:"https://github.com/gabrielecirulli/2048/blob/master/LICENSE",detail:"The original 2048 code and attribution are retained."},
"ocean-drive":{name:"Ocean Drive",author:"StarKnightt",project:"Ocean Drive",url:"https://github.com/StarKnightt/ocean-drive",license:"MIT",licenseUrl:"https://github.com/StarKnightt/ocean-drive",detail:"Existing open-source source project."}
};
const s=sources[id]||null;
const style=document.createElement("style");
style.textContent=`
.dh-shared-back{position:fixed!important;top:12px!important;left:12px!important;z-index:2147483000!important;display:inline-flex!important;align-items:center!important;gap:8px!important;padding:9px 13px!important;border:1px solid rgba(167,139,250,.34)!important;border-radius:12px!important;background:rgba(8,10,25,.88)!important;color:#e9e5ff!important;text-decoration:none!important;font:800 11px Inter,system-ui,sans-serif!important;box-shadow:0 8px 28px #0006!important;backdrop-filter:blur(14px)!important}
.dh-shared-back:hover{background:rgba(99,102,241,.25)!important;border-color:#a78bfa!important;color:white!important}
#dhGameCreditsButton{position:fixed;right:12px;bottom:12px;z-index:2147483000;padding:10px 14px;border:1px solid #a78bfa66;border-radius:12px;background:linear-gradient(135deg,#6366f1,#9333ea);color:white;font:800 11px Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 8px 26px #0007}
#dhGameCredits{position:fixed;inset:0;z-index:2147483001;display:none;align-items:center;justify-content:center;padding:18px;background:#03040bdc;backdrop-filter:blur(12px);font:14px/1.55 Inter,system-ui,sans-serif;color:#f8f7ff}
#dhGameCredits.open{display:flex}
#dhGameCredits .dh-modal{width:min(480px,100%);max-height:min(82vh,680px);overflow:auto;padding:22px;border:1px solid #ffffff20;border-radius:18px;background:#101329;box-shadow:0 24px 80px #000a}
#dhGameCredits h2{margin:0 0 12px;font-size:20px}
#dhGameCredits p{color:#cbc8df;margin:9px 0}
#dhGameCredits a{color:#c4b5fd;text-decoration:underline}
#dhGameCredits .dh-license{padding:11px 13px;margin-top:13px;border-radius:10px;background:#ffffff0a;color:#d9d6eb;font-size:12px}
#dhGameCredits .dh-close{margin-top:16px;padding:9px 14px;border:1px solid #ffffff24;border-radius:9px;background:#ffffff12;color:white;font-weight:700;cursor:pointer}
@media(max-width:520px){.dh-shared-back{top:8px!important;left:8px!important;padding:8px 10px!important}#dhGameCreditsButton{right:8px;bottom:8px;padding:9px 11px}}
`;
document.head.appendChild(style);
let back=document.querySelector("a.back, a[href*='douggames.html'], a[href*='douggames']");
if(back)back.classList.add("dh-shared-back");
else{back=document.createElement("a");back.href="../douggames.html";back.className="dh-shared-back";back.textContent="← Back to Games";document.body.appendChild(back);}
const button=document.createElement("button");button.id="dhGameCreditsButton";button.type="button";button.textContent="Credits & License";
const modal=document.createElement("div");modal.id="dhGameCredits";
const content=s
? `<p><b>Game:</b> ${s.name}</p><p><b>Original creator:</b> ${s.author}</p><p><b>Open-source project:</b> <a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.project}</a></p><p><b>License:</b> <a href="${s.licenseUrl}" target="_blank" rel="noopener noreferrer">${s.license}</a></p><p>${s.detail}</p><div class="dh-license">The upstream license applies only to the materials covered by that project. Separately sourced art, audio, fonts and libraries retain their own licenses.</div>`
: `<p><b>Game:</b> ${document.title}</p><p>This game is awaiting its open-source rebuild. Its original creator, source project and license will be listed here once verified.</p><div class="dh-license">DougHub does not label third-party assets as open-source without checking their source and license.</div>`;
modal.innerHTML=`<section class="dh-modal" role="dialog" aria-modal="true" aria-labelledby="dhCreditsTitle"><h2 id="dhCreditsTitle">Credits & License</h2>${content}<button class="dh-close" type="button" id="dhCloseCredits">Close</button></section>`;
document.body.append(button,modal);
button.addEventListener("click",()=>modal.classList.add("open"));
document.getElementById("dhCloseCredits").addEventListener("click",()=>modal.classList.remove("open"));
modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.remove("open");});
document.addEventListener("keydown",e=>{if(e.key==="Escape")modal.classList.remove("open");});
})();