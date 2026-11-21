/* DougHub app shell: home screen, game player, languages, installing and automatic updates. */
(function () {
  "use strict";
  var VERSION = "2026.11.20.50";
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
    { id: "getaway-road", name: "Getaway Road", tags: ["Racing", "Action"], isNew: 1 },
    { id: "bubble-grove", name: "Bubble Grove", tags: ["Puzzle", "Arcade"] },
    { id: "grotto-escape", name: "Grotto Escape", tags: ["Platformer", "Retro"], isNew: 1 },
    { id: "star-salvo", name: "Star Salvo", tags: ["Shooter", "Arcade"], isNew: 1 },
    { id: "crystal-merge", name: "Crystal Merge", tags: ["Puzzle", "Arcade"], isNew: 1 },
    { id: "coin-smash", name: "Coin Smash", tags: ["Clicker", "Idle"], isNew: 1 },
    { id: "lantern-lake", name: "Lantern Lake", tags: ["Idle", "Cozy"], isNew: 1 },
    { id: "beat-tiles", name: "Beat Tiles", tags: ["Music", "Rhythm"], isNew: 1 },
    { id: "cave-quest", name: "Cave Quest", tags: ["Adventure", "RPG"], isNew: 1 },
    { id: "block-town", name: "Block Town", tags: ["Builder", "Cozy"], isNew: 1 },
    { id: "brick-smash", name: "Brick Smash", tags: ["Arcade", "Action"], isNew: 1 },
    { id: "sky-hop", name: "Sky Hop", tags: ["Arcade", "Action"], isNew: 1 },
    { id: "pond-fisher", name: "Pond Fisher", tags: ["Cozy", "Idle"], isNew: 1 }
  ];
  var SECTIONS = [
    { k: "fast", ic: "⚡", col: "#f59e0b", ids: ["getaway-road", "star-salvo", "brick-smash", "sky-hop", "grotto-escape"], en: "Fast-paced", es: "Acción rápida", fr: "Action rapide", de: "Rasant", pt: "Ação rápida", it: "Azione veloce", ja: "スピード系" },
    { k: "click", ic: "👆", col: "#22d3ee", ids: ["coin-smash", "sparkroot", "honk-empire"], en: "Clicker games", es: "Juegos clicker", fr: "Jeux de clic", de: "Klicker-Spiele", pt: "Jogos clicker", it: "Giochi clicker", ja: "クリッカー" },
    { k: "idle", ic: "🌙", col: "#a78bfa", ids: ["pond-fisher", "lantern-lake", "bundt-bakery", "farm-idle"], en: "Idle & cozy", es: "Idle y relax", fr: "Idle et cosy", de: "Idle & gemütlich", pt: "Idle e aconchegantes", it: "Idle e relax", ja: "放置・まったり" },
    { k: "puzzle", ic: "🧩", col: "#34d399", ids: ["bubble-grove", "crystal-merge"], en: "Puzzle", es: "Puzles", fr: "Puzzle", de: "Rätsel", pt: "Quebra-cabeças", it: "Rompicapi", ja: "パズル" },
    { k: "music", ic: "🎵", col: "#f472b6", ids: ["beat-tiles", "off-brand-beat-battle", "goose-gig"], en: "Music & rhythm", es: "Música y ritmo", fr: "Musique et rythme", de: "Musik & Rhythmus", pt: "Música e ritmo", it: "Musica e ritmo", ja: "音楽・リズム" },
    { k: "adv", ic: "🗺️", col: "#60a5fa", ids: ["cave-quest", "fighting-fantasy", "quiet-woods"], en: "Adventure & RPG", es: "Aventura y rol", fr: "Aventure et RPG", de: "Abenteuer & RPG", pt: "Aventura e RPG", it: "Avventura e GDR", ja: "ぼうけん・RPG" },
    { k: "build", ic: "🔧", col: "#fb923c", ids: ["block-town", "fix-it-crew"], en: "Builders", es: "Constructores", fr: "Constructeurs", de: "Bauen", pt: "Construção", it: "Costruzione", ja: "ものづくり" }
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
  var WORDS = { all: { en: "All", es: "Todos", fr: "Tous", de: "Alle", pt: "Todos", it: "Tutti", ja: "すべて" },
    feat: { en: "Featured", es: "Destacado", fr: "À la une", de: "Empfohlen", pt: "Destaque", it: "In evidenza", ja: "おすすめ" },
    search: { en: "Search games", es: "Buscar juegos", fr: "Rechercher des jeux", de: "Spiele suchen", pt: "Buscar jogos", it: "Cerca giochi", ja: "ゲームをさがす" },
    cont: { en: "Continue playing", es: "Seguir jugando", fr: "Reprendre", de: "Weiterspielen", pt: "Continuar jogando", it: "Continua a giocare", ja: "つづきから" },
    none: { en: "No games found.", es: "No se encontraron juegos.", fr: "Aucun jeu trouvé.", de: "Keine Spiele gefunden.", pt: "Nenhum jogo encontrado.", it: "Nessun gioco trovato.", ja: "ゲームがみつかりません。" },
    games: { en: "Games", es: "Juegos", fr: "Jeux", de: "Spiele", pt: "Jogos", it: "Giochi", ja: "ゲーム" } };
  function w(k) { return WORDS[k][lang] || WORDS[k].en; }
  var filter = "all", query = "";
  function cats() { var o = []; GAMES.forEach(function (g) { g.tags.forEach(function (x) { if (o.indexOf(x) < 0) o.push(x); }); }); return o; }
  function G(id) { return GAMES.filter(function (g) { return g.id === id; })[0]; }
  function recents() { try { return JSON.parse(localStorage.getItem("dh-recent") || "[]").filter(G); } catch (e) { return []; } }
  function pushRecent(id) { var r = recents().filter(function (x) { return x !== id; }); r.unshift(id); try { localStorage.setItem("dh-recent", JSON.stringify(r.slice(0, 8))); } catch (e) {} }
  function secOf(id) { for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].ids.indexOf(id) > -1) return SECTIONS[i]; return null; }
  function tagLine(g) { return g.tags.map(function (x) { return t("tag." + x); }).join(" · "); }
  function rowHtml(g) {
    var sec = secOf(g.id);
    return '<button class="row" type="button" data-id="' + g.id + '" style="--c:' + (sec ? sec.col : "#818cf8") + '"><span class="rart"><img src="art/' + g.id + '.svg" alt="">' + (g.isNew ? '<i class="nb">' + esc(t("newtag")) + "</i>" : "") + '</span><span class="rbody"><b>' + esc(g.name) + "</b><small>" + esc(tagLine(g)) + (g.by ? " · " + esc(t("madeby")) + " " + esc(g.by) : "") + '</small><span class="rp">' + esc(t("blurb." + g.id)) + '</span></span><span class="rgo" aria-hidden="true"></span></button>';
  }
  function matches(g, q) { return (g.name + " " + tagLine(g) + " " + t("blurb." + g.id)).toLowerCase().indexOf(q) > -1; }
  function renderResults() {
    var q = query.trim().toLowerCase(), h = "";
    if (q) { var res = GAMES.filter(function (g) { return matches(g, q); }); h = res.length ? '<div class="list">' + res.map(rowHtml).join("") + "</div>" : '<p class="empty">' + esc(w("none")) + "</p>"; }
    else {
      var used = {};
      SECTIONS.forEach(function (sec) {
        var gs = sec.ids.map(function (id) { used[id] = 1; return G(id); }).filter(Boolean);
        if (!gs.length || (filter !== "all" && filter !== sec.k)) return;
        h += '<section class="grp" style="--c:' + sec.col + '"><h2><i></i>' + esc(sec[lang] || sec.en) + ' <span class="count">' + gs.length + '</span></h2><div class="list">' + gs.map(rowHtml).join("") + "</div></section>";
      });
      var rest = GAMES.filter(function (g) { return !used[g.id]; });
      if (rest.length && filter === "all") h += '<section class="grp"><h2><i></i>' + esc(w("games")) + ' <span class="count">' + rest.length + '</span></h2><div class="list">' + rest.map(rowHtml).join("") + "</div></section>";
    }
    $("results").innerHTML = h; $("grid").classList.toggle("flat", !!q || filter !== "all");
  }
  function renderGrid() {
    var h = "", rc = recents(), f = G("bundt-bakery") || GAMES[0], nw = GAMES.filter(function (g) { return g.isNew && g.id !== f.id; }).slice(-2);
    if (rc.length) h += '<section class="recent"><h3>' + esc(w("cont")) + '</h3><div class="rrow">' + rc.slice(0, 6).map(function (id) { var g = G(id); return '<button class="mini" type="button" data-id="' + id + '"><img src="art/' + id + '.svg" alt=""><b>' + esc(g.name) + "</b></button>"; }).join("") + "</div></section>";
    h += '<div class="spot"><section class="feat" data-id="' + f.id + '" role="button" tabindex="0"><div class="feat-art"><img src="art/' + f.id + '.svg" alt=""></div><div class="feat-b"><span class="eyebrow">' + esc(w("feat")) + "</span><h2>" + esc(f.name) + "</h2><p>" + esc(t("blurb." + f.id)) + '</p><span class="btn pri">' + esc(t("play")) + ' &rarr;</span></div></section><div class="spot-side">' +
      nw.map(function (g) { var sec = secOf(g.id); return '<button class="mini big" type="button" data-id="' + g.id + '" style="--c:' + (sec ? sec.col : "#818cf8") + '"><img src="art/' + g.id + '.svg" alt=""><span><small>' + esc(t("newtag")) + "</small><b>" + esc(g.name) + "</b></span></button>"; }).join("") + "</div></div>";
    h += '<div class="bar2"><div class="tabs2" role="tablist"><button type="button" class="tab2' + (filter === "all" ? " on" : "") + '" data-f="all">' + esc(w("all")) + "</button>" + SECTIONS.map(function (s) { return '<button type="button" class="tab2' + (filter === s.k ? " on" : "") + '" data-f="' + s.k + '" style="--c:' + s.col + '">' + esc(s[lang] || s.en) + "</button>"; }).join("") +
      '</div><input id="q" class="search" type="text" name="dh_find_game" autocomplete="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-1p-ignore data-bwignore="true" data-form-type="other" placeholder="' + esc(w("search")) + '" value="' + esc(query) + '"></div><div id="results"></div>';
    $("grid").className = ""; $("grid").innerHTML = h; renderResults();
    $("q").addEventListener("input", function () { query = this.value; renderResults(); });
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
    pushRecent(id); playing = id; $("pTitle").textContent = g.name; $("pLoad").classList.remove("done");
    mountFrame("games/" + id + ".html"); $("player").hidden = false; document.body.style.overflow = "hidden";
    if (!fromPop) { try { history.pushState({ play: id }, "", "#play-" + id); } catch (e) {} }
  }
  function closeGame(fromPop) {
    if (!playing) return; playing = null; $("player").hidden = true; document.body.style.overflow = "";
    if (frame) { frame.remove(); frame = null; }
    if (!fromPop && history.state && history.state.play) { try { history.back(); } catch (e) {} }
    maybeApply();
  }
  $("grid").addEventListener("click", function (e) { var c = e.target.closest(".tab2"); if (c) { filter = c.dataset.f; query = ""; renderGrid(); window.scrollTo(0, 0); return; } var b = e.target.closest(".row,.feat,.mini"); if (b) openGame(b.dataset.id); });
  $("grid").addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("feat")) { e.preventDefault(); openGame(e.target.dataset.id); } });
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
