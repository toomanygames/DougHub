(function(){
"use strict";
const URL="https://agsqdqcsmsppcdqxlppj.supabase.co";
const KEY="sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52";
async function client(){
 for(let i=0;i<100;i++){
  if(window.DougHubSupabaseClient?.auth&&window.DougHubSupabaseClient?.from)return window.DougHubSupabaseClient;
  await new Promise(r=>setTimeout(r,100));
 }
 if(window.supabase?.createClient)return window.DougHubSupabaseClient=window.supabase.createClient(URL,KEY);
 throw new Error("DougHub could not connect to the classroom database. Refresh and try again.");
}
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const initials=s=>String(s||"?").trim().slice(0,1).toUpperCase();
const niceTime=s=>new Date(s).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
window.DHClassroom={client,esc,initials,niceTime};
})();