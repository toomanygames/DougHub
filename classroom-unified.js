(function(){
"use strict";
const items=[
 ["community-classroom.html","Home","⌂"],
 ["class-chat.html","Class Chat","◉"],
 ["classroom-dms.html","Chat & DMs","◎"],
 ["classroom-community.html","Community","▤"],
 ["classroom-games.html","Games","▦"],
 ["classroom-create.html","Create","＋"],
 ["classroom-dictionary.html","Dictionary","▤"],
 ["classroom-tools.html","Student Tools","⚒"],
 ["classroom-settings.html","Settings","⚙"]
];
const path=(location.pathname.split("/").pop()||"community-classroom.html").toLowerCase();
const style=document.createElement("style");
style.textContent=`
:root{--dh-side-collapsed:236px;--dh-side-expanded:236px;--dh-side-width:236px}
body{--dh-side-width:236px!important}
.dh-classroom-sidebar{width:236px!important;padding:22px 14px!important}
body>.app{display:block!important;margin-left:236px!important;transition:none!important}
body>.app>.sidebar{position:fixed!important;inset:0 auto 0 0!important;width:236px!important;height:100dvh!important;min-height:100dvh!important;overflow:hidden!important;z-index:5000!important;transition:none!important}
body>.layout{grid-template-columns:236px minmax(0,1fr)!important;transition:none!important}
body>.layout>.sidebar{width:236px!important}
body>.shell{margin-left:236px!important;width:calc(100% - 236px)!important;transition:none!important}
body>main{margin-left:236px!important;width:calc(100% - 236px)!important;transition:none!important}
body>.app>.sidebar .brand-name,body>.app>.sidebar .nav-label,body>.app>.sidebar .profile-info,
body>.layout>.sidebar .brand-name,body>.layout>.sidebar .nav-label,body>.layout>.sidebar .profile-info{display:initial!important}
body>.app>.sidebar .brand,body>.layout>.sidebar .brand,
body>.app>.sidebar .nav a,body>.layout>.sidebar .nav a{justify-content:flex-start!important}
.dh-classroom-sidebar .dh-classroom-brand-name,.dh-classroom-sidebar .dh-nav-label,.dh-classroom-sidebar .dh-classroom-profile-copy{display:initial!important}
.dh-classroom-sidebar .dh-classroom-brand{justify-content:flex-start!important}
.dh-classroom-sidebar .dh-classroom-nav a{justify-content:flex-start!important;width:100%!important;padding:11px 12px!important;font-size:12px!important}
.dh-classroom-sidebar .dh-classroom-profile{justify-content:flex-start!important}
.dh-sidebar-toggle{display:none!important}
@media(max-width:900px){
 :root{--dh-side-collapsed:220px;--dh-side-expanded:220px;--dh-side-width:220px}
 body{--dh-side-width:220px!important}
 .dh-classroom-sidebar{width:220px!important;padding:18px 12px!important}
 body>.app{margin-left:220px!important}
 body>.app>.sidebar{width:220px!important}
 body>.layout{grid-template-columns:220px minmax(0,1fr)!important}
 body>.layout>.sidebar{width:220px!important}
 body>.shell{margin-left:220px!important;width:calc(100% - 220px)!important}
 body>main{margin-left:220px!important;width:calc(100% - 220px)!important}
}
@media(prefers-reduced-motion:reduce){.dh-classroom-sidebar,.sidebar,body>.app,body>.layout,body>.shell,body>main{transition:none!important}}
`;
document.head.append(style);
try{document.body.dataset.classroomTheme=localStorage.getItem("classroomTheme")||"default";}catch(e){}
function mount(){
 const existing=document.querySelector(".sidebar");
 if(existing){
  if(path==="community-classroom.html"||path==="class-chat.html"){
   const oldLink=[...existing.querySelectorAll("a")].find(a=>(a.querySelector(".nav-label")?.textContent||"").trim()==="My Class"||(a.textContent||"").trim()==="My Class");
   if(oldLink)oldLink.remove();
   return;
  }
 }
 if(document.querySelector(".dh-classroom-sidebar"))return;
 const aside=document.createElement("aside");aside.className="dh-classroom-sidebar";aside.setAttribute("aria-label","Classroom navigation");
 const brand=document.createElement("a");brand.className="dh-classroom-brand";brand.href="community-classroom.html";brand.innerHTML='<span class="dh-classroom-brand-mark">D</span><span class="dh-classroom-brand-name">DougHub</span>';
 const nav=document.createElement("nav");nav.className="dh-classroom-nav";nav.setAttribute("aria-label","Classroom pages");
 items.forEach(([href,label,glyph])=>{const a=document.createElement("a");a.href=href;a.innerHTML='<span class="dh-nav-icon" aria-hidden="true">'+glyph+'</span><span class="dh-nav-label">'+label+'</span>';if(path===href)a.classList.add("active");nav.append(a);});
 const profile=document.createElement("div");profile.className="dh-classroom-profile";profile.innerHTML='<span class="dh-classroom-avatar">DH</span><span class="dh-classroom-profile-copy"><strong>DougHub Student</strong><small>Student space</small></span>';
 aside.append(brand,nav,profile);document.body.prepend(aside);
 document.querySelectorAll(".classroom-top-links").forEach(el=>el.remove());
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();