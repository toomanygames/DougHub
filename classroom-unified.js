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
if(!document.querySelector('script[data-dh-classroom-theme]')){
 const themeScript=document.createElement("script");themeScript.src="/classroom-theme.js?v=3";themeScript.defer=true;themeScript.dataset.dhClassroomTheme="1";document.head.appendChild(themeScript);
}
async function addTeacherPanel(nav){
 if(!nav||document.querySelector('a[href="class-chat-teacher.html"]'))return;
 try{
  let db=window.DougHubSupabaseClient;
  if(!db&&window.supabase?.createClient)db=window.DougHubSupabaseClient=window.supabase.createClient("https://agsqdqcsmsppcdqxlppj.supabase.co","sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52");
  if(!db)return;
  const {data:{user}}=await db.auth.getUser();if(!user)return;
  const {data:p}=await db.from("profiles").select("account_type,teacher_verified,is_owner,staff_role").eq("id",user.id).maybeSingle();
  const role=String(p?.staff_role||"").toLowerCase(),owner=p?.is_owner===true||role==="owner";
  if(!owner&&!(p?.account_type==="teacher"&&p?.teacher_verified===true))return;
  const a=document.createElement("a");a.href="/class-chat-teacher.html";a.dataset.dhTeacherPanel="1";
  const nativeNav=nav.classList.contains("nav");
  a.innerHTML='<span class="'+(nativeNav?"nav-icon":"dh-nav-icon")+'" aria-hidden="true">⚒</span><span class="'+(nativeNav?"nav-label":"dh-nav-label")+'">Teacher Panel</span>';
  nav.appendChild(a);
 }catch(e){console.warn("Teacher panel navigation unavailable",e);}
}
const css=`
:root{--dh-classroom-sidebar-width:236px}
html,body{min-height:100%;width:100%;max-width:100%;overflow-x:hidden}
.dh-classroom-sidebar,.dh-classroom-native-sidebar{
 position:fixed!important;z-index:5000!important;top:0!important;left:0!important;right:auto!important;bottom:0!important;
 width:236px!important;height:100vh!important;height:100dvh!important;min-height:0!important;max-height:100dvh!important;
 overflow-y:auto!important;overflow-x:hidden!important;display:flex!important;flex-direction:column!important;
 padding:22px 14px!important;gap:22px!important;background:linear-gradient(165deg,#1b2d4d,#12213b)!important;
 color:#fff!important;box-sizing:border-box!important;transform:none!important;transition:none!important;
}
.dh-classroom-sidebar{border:0!important}
.dh-classroom-brand{display:flex!important;align-items:center!important;gap:10px!important;padding:0 7px!important;flex:none!important;color:#fff!important;text-decoration:none!important;font:900 21px Nunito,sans-serif!important}
.dh-classroom-brand-mark{width:36px!important;height:36px!important;flex:0 0 36px!important;border-radius:11px!important;background:var(--classroom-accent,#4e8df5)!important;display:grid!important;place-items:center!important;color:#fff!important;font-size:19px!important;font-weight:900!important}
.dh-classroom-nav{display:grid!important;grid-auto-rows:min-content!important;gap:5px!important;flex:none!important;min-height:0!important;overflow:visible!important}
.dh-classroom-nav a{display:flex!important;align-items:center!important;gap:12px!important;width:100%!important;min-height:38px!important;padding:10px 12px!important;border:0!important;border-radius:8px!important;background:transparent!important;color:#d7e1f1!important;text-decoration:none!important;font-size:12px!important;font-weight:700!important;white-space:nowrap!important;box-shadow:none!important}
.dh-classroom-nav a:hover,.dh-classroom-nav a.active{background:#ffffff19!important;color:#fff!important}
.dh-classroom-nav .dh-nav-icon{width:18px!important;flex:0 0 18px!important;text-align:center!important;color:#b8c9e2!important;font-size:15px!important}
.dh-classroom-profile{display:flex!important;gap:9px!important;align-items:center!important;margin-top:auto!important;padding:10px 7px 4px!important;flex:none!important;color:#fff!important;border-top:1px solid #ffffff18!important}
.dh-classroom-avatar{width:33px!important;height:33px!important;flex:0 0 33px!important;border-radius:50%!important;display:grid!important;place-items:center!important;background:#e7efff!important;color:#3977cf!important;font-size:10px!important;font-weight:900!important}
.dh-classroom-profile strong{display:block!important;font-size:10px!important;color:#fff!important}
.dh-classroom-profile small{font-size:9px!important;color:#b9c9df!important}
.dh-classroom-student-label,.dh-sidebar-toggle{display:none!important}
/* Native home/chat sidebars use the exact same fixed geometry as generated sidebars. */
.dh-classroom-native-sidebar .brand,.dh-classroom-native-sidebar .brand-name{display:flex!important;align-items:center!important}
.dh-classroom-native-sidebar .brand-name,.dh-classroom-native-sidebar .nav-label,.dh-classroom-native-sidebar .profile-info{display:initial!important}
.dh-classroom-native-sidebar .nav{display:grid!important;grid-auto-rows:min-content!important;gap:5px!important;overflow:visible!important;flex:none!important}
.dh-classroom-native-sidebar .nav a{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:12px!important;width:100%!important;min-height:38px!important;padding:10px 12px!important;white-space:nowrap!important}
.dh-classroom-native-sidebar .profile{margin-top:auto!important;flex:none!important}
body>.app,body>.layout{display:block!important;position:relative!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:0!important;overflow:visible!important}
body>.app>.sidebar,body>.layout>.sidebar{position:fixed!important;top:0!important;left:0!important;right:auto!important;bottom:0!important;width:236px!important;height:100vh!important;height:100dvh!important;min-height:0!important;z-index:5000!important}
body>.app>main,body>.layout>main{display:block!important;position:relative!important;width:calc(100% - 236px)!important;max-width:none!important;min-width:0!important;margin:0 0 0 236px!important;padding-left:clamp(12px,2vw,28px)!important;padding-right:clamp(12px,2vw,28px)!important;box-sizing:border-box!important}
body>.app>main{min-height:100vh}
body>.layout>main{height:100dvh;min-height:0;overflow:hidden}
body>.shell{max-width:none!important;width:calc(100% - 236px)!important;margin:0 0 0 236px!important;padding-left:clamp(12px,2vw,28px)!important;padding-right:clamp(12px,2vw,28px)!important;box-sizing:border-box!important}
body>main:not(.app main):not(.layout main){width:calc(100% - 236px)!important;max-width:none!important;margin:0 0 0 236px!important;padding-left:clamp(12px,2vw,28px)!important;padding-right:clamp(12px,2vw,28px)!important;box-sizing:border-box!important}
body>header{display:none!important}
body .classroom-top-links{display:none!important}
@media(max-width:900px){
 :root{--dh-classroom-sidebar-width:220px}
 .dh-classroom-sidebar,.dh-classroom-native-sidebar,body>.app>.sidebar,body>.layout>.sidebar{width:220px!important;padding:18px 12px!important}
 body>.app>main,body>.layout>main,body>.shell,body>main:not(.app main):not(.layout main){width:calc(100% - 220px)!important;margin-left:220px!important;padding-left:12px!important;padding-right:12px!important}
}
@media(max-width:560px){
 .dh-classroom-sidebar,.dh-classroom-native-sidebar,body>.app>.sidebar,body>.layout>.sidebar{padding:14px 9px!important}
 body>.app>main,body>.layout>main,body>.shell,body>main:not(.app main):not(.layout main){padding-left:9px!important;padding-right:9px!important}
}
`;
function mount(){
 let style=document.getElementById("dh-classroom-layout-fix");
 if(!style){style=document.createElement("style");style.id="dh-classroom-layout-fix";document.head.append(style);}
 style.textContent=css;
 const native=document.querySelector("body>.app>.sidebar,body>.layout>.sidebar");
 if(native){
  native.classList.add("dh-classroom-native-sidebar");
  native.querySelectorAll(".dh-classroom-student-label,.dh-sidebar-toggle").forEach(el=>el.remove());
  const oldLink=[...native.querySelectorAll("a")].find(a=>(a.querySelector(".nav-label")?.textContent||"").trim()==="My Class"||(a.textContent||"").trim()==="My Class");
  if(oldLink)oldLink.remove();
  const nativeBrand=native.querySelector(".brand");if(nativeBrand)nativeBrand.href="/dashboard.html";
  addTeacherPanel(native.querySelector(".nav"));
  return;
 }
 if(document.querySelector(".dh-classroom-sidebar"))return;
 const aside=document.createElement("aside");aside.className="dh-classroom-sidebar";aside.setAttribute("aria-label","Classroom navigation");
 const brand=document.createElement("a");brand.className="dh-classroom-brand";brand.href="/dashboard.html";brand.innerHTML='<span class="dh-classroom-brand-mark">D</span><span class="dh-classroom-brand-name">DougHub</span>';
 const nav=document.createElement("nav");nav.className="dh-classroom-nav";nav.setAttribute("aria-label","Classroom pages");
 items.forEach(([href,label,glyph])=>{const a=document.createElement("a");a.href=href;a.innerHTML='<span class="dh-nav-icon" aria-hidden="true">'+glyph+'</span><span class="dh-nav-label">'+label+'</span>';if(path===href)a.classList.add("active");nav.append(a);});
 addTeacherPanel(nav);
 const profile=document.createElement("div");profile.className="dh-classroom-profile";profile.innerHTML='<span class="dh-classroom-avatar">DH</span><span class="dh-classroom-profile-copy"><strong>DougHub</strong><small>Classroom</small></span>';
 aside.append(brand,nav,profile);document.body.prepend(aside);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();