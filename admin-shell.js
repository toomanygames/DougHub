/* DougHub admin shell: sidebar + dashboard + six sections, with every tool gated by staff rank.
   Ranks inherit downward: Helper 1 < Admin 2 < Developer 3 < Owner 4.
   Hiding a tool here is only for clarity; the database enforces every permission on its own. */
(function () {
  "use strict";
  if (window.DHAdminShell) return;

  const RANKS = { none: 0, helper: 1, admin: 2, developer: 3, tech: 3, owner: 4 };
  const RANK_NAMES = ["Member", "Helper", "Admin", "Developer", "Owner"];
  const RANK_BLURB = [
    "",
    "Basic moderation: reports, warnings, chat groups and pins, helping members.",
    "Everything Helpers have, plus accounts, chat approval, bans and community moderation.",
    "Everything Admins have, plus technical tools, diagnostics and feedback.",
    "Full control: staff ranks, permissions, system-wide settings and site availability."
  ];
  const SECTIONS = [
    { key: "dashboard", title: "Dashboard", icon: "🏠", blurb: "What needs your attention right now." },
    { key: "people", title: "People & Accounts", icon: "👥", blurb: "Members, staff, warnings, bans and chat approval." },
    { key: "chat", title: "Chat & Community", icon: "💬", blurb: "Reports, chat moderation, groups, polls and pins." },
    { key: "content", title: "Content & Games", icon: "🎮", blurb: "Community games, DougTube, music, code projects and badges." },
    { key: "developer", title: "Developer Tools", icon: "🛠️", blurb: "Diagnostics, feedback, game requests and feature flags." },
    { key: "system", title: "Site & System", icon: "⚙️", blurb: "Site-wide settings, schedules, banners and availability." },
    { key: "other", title: "Other", icon: "📁", blurb: "Audit log and activity review." }
  ];
  // [how to recognise the card, section, minimum rank]. Unknown cards default to Owner-only.
  const REGISTRY = [
    ["#chatAccessVerificationCard", "people", 2],
    ["#dhStaffTeamCard", "people", 2],
    ["h2:users", "people", 2],
    ["#userWarningsCard", "people", 1],
    ["#recentWarningsCard", "people", 1],
    ["#banAccountsCard", "people", 2],
    ["#ownerBanRequestsCard", "people", 4],
    ["#staffManagementCard", "people", 4],
    ["#dhReportsCard", "chat", 1],
    ["#chatGroupModerationCard", "chat", 1],
    ["#chatPinnedModerationCard", "chat", 1],
    ["#chatPollModerationCard", "chat", 2],
    ["h2:chat messages", "chat", 2],
    ["#chatRetentionCard", "chat", 2],
    [".community-games-tube-card", "content", 2],
    ["#dougHubMusicModerationCard", "content", 2],
    ["h2:code projects", "content", 3],
    ["#customBadgeManagerCard", "content", 3],
    ["#dhDiagnosticsCard", "developer", 3],
    ["#feedbackManagementCard", "developer", 3],
    ["#gameRequestsManagementCard", "developer", 3],
    ["#siteFeatureCard", "developer", 3],
    ["h2:dougbase access", "developer", 3],
    ["#siteAnnouncementCard", "system", 4],
    ["#pageScheduleCard", "system", 4],
    ["#chatGamesDailyScheduleCard", "system", 4],
    ["#adminUiPreferenceCard", "system", 4],
    ["#auditLogCard", "other", 2],
    ["#adminActivityFlagsCard", "other", 4]
  ];

  const state = { rank: 0, role: "none", user: null, started: false, view: "dashboard", timers: [], errors: [] };
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
  window.addEventListener("error", e => state.errors.push({ at: new Date().toISOString(), text: e.message || "Script error" }));
  window.addEventListener("unhandledrejection", e => state.errors.push({ at: new Date().toISOString(), text: String(e.reason?.message || e.reason || "Unhandled promise") }));

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
        '<div class="dh-brand"><a href="index.html" title="Back to DougHub">Doug<span>Hub</span></a><small>Staff console</small></div>' +
        '<div class="dh-me"><div class="dh-avatar" id="dhMeAvatar">?</div><div><strong id="dhMeName">Loading…</strong><div id="dhMeRank"></div></div></div>' +
        '<nav id="dhNav"></nav>' +
        '<div class="dh-side-foot"><a href="index.html">← Back to DougHub</a></div>' +
      "</aside>" +
      '<div id="dhScrim"></div>' +
      '<main id="dhMain">' +
        '<div id="dhTop"><button type="button" id="dhMenu" aria-label="Open navigation">☰</button>' +
          '<div class="dh-top-title"><h1 id="dhTitle">Dashboard</h1><p id="dhBlurb"></p></div>' +
          '<label class="dh-search"><span aria-hidden="true">🔍</span><input id="dhSearch" type="search" placeholder="Search tools, users, rows…" aria-label="Search the admin panel"></label>' +
        "</div>" +
        '<div id="dhViews"></div>' +
      "</main>" +
      '<div id="dhLocked" hidden></div>';
    document.body.prepend(shell);
    const container = $(".container");
    if (container) $("#dhMain").append(container);

    const nav = $("#dhNav");
    const views = $("#dhViews");
    SECTIONS.forEach(sec => {
      const a = document.createElement("a");
      a.href = "#" + sec.key;
      a.dataset.view = sec.key;
      a.innerHTML = '<span class="dh-ico">' + sec.icon + '</span><span class="dh-label">' + esc(sec.title) + '</span><span class="dh-count" data-count="' + sec.key + '"></span>';
      nav.append(a);
      const view = document.createElement("section");
      view.className = "dh-view";
      view.dataset.view = sec.key;
      view.hidden = true;
      view.innerHTML = sec.key === "dashboard" ? '<div id="dhDash"></div>' : '<div class="dh-grid"></div><p class="dh-empty-view" hidden>No tools match your search here.</p>';
      views.append(view);
    });
    $("#dhMenu").addEventListener("click", () => document.documentElement.classList.toggle("dh-nav-open"));
    $("#dhScrim").addEventListener("click", () => document.documentElement.classList.remove("dh-nav-open"));
    $("#dhSearch").addEventListener("input", () => search($("#dhSearch").value));
    window.addEventListener("hashchange", route);
  }

  /* ---------- placing cards ---------- */
  function topLevelCards() {
    return [...document.querySelectorAll(".card")].filter(c => !c.parentElement.closest(".card") && !c.dataset.dhPlaced && !c.closest("#dhDash"));
  }
  function ruleFor(card) {
    const title = (card.querySelector("h2,h3")?.textContent || "").toLowerCase();
    for (const [match, section, min] of REGISTRY) {
      if (match.startsWith("#") && card.id === match.slice(1)) return { section, min };
      if (match.startsWith(".") && card.classList.contains(match.slice(1))) return { section, min };
      if (match.startsWith("h2:") && title.includes(match.slice(3))) return { section, min };
    }
    return { section: "other", min: 4 };
  }
  function place(card) {
    const rule = ruleFor(card);
    card.dataset.dhPlaced = "1";
    card.dataset.requiredRank = String(rule.min);
    card.classList.remove("collapsed");
    if (state.rank < rule.min) { $("#dhLocked").append(card); return; }
    const grid = $('.dh-view[data-view="' + rule.section + '"] .dh-grid');
    card.dataset.section = rule.section;
    const wide = ["#dhReportsCard", "#dhStaffTeamCard", "#chatAccessVerificationCard", "#auditLogCard", "#banAccountsCard", "#dhDiagnosticsCard"].some(id => card.id === id.slice(1));
    card.classList.toggle("dh-wide", wide);
    // Keep the registry order inside each section.
    const order = REGISTRY.findIndex(([m]) => (m.startsWith("#") && card.id === m.slice(1)) || (m.startsWith(".") && card.classList.contains(m.slice(1))) || (m.startsWith("h2:") && (card.querySelector("h2,h3")?.textContent || "").toLowerCase().includes(m.slice(3))));
    card.dataset.order = String(order < 0 ? 999 : order);
    const after = [...grid.children].find(c => Number(c.dataset.order) > Number(card.dataset.order));
    grid.insertBefore(card, after || null);
  }
  function placeAll() {
    topLevelCards().forEach(place);
    SECTIONS.forEach(sec => {
      if (sec.key === "dashboard") return;
      const n = $('.dh-view[data-view="' + sec.key + '"] .dh-grid').children.length;
      const link = $('#dhNav a[data-view="' + sec.key + '"]');
      link.hidden = n === 0;
    });
  }

  /* ---------- routing & search ---------- */
  function route() {
    const hash = decodeURIComponent(location.hash.slice(1));
    let view = SECTIONS.some(s => s.key === hash) ? hash : null;
    let focus = null;
    if (!view && hash) {
      const card = document.getElementById(hash);
      if (card && card.dataset.section) { view = card.dataset.section; focus = card; }
    }
    show(view || "dashboard", focus);
  }
  function show(key, focus) {
    if ($('#dhNav a[data-view="' + key + '"]')?.hidden) key = "dashboard";
    state.view = key;
    const sec = SECTIONS.find(s => s.key === key);
    document.querySelectorAll(".dh-view").forEach(v => { v.hidden = v.dataset.view !== key && !document.documentElement.classList.contains("dh-searching"); });
    document.querySelectorAll("#dhNav a").forEach(a => a.classList.toggle("active", a.dataset.view === key));
    $("#dhTitle").textContent = sec.title;
    $("#dhBlurb").textContent = sec.blurb;
    document.documentElement.classList.remove("dh-nav-open");
    if (key === "dashboard") refreshDashboard();
    if (focus) {
      focus.scrollIntoView({ behavior: "smooth", block: "start" });
      focus.classList.add("dh-flash");
      setTimeout(() => focus.classList.remove("dh-flash"), 1600);
    } else {
      $("#dhMain").scrollTo?.({ top: 0 });
      window.scrollTo({ top: 0 });
    }
  }
  function search(raw) {
    const term = raw.trim().toLowerCase();
    const root = document.documentElement;
    root.classList.toggle("dh-searching", !!term);
    document.querySelectorAll(".dh-view").forEach(view => {
      if (view.dataset.view === "dashboard") { view.hidden = !!term || state.view !== "dashboard"; return; }
      let shown = 0;
      view.querySelectorAll(":scope .dh-grid > .card").forEach(card => {
        // Filter list rows inside the card, then the card itself.
        let rowHit = false;
        card.querySelectorAll(".admin-scroll-area > *, tbody > tr, .dh-row, .user-item, .warning-item, .message, .game, .video-moderation-item, .staff-current-item").forEach(row => {
          const hit = !term || row.textContent.toLowerCase().includes(term);
          row.classList.toggle("dh-search-hide", !hit);
          rowHit = rowHit || (term && hit);
        });
        const titleHit = !term || (card.querySelector("h2,h3")?.textContent || "").toLowerCase().includes(term) || card.textContent.toLowerCase().includes(term);
        const visible = !term || titleHit || rowHit;
        card.classList.toggle("dh-search-hide", !visible);
        if (visible) shown++;
      });
      view.hidden = term ? shown === 0 : view.dataset.view !== state.view;
      const empty = view.querySelector(".dh-empty-view");
      if (empty) empty.hidden = true;
    });
    $("#dhTitle").textContent = term ? 'Search: "' + raw.trim() + '"' : SECTIONS.find(s => s.key === state.view).title;
  }

  /* ---------- dashboard ---------- */
  function dashSkeleton() {
    const r = state.rank;
    const tiles = [];
    if (r >= 2) tiles.push(["chat", "Chat requests waiting", "#people"]);
    tiles.push(["reports", "Open reports", "#chat"]);
    tiles.push(["warnings", "Warnings this week", "#people"]);
    if (r >= 4) tiles.push(["bans", "Ban requests to review", "#ownerBanRequestsCard"]);
    else if (r >= 2) tiles.push(["staff", "Staff actions today", "#other"]);
    $("#dhDash").innerHTML =
      '<div class="dh-hello"><div><h2>Hi, <span id="dhHelloName">staff</span> 👋</h2><p>' + esc(RANK_BLURB[r]) + '</p></div><div class="dh-updated" id="dhUpdated"></div></div>' +
      '<div class="dh-tiles">' + tiles.map(([k, label, href]) => '<a class="dh-tile" href="' + href + '"><span class="dh-tile-n" data-tile="' + k + '">…</span><span>' + label + "</span></a>").join("") + "</div>" +
      '<div class="dh-panels">' +
        '<section class="dh-panel" id="dhAlerts"><h3>System alerts</h3><div class="dh-list"></div></section>' +
        (r >= 2 ? '<section class="dh-panel" id="dhPendingChat"><h3>Pending chat approvals <a href="#chatAccessVerificationCard">Review →</a></h3><div class="dh-list"></div></section>' : "") +
        '<section class="dh-panel" id="dhRecentReports"><h3>Recent reports <a href="#dhReportsCard">All reports →</a></h3><div class="dh-list"></div></section>' +
        (r >= 2 ? '<section class="dh-panel" id="dhRecentActions"><h3>Recent staff actions <a href="#auditLogCard">Audit log →</a></h3><div class="dh-list"></div></section>' : "") +
      "</div>";
  }
  const setTile = (k, v) => { const el = $('[data-tile="' + k + '"]'); if (el) el.textContent = v; };
  const listInto = (id, html) => { const el = $("#" + id + " .dh-list"); if (el) el.innerHTML = html; };
  async function refreshDashboard() {
    if (!state.started || !$("#dhDash")) return;
    const client = db();
    const r = state.rank;
    const alerts = [];
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const dayAgo = new Date(Date.now() - 864e5).toISOString();
    const jobs = [];

    if (r >= 2) jobs.push((async () => {
      const { data, error, count } = await client.from("chat_access_requests").select("user_id,requested_at", { count: "exact" }).order("requested_at", { ascending: true }).limit(6);
      if (error) { setTile("chat", "–"); listInto("dhPendingChat", '<p class="dh-muted">Couldn\'t load: ' + esc(error.message) + "</p>"); return; }
      setTile("chat", count ?? data.length);
      if ((count || 0) > 0) alerts.push(["warn", count + " member" + (count === 1 ? " is" : "s are") + " waiting for chat approval.", "#chatAccessVerificationCard"]);
      const names = await namesFor(data.map(d => d.user_id));
      listInto("dhPendingChat", data.length ? data.map(d => '<div class="dh-row"><span>' + esc(at(names, d.user_id)) + " " + pill("Pending") + '</span><small>' + ago(d.requested_at) + "</small></div>").join("") : '<p class="dh-muted">Nobody is waiting. 🎉</p>');
    })());

    jobs.push((async () => {
      const { data, error, count } = await client.from("user_reports").select("id,category,reason,status,created_at,target_user_id,reporter_id", { count: "exact" }).eq("status", "open").order("created_at", { ascending: false }).limit(5);
      if (error) { setTile("reports", "–"); listInto("dhRecentReports", '<p class="dh-muted">Reports will appear here once the reports database update is applied.</p>'); return; }
      setTile("reports", count ?? data.length);
      if ((count || 0) >= 5) alerts.push(["bad", count + " reports are open. Please review them.", "#dhReportsCard"]);
      const names = await namesFor(data.flatMap(d => [d.target_user_id, d.reporter_id]));
      listInto("dhRecentReports", data.length ? data.map(d => '<div class="dh-row"><span>' + pill(d.category, "cat") + " " + esc(d.reason.length > 60 ? d.reason.slice(0, 60) + "…" : d.reason) + '</span><small>' + (d.target_user_id ? esc(at(names, d.target_user_id)) + " · " : "") + ago(d.created_at) + "</small></div>").join("") : '<p class="dh-muted">No open reports.</p>');
    })());

    jobs.push((async () => {
      const { count, error } = await client.from("user_warnings").select("id", { count: "exact", head: true }).gte("created_at", weekAgo);
      setTile("warnings", error ? "–" : count ?? 0);
    })());

    if (r >= 4) jobs.push((async () => {
      const { count, error } = await client.from("staff_ban_requests").select("id", { count: "exact", head: true }).eq("status", "pending");
      setTile("bans", error ? "–" : count ?? 0);
      if (!error && count) alerts.push(["bad", count + " Developer ban request" + (count === 1 ? " needs" : "s need") + " your review.", "#ownerBanRequestsCard"]);
      const flags = await client.from("admin_activity_flags").select("id", { count: "exact", head: true });
      if (!flags.error && flags.count) alerts.push(["warn", flags.count + " suspicious admin activity flag" + (flags.count === 1 ? "" : "s") + " to look at.", "#adminActivityFlagsCard"]);
    })());

    if (r >= 2) jobs.push((async () => {
      const { data, error } = await client.from("admin_audit_logs").select("id,created_at,actor_id,category,action,details,target_id,success").eq("event_type", "admin_action").order("created_at", { ascending: false }).limit(8);
      if (error) { listInto("dhRecentActions", '<p class="dh-muted">Couldn\'t load: ' + esc(error.message) + "</p>"); return; }
      const today = data.filter(d => d.created_at >= dayAgo).length;
      if (r < 4) setTile("staff", today);
      const names = await namesFor(data.flatMap(d => [d.actor_id, d.target_id || d.details?.targetUserId]));
      listInto("dhRecentActions", data.length ? data.map(d => {
        const target = d.target_id || d.details?.targetUserId;
        return '<div class="dh-row"><span><b>' + esc(at(names, d.actor_id)) + "</b> " + esc(d.action) + (target ? " → " + esc(at(names, target)) : "") + " " + (d.success === false ? pill("Failed", "rejected") : "") + '</span><small>' + ago(d.created_at) + "</small></div>";
      }).join("") : '<p class="dh-muted">No staff actions logged yet.</p>');
    })());

    if (r >= 3) jobs.push((async () => {
      const t0 = performance.now();
      const { error } = await client.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
      const ms = Math.round(performance.now() - t0);
      if (error) alerts.push(["bad", "Database check failed: " + error.message, "#dhDiagnosticsCard"]);
      else if (ms > 1500) alerts.push(["warn", "Database is responding slowly (" + ms + " ms).", "#dhDiagnosticsCard"]);
      if (state.errors.length) alerts.push(["warn", state.errors.length + " script error" + (state.errors.length === 1 ? "" : "s") + " on this page since it opened.", "#dhDiagnosticsCard"]);
    })());

    await Promise.allSettled(jobs);
    if (!navigator.onLine) alerts.unshift(["bad", "You appear to be offline. Changes won't save until you reconnect.", ""]);
    listInto("dhAlerts", alerts.length
      ? alerts.map(([kind, text, href]) => '<a class="dh-alert dh-alert-' + kind + '"' + (href ? ' href="' + href + '"' : "") + "><span>" + (kind === "bad" ? "⛔" : "⚠️") + "</span>" + esc(text) + "</a>").join("")
      : '<div class="dh-alert dh-alert-ok"><span>✅</span>All clear. Nothing needs attention.</div>');
    const upd = $("#dhUpdated");
    if (upd) upd.textContent = "Updated " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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
    const card = newCard("dhReportsCard", "🚩 Reports", "Reports members send from “Report a problem”. Resolve or dismiss each one; every decision is logged with your name.",
      '<div class="dh-toolbar"><div class="dh-seg" role="tablist">' +
        ["open", "resolved", "dismissed", "all"].map((s, i) => '<button type="button" data-status="' + s + '"' + (i ? "" : ' class="active"') + ">" + s[0].toUpperCase() + s.slice(1) + "</button>").join("") +
      '</div><button type="button" class="dh-ghost" data-act="refresh">↻ Refresh</button></div>' +
      '<div class="dh-table-wrap"><table class="dh-table"><thead><tr><th>Status</th><th>About</th><th>Report</th><th>From</th><th>When</th><th></th></tr></thead><tbody></tbody></table></div>' +
      '<div class="status" data-role="status"></div>');
    let filter = "open";
    const tbody = card.querySelector("tbody");
    const status = card.querySelector('[data-role="status"]');
    async function load() {
      let q = db().from("user_reports").select("id,category,reason,context,status,created_at,target_user_id,reporter_id,handled_by,handled_at,resolution_note").order("created_at", { ascending: false }).limit(100);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) { tbody.innerHTML = ""; status.textContent = /user_reports/.test(error.message) ? "Reports need the database update that comes with this panel." : "Couldn't load reports: " + error.message; return; }
      const names = await namesFor(data.flatMap(d => [d.target_user_id, d.reporter_id, d.handled_by]));
      status.textContent = data.length ? data.length + " report" + (data.length === 1 ? "" : "s") : "";
      tbody.innerHTML = data.length ? "" : '<tr><td colspan="6" class="dh-muted">No ' + (filter === "all" ? "" : filter + " ") + "reports.</td></tr>";
      data.forEach(rep => {
        const tr = document.createElement("tr");
        tr.className = "dh-row";
        const kind = { open: "pending", resolved: "approved", dismissed: "rejected" }[rep.status];
        tr.innerHTML =
          '<td data-label="Status">' + pill(rep.status[0].toUpperCase() + rep.status.slice(1), kind) + "</td>" +
          '<td data-label="About">' + (rep.target_user_id ? esc(at(names, rep.target_user_id)) : '<span class="dh-muted">Site problem</span>') + "<br>" + pill(rep.category, "cat") + "</td>" +
          '<td data-label="Report">' + esc(rep.reason) + (rep.context ? '<br><small class="dh-muted">' + esc(rep.context) + "</small>" : "") +
            (rep.handled_by ? '<br><small class="dh-muted">' + esc(rep.status) + " by " + esc(at(names, rep.handled_by)) + " " + ago(rep.handled_at) + (rep.resolution_note ? ": " + esc(rep.resolution_note) : "") + "</small>" : "") + "</td>" +
          '<td data-label="From">' + esc(at(names, rep.reporter_id)) + "</td>" +
          '<td data-label="When">' + ago(rep.created_at) + "</td>" +
          '<td class="dh-actions"></td>';
        const actions = tr.querySelector(".dh-actions");
        const act = (label, next, cls) => {
          const b = document.createElement("button");
          b.type = "button"; b.textContent = label; b.className = cls || "";
          b.addEventListener("click", async () => {
            let note = null;
            if (next !== "open") {
              note = prompt((next === "resolved" ? "Resolve" : "Dismiss") + " this report. Add a short note for the log (optional):", "");
              if (note === null) return;
            }
            b.disabled = true;
            const { error } = await db().rpc("dh_handle_report", { p_report_id: rep.id, p_status: next, p_note: note });
            if (error) { status.textContent = "Couldn't update: " + error.message; b.disabled = false; return; }
            status.textContent = "Report marked " + next + ".";
            load(); refreshDashboard();
          });
          actions.append(b);
        };
        if (rep.status === "open") { act("Resolve", "resolved", "dh-ok"); act("Dismiss", "dismissed", "dh-ghost"); }
        else act("Reopen", "open", "dh-ghost");
        if (rep.target_user_id && state.rank >= 1) {
          const w = document.createElement("a");
          w.href = "#userWarningsCard"; w.className = "dh-link"; w.textContent = "Warn…";
          actions.append(w);
        }
        tbody.append(tr);
      });
      if ($("#dhSearch").value) search($("#dhSearch").value);
    }
    card.querySelectorAll("[data-status]").forEach(b => b.addEventListener("click", () => {
      filter = b.dataset.status;
      card.querySelectorAll("[data-status]").forEach(x => x.classList.toggle("active", x === b));
      load();
    }));
    card.querySelector('[data-act="refresh"]').addEventListener("click", load);
    load();
    state.timers.push(setInterval(() => { if (!document.hidden) load(); }, 45000));
  }

  function staffTeamCard() {
    const card = newCard("dhStaffTeamCard", "🛡️ Staff team", "Everyone with a staff rank, when they joined the staff, and their moderation activity over the last 7 days. Only the Owner can change ranks, and nobody can change their own.",
      '<div class="dh-table-wrap"><table class="dh-table"><thead><tr><th>Member</th><th>Rank</th><th>Staff since</th><th>Actions (7 days)</th><th>Last action</th><th></th></tr></thead><tbody><tr><td colspan="6" class="dh-muted">Loading…</td></tr></tbody></table></div>');
    const tbody = card.querySelector("tbody");
    async function load() {
      let res = await db().from("profiles").select("id,username,staff_role,is_owner,staff_since").or("staff_role.in.(helper,admin,developer,tech,owner),is_owner.eq.true");
      if (res.error && /staff_since/.test(res.error.message)) res = await db().from("profiles").select("id,username,staff_role,is_owner").or("staff_role.in.(helper,admin,developer,tech,owner),is_owner.eq.true");
      if (res.error) { tbody.innerHTML = '<tr><td colspan="6">Couldn\'t load staff: ' + esc(res.error.message) + "</td></tr>"; return; }
      const staff = res.data.map(p => ({ ...p, rank: p.is_owner ? 4 : rankOf(p.staff_role) })).filter(p => p.rank > 0).sort((a, b) => b.rank - a.rank || String(a.username).localeCompare(b.username));
      const since = new Date(Date.now() - 7 * 864e5).toISOString();
      const logs = await db().from("admin_audit_logs").select("actor_id,created_at").eq("event_type", "admin_action").gte("created_at", since).in("actor_id", staff.map(s => s.id)).order("created_at", { ascending: false }).limit(1000);
      const activity = new Map();
      (logs.data || []).forEach(l => {
        const a = activity.get(l.actor_id) || { n: 0, last: l.created_at };
        a.n++; activity.set(l.actor_id, a);
      });
      tbody.innerHTML = "";
      staff.forEach(p => {
        const a = activity.get(p.id);
        const tr = document.createElement("tr");
        tr.className = "dh-row";
        tr.innerHTML =
          '<td data-label="Member"><b>@' + esc(p.username || "unknown") + "</b>" + (p.id === state.user?.id ? ' <small class="dh-muted">(you)</small>' : "") + "</td>" +
          '<td data-label="Rank">' + rankPill(p.rank) + "</td>" +
          '<td data-label="Staff since">' + (p.staff_since ? new Date(p.staff_since).toLocaleDateString() : '<span class="dh-muted">—</span>') + "</td>" +
          '<td data-label="Actions (7 days)">' + (a ? a.n : 0) + "</td>" +
          '<td data-label="Last action">' + (a ? ago(a.last) : '<span class="dh-muted">none this week</span>') + "</td>" +
          '<td class="dh-actions"></td>';
        if (state.rank >= 4 && p.id !== state.user?.id && p.rank < 4) {
          const b = document.createElement("button");
          b.type = "button"; b.className = "dh-ghost"; b.textContent = "Change rank…";
          b.addEventListener("click", () => {
            const select = document.getElementById("staffTarget");
            if (select) { select.value = p.id; select.dispatchEvent(new Event("change", { bubbles: true })); }
            location.hash = "staffManagementCard";
          });
          tr.querySelector(".dh-actions").append(b);
        }
        tbody.append(tr);
      });
      if (!staff.length) tbody.innerHTML = '<tr><td colspan="6" class="dh-muted">No staff yet.</td></tr>';
    }
    load();
    state.timers.push(setInterval(() => { if (!document.hidden) load(); }, 60000));
  }

  function diagnosticsCard() {
    const card = newCard("dhDiagnosticsCard", "🩺 Diagnostics", "Live health checks for the site and your browser session. Nothing here changes data.",
      '<div class="dh-toolbar"><span class="dh-muted" data-role="when"></span><button type="button" class="dh-ghost" data-act="run">↻ Run checks</button></div><div class="dh-diag"></div><h3 class="dh-sub">Script errors on this page</h3><div class="dh-errors dh-list"></div>');
    const out = card.querySelector(".dh-diag");
    async function run() {
      out.innerHTML = '<p class="dh-muted">Running…</p>';
      const checks = [];
      const timed = async (label, fn) => {
        const t0 = performance.now();
        try { const detail = await fn(); checks.push([label, true, (detail ? detail + " · " : "") + Math.round(performance.now() - t0) + " ms"]); }
        catch (e) { checks.push([label, false, e.message || String(e)]); }
      };
      await timed("Database reachable", async () => { const { error, count } = await db().from("profiles").select("id", { count: "exact", head: true }); if (error) throw error; return count + " accounts"; });
      await timed("Signed-in session", async () => { const { data, error } = await db().auth.getSession(); if (error) throw error; const exp = data.session?.expires_at; if (!exp) throw new Error("No session"); return "expires " + new Date(exp * 1000).toLocaleTimeString(); });
      await timed("Your rank (server)", async () => { const { data, error } = await db().rpc("dh_my_staff_rank"); if (error) throw new Error(/dh_my_staff_rank/.test(error.message) ? "Needs the admin database update" : error.message); return RANK_NAMES[data] || "Member"; });
      await timed("Chat messages table", async () => { const { error, count } = await db().from("chat_messages").select("id", { count: "exact", head: true }); if (error) throw error; return count + " stored"; });
      await timed("Reports table", async () => { const { error, count } = await db().from("user_reports").select("id", { count: "exact", head: true }); if (error) throw new Error(/user_reports/.test(error.message) ? "Needs the admin database update" : error.message); return count + " total"; });
      await timed("Feedback inbox", async () => { const { error, count } = await db().from("feedback").select("id", { count: "exact", head: true }); if (error) throw error; return count + " items"; });
      const rt = db().realtime;
      checks.push(["Realtime connection", !!rt?.isConnected?.(), rt?.isConnected?.() ? "connected" : "not connected on this page (normal if no live widgets are open)"]);
      let storage = true; try { localStorage.setItem("dh-diag", "1"); localStorage.removeItem("dh-diag"); } catch (_) { storage = false; }
      checks.push(["Browser storage", storage, storage ? "available" : "blocked (private mode or tracking prevention)"]);
      checks.push(["Network", navigator.onLine, navigator.onLine ? "online" : "offline"]);
      checks.push(["Page version", true, "admin.html modified " + new Date(document.lastModified).toLocaleString()]);
      out.innerHTML = checks.map(([label, ok, detail]) => '<div class="dh-row"><span>' + (ok ? "🟢" : "🔴") + " " + esc(label) + '</span><small>' + esc(detail) + "</small></div>").join("");
      card.querySelector('[data-role="when"]').textContent = "Last run " + new Date().toLocaleTimeString();
      const errs = card.querySelector(".dh-errors");
      errs.innerHTML = state.errors.length ? state.errors.slice(-10).reverse().map(e => '<div class="dh-row"><span>' + esc(e.text) + "</span><small>" + ago(e.at) + "</small></div>").join("") : '<p class="dh-muted">No errors since the page opened.</p>';
    }
    card.querySelector('[data-act="run"]').addEventListener("click", run);
    run();
  }

  /* ---------- start ---------- */
  async function start(role, user) {
    const rank = rankOf(role);
    if (!rank) return;
    if (state.started) { if (rank === state.rank) return; location.reload(); return; }
    state.started = true;
    state.rank = rank;
    state.role = role;
    state.user = user;
    build();
    $("#dhMeRank").innerHTML = rankPill(rank);
    db().from("profiles").select("username").eq("id", user?.id).maybeSingle().then(({ data }) => {
      const name = data?.username || user?.email?.split("@")[0] || "staff";
      $("#dhMeName").textContent = "@" + name;
      $("#dhMeAvatar").textContent = name[0].toUpperCase();
      const hello = $("#dhHelloName"); if (hello) hello.textContent = name;
    });
    dashSkeleton();
    if (rank >= 1) reportsCard();
    if (rank >= 2) staffTeamCard();
    if (rank >= 3) diagnosticsCard();
    placeAll();
    // Cards added later (e.g. chat approvals) are sorted in as they appear.
    new MutationObserver(() => { if (topLevelCards().length) placeAll(); }).observe(document.body, { childList: true, subtree: true });
    route();
    state.timers.push(setInterval(() => { if (!document.hidden && state.view === "dashboard") refreshDashboard(); }, 30000));
    document.addEventListener("visibilitychange", () => { if (!document.hidden && state.view === "dashboard") refreshDashboard(); });
  }

  window.DHAdminShell = { start, refresh: refreshDashboard, rankOf };
  if (window.__dhAdminReady) start(window.__dhAdminReady.role, window.__dhAdminReady.user);
})();
