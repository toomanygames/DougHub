(function () {
  "use strict";
  // Every branded page loads this shared header controller through nav.js, so
  // global header spacing and icon sizing can be maintained in one file.
  const NAV_SCRIPT_URL = document.currentScript && document.currentScript.src
    ? document.currentScript.src
    : new URL("nav.js", location.href).href;
  // Ensure the shared DougHub tab notifications are active on pages that use
  // the common navigation but do not otherwise load display.js.
  if (!document.querySelector('script[src*="display.js"]')) {
    const sharedDisplay = document.createElement("script");
    sharedDisplay.src = "display.js";
    sharedDisplay.defer = true;
    document.head.appendChild(sharedDisplay);
  }
  const API = "https://agsqdqcsmsppcdqxlppj.supabase.co/rest/v1/site_feature_flags?select=feature_key,enabled,display_name";
  const KEY = "sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52";
  const pathMap = {
    "douggames.html":"games","games/drive-pig.html":"games","games/dve-pig.html":"games",
    "games/pig-clicker.html":"games","games/pig-clicker-space.html":"games","games/puzzle.html":"games",
    "games/racing.html":"games","games/rebirth-clicker.html":"games","games/smack-n-punch.html":"games",
    "dougtube.html":"dougtube","douqhub-music.html":"music","dmail.html":"dmail","tools.html":"tools","nova.html":"nova",
    "chat.html":"chat","game-creator.html":"community_games","my-games.html":"community_games",
    "dougbase.html":"dougbase","dougbase/index.html":"dougbase","dougbase/login.html":"dougbase",
    "dougcode.html":"dougcode","scripting/scripting.html":"scripting","work.html":"work"
  };
  const labels = {
    games:"DougGames",dougtube:"DougTube",music:"DougHub Music",dmail:"DMail",tools:"DougTools",nova:"Nova AI",
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
    if (document.getElementById("doughub-shared-nav-style")) return;
    const style = document.createElement("style");
    style.id = "doughub-shared-nav-style";
    style.textContent = `
      header {
        display:flex; align-items:center; justify-content:space-between;
        gap:16px; flex-wrap:wrap; position:relative; z-index:1000;
      }
      header .nav, header nav[aria-label="Main navigation"] {
        display:flex; align-items:center; justify-content:flex-end;
        gap:8px; flex-wrap:wrap; min-width:0;
      }
      header .nav > a, header nav[aria-label="Main navigation"] > a, header.top>nav.nav>a {
        display:inline-flex; align-items:center; justify-content:center;
        gap:5px; font-size:13px; line-height:1.25; text-decoration:none !important;
        padding:9px 12px !important; border:1px solid transparent;
        border-radius:10px !important; color:#d9dcf4 !important;
        background:transparent; white-space:nowrap;
        transition:background .18s ease,color .18s ease,border-color .18s ease,transform .18s ease;
      }
      header .nav > a:hover, header nav[aria-label="Main navigation"] > a:hover, header.top>nav.nav>a:hover {
        background:#ffffff12 !important; color:#fff !important; transform:translateY(-1px);
      }
      header .nav > a.active, header .nav > a[aria-current="page"],
      header nav[aria-label="Main navigation"] > a.active,
      header nav[aria-label="Main navigation"] > a[aria-current="page"] {
        background:#ffffff12 !important; color:#fff !important; border-color:#ffffff18 !important;
      }
      .dh-shared-account { position:relative; flex:0 0 auto; margin-left:2px; }
      .dh-shared-account .account-btn {
        display:flex;align-items:center;gap:9px;padding:7px 11px;border-radius:12px;
        color:#fff;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);
        cursor:pointer;font:inherit;white-space:nowrap;transition:background .18s ease,border-color .18s ease;
      }
      .dh-shared-account .account-btn:hover { background:rgba(255,255,255,.09);border-color:#ffffff20; }
      .dh-shared-account .account-avatar {
        width:32px;height:32px;flex:0 0 32px;border-radius:50%;overflow:hidden;
        background:linear-gradient(135deg,#6366f1,#a855f7);display:flex;align-items:center;
        justify-content:center;font-weight:800;color:white;
      }
      .dh-shared-account .account-avatar img { width:100%;height:100%;object-fit:cover; }
      .dh-shared-account .account-menu {
        position:absolute;right:0;top:calc(100% + 10px);width:210px;padding:8px;
        border-radius:14px;background:rgba(12,13,28,.97);border:1px solid rgba(255,255,255,.1);
        box-shadow:0 20px 60px rgba(0,0,0,.4);backdrop-filter:blur(20px);
        display:block;opacity:0;visibility:hidden;transform:translateY(-7px) scale(.98);
        transform-origin:top right;transition:opacity .18s ease,transform .18s ease,visibility .18s;
        z-index:99999;
      }
      .dh-shared-account .account-menu.show {
        opacity:1;visibility:visible;transform:translateY(0) scale(1);
      }
      .dh-shared-account .account-menu a,.dh-shared-account .account-menu button {
        display:block;width:100%;padding:10px 12px;text-align:left;color:#d8d7e5;
        background:transparent;border:0;border-radius:9px;cursor:pointer;text-decoration:none;
        font:inherit;font-size:13px;
      }
      .dh-shared-account .account-menu a:hover,.dh-shared-account .account-menu button:hover {
        background:rgba(255,255,255,.07);color:white;
      }
      .dh-shared-account .logout { color:#ff7777 !important; }
      @media(max-width:900px) {
        header { align-items:flex-start; }
        header .nav, header nav[aria-label="Main navigation"] { justify-content:flex-start; gap:6px; }
        header .nav > a, header nav[aria-label="Main navigation"] > a { padding:8px 10px !important;font-size:12px; }
      }
      @media(max-width:600px) {
        header { gap:10px; }
        header .nav, header nav[aria-label="Main navigation"] { width:100%;justify-content:flex-start; }
        .dh-shared-account .account-btn { padding:5px 8px;gap:6px; }
        .dh-shared-account .account-avatar { width:28px;height:28px;flex-basis:28px; }
        .dh-shared-account .account-menu { right:auto;left:0;transform-origin:top left; }
      }
    `;
    document.head.appendChild(style);
  }
  const MAIN_NAV_PAGES = new Set([
    "index.html",
    "douggames.html",
    "tools.html",
    "nova.html",
    "dougtube.html",
    "douqhub-music.html",
    "dmail.html"
  ]);

  function normalizePrimaryNav() {
    // The shared navigation belongs only on DougHub's main destinations.
    // Keep focused tools such as chat, coding, game creation, and individual games
    // with their own page-specific headers instead of adding cross-site tabs there.
    const current = pathKey();
    if (!MAIN_NAV_PAGES.has(current)) return;

    const header = document.querySelector("header");
    if (!header) return;

    let nav = header.querySelector(".nav, nav[aria-label='Main navigation']");
    if (!nav) {
      nav = document.createElement("nav");
      nav.className = "nav";
      nav.setAttribute("aria-label", "Main navigation");
      const oldAccount = header.querySelector(".account-area, .dh-shared-account");
      if (oldAccount && oldAccount.parentElement === header) header.insertBefore(nav, oldAccount);
      else header.appendChild(nav);
    }
    nav.setAttribute("aria-label", "Main navigation");

    // Reuse an existing account area wherever the page placed it; otherwise create
    // the same profile/account menu used by the homepage.
    let account = header.querySelector(".account-area, .dh-shared-account");
    if (!account) {
      account = document.createElement("div");
      account.className = "account-area dh-shared-account";
      account.innerHTML = `
        <button id="accountButton" class="account-btn" type="button" aria-haspopup="true" aria-expanded="false">
          <div id="accountAvatar" class="account-avatar">?</div><span id="accountName">Log In</span>
        </button>
        <div id="accountMenu" class="account-menu" aria-hidden="true">
          <a href="my-games.html">My Games &amp; Videos</a>
          <a href="admin.html" id="adminLink" style="display:none">Admin Panel</a>
          <a href="inbox.html" id="feedbackInboxLink" style="display:none">Feedback</a>
          <a href="settings.html">Settings</a>
          <button id="logoutButton" class="logout" type="button">Log Out</button>
        </div>`;
    }
    account.classList.add("dh-shared-account");

    const links = [
      ["index.html", "Home", "home"],
      ["douggames.html", "Games", "games"],
      ["tools.html", "Tools", "tools"],
      ["nova.html", "✳ Nova AI", "nova"],
      ["chat.html", "Chat", "chat"]
    ];
    nav.querySelectorAll(":scope > a").forEach(a => a.remove());
    links.forEach(([href, label, feature]) => {
      const a = document.createElement("a");
      a.href = href;
      a.className = "nav-link";
      a.textContent = label;
      a.dataset.dhPrimaryNav = feature;
      if (feature === "chat") {
        a.id = "communityChatLink";
        const dot = document.createElement("span");
        dot.id = "chatNotification";
        dot.className = "chat-notification";
        dot.setAttribute("aria-label", "New chat messages");
        a.appendChild(dot);
      }
      nav.appendChild(a);
    });
    nav.appendChild(account);

    // These pages have their own working homepage-style account controller.
    const pageAlreadyBindsAccount = ["index.html", "douggames.html", "dougtube.html"].includes(current);
    if (!pageAlreadyBindsAccount && !account.dataset.dhAccountBound) {
      account.dataset.dhAccountBound = "true";
      const button = account.querySelector("#accountButton");
      const menu = account.querySelector("#accountMenu");
      const logout = account.querySelector("#logoutButton");
      const setOpen = open => {
        menu?.classList.toggle("show", open);
        menu?.setAttribute("aria-hidden", String(!open));
        button?.setAttribute("aria-expanded", String(open));
      };
      button?.addEventListener("click", async event => {
        event.preventDefault();
        event.stopPropagation();
        const client = await getNavSupabase();
        if (!client) { location.href = "log-in.html"; return; }
        const { data: { session } } = await client.auth.getSession();
        if (!session) { location.href = "log-in.html"; return; }
        setOpen(!menu?.classList.contains("show"));
      });
      document.addEventListener("click", event => {
        if (!event.target.closest(".dh-shared-account")) setOpen(false);
      });
      document.addEventListener("keydown", event => {
        if (event.key === "Escape") setOpen(false);
      });
      logout?.addEventListener("click", async event => {
        event.preventDefault();
        event.stopPropagation();
        const client = await getNavSupabase();
        if (client) await client.auth.signOut();
        location.reload();
      });
      loadNavAccount();
    }
  }

  function removeRetiredNavLinks() {
    // Nova has its own compact page navigation. Do not silently remove its
    // DougTube link; the generic retired-link cleanup is for other page headers.
    if (pathKey() === "nova.html") return;
    document.querySelectorAll("header .nav > a[href], header nav > a[href], nav[aria-label='Main navigation'] > a[href]").forEach(a => {
      const href = (a.getAttribute("href") || "").split(/[?#]/)[0].replace(/^\.\//, "").toLowerCase();
      if (href === "dmail.html") a.remove();
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
    if (document.documentElement.dataset.dhPageClosed === "true") return;
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
      document.documentElement.dataset.dhPageClosed = "true";
      document.documentElement.style.cssText = "min-height:100%;background:#050713;color:#f5f5ff";
      document.body.innerHTML = '<main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:Inter,system-ui,sans-serif;background:radial-gradient(circle at 20% 15%,#4338ca33,transparent 38%),radial-gradient(circle at 80% 85%,#9333ea22,transparent 35%),#050713"><section style="width:min(620px,100%);padding:clamp(24px,5vw,42px);border:1px solid #ffffff1a;border-radius:24px;background:#11152bd9;box-shadow:0 24px 90px #0006;text-align:center"><div style="font-size:38px;margin-bottom:12px">🛠️</div><div style="font-size:11px;letter-spacing:.18em;font-weight:800;color:#a5b4fc;margin-bottom:12px">DOUGHUB MAINTENANCE</div><h1 style="font-size:clamp(25px,5vw,38px);margin:0 0 12px;color:#fff">' + title + ' is temporarily closed</h1><p style="color:#b9bfd8;line-height:1.7;margin:0 auto 24px;max-width:460px;white-space:pre-wrap">' + message + '</p><a href="/index.html" style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none;color:white;font-weight:800;padding:11px 17px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#a855f7)">← Back to DougHub</a></section></main>';
      document.title = (page.display_name || "Page") + " · Temporarily Closed | DougHub";
    } catch (error) {
      console.warn("DougHub page schedule could not be checked; leaving the page available.", error);
    }
  }

  function start() {
    addNavStyle();
    normalizePrimaryNav();
    removeRetiredNavLinks();
    markActiveLinks();
    loadFlags().then(applyFlags);
    enforcePageSchedule();
    window.setInterval(enforcePageSchedule, 30000);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") enforcePageSchedule();
    });
  }
  function startAfterSharedHeader() {
    const existing = document.getElementById("dh-shared-header-script");
    if (existing) {
      if (existing.dataset.loaded === "true") start();
      else existing.addEventListener("load", start, { once: true });
      return;
    }
    const sharedHeader = document.createElement("script");
    sharedHeader.id = "dh-shared-header-script";
    sharedHeader.src = new URL("header.js", NAV_SCRIPT_URL).href;
    sharedHeader.onload = function () {
      sharedHeader.dataset.loaded = "true";
      start();
    };
    sharedHeader.onerror = start;
    document.head.appendChild(sharedHeader);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startAfterSharedHeader);
  else startAfterSharedHeader();
})();