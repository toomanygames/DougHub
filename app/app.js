/* DougHub app shell: home screen, game player, languages, installing and automatic updates. */
(function () {
  "use strict";
  var VERSION = "2026.11.17.3";
  var $ = function (id) { return document.getElementById(id); };
  var T = window.DH_T, LANGS = window.DH_LANGS;
  var GAMES = [
    { id: "fix-it-crew", name: "Fix-It Crew", tags: ["3D", "Builder"], isNew: 1 },
    { id: "bundt-bakery", name: "Bundt Bakery", tags: ["Cozy", "Bakery"], isNew: 1 },
    { id: "farm-idle", name: "Farm Idle", tags: ["Idle", "Farm"] },
    { id: "goose-gig", name: "Honk & Roll: The Goose Gig", tags: ["Music", "3D"] },
    { id: "sparkroot", name: "Sparkroot", tags: ["Idle", "Clicker"] },
    { id: "honk-empire", name: "Honk Empire", tags: ["Idle", "Clicker"] },
    { id: "off-brand-beat-battle", name: "Off-Brand Beat Battle", tags: ["Music", "Rhythm"], isNew: 1 },
    { id: "fighting-fantasy", name: "Fighting Fantasy V.1", tags: ["RPG", "Fantasy"], by: "Xan" },
    { id: "quiet-woods", name: "99 Nights in the Wonder Woods", tags: ["Adventure", "Cozy"] },
    { id: "bubble-grove", name: "Bubble Grove", tags: ["Puzzle", "Arcade"] }
  ];
  var COV = {};                       // which games have translated menus, per language (i18n/coverage.json)

  /* ---------- language ---------- */
  function pickLang() {
    try { var s = localStorage.getItem("dh-lang"); if (s && T[s]) return s; } catch (e) {}
    var n = String(navigator.language || "en").slice(0, 2).toLowerCase(); return T[n] ? n : "en";
  }
  var lang = pickLang();
  function t(k) { return (T[lang] && T[lang][k]) || T.en[k] || k; }
  function setLang(l) { lang = l; try { localStorage.setItem("dh-lang", l); } catch (e) {} renderAll(); }
  var STATIC = { tPick: "pick", tPickSub: "pick_sub", tHome: "home", tSettings: "settings", tLanguage: "language", tLangNote: "lang_note", tUpdates: "updates", tAuto: "auto", tInstall: "install", tInstallHelp: "install_help", tOffline: "offline", tAbout: "about", tAboutText: "about_text", tVersion: "version" };
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  /* ---------- home ---------- */
  function renderGrid() {
    $("grid").innerHTML = GAMES.map(function (g) {
      var tags = g.tags.map(function (x) { return '<span class="tag">' + esc(t("tag." + x)) + "</span>"; }).join("");
      var lt = "";
      if (lang !== "en") { var ok = COV[g.id] && COV[g.id].indexOf(lang) > -1; lt = '<span class="lang-tag' + (ok ? "" : " no") + '">' + esc(ok ? t("tr_full") : t("tr_none")) + "</span>"; }
      return '<button class="tile" type="button" data-id="' + g.id + '"><div class="art"><img src="art/' + g.id + '.svg" alt="">' + (g.isNew ? '<span class="badge">' + esc(t("newtag")) + "</span>" : "") + '</div><div class="body"><div class="tags">' + tags + "</div><h3>" + esc(g.name) + "</h3>" +
        (g.by ? '<div class="by">' + esc(t("madeby")) + " " + esc(g.by) + "</div>" : "") + "<p>" + esc(t("blurb." + g.id)) + '</p><div class="foot">' + lt + '<span class="go">' + esc(t("play")) + "</span></div></div></button>";
    }).join("");
  }
  function renderLangs() {
    $("langList").innerHTML = LANGS.map(function (l) { return '<button class="lang' + (l[0] === lang ? " on" : "") + '" type="button" data-l="' + l[0] + '">' + esc(l[1]) + "</button>"; }).join("");
    $("langName").textContent = (LANGS.filter(function (l) { return l[0] === lang; })[0] || LANGS[0])[1];
  }
  function renderAll() {
    document.documentElement.lang = lang;
    for (var id in STATIC) $(id).textContent = t(STATIC[id]);
    $("sheetClose").setAttribute("aria-label", t("close")); $("setBtn").setAttribute("aria-label", t("settings"));
    $("verText").textContent = VERSION; renderGrid(); renderLangs(); renderUpdate();
  }

  /* ---------- toast ---------- */
  var toastT = 0;
  function toast(msg) { var e = $("toast"); e.textContent = msg; e.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { e.classList.remove("show"); }, 3800); }

  /* ---------- player ---------- */
  var playing = null, frame = null;
  function mountFrame(src) {
    if (frame) frame.remove();
    frame = document.createElement("iframe");
    frame.title = "Game"; frame.setAttribute("allow", "autoplay; fullscreen; gamepad; clipboard-write");
    frame.addEventListener("load", function () { $("pLoad").classList.add("done"); try { frame.focus(); } catch (e) {} });
    frame.src = src; document.querySelector(".pframe").insertBefore(frame, $("pLoad"));
  }
  function openGame(id, fromPop) {
    var g = GAMES.filter(function (x) { return x.id === id; })[0]; if (!g) return;
    playing = id; $("pTitle").textContent = g.name; $("pLoad").classList.remove("done");
    mountFrame("games/" + id + ".html"); $("player").hidden = false; document.body.style.overflow = "hidden";
    if (!fromPop) { try { history.pushState({ play: id }, "", "#play-" + id); } catch (e) {} }
  }
  function closeGame(fromPop) {
    if (!playing) return; playing = null; $("player").hidden = true; document.body.style.overflow = "";
    if (frame) { frame.remove(); frame = null; }
    if (!fromPop && history.state && history.state.play) { try { history.back(); } catch (e) {} }
    maybeApply();
  }
  $("grid").addEventListener("click", function (e) { var b = e.target.closest(".tile"); if (b) openGame(b.dataset.id); });
  $("pBack").addEventListener("click", function () { closeGame(false); });
  window.addEventListener("popstate", function (e) { var s = e.state; if (s && s.play) openGame(s.play, true); else closeGame(true); });
  window.addEventListener("message", function (e) { if (e.data && e.data.dh === "back" && frame && e.source === frame.contentWindow) closeGame(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { if (!$("sheetWrap").hidden) closeSheet(); else if (playing) closeGame(false); } });

  /* ---------- settings ---------- */
  function openSheet() { $("sheetWrap").hidden = false; renderUpdate(); }
  function closeSheet() { $("sheetWrap").hidden = true; }
  $("setBtn").addEventListener("click", openSheet); $("langBtn").addEventListener("click", openSheet);
  $("sheetClose").addEventListener("click", closeSheet);
  $("sheetWrap").addEventListener("click", function (e) { if (e.target === $("sheetWrap")) closeSheet(); });
  $("langList").addEventListener("click", function (e) { var b = e.target.closest("[data-l]"); if (b) setLang(b.dataset.l); });

  /* ---------- installing ---------- */
  var deferred = null, standalone = window.matchMedia && matchMedia("(display-mode: standalone)").matches;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; renderUpdate(); });
  window.addEventListener("appinstalled", function () { deferred = null; renderUpdate(); });
  $("installBtn").addEventListener("click", function () { if (deferred) { deferred.prompt(); deferred = null; renderUpdate(); } });

  /* ---------- automatic updates ---------- */
  var reg = null, upd = "idle", reloading = false;     // idle | checking | updating | ready | uptodate
  function renderUpdate() {
    var txt = upd === "checking" ? t("checking") : upd === "updating" ? t("updating") : upd === "ready" ? t("ready") : t("uptodate");
    $("updText").textContent = txt;
    var btn = $("updBtn"); btn.hidden = false; btn.disabled = upd === "checking" || upd === "updating";
    btn.textContent = upd === "ready" ? t("update_now") : t("check");
    var cls = upd === "idle" || upd === "uptodate" ? "ok" : "";
    $("status").innerHTML = "<b>DougHub</b> " + esc(t("version")) + " " + esc(VERSION) + ' &middot; <span class="' + cls + '">' + esc(txt) + "</span>";
    $("installBtn").hidden = !deferred; $("installBtn").textContent = t("install");
    $("installBox").hidden = standalone;
  }
  function applyUpdate() { if (reg && reg.waiting) { upd = "updating"; renderUpdate(); reg.waiting.postMessage({ type: "SKIP_WAITING" }); } }
  function maybeApply() { if (upd === "ready" && !playing) setTimeout(function () { if (upd === "ready" && !playing) applyUpdate(); }, 2500); }
  function gotReady() { upd = "ready"; renderUpdate(); maybeApply(); }
  $("updBtn").addEventListener("click", function () {
    if (upd === "ready") return applyUpdate();
    if (!reg) { toast(t("uptodate")); return; }
    upd = "checking"; renderUpdate();
    reg.update().then(function () { setTimeout(function () { if (upd === "checking") { upd = "uptodate"; renderUpdate(); } }, 1500); }).catch(function () { upd = "idle"; renderUpdate(); });
  });
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register("sw.js").then(function (r) {
      reg = r;
      if (r.waiting && navigator.serviceWorker.controller) gotReady();
      r.addEventListener("updatefound", function () {
        var w = r.installing; if (!w) return; upd = "updating"; renderUpdate();
        w.addEventListener("statechange", function () { if (w.state === "installed") { if (navigator.serviceWorker.controller) gotReady(); else { upd = "idle"; renderUpdate(); } } });
      });
      setInterval(function () { r.update().catch(function () {}); }, 30 * 60 * 1000);
      r.update().catch(function () {});
    }).catch(function () {});
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (reloading) return; reloading = true; try { sessionStorage.setItem("dh-updated", "1"); } catch (e) {} location.reload();
    });
  }
  try { if (sessionStorage.getItem("dh-updated")) { sessionStorage.removeItem("dh-updated"); setTimeout(function () { toast(t("just_updated")); }, 500); } } catch (e) {}

  /* ---------- start ---------- */
  renderAll();
  fetch("i18n/coverage.json").then(function (r) { return r.json(); }).then(function (j) { COV = j; renderGrid(); }).catch(function () {});
  var m = /^#play-(.+)$/.exec(location.hash);
  if (m) { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
  window.__dhApp = { openGame: openGame, closeGame: closeGame, setLang: setLang, VERSION: VERSION };
})();
