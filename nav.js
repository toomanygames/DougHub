(function () {
  "use strict";
  // Every branded page loads this shared header controller through nav.js, so
  // global header spacing and icon sizing can be maintained in one file.
  const NAV_SCRIPT_URL = document.currentScript && document.currentScript.src
    ? document.currentScript.src
    : new URL("nav.js", location.href).href;

  // Paint the last known account label before any asynchronous Supabase checks
  // finish, so page-to-page navigation does not flash "Log In" for signed-in users.
  (function primeCachedAccountLabel() {
    try {
      const cached = JSON.parse(sessionStorage.getItem("dh-account-display-v1") || "null");
      if (!cached || !cached.name || cached.name === "Log In") return;
      const paint = () => {
        const name = document.getElementById("accountName");
        const avatar = document.getElementById("accountAvatar");
        if (!name || !avatar) return false;
        name.textContent = cached.name;
        if (cached.avatarUrl) {
          let img = avatar.querySelector("img");
          if (!img) {
            img = document.createElement("img");
            img.alt = "Profile";
            avatar.replaceChildren(img);
          }
          img.src = cached.avatarUrl;
        } else if (cached.avatarText) {
          avatar.textContent = cached.avatarText;
        }
        return true;
      };
      if (!paint() && document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", paint, { once: true });
      }
    } catch (_) {}
  })();
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
      .chat-notification {
        display:none;width:9px;height:9px;flex:0 0 9px;margin-left:3px;
        border-radius:50%;background:#ff3b5c;box-shadow:0 0 0 3px #ff3b5c22,0 0 12px #ff3b5c99;
        vertical-align:middle;animation:dh-chat-dot-pulse 1.8s ease-in-out infinite;
      }
      .chat-notification.is-unread { display:inline-block; }
      @keyframes dh-chat-dot-pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
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
  const MAIN_NAV_PAGES = new Set(["index.html", "douggames.html", "tools.html", "nova.html", "dougtube.html", "douqhub-music.html", "scripting/scripting.html"]);

  function normalizePrimaryNav() {
    const current = pathKey();
    if (!MAIN_NAV_PAGES.has(current)) return;
    const header = document.querySelector("header");
    if (!header) return;

    let brand = header.querySelector(":scope > .logo, :scope > a.logo, :scope > .brand, :scope > a.brand");
    if (!brand) {
      brand = document.createElement("a");
      brand.className = "logo";
      brand.href = "/index.html";
      brand.innerHTML = '<span class="logo-icon">D</span><span class="dh-wordmark-base">DougHub</span>';
      header.prepend(brand);
    } else {
      brand.classList.add("dh-wordmark");
      const label = Array.from(brand.children).find(el => !el.matches(".logo-icon,.logo-mark,.brand-icon,.brand-mark,.icon"));
      if (label) {
        const raw = (label.textContent || "").replace(/\s+/g, " ").trim();
        if (/^DougHub/i.test(raw)) {
          const suffix = raw.replace(/^(?:DougHub\s*[-:]?\s*)+/i, "").trim();
          label.replaceChildren();
          const base = document.createElement("span");
          base.className = "dh-wordmark-base";
          base.textContent = "DougHub";
          label.appendChild(base);
          if (suffix) {
            const extra = document.createElement("span");
            extra.className = "dh-wordmark-suffix";
            extra.textContent = suffix;
            label.appendChild(extra);
          }
        }
      }
    }

    let nav = header.querySelector(":scope > .nav, :scope > nav[aria-label='Main navigation']");
    if (!nav) {
      nav = document.createElement("nav");
      nav.className = "nav";
      header.appendChild(nav);
    }
    nav.className = "nav";
    nav.setAttribute("aria-label", "Main navigation");

    let account = header.querySelector(".account-area, .dh-shared-account");
    if (!account) {
      account = document.createElement("div");
      account.className = "account-area";
      account.innerHTML = '<button id="accountButton" class="account-btn" type="button" aria-haspopup="true" aria-expanded="false"><div id="accountAvatar" class="account-avatar">?</div><span id="accountName">Loading…</span></button><div id="accountMenu" class="account-menu" aria-hidden="true"><a href="/my-games.html">My Games &amp; Videos</a><a href="/admin.html" id="adminLink" style="display:none">Admin Panel</a><a href="/inbox.html" id="feedbackInboxLink" style="display:none">Feedback</a><a href="/settings.html">Settings</a><button id="logoutButton" class="logout" type="button">Log Out</button></div>';
    }
    account.classList.add("dh-shared-account");
    const links = [["/index.html","Home"],["/douggames.html","Games"],["/tools.html","Tools"],["/nova.html","✳ Nova AI"],["/chat.html","Chat"]];
    nav.replaceChildren();
    links.forEach(([href,label]) => {
      const a = document.createElement("a");
      a.href = href;
      a.className = "nav-link";
      a.textContent = label;
      if (href === "/chat.html") {
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

    if (!account.dataset.dhAccountBound) {
      account.dataset.dhAccountBound = "true";
      const button = account.querySelector("#accountButton");
      const menu = account.querySelector("#accountMenu");
      const logout = account.querySelector("#logoutButton");
      const setOpen = open => {
        menu?.classList.toggle("show", open);
        menu?.setAttribute("aria-hidden", String(!open));
        button?.setAttribute("aria-expanded", String(open));
      };
      // Open the menu immediately. Waiting for Supabase here made the button
      // appear broken when auth was slow or unavailable, and redirected guests
      // before they could see the account menu.
      // Capture the click before page-specific legacy account handlers. Several
      // pages had their own toggle handler, which cancelled this one out.
      button?.addEventListener("click", event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        setOpen(!menu?.classList.contains("show"));
      }, true);
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
    }
    loadNavAccount();
  }


  // Reuse display.js's authenticated Supabase client rather than creating another
  // GoTrueClient, preventing session races and a permanently stuck account label.
  async function getNavSupabase() {
    if (window.DougHubSupabaseClient) return window.DougHubSupabaseClient;
    if (window.__dhNavClientPromise) return window.__dhNavClientPromise;
    window.__dhNavClientPromise = new Promise(resolve => {
      let done = false;
      let timer;
      const finish = client => {
        if (done) return;
        done = true;
        window.removeEventListener("douqhub:supabase-ready", onReady);
        clearTimeout(timer);
        resolve(client || null);
      };
      const onReady = () => finish(window.DougHubSupabaseClient || null);
      window.addEventListener("douqhub:supabase-ready", onReady);
      if (window.DougHubSupabaseClient) finish(window.DougHubSupabaseClient);
      timer = setTimeout(() => finish(window.DougHubSupabaseClient || null), 10000);
    });
    return window.__dhNavClientPromise;
  }

  async function loadNavAccount() {
    const name = document.getElementById("accountName");
    const avatar = document.getElementById("accountAvatar");
    const adminLink = document.getElementById("adminLink");
    const feedbackLink = document.getElementById("feedbackInboxLink");
    if (!name || !avatar) return;
    try {
      const client = await getNavSupabase();
      if (!client) { name.textContent = "Log In"; avatar.textContent = "?"; return; }
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      const session = data && data.session;
      if (!session || !session.user) {
        name.textContent = "Log In";
        avatar.textContent = "?";
        try { sessionStorage.removeItem("dh-account-display-v1"); } catch (_) {}
        if (adminLink) adminLink.style.display = "none";
        if (feedbackLink) feedbackLink.style.display = "none";
        return;
      }
      const user = session.user;
      let profile = null;
      const result = await client.from("profiles").select("username,avatar_url,is_admin")
        .eq("id", user.id).maybeSingle();
      if (!result.error) profile = result.data;
      const username = profile?.username || user.user_metadata?.username ||
        user.user_metadata?.full_name || user.email?.split("@")[0] || "Account";
      name.textContent = username;
      if (profile?.avatar_url) {
        let img = avatar.querySelector("img");
        if (!img) { img = document.createElement("img"); img.alt = "Profile"; avatar.replaceChildren(img); }
        img.src = profile.avatar_url;
      } else {
        avatar.textContent = username.slice(0, 1).toUpperCase();
      }
      if (adminLink) adminLink.style.display = profile?.is_admin ? "" : "none";
      if (feedbackLink) feedbackLink.style.display = profile?.is_admin ? "" : "none";
      try {
        sessionStorage.setItem("dh-account-display-v1", JSON.stringify({
          name: username, avatarText: profile?.avatar_url ? "" : username.slice(0, 1).toUpperCase(),
          avatarUrl: profile?.avatar_url || ""
        }));
      } catch (_) {}
    } catch (error) {
      console.warn("DougHub account display could not load:", error);
      if (name.textContent === "Loading…" || name.textContent === "Loading...") name.textContent = "Account";
    }
  }

  // Keep the Community Chat red dot in sync with Supabase and with the
  // read timestamp written by chat.html. The dot is deliberately polled because
  // this project also needs to work when Realtime subscriptions are unavailable.
  function startChatNotificationWatcher() {
    if (window.__dhChatNotificationWatcherStarted) return;
    window.__dhChatNotificationWatcherStarted = true;

    const seenKey = "doughub_chat_last_seen";
    let inFlight = false;
    let initialized = false;

    function setDot(unread) {
      let link = document.getElementById("communityChatLink");
      if (!link) {
        link = Array.from(document.querySelectorAll("header a[href], header nav a[href], header .nav a[href]"))
          .find(anchor => {
            try {
              const path = new URL(anchor.getAttribute("href"), location.href).pathname.split("/").filter(Boolean).join("/").toLowerCase();
              return path === "chat.html";
            } catch (_) { return false; }
          }) || null;
      }
      if (!link) return;

      let dot = link.querySelector("#chatNotification");
      if (!dot) {
        dot = document.createElement("span");
        dot.id = "chatNotification";
        dot.className = "chat-notification";
        dot.setAttribute("aria-label", "New chat messages");
        link.appendChild(dot);
      }
      dot.classList.toggle("is-unread", !!unread);
      dot.setAttribute("aria-hidden", String(!unread));
      if (unread) link.setAttribute("aria-label", "Community Chat — unread messages");
      else link.removeAttribute("aria-label");
    }

    async function refreshDot() {
      if (inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const client = await getNavSupabase();
        if (!client) return;

        const [{ data: sessionData }, { data, error }] = await Promise.all([
          client.auth.getSession(),
          client.from("chat_messages")
            .select("created_at,user_id")
            .order("created_at", { ascending: false })
            .limit(1)
        ]);
        if (error) throw error;

        const latest = data && data[0];
        if (!latest || !latest.created_at) {
          initialized = true;
          setDot(false);
          return;
        }

        const latestTime = new Date(latest.created_at).getTime();
        const latestStamp = String(latest.created_at);
        const ownUserId = sessionData?.session?.user?.id || null;
        const isChatPage = pathKey() === "chat.html";

        let seen = "";
        try { seen = localStorage.getItem(seenKey) || ""; } catch (_) {}

        // On first use, establish a baseline instead of showing a dot for old
        // history. Opening Chat keeps the timestamp fresh across all pages.
        if (!initialized && !seen) {
          try { localStorage.setItem(seenKey, latestStamp); } catch (_) {}
          seen = latestStamp;
        }

        if (isChatPage && document.visibilityState === "visible") {
          try { localStorage.setItem(seenKey, latestStamp); } catch (_) {}
          seen = latestStamp;
          setDot(false);
        } else {
          const seenTime = seen ? new Date(seen).getTime() : 0;
          const isNewer = Number.isFinite(latestTime) &&
            (latestTime > seenTime || (latestTime === seenTime && latestStamp > seen));
          const unread = isNewer && (!ownUserId || latest.user_id !== ownUserId);
          setDot(unread);
        }

        initialized = true;
      } catch (error) {
        // Keep the last displayed state during transient network errors.
        console.debug("Community Chat notification refresh failed:", error);
      } finally {
        inFlight = false;
      }
    }

    refreshDot();
    window.setInterval(refreshDot, 5000);
    window.addEventListener("focus", refreshDot);
    window.addEventListener("storage", event => {
      if (!event.key || event.key === seenKey) refreshDot();
    });
    window.addEventListener("douqhub:chat-seen-updated", refreshDot);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refreshDot();
    });
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


  // Universal contextual Help: a short guided tour with a visible leader line
  // pointing from the guide card to the current control.
  function installHelpGuide() {
    if (document.getElementById("dh-global-help")) return;
    const style = document.createElement("style");
    style.id = "dh-global-help-style";
    style.textContent = `
      #dh-global-help{position:fixed;right:18px;bottom:18px;z-index:2147483000;border:1px solid #c4b5fd66;border-radius:999px;padding:11px 16px;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;font:800 13px Arial,sans-serif;box-shadow:0 12px 34px #0006;cursor:pointer}
      #dh-help-overlay{position:fixed;inset:0;z-index:2147482998;display:none;pointer-events:none}
      #dh-help-overlay.active{display:block}
      #dh-help-line{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
      #dh-help-line path{fill:none;stroke:#c4b5fd;stroke-width:3;stroke-linecap:round;stroke-dasharray:7 7;filter:drop-shadow(0 0 5px #8b5cf6)}
      #dh-help-card{position:fixed;right:18px;bottom:72px;width:min(360px,calc(100vw - 28px));padding:18px;border:1px solid #a5b4fc55;border-radius:18px;background:rgba(10,12,30,.97);color:#f7f7ff;box-shadow:0 24px 75px #000a;pointer-events:auto;font:14px/1.55 Arial,sans-serif}
      #dh-help-card .dh-help-kicker{font-size:10px;font-weight:900;letter-spacing:1.5px;color:#a5b4fc;text-transform:uppercase}
      #dh-help-card h2{font-size:20px;margin:7px 0}
      #dh-help-card p{margin:0;color:#c3c5da}
      #dh-help-card .dh-help-actions{display:flex;gap:8px;justify-content:space-between;align-items:center;margin-top:15px}
      #dh-help-card button{border:1px solid #ffffff24;border-radius:9px;padding:8px 11px;background:#ffffff0c;color:#fff;font-weight:800;cursor:pointer}
      #dh-help-card button.dh-help-next{background:linear-gradient(135deg,#6366f1,#a855f7);border:0}
      .dh-help-target{position:relative!important;z-index:2147482997!important;outline:3px solid #c4b5fd!important;outline-offset:4px!important;box-shadow:0 0 0 9999px #02040ab3,0 0 28px #a78bfa!important;scroll-margin:100px}
      @media(max-width:600px){#dh-global-help{right:12px;bottom:12px}#dh-help-card{right:12px;bottom:64px}}
    `;
    document.head.appendChild(style);
    const button=document.createElement("button");
    button.id="dh-global-help";button.type="button";button.textContent="❔ Help";button.setAttribute("aria-haspopup","dialog");
    document.body.appendChild(button);
    const overlay=document.createElement("div");overlay.id="dh-help-overlay";
    overlay.innerHTML='<svg id="dh-help-line" aria-hidden="true"><path id="dh-help-path"></path></svg>';
    document.body.appendChild(overlay);
    const card=document.createElement("section");card.id="dh-help-card";card.hidden=true;card.setAttribute("role","dialog");card.setAttribute("aria-modal","false");card.setAttribute("aria-label","Page help");
    card.innerHTML='<div class="dh-help-kicker">DougHub quick guide <span id="dh-help-count"></span></div><h2 id="dh-help-title">Need a hand?</h2><p id="dh-help-text">Choose Next to see the main controls on this page.</p><div class="dh-help-actions"><button id="dh-help-close" type="button">Close</button><div><button id="dh-help-prev" type="button">←</button> <button id="dh-help-next" class="dh-help-next" type="button">Next →</button></div></div>';
    document.body.appendChild(card);
    const stepsForPage=()=>{
      const p=location.pathname.toLowerCase();
      const candidates=[
        {selector:'header .nav,header nav[aria-label="Main navigation"]',title:"Move around DougHub",text:"Use the top navigation to switch between Home, Games, Tools, Nova AI and Chat."},
        {selector:'#accountButton, .dh-shared-account .account-btn',title:"Your account menu",text:"Open this button to find account settings, your saved work and sign-out options."},
        {selector:'main h1, .top h1, .heading h1',title:"Page overview",text:"This heading tells you what this page is for. The controls underneath are the main workspace."},
        {selector:'#quickAccess, .home-quick-access, .quick-access-grid',title:"Quick access",text:"These shortcuts take you directly to commonly used DougHub features."},
        {selector:'#modeSwitch, #projectModeSwitch, [data-mode-switch]',title:"Choose a mode",text:"Where available, switch between Project Mode for general coding and Game Maker mode for game-focused tools."},
        {selector:'#toolSearch, #projectSearch, input[type="search"]',title:"Search",text:"Type a keyword to find tools, projects or games without scrolling through everything."},
        {selector:'#editor, #codeEditor, #blockList, .workspace',title:"Create and edit",text:"This is where you write code or build with blocks. Save your work before leaving."},
        {selector:'#preview, #previewFrame, .preview-frame, iframe.preview',title:"Test your work",text:"Run or preview your project here. If something looks wrong, return to the editor and try again."},
        {selector:'#saveProject, #publishProject, button[onclick*="saveProject"]',title:"Save or publish",text:"Save a private copy first. Publish only when you're ready for other people to see it."},
        {selector:'main button, main a.btn, main .quick-access-card, main .tool-card',title:"Explore page actions",text:"Buttons and cards open features or perform actions. Hover or focus a control to see its label."}
      ];
      return candidates.map(x=>({...x,el:document.querySelector(x.selector)})).filter(x=>x.el&&!x.el.closest("#dh-help-card"));
    };
    let steps=[],index=0;
    const path=document.getElementById("dh-help-path");
    function drawLine(el){
      overlay.classList.add("active");
      if(!el){path.setAttribute("d","");return;}
      const r=el.getBoundingClientRect(),b=card.getBoundingClientRect();
      const x1=Math.max(8,Math.min(innerWidth-8,r.left+r.width/2)),y1=Math.max(8,Math.min(innerHeight-8,r.top+r.height/2));
      const x2=Math.max(8,Math.min(innerWidth-8,b.left+Math.min(b.width/2,80))),y2=Math.max(8,Math.min(innerHeight-8,b.top+12));
      path.setAttribute("d",`M ${x1} ${y1} C ${x1} ${(y1+y2)/2}, ${x2} ${(y1+y2)/2}, ${x2} ${y2}`);
    }
    function render(){
      document.querySelectorAll(".dh-help-target").forEach(el=>el.classList.remove("dh-help-target"));
      const s=steps[index];if(!s)return;
      document.getElementById("dh-help-title").textContent=s.title;
      document.getElementById("dh-help-text").textContent=s.text;
      document.getElementById("dh-help-count").textContent=(index+1)+" / "+steps.length;
      document.getElementById("dh-help-prev").disabled=index===0;
      document.getElementById("dh-help-next").textContent=index===steps.length-1?"Finish ✓":"Next →";
      if(s.el){s.el.classList.add("dh-help-target");s.el.scrollIntoView({behavior:"smooth",block:"center",inline:"nearest"});}
      requestAnimationFrame(()=>drawLine(s.el));
    }
    function close(){card.hidden=true;overlay.classList.remove("active");document.querySelectorAll(".dh-help-target").forEach(el=>el.classList.remove("dh-help-target"));}
    button.addEventListener("click",()=>{steps=stepsForPage();if(!steps.length)steps=[{title:"Welcome to DougHub",text:"Use the page controls to explore. If you need help with a particular feature, look for its label.",el:null}];index=0;card.hidden=false;render();});
    document.getElementById("dh-help-close").addEventListener("click",close);
    document.getElementById("dh-help-prev").addEventListener("click",()=>{if(index>0){index--;render();}});
    document.getElementById("dh-help-next").addEventListener("click",()=>{if(index<steps.length-1){index++;render();}else close();});
    window.addEventListener("resize",()=>{if(!card.hidden)drawLine(steps[index]?.el);});
    window.addEventListener("scroll",()=>{if(!card.hidden)drawLine(steps[index]?.el);},{passive:true});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!card.hidden)close();});
  }

  function start() {
    addNavStyle();
    installHelpGuide();
    normalizePrimaryNav();
    startChatNotificationWatcher();
    removeRetiredNavLinks();
    markActiveLinks();
    // Feature flags are optional; never let a missing flag loader break the header.\n    if (typeof loadFlags === "function" && typeof applyFlags === "function") loadFlags().then(applyFlags).catch(() => {});
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
    sharedHeader.src = new URL("header.js?v=2", NAV_SCRIPT_URL).href;
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