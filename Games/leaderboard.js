/* DougHub game leaderboards.
   Add to a game with:  <script src="leaderboard.js" data-game-key="starfall-run" defer></script>
   Then report scores with:  DHScores.submit("starfall-run", score)             (sent at most every ~10 s)
                              DHScores.submit("starfall-run", score, {now:true}) (game over: send right away)
   A small "Leaderboard" button is added to the page. Only the member's best score is kept, and it is checked on the server. */
(function () {
  "use strict";
  if (window.DHScores) return;
  var URL = "https://agsqdqcsmsppcdqxlppj.supabase.co";
  var KEY = "sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52";
  var SEND_EVERY = 10000;
  var client = null, clientPromise = null, signedIn = null;
  var latest = {}, lastSent = {}, timers = {};

  function loadSupabase() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
    });
  }
  function getClient() {
    if (client) return Promise.resolve(client);
    if (window.DougHubSupabaseClient) { client = window.DougHubSupabaseClient; return Promise.resolve(client); }
    if (!clientPromise) {
      clientPromise = loadSupabase().then(function () {
        client = window.DougHubSupabaseClient || window.supabase.createClient(URL, KEY);
        return client;
      });
    }
    return clientPromise;
  }
  function hasSession() {
    return getClient().then(function (c) { return c.auth.getSession(); }).then(function (r) {
      signedIn = !!(r && r.data && r.data.session); return signedIn;
    }).catch(function () { return false; });
  }

  function toast(text) {
    var d = document.createElement("div");
    d.textContent = text;
    d.style.cssText = "position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:2147483000;padding:8px 16px;border-radius:999px;background:#1b1f45;color:#fff;font:700 13px system-ui,sans-serif;box-shadow:0 6px 20px #0008;border:1px solid #a5b4fc55;pointer-events:none";
    document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2800);
  }

  function send(game) {
    var score = latest[game];
    if (!(score > 0)) return Promise.resolve(null);
    lastSent[game] = Date.now();
    return hasSession().then(function (ok) {
      if (!ok) return null;
      return client.rpc("dh_submit_score", { p_game: game, p_score: score });
    }).then(function (res) {
      var d = res && res.data;
      if (d && d.ok && d.improved && d.rank) toast("Leaderboard: you are #" + d.rank);
      return d || null;
    }).catch(function () { return null; });
  }

  var api = {
    submit: function (game, score, opts) {
      score = Number(score);
      if (!isFinite(score) || score <= 0) return Promise.resolve(null);
      if (!(latest[game] >= score)) latest[game] = score;
      if (opts && opts.now) { clearTimeout(timers[game]); timers[game] = null; return send(game); }
      var wait = SEND_EVERY - (Date.now() - (lastSent[game] || 0));
      if (wait <= 0) return send(game);
      if (!timers[game]) timers[game] = setTimeout(function () { timers[game] = null; send(game); }, wait);
      return Promise.resolve(null);
    },
    fetch: function (game, limit) {
      return hasSession().then(function (ok) {
        if (!ok) return { signedOut: true };
        return client.rpc("dh_game_leaderboard", { p_game: game, p_limit: limit || 10 }).then(function (r) { if (r.error) throw r.error; return r.data; });
      });
    },
    mount: mount
  };
  window.DHScores = api;

  function flushAll() { Object.keys(latest).forEach(function (g) { if (timers[g]) { clearTimeout(timers[g]); timers[g] = null; } send(g); }); }
  document.addEventListener("visibilitychange", function () { if (document.hidden) flushAll(); });
  window.addEventListener("pagehide", flushAll);

  var SUF = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
  function fmt(n) { n = Number(n) || 0; if (n < 1000) return String(Math.floor(n)); var i = 0; while (n >= 1000 && i < SUF.length - 1) { n /= 1000; i++; } return (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)) + SUF[i]; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function mount(game) {
    if (document.getElementById("dhLbBtn")) return;
    var btn = document.createElement("button");
    btn.id = "dhLbBtn"; btn.type = "button"; btn.textContent = "Leaderboard";
    btn.style.cssText = "position:fixed;left:10px;bottom:10px;z-index:2147482000;padding:7px 12px;border:1px solid #ffffff44;border-radius:999px;background:#10142fd9;color:#fff;font:800 12px system-ui,sans-serif;cursor:pointer;backdrop-filter:blur(6px)";
    btn.addEventListener("click", function () { open(game); });
    document.body.appendChild(btn);
  }

  function open(game) {
    var back = document.createElement("div");
    back.style.cssText = "position:fixed;inset:0;z-index:2147483001;background:#000a;display:grid;place-items:center;padding:14px";
    var box = document.createElement("div");
    box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    box.style.cssText = "width:min(420px,100%);max-height:86vh;overflow:auto;padding:18px;border-radius:18px;background:#0d1130;color:#f5f6ff;border:1px solid #a5b4fc44;font:600 14px system-ui,sans-serif;box-shadow:0 20px 60px #000b";
    box.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="font-size:18px">Leaderboard</b><button type="button" id="dhLbClose" style="border:0;background:#ffffff18;color:#fff;border-radius:9px;padding:6px 11px;font:800 13px system-ui;cursor:pointer">Close</button></div><div id="dhLbBody" style="margin-top:12px;color:#a5b4fc">Loading...</div>';
    back.appendChild(box); document.body.appendChild(back);
    function close() { back.remove(); }
    box.querySelector("#dhLbClose").addEventListener("click", close);
    back.addEventListener("click", function (e) { if (e.target === back) close(); });
    document.addEventListener("keydown", function esc1(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc1); } });
    var body = box.querySelector("#dhLbBody");
    api.fetch(game, 10).then(function (d) {
      if (d && d.signedOut) { body.innerHTML = 'Log in to see the leaderboard. <a href="../log-in.html" style="color:#a5b4fc">Log in</a>'; return; }
      var rows = d.rows || [];
      var h = '<div style="color:#9ba4c4;font-size:12px;margin-bottom:8px">' + esc(d.game.title) + ' &middot; ' + (d.players || 0) + ' player' + (d.players === 1 ? "" : "s") + '</div>';
      if (!rows.length) h += '<div style="padding:14px;text-align:center;color:#9ba4c4">No scores yet. Be the first!</div>';
      rows.forEach(function (r) {
        var art = r.art_path && /^https:\/\//.test(r.art_path) ? '<img src="' + esc(r.art_path) + '" alt="" style="width:30px;height:30px;object-fit:contain">' : '<span style="width:30px"></span>';
        h += '<a href="../profile.html?u=' + encodeURIComponent(r.username) + '" style="display:flex;align-items:center;gap:10px;padding:8px 10px;margin-bottom:6px;border-radius:12px;text-decoration:none;color:inherit;background:' + (r.is_me ? "#4f46e544" : "#ffffff08") + '"><b style="width:26px;color:#ffd23f">#' + r.rank + '</b>' + art + '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(r.username) + '</span><b>' + fmt(r.score) + '</b></a>';
      });
      if (d.me && !rows.some(function (r) { return r.is_me; })) h += '<div style="margin-top:8px;padding:8px 10px;border-radius:12px;background:#4f46e544">You: <b>#' + d.me.rank + '</b> &middot; ' + fmt(d.me.score) + '</div>';
      h += '<a href="../leaderboards.html#' + esc(game) + '" style="display:block;margin-top:10px;text-align:center;color:#a5b4fc;font-size:13px">See all leaderboards</a>';
      body.innerHTML = h;
    }).catch(function (e) { body.textContent = "Could not load the leaderboard."; });
  }

  var tag = document.currentScript;
  var game = tag && tag.getAttribute("data-game-key");
  if (game) {
    if (document.body) mount(game); else document.addEventListener("DOMContentLoaded", function () { mount(game); });
  }
})();
