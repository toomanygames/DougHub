(function(){"use strict";const KEY="doughub-seasonal-theme-v1";const themes={
normal:{name:"Normal",holiday:"Classic DougHub",title:"Your DougHub, your way.",description:"The classic DougHub experience, just as you know it.",icon:"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='M4 12 12 4l8 8v8H4z'/><path d='M9 20v-6h6v6'/></svg>"},
spring:{name:"Spring",holiday:"Easter · Spring",title:"A fresh season to create.",description:"A brighter DougHub with garden-inspired details, fresh colors, and a little springtime magic.",icon:"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='M12 20V9'/><path d='M12 14c-5 0-8-3-8-8 5 0 8 3 8 8Z'/><path d='M12 11c0-5 3-8 8-8 0 5-3 8-8 8Z'/></svg>"},
summer:{name:"Summer",holiday:"Summer · Independence Day",title:"Make some noise this summer.",description:"Electric blues, sunset reds, and an energetic summer-arcade atmosphere.",icon:"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><circle cx='12' cy='12' r='4'/><path d='M12 2v2m0 16v2M4.9 4.9l1.5 1.5m11.2 11.2 1.5 1.5M2 12h2m16 0h2M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5'/></svg>"},
autumn:{name:"Autumn",holiday:"Autumn · Halloween",title:"Welcome to the darker side.",description:"Moonlit plum, glowing amber, and a Halloween atmosphere across your DougHub pages.",icon:"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='M12 3v3c-5-2-9 2-9 7a8 8 0 0 0 18 0c0-5-4-9-9-7Z'/><path d='M8 12h.01M16 12h.01M9 16c2 1 4 1 6 0'/></svg>"},
winter:{name:"Winter",holiday:"Winter · Christmas & New Year",title:"A little winter wonder.",description:"Frosted blues, evergreen tones, warm gold highlights, and a festive winter-night look.",icon:"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8'><path d='M12 2v20M4 7l16 10M4 17 20 7M8 4l4 2 4-2M8 20l4-2 4 2'/></svg>"}};
const PALETTE_KEY="doughub-custom-palette-v1";
const defaultPalette={bg:"#080a16",accent:"#6366f1",accent2:"#a855f7",panel:"#11152b"};
const valid=v=>Object.hasOwn(themes,v)||v==="custom"?v:"normal";
function readPalette(){try{const p=JSON.parse(localStorage.getItem(PALETTE_KEY)||"null");const clean={};for(const k of Object.keys(defaultPalette)){const v=p&&p[k];clean[k]=typeof v==="string"&&/^#[0-9a-f]{6}$/i.test(v)?v:defaultPalette[k]}return clean}catch(_){return {...defaultPalette}}}
function savePalette(p){const clean={};for(const k of Object.keys(defaultPalette)){clean[k]=typeof p?.[k]==="string"&&/^#[0-9a-f]{6}$/i.test(p[k])?p[k]:defaultPalette[k]}try{localStorage.setItem(PALETTE_KEY,JSON.stringify(clean))}catch(_){}return clean}
function stored(){try{return valid(localStorage.getItem(KEY)||"normal")}catch(_){return"normal"}}const paletteOriginals=new WeakMap();
function repaintLegacySurfaces(){
 const mode=valid(document.documentElement.dataset.dhTheme||stored());
 const root=getComputedStyle(document.documentElement);
 const accent=root.getPropertyValue("--season-accent").trim()||"#818cf8";
 const accent2=root.getPropertyValue("--season-accent2").trim()||"#c084fc";
 const soft=mode==="spring"?"rgba(142,227,173,.13)":mode==="summer"?"rgba(101,200,255,.13)":mode==="autumn"?"rgba(255,173,85,.13)":"rgba(139,217,255,.13)";
 const panel=mode==="spring"?"rgba(17,38,34,.94)":mode==="summer"?"rgba(9,24,48,.94)":mode==="autumn"?"rgba(31,17,28,.95)":"rgba(9,25,43,.95)";
 const raised=mode==="spring"?"rgba(24,55,43,.96)":mode==="summer"?"rgba(16,40,70,.96)":mode==="autumn"?"rgba(48,24,42,.96)":"rgba(16,40,58,.96)";
 const isPurple=(s)=>/(?:#(?:6366f1|6d5dfc|7c3aed|8b5cf6|a855f7|818cf8|a78bfa|7c3aed)|rgba?\(\s*(?:99\s*,\s*102\s*,\s*241|124\s*,\s*58\s*,\s*237|168\s*,\s*85\s*,\s*247|129\s*,\s*140\s*,\s*248|139\s*,\s*92\s*,\s*246))/i.test(s||"");
 const rgb=hex=>{const h=String(hex).replace("#","");return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)].join(",")};
 const replaceRgb=(s,re,hex)=>String(s||"").replace(re,(all,a)=>{const v=rgb(hex);return /^rgba/i.test(all)?"rgba("+v+","+(a===undefined?"1":a)+")":"rgb("+v+")"});
 const mappedImage=(s)=>{let out=String(s||"");out=replaceRgb(out,/rgba?\(\s*99\s*,\s*102\s*,\s*241\s*(?:,\s*([\d.]+))?\s*\)/gi,accent);out=replaceRgb(out,/rgba?\(\s*124\s*,\s*58\s*,\s*237\s*(?:,\s*([\d.]+))?\s*\)/gi,accent2);out=replaceRgb(out,/rgba?\(\s*168\s*,\s*85\s*,\s*247\s*(?:,\s*([\d.]+))?\s*\)/gi,accent2);out=replaceRgb(out,/rgba?\(\s*129\s*,\s*140\s*,\s*248\s*(?:,\s*([\d.]+))?\s*\)/gi,accent);out=replaceRgb(out,/rgba?\(\s*139\s*,\s*92\s*,\s*246\s*(?:,\s*([\d.]+))?\s*\)/gi,accent2);return out.replace(/#6366f1/gi,accent).replace(/#7c3aed/gi,accent2).replace(/#8b5cf6/gi,accent2).replace(/#a855f7/gi,accent2).replace(/#818cf8/gi,accent).replace(/#a78bfa/gi,accent2)};
 const nodes=document.querySelectorAll("body *");
 for(const el of nodes){
  if(!(el instanceof HTMLElement)||el.closest("#dhsc-panel,#dhsc-tab,#dhsc-shade,.dh-theme-picker,.dh-seasonal-banner"))continue;
  let original=paletteOriginals.get(el);
  if(!original){
   const cs=getComputedStyle(el);
   original={backgroundColor:cs.backgroundColor,backgroundImage:cs.backgroundImage,inlineColor:el.style.backgroundColor,inlineImage:el.style.backgroundImage};
   paletteOriginals.set(el,original);
  }
  if(mode==="normal"){
   if(el.dataset.dhLegacyPalette==="1"){el.style.backgroundColor=original.inlineColor;el.style.backgroundImage=original.inlineImage;delete el.dataset.dhLegacyPalette;}
   continue;
  }
  const cs=getComputedStyle(el), bg=cs.backgroundColor, image=original.backgroundImage;
  const purpleBg=isPurple(original.backgroundColor)||isPurple(bg);
  const purpleImage=isPurple(image);
  if(!purpleBg&&!purpleImage)continue;
  if(purpleBg){
   const match=String(original.backgroundColor||bg).match(/rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)(?:[, /]+\s*([\d.]+))?/i);
   const alpha=match&&match[4]!==undefined?Number(match[4]):1;
   el.style.setProperty("background-color",alpha<.42?soft:(alpha<.78?panel:raised),"important");
  }
  if(purpleImage)el.style.setProperty("background-image",mappedImage(image),"important");
  el.dataset.dhLegacyPalette="1";
 }
}
let repaintQueued=false;
function queueLegacyRepaint(){if(repaintQueued)return;repaintQueued=true;requestAnimationFrame(()=>{repaintQueued=false;repaintLegacySurfaces()})}
function render(){document.getElementById("dh-seasonal-banner")?.remove();queueLegacyRepaint();}function apply(v,save){
 v=valid(v);const root=document.documentElement;root.dataset.dhTheme=v;
 const palette=readPalette();
 if(v==="custom"){
  root.style.setProperty("--season-bg",palette.bg);
  root.style.setProperty("--season-accent",palette.accent);
  root.style.setProperty("--season-accent2",palette.accent2);
  root.style.setProperty("--season-panel",palette.panel);
  root.style.setProperty("--season-glow","color-mix(in srgb, "+palette.accent+" 22%, transparent)");
  root.style.setProperty("--season-line","color-mix(in srgb, "+palette.accent+" 24%, transparent)");
  root.style.setProperty("--season-muted","#b7bdd4");
  root.style.setProperty("--bg",palette.bg);
  root.style.setProperty("--panel",palette.panel);
  root.style.setProperty("--panel2","color-mix(in srgb, "+palette.panel+" 78%, "+palette.accent+")");
  root.style.setProperty("--line","color-mix(in srgb, "+palette.accent+" 24%, transparent)");
  root.style.setProperty("--muted","#b7bdd4");
  root.style.setProperty("--indigo",palette.accent);
  root.style.setProperty("--purple",palette.accent2);
  root.style.setProperty("--cyan",palette.accent2);
 }else{
  ["--season-bg","--season-accent","--season-accent2","--season-glow","--season-line","--season-panel","--season-muted"].forEach(k=>root.style.removeProperty(k));
  ["--bg","--panel","--panel2","--line","--muted","--indigo","--purple","--cyan"].forEach(k=>root.style.removeProperty(k));
 }
 const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=v==="custom"?palette.bg:({normal:"#050611",spring:"#081611",summer:"#06101f",autumn:"#130b13",winter:"#06101b"})[v];
 if(save!==false)try{localStorage.setItem(KEY,v)}catch(_){}
 render(v);document.dispatchEvent(new CustomEvent("douqhub:seasonal-theme-changed",{detail:{theme:v,palette}}));return v
}function client(){try{if(typeof supabaseClient!=="undefined"&&supabaseClient)return supabaseClient}catch(_){}return null}async function sync(){const c=client();if(!c||!c.auth||!c.from)return;try{const a=await c.auth.getUser(),u=a?.data?.user;if(!u)return;const r=await c.from("profiles").select("seasonal_theme").eq("id",u.id).maybeSingle();if(!r.error&&r.data){const v=valid(r.data.seasonal_theme);apply(v,false);try{localStorage.setItem(KEY,v)}catch(_){}}}catch(e){console.debug("Seasonal preference sync unavailable:",e?.message||e)}}window.DougHubSeasonalTheme={themes,getTheme:()=>valid(document.documentElement.dataset.dhTheme||stored()),getPalette:readPalette,savePalette,apply,refresh:()=>render(valid(document.documentElement.dataset.dhTheme||stored()))};apply(stored(),false);if(!window.__dhLegacyPaletteObserver){window.__dhLegacyPaletteObserver=new MutationObserver(()=>queueLegacyRepaint());window.__dhLegacyPaletteObserver.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["class","hidden"]});}window.addEventListener("load",queueLegacyRepaint,{once:true});if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{render(valid(document.documentElement.dataset.dhTheme||stored()));sync()},{once:true});else{render(valid(document.documentElement.dataset.dhTheme||stored()));sync()}})();