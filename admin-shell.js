/* DougHub admin shell: four pages (Home, People, Community, Tools), each tool gated by staff rank.
   Ranks inherit downward: Helper 1 < Admin 2 < Developer 3 < Owner 4.
   Hiding a tool here only keeps the panel tidy; the database enforces every permission itself. */
(function () {
  "use strict";
  if (window.DHAdminShell) return;

  const RANKS = { none: 0, helper: 1, admin: 2, developer: 3, tech: 3, owner: 4 };
  const RANK_NAMES = ["Member", "Helper", "Admin", "Developer", "Owner"];
  const RANK_BLURB = [
    "",
    "You handle reports, warnings, chat groups and pins.",
    "You handle accounts, chat approval, bans and community moderation, plus everything Helpers do.",
    "You have technical tools, feedback and feature flags, plus everything Admins do.",
    "You have full control: staff ranks, site settings and availability."
  ];
  const PAGES = [
    { key: "home", title: "Home", icon: "🏠", blurb: "What needs your attention right now." },
    { key: "people", title: "People", icon: "👥", blurb: "Chat access, members, warnings, bans and staff.",
      groups: [["access", "Chat access"], ["members", "Members"], ["discipline", "Warnings & bans"], ["staff", "Staff"]] },
    { key: "community", title: "Community", icon: "💬", blurb: "Reports, chat and everything members post.",
      groups: [["reports", "Reports"], ["chat", "Chat"], ["content", "Games & media"]] },
    { key: "tools", title: "Tools", icon: "🧰", blurb: "Developer tools, site settings and logs.",
      groups: [["dev", "Developer"], ["site", "Site settings"], ["logs", "Logs"]] }
  ];
  // [how to recognise the card, page, group, minimum rank]. Unknown cards default to Owner-only.
  const REGISTRY = [
    ["#chatAccessVerificationCard", "people", "access", 2],
    ["h2:users", "people", "members", 2],
    ["#userWarningsCard", "people", "discipline", 1],
    ["#recentWarningsCard", "people", "discipline", 1],
    ["#banAccountsCard", "people", "discipline", 2],
    ["#ownerBanRequestsCard", "people", "discipline", 4],
    ["#dhStaffTeamCard", "people", "staff", 2],
    ["#staffManagementCard", "people", "staff", 4],
    ["#dhReportsCard", "community", "reports", 1],
    ["#chatGroupModerationCard", "community", "chat", 1],
    ["#chatPinnedModerationCard", "community", "chat", 1],
    ["#chatPollModerationCard", "community", "chat", 2],
    ["h2:chat messages", "community", "chat", 2],
    ["#chatRetentionCard", "community", "chat", 2],
    [".community-games-tube-card", "community", "content", 2],
    ["#dougHubMusicModerationCard", "community", "content", 2],
    ["h2:code projects", "community", "content", 3],
    ["#customBadgeManagerCard", "community", "content", 3],
    ["#feedbackManagementCard", "tools", "dev", 3],
    ["#gameRequestsManagementCard", "tools", "dev", 3],
    ["#siteFeatureCard", "tools", "dev", 3],
    ["h2:dougbase access", "tools", "dev", 3],
    ["#siteAnnouncementCard", "tools", "site", 4],
    ["#pageScheduleCard", "tools", "site", 4],
    ["#chatGamesDailyScheduleCard", "tools", "site", 4],
    ["#adminUiPreferenceCard", "tools", "site", 4],
    ["#auditLogCard", "tools", "logs", 2],
    ["#adminActivityFlagsCard", "tools", "logs", 4]
  ];
  const WIDE = ["dhReportsCard", "dhStaffTeamCard", "chatAccessVerificationCard", "auditLogCard", "banAccountsCard"];

  const state = { rank: 0, user: null, started: false, page: "home", errors: [], shown: 0, total: 0 };
  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const db = () => (typeof supabaseClient !== "undefined" && supabaseClient) || window.DougHubSupabaseClient;
  const ago = iso => {
    if (!iso) return "—";
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    if (s < 86400 * 30) return Math.floor(s / 86400) + "d ago";
    return new Date(iso).toLocaleDateString();
  };
  const pill = (label, kind) => '<span class="dh-pill dh-pill-' + esc(kind || String(label).toLowerCase()) + '">' + esc(label) + "</span>";
  const rankPill = rank => pill(RANK_NAMES[rank] || "Member", "rank" + rank);
  const rankOf = role => RANKS[String(role || "none").toLowerCase()] || 0;
  window.addEventListener("error", e => state.errors.push(e.message || "Script error"));
  window.addEventListener("unhandledrejection", e => state.errors.push(String(e.reason?.message || e.reason || "Unhandled promise")));

  async function namesFor(ids) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return new Map();
    const { data } = await db().from("profiles").select("id,username").in("id", unique);
    return new Map((data || []).map(p => [p.id, p.username]));
  }
  const at = (map, id) => (id ? "@" + (map.get(id) || "unknown") : "—");

  /* ---------- layout ---------- */
  function build() {
    document.documentElement.classList.add("dh-shell-on");
    const shell = document.createElement("div");
    shell.id = "dhShell";
    shell.innerHTML =
      '<aside id="dhSide" aria-label="Admin navigation">' +
        '<a class="dh-brand" href="index.html" title="Back to DougHub"><b>Doug<span>Hub</span></b><small>Admin</small></a>' +
        '<nav id="dhNav"></nav>' +
        '<div class="dh-me"><div class="dh-avatar" id="dhMeAvatar">?</div><div class="dh-me-text"><strong id="dhMeName">Loading…</strong><div id="dhMeRank"></div></div></div>' +
        '<a class="dh-back" href="index.html">← Back to DougHub</a>' +
      "</aside>" +
      '<div id="dhScrim"></div>' +
      '<main id="dhMain">' +
        '<div id="dhTop"><button type="button" id="dhMenu" aria-label="Open menu">☰</button>' +
          '<div class="dh-top-title"><h1 id="dhTitle">Home</h1><p id="dhBlurb"></p></div>' +
          // role="search" + neutral name + autocomplete off keep password managers from treating this as a login field.
          '<div class="dh-search" role="search"><span aria-hidden="true">🔍</span>' +
            '<input id="dhFind" type="search" name="dh-panel-find" placeholder="Find a tool or name…" aria-label="Find in the admin panel" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other" data-autofill-safe>' +
            '<button type="button" id="dhFindClear" aria-label="Clear search" hidden>✕</button></div>' +
        "</div>" +
        '<div id="dhViews"></div>' +
      "</main>" +
      '<div id="dhLocked" hidden></div>';
    document.body.prepend(shell);
    const container = $(".container");
    if (container) $("#dhMain").append(container);

    PAGES.forEach(page => {
      const a = document.createElement("a");
      a.href = "#" + page.key;
      a.dataset.view = page.key;
      a.innerHTML = '<span class="dh-ico">' + page.icon + '</span><span class="dh-label">' + esc(page.title) + '</span><span class="dh-badge" data-badge="' + page.key + '" hidden></span>';
      $("#dhNav").append(a);
      const view = document.createElement("section");
      view.className = "dh-view";
      view.dataset.view = page.key;
      view.hidden = true;
      if (page.key === "home") view.innerHTML = '<div id="dhDash"></div>';
      else view.innerHTML = '<div class="dh-chips"></div>' + page.groups.map(([g, title]) =>
        '<div class="dh-group" data-group="' + g + '" id="dh-' + page.key + "-" + g + '" hidden><h2 class="dh-group-title">' + esc(title) + '</h2><div class="dh-grid"></div></div>').join("") +
        '<p class="dh-none" hidden>Nothing here matches your search.</p>';
      $("#dhViews").append(view);
    });
    $("#dhMenu").addEventListener("click", () => document.documentElement.classList.toggle("dh-nav-open"));
    $("#dhScrim").addEventListener("click", () => document.documentElement.classList.remove("dh-nav-open"));
    const find = $("#dhFind");
    find.addEventListener("input", () => { $("#dhFindClear").hidden = !find.value; search(find.value); });
    find.addEventListener("keydown", e => { if (e.key === "Escape") { find.value = ""; find.dispatchEvent(new Event("input")); } });
    $("#dhFindClear").addEventListener("click", () => { find.value = ""; find.dispatchEvent(new Event("input")); find.focus(); });
    document.addEventListener("keydown", e => {
      if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement?.tagName || "")) { e.preventDefault(); find.focus(); }
    });
    window.addEventListener("hashchange", route);
  }

  /* ---------- placing cards ---------- */
  const titleOf = card => (card.querySelector("h2,h3")?.textContent || "").trim();
  function topLevelCards() {
    return [...document.querySelectorAll(".card")].filter(c => !c.parentElement.closest(".card") && !c.dataset.dhPlaced && !c.closest("#dhDash"));
  }
  function ruleFor(card) {
    const title = titleOf(card).toLowerCase();
    for (let i = 0; i < REGISTRY.length; i++) {
      const [match, page, group, min] = REGISTRY[i];
      if ((match[0] === "#" && card.id === match.slice(1)) || (match[0] === "." && card.classList.contains(match.slice(1))) || (match.startsWith("h2:") && title.includes(match.slice(3))))
        return { page, group, min, order: i };
    }
    return { page: "tools", group: "logs", min: 4, order: 999 };
  }
  // Long explanations are tucked behind an ⓘ button so cards stay short.
  function tidy(card) {
    const heading = card.querySelector("h2,h3");
    const help = [...card.querySelectorAll(".admin-card-help, .staff-rank-help, .custom-badge-panel p, :scope > p")].find(p => !p.closest(".dh-table-wrap") && p.textContent.trim().length > 30);
    if (heading && help && !card.querySelector(".dh-info")) {
      help.classList.add("dh-help");
      const info = document.createElement("button");
      info.type = "button";
      info.className = "dh-info";
      info.title = help.textContent.trim();
      info.setAttribute("aria-label", "About this tool");
      info.textContent = "i";
      info.addEventListener("click", () => card.classList.toggle("dh-show-help"));
      heading.append(info);
    }
  }
  // Refresh/reload buttons are secondary, so they shouldn't look like the main action.
  function quietButtons(card) {
    card.querySelectorAll("button").forEach(b => { if (/^W*(refresh|reload)/i.test(b.textContent.trim())) b.classList.add("dh-btn-ghost"); });
  }
  function place(card) {
    const rule = ruleFor(card);
    card.dataset.dhPlaced = "1";
    card.classList.remove("collapsed");
    if (state.rank < rule.min) { $("#dhLocked").append(card); return; }
    card.dataset.page = rule.page;
    card.dataset.order = String(rule.order);
    card.classList.toggle("dh-wide", WIDE.includes(card.id));
    tidy(card);
    quietButtons(card);
    const grid = $("#dh-" + rule.page + "-" + rule.group + " .dh-grid");
    const after = [...grid.children].find(c => Number(c.dataset.order) > rule.order);
    grid.insertBefore(card, after || null);
  }
  function placeAll() {
    topLevelCards().forEach(place);
    let shown = 0;
    PAGES.forEach(page => {
      if (!page.groups) return;
      const view = $('.dh-view[data-view="' + page.key + '"]');
      let count = 0;
      const chips = [];
      page.groups.forEach(([g, title]) => {
        const group = $("#dh-" + page.key + "-" + g);
        const n = group.querySelector(".dh-grid").children.length;
        group.hidden = n === 0;
        if (n) chips.push('<a href="#dh-' + page.key + "-" + g + '" data-jump>' + esc(title) + " <b>" + n + "</b></a>");
        count += n;
      });
      view.querySelector(".dh-chips").innerHTML = chips.length > 1 ? chips.join("") : "";
      $('#dhNav a[data-view="' + page.key + '"]').hidden = count === 0;
      shown += count;
    });
    state.shown = shown;
    state.total = shown + $("#dhLocked").children.length;
    const access = $("#dhAccess");
    if (access) access.textContent = state.shown + " of " + state.total + " tools";
  }

  /* ---------- routing & search ---------- */
  function route() {
    const hash = decodeURIComponent(location.hash.slice(1));
    if (PAGES.some(p => p.key === hash)) return show(hash);
    const target = hash && document.getElementById(hash);
    if (target && target.closest(".dh-view")) return show(target.closest(".dh-view").dataset.view, target);
    show("home");
  }
  function show(key, focus) {
    if ($('#dhNav a[data-view="' + key + '"]')?.hidden) key = "home";
    state.page = key;
    const page = PAGES.find(p => p.key === key);
    if ($("#dhFind").value) { $("#dhFind").value = ""; search(""); }
    document.querySelectorAll(".dh-view").forEach(v => { v.hidden = v.dataset.view !== key; });
    document.querySelectorAll("#dhNav a").forEach(a => a.classList.toggle("active", a.dataset.view === key));
    $("#dhTitle").textContent = page.title;
    $("#dhBlurb").textContent = page.blurb;
    document.documentElement.classList.remove("dh-nav-open");
    if (key === "home") refreshDashboard();
    if (focus) {
      setTimeout(() => focus.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
      if (focus.classList.contains("card")) {
        focus.classList.add("dh-flash");
        setTimeout(() => focus.classList.remove("dh-flash"), 1600);
      }
    } else window.scrollTo({ top: 0 });
  }
  function search(raw) {
    const term = raw.trim().toLowerCase();
    document.documentElement.classList.toggle("dh-searching", !!term);
    let any = 0;
    document.querySelectorAll(".dh-view").forEach(view => {
      if (view.dataset.view === "home") { view.hidden = !!term || state.page !== "home"; return; }
      let shown = 0;
      view.querySelectorAll(".dh-group").forEach(group => {
        let groupShown = 0;
        group.querySelectorAll(".dh-grid > .card").forEach(card => {
          let rowHit = false;
          card.querySelectorAll(".admin-scroll-area > *, tbody > tr, .user-item, .warning-item, .message, .game, .video-moderation-item").forEach(row => {
            const hit = !term || row.textContent.toLowerCase().includes(term);
            row.classList.toggle("dh-search-hide", !hit);
            rowHit = rowHit || (!!term && hit);
          });
          const visible = !term || rowHit || titleOf(card).toLowerCase().includes(term) || card.textContent.toLowerCase().includes(term);
          card.classList.toggle("dh-search-hide", !visible);
          if (visible) groupShown++;
        });
        group.classList.toggle("dh-search-hide", !!term && !groupShown);
        shown += groupShown;
      });
      view.hidden = term ? shown === 0 : view.dataset.view !== state.page;
      any += shown;
    });
    $("#dhTitle").textContent = term ? "Results for “" + raw.trim() + "”" : PAGES.find(p => p.key === state.page).title;
    $("#dhBlurb").textContent = term ? (any ? any + " matching tool" + (any === 1 ? "" : "s") : "No matches. Try another word.") : PAGES.find(p => p.key === state.page).blurb;
  }

  /* ---------- home dashboard ---------- */
  function dashSkeleton() {
    const r = state.rank;
    const tiles = [];
    if (r >= 2) tiles.push(["chat", "💬", "Waiting for chat", "#chatAccessVerificationCard"]);
    tiles.push(["reports", "🚩", "Open reports", "#dhReportsCard"]);
    tiles.push(["warnings", "⚠️", "Warnings this week", "#userWarningsCard"]);
    if (r >= 4) tiles.push(["bans", "⛔", "Ban requests", "#ownerBanRequestsCard"]);
    else if (r >= 2) tiles.push(["staff", "🛡️", "Staff actions today", "#auditLogCard"]);
    $("#dhDash").innerHTML =
      '<div class="dh-hello"><div><h2>Hi, <span id="dhHelloName">there</span> 👋</h2><p>' + esc(RANK_BLURB[r]) + '</p></div>' +
        '<div class="dh-hello-side">' + rankPill(r) + '<small id="dhAccess"></small><small id="dhUpdated"></small></div></div>' +
      '<div class="dh-tiles">' + tiles.map(([k, icon, label, href]) => '<a class="dh-tile" data-tile-link="' + k + '" href="' + href + '"><span class="dh-tile-ico">' + icon + '</span><span class="dh-tile-n" data-tile="' + k + '">…</span><span class="dh-tile-label">' + label + "</span></a>").join("") + "</div>" +
      '<div class="dh-panels">' +
        '<section class="dh-panel dh-panel-alerts" id="dhAlerts"><h3>Needs attention</h3><div class="dh-list"></div></section>' +
        (r >= 2 ? '<section class="dh-panel" id="dhPendingChat"><h3>Waiting for chat <a href="#chatAccessVerificationCard">Review</a></h3><div class="dh-list"></div></section>' : "") +
        '<section class="dh-panel" id="dhRecentReports"><h3>Latest reports <a href="#dhReportsCard">See all</a></h3><div class="dh-list"></div></section>' +
        (r >= 2 ? '<section class="dh-panel" id="dhRecentActions"><h3>Recent staff actions <a href="#auditLogCard">Full log</a></h3><div class="dh-list"></div></section>' : "") +
        (r >= 3 ? '<section class="dh-panel" id="dhStatus"><h3>Site status <button type="button" class="dh-link-btn" id="dhStatusRun">Re-check</button></h3><div class="dh-list"></div></section>' : "") +
      "</div>";
    $("#dhStatusRun")?.addEventListener("click", runStatus);
  }
  const setTile = (k, v) => {
    const el = $('[data-tile="' + k + '"]');
    if (!el) return;
    el.textContent = v;
    el.closest(".dh-tile").classList.toggle("dh-tile-hot", Number(v) > 0 && k !== "staff" && k !== "warnings");
  };
  const listInto = (id, html) => { const el = $("#" + id + " .dh-list"); if (el) el.innerHTML = html; };
  const empty = text => '<p class="dh-empty">' + text + "</p>";
  function setBadge(page, n) {
    const b = $('[data-badge="' + page + '"]');
    if (!b) return;
    b.hidden = !n;
    b.textContent = n > 99 ? "99+" : n;
  }

  async function refreshDashboard() {
    if (!state.started || !$("#dhDash")) return;
    const client = db();
    const r = state.rank;
    const alerts = [];
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const dayAgo = new Date(Date.now() - 864e5).toISOString();
    const jobs = [];
    let peopleBadge = 0;

    if (r >= 2) jobs.push((async () => {
      const { data, error, count } = await client.from("chat_access_requests").select("user_id,requested_at", { count: "exact" }).order("requested_at", { ascending: true }).limit(5);
      if (error) { setTile("chat", "–"); listInto("dhPendingChat", empty("Couldn't load this right now.")); return; }
      const n = count ?? data.length;
      setTile("chat", n);
      peopleBadge += n;
      if (n) alerts.push(["warn", n + " member" + (n === 1 ? " is" : "s are") + " waiting for chat access", "#chatAccessVerificationCard"]);
      const names = await namesFor(data.map(d => d.user_id));
      listInto("dhPendingChat", data.length ? data.map(d => '<a class="dh-row" href="#chatAccessVerificationCard"><span>' + esc(at(names, d.user_id)) + "</span><small>" + pill("Pending") + " " + ago(d.requested_at) + "</small></a>").join("") : empty("Nobody is waiting 🎉"));
    })());

    jobs.push((async () => {
      const { data, error, count } = await client.from("user_reports").select("id,category,reason,created_at,target_user_id", { count: "exact" }).eq("status", "open").order("created_at", { ascending: false }).limit(5);
      if (error) { setTile("reports", "–"); listInto("dhRecentReports", empty("Reports aren't available right now.")); return; }
      const n = count ?? data.length;
      setTile("reports", n);
      setBadge("community", n);
      if (n) alerts.push([n >= 5 ? "bad" : "warn", n + " open report" + (n === 1 ? "" : "s") + " to review", "#dhReportsCard"]);
      const names = await namesFor(data.map(d => d.target_user_id));
      listInto("dhRecentReports", data.length ? data.map(d => '<a class="dh-row" href="#dhReportsCard"><span>' + pill(d.category, "cat") + " " + esc(d.reason.length > 54 ? d.reason.slice(0, 54) + "…" : d.reason) + "</span><small>" + (d.target_user_id ? esc(at(names, d.target_user_id)) + " · " : "") + ago(d.created_at) + "</small></a>").join("") : empty("No open reports 🎉"));
    })());

    jobs.push((async () => {
      const { count, error } = await client.from("user_warnings").select("id", { count: "exact", head: true }).gte("created_at", weekAgo);
      setTile("warnings", error ? "–" : count ?? 0);
    })());

    if (r >= 4) jobs.push((async () => {
      const { count, error } = await client.from("staff_ban_requests").select("id", { count: "exact", head: true }).eq("status", "pending");
      setTile("bans", error ? "–" : count ?? 0);
      if (!error && count) { peopleBadge += count; alerts.push(["bad", count + " ban request" + (count === 1 ? " needs" : "s need") + " your OK", "#ownerBanRequestsCard"]); }
      const flags = await client.from("admin_activity_flags").select("id", { count: "exact", head: true });
      if (!flags.error && flags.count) alerts.push(["warn", flags.count + " staff activity flag" + (flags.count === 1 ? "" : "s") + " to check", "#adminActivityFlagsCard"]);
    })());

    if (r >= 2) jobs.push((async () => {
      const { data, error } = await client.from("admin_audit_logs").select("id,created_at,actor_id,action,details,target_id,success").eq("event_type", "admin_action").order("created_at", { ascending: false }).limit(6);
      if (error) { listInto("dhRecentActions", empty("Couldn't load this right now.")); return; }
      if (r < 4) setTile("staff", data.filter(d => d.created_at >= dayAgo).length);
      const names = await namesFor(data.flatMap(d => [d.actor_id, d.target_id || d.details?.targetUserId]));
      listInto("dhRecentActions", data.length ? data.map(d => {
        const target = d.target_id || d.details?.targetUserId;
        return '<div class="dh-row"><span><b>' + esc(at(names, d.actor_id)) + "</b> " + esc(String(d.action || "").toLowerCase()) + (target ? " · " + esc(at(names, target)) : "") + (d.success === false ? " " + pill("Failed", "rejected") : "") + "</span><small>" + ago(d.created_at) + "</small></div>";
      }).join("") : empty("No staff actions yet."));
    })());

    await Promise.allSettled(jobs);
    setBadge("people", peopleBadge);
    if (!navigator.onLine) alerts.unshift(["bad", "You're offline, so changes won't save", ""]);
    listInto("dhAlerts", alerts.length
      ? alerts.map(([kind, text, href]) => '<a class="dh-alert dh-alert-' + kind + '"' + (href ? ' href="' + href + '"' : "") + "><span>" + esc(text) + "</span><b>→</b></a>").join("")
      : '<div class="dh-alert dh-alert-ok"><span>All clear. Nothing needs you right now ✨</span></div>');
    const upd = $("#dhUpdated");
    if (upd) upd.textContent = "Updated " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  // Developer+: a few quick health checks, kept small on the home page.
  async function runStatus() {
    if (!$("#dhStatus")) return;
    listInto("dhStatus", empty("Checking…"));
    const rows = [];
    const check = async (label, fn) => {
      const t0 = performance.now();
      try { const note = await fn(); rows.push([true, label, (note ? note + " · " : "") + Math.round(performance.now() - t0) + " ms"]); }
      catch (e) { rows.push([false, label, e.message || String(e)]); }
    };
    await check("Database", async () => { const { error, count } = await db().from("profiles").select("id", { count: "exact", head: true }); if (error) throw error; return count + " accounts"; });
    await check("Your session", async () => { const { data, error } = await db().auth.getSession(); if (error || !data.session) throw error || new Error("Signed out"); return "active"; });
    await check("Reports", async () => { const { error } = await db().from("user_reports").select("id", { head: true, count: "exact" }); if (error) throw error; return "working"; });
    rows.push([!state.errors.length, "This page", state.errors.length ? state.errors.length + " script error(s): " + state.errors.slice(-1)[0] : "no errors"]);
    listInto("dhStatus", rows.map(([ok, label, note]) => '<div class="dh-row"><span><i class="dh-dot ' + (ok ? "ok" : "bad") + '"></i>' + esc(label) + "</span><small>" + esc(note) + "</small></div>").join(""));
  }

  /* ---------- new cards ---------- */
  function newCard(id, title, help, body) {
    const card = document.createElement("section");
    card.className = "card dh-card";
    card.id = id;
    card.innerHTML = "<h2>" + title + "</h2>" + (help ? '<p class="admin-card-help">' + help + "</p>" : "") + body;
    document.body.append(card);
    return card;
  }

  function reportsCard() {
    const card = newCard("dhReportsCard", "🚩 Reports", "Reports members send with “Report a problem”. Resolve or dismiss each one. Your name is saved with every decision.",
      '<div class="dh-toolbar"><div class="dh-seg">' +
        ["open", "resolved", "dismissed", "all"].map((s, i) => '<button type="button" data-status="' + s + '"' + (i ? "" : ' class="active"') + ">" + s[0].toUpperCase() + s.slice(1) + "</button>").join("") +
      '</div><span class="dh-muted" data-role="status"></span></div>' +
      '<div class="dh-table-wrap"><table class="dh-table"><thead><tr><th>Status</th><th>About</th><th>What happened</th><th>From</th><th>When</th><th></th></tr></thead><tbody></tbody></table></div>');
    let filter = "open";
    const tbody = card.querySelector("tbody");
    const status = card.querySelector('[data-role="status"]');
    async function load() {
      let q = db().from("user_reports").select("id,category,reason,context,status,created_at,target_user_id,reporter_id,handled_by,handled_at,resolution_note").order("created_at", { ascending: false }).limit(100);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) { tbody.innerHTML = '<tr><td colspan="6">' + empty("Couldn't load reports: " + esc(error.message)) + "</td></tr>"; return; }
      const names = await namesFor(data.flatMap(d => [d.target_user_id, d.reporter_id, d.handled_by]));
      status.textContent = data.length ? data.length + " shown" : "";
      tbody.innerHTML = data.length ? "" : '<tr><td colspan="6">' + empty("No " + (filter === "all" ? "" : filter + " ") + "reports 🎉") + "</td></tr>";
      data.forEach(rep => {
        const tr = document.createElement("tr");
        const kind = { open: "pending", resolved: "approved", dismissed: "rejected" }[rep.status];
        tr.innerHTML =
          '<td data-label="Status">' + pill(rep.status[0].toUpperCase() + rep.status.slice(1), kind) + "</td>" +
          '<td data-label="About">' + (rep.target_user_id ? "<b>" + esc(at(names, rep.target_user_id)) + "</b>" : '<span class="dh-muted">Site problem</span>') + " " + pill(rep.category, "cat") + "</td>" +
          '<td data-label="What happened">' + esc(rep.reason) + (rep.context ? '<div class="dh-muted">' + esc(rep.context) + "</div>" : "") +
            (rep.handled_by ? '<div class="dh-muted">' + esc(rep.status[0].toUpperCase() + rep.status.slice(1)) + " by " + esc(at(names, rep.handled_by)) + " " + ago(rep.handled_at) + (rep.resolution_note ? ": " + esc(rep.resolution_note) : "") + "</div>" : "") + "</td>" +
          '<td data-label="From">' + esc(at(names, rep.reporter_id)) + "</td>" +
          '<td data-label="When">' + ago(rep.created_at) + "</td>" +
          '<td class="dh-actions"></td>';
        const actions = tr.querySelector(".dh-actions");
        const act = (label, next, cls) => {
          const b = document.createElement("button");
          b.type = "button"; b.textContent = label; b.className = cls;
          b.addEventListener("click", async () => {
            let note = null;
            if (next !== "open") {
              note = prompt((next === "resolved" ? "Resolve" : "Dismiss") + " this report? Add a short note (optional):", "");
              if (note === null) return;
            }
            b.disabled = true;
            const { error } = await db().rpc("dh_handle_report", { p_report_id: rep.id, p_status: next, p_note: note });
            if (error) { status.textContent = "Couldn't update: " + error.message; b.disabled = false; return; }
            load(); refreshDashboard();
          });
          actions.append(b);
        };
        if (rep.status === "open") { act("Resolve", "resolved", "dh-btn-ok"); act("Dismiss", "dismissed", "dh-btn-ghost"); }
        else act("Reopen", "open", "dh-btn-ghost");
        tbody.append(tr);
      });
      if ($("#dhFind").value) search($("#dhFind").value);
    }
    card.querySelectorAll("[data-status]").forEach(b => b.addEventListener("click", () => {
      filter = b.dataset.status;
      card.querySelectorAll("[data-status]").forEach(x => x.classList.toggle("active", x === b));
      load();
    }));
    load();
    setInterval(() => { if (!document.hidden) load(); }, 45000);
  }

  function staffTeamCard() {
    const card = newCard("dhStaffTeamCard", "🛡️ Staff team", "Everyone with a staff rank, when they joined the staff, and how active they've been this week.",
      '<div class="dh-table-wrap"><table class="dh-table"><thead><tr><th>Member</th><th>Rank</th><th>Staff since</th><th>This week</th><th>Last active</th><th></th></tr></thead><tbody><tr><td colspan="6">' + empty("Loading…") + "</td></tr></tbody></table></div>");
    const tbody = card.querySelector("tbody");
    async function load() {
      let res = await db().from("profiles").select("id,username,staff_role,is_owner,staff_since").or("staff_role.in.(helper,admin,developer,tech,owner),is_owner.eq.true");
      if (res.error && /staff_since/.test(res.error.message)) res = await db().from("profiles").select("id,username,staff_role,is_owner").or("staff_role.in.(helper,admin,developer,tech,owner),is_owner.eq.true");
      if (res.error) { tbody.innerHTML = '<tr><td colspan="6">' + empty("Couldn't load staff.") + "</td></tr>"; return; }
      const staff = res.data.map(p => ({ ...p, rank: p.is_owner ? 4 : rankOf(p.staff_role) })).filter(p => p.rank > 0).sort((a, b) => b.rank - a.rank || String(a.username).localeCompare(b.username));
      const since = new Date(Date.now() - 7 * 864e5).toISOString();
      const logs = await db().from("admin_audit_logs").select("actor_id,created_at").eq("event_type", "admin_action").gte("created_at", since).in("actor_id", staff.map(s => s.id)).order("created_at", { ascending: false }).limit(1000);
      const activity = new Map();
      (logs.data || []).forEach(l => { const a = activity.get(l.actor_id) || { n: 0, last: l.created_at }; a.n++; activity.set(l.actor_id, a); });
      tbody.innerHTML = "";
      staff.forEach(p => {
        const a = activity.get(p.id);
        const tr = document.createElement("tr");
        tr.innerHTML =
          '<td data-label="Member"><span class="dh-mini-avatar">' + esc((p.username || "?")[0].toUpperCase()) + "</span><b>@" + esc(p.username || "unknown") + "</b>" + (p.id === state.user?.id ? ' <span class="dh-muted">(you)</span>' : "") + "</td>" +
          '<td data-label="Rank">' + rankPill(p.rank) + "</td>" +
          '<td data-label="Staff since">' + (p.staff_since ? new Date(p.staff_since).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "—") + "</td>" +
          '<td data-label="This week">' + (a ? a.n + " action" + (a.n === 1 ? "" : "s") : '<span class="dh-muted">none</span>') + "</td>" +
          '<td data-label="Last active">' + (a ? ago(a.last) : '<span class="dh-muted">—</span>') + "</td>" +
          '<td class="dh-actions"></td>';
        if (state.rank >= 4 && p.id !== state.user?.id && p.rank < 4) {
          const b = document.createElement("button");
          b.type = "button"; b.className = "dh-btn-ghost"; b.textContent = "Change rank";
          b.addEventListener("click", () => {
            const select = document.getElementById("staffTarget");
            if (select) { select.value = p.id; select.dispatchEvent(new Event("change", { bubbles: true })); }
            location.hash = "staffManagementCard";
          });
          tr.querySelector(".dh-actions").append(b);
        }
        tbody.append(tr);
      });
      if (!staff.length) tbody.innerHTML = '<tr><td colspan="6">' + empty("No staff yet.") + "</td></tr>";
    }
    load();
    setInterval(() => { if (!document.hidden) load(); }, 60000);
  }

  /* ---------- start ---------- */
  function start(role, user) {
    const rank = rankOf(role);
    if (!rank) return;
    if (state.started) { if (rank !== state.rank) location.reload(); return; }
    state.started = true;
    state.rank = rank;
    state.user = user;
    build();
    $("#dhMeRank").innerHTML = rankPill(rank);
    const pwUser = document.getElementById("staffConfirmUsername");
    if (pwUser && user?.email) pwUser.value = user.email;
    db().from("profiles").select("username").eq("id", user?.id).maybeSingle().then(({ data }) => {
      const name = data?.username || user?.email?.split("@")[0] || "staff";
      $("#dhMeName").textContent = "@" + name;
      $("#dhMeAvatar").textContent = name[0].toUpperCase();
      const hello = $("#dhHelloName"); if (hello) hello.textContent = name;
    });
    dashSkeleton();
    reportsCard();
    if (rank >= 2) staffTeamCard();
    placeAll();
    // Cards added later (e.g. chat approvals) are sorted in as they appear.
    new MutationObserver(() => { if (topLevelCards().length) placeAll(); }).observe(document.body, { childList: true, subtree: true });
    route();
    runStatus();
    setInterval(() => { if (!document.hidden && state.page === "home") refreshDashboard(); }, 30000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && state.page === "home") refreshDashboard(); });
  }

  window.DHAdminShell = { start, refresh: refreshDashboard, rankOf };
  if (window.__dhAdminReady) start(window.__dhAdminReady.role, window.__dhAdminReady.user);
})();
