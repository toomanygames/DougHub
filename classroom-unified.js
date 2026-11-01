(function(){
"use strict";
const items=[
 ["community-classroom.html","Home","M0 3h18v18H0z M5 21v-7h8v7 M7 3v5h4V3"],
 ["classroom.html","My Class","M3 4h18v16H3z M7 8h10 M7 12h10 M7 16h6"],
 ["class-chat.html","Class Chat","M3 4h18v13H8l-5 4z M7 9h10 M7 13h6"],
 ["classroom-dms.html","Chat & DMs","M4 5h16v11H9l-5 4z M8 9h8 M8 12h5"],
 ["classroom-community.html","Community","M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5"],
 ["classroom-games.html","Games","M3 7h18v12H3z M8 11v4 M6 13h4 M16 12h.01 M18 15h.01"],
 ["classroom-create.html","Create","M12 4v16 M4 12h16"],
 ["classroom-dictionary.html","Dictionary","M4 4h16v16H4z M8 8h8 M8 12h6 M8 16h8"],
 ["classroom-tools.html","Student Tools","M4 5h16v14H4z M8 9h8 M8 13h5"],
 ["classroom-settings.html","Settings","M12 3v2 M12 19v2 M3 12h2 M19 12h2 M5.6 5.6 7 7 M17 17l1.4 1.4 M18.4 5.6 17 7 M7 17l-1.4 1.4 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0"]
];
const path=(location.pathname.split("/").pop()||"community-classroom.html").toLowerCase();
const icon=d=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+d+'"/></svg>';
function mount(){
 if(document.querySelector(".dh-classroom-sidebar"))return;
 const aside=document.createElement("aside");aside.className="dh-classroom-sidebar";aside.setAttribute("aria-label","Classroom navigation");
 const brand=document.createElement("a");brand.className="dh-classroom-brand";brand.href="community-classroom.html";brand.innerHTML='<span class="dh-classroom-brand-mark">D</span><span>DougHub<small>CLASSROOM</small></span>';
 const nav=document.createElement("nav");nav.className="dh-classroom-nav";nav.setAttribute("aria-label","Classroom pages");
 items.forEach(([href,label,d])=>{const a=document.createElement("a");a.href=href;a.innerHTML=icon(d)+"<span>"+label+"</span>";if(path===href)a.classList.add("active");nav.append(a);});
 const divider=document.createElement("div");divider.className="dh-classroom-divider";
 const extra=document.createElement("div");extra.className="dh-classroom-extra";
 [["classroom-teacher.html","Teacher Studio"],["classroom-guide.html","Classroom Guide"]].forEach(([href,label])=>{const a=document.createElement("a");a.href=href;a.textContent=label;extra.append(a);});
 const note=document.createElement("div");note.className="dh-classroom-note";note.innerHTML="<strong>Your class, together.</strong><span>A shared place to learn, create, play and talk with your class.</span>";
 const profile=document.createElement("div");profile.className="dh-sidebar-profile";profile.innerHTML='<span class="dh-profile-dot">D</span><span class="dh-profile-copy"><strong>DougHub Classroom</strong><span>Private class space</span></span>';
 aside.append(brand,nav,divider,extra,note,profile);document.body.prepend(aside);
 document.querySelectorAll(".classroom-top-links").forEach(el=>el.setAttribute("aria-hidden","true"));
 document.body.classList.add("dh-classroom-unified");
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();