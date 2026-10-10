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

  async function enforcePageSchedule() {
    try {
      const currentPath = pathKey();
      const url = "https://agsqdqcsmsppcdqxlppj.supabase.co/rest/v1/site_page_schedules?select=page_path,display_name,enabled,close_at,reopen_at,closed_message&page_path=eq." + encodeURIComponent(currentPath);
      const response = await fetch(url, {
        headers: { apikey: KEY, Authorization: "Bearer " + KEY, Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) return;
      const rows = await response.json();
      const page = rows && rows[0];
      if (!page) return;
      const now = Date.now();
      const scheduledClosed = page.close_at && now >= new Date(page.close_at).getTime() &&
        (!page.reopen_at || now < new Date(page.reopen_at).getTime());
      if (page.enabled !== false && !scheduledClosed) return;

      // Keep the admin panel reachable so a scheduling mistake can always be undone.
      if (currentPath === "admin.html") return;

      const safe = value => String(value || "").replace(/[&<>"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
      const title = safe(page.display_name || "This page");
      const message = safe(page.closed_message || "This page is temporarily unavailable while we make updates.");
      document.documentElement.style.cssText = "min-height:100%;background:#050713;color:#f5f5ff";
      document.body.innerHTML = '<main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:Inter,system-ui,sans-serif;background:radial-gradient(circle at 20% 15%,#4338ca33,transparent 38%),radial-gradient(circle at 80% 85%,#9333ea22,transparent 35%),#050713"><section style="width:min(620px,100%);padding:clamp(24px,5vw,42px);border:1px solid #ffffff1a;border-radius:24px;background:#11152bd9;box-shadow:0 24px 90px #0006;text-align:center"><div style="font-size:38px;margin-bottom:12px">🛠️</div><div style="font-size:11px;letter-spacing:.18em;font-weight:800;color:#a5b4fc;margin-bottom:12px">DOUGHUB MAINTENANCE</div><h1 style="font-size:clamp(25px,5vw,38px);margin:0 0 12px;color:#fff">' + title + ' is temporarily closed</h1><p style="color:#b9bfd8;line-height:1.7;margin:0 auto 24px;max-width:460px;white-space:pre-wrap">' + message + '</p><a href="/index.html" style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none;color:white;font-weight:800;padding:11px 17px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#a855f7)">← Back to DougHub</a></section></main>';
      document.title = (page.display_name || "Page") + " · Temporarily Closed | DougHub";
    } catch (error) {
      console.warn("DougHub page schedule could not be checked; leaving the page available.", error);
    }
  }

  function start() {
    addNavStyle();
    removeRetiredNavLinks();
    markActiveLinks();
    loadFlags().then(applyFlags);
    enforcePageSchedule();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();