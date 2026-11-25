/* DougCode home: explore shared projects, your own projects, and the game studio. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var DC = window.DC, L = DC.LANGS, esc = DC.esc;
  var lang = "all", timer = null, dKind = "project", dLang = "web";

  function badge(rt) { var l = L[rt] || L.web; return '<span class="lb" style="background:' + l.color + '">' + esc(l.short) + "</span>"; }
  function card(href, p, owner, extra) {
    return '<a class="pc" href="' + href + '"><div class="top">' + badge(p.runtime) + (extra || "") + "</div><h3>" + esc(p.title) + "</h3><p>" + esc(p.description || "No description yet.") + '</p><div class="meta">' + (owner ? "<span>" + esc(owner) + "</span>" : "") + "<span>" + esc(DC.ago(p.updated_at)) + "</span></div></a>";
  }
  function setTab(t) {
    $("tabProjects").classList.toggle("on", t === "projects"); $("tabGames").classList.toggle("on", t === "games");
    $("viewProjects").hidden = t !== "projects"; $("viewGames").hidden = t !== "games";
    history.replaceState(null, "", "#" + t);
    if (t === "games") loadGames();
  }

  /* ---------- explore ---------- */
  function renderChips() {
    var host = $("langChips"); host.innerHTML = "";
    [["all", "All"]].concat(Object.keys(L).map(function (k) { return [k, L[k].short]; })).forEach(function (x) {
      var b = document.createElement("button"); b.type = "button"; b.className = "chip" + (lang === x[0] ? " on" : ""); b.textContent = x[1];
      b.onclick = function () { lang = x[0]; renderChips(); loadExplore(); }; host.appendChild(b);
    });
  }
  function loadExplore() {
    var grid = $("exploreGrid"); grid.innerHTML = '<div class="empty">Loading projects...</div>';
    DC.listPublic($("projSearch").value.trim(), lang).then(function (rows) {
      $("exploreCount").textContent = rows.length ? rows.length + (rows.length === 60 ? "+" : "") + " shared" : "";
      if (!rows.length) { grid.innerHTML = '<div class="empty">Nothing here yet. Be the first to share a project.</div>'; return; }
      return DC.ownerNames(rows).then(function (names) { grid.innerHTML = rows.map(function (p) { return card("project.html?id=" + encodeURIComponent(p.id), DC.normalise(Object.assign({ files: [] }, p)), names[p.owner_id] || "member"); }).join(""); });
    }).catch(function (e) { grid.innerHTML = '<div class="empty">Could not load projects. ' + esc(e.message || "") + "</div>"; });
  }

  /* ---------- your projects ---------- */
  function loadMine() {
    var box = $("mineBox"), u = DC.user();
    var local = DC.localList();
    var cloud = u ? DC.listMine() : Promise.resolve([]);
    cloud.then(function (rows) {
      var html = "";
      if (!u) html += '<div class="empty" style="margin-bottom:8px">Log in to keep your projects in your account and share them. <a class="btn-text" href="../log-in.html?redirect=Scripting/scripting.html">Log in</a></div>';
      if (rows.length) html += '<h2 class="sec">Your projects <small>' + rows.length + '</small></h2><div class="grid">' + rows.map(function (p) { return card("project.html?id=" + encodeURIComponent(p.id), p, "", '<span class="st' + (p.visibility === "public" ? " live" : "") + '">' + (p.visibility === "public" ? "Public" : "Private") + "</span>" + (p.kind === "game" ? '<span class="st">Game</span>' : "")); }).join("") + "</div>";
      if (local.length) html += '<h2 class="sec">On this device <small>not in an account</small></h2><div class="grid">' + local.map(function (p) { return card("editor.html?local=" + encodeURIComponent(p.localId), p, "", '<span class="st">This browser</span>'); }).join("") + "</div>";
      if (u && !rows.length && !local.length) html += '<div class="empty" style="margin-bottom:8px">You have no projects yet. Press <strong>New project</strong> to start.</div>';
      box.innerHTML = html;
    }).catch(function () { box.innerHTML = ""; });
  }

  /* ---------- game studio ---------- */
  function loadGames() {
    var u = DC.user(), mg = $("myGames");
    var mine = u ? DC.listMine().then(function (rows) { return rows.filter(function (p) { return p.kind === "game"; }); }) : Promise.resolve([]);
    mine.then(function (rows) {
      var local = DC.localList().filter(function (p) { return p.kind === "game"; });
      var h = rows.map(function (p) { return card("editor.html?id=" + encodeURIComponent(p.id), p, "", p.gameId ? '<span class="st live">Published</span>' : '<span class="st">Not published</span>'); }).join("") + local.map(function (p) { return card("editor.html?local=" + encodeURIComponent(p.localId), p, "", '<span class="st">This browser</span>'); }).join("");
      mg.innerHTML = h || '<div class="empty">' + (u ? "No games yet. Press Make a game." : "Make your first game. Log in to publish it.") + "</div>";
    });
    DC.db.from("community_games").select("id,title,author,category,created_at,description").order("created_at", { ascending: false }).limit(6).then(function (r) {
      var rows = r.data || [];
      $("commGames").innerHTML = rows.length ? rows.map(function (g) { return '<a class="pc" href="../douggames.html#community-games"><div class="top"><span class="lb" style="background:#a78bfa">' + esc(g.category || "Game") + "</span></div><h3>" + esc(g.title) + "</h3><p>" + esc(g.description || "") + '</p><div class="meta"><span>' + esc(g.author || "member") + "</span><span>" + esc(DC.ago(g.created_at)) + "</span></div></a>"; }).join("") : '<div class="empty">No community games yet.</div>';
    });
  }

  /* ---------- new project dialog ---------- */
  var BLURB = { web: "Pages, styles and scripts. Runs in the browser.", javascript: "Plain JavaScript with a console.", python: "Python with a console, or a game on a canvas. Works with blocks.", lua: "Small and fast, great for games. Works with blocks." };
  function drawDialog() {
    $("dnTitle").textContent = dKind === "game" ? "Make a game" : "New project";
    document.querySelectorAll("#dlgNew .seg button").forEach(function (b) { b.classList.toggle("on", b.dataset.kind === dKind); });
    if (dKind === "game" && !L[dLang].game) dLang = "web";
    $("dnLangs").innerHTML = Object.keys(L).map(function (k) {
      var off = false;
      return '<button type="button" class="lg' + (dLang === k ? " on" : "") + '" data-l="' + k + '"' + (off ? " disabled" : "") + '><b style="color:' + L[k].color + '">' + esc(L[k].short) + "</b><span>" + esc(BLURB[k]) + "</span></button>";
    }).join("");
    $("dnLangs").querySelectorAll(".lg").forEach(function (b) { b.onclick = function () { dLang = b.dataset.l; drawDialog(); }; });
    $("dnName").placeholder = dKind === "game" ? "My game" : "My project";
  }
  function openNew(kind) { dKind = kind; $("dnName").value = ""; drawDialog(); $("dlgNew").showModal(); $("dnName").focus(); }
  function goNew() { var n = $("dnName").value.trim(); location.href = "editor.html?new=1&lang=" + dLang + "&kind=" + dKind + (n ? "&name=" + encodeURIComponent(n) : ""); }

  function boot() {
    renderChips();
    $("newProj").onclick = function () { openNew("project"); }; $("newGame").onclick = function () { openNew("game"); };
    document.querySelectorAll("#dlgNew .seg button").forEach(function (b) { b.onclick = function () { dKind = b.dataset.kind; drawDialog(); }; });
    $("dnCancel").onclick = function () { $("dlgNew").close(); }; $("dnGo").onclick = goNew;
    $("dnName").addEventListener("keydown", function (e) { if (e.key === "Enter") goNew(); });
    $("tabProjects").onclick = function () { setTab("projects"); }; $("tabGames").onclick = function () { setTab("games"); };
    $("projSearch").addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(loadExplore, 300); });
    DC.getUser().then(function () { loadMine(); loadExplore(); setTab(location.hash === "#games" ? "games" : "projects"); });
  }
  boot();
})();
