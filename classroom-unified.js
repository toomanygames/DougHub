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
style.textContent=".dh-classroom-student-label{display:flex;align-items:center;gap:10px;margin-top:auto;padding:11px 10px;border:1px solid #405474;border-radius:10px;background:#ffffff08;color:#fff;font-size:11px;font-weight:850}.dh-classroom-student-label:before{content:'S';display:grid;place-items:center;width:27px;height:27px;flex:0 0 27px;border-radius:8px;background:#4e8df5;color:#fff;font-size:13px;font-weight:900}.sidebar-note{display:none!important}@media(max-width:900px){.dh-classroom-student-label{justify-content:center;padding:8px 4px;font-size:0}.dh-classroom-student-label:before{margin:0}}";
document.head.append(style);

style.textContent += `
:root{--dh-side-collapsed:76px;--dh-side-expanded:236px;--dh-side-width:var(--dh-side-collapsed)}
body.dh-sidebar-expanded{--dh-side-width:var(--dh-side-expanded)}
.sidebar,.dh-classroom-sidebar{transition:width .32s cubic-bezier(.22,.75,.25,1),padding .32s cubic-bezier(.22,.75,.25,1)!important}
.dh-sidebar-toggle{width:30px;height:30px;flex:0 0 30px;align-self:flex-end;display:grid;place-items:center;border:1px solid #ffffff2a;border-radius:9px;background:#ffffff12;color:#fff;font-size:22px;line-height:1;cursor:pointer;transition:background .2s,transform .32s}
.dh-sidebar-toggle:hover{background:#ffffff25}
body>.app{display:block!important;margin-left:var(--dh-side-width)!important;transition:margin-left .32s cubic-bezier(.22,.75,.25,1)!important}
body>.app>.sidebar{position:fixed!important;inset:0 auto 0 0!important;width:var(--dh-side-width)!important;height:100dvh!important;min-height:100dvh!important;overflow:hidden!important;z-index:5000!important;transition:width .32s cubic-bezier(.22,.75,.25,1)!important}
body>.layout{grid-template-columns:var(--dh-side-width) minmax(0,1fr)!important;transition:grid-template-columns .32s cubic-bezier(.22,.75,.25,1)!important}
body>.layout>.sidebar{width:var(--dh-side-width)!important}
body>.app>.sidebar .brand-name,body>.app>.sidebar .nav-label,body>.app>.sidebar .profile-info,body>.layout>.sidebar .brand-name,body>.layout>.sidebar .nav-label,body>.layout>.sidebar .profile-info{display:none!important}
body.dh-sidebar-expanded>.app>.sidebar .brand-name,body.dh-sidebar-expanded>.app>.sidebar .nav-label,body.dh-sidebar-expanded>.app>.sidebar .profile-info,body.dh-sidebar-expanded>.layout>.sidebar .brand-name,body.dh-sidebar-expanded>.layout>.sidebar .nav-label,body.dh-sidebar-expanded>.layout>.sidebar .profile-info{display:initial!important}
body>.app>.sidebar .brand,body>.layout>.sidebar .brand{justify-content:center!important}
body.dh-sidebar-expanded>.app>.sidebar .brand,body.dh-sidebar-expanded>.layout>.sidebar .brand{justify-content:flex-start!important}
body>.app>.sidebar .nav a,body>.layout>.sidebar .nav a{justify-content:center!important}
body.dh-sidebar-expanded>.app>.sidebar .nav a,body.dh-sidebar-expanded>.layout>.sidebar .nav a{justify-content:flex-start!important}
body.dh-sidebar-expanded>.app>.sidebar,body.dh-sidebar-expanded>.layout>.sidebar{width:var(--dh-side-expanded)!important;padding:22px 14px!important}
@media(max-width:900px){:root{--dh-side-collapsed:68px;--dh-side-expanded:220px}}
@media(prefers-reduced-motion:reduce){.sidebar,.dh-classroom-sidebar,body>.app,body>.layout{transition:none!important}}
`;

try{document.body.dataset.classroomTheme=localStorage.getItem("classroomTheme")||"default";}catch(e){}
function addStudentSection(aside){
 const label=document.createElement("div");
 label.className="dh-classroom-student-label";
 label.textContent="Student";
 const profile=aside.querySelector(".profile,.dh-classroom-profile");
 const oldNote=aside.querySelector(".sidebar-note,.dh-classroom-note");
 if(oldNote)oldNote.remove();
 if(profile){profile.insertAdjacentElement("beforebegin",label);}
 else aside.append(label);
}
function installToggle(aside){
 if(aside.querySelector(".dh-sidebar-toggle"))return;
 const toggle=document.createElement("button");
 toggle.type="button";toggle.className="dh-sidebar-toggle";
 toggle.setAttribute("aria-label","Expand classroom sidebar");
 toggle.setAttribute("aria-expanded","false");
 toggle.innerHTML='<span aria-hidden="true">›</span>';
 toggle.addEventListener("click",()=>{
  const expanded=document.body.classList.toggle("dh-sidebar-expanded");
  toggle.setAttribute("aria-expanded",String(expanded));
  toggle.setAttribute("aria-label",expanded?"Collapse classroom sidebar":"Expand classroom sidebar");
  toggle.querySelector("span").textContent=expanded?"‹":"›";
 });
 aside.insertBefore(toggle,aside.firstChild);
}
function mount(){
 const existing=document.querySelector(".sidebar");
 if(existing){
  if(path==="community-classroom.html"||path==="class-chat.html"){
   addStudentSection(existing);
   const oldLink=[...existing.querySelectorAll("a")].find(a=>(a.querySelector(".nav-label")?.textContent||"").trim()==="My Class"||(a.textContent||"").trim()==="My Class");if(oldLink)oldLink.remove();
   installToggle(existing);
   return;
  }
 }
 if(document.querySelector(".dh-classroom-sidebar"))return;
 const aside=document.createElement("aside");aside.className="dh-classroom-sidebar";aside.setAttribute("aria-label","Classroom navigation");
 const brand=document.createElement("a");brand.className="dh-classroom-brand";brand.href="community-classroom.html";brand.innerHTML='<span class="dh-classroom-brand-mark">D</span><span class="dh-classroom-brand-name">DougHub</span>';
 const nav=document.createElement("nav");nav.className="dh-classroom-nav";nav.setAttribute("aria-label","Classroom pages");
 items.forEach(([href,label,glyph])=>{const a=document.createElement("a");a.href=href;a.innerHTML='<span class="dh-nav-icon" aria-hidden="true">'+glyph+'</span><span class="dh-nav-label">'+label+'</span>';if(path===href)a.classList.add("active");nav.append(a);});
 const profile=document.createElement("div");profile.className="dh-classroom-profile";profile.innerHTML='<span class="dh-classroom-avatar">DH</span><span class="dh-classroom-profile-copy"><strong>DougHub Student</strong><small>Student space</small></span>';
 aside.append(brand,nav,profile);addStudentSection(aside);document.body.prepend(aside);installToggle(aside);
 document.querySelectorAll(".classroom-top-links").forEach(el=>el.remove());
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();