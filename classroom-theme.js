(function(){
"use strict";
const palettes={
 default:{accent:"#7257e8",soft:"#f0edff"},
 blue:{accent:"#4e8df5",soft:"#edf4ff"},
 mint:{accent:"#35a98d",soft:"#eaf8f3"},
 rose:{accent:"#d66a9f",soft:"#fff0f6"}
};
function apply(){
 const name=localStorage.getItem("classroomTheme")||"default";
 const p=palettes[name]||palettes.default;
 document.body.dataset.classroomTheme=name;
 document.documentElement.style.setProperty("--classroom-accent",p.accent);
 document.documentElement.style.setProperty("--classroom-accent-soft",p.soft);
 document.documentElement.style.setProperty("--blue",p.accent);
 document.documentElement.style.setProperty("--classroom-blue",p.accent);
 let style=document.getElementById("dh-classroom-theme-palette");
 if(!style){style=document.createElement("style");style.id="dh-classroom-theme-palette";document.head.appendChild(style);}
 style.textContent=`
 body[data-classroom-theme]{--blue:var(--classroom-accent)!important;--classroom-blue:var(--classroom-accent)!important}
 .brand-icon,.brand-mark,.logo-icon,.dh-classroom-brand-mark,header .brand-icon,header .brand-mark{background:var(--classroom-accent)!important;background-image:none!important}
 .btn:not(.soft):not(.ghost),.button:not(.soft):not(.ghost),button.primary,.btn.primary,.send,.class-actions .btn:not(.soft),.top-actions .btn:not(.soft){background:var(--classroom-accent)!important;border-color:var(--classroom-accent)!important;color:#fff!important}
 .btn.soft,.button.soft,.btn.ghost,.button.ghost{background:var(--classroom-accent-soft)!important;border-color:color-mix(in srgb,var(--classroom-accent) 24%,transparent)!important;color:var(--classroom-accent)!important}
 button:not(.action):not(.switch):not(.soft):not(.ghost):not([data-theme]):not(.tab-buttons button){background:var(--classroom-accent)!important;border-color:var(--classroom-accent)!important;color:#fff!important;accent-color:var(--classroom-accent)}
 .action{border-color:color-mix(in srgb,var(--classroom-accent) 25%,#e4eaf3)!important}.top-actions a:not(.btn){border-color:color-mix(in srgb,var(--classroom-accent) 35%,#e4eaf3)!important;color:var(--classroom-accent)!important}.action:hover,.panel a.link:hover,.top-actions a:hover{border-color:var(--classroom-accent)!important}
  .action-icon{background:var(--classroom-accent-soft)!important;color:var(--classroom-accent)!important}
 .grade-chip{background:var(--classroom-accent-soft)!important;color:var(--classroom-accent)!important}
 .link,.eyebrow,.nav a.current .nav-icon{color:var(--classroom-accent)!important}
 .nav a.current{box-shadow:inset 3px 0 var(--classroom-accent)!important}
 .nav a:hover,.nav a.current{background:color-mix(in srgb,var(--classroom-accent) 13%,transparent)!important}
 .tab-buttons button.active{background:var(--classroom-accent-soft)!important;border-color:var(--classroom-accent)!important;color:var(--classroom-accent)!important}
 .dh-classroom-nav a.active,.dh-classroom-nav a:hover{background:color-mix(in srgb,var(--classroom-accent) 18%,transparent)!important}
 .dh-classroom-nav a.active{box-shadow:inset 3px 0 var(--classroom-accent)!important}
 `;
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="'+p.accent+'"/><text x="32" y="44" text-anchor="middle" font-family="Arial,sans-serif" font-size="36" font-weight="900" fill="#fff">D</text></svg>';
 const icon="data:image/svg+xml,"+encodeURIComponent(svg);
 document.querySelectorAll('link[rel~="icon"]').forEach(link=>{link.href=icon;link.type="image/svg+xml";});
 document.querySelectorAll('meta[name="theme-color"]').forEach(meta=>meta.content=p.accent);
}
window.DHClassroomTheme={apply};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply,{once:true});else apply();
window.addEventListener("storage",e=>{if(e.key==="classroomTheme")apply();});
window.addEventListener("dh-classroom-theme-change",apply);
})();