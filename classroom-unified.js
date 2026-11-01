(function(){
"use strict";
const items=[
 ["community-classroom.html","Home","⌂"],
 ["classroom.html","My Class","▣"],
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
function mount(){
 if(path==="community-classroom.html"||path==="class-chat.html"){
  const existing=document.querySelector(".sidebar");
  if(existing)addStudentSection(existing);
  return;
 }
 if(document.querySelector(".dh-classroom-sidebar"))return;
 const aside=document.createElement("aside");aside.className="dh-classroom-sidebar";aside.setAttribute("aria-label","Classroom navigation");
 const brand=document.createElement("a");brand.className="dh-classroom-brand";brand.href="community-classroom.html";brand.innerHTML='<span class="dh-classroom-brand-mark">D</span><span class="dh-classroom-brand-name">DougHub</span>';
 const nav=document.createElement("nav");nav.className="dh-classroom-nav";nav.setAttribute("aria-label","Classroom pages");
 items.forEach(([href,label,glyph])=>{const a=document.createElement("a");a.href=href;a.innerHTML='<span class="dh-nav-icon" aria-hidden="true">'+glyph+'</span><span class="dh-nav-label">'+label+'</span>';if(path===href)a.classList.add("active");nav.append(a);});
 const profile=document.createElement("div");profile.className="dh-classroom-profile";profile.innerHTML='<span class="dh-classroom-avatar">DH</span><span class="dh-classroom-profile-copy"><strong>DougHub Student</strong><small>Student space</small></span>';
 aside.append(brand,nav,profile);addStudentSection(aside);document.body.prepend(aside);
 document.querySelectorAll(".classroom-top-links").forEach(el=>el.setAttribute("aria-hidden","true"));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();