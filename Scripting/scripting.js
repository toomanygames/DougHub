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
function restore(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");if(saved&&saved.files){files={...STARTERS,...saved.files};blocks=Array.isArray(saved.blocks)?saved.blocks:[];$("projectName").value=saved.projectName||"My Community Game";activeFile=Object.prototype.hasOwnProperty.call(files,saved.activeFile)?saved.activeFile:"html";}}catch(e){console.warn("Could not restore local project",e);}}
function fileLabel(key){return ({html:"index.html",css:"style.css",js:"main.js"})[key]||key;}
function renderFileTabs(){const host=$("fileTabs");if(!host)return;host.innerHTML="";Object.keys(files).forEach(key=>{const btn=document.createElement("button");btn.type="button";btn.className="file-tab"+(key===activeFile?" active":"");btn.dataset.file=key;btn.title=fileLabel(key);const label=document.createElement("span");label.textContent=fileLabel(key);btn.appendChild(label);if(!["html","css","js"].includes(key)){const remove=document.createElement("span");remove.className="remove-file";remove.textContent="×";remove.title="Remove "+key;remove.setAttribute("role","button");remove.setAttribute("aria-label","Remove "+key);remove.addEventListener("click",e=>{e.stopPropagation();if(!confirm("Remove "+key+" from this project?"))return;delete files[key];if(activeFile===key)activeFile="html";renderFile();persist();});btn.appendChild(remove);}host.appendChild(btn);});}
function renderFile(){renderFileTabs();$("activeFileLabel").textContent=fileLabel(activeFile);$("codeEditor").value=files[activeFile]||"";updateLineCount();}
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
async function loadAccount(){const label=$("accountLabel");if(!label)return;try{const client=dbClient||(dbClient=window.supabase?.createClient("https://agsqdqcsmsppcdqxlppj.supabase.co","sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52"));if(!client){label.textContent="Local project";return;}const {data:{session}}=await client.auth.getSession();if(!session){label.textContent="Local project";return;}const {data}=await client.from("profiles").select("username").eq("id",session.user.id).maybeSingle();label.textContent=data?.username?"@"+data.username:"Signed in";}catch(e){label.textContent="Local project";}}
$("fileTabs").addEventListener("click",e=>{const btn=e.target.closest(".file-tab");if(btn)switchFile(btn.dataset.file);});
$("addFileBtn").addEventListener("click",()=>{$("newFileName").value="";$("newFileType").value=".js";$("addFileDialog").showModal();$("newFileName").focus();});
$("cancelAddFile").addEventListener("click",()=>$("addFileDialog").close());
$("addFileForm").addEventListener("submit",e=>{e.preventDefault();const ext=$("newFileType").value;let name=$("newFileName").value.trim().replace(/[^a-zA-Z0-9._-]/g,"-").replace(/^\.+|\.+$/g,"");if(!name){$("newFileName").focus();return;}if(name.toLowerCase().endsWith(ext))name=name.slice(0,-ext.length);name+=ext;if(Object.prototype.hasOwnProperty.call(files,name)){setStatus("A file with that name already exists.",true);return;}const starters={".html":"<!doctype html>\n<html><body><h1>New page</h1></body></html>",".css":"/* Add your styles here */\n",".js":"// Add your JavaScript here\n",".ts":"// TypeScript source file\n",".json":"{\n  \"name\": \"my-game\"\n}",".py":"# Python source file\n",".java":"public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, game!\");\n    }\n}",".c":"#include <stdio.h>\n\nint main(void) {\n    printf(\"Hello, game!\\n\");\n    return 0;\n}",".cpp":"#include <iostream>\nint main() { std::cout << \"Hello, game!\\n\"; }\n",".cs":"using System;\nclass Program { static void Main() { Console.WriteLine(\"Hello, game!\"); } }\n",".php":"<?php\necho \"Hello, game!\";\n",".sql":"-- SQL script\n",".sh":"#!/bin/sh\necho \"Hello, game!\"\n",".lua":"print(\"Hello, game!\")\n",".xml":"<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<root />\n",".svg":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"#8b5cf6\"/></svg>\n",".md":"# Project notes\n",".txt":"",".csv":"name,value\n",".yaml":"name: my-game\n",".toml":"name = \"my-game\"\n"};files[name]=starters[ext]??"";activeFile=name;renderFile();persist();$("addFileDialog").close();setStatus("Created "+name);});
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

/* Community Games publishing: playable output goes to Doug Games' community_games table. */
let communityDb=null,communityUser=null,communityUsername="Creator";
function communitySetStatus(message,isError=false){const el=$("communityPublishStatus");if(el){el.textContent=message;el.classList.toggle("error",!!isError);}}
async function communityInit(){
  const create=window.supabase?.createClient;
  if(!create){communitySetStatus("Community Games could not connect to Supabase.",true);return;}
  communityDb=dbClient||(dbClient=create("https://agsqdqcsmsppcdqxlppj.supabase.co","sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52"));
  try{
    const {data:{session},error}=await communityDb.auth.getSession();
    if(error)throw error;
    communityUser=session?.user||null;
    if(!communityUser){communitySetStatus("Sign in to publish your game to Community Games.",true);return;}
    const {data:profile}=await communityDb.from("profiles").select("username").eq("id",communityUser.id).maybeSingle();
    communityUsername=profile?.username||communityUser.user_metadata?.username||communityUser.email?.split("@")[0]||"Creator";
    communitySetStatus("Ready to publish as "+communityUsername+".");
  }catch(e){console.error("Community Games setup failed:",e);communitySetStatus("Couldn't check your sign-in. Refresh and try again.",true);}
}
async function communityPublish(){
  if(!communityDb||!communityUser){communitySetStatus("Please sign in, then refresh DougCode before publishing.",true);return;}
  saveCurrentFile();
  const title=($("communityTitle").value.trim()||$("projectName").value.trim()).slice(0,80);
  const description=$("communityDescription").value.trim().slice(0,500);
  if(!title){communitySetStatus("Add a game title before publishing.",true);$("communityTitle").focus();return;}
  if(!description){communitySetStatus("Add a short game description before publishing.",true);$("communityDescription").focus();return;}
  const button=$("publishProjectBtn");button.disabled=true;button.textContent="Publishing…";
  try{
    const payload={title,description,author:communityUsername,category:"Arcade",code:buildDocument(),creator_id:communityUser.id};
    const {error}=await communityDb.from("community_games").insert(payload);
    if(error)throw error;
    communitySetStatus("Published! Your game is now in Doug Games → Community Games. It may take a refresh to appear.");
    setStatus("Game published to Community Games");
  }catch(e){console.error("Community Game publish failed:",e);communitySetStatus("Couldn't publish: "+(e.message||"check your connection and try again"),true);}
  finally{button.disabled=false;button.textContent="Publish to Community Games";}
}
$("publishProjectBtn").addEventListener("click",communityPublish);
communityInit();
restore();renderFile();renderLibrary();renderBlocks();updateGenerated();loadAccount();
})();
