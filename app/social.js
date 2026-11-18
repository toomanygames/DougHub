/* DougHub app: account, chat, video calls, moderation. Uses the same accounts and database rules as doughub.online. */
(function () {
  "use strict";
  var URL_ = "https://agsqdqcsmsppcdqxlppj.supabase.co", KEY = "sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52";
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function toast(m) { var e = $("toast"); if (!e) return; e.textContent = m; e.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove("show"); }, 3200); }

  var db = null, user = null, me = null, rank = 0, chatCh = null, view = "games";
  var ROLE = { helper: 1, admin: 2, developer: 3, tech: 3, owner: 4 };

  /* ---------- supabase (loaded only when needed) ---------- */
  function loadLib() {
    return new Promise(function (res, rej) {
      if (window.supabase) return res();
      var s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      s.onload = res; s.onerror = function () { rej(new Error("You need an internet connection for this part.")); };
      document.head.appendChild(s);
    });
  }
  function client() {
    if (db) return Promise.resolve(db);
    return loadLib().then(function () {
      db = window.supabase.createClient(URL_, KEY);
      db.auth.onAuthStateChange(function (ev, s) { user = s ? s.user : null; if (ev === "SIGNED_OUT") { me = null; rank = 0; } refreshMe().then(function () { render(); }); });
      return db;
    });
  }
  function refreshMe() {
    if (!db) return Promise.resolve();
    return db.auth.getSession().then(function (r) {
      user = r.data.session ? r.data.session.user : null;
      if (!user) { me = null; rank = 0; return; }
      return db.from("profiles").select("id,username,avatar_url,staff_role,is_owner,is_admin,is_banned,ban_reason").eq("id", user.id).maybeSingle().then(function (p) {
        me = p.data || { id: user.id, username: (user.user_metadata && user.user_metadata.username) || (user.email || "").split("@")[0] };
        var role = String(me.staff_role || "").toLowerCase();
        rank = me.is_owner ? 4 : (ROLE[role] || 0);
      });
    });
  }

  /* ---------- tabs ---------- */
  var TABS = [["games", "Games", "M6 12h4m-2-2v4m7-1h.01M15 11h.01M17.3 5H6.7a4 4 0 00-3.9 3.1l-1.5 7A3 3 0 004.2 19a3 3 0 002.3-1.1L8 16h8l1.5 1.9a3 3 0 002.3 1.1 3 3 0 002.9-3.9l-1.5-7A4 4 0 0017.3 5z"],
    ["chat", "Chat", "M21 12a8 8 0 01-11.6 7.1L3 21l1.9-6.4A8 8 0 1121 12z"],
    ["call", "Calls", "M15 10l5-3v10l-5-3M3 7h12v10H3z"],
    ["mod", "Mod", "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"],
    ["me", "Account", "M20 21a8 8 0 10-16 0M12 13a4 4 0 100-8 4 4 0 000 8z"]];
  function renderTabs() {
    $("tabs").innerHTML = TABS.filter(function (t) { return t[0] !== "chat" && t[0] !== "call" && (t[0] !== "mod" || rank >= 1); }).map(function (t) {
      return '<button type="button" class="tab' + (t[0] === view ? " on" : "") + '" data-v="' + t[0] + '"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + t[2] + '"/></svg><span>' + t[1] + "</span></button>";
    }).join("");
  }
  function go(v) { if (v === "chat" || v === "call") v = "games"; view = v; if (chatCh && v !== "chat") { try { db.removeChannel(chatCh); } catch (e) {} chatCh = null; } render(); }
  $("tabs").addEventListener("click", function (e) { var b = e.target.closest("[data-v]"); if (b) go(b.dataset.v); });
  window.__dhGo = go;

  function render() {
    renderTabs();
    $("home").hidden = view !== "games";
    var p = $("panel"); p.hidden = view === "games";
    if (view === "games") return;
    if (view === "me") return viewMe(p);
    p.innerHTML = '<div class="pad"><div class="spin"></div></div>';
    client().then(refreshMe).then(function () {
      if (view === "chat") return viewChat(p);
      if (view === "call") return viewCall(p);
      if (view === "mod") return viewMod(p);
    }).catch(function (e) { p.innerHTML = '<div class="pad"><div class="card"><h2>Offline</h2><p class="muted">' + esc(e.message) + "</p></div></div>"; });
  }
  function needLogin(p, what) {
    p.innerHTML = '<div class="pad"><div class="card center"><h2>Sign in to ' + what + '</h2><p class="muted">Use your DougHub account. It is the same one as on the website.</p><button class="btn pri" data-v="me" type="button">Sign in</button></div></div>';
    p.querySelector("[data-v]").onclick = function () { go("me"); };
  }

  /* ---------- account ---------- */
  function viewMe(p) {
    p.innerHTML = '<div class="pad"><div class="spin"></div></div>';
    client().then(refreshMe).then(function () {
      if (user) return accountIn(p);
      var signup = false;
      function draw() {
        p.innerHTML = '<div class="pad"><form class="card" id="authF" autocomplete="on"><h2>' + (signup ? "Create your account" : "Welcome back") + "</h2>" +
          (signup ? '<label>Username<input id="auU" name="dh_user_new" autocomplete="off" data-lpignore="true" data-1p-ignore data-bwignore="true" data-form-type="other" minlength="3" maxlength="20" required></label>' : "") +
          '<label>Email<input id="auE" type="email" autocomplete="email" required></label>' +
          '<label>Password<input id="auP" type="password" autocomplete="' + (signup ? "new-password" : "current-password") + '" minlength="6" required></label>' +
          '<p class="err" id="auErr" role="alert"></p><button class="btn pri wide" type="submit">' + (signup ? "Sign up" : "Sign in") + '</button>' +
          '<button class="link" type="button" id="auSw">' + (signup ? "I already have an account" : "New here? Create an account") + "</button></form></div>";
        $("auSw").onclick = function () { signup = !signup; draw(); };
        $("authF").onsubmit = function (ev) {
          ev.preventDefault(); var b = ev.target.querySelector("button[type=submit]"); b.disabled = true; $("auErr").textContent = "";
          var email = $("auE").value.trim(), pw = $("auP").value;
          var job = signup ? db.auth.signUp({ email: email, password: pw, options: { data: { username: $("auU").value.trim() }, emailRedirectTo: "https://doughub.online/" } }) : db.auth.signInWithPassword({ email: email, password: pw });
          job.then(function (r) {
            if (r.error) throw r.error;
            if (signup && !r.data.session) { p.innerHTML = '<div class="pad"><div class="card center"><h2>Check your email</h2><p class="muted">We sent you a link. Open it to confirm your account, then come back and sign in.</p></div></div>'; return; }
            return refreshMe().then(function () { render(); toast("Signed in"); });
          }).catch(function (e) { b.disabled = false; $("auErr").textContent = e.message || "Something went wrong."; });
        };
      }
      draw();
    }).catch(function (e) { p.innerHTML = '<div class="pad"><div class="card"><h2>Offline</h2><p class="muted">' + esc(e.message) + "</p></div></div>"; });
  }
  function accountIn(p) {
    var role = rank >= 1 ? ["", "Helper", "Admin", "Developer", "Owner"][rank] : "";
    p.innerHTML = '<div class="pad"><div class="card"><div class="who"><span class="av">' + esc((me.username || "?").charAt(0).toUpperCase()) + '</span><div><h2>@' + esc(me.username) + "</h2><p class=\"muted\">" + esc(user.email || "") + (role ? ' · <b class="role">' + role + "</b>" : "") + '</p></div></div>' +
      (me.is_banned ? '<p class="err">This account is restricted.' + (me.ban_reason ? " Reason: " + esc(me.ban_reason) : "") + "</p>" : "") +
      '<div id="warns"></div><div class="row"><button class="btn" id="outB" type="button">Sign out</button></div></div></div>';
    $("outB").onclick = function () { db.auth.signOut().then(function () { toast("Signed out"); render(); }); };
    db.from("user_warnings").select("id,message,created_at,read_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5).then(function (r) {
      var w = (r.data || []).filter(function (x) { return !x.read_at; }); if (!w.length || !$("warns")) return;
      $("warns").innerHTML = w.map(function (x) { return '<div class="warn"><b>Warning from staff</b><p>' + esc(x.message) + '</p><button class="btn" data-w="' + x.id + '" type="button">OK, I understand</button></div>'; }).join("");
      $("warns").onclick = function (e) { var b = e.target.closest("[data-w]"); if (!b) return; db.from("user_warnings").update({ read_at: new Date().toISOString() }).eq("id", b.dataset.w).then(function () { b.closest(".warn").remove(); }); };
    });
  }

  /* ---------- chat ---------- */
  function viewChat(p) {
    if (!user) return needLogin(p, "chat");
    return db.from("chat_access_approvals").select("user_id").eq("user_id", user.id).maybeSingle().then(function (a) {
      if (!a.data && rank < 1) return gate(p);
      p.innerHTML = '<div class="chat"><div class="msgs" id="msgs" aria-live="polite"></div><form class="send" id="sendF"><input id="msgIn" name="dh_msg" autocomplete="off" data-lpignore="true" data-1p-ignore data-bwignore="true" data-form-type="other" maxlength="500" placeholder="Say something nice" aria-label="Message"><button class="btn pri" type="submit">Send</button></form></div>';
      var box = $("msgs"), seen = {};
      function add(m) {
        if (seen[m.id]) return; seen[m.id] = 1;
        var mine = m.user_id === user.id, d = document.createElement("div"); d.className = "msg" + (mine ? " mine" : ""); d.dataset.id = m.id;
        var t = new Date(m.created_at);
        d.innerHTML = '<div class="mh"><b>@' + esc(m.username) + '</b><span>' + t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + '</span><span class="acts">' + (mine ? "" : '<button type="button" data-rep="' + m.id + '" title="Report">⚑</button>') + (rank >= 2 ? '<button type="button" data-del="' + m.id + '" title="Delete">🗑</button>' : "") + '</span></div><div class="mt">' + esc(m.message || (m.attachment_name ? "📎 " + m.attachment_name : "")) + "</div>";
        d._m = m; var near = box.scrollHeight - box.scrollTop - box.clientHeight < 120; box.appendChild(d); if (near || mine) box.scrollTop = box.scrollHeight;
      }
      db.from("chat_messages").select("id,user_id,username,message,created_at,attachment_name,kind").is("group_id", null).order("created_at", { ascending: false }).limit(60).then(function (r) {
        if (r.error) { box.innerHTML = '<p class="muted pad">' + esc(r.error.message) + "</p>"; return; }
        (r.data || []).reverse().forEach(add); box.scrollTop = box.scrollHeight;
      });
      chatCh = db.channel("app-chat-" + Math.random().toString(36).slice(2)).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, function (pl) { if (!pl.new.group_id) add(pl.new); })
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, function (pl) { var e = box.querySelector('[data-id="' + pl.old.id + '"]'); if (e) e.remove(); }).subscribe();
      $("sendF").onsubmit = function (ev) {
        ev.preventDefault(); var v = $("msgIn").value.trim(); if (!v) return; $("msgIn").value = "";
        db.from("chat_messages").insert({ user_id: user.id, username: me.username, message: v, group_id: null }).then(function (r) { if (r.error) { toast(r.error.message); $("msgIn").value = v; } });
      };
      box.onclick = function (e) {
        var rp = e.target.closest("[data-rep]"), dl = e.target.closest("[data-del]");
        if (rp) { var m = rp.closest(".msg")._m; reportDlg(m.user_id, m.username, m.message); }
        if (dl && confirm("Delete this message?")) db.from("chat_messages").delete().eq("id", dl.dataset.del).then(function (r) { if (r.error) toast(r.error.message); });
      };
    });
  }
  function gate(p) {
    var ok = user.email_confirmed_at;
    p.innerHTML = '<div class="pad"><div class="card center"><h2>Chat needs approval</h2><p class="muted">' + (ok ? "To keep chat safe, staff approve new members first. Ask below and check back soon." : "Confirm your email first, then ask staff for chat access.") + '</p><button class="btn pri" id="reqB" type="button"' + (ok ? "" : " disabled") + '>Request chat access</button></div></div>';
    $("reqB").onclick = function () { db.from("chat_access_requests").insert({ user_id: user.id }).then(function (r) { if (r.error && r.error.code !== "23505") return toast(r.error.message); $("reqB").textContent = "Request sent"; $("reqB").disabled = true; }); };
  }
  function reportDlg(targetId, name, ctx) {
    var w = document.createElement("div"); w.className = "modal";
    w.innerHTML = '<form class="card"><h2>Report @' + esc(name) + '</h2><p class="muted">Tell staff what is wrong. They will take a look.</p><label>What happened?<textarea id="rpR" minlength="3" maxlength="500" required></textarea></label><div class="row"><button class="btn" type="button" id="rpC">Cancel</button><button class="btn pri" type="submit">Send report</button></div></form>';
    document.body.appendChild(w); $("rpC").onclick = function () { w.remove(); };
    w.querySelector("form").onsubmit = function (e) {
      e.preventDefault();
      db.from("user_reports").insert({ reporter_id: user.id, target_user_id: targetId, category: "chat", reason: $("rpR").value.trim(), context: (ctx || "").slice(0, 300) || null }).then(function (r) { w.remove(); toast(r.error ? r.error.message : "Thanks. Staff will review your report."); });
    };
  }

  /* ---------- calls ---------- */
  function viewCall(p) {
    if (!user) return needLogin(p, "start a video call");
    p.innerHTML = '<div class="pad"><div class="card"><h2>Video call</h2><p class="muted">Start a room and send the room name to a friend. Anyone with the same name joins you.</p><label>Room name<input id="roomIn" name="dh_room" autocomplete="off" data-lpignore="true" data-1p-ignore data-bwignore="true" data-form-type="other" maxlength="40" placeholder="for example: movie-night"></label><div class="row"><button class="btn" id="rndB" type="button">Random room</button><button class="btn pri" id="joinB" type="button">Join call</button></div></div></div>';
    $("rndB").onclick = function () { $("roomIn").value = "room-" + Math.random().toString(36).slice(2, 8); };
    $("joinB").onclick = function () {
      var r = $("roomIn").value.trim().replace(/[^\w-]+/g, "-").slice(0, 40); if (!r) { $("roomIn").focus(); return; }
      var o = document.createElement("div"); o.className = "callov";
      o.innerHTML = '<div class="pbar"><button class="btn" id="callX" type="button">&larr; Leave call</button><b>' + esc(r) + '</b></div><iframe title="Video call" allow="camera; microphone; display-capture; autoplay; fullscreen" src="../chat-calls.html?room=' + encodeURIComponent(r) + '"></iframe>';
      document.body.appendChild(o); $("callX").onclick = function () { o.remove(); };
    };
  }

  /* ---------- moderation ---------- */
  function viewMod(p) {
    if (!user) return needLogin(p, "moderate");
    if (rank < 1) { p.innerHTML = '<div class="pad"><div class="card center"><h2>Staff only</h2><p class="muted">This panel is for DougHub staff.</p></div></div>'; return; }
    var tab = "reports";
    function shell() {
      p.innerHTML = '<div class="pad"><div class="seg"><button data-t="reports" class="' + (tab === "reports" ? "on" : "") + '">Reports</button><button data-t="warn" class="' + (tab === "warn" ? "on" : "") + '">Warn</button>' + (rank >= 2 ? '<button data-t="ban" class="' + (tab === "ban" ? "on" : "") + '">Ban</button>' : "") + '</div><div id="modBody"></div></div>';
      p.querySelector(".seg").onclick = function (e) { var b = e.target.closest("[data-t]"); if (b) { tab = b.dataset.t; shell(); } };
      ({ reports: reports, warn: warnTab, ban: banTab })[tab]($("modBody"));
    }
    shell();
  }
  function reports(b) {
    b.innerHTML = '<div class="spin"></div>';
    db.from("user_reports").select("id,reporter_id,target_user_id,category,reason,context,status,created_at").eq("status", "open").order("created_at", { ascending: true }).limit(40).then(function (r) {
      var rows = r.data || []; if (r.error) { b.innerHTML = '<p class="err">' + esc(r.error.message) + "</p>"; return; }
      if (!rows.length) { b.innerHTML = '<div class="card center"><h2>All clear</h2><p class="muted">No open reports.</p></div>'; return; }
      var ids = {}; rows.forEach(function (x) { ids[x.reporter_id] = 1; if (x.target_user_id) ids[x.target_user_id] = 1; });
      db.from("profiles").select("id,username").in("id", Object.keys(ids)).then(function (pr) {
        var n = {}; (pr.data || []).forEach(function (x) { n[x.id] = x.username; });
        b.innerHTML = rows.map(function (x) {
          return '<div class="card rep" data-id="' + x.id + '"><p><b>@' + esc(n[x.reporter_id] || "?") + "</b> reported <b>" + (x.target_user_id ? "@" + esc(n[x.target_user_id] || "?") : "nothing specific") + '</b> <span class="tag">' + esc(x.category) + '</span></p><p>' + esc(x.reason) + "</p>" + (x.context ? '<p class="muted">“' + esc(x.context) + "”</p>" : "") +
            '<div class="row"><button class="btn" data-s="dismissed" type="button">Dismiss</button><button class="btn pri" data-s="resolved" type="button">Mark handled</button></div></div>';
        }).join("");
        b.onclick = function (e) {
          var s = e.target.closest("[data-s]"); if (!s) return; var card = s.closest(".rep"); s.disabled = true;
          db.rpc("dh_handle_report", { p_report_id: card.dataset.id, p_status: s.dataset.s, p_note: null }).then(function (x) { if (x.error) { s.disabled = false; toast(x.error.message); } else card.remove(); });
        };
      });
    });
  }
  function userPick(b, label, cb) {
    b.innerHTML = '<div class="card"><label>' + label + '<input id="upN" name="dh_find_user" autocomplete="off" data-lpignore="true" data-1p-ignore data-bwignore="true" data-form-type="other" placeholder="username"></label><div id="upR" class="picks"></div><div id="upF"></div></div>';
    var t = 0;
    $("upN").oninput = function () {
      clearTimeout(t); var q = $("upN").value.trim().replace(/^@/, "").replace(/[%_]/g, ""); if (q.length < 2) { $("upR").innerHTML = ""; return; }
      t = setTimeout(function () { db.from("profiles").select("id,username").ilike("username", q + "%").order("username").limit(6).then(function (r) {
        $("upR").innerHTML = (r.data || []).map(function (u) { return '<button type="button" class="pick" data-id="' + u.id + '" data-n="' + esc(u.username) + '">@' + esc(u.username) + "</button>"; }).join("") || '<p class="muted">No one found.</p>';
      }); }, 250);
    };
    $("upR").onclick = function (e) { var x = e.target.closest(".pick"); if (!x) return; $("upR").innerHTML = '<p>Selected: <b>@' + esc(x.dataset.n) + "</b></p>"; cb($("upF"), x.dataset.id, x.dataset.n); };
  }
  function warnTab(b) {
    userPick(b, "Who needs a warning?", function (f, id, name) {
      f.innerHTML = '<label>Message<textarea id="wM" maxlength="400" placeholder="Please be kind in chat."></textarea></label><button class="btn pri" id="wS" type="button">Send warning</button>';
      $("wS").onclick = function () { var m = $("wM").value.trim(); if (m.length < 3) return toast("Write a short message."); if (!confirm("Send this warning to @" + name + "?")) return;
        db.from("user_warnings").insert({ user_id: id, message: m }).then(function (r) { toast(r.error ? r.error.message : "Warning sent to @" + name); if (!r.error) f.innerHTML = ""; }); };
    });
  }
  function banTab(b) {
    userPick(b, "Who should be restricted?", function (f, id, name) {
      f.innerHTML = '<label>Type<select id="bT"><option value="suspend">Suspend for a while</option><option value="ban">Ban</option></select></label><label id="bDw">Days<input id="bD" type="number" min="1" max="365" value="3"></label><label>Reason<textarea id="bR" maxlength="300"></textarea></label><p class="muted">This sends a request. The owner reviews it before it takes effect.</p><button class="btn pri" id="bS" type="button">Send request</button>';
      $("bT").onchange = function () { $("bDw").hidden = $("bT").value === "ban"; };
      $("bS").onclick = function () {
        var type = $("bT").value, why = $("bR").value.trim(); if (why.length < 3) return toast("Add a reason.");
        var until = type === "suspend" ? new Date(Date.now() + Math.max(1, +$("bD").value || 1) * 864e5).toISOString() : null;
        if (!confirm("Send a " + type + " request for @" + name + "?")) return;
        db.rpc("request_staff_ban", { p_target_user_id: id, p_requested_type: type, p_requested_reason: why, p_requested_until: until }).then(function (r) { toast(r.error ? r.error.message : "Request sent"); if (!r.error) f.innerHTML = ""; });
      };
    });
  }

  /* start: if there is a saved session, learn who is signed in so the Mod tab can appear */
  renderTabs();
  try { if (Object.keys(localStorage).some(function (k) { return /^sb-.*-auth-token$/.test(k); })) client().then(refreshMe).then(renderTabs).catch(function () {}); } catch (e) {}
})();
