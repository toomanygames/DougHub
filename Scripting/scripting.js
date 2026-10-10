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
function restore(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");if(saved&&saved.files){files={...STARTERS,...saved.files};blocks=Array.isArray(saved.blocks)?saved.blocks:[];$("projectName").value=saved.projectName||"My Coding Project";activeFile=["html","css","js"].includes(saved.activeFile)?saved.activeFile:"html";}}catch(e){console.warn("Could not restore local project",e);}}
function renderFile(){document.querySelectorAll(".file-tab").forEach(b=>b.classList.toggle("active",b.dataset.file===activeFile));$("activeFileLabel").textContent=({html:"index.html",css:"style.css",js:"main.js"})[activeFile];$("codeEditor").value=files[activeFile]||"";updateLineCount();}
function updateLineCount(){const code=$("codeEditor").value;$("lineCount").textContent=(code.split("\n").length)+" line"+(code.split("\n").length===1?"":"s");}
function switchFile(file){saveCurrentFile();activeFile=file;renderFile();persist();}
function saveCurrentFile(){files[activeFile]=$("codeEditor").value;updateLineCount();persist();}
function buildDocument(){const html=files.html||"";const css=files.css||"";const js=files.js||"";return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<style>\n'+css+'\n</style>\n</head>\n<body>\n'+html+'\n<script>\n'+js.replace(/<\/script/gi,"<\\/script")+'\n</script>\n</body>\n</html>';}
function runPreview(){saveCurrentFile();const frame=$("previewFrame");frame.srcdoc=buildDocument();$("previewEmpty").hidden=true;$("previewStatus").textContent="Preview refreshed at "+new Date().toLocaleTimeString();setStatus("Preview updated");}
function setMode(mode){currentMode=mode;document.querySelectorAll(".mode-btn").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));$("codeMode").hidden=mode!=="code";$("blocksMode").hidden=mode!=="blocks";if(mode==="blocks"){renderLibrary();renderBlocks();}else renderFile();persist();}
function addBlock(type){const def=BLOCKS.find(b=>b.type===type);if(!def)return;const fields={};def.fields.forEach(([name,value])=>fields[name]=value);blocks.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random(),type,fields});renderBlocks();updateGenerated();persist();}
function renderLibrary(){const box=$("blockLibrary");box.innerHTML="";const q=$("blockSearch").value.trim().toLowerCase();const found=BLOCKS.filter(b=>(activeCategory==="all"||b.cat===activeCategory)&&(b.label+" "+b.cat+" "+b.fields.map(x=>x[0]).join(" ")).toLowerCase().includes(q));if(!found.length){box.innerHTML='<div class="block-empty">No blocks match that search.</div>';return;}found.forEach(def=>{const btn=document.createElement("button");btn.type="button";btn.className="scratch-block "+def.cat;btn.textContent=def.label;btn.draggable=true;btn.title="Click or drag this block into your script";btn.addEventListener("click",()=>addBlock(def.type));btn.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/plain",def.type);e.dataTransfer.effectAllowed="copy";});box.appendChild(btn);});}
function blockCode(block){const def=BLOCKS.find(b=>b.type===block.type);if(!def)return "// Unknown block";const fields={};def.fields.forEach(([name,value])=>fields[name]=value);Object.assign(fields,block.fields||{});try{return def.code(fields);}catch(e){return "// Could not generate this block";}}
function renderBlocks(){const box=$("blockWorkspace");box.innerHTML="";if(!blocks.length){const empty=document.createElement("div");empty.className="workspace-empty";empty.innerHTML='<span>🧩</span><b>Your script starts here</b><p>Add an event or statement block to begin.</p>';box.appendChild(empty);return;}blocks.forEach((block,index)=>{const def=BLOCKS.find(b=>b.type===block.type);if(!def)return;const row=document.createElement("div");row.className="code-block "+def.cat;row.draggable=true;row.dataset.index=String(index);const title=document.createElement("span");title.textContent=def.label;row.appendChild(title);(def.fields||[]).forEach(([name,defaultValue])=>{const input=document.createElement("input");input.value=(block.fields&&block.fields[name])??defaultValue;input.setAttribute("aria-label",name);input.title=name;input.addEventListener("input",()=>{block.fields=block.fields||{};block.fields[name]=input.value;updateGenerated();persist();});row.appendChild(input);});const remove=document.createElement("button");remove.type="button";remove.className="block-remove";remove.textContent="×";remove.title="Remove block";remove.setAttribute("aria-label","Remove "+def.label);remove.addEventListener("click",()=>{blocks.splice(index,1);renderBlocks();updateGenerated();persist();});row.appendChild(remove);row.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/plain",String(index));e.dataTransfer.setData("application/x-doughub-block","move");row.classList.add("dragging");});row.addEventListener("dragend",()=>row.classList.remove("dragging"));row.addEventListener("dragover",e=>e.preventDefault());row.addEventListener("drop",e=>{e.preventDefault();const moving=Number(e.dataTransfer.getData("text/plain"));if(e.dataTransfer.getData("application/x-doughub-block")==="move"&&Number.isInteger(moving)&&moving!==index&&moving>=0&&moving<blocks.length){const [item]=blocks.splice(moving,1);blocks.splice(index,0,item);renderBlocks();updateGenerated();persist();}});box.appendChild(row);});}
function updateGenerated(){const code=blocks.map(blockCode).join("\n\n");$("generatedCode").textContent=code||"// Add blocks to generate JavaScript.";if(blocks.length)files.js=code;persist();}
function saveProject(){saveCurrentFile();persist();setStatus("Project saved in this browser");}
function download(filename,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportHTML(){saveCurrentFile();const name=($("projectName").value.trim()||"my-project").replace(/[^a-z0-9-_]+/gi,"-").replace(/^-|-$/g,"").slice(0,60)||"my-project";download(name+".html",buildDocument(),"text/html;charset=utf-8");setStatus("Standalone HTML exported");}
async function copyCurrent(){saveCurrentFile();try{await navigator.clipboard.writeText(files[activeFile]);setStatus("Copied current file");}catch(e){$("codeEditor").focus();$("codeEditor").select();setStatus("Press Ctrl+C to copy the selected code");}}
async function loadAccount(){try{const client=dbClient||(dbClient=window.supabase?.createClient("https://agsqdqcsmsppcdqxlppj.supabase.co","sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52"));if(!client){$("accountLabel").textContent="Local project";return;}const {data:{session}}=await client.auth.getSession();if(!session){$("accountLabel").textContent="Local project";return;}const {data}=await client.from("profiles").select("username").eq("id",session.user.id).maybeSingle();$("accountLabel").textContent=data?.username?"@"+data.username:"Signed in";}catch(e){$("accountLabel").textContent="Local project";}}
document.querySelectorAll(".file-tab").forEach(btn=>btn.addEventListener("click",()=>switchFile(btn.dataset.file)));
$("codeEditor").addEventListener("input",()=>{saveCurrentFile();});
$("codeEditor").addEventListener("keydown",e=>{if(e.key==="Tab"){e.preventDefault();const el=e.currentTarget,start=el.selectionStart,end=el.selectionEnd;el.setRangeText("  ",start,end,"end");saveCurrentFile();}if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();runPreview();}});
document.querySelectorAll(".mode-btn").forEach(btn=>btn.addEventListener("click",()=>setMode(btn.dataset.mode)));
$("runBtn").addEventListener("click",runPreview);
$("resetBtn").addEventListener("click",()=>{$("previewFrame").srcdoc="";$("previewEmpty").hidden=false;$("previewStatus").textContent="Preview reset";setStatus("Preview reset");});
$("saveBtn").addEventListener("click",saveProject);
$("downloadBtn").addEventListener("click",exportHTML);
$("copyCodeBtn").addEventListener("click",copyCurrent);
$("projectName").addEventListener("input",persist);
$("blockSearch").addEventListener("input",renderLibrary);
$("blockCategories").addEventListener("click",e=>{const btn=e.target.closest("[data-category]");if(!btn)return;activeCategory=btn.dataset.category;document.querySelectorAll(".category").forEach(b=>b.classList.toggle("active",b===btn));renderLibrary();});
$("blockWorkspace").addEventListener("dragover",e=>{e.preventDefault();e.currentTarget.classList.add("drop-target");});
$("blockWorkspace").addEventListener("dragleave",e=>{if(!e.currentTarget.contains(e.relatedTarget))e.currentTarget.classList.remove("drop-target");});
$("blockWorkspace").addEventListener("drop",e=>{e.preventDefault();e.currentTarget.classList.remove("drop-target");const type=e.dataTransfer.getData("text/plain");if(e.dataTransfer.getData("application/x-doughub-block")==="move")return;if(BLOCKS.some(b=>b.type===type))addBlock(type);});
$("generateBtn").addEventListener("click",()=>{updateGenerated();setStatus("JavaScript generated from blocks");});
$("clearBlocksBtn").addEventListener("click",()=>{blocks=[];renderBlocks();updateGenerated();setStatus("Block workspace cleared");});
$("viewGeneratedBtn").addEventListener("click",()=>{if(!blocks.length){setStatus("Add blocks first to generate JavaScript",true);return;}files.js=$("generatedCode").textContent;activeFile="js";renderFile();setMode("code");$("codeEditor").focus();});
$("openPreviewBtn").addEventListener("click",()=>{saveCurrentFile();const w=window.open("about:blank","_blank");if(!w){setStatus("Allow pop-ups to open the preview",true);return;}w.document.open();w.document.write(buildDocument());w.document.close();setStatus("Preview opened in a new tab");});

/* Community Projects — saved in the existing code_projects table. */
let communityDb=null, communityUser=null, communityRows=[], selectedCommunityProject=null, editingCommunityId=null;
function communitySetStatus(message,isError=false){const el=$("communityPublishStatus");if(el){el.textContent=message;el.classList.toggle("error",!!isError);}}
function communitySafeName(value){return String(value||"my-project").replace(/[^a-z0-9-_]+/gi,"-").replace(/^-|-$/g,"").slice(0,60)||"my-project";}
function communityDocument(project){
  const h=String(project.html_code||"");
  const c=String(project.css_code||"");
  const j=String(project.js_code||"").replace(/<\/script/gi,"<\\/script");
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+c+'</style></head><body>'+h+'<script>'+j+'</script></body></html>';
}
function communityAllCode(project){
  return "// "+String(project.title||"Community Project")+"\n\n/* index.html */\n"+String(project.html_code||"")+"\n\n/* style.css */\n"+String(project.css_code||"")+"\n\n/* main.js */\n"+String(project.js_code||"");
}
function communityCanCopy(p){return !!communityUser&&p.owner_id===communityUser.id||!!p.allow_copy;}
function communityCanDownload(p){return !!communityUser&&p.owner_id===communityUser.id||!!p.allow_download;}
function communityRender(){
  const box=$("communityProjectSlider"); if(!box)return;
  const q=String($("communitySearch").value||"").trim().toLowerCase();
  const items=communityRows.filter(p=>!q||String(p.title||"").toLowerCase().includes(q)||String(p.description||"").toLowerCase().includes(q)||String(p.runtime||"web").toLowerCase().includes(q));
  box.replaceChildren();
  if(!items.length){const empty=document.createElement("div");empty.className="community-loading";empty.textContent=communityRows.length?"No projects match that search.":"No public projects yet. Be the first to publish one!";box.appendChild(empty);}
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
    const preview=document.createElement("button");preview.type="button";preview.className="btn primary";preview.textContent="▶ Preview";preview.addEventListener("click",()=>communityOpenPreview(p));actions.appendChild(preview);
    if(communityCanCopy(p)){const b=document.createElement("button");b.type="button";b.className="btn";b.textContent="Copy code";b.addEventListener("click",()=>communityCopy(p));actions.appendChild(b);}
    if(communityCanDownload(p)){const b=document.createElement("button");b.type="button";b.className="btn";b.textContent="Download";b.addEventListener("click",()=>communityDownload(p));actions.appendChild(b);}
    if(communityUser&&p.owner_id===communityUser.id){const b=document.createElement("button");b.type="button";b.className="btn";b.textContent="Edit";b.addEventListener("click",()=>communityLoadIntoEditor(p));actions.appendChild(b);}
    card.append(top,actions);box.appendChild(card);
  });
  $("communityProjectCount").textContent=items.length+" project"+(items.length===1?"":"s");
}
async function communityLoad(){
  const box=$("communityProjectSlider");box.innerHTML='<div class="community-loading">Loading community projects…</div>';
  try{
    const {data:{session}}=await communityDb.auth.getSession();communityUser=session?.user||null;
    const {data,error}=await communityDb.from("code_projects").select("id,owner_id,title,description,visibility,allow_copy,allow_download,html_code,css_code,js_code,files,entry_file,runtime,created_at,updated_at").eq("visibility","public").order("updated_at",{ascending:false}).limit(100);
    if(error)throw error;communityRows=data||[];communityRender();
  }catch(e){console.error("Community Projects failed to load:",e);box.innerHTML='<div class="community-loading">Could not load projects. Please refresh and try again.</div>';$("communityProjectCount").textContent="Projects unavailable";}
}
async function communityCopy(p){
  if(!communityCanCopy(p)){communitySetStatus("The creator has disabled code copying.",true);return;}
  try{await navigator.clipboard.writeText(communityAllCode(p));communitySetStatus("Project source copied.");}
  catch(e){const area=document.createElement("textarea");area.value=communityAllCode(p);area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();const ok=document.execCommand("copy");area.remove();communitySetStatus(ok?"Project source copied.":"Couldn't copy automatically. Please try again.",!ok);}
}
function communityDownload(p){
  if(!communityCanDownload(p)){communitySetStatus("The creator has disabled downloads.",true);return;}
  const blob=new Blob([communityDocument(p)],{type:"text/html;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=communitySafeName(p.title)+".html";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function communityOpenPreview(p){
  selectedCommunityProject=p;
  $("communityPreviewTitle").textContent=p.title||"Untitled project";
  $("communityPreviewDescription").textContent=p.description||"No description provided.";
  $("communityPreviewPermissions").textContent=(p.allow_copy?"Code copying allowed":"Code copying disabled")+" · "+(p.allow_download?"Downloads allowed":"Downloads disabled");
  $("communityPreviewAuthor").textContent=(p.owner_id===communityUser?.id?"Your project":"Community project")+" · "+(p.runtime||"web");
  $("communityPreviewFrame").srcdoc=communityDocument(p);
  $("communityCopyCodeBtn").hidden=!communityCanCopy(p);
  $("communityDownloadBtn").hidden=!communityCanDownload(p);
  $("editCommunityProjectBtn").hidden=!(communityUser&&p.owner_id===communityUser.id);
  const dlg=$("communityPreviewDialog");if(!dlg.open)dlg.showModal();
}
function communityLoadIntoEditor(p){
  if(!communityUser||p.owner_id!==communityUser.id)return;
  editingCommunityId=p.id;
  files.html=String(p.html_code||STARTERS.html);files.css=String(p.css_code||STARTERS.css);files.js=String(p.js_code||"");
  $("projectName").value=p.title||"My Coding Project";$("communityTitle").value=p.title||"";$("communityDescription").value=p.description||"";
  $("communityAllowCopy").checked=!!p.allow_copy;$("communityAllowDownload").checked=!!p.allow_download;
  activeFile="html";renderFile();persist();setMode("code");communitySetStatus("Editing your published project. Publish again to save changes.");
  $("communityProjects").scrollIntoView({behavior:"smooth",block:"start"});
}
async function communityPublish(){
  if(!communityDb||!communityUser){communitySetStatus("Please sign in again, then refresh this page.",true);return;}
  saveCurrentFile();
  const title=$("communityTitle").value.trim()||$("projectName").value.trim();
  const description=$("communityDescription").value.trim();
  if(!title){communitySetStatus("Add a project title before publishing.",true);$("communityTitle").focus();return;}
  const button=$("publishProjectBtn");button.disabled=true;button.textContent="Publishing…";
  const payload={owner_id:communityUser.id,title:title.slice(0,80),description:description.slice(0,500),visibility:"public",allow_copy:$("communityAllowCopy").checked,allow_download:$("communityAllowDownload").checked,html_code:files.html||"",css_code:files.css||"",js_code:files.js||"",files:[{name:"index.html",type:"html",content:files.html||""},{name:"style.css",type:"css",content:files.css||""},{name:"main.js",type:"js",content:files.js||""}],entry_file:"index.html",runtime:"web"};
  try{
    let q=communityDb.from("code_projects");
    if(editingCommunityId)q=q.update(payload).eq("id",editingCommunityId).eq("owner_id",communityUser.id);
    else q=q.insert(payload);
    const {data,error}=await q.select("id,owner_id,title,description,visibility,allow_copy,allow_download,html_code,css_code,js_code,files,entry_file,runtime,created_at,updated_at").single();
    if(error)throw error;
    editingCommunityId=data.id;selectedCommunityProject=data;
    $("projectName").value=title;persist();communitySetStatus("Published! Your project is now in Community Projects.");await communityLoad();communityOpenPreview(data);
  }catch(e){console.error("Project publish failed:",e);communitySetStatus("Couldn't publish: "+(e.message||"check your connection and try again"),true);}
  finally{button.disabled=false;button.textContent=editingCommunityId?"Update published project":"Publish to Community Projects";}
}
function communityInit(){
  const create=window.supabase?.createClient;
  if(!create){communitySetStatus("Community Projects could not connect to Supabase.",true);$("communityProjectSlider").textContent="Community Projects are unavailable right now.";return;}
  communityDb=dbClient||(dbClient=create("https://agsqdqcsmsppcdqxlppj.supabase.co","sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52"));
  $("communitySearch").addEventListener("input",communityRender);
  $("refreshCommunityBtn").addEventListener("click",communityLoad);
  $("publishProjectBtn").addEventListener("click",communityPublish);
  $("communityPrev").addEventListener("click",()=>$("communityProjectSlider").scrollBy({left:-500,behavior:"smooth"}));
  $("communityNext").addEventListener("click",()=>$("communityProjectSlider").scrollBy({left:500,behavior:"smooth"}));
  $("closeCommunityPreview").addEventListener("click",()=>$("communityPreviewDialog").close());
  $("communityPreviewDialog").addEventListener("click",e=>{if(e.target===$("communityPreviewDialog"))$("communityPreviewDialog").close();});
  $("communityCopyCodeBtn").addEventListener("click",()=>selectedCommunityProject&&communityCopy(selectedCommunityProject));
  $("communityDownloadBtn").addEventListener("click",()=>selectedCommunityProject&&communityDownload(selectedCommunityProject));
  $("editCommunityProjectBtn").addEventListener("click",()=>{if(selectedCommunityProject){$("communityPreviewDialog").close();communityLoadIntoEditor(selectedCommunityProject);}});
  $("communityTitle").addEventListener("input",()=>{if(!editingCommunityId)$("publishProjectBtn").textContent="Publish to Community Projects";});
  communityLoad();
}

restore();renderFile();renderLibrary();renderBlocks();updateGenerated();loadAccount();communityInit();
})();