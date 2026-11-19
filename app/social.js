/* DougHub app: account, chat, video calls, moderation. Uses the same accounts and database rules as doughub.online. */
(function () {
  "use strict";
  var URL_ = "https://agsqdqcsmsppcdqxlppj.supabase.co", KEY = "sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52";
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function toast(m) { var e = $("toast"); if (!e) return; e.textContent = m; e.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove("show"); }, 3200); }

  var db = null, user = null, me = null, rank = 0, chatCh = null, view = "games";
  var flags = { chat: false, call: false };
  try { var fc = JSON.parse(localStorage.getItem("dh-flags") || "null"); if (fc) flags = fc; } catch (e) {}
  function loadFlags() {
    return fetch(URL_ + "/rest/v1/app_flags?select=flag_key,enabled", { headers: { apikey: KEY } }).then(function (r) { return r.json(); }).then(function (rows) {
      if (!Array.isArray(rows)) return;
      var f = { chat: false, call: false };
      rows.forEach(function (x) { if (x.flag_key === "app_chat_visible") f.chat = !!x.enabled; if (x.flag_key === "app_calls_visible") f.call = !!x.enabled; });
      var changed = f.chat !== flags.chat || f.call !== flags.call; flags = f;
      try { localStorage.setItem("dh-flags", JSON.stringify(f)); } catch (e) {}
      if (changed) { if ((view === "chat" && !flags.chat) || (view === "call" && !flags.call)) view = "games"; render(); }
    }).catch(function () {});
  }
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
    ["shop", "Shop", "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"],
    ["rank", "Ranks", "M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3"],
    ["chat", "Chat", "M21 12a8 8 0 01-11.6 7.1L3 21l1.9-6.4A8 8 0 1121 12z"],
    ["call", "Calls", "M15 10l5-3v10l-5-3M3 7h12v10H3z"],
    ["mod", "Mod", "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"],
    ["me", "Account", "M20 21a8 8 0 10-16 0M12 13a4 4 0 100-8 4 4 0 000 8z"]];
  function renderTabs() {
    $("tabs").innerHTML = TABS.filter(function (t) { return (t[0] !== "chat" || flags.chat) && (t[0] !== "call" || flags.call) && (t[0] !== "mod" || rank >= 1); }).map(function (t) {
      return '<button type="button" class="tab' + (t[0] === view ? " on" : "") + '" data-v="' + t[0] + '"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + t[2] + '"/></svg><span>' + t[1] + "</span></button>";
    }).join("");
  }
  function go(v) { if ((v === "chat" && !flags.chat) || (v === "call" && !flags.call)) v = "games"; view = v; if (chatCh && v !== "chat") { try { db.removeChannel(chatCh); } catch (e) {} chatCh = null; } render(); }
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
      if (view === "shop") return viewShop(p);
      if (view === "rank") return viewRank(p);
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
          (signup ? '<label>Email (optional)<input id="auE" type="email" autocomplete="email" placeholder="Leave empty to skip"></label><p class="muted">No email needed. Without one, a forgotten password can\'t be reset.</p>' : '<label>Username or email<input id="auE" type="text" autocomplete="username" autocapitalize="off" required></label>') +
          '<label>Password<input id="auP" type="password" autocomplete="' + (signup ? "new-password" : "current-password") + '" minlength="6" required></label>' +
          '<p class="err" id="auErr" role="alert"></p><button class="btn pri wide" type="submit">' + (signup ? "Sign up" : "Sign in") + '</button>' +
          '<button class="link" type="button" id="auSw">' + (signup ? "I already have an account" : "New here? Create an account") + "</button></form></div>";
        $("auSw").onclick = function () { signup = !signup; draw(); };
        $("authF").onsubmit = function (ev) {
          ev.preventDefault(); var b = ev.target.querySelector("button[type=submit]"); b.disabled = true; $("auErr").textContent = "";
          var email = $("auE").value.trim(), pw = $("auP").value;
          function fake(n) { return String(n).trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "_").replace(/^[._-]+/, "u") + "@users.doughub.invalid"; }
          if (signup && !email) email = fake($("auU").value);
          else if (!signup && email.indexOf("@") < 0) email = fake(email);
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
    p.innerHTML = '<div class="pad"><div class="card"><div class="who"><span class="av">' + esc((me.username || "?").charAt(0).toUpperCase()) + '</span><div><h2>@' + esc(me.username) + "</h2><p class=\"muted\">" + esc(/@users\.doughub\.invalid$/.test(user.email || "") ? "No email on this account" : (user.email || "")) + (role ? ' · <b class="role">' + role + "</b>" : "") + '</p></div></div>' +
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
      p.innerHTML = '<div class="pad"><div class="seg"><button data-t="reports" class="' + (tab === "reports" ? "on" : "") + '">Reports</button><button data-t="warn" class="' + (tab === "warn" ? "on" : "") + '">Warn</button>' + (rank >= 2 ? '<button data-t="ban" class="' + (tab === "ban" ? "on" : "") + '">Ban</button>' : "") + '<button data-t="app" class="' + (tab === "app" ? "on" : "") + '">App</button></div><div id="modBody"></div></div>';
      p.querySelector(".seg").onclick = function (e) { var b = e.target.closest("[data-t]"); if (b) { tab = b.dataset.t; shell(); } };
      ({ reports: reports, warn: warnTab, ban: banTab, app: appTab })[tab]($("modBody"));
    }
    shell();
  }
  function appTab(b) {
    b.innerHTML = '<div class="card"><h2>Show in the app</h2><p class="muted">Turn the Chat and Calls tabs on or off for everyone using the DougHub app.</p>' +
      '<label class="chk"><input type="checkbox" id="fgChat"' + (flags.chat ? " checked" : "") + '> Chat tab</label>' +
      '<label class="chk"><input type="checkbox" id="fgCall"' + (flags.call ? " checked" : "") + '> Calls tab</label><p class="err" id="fgErr" role="alert"></p></div>';
    function setFlag(key, on, box) {
      box.disabled = true;
      db.rpc("dh_app_set_flag", { p_key: key, p_enabled: on }).then(function (x) {
        box.disabled = false;
        if (x.error) { box.checked = !on; $("fgErr").textContent = x.error.message; return; }
        $("fgErr").textContent = ""; toast("Saved"); loadFlags();
      });
    }
    $("fgChat").onchange = function () { setFlag("app_chat_visible", this.checked, this); };
    $("fgCall").onchange = function () { setFlag("app_calls_visible", this.checked, this); };
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
  /* ---------- shop, collection and leaderboards (same economy as doughub.online) ---------- */
  var RAR = { common: "#9aa3c4", uncommon: "#4ade80", rare: "#60a5fa", epic: "#c084fc", legendary: "#fbbf24" };
  var PRICE = { common: 40, uncommon: 60, rare: 90, epic: 130, legendary: 180 };
  var CG = { headwear: "🎩", face: "😎", neck: "🧣", back: "🎒", hair: "💇", outfit: "👕", pants: "👖", shoes: "👟", effect: "✨" };
  var credits = null, shopTab = "pets", packFilter = "all", rankKey = "collectors";
  function art(u) { return u ? (/^https?:/.test(u) ? u : "https://doughub.online/" + String(u).replace(/^\//, "")) : ""; }
  function pic(u, cls) { var s = art(u); return s ? '<img class="' + (cls || "pimg") + '" referrerpolicy="no-referrer" src="' + esc(s) + '" alt="">' : '<span class="pimg ph">?</span>'; }
  function rpc(name, args) { return db.rpc(name, args || {}).then(function (r) { if (r.error) throw r.error; return r.data; }); }
  function loadCredits() { return db.from("dh_wallets").select("credits").eq("user_id", user.id).maybeSingle().then(function (r) { credits = r.data ? r.data.credits : 0; return credits; }); }
  function rarTag(r) { return '<span class="rar" style="--rc:' + (RAR[r] || "#aaa") + '">' + esc(r) + "</span>"; }

  function viewShop(p) {
    if (!user) return needLogin(p, "use the shop");
    loadCredits().then(function () {
      p.innerHTML = '<div class="pad"><div class="card wal"><div><span class="muted">Your credits</span><div class="bal" id="bal">' + credits + '</div></div><p class="muted">Play any DougHub app game once a day for +10 credits.</p></div>' +
        '<div class="seg" id="shopSeg">' + [["pets", "Pets"], ["packs", "Packs"], ["items", "Items"], ["mine", "Mine"]].map(function (t) { return '<button data-t="' + t[0] + '" class="' + (shopTab === t[0] ? "on" : "") + '">' + t[1] + "</button>"; }).join("") + '</div><div id="shopBody"></div></div>';
      $("shopSeg").onclick = function (e) { var b = e.target.closest("[data-t]"); if (b) { shopTab = b.dataset.t; viewShop(p); } };
      var body = $("shopBody"); body.innerHTML = '<div class="spin"></div>';
      ({ pets: shopPets, packs: shopPacks, items: shopItems, mine: shopMine })[shopTab](body, p);
    }).catch(function (e) { p.innerHTML = '<div class="pad"><div class="card"><p class="err">' + esc(e.message) + "</p></div></div>"; });
  }
  function bal(n) { credits = n; var b = $("bal"); if (b) b.textContent = n; }
  function shopPets(b, p) {
    Promise.all([rpc("dh_get_character_catalog"), db.from("dh_character_inventory").select("character_id").eq("user_id", user.id)]).then(function (r) {
      var rows = r[0] || [], own = {}; (r[1].data || []).forEach(function (x) { own[x.character_id] = 1; });
      var packs = []; rows.forEach(function (x) { if (packs.indexOf(x.pack_type) < 0) packs.push(x.pack_type); });
      var list = rows.filter(function (x) { return packFilter === "all" || x.pack_type === packFilter; });
      b.innerHTML = '<div class="chips2">' + ["all"].concat(packs).map(function (k) { return '<button type="button" class="chip' + (packFilter === k ? " on" : "") + '" data-pk="' + k + '">' + esc(k) + "</button>"; }).join("") + '</div><div class="sgrid">' +
        list.map(function (x) { var pr = PRICE[x.rarity] || 0, o = own[x.character_id], out = x.remaining_count <= 0;
          return '<div class="pcard">' + pic(x.art_path) + '<b>' + esc(x.character_name) + "</b>" + rarTag(x.rarity) + '<span class="muted sm">' + esc(x.pack_type) + " · " + x.remaining_count + "/" + x.total_supply + ' left</span><button class="btn' + (o ? "" : " pri") + '" type="button" data-buy="' + esc(x.character_id) + '"' + (o || out ? " disabled" : "") + ">" + (o ? "Owned" : out ? "Sold out" : pr + " credits") + "</button></div>"; }).join("") + "</div>";
      b.onclick = function (e) {
        var pk = e.target.closest("[data-pk]"); if (pk) { packFilter = pk.dataset.pk; shopPets(b, p); return; }
        var bt = e.target.closest("[data-buy]"); if (!bt) return; bt.disabled = true;
        rpc("dh_buy_character", { p_character_id: bt.dataset.buy }).then(function (x) { bal(x.credits_remaining); toast("Unlocked " + x.character_name + "!"); shopPets(b, p); }).catch(function (er) { bt.disabled = false; toast(er.message); });
      };
    }).catch(function (e) { b.innerHTML = '<p class="err">' + esc(e.message) + "</p>"; });
  }
  function shopPacks(b, p) {
    var PK = [["woodland", "Woodland", "🌲"], ["ocean", "Ocean", "🌊"], ["cosmic", "Cosmic", "🌌"]];
    b.innerHTML = '<div class="sgrid">' + PK.map(function (k) { return '<div class="pcard pk"><span class="big">' + k[2] + "</span><b>" + k[1] + ' pack</b><span class="muted sm">One random pet. Rarer pets are harder to pull.</span><button class="btn pri" type="button" data-pack="' + k[0] + '">Open · 100 credits</button></div>'; }).join("") + '</div><div id="packRes"></div>';
    b.onclick = function (e) { var bt = e.target.closest("[data-pack]"); if (!bt) return; bt.disabled = true;
      rpc("dh_open_character_pack", { p_pack: bt.dataset.pack }).then(function (x) { bal(x.credits_remaining); $("packRes").innerHTML = '<div class="card center reveal">' + pic(x.art_path, "pimg big") + "<h2>" + esc(x.character_name) + "</h2>" + rarTag(x.rarity) + '<p class="muted">Added to your collection!</p></div>'; bt.disabled = false; }).catch(function (er) { bt.disabled = false; toast(er.message); }); };
  }
  function shopItems(b) {
    rpc("dh_get_cosmetic_catalog").then(function (rows) {
      b.innerHTML = '<p class="muted">Accessories for your featured pet. Stock refreshes every 30 minutes.</p><div class="sgrid">' + (rows || []).map(function (x) {
        return '<div class="pcard"><span class="big">' + (CG[x.category] || "🎁") + "</span><b>" + esc(x.name) + "</b>" + rarTag(x.rarity) + '<span class="muted sm">' + esc(x.category) + " · " + x.stock_count + ' in stock</span><button class="btn' + (x.owned ? "" : " pri") + '" type="button" data-ci="' + esc(x.id) + '"' + (x.owned || x.stock_count <= 0 ? " disabled" : "") + ">" + (x.owned ? "Owned" : x.stock_count <= 0 ? "Sold out" : x.price + " credits") + "</button></div>"; }).join("") + "</div>";
      b.onclick = function (e) { var bt = e.target.closest("[data-ci]"); if (!bt) return; bt.disabled = true;
        rpc("dh_buy_cosmetic", { p_cosmetic_id: bt.dataset.ci }).then(function (x) { bal(x.credits_remaining); toast("Bought!"); shopItems(b); }).catch(function (er) { bt.disabled = false; toast(er.message); }); };
    }).catch(function (e) { b.innerHTML = '<p class="err">' + esc(e.message) + "</p>"; });
  }
  function showcaseCard(d, mine) {
    if (!d || !d.found) return '<div class="card center"><p class="muted">Player not found.</p></div>';
    if (d.private) return '<div class="card center"><h2>@' + esc(d.username) + '</h2><p class="muted">This showcase is private.</p></div>';
    var f = d.featured, st = d.stats || {};
    var h = '<div class="card center show">' + (f ? pic(f.art_path, "pimg huge") + "<h2>" + esc(f.name) + "</h2>" + rarTag(f.rarity) + (f.cosmetics && f.cosmetics.length ? '<div class="eq">' + f.cosmetics.map(function (c) { return '<span class="eqi" title="' + esc(c.name) + '">' + (CG[c.category] || "🎁") + " " + esc(c.name) + "</span>"; }).join("") + "</div>" : "") : '<p class="muted">No featured pet yet.</p>') +
      '<p class="muted">@' + esc(d.username) + " · " + (st.owned || 0) + "/" + (st.total || 0) + " pets · " + (st.points || 0) + " points</p></div>";
    if (d.scores && d.scores.length) h += '<div class="card"><h2>Scores</h2>' + d.scores.map(function (s) { return '<div class="srow"><span>' + esc(s.title) + '</span><b>' + esc(fmtNum(s.score)) + " · #" + s.rank + "</b></div>"; }).join("") + "</div>";
    if (d.characters && d.characters.length) h += '<div class="card"><h2>Collection</h2><div class="sgrid sm">' + d.characters.map(function (c) { return '<div class="pcard mini' + (mine ? "" : "") + '">' + pic(c.art_path) + "<b>" + esc(c.name) + "</b>" + rarTag(c.rarity) + (mine ? '<button class="btn" type="button" data-feat="' + esc(c.character_id) + '">' + (f && f.character_id === c.character_id ? "Featured" : "Feature") + "</button>" : "") + "</div>"; }).join("") + "</div></div>";
    return h;
  }
  function fmtNum(n) { n = Number(n); if (!isFinite(n)) return String(n); if (Math.abs(n) >= 1e6) { var u = ["", "K", "M", "B", "T", "Qa"], i = 0; while (Math.abs(n) >= 1000 && i < u.length - 1) { n /= 1000; i++; } return n.toFixed(2).replace(/\.?0+$/, "") + u[i]; } return Math.round(n).toLocaleString(); }
  function shopMine(b, p) {
    Promise.all([rpc("dh_public_showcase", { p_username: me.username }), rpc("dh_get_cosmetic_catalog")]).then(function (r) {
      var d = r[0], cat = r[1] || [], f = d.featured, owned = cat.filter(function (c) { return c.owned; }), eqIds = f && f.cosmetics ? f.cosmetics.map(function (c) { return c.id; }) : [];
      var h = showcaseCard(d, true);
      if (f) {
        h += '<div class="card"><h2>Dress up ' + esc(f.name) + '</h2>' + (owned.length ? '<div class="eq">' + owned.map(function (c) { var on = eqIds.indexOf(c.id) > -1; return '<button type="button" class="eqi btnish' + (on ? " on" : "") + '" data-eq="' + esc(c.id) + '">' + (CG[c.category] || "🎁") + " " + esc(c.name) + "</button>"; }).join("") + "</div>" : '<p class="muted">Buy accessories in the Items tab, then wear them here.</p>') +
          '<label class="chk"><input type="checkbox" id="pubChk"' + (d.showcase_public ? " checked" : "") + '> Show my pet on the leaderboards and let others view my collection</label></div>';
      } else h += '<div class="card center"><p class="muted">Get a pet from the Pets or Packs tab, then feature it to show it off.</p></div>';
      b.innerHTML = h;
      b.onclick = function (e) {
        var ft = e.target.closest("[data-feat]"); if (ft) { rpc("dh_set_showcase", { p_character_id: ft.dataset.feat, p_public: true }).then(function () { toast("Featured!"); shopMine(b, p); }).catch(function (er) { toast(er.message); }); return; }
        var eq = e.target.closest("[data-eq]"); if (eq && f) { var id = eq.dataset.eq, ids = eqIds.indexOf(id) > -1 ? eqIds.filter(function (x) { return x !== id; }) : eqIds.concat([id]);
          rpc("dh_save_character", { p_character_id: f.character_id, p_cosmetic_ids: ids }).then(function () { toast("Saved"); shopMine(b, p); }).catch(function (er) { toast(er.message); }); }
      };
      var pc = $("pubChk"); if (pc) pc.onchange = function () { rpc("dh_set_showcase", { p_character_id: f.character_id, p_public: pc.checked }).then(function () { toast(pc.checked ? "Showcase is public" : "Showcase is private"); }).catch(function (er) { toast(er.message); }); };
    }).catch(function (e) { b.innerHTML = '<p class="err">' + esc(e.message) + "</p>"; });
  }

  function viewRank(p) {
    if (!user) return needLogin(p, "see the leaderboards");
    rpc("dh_game_list").then(function (games) {
      games = games || [];
      p.innerHTML = '<div class="pad"><div class="chips2" id="rkChips"><button type="button" class="chip' + (rankKey === "collectors" ? " on" : "") + '" data-g="collectors">🏆 Collectors</button>' + games.map(function (g) { return '<button type="button" class="chip' + (rankKey === g.game_key ? " on" : "") + '" data-g="' + esc(g.game_key) + '">' + esc(g.title) + "</button>"; }).join("") + '</div><div id="rkBody"></div></div>';
      $("rkChips").onclick = function (e) { var b = e.target.closest("[data-g]"); if (b) { rankKey = b.dataset.g; viewRank(p); } };
      var body = $("rkBody"); body.innerHTML = '<div class="spin"></div>';
      body.onclick = function (e) { var u = e.target.closest("[data-u]"); if (u) openShowcase(u.dataset.u); };
      if (rankKey === "collectors") rpc("dh_collectors", { p_limit: 25 }).then(function (rows) { board(body, rows || [], function (r) { return r.owned + " pets · " + r.points + " pts"; }, "Nobody has made their collection public yet. Be the first!"); }).catch(function (er) { body.innerHTML = '<p class="err">' + esc(er.message) + "</p>"; });
      else rpc("dh_game_leaderboard", { p_game: rankKey, p_limit: 25 }).then(function (d) { var unit = d.game && d.game.unit || ""; board(body, d.rows || [], function (r) { return fmtNum(r.score) + " " + unit; }, "No scores yet. Play the game to claim #1!", d.me); }).catch(function (er) { body.innerHTML = '<p class="err">' + esc(er.message) + "</p>"; });
    }).catch(function (e) { p.innerHTML = '<div class="pad"><div class="card"><p class="err">' + esc(e.message) + "</p></div></div>"; });
  }
  function board(b, rows, label, empty, meRow) {
    if (!rows.length) { b.innerHTML = '<div class="card center"><p class="muted">' + empty + "</p></div>"; return; }
    b.innerHTML = (meRow ? '<div class="card"><span class="muted">Your best</span><b class="mebest">#' + meRow.rank + " · " + esc(fmtNum(meRow.score)) + "</b></div>" : "") + '<div class="board">' + rows.map(function (r) {
      return '<button type="button" class="brow' + (r.is_me ? " me" : "") + (r.rank <= 3 ? " top" + r.rank : "") + '" data-u="' + esc(r.username) + '"><span class="rk">' + (r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : "#" + r.rank) + "</span>" + (r.art_path ? pic(r.art_path, "pimg sm") : '<span class="av sm">' + esc(String(r.username || "?").charAt(0).toUpperCase()) + "</span>") + '<span class="nm">@' + esc(r.username) + '</span><span class="sc">' + esc(label(r)) + "</span></button>"; }).join("") + "</div>";
  }
  function openShowcase(name) {
    var m = document.createElement("div"); m.className = "modal"; m.innerHTML = '<div class="card shwrap"><button class="link" type="button" id="shX">Close</button><div id="shBody"><div class="spin"></div></div></div>';
    document.body.appendChild(m); m.onclick = function (e) { if (e.target === m || e.target.id === "shX") m.remove(); };
    rpc("dh_public_showcase", { p_username: name }).then(function (d) { $("shBody").innerHTML = showcaseCard(d, false); }).catch(function (e) { $("shBody").innerHTML = '<p class="err">' + esc(e.message) + "</p>"; });
  }

  /* scores sent by the games (inside the player) */
  var hinted = false;
  window.addEventListener("message", function (ev) {
    var d = ev.data; if (!d || d.dh !== "score" || ev.origin !== location.origin || typeof d.game !== "string" || !(d.score > 0)) return;
    client().then(refreshMe).then(function () {
      if (!user) { if (!hinted) { hinted = true; toast("Sign in (Account tab) to save scores and earn credits."); } return; }
      return db.rpc("dh_submit_score", { p_game: d.game, p_score: d.score }).then(function (r) {
        if (r.data && r.data.ok && r.data.improved) toast("New best! Rank #" + r.data.rank);
        return db.rpc("dh_app_play_reward", { p_game: d.game });
      }).then(function (r) { if (r && r.data && r.data.claimed) toast("+10 credits for playing today!"); });
    }).catch(function () {});
  });

loadFlags(); document.addEventListener("visibilitychange", function () { if (!document.hidden) loadFlags(); });
})();
