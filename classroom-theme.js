(function(){
"use strict";
const palettes={default:{accent:"#7257e8",soft:"#f0edff"},blue:{accent:"#4e8df5",soft:"#edf4ff"},mint:{accent:"#35a98d",soft:"#eaf8f3"},rose:{accent:"#d66a9f",soft:"#fff0f6"}};
function apply(){
 const name=localStorage.getItem("classroomTheme")||"default",p=palettes[name]||palettes.default;
 document.body.dataset.classroomTheme=name;
 const root=document.documentElement;
 root.style.setProperty("--classroom-accent",p.accent);root.style.setProperty("--classroom-accent-soft",p.soft);root.style.setProperty("--classroom-blue",p.accent);root.style.setProperty("--blue",p.accent);
 let style=document.getElementById("dh-classroom-theme-palette");
 if(!style){style=document.createElement("style");style.id="dh-classroom-theme-palette";document.head.appendChild(style);}
 style.textContent=`
 body[data-classroom-theme]{--blue:var(--classroom-accent)!important;--classroom-blue:var(--classroom-accent)!important}
 .btn:not(.soft):not(.ghost):not(.danger):not(.delete-button),.button:not(.soft):not(.ghost):not(.danger):not(.delete-button),button:not(.soft):not(.ghost):not(.danger):not(.delete-button):not(.switch):not([data-theme]),input[type="button"],input[type="submit"],[role="button"]:not(.soft):not(.ghost){background:var(--classroom-accent)!important;border-color:var(--classroom-accent)!important;color:#fff!important;accent-color:var(--classroom-accent)!important}
 .btn.soft,.button.soft,button.soft,.btn.ghost,.button.ghost,button.ghost{background:var(--classroom-accent-soft)!important;border:1px solid color-mix(in srgb,var(--classroom-accent) 30%,transparent)!important;color:var(--classroom-accent)!important}
 .switch.on{background:var(--classroom-accent)!important}.switch:not(.on){background:#cbd3df!important;border-color:#cbd3df!important}
 .tab-buttons button.active{background:var(--classroom-accent-soft)!important;border-color:var(--classroom-accent)!important;color:var(--classroom-accent)!important}
 .action,.action-icon,.class-icon{border-color:color-mix(in srgb,var(--classroom-accent) 32%,#e4eaf3)!important;background:var(--classroom-accent-soft)!important;color:var(--classroom-accent)!important}
 .action:hover,.panel a.link:hover,.top-actions a:hover{border-color:var(--classroom-accent)!important}
 .grade-chip{background:var(--classroom-accent-soft)!important;color:var(--classroom-accent)!important}
 .link,.eyebrow,.nav a.current .nav-icon{color:var(--classroom-accent)!important}
 .nav a.current{box-shadow:inset 3px 0 var(--classroom-accent)!important}
 .nav a:hover,.nav a.current{background:color-mix(in srgb,var(--classroom-accent) 13%,transparent)!important}
 .dh-classroom-nav a.active,.dh-classroom-nav a:hover{background:color-mix(in srgb,var(--classroom-accent) 18%,transparent)!important}
 .dh-classroom-nav a.active{box-shadow:inset 3px 0 var(--classroom-accent)!important}
 .brand-icon,.brand-mark,.logo-icon,.dh-classroom-brand-mark,header .brand-icon,header .brand-mark{background:var(--classroom-accent)!important;background-image:none!important;color:#fff!important}
 .dh-classroom-brand-mark{background:var(--classroom-accent)!important;color:#fff!important}
 `;
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="'+p.accent+'"/><text x="32" y="44" text-anchor="middle" font-family="Arial,sans-serif" font-size="36" font-weight="900" fill="#fff">D</text></svg>',icon="data:image/svg+xml,"+encodeURIComponent(svg);
 let favicons=document.querySelectorAll('link[rel~="icon"]');
 if(!favicons.length){const link=document.createElement("link");link.rel="icon";document.head.appendChild(link);favicons=[link];}
 favicons.forEach(link=>{link.href=icon;link.type="image/svg+xml";});
 document.querySelectorAll('meta[name="theme-color"]').forEach(meta=>meta.content=p.accent);
}
window.DHClassroomTheme={apply};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply,{once:true});else apply();
window.addEventListener("storage",e=>{if(e.key==="classroomTheme")apply();});
window.addEventListener("dh-classroom-theme-change",apply);
})();