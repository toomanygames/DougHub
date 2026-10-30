(function () {
  "use strict";
  // Every branded page loads this shared header controller through nav.js, so
  // global header spacing and icon sizing can be maintained in one file.
  const NAV_SCRIPT_URL = document.currentScript && document.currentScript.src
    ? document.currentScript.src
    : new URL("nav.js", location.href).href;
  // Load the shared seasonal theme system on every page that uses the shared navigation.
  (function loadSeasonalExperience(){
    const root = new URL(".", NAV_SCRIPT_URL);
    if (!document.querySelector('link[data-dh-shared-css]')) {
      const shared = document.createElement("link");
      shared.rel = "stylesheet"; shared.href = new URL("douqhub-theme.css?v=20261026-shared", root).href;
      shared.dataset.dhSharedCss = "true"; document.head.appendChild(shared);
    }
    if (!document.querySelector('link[data-dh-seasonal-css]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet"; link.href = new URL("seasonal-theme.css?v=20261026-custom-palette", root).href;
      link.dataset.dhSeasonalCss = "true"; document.head.appendChild(link);
    }
    if (!document.querySelector('script[data-dh-seasonal-js]')) {
      const script = document.createElement("script");
      script.src = new URL("seasonal-theme.js?v=20261026-custom-palette", root).href;
      script.defer = true; script.dataset.dhSeasonalJs = "true"; document.head.appendChild(script);
    }
  })();

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
    "dougtube.html":"dougtube","douqhub-music.html":"music","dougforum.html":"forum","dmail.html":"dmail","nova.html":"nova",
    "chat.html":"chat","game-creator.html":"community_games","my-games.html":"community_games",
    "dougbase.html":"dougbase","dougbase/index.html":"dougbase","dougbase/login.html":"dougbase",
    "dougcode.html":"dougcode","scripting/scripting.html":"scripting","school.html":"school_mode","school-games.html":"school_mode"
  };
  const labels = {
    games:"DougGames",dougtube:"DougTube",music:"DougHub Music",forum:"DougForum",dmail:"DMail",nova:"Nova AI",
    chat:"Community Chat",community_games:"Community Games",dougbase:"DougBase",
    dougcode:"DougCode",scripting:"Scripting Editor",school_mode:"School Mode"
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
        gap:16px; flex-wrap:wrap; position:sticky !important; top:0 !important; z-index:10000 !important; align-self:stretch; isolation:isolate;
      }
      header .nav, header nav[aria-label="Main navigation"] {
        display:flex; align-items:center; justify-content:flex-end;
        gap:8px; flex-wrap:wrap; min-width:0;
      }
      header .nav > a, header nav[aria-label="Main navigation"] > a, header.top>nav.nav>a {
        display:inline-flex; align-items:center; justify-content:center;
        gap:5px; font-size:13px; font-weight:800 !important; line-height:1.25; text-decoration:none !important;
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
      /* Invisible bridge fills the gap between the account button and dropdown,
         so the pointer can travel down without triggering mouseleave. */
      .dh-shared-account .account-menu::before {
        content:"";position:absolute;left:0;right:0;bottom:100%;height:12px;
        background:transparent;pointer-events:auto;
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
  const MAIN_NAV_PAGES = new Set(["index.html", "dashboard.html", "douggames.html", "nova.html", "dougtube.html", "douqhub-music.html", "dougforum.html", "chat.html", "scripting/scripting.html", "school.html", "school-games.html"]);

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
      account.innerHTML = '<button id="accountButton" class="account-btn" type="button" aria-haspopup="true" aria-expanded="false"><div id="accountAvatar" class="account-avatar">?</div><span id="accountName">Loading…</span></button><div id="accountMenu" class="account-menu" aria-hidden="true"><a href="/dashboard.html">Dashboard</a><a href="/my-games.html">My Games &amp; Videos</a><a href="/admin.html" id="adminLink" style="display:none">Admin Panel</a><a href="/inbox.html" id="feedbackInboxLink" style="display:none">Feedback</a><a href="/settings.html">Settings</a><button id="logoutButton" class="logout" type="button">Log Out</button></div>';
    }
    account.classList.add("dh-shared-account");

    // Some pages provide their own account markup. Do not assume those menus
    // already contain staff links just because the account button exists.
    let accountMenu = account.querySelector("#accountMenu");
    if (!accountMenu) {
      accountMenu = document.createElement("div");
      accountMenu.id = "accountMenu";
      accountMenu.className = "account-menu";
      accountMenu.setAttribute("aria-hidden", "true");
      account.appendChild(accountMenu);
    }
    function ensureAccountMenuLink(id, href, label) {
      let link = accountMenu.querySelector("#" + id);
      if (!link) {
        link = document.createElement("a");
        link.id = id;
        const settingsLink = accountMenu.querySelector('a[href="/settings.html"], a[href="settings.html"]');
        if (settingsLink) accountMenu.insertBefore(link, settingsLink);
        else accountMenu.appendChild(link);
      }
      link.href = href;
      link.textContent = label;
      link.style.display = "none";
      return link;
    }
    ensureAccountMenuLink("adminLink", "/admin.html", "Admin Panel");
    ensureAccountMenuLink("feedbackInboxLink", "/admin.html#feedbackManagementCard", "Feedback Inbox");

    const links = [["/index.html","Home"],["/douggames.html","Games"],["/Scripting/scripting.html","Create"],["/chat.html","Chat"],];
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
      // When the homepage preference is enabled, send signed-in users straight
      // to their Dashboard from the Home nav item instead of loading index first.
      if (label === "Home") {
        a.addEventListener("click", async event => {
          let autoDashboard = true;
          try { autoDashboard = localStorage.getItem("dh_dashboard_auto_open_v1") !== "false"; } catch (_) {}
          if (!autoDashboard) return;
          event.preventDefault();
          if (a.dataset.dhHomeRouting === "true") return;
          a.dataset.dhHomeRouting = "true";
          try {
            const client = await getNavSupabase();
            const result = client ? await client.auth.getSession() : null;
            const session = result && result.data && result.data.session;
            location.href = session && session.user ? "/dashboard.html" : "/index.html";
          } catch (_) {
            location.href = "/index.html";
          }
        });
      }
    });
    nav.appendChild(account);

    if (!account.dataset.dhAccountBound) {
      account.dataset.dhAccountBound = "true";
      const button = account.querySelector("#accountButton");
      const menu = account.querySelector("#accountMenu");
      const logout = account.querySelector("#logoutButton");
      // Hover opens the menu temporarily. Clicking pins it open until the
      // user clicks outside the account area or presses Escape.
      let clickPinned = false;
      let hoverOpenTimer = null;
      const cancelHoverOpen = () => {
        if (hoverOpenTimer !== null) {
          clearTimeout(hoverOpenTimer);
          hoverOpenTimer = null;
        }
      };
      const setOpen = open => {
        menu?.classList.toggle("show", open);
        menu?.setAttribute("aria-hidden", String(!open));
        button?.setAttribute("aria-expanded", String(open));
      };
      account.addEventListener("mouseenter", () => {
        if (clickPinned) return;
        cancelHoverOpen();
        // A tiny hover-intent delay filters out accidental fly-bys without
        // making the menu feel slow when someone deliberately points at it.
        hoverOpenTimer = setTimeout(() => {
          hoverOpenTimer = null;
          if (account.matches(":hover") && !clickPinned) setOpen(true);
        }, 130);
      });
      account.addEventListener("mouseleave", () => {
        cancelHoverOpen();
        if (!clickPinned) setOpen(false);
      });
      // Resolve the session before deciding what an account click should do.
      // Capture first so legacy page-specific handlers cannot toggle it too.
      button?.addEventListener("click", async event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const client = await getNavSupabase();
        let session = null;
        try {
          const result = client ? await client.auth.getSession() : null;
          session = result?.data?.session || null;
        } catch (_) {}
        if (!session?.user) {
          showGuestLogin();
          const redirect = encodeURIComponent(location.pathname.slice(1) + location.search);
          location.href = "/log-in.html?redirect=" + redirect;
          return;
        }
        clickPinned = !clickPinned;
        setOpen(clickPinned || account.matches(":hover"));
      }, true);
      document.addEventListener("click", event => {
        if (!event.target.closest(".dh-shared-account")) {
          clickPinned = false;
          cancelHoverOpen();
          setOpen(false);
        }
      });
      document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          clickPinned = false;
          cancelHoverOpen();
          setOpen(false);
        }
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

  function showGuestLogin() {
    const account = document.querySelector("header .dh-shared-account");
    if (!account) return;
    // Guests get a direct sign-in link, never an empty profile dropdown.
    account.innerHTML = '<a class="account-btn guest-login-link" href="/log-in.html?redirect=' +
      encodeURIComponent(location.pathname.slice(1) + location.search) +
      '">Log In <span aria-hidden="true">↗</span></a>';
    account.dataset.dhGuest = "true";
    try { sessionStorage.removeItem("dh-account-display-v1"); } catch (_) {}
  }

  async function loadNavAccount() {
    const name = document.getElementById("accountName");
    const avatar = document.getElementById("accountAvatar");
    const adminLink = document.getElementById("adminLink");
    const feedbackLink = document.getElementById("feedbackInboxLink");
    if (!name || !avatar) return;
    try {
      const client = await getNavSupabase();
      if (!client) { showGuestLogin(); return; }
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      const session = data && data.session;
      if (!session || !session.user) {
        showGuestLogin();
        if (adminLink) adminLink.style.display = "none";
        if (feedbackLink) feedbackLink.style.display = "none";
        return;
      }
      const user = session.user;
      let profile = null;
      const result = await client.from("profiles").select("username,avatar_url,is_admin,staff_role")
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
      // The database staff_role is authoritative. A stale is_admin flag must not
      // keep a demoted account's Admin Panel link visible.
      const storedRole = String(profile?.staff_role || "").trim().toLowerCase();
      const staffRole = ["helper","admin","developer","owner"].includes(storedRole) ? storedRole : "none";
      const staffRank = ({ none: 0, helper: 1, admin: 2, developer: 3, owner: 4 })[staffRole] || 0;
      if (adminLink) {
        adminLink.style.display = staffRank >= 1 ? "" : "none";
        adminLink.href = "/admin.html";
        adminLink.textContent = "Admin Panel";
      }
      if (feedbackLink) {
        feedbackLink.style.display = staffRank >= 3 ? "" : "none";
        feedbackLink.href = "/admin.html#feedbackManagementCard";
        feedbackLink.textContent = "Feedback Inbox";
      }
      try {
        sessionStorage.setItem("dh-account-display-v1", JSON.stringify({
          name: username, avatarText: profile?.avatar_url ? "" : username.slice(0, 1).toUpperCase(),
          avatarUrl: profile?.avatar_url || ""
        }));
      } catch (_) {}
    } catch (error) {
      console.warn("DougHub account display could not load:", error);
      if (name.textContent === "Loading…" || name.textContent === "Loading...") showGuestLogin();
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

  // Page availability affects navigation buttons only. Direct URLs remain accessible.
  const PAGE_SCHEDULE_API = "https://agsqdqcsmsppcdqxlppj.supabase.co/rest/v1/site_page_schedules?select=page_path,display_name,enabled,close_at,reopen_at,closed_message";
  let pageScheduleCache = new Map();
  let pageScheduleLoadedAt = 0;
  let pageScheduleLoadPromise = null;

  function normalizeSchedulePath(value) {
    try {
      const url = new URL(value, location.href);
      return url.pathname.split("/").filter(Boolean).join("/").toLowerCase() || "index.html";
    } catch (_) { return ""; }
  }

  function scheduleIsClosed(page) {
    if (!page) return false;
    const now = Date.now();
    const scheduledClosed = page.close_at && now >= new Date(page.close_at).getTime() &&
      (!page.reopen_at || now < new Date(page.reopen_at).getTime());
    return page.enabled === false || !!scheduledClosed;
  }

  async function refreshPageScheduleButtonGuards(force = false) {
    if (!force && Date.now() - pageScheduleLoadedAt < 20000) return pageScheduleCache;
    if (pageScheduleLoadPromise) return pageScheduleLoadPromise;
    pageScheduleLoadPromise = (async () => {
      try {
        const response = await fetch(PAGE_SCHEDULE_API, {
          headers: { apikey: KEY, Authorization: "Bearer " + KEY, Accept: "application/json" },
          cache: "no-store"
        });
        if (!response.ok) throw new Error("Page availability request returned " + response.status);
        const rows = await response.json();
        pageScheduleCache = new Map((rows || []).map(row => [normalizeSchedulePath(row.page_path), row]));
        pageScheduleLoadedAt = Date.now();
      } catch (error) {
        console.warn("DougHub page availability could not be refreshed; navigation remains available.", error);
      } finally {
        pageScheduleLoadPromise = null;
      }
      return pageScheduleCache;
    })();
    return pageScheduleLoadPromise;
  }

  function installPageScheduleButtonGuards() {
    if (document.documentElement.dataset.dhPageButtonGuards === "true") return;
    document.documentElement.dataset.dhPageButtonGuards = "true";
    document.addEventListener("click", event => {
      const control = event.target instanceof Element
        ? event.target.closest("a[href],button[data-href],button[data-url],[role='button'][data-href],[role='button'][data-url]")
        : null;
      if (!control) return;
      const destination = control.matches("a[href]") ? control.getAttribute("href")
        : (control.getAttribute("data-href") || control.getAttribute("data-url"));
      if (!destination || /^(?:#|javascript:|mailto:|tel:)/i.test(destination.trim())) return;
      let target;
      try { target = new URL(destination, location.href); } catch (_) { return; }
      if (target.origin !== location.origin) return;
      const targetPath = normalizeSchedulePath(target.href);
      if (!targetPath) return;
      // The cache is populated on startup and refreshed periodically. If it
      // has not loaded yet, fail open rather than breaking normal navigation.
      if (!pageScheduleLoadedAt) return;
      const page = pageScheduleCache.get(targetPath);
      if (!scheduleIsClosed(page)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      // Only the navigation action is redirected. Loading the destination URL
      // directly does not run a page-blocking screen.
      location.assign("/index.html");
    }, true);
  }

  installPageScheduleButtonGuards();
  refreshPageScheduleButtonGuards(true);



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
      #dh-help-card{position:fixed;z-index:2147483001;right:18px;bottom:72px;width:min(360px,calc(100vw - 28px));padding:18px;border:1px solid #a5b4fc55;border-radius:18px;background:rgba(10,12,30,.97);color:#f7f7ff;box-shadow:0 24px 75px #000a;pointer-events:auto;font:14px/1.55 Arial,sans-serif}
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
    button.id="dh-global-help";button.type="button";button.textContent="Take a tour";button.setAttribute("aria-haspopup","dialog");button.setAttribute("aria-label","Take a guided tour of this page");
    document.body.appendChild(button);
    const overlay=document.createElement("div");overlay.id="dh-help-overlay";
    overlay.innerHTML='<svg id="dh-help-line" aria-hidden="true"><path id="dh-help-path"></path></svg>';
    document.body.appendChild(overlay);
    const card=document.createElement("section");card.id="dh-help-card";card.hidden=true;card.setAttribute("role","dialog");card.setAttribute("aria-modal","false");card.setAttribute("aria-label","Page help");
    card.innerHTML='<div class="dh-help-kicker">Guided tour <span id="dh-help-count"></span></div><h2 id="dh-help-title">Need a hand?</h2><p id="dh-help-text">Follow along to learn the main areas and controls on this page. Choose Next to continue.</p><div class="dh-help-actions"><button id="dh-help-close" type="button">Close</button><div><button id="dh-help-prev" type="button">←</button> <button id="dh-help-next" class="dh-help-next" type="button">Next →</button></div></div>';
    document.body.appendChild(card);
    const stepsForPage=()=>{
      const p=location.pathname.toLowerCase();
      const common=[
        {selector:'header .nav,header nav[aria-label="Main navigation"]',title:"Navigation bar",text:"Choose Home to return to the homepage, Games to browse and create games, Tools for utilities, Nova AI for AI assistance, or Chat to join the community conversation."},
        {selector:'#accountButton, .dh-shared-account .account-btn',title:"Account button",text:"Click your avatar or username to open the account menu. From there, use Settings to manage preferences, My Games & Videos to find your saved creations, or Log Out when you are finished."}
      ];
      const pageSteps={
        code:[
          {selector:'#modeSwitch',title:"Project Mode vs Game Maker",text:"Choose Project Mode for websites, apps and general coding. Choose Game Maker for game-focused work. You can switch modes at any time; the mode changes the workspace label and keeps your current project open."},
          {selector:'#fileTabs',title:"Project files",text:"This area lists the files in your project. Select a file to edit it. Use + File to add another file, and Delete only when you really want to remove the selected file."},
          {selector:'#fileType',title:"File type",text:"Choose the extension for the selected file, such as .html for page structure, .css for appearance, or .js for interactive behavior. Keep the extension matched to the code you put in the file."},
          {selector:'#editor',title:"Code editor",text:"Write or paste your code here. HTML defines page content, CSS styles it, and JavaScript makes it interactive. Start with index.html, then use the other files to keep your project organized."},
          {selector:'#preview',title:"Live preview",text:"The preview shows your web project. Press Run after changing code to test it. If the result is wrong, edit the code and run it again. Browser previews cannot run every language or server-only feature."},
          {selector:'button[onclick="saveProject()"]',title:"Save your project",text:"Click Save to store your current project in your DougHub account. Give it a clear title and description in Project settings so you can recognize it later."},
          {selector:'#runtime',title:"Runtime setting",text:"Select Web for HTML, CSS and JavaScript projects. Python and Java are separate runtimes and may not run inside the browser preview in the same way as a web page."},
          {selector:'#visibility',title:"Project visibility",text:"Public projects can be discovered by others; private projects are intended to stay in your own project list. Check this setting before saving or sharing."},
          {selector:'#entry',title:"Preview page",text:"Choose which HTML file should open first when you run the project. Most small projects use index.html as their entry page."},
          {selector:'#projectSearch',title:"Find community projects",text:"Type a keyword to narrow the community code-project list. Clear the search to show the full list again."}
        ],
        tools:[
          {selector:'input[type="search"],#toolSearch',title:"Search tools",text:"Type what you want to do—for example, convert, calculate, format or generate. Select a matching tool card to open that utility."},
          {selector:'main .tool-card,main a[href]',title:"Open a tool",text:"Each tool card or link opens a specific utility. Read its title and short description, open the one that matches your task, and use the fields or buttons shown on that tool."}
        ],
        home:[
          {selector:"#find",title:"Find your next thing",text:"Search DougHub using a word like games, chat, code or music. Choose a category to narrow the list, then open a card to go straight to that feature."},
          {selector:"#toolSlider",title:"Featured picks",text:"Use the arrows or dots to browse featured tools. Open any card that catches your eye, or keep scrolling for more ideas."},
          {selector:".workflow",title:"A simple way to explore",text:"You can learn DougHub one feature at a time. Choose a tool, try it, and return to Home when you want another idea."},
          {selector:".bottom-cta",title:"Quick next steps",text:"These links take you to your workspace or community. The top navigation and footer are always there to help you find other areas."},
          {selector:".feedback",title:"Send feedback",text:"Share an idea or report a problem here when signed in. Use the footer to reach more pages."}
        ],
        gameMaker:[
          {selector:'#blockList,.workspace,#editor,textarea',title:"Build area",text:"This is the main area for making your game. Select a tool or block, follow its on-screen settings, and add or edit game logic one small step at a time."},
          {selector:'button[onclick*="run"],button[id*="run"],button[title*="Run"]',title:"Run or test",text:"Use Run or Play to test the current version of your game. Test after each major change so it is easier to find what needs fixing."},
          {selector:'button[onclick*="save"],button[id*="save"]',title:"Save your game",text:"Save regularly so you do not lose your latest changes. If there is a project name field, give the game a name before saving."}
        ],
        chat:[
          {selector:'textarea,input[type="text"]',title:"Write a message",text:"Type your message in the message box. Check that it says what you mean, then use Send or press Enter if the page supports it. Keep private information such as passwords out of public chat."},
          {selector:'button[type="submit"],button[aria-label*="Send"],button[id*="send"]',title:"Send message",text:"Click this button to send the message you wrote. If nothing appears, check your connection and whether the message box is empty."}
        ],
        dmail:[
          {selector:'textarea,input[type="text"]',title:"Compose a message",text:"Choose the recipient if the page asks, write your message in the compose box, then review it before sending. Direct messages are for the intended recipient, not a public post."},
          {selector:'button[type="submit"],button[aria-label*="Send"],button[id*="send"]',title:"Send direct message",text:"Use Send after you have chosen the recipient and written your message. If it does not appear in the conversation, wait a moment and check your connection."}
        ]
      };
      let chosen=common.slice();
      if(p.includes("dougcode")) chosen=chosen.concat(pageSteps.code);
      else if(p.includes("tools")) chosen=chosen.concat(pageSteps.tools);
      else if(p.endsWith("/index.html")||p==="/") chosen=chosen.concat(pageSteps.home);
      else if(p.includes("scripting")||p.includes("game-creator")) chosen=chosen.concat(pageSteps.gameMaker);
      else if(p.includes("dmail")) chosen=chosen.concat(pageSteps.dmail);
      else if(p.includes("chat")) chosen=chosen.concat(pageSteps.chat);
      // Add a page-specific heading explanation and useful actions as a fallback.
      const heading=document.querySelector('main h1,.top h1,.heading h1,h1');
      if(heading) chosen.push({selector:'main h1,.top h1,.heading h1,h1',title:heading.textContent.trim()||"Page overview",text:"This page is for "+(heading.textContent.trim()||"this feature")+". Read the short descriptions beside controls, choose the action you need, and use Help again if you want a guided tour of another area."});
      const found=[];
      for(const step of chosen){
        let el=null;
        try{el=document.querySelector(step.selector)}catch(_){}
        if(el&&!el.closest("#dh-help-card")&&!found.some(x=>x.el===el))found.push({...step,el});
      }
      // Explain actual prominent controls by their own visible labels rather than a generic placeholder.
      const actions=[...document.querySelectorAll('main button,main a.btn,main .quick-access-card,main .tool-card')];
      for(const el of actions){
        if(found.length>=12)break;
        if(!el||el.closest("#dh-help-card")||found.some(x=>x.el===el))continue;
        const label=(el.innerText||el.getAttribute("aria-label")||el.getAttribute("title")||"").replace(/\s+/g," ").trim();
        if(!label||label.length>70)continue;
        const isLink=el.tagName==="A";
        found.push({el,title:label,text:isLink?"Click this link to open "+label+". If it takes you to a different page, use the navigation bar to return here.":"Click "+label+" to run that action. Check any fields or options first, then read the result or status message shown on the page."});
      }
      return found;
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
    button.addEventListener("click",()=>{
      if((location.pathname.replace(/^\/+/, "").toLowerCase()==="index.html"||location.pathname==="/")&&document.getElementById("dh-home-tour-card")){
        try{localStorage.removeItem("dh_home_tutorial_completed_v3");}catch(_){}
        const u=new URL(location.href);u.searchParams.set("tour","1");location.href=u.href;return;
      }
      steps=stepsForPage();if(!steps.length)steps=[{title:"Welcome to DougHub",text:"Use the page controls to explore. If you need help with a particular feature, look for its label.",el:null}];index=0;card.hidden=false;render();
    });
    document.getElementById("dh-help-close").addEventListener("click",close);
    document.getElementById("dh-help-prev").addEventListener("click",()=>{if(index>0){index--;render();}});
    document.getElementById("dh-help-next").addEventListener("click",()=>{if(index<steps.length-1){index++;render();}else close();});
    window.addEventListener("resize",()=>{if(!card.hidden)drawLine(steps[index]?.el);});
    window.addEventListener("scroll",()=>{if(!card.hidden)drawLine(steps[index]?.el);},{passive:true});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!card.hidden)close();});
  }

  function installQuickFind() {
    if (document.getElementById("dh-quick-find-overlay")) return;
    // The optional header launcher is not present on every page; keyboard shortcuts
    // (Ctrl/Cmd+K or /) still open Quick Find when it is absent.
    const launcher = document.getElementById("dh-quick-find-launcher");
    const style=document.createElement("style");
    style.id="dh-quick-find-style";
    style.textContent=[
      "#dh-quick-find-overlay{position:fixed;inset:0;z-index:2147483002;background:#02040acc;backdrop-filter:blur(8px);display:none;align-items:flex-start;justify-content:center;padding:9vh 16px 24px}",
      "#dh-quick-find-overlay.open{display:flex}",
      "#dh-quick-find-dialog{width:min(650px,100%);max-height:80vh;display:flex;flex-direction:column;overflow:hidden;border:1px solid #a5b4fc66;border-radius:20px;background:#0b0e20;color:#f5f5ff;box-shadow:0 30px 100px #000a;font:14px/1.5 Arial}",
      "#dh-quick-find-top{padding:16px;border-bottom:1px solid #ffffff12}",
      "#dh-quick-find-top label{display:block;margin-bottom:9px;color:#a5b4fc;font-size:10px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase}",
      "#dh-quick-find-input{width:100%;padding:14px;border:1px solid #ffffff20;border-radius:12px;outline:none;background:#050713;color:white;font:16px Arial;box-sizing:border-box}",
      "#dh-quick-find-input:focus{border-color:#818cf8;box-shadow:0 0 0 3px #6366f133}",
      "#dh-quick-find-results{overflow:auto;padding:8px}",
      ".dh-qf-result{width:100%;display:flex;align-items:center;gap:12px;text-align:left;padding:11px 12px;border:1px solid transparent;border-radius:11px;background:transparent;color:white;cursor:pointer;font:inherit}",
      ".dh-qf-result:hover,.dh-qf-result:focus-visible{outline:none;background:#ffffff0d;border-color:#a5b4fc44}",
      ".dh-qf-icon{width:36px;height:36px;flex:0 0 36px;display:grid;place-items:center;border-radius:10px;background:#6366f133;font-size:17px}",
      ".dh-qf-copy{min-width:0;flex:1}.dh-qf-copy strong,.dh-qf-copy small{display:block}.dh-qf-copy small{margin-top:2px;color:#a4a9c2;font-size:12px}",
      ".dh-qf-category{font-size:10px;color:#a5b4fc;white-space:nowrap}",
      "#dh-quick-find-empty{padding:28px 16px;text-align:center;color:#a4a9c2}",
      "#dh-quick-find-footer{display:flex;justify-content:space-between;gap:12px;padding:11px 15px;border-top:1px solid #ffffff12;color:#9298b4;font-size:11px}",
      "#dh-quick-find-footer button{border:0;background:none;color:#c4b5fd;font:inherit;cursor:pointer}",
      ".dh-quick-settings{display:inline-flex;align-items:center;justify-content:center;padding:8px 11px;border:1px solid #a5b4fc55;border-radius:10px;background:#6366f122;color:#e8e9ff!important;text-decoration:none!important;font:800 12px Arial;white-space:nowrap}",
      ".dh-quick-settings:hover{background:#6366f144!important}",
      "@media(max-width:600px){#dh-quick-find-launcher{padding:7px 8px;font-size:11px}#dh-quick-find-overlay{padding-top:7vh}.dh-qf-category{display:none}}"
    ].join("");
    document.head.appendChild(style);
    const pages=[
      ["Home","/index.html","Start here and explore DougHub","Start","⌂","home homepage explore"],
      ["Dashboard","/dashboard.html","Your personal workspace and shortcuts","Your space","▦","workspace profile"],
      ["Settings","/settings.html","Account preferences and site settings","Your space","⚙","settings preferences account"],
      ["Games","/douggames.html","Browse games and find Game Maker","Play & create","🎮","games play"],
      
      ["Nova AI","/nova.html","Ask questions and explore ideas","Tools","✧","ai assistant questions"],
      ["DougCode / Game Maker","/dougcode.html","Build projects or make a game","Create","⌘","code coding editor project game maker"],
      ["Community Chat","/chat.html","Talk with the DougHub community","Community","◌","chat messages conversation"],
      ["DougForum","/dougforum.html","Browse discussions and ask questions","Community","☷","forum discussions posts"],
      ["DougHub Music","/douqhub-music.html","Listen to community music","Entertainment","♫","music songs albums audio"],
      ["DougTube","/dougtube.html","Watch and share videos","Entertainment","▶","youtube video watch"],
      ["DougDrive","/dougdrive.html","Open your DougDrive files","Your space","▤","drive files storage"],
      ["My Games & Videos","/my-games.html","Find your saved creations","Your space","▣","uploads creations videos"],
      ["DMail","/DMail.html","Open direct messages","Community","✉","mail messages"],
      ["Help / Guided tour","#tour","Walk through the controls on this page","Help","❔","tutorial guide help how to"]
    ].map(x=>({title:x[0],url:x[1],desc:x[2],cat:x[3],icon:x[4],tags:x[5]}));
    const overlay=document.createElement("div");overlay.id="dh-quick-find-overlay";
    const dialog=document.createElement("section");dialog.id="dh-quick-find-dialog";dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");dialog.setAttribute("aria-label","Find anything in DougHub");
    const top=document.createElement("div");top.id="dh-quick-find-top";
    const label=document.createElement("label");label.htmlFor="dh-quick-find-input";label.textContent="DougHub Quick Find";
    const input=document.createElement("input");input.id="dh-quick-find-input";input.type="search";input.placeholder="Search pages, tools, settings…";input.autocomplete="off";input.spellcheck=false;
    top.append(label,input);
    const results=document.createElement("div");results.id="dh-quick-find-results";
    const footer=document.createElement("div");footer.id="dh-quick-find-footer";
    const hint=document.createElement("span");hint.textContent="↑ ↓ browse · Enter open · Esc close";
    const tour=document.createElement("button");tour.type="button";tour.textContent="Start page tutorial ↗";footer.append(hint,tour);
    dialog.append(top,results,footer);overlay.appendChild(dialog);document.body.appendChild(overlay);
    let selected=0,visible=[];
    function close(){overlay.classList.remove("open");input.blur();}
    function open(){overlay.classList.add("open");input.value="";selected=0;render();requestAnimationFrame(()=>input.focus());}
    function openPage(p){close();if(p.url==="#tour"){const help=document.getElementById("dh-global-help");if(help)help.click();else location.href="/index.html?tutorial=1";}else location.href=p.url;}
    function render(){
      const q=input.value.trim().toLowerCase();
      visible=pages.filter(p=>(p.title+" "+p.desc+" "+p.cat+" "+p.tags).toLowerCase().includes(q));
      selected=Math.min(selected,Math.max(0,visible.length-1));results.replaceChildren();
      if(!visible.length){const empty=document.createElement("div");empty.id="dh-quick-find-empty";empty.textContent="No matches. Try “settings”, “games”, “music” or “chat”.";results.appendChild(empty);return;}
      visible.forEach((p,i)=>{
        const b=document.createElement("button");b.type="button";b.className="dh-qf-result";b.style.background=i===selected?"#ffffff0d":"transparent";b.setAttribute("aria-selected",String(i===selected));
        const icon=document.createElement("span");icon.className="dh-qf-icon";icon.textContent=p.icon;
        const copy=document.createElement("span");copy.className="dh-qf-copy";const strong=document.createElement("strong");strong.textContent=p.title;const small=document.createElement("small");small.textContent=p.desc;copy.append(strong,small);
        const cat=document.createElement("span");cat.className="dh-qf-category";cat.textContent=p.cat;b.append(icon,copy,cat);b.addEventListener("click",()=>openPage(p));results.appendChild(b);
      });
    }
    if (launcher) launcher.addEventListener("click",open);
    input.addEventListener("input",()=>{selected=0;render();});
    input.addEventListener("keydown",e=>{if(e.key==="ArrowDown"){e.preventDefault();selected=Math.min(selected+1,visible.length-1);render();}else if(e.key==="ArrowUp"){e.preventDefault();selected=Math.max(0,selected-1);render();}else if(e.key==="Enter"&&visible[selected]){e.preventDefault();openPage(visible[selected]);}else if(e.key==="Escape"){e.preventDefault();close();}});
    overlay.addEventListener("click",e=>{if(e.target===overlay)close();});
    tour.addEventListener("click",()=>{close();const help=document.getElementById("dh-global-help");if(help)help.click();else location.href="/index.html?tutorial=1";});
    document.addEventListener("keydown",e=>{
      const active=document.activeElement;const typing=/INPUT|TEXTAREA|SELECT/.test(active?.tagName||"")||active?.isContentEditable;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();open();}
      else if(e.key==="/"&&!typing&&!overlay.classList.contains("open")){e.preventDefault();open();}
      else if(e.key==="Escape"&&overlay.classList.contains("open"))close();
    });
  }

  function loadSideConversations() {
    // Keep the arcade page focused on games; hide the global conversation slider there.
    if (/\/douggames\.html$/i.test(window.location.pathname) || /\/chat-calls\.html$/i.test(window.location.pathname)) return;
    if (document.getElementById("dh-side-conversations-script")) return;
    const script = document.createElement("script");
    script.id = "dh-side-conversations-script";
    script.src = new URL("side-conversations.js?v=20261027-sidebar-global-live", NAV_SCRIPT_URL).href;
    script.async = true;
    document.head.appendChild(script);
  }

  async function addSchoolModeLink() {
    try {
      const response = await fetch(API + "&feature_key=eq.school_mode", {headers:{apikey:KEY,Authorization:"Bearer "+KEY,Accept:"application/json"},cache:"no-store"});
      if (!response.ok) return;
      const rows = await response.json();
      if (!rows[0] || rows[0].enabled !== true) return;
      const nav = document.querySelector("header nav[aria-label='Main navigation'], header > .nav");
      if (!nav || nav.querySelector('[data-school-mode-link="true"]')) return;
      const link = document.createElement("a");
      link.href="/school.html";link.className="nav-link";link.dataset.schoolModeLink="true";link.textContent="School";nav.appendChild(link);
    } catch (_) {}
  }
  function start() {
    loadSideConversations();
    addNavStyle();
    document.getElementById("dh-global-help")?.remove();
    normalizePrimaryNav();
    addSchoolModeLink();
    installQuickFind();
    startChatNotificationWatcher();
    removeRetiredNavLinks();
    markActiveLinks();
    // Feature flags are optional; never let a missing flag loader break the header.\n    if (typeof loadFlags === "function" && typeof applyFlags === "function") loadFlags().then(applyFlags).catch(() => {});
    installPageScheduleButtonGuards();
    refreshPageScheduleButtonGuards(true);
    window.setInterval(() => refreshPageScheduleButtonGuards(true), 30000);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") refreshPageScheduleButtonGuards(true);
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
    sharedHeader.src = new URL("header.js?v=20261022-scrollbar", NAV_SCRIPT_URL).href;
    sharedHeader.onload = function () {
      sharedHeader.dataset.loaded = "true";
      start();
    };
    sharedHeader.onerror = start;
    document.head.appendChild(sharedHeader);
  }
  // Load the side panel independently of shared-header startup. If header.js is delayed,
  // already present, or its load marker is missing, the side tab must still appear.
  loadSideConversations();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startAfterSharedHeader);
  else startAfterSharedHeader();
})();