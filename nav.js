(function () {
  "use strict";
  const API = "https://agsqdqcsmsppcdqxlppj.supabase.co/rest/v1/site_feature_flags?select=feature_key,enabled,display_name";
  const KEY = "sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52";
  const pathMap = {
    "douggames.html":"games","games/drive-pig.html":"games","games/dve-pig.html":"games",
    "games/pig-clicker.html":"games","games/pig-clicker-space.html":"games","games/puzzle.html":"games",
    "games/racing.html":"games","games/rebirth-clicker.html":"games","games/smack-n-punch.html":"games",
    "dougtube.html":"dougtube","dmail.html":"dmail","tools.html":"tools","nova.html":"nova",
    "chat.html":"chat","game-creator.html":"community_games","my-games.html":"community_games",
    "dougbase.html":"dougbase","dougbase/index.html":"dougbase","dougbase/login.html":"dougbase",
    "dougcode.html":"dougcode","scripting/scripting.html":"scripting","work.html":"work"
  };
  const labels = {
    games:"DougGames",dougtube:"DougTube",dmail:"DMail",tools:"DougTools",nova:"Nova AI",
    chat:"Community Chat",community_games:"Community Games",dougbase:"DougBase",
    dougcode:"DougCode",scripting:"Scripting Editor",work:"DougHub Work"
  };
  function pathKey() {
    return location.pathname.replace(/^\/+/, "").toLowerCase() || "index.html";
  }
  function featureForHref(href) {
    try {
      const u = new URL(href, location.href);
      const key = u.pathname.replace(/^\/+/, "").toLowerCase();
      return pathMap[key] || null;
    } catch (_) { return null; }
  }
  function addNavStyle() {
    if (document.getElementById("doughub-nova-nav-style")) return;
    const style = document.createElement("style");
    style.id = "doughub-nova-nav-style";
    style.textContent = `
      header .nav, header nav, nav[aria-label="Main navigation"] {
        display:flex; align-items:center; gap:8px; flex-wrap:wrap;
      }
      header .nav > a, header nav > a, nav[aria-label="Main navigation"] > a {
        display:inline-flex; align-items:center; justify-content:center;
        font-size:13px; line-height:1.25; text-decoration:none !important;
        padding:9px 12px !important; border:1px solid transparent;
        border-radius:10px !important; color:#d9dcf4 !important;
        background:transparent; white-space:nowrap;
        transition:background .18s ease,color .18s ease,border-color .18s ease;
      }
      header .nav > a:hover, header nav > a:hover, nav[aria-label="Main navigation"] > a:hover {
        background:#ffffff12 !important; color:#fff !important;
      }
      header .nav > a.active, header .nav > a[aria-current="page"],
      header nav > a.active, header nav > a[aria-current="page"],
      nav[aria-label="Main navigation"] > a.active,
      nav[aria-label="Main navigation"] > a[aria-current="page"] {
        background:#ffffff12 !important; color:#fff !important; border-color:#ffffff18 !important;
      }
      @media(max-width:760px) {
        header .nav, header nav, nav[aria-label="Main navigation"] { gap:6px; }
        header .nav > a, header nav > a, nav[aria-label="Main navigation"] > a {
          padding:8px 10px !important; font-size:12px;
        }
      }
    `;
    document.head.appendChild(style);
  }
  async function loadFlags() {
    try {
      const r = await fetch(API, { headers: { apikey: KEY, Authorization: "Bearer " + KEY, Accept: "application/json" }, cache: "no-store" });
      if (!r.ok) throw new Error("Feature flags unavailable");
      const rows = await r.json();
      const flags = {};
      rows.forEach(row => flags[row.feature_key] = row.enabled !== false);
      return flags;
    } catch (e) {
      console.warn("DougHub feature settings could not load; leaving pages available.", e);
      return null;
    }
  }
  function disabledUrl(feature) {
    return "/feature-disabled.html?feature=" + encodeURIComponent(feature);
  }
  function applyFlags(flags) {
    if (!flags) return;

    // Mark navigation links for accessibility, but enforce the setting globally.
    // This catches homepage cards/buttons and other page links as well as the header.
    document.querySelectorAll('a[href]').forEach(a => {
      const feature = featureForHref(a.getAttribute("href"));
      if (feature && flags[feature] === false) {
        a.setAttribute("aria-label", (labels[feature] || feature) + " (currently unavailable)");
        a.setAttribute("data-dh-disabled-feature", feature);
      }
    });

    // Capture phase runs before page-specific click handlers, including handlers
    // on cards and buttons that contain links. It blocks clicks only; direct URLs
    // and bookmarks remain accessible as requested.
    if (!document.documentElement.dataset.dhFeatureGuardInstalled) {
      document.documentElement.dataset.dhFeatureGuardInstalled = "true";
      document.addEventListener("click", function (event) {
        const target = event.target && event.target.closest
          ? event.target.closest('a[href], [data-href], [data-feature-href]')
          : null;
        if (!target) return;

        const href = target.matches('a[href]')
          ? target.getAttribute("href")
          : (target.getAttribute("data-href") || target.getAttribute("data-feature-href"));
        if (!href) return;

        const feature = featureForHref(href);
        if (feature && flags[feature] === false) {
          event.preventDefault();
          event.stopPropagation();
          if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
          location.href = disabledUrl(feature);
        }
      }, true);
    }
  }
  function removeRetiredNavLinks() {
    document.querySelectorAll("header .nav > a[href], header nav > a[href], nav[aria-label='Main navigation'] > a[href]").forEach(a => {
      const href = (a.getAttribute("href") || "").split(/[?#]/)[0].replace(/^\.\//, "").toLowerCase();
      if (href === "dmail.html" || href === "dougtube.html") a.remove();
    });
  }
  function markActiveLinks() {
    const current = pathKey();
    document.querySelectorAll("header .nav > a[href], header nav > a[href], nav[aria-label='Main navigation'] > a[href]").forEach(a => {
      const target = new URL(a.getAttribute("href"), location.href).pathname.split("/").filter(Boolean).join("/").toLowerCase();
      const isHome = (current === "" || current === "index.html") && (target === "" || target === "index.html");
      const active = isHome || target === current;
      a.classList.toggle("active", active);
      if (active) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }
  function start() {
    addNavStyle();
    removeRetiredNavLinks();
    markActiveLinks();
    loadFlags().then(applyFlags);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();