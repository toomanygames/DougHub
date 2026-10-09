(function(){
  const styleId="doughub-shared-nav-style";
  function apply(){
    if(!document.getElementById(styleId)){
      const s=document.createElement("style");s.id=styleId;
      s.textContent=`
        .nav:has(a[href="index.html"]),nav[aria-label="Main navigation"],header .nav:has(a[href="douggames.html"]),header nav.nav{
          display:flex!important;align-items:center!important;justify-content:flex-end;gap:8px!important;flex-wrap:wrap
        }
        .nav:has(a[href="index.html"]) a,nav[aria-label="Main navigation"] a,header .nav:has(a[href="douggames.html"]) a,header nav.nav a{
          display:inline-flex;align-items:center;justify-content:center;padding:9px 12px!important;border:1px solid transparent;border-radius:10px!important;color:#d9dcf4!important;background:transparent;text-decoration:none!important;font-size:13px;line-height:1.25;transition:background .18s ease,color .18s ease,border-color .18s ease
        }
        .nav:has(a[href="index.html"]) a:hover,nav[aria-label="Main navigation"] a:hover,header .nav:has(a[href="douggames.html"]) a:hover,header nav.nav a:hover{background:#ffffff12!important;color:#fff!important}
        .nav:has(a[href="index.html"]) a.active,.nav:has(a[href="index.html"]) a[aria-current="page"],nav[aria-label="Main navigation"] a[aria-current="page"]{background:#ffffff12!important;color:#fff!important;border-color:#ffffff18!important}
        @media(max-width:760px){.nav:has(a[href="index.html"]),nav[aria-label="Main navigation"],header .nav:has(a[href="douggames.html"]),header nav.nav{justify-content:flex-start;width:100%}}
      `;document.head.appendChild(s)
    }
    document.querySelectorAll('.nav,nav[aria-label="Main navigation"],header nav').forEach(nav=>{
      if(!nav.querySelector('a[href="index.html"],a[href="./"],a[href="douggames.html"],a[href="chat.html"]'))return;
      nav.querySelectorAll('a[href]').forEach(a=>{const h=(a.getAttribute("href")||"").split(/[?#]/)[0].toLowerCase();if(["dmail.html","./dmail.html","dougtube.html","./dougtube.html"].includes(h))a.remove()})
    })
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply);else apply();
})();