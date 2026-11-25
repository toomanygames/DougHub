/* DougCode editor: files, code, blocks, a slide-in test panel, saving, sharing and publishing games. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var DC = window.DC, L = DC.LANGS;
  var q = new URLSearchParams(location.search);
  var proj = null, active = null, mode = "code", cm = null, docs = {}, ws = null, blocksReady = false, dirty = false, saveTimer = null, stopRun = null, blocksTouched = false;
  var DOT = { html: "#f97316", css: "#38bdf8", js: "#facc15", py: "#60a5fa", lua: "#818cf8", json: "#a3acd9" };

  function setState(t, bad) { var s = $("saveState"); s.textContent = t; s.style.color = bad ? "#fca5a5" : ""; }
  function visible() { return DC.visibleFiles(proj.files); }
  function blocksTarget() { return proj.runtime === "web" ? "main.js" : proj.entry; }
  function blocksOk() { return true; }

  /* ---------- load ---------- */
  function boot() {
    DC.getUser().then(function () {
      var id = q.get("id"), local = q.get("local");
      if (id) {
        return DC.getProject(id).then(function (p) {
          if (!p) throw new Error("That project was not found.");
          var u = DC.user();
          if (!u || p.owner_id !== u.id) { location.replace("project.html?id=" + encodeURIComponent(id)); return null; }
          return p;
        });
      }
      if (local) { var lp = DC.localGet(local); if (!lp) throw new Error("That project is not in this browser."); lp.localId = local; return lp; }
      var lang = L[q.get("lang")] ? q.get("lang") : "web", kind = q.get("kind") === "game" ? "game" : "project";
      return DC.newProject(lang, kind, (q.get("name") || "").slice(0, 80));
    }).then(function (p) {
      if (!p) return;
      proj = p; start();
    }).catch(function (e) { document.body.innerHTML = '<div style="padding:40px;font-family:system-ui;color:#fca5a5">' + DC.esc(e.message || e) + ' <a style="color:#a5b4fc" href="scripting.html">Back to DougCode</a></div>'; });
  }

  function start() {
    var lang = L[proj.runtime];
    document.title = proj.title + " • DougCode";
    $("title").value = proj.title;
    var b = $("langBadge"); b.textContent = lang.short; b.style.background = lang.color;
    var meta = DC.getMeta(proj.files); $("kindBadge").textContent = meta.kind === "game" ? "Game" : "Project";
    $("btnGame").hidden = !lang.game;
    active = DC.getFile(proj.files, proj.entry) ? proj.entry : (visible()[0] || {}).name;
    cm = CodeMirror($("cmHost"), { value: "", mode: "text/plain", theme: "material-darker", lineNumbers: true, tabSize: 2, indentWithTabs: false, matchBrackets: true, autoCloseBrackets: true, lineWrapping: false, extraKeys: { Tab: function (c) { if (c.somethingSelected()) c.indentSelection("add"); else c.replaceSelection("  ", "end"); } } });
    cm.on("change", function (inst, ch) { if (ch.origin === "setValue" || !active) return; DC.setFile(proj.files, active, inst.getValue()); touched(); if (mode === "code" && active === blocksTarget() && blocksTouched) {/* user is editing generated code */} });
    renderFiles(); openFile(active);
    wire();
    if (location.hash === "#test") openTest(true);
    setState(proj.id ? "Saved to your account" : (DC.user() ? "Not saved yet" : "Saved in this browser only"));
    window.addEventListener("beforeunload", function (e) { if (dirty && !DC.user()) { e.preventDefault(); e.returnValue = ""; } });
  }

  /* ---------- files ---------- */
  function renderFiles() {
    var host = $("flist"); host.innerHTML = "";
    visible().forEach(function (f) {
      var d = document.createElement("div"); d.className = "file" + (f.name === active ? " on" : ""); d.setAttribute("role", "button"); d.tabIndex = 0;
      d.innerHTML = '<span class="dot" style="background:' + (DOT[DC.extOf(f.name)] || "#a3acd9") + '"></span><span class="nm">' + DC.esc(f.name) + "</span>" + (f.name === proj.entry ? '<span class="run">RUNS</span>' : "") + '<button class="x" type="button" title="Delete file" aria-label="Delete ' + DC.esc(f.name) + '">x</button>';
      d.addEventListener("click", function (e) { if (e.target.classList.contains("x")) { e.stopPropagation(); delFile(f.name); return; } if (mode !== "code") setMode("code"); openFile(f.name); });
      d.addEventListener("keydown", function (e) { if (e.key === "Enter") { if (mode !== "code") setMode("code"); openFile(f.name); } });
      d.addEventListener("dblclick", function () { renameFile(f.name); });
      host.appendChild(d);
    });
    var sel = $("entrySel"), exts = L[proj.runtime].ext;
    var runnable = visible().filter(function (f) { return proj.runtime === "web" ? DC.extOf(f.name) === "html" : exts.indexOf(DC.extOf(f.name)) >= 0; });
    sel.innerHTML = runnable.map(function (f) { return '<option value="' + DC.esc(f.name) + '"' + (f.name === proj.entry ? " selected" : "") + ">" + DC.esc(f.name) + "</option>"; }).join("");
    $("entryBox").hidden = runnable.length < 2;
  }
  function openFile(name) {
    var f = DC.getFile(proj.files, name); if (!f) return;
    active = name;
    if (!docs[name]) docs[name] = CodeMirror.Doc(f.content, DC.modeFor(name));
    else if (docs[name].getValue() !== f.content) docs[name].setValue(f.content);
    cm.swapDoc(docs[name]); cm.refresh(); renderFiles();
    if (mode === "code") cm.focus();
  }
  function validName(n) { return /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,40}\.[a-z0-9]{1,5}$/i.test(n) && L[proj.runtime].ext.indexOf(DC.extOf(n)) >= 0 && n !== DC.BLOCKS; }
  function delFile(name) {
    if (visible().length <= 1) { setState("A project needs at least one file.", true); return; }
    if (!confirm("Delete " + name + "?")) return;
    proj.files = proj.files.filter(function (f) { return f.name !== name; }); delete docs[name];
    if (proj.entry === name) { var next = visible().filter(function (f) { return L[proj.runtime].ext.indexOf(DC.extOf(f.name)) >= 0; })[0]; proj.entry = next ? next.name : proj.entry; }
    renderFiles(); openFile(visible().some(function (f) { return f.name === active; }) ? active : visible()[0].name); touched();
  }
  function renameFile(name) {
    var n = prompt("New name for " + name, name); if (!n || n === name) return;
    n = n.trim(); if (!validName(n)) { setState("Use letters, numbers and dots. Allowed endings: ." + L[proj.runtime].ext.join(", .") + ".", true); return; }
    if (DC.getFile(proj.files, n)) { setState("A file with that name already exists.", true); return; }
    var f = DC.getFile(proj.files, name); f.name = n; f.type = DC.extOf(n);
    docs[n] = docs[name]; delete docs[name]; if (docs[n]) docs[n].cm && 0;
    if (proj.entry === name) proj.entry = n; if (active === name) active = n;
    renderFiles(); openFile(active); touched();
  }
  function newFileDialog() {
    var d = $("dlgNew"), exts = L[proj.runtime].ext;
    $("newName").value = ""; $("newName").placeholder = "name." + exts[exts.length > 1 ? 1 : 0]; $("newMsg").textContent = ""; d.showModal(); $("newName").focus();
  }
  function createFile() {
    var n = $("newName").value.trim(); if (!n.includes(".")) n += "." + L[proj.runtime].ext[0];
    if (!validName(n)) { $("newMsg").textContent = "Use letters, numbers and dots. Allowed endings: ." + L[proj.runtime].ext.join(", ."); return; }
    if (DC.getFile(proj.files, n)) { $("newMsg").textContent = "That name is already used."; return; }
    var start = ({ html: "<!-- new page -->\n", css: "/* styles */\n", js: "// new file\n", py: "# new file\n", lua: "-- new file\n" })[DC.extOf(n)] || "";
    DC.setFile(proj.files, n, start); $("dlgNew").close(); renderFiles(); if (mode !== "code") setMode("code"); openFile(n); touched();
  }

  /* ---------- code and blocks ---------- */
  function setMode(m) {
    mode = m;
    $("tabCode").classList.toggle("on", m === "code"); $("tabBlocks").classList.toggle("on", m === "blocks");
    $("paneCode").hidden = m !== "code"; $("paneBlocks").hidden = m !== "blocks";
    if (m === "code") { openFile(active); }
    else { initBlocks(); setTimeout(function () { Blockly.svgResize(ws); }, 30); }
    $("tabNote").textContent = m === "blocks" ? "Blocks write to " + blocksTarget() : "";
  }
  function initBlocks() {
    if (blocksReady) return; blocksReady = true;
    var saved = DC.getFile(proj.files, DC.BLOCKS);
    ws = DCB.init($("blocksHost"), proj.runtime, function () { if (!blocksTouched && !loadingBlocks) { blocksTouched = true; } if (!loadingBlocks) onBlocksChanged(); });
    var loadingBlocksNow = true; loadingBlocks = true;
    if (saved && saved.content) DCB.load(ws, saved.content);
    loadingBlocks = false;
    $("blocksBannerText").textContent = "Blocks write your program into " + blocksTarget() + ". Building here replaces the code in that file.";
    $("blocksBannerX").onclick = function () { $("blocksBanner").hidden = true; };
    window.addEventListener("resize", function () { if (ws && mode === "blocks") Blockly.svgResize(ws); });
  }
  var loadingBlocks = false;
  function onBlocksChanged() {
    var code = DCB.generate(ws, proj.runtime);
    DC.setFile(proj.files, DC.BLOCKS, DCB.save(ws));
    DC.setFile(proj.files, blocksTarget(), code);
    if (docs[blocksTarget()]) docs[blocksTarget()].setValue(code);
    touched();
  }

  /* ---------- saving ---------- */
  function touched() { dirty = true; setState("Unsaved changes"); clearTimeout(saveTimer); saveTimer = setTimeout(function () { save(true); }, 2500); }
  function save(auto) {
    clearTimeout(saveTimer);
    proj.title = $("title").value.trim() || "Untitled";
    var u = DC.user();
    if (!u) { DC.localSave(proj); dirty = false; setState(auto ? "Saved in this browser" : "Saved in this browser. Log in to keep it in your account."); return Promise.resolve(); }
    if (auto && !proj.id) { DC.localSave(proj); setState("Press Save to put it in your account"); return Promise.resolve(); }
    setState("Saving...");
    return DC.saveProject(proj).then(function () {
      dirty = false; setState("Saved to your account"); history.replaceState(null, "", "editor.html?id=" + encodeURIComponent(proj.id) + location.hash); $("mPage").href = "project.html?id=" + proj.id;
    }).catch(function (e) { setState("Could not save: " + (e.message || e), true); throw e; });
  }
  function needAccount(msgEl) {
    if (!DC.user()) { msgEl.textContent = "Log in first. Your work stays in this browser."; msgEl.className = "msg"; return true; }
    return false;
  }
  function ensureSaved() { return proj.id ? save() : save(); }

  /* ---------- test panel ---------- */
  function openTest(run) {
    $("body").classList.add("test-open"); $("handle").setAttribute("aria-expanded", "true");
    setTimeout(function () { if (ws && mode === "blocks") Blockly.svgResize(ws); }, 320);
    if (run) runIt();
  }
  function closeTest() { $("body").classList.remove("test-open"); $("handle").setAttribute("aria-expanded", "false"); setTimeout(function () { if (ws && mode === "blocks") Blockly.svgResize(ws); }, 320); }
  function toggleTest() { if ($("body").classList.contains("test-open")) closeTest(); else openTest(true); }
  function line(kind, text) {
    var c = $("tConsole"); var e = c.querySelector(".empty"); if (e) e.remove();
    var d = document.createElement("div"); d.className = "ln " + kind; d.textContent = text; c.appendChild(d); c.scrollTop = c.scrollHeight;
    if (c.children.length > 400) c.removeChild(c.firstChild);
  }
  function runIt() {
    if (stopRun) { stopRun(); stopRun = null; }
    if (mode === "blocks" && ws) onBlocksChanged();
    var showFrame = DC.runsPage(proj); document.body.classList.toggle("is-game", DC.isGame(proj));
    $("tFrame").classList.toggle("hide", !showFrame); $("tConsole").classList.toggle("full", !showFrame);
    $("tConsole").innerHTML = ""; $("tState").textContent = "Running " + proj.entry + "...";
    var framed = $("tFrame"); var fresh = framed.cloneNode(false); framed.parentNode.replaceChild(fresh, framed);
    stopRun = DC.run(proj, fresh, function (m) {
      if (m.kind === "done") { $("tState").textContent = "Finished. Press Run to go again."; if (!$("tConsole").children.length) line("sys", "(no output)"); return; }
      if (m.kind === "sys") { $("tState").textContent = m.text; return; }
      if (m.text !== "") line(m.kind, m.text);
    });
    if (showFrame) $("tState").textContent = "Running. Output from console.log shows below.";
  }
  function stopIt() { if (stopRun) { stopRun(); stopRun = null; } $("tState").textContent = "Stopped."; }

  /* ---------- share, publish, more ---------- */
  function openShare() {
    var d = $("dlgShare"), m = $("shMsg"); m.textContent = "";
    $("shDesc").value = proj.description || ""; $("shPublic").checked = proj.visibility === "public"; $("shCopy").checked = proj.allow_copy !== false; $("shDl").checked = proj.allow_download !== false;
    $("shLink").hidden = !proj.id; if (proj.id) $("shLink").href = "project.html?id=" + proj.id;
    d.showModal(); if (needAccount(m)) $("shOk").disabled = true; else $("shOk").disabled = false;
  }
  function saveShare() {
    var m = $("shMsg");
    proj.description = $("shDesc").value.trim(); proj.visibility = $("shPublic").checked ? "public" : "private"; proj.allow_copy = $("shCopy").checked; proj.allow_download = $("shDl").checked;
    m.textContent = "Saving..."; m.className = "msg";
    save().then(function () { m.textContent = proj.visibility === "public" ? "Shared. Everyone can find it on the DougCode home page." : "Saved. Only you can see this project."; m.className = "msg ok"; $("shLink").hidden = false; $("shLink").href = "project.html?id=" + proj.id; }).catch(function (e) { m.textContent = e.message || String(e); m.className = "msg"; });
  }
  var coverData;   /* undefined = leave as is, null = remove, string = new picture */
  function setCover(url) { coverData = url; $("gCoverImg").hidden = !url; if (url) $("gCoverImg").src = url; $("gCoverX").hidden = url === undefined ? true : !url; }
  function pickCover(file) {
    if (!file) return; var m = $("gMsg");
    var img = new Image(); var u = URL.createObjectURL(file);
    img.onload = function () {
      var W = 640, H = 360, c = document.createElement("canvas"); c.width = W; c.height = H; var x = c.getContext("2d");
      var r = Math.max(W / img.width, H / img.height), w = img.width * r, h = img.height * r; x.fillStyle = "#0b0e20"; x.fillRect(0, 0, W, H); x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      URL.revokeObjectURL(u); setCover(c.toDataURL("image/jpeg", .8)); m.textContent = "";
    };
    img.onerror = function () { URL.revokeObjectURL(u); m.textContent = "Could not read that picture."; };
    img.src = u;
  }
  function openGame() {
    setCover(undefined); $("gCover").value = "";
    var m = $("gMsg"); m.textContent = ""; m.className = "msg";
    $("gTitle").value = proj.title; $("gDesc").value = proj.description || "";
    var meta = DC.getMeta(proj.files); $("gOk").textContent = meta.gameId ? "Update game" : "Publish"; $("gUn").hidden = !meta.gameId; $("gLink").hidden = !meta.gameId;
    $("dlgGame").showModal(); if (needAccount(m)) $("gOk").disabled = true; else $("gOk").disabled = false;
  }
  function doPublish() {
    var m = $("gMsg"), t = $("gTitle").value.trim(), d = $("gDesc").value.trim();
    if (!t) { m.textContent = "Add a game title."; m.className = "msg"; return; }
    if (!d) { m.textContent = "Add a short description."; m.className = "msg"; return; }
    if (mode === "blocks" && ws) onBlocksChanged();
    $("gOk").disabled = true; m.textContent = "Publishing..."; m.className = "msg";
    DC.publishGame(proj, { title: t, description: d, category: $("gCat").value, cover: coverData }).then(function (r) {
      proj.description = proj.description || d; return save().then(function () { m.textContent = r.updated ? "Updated! The new version is live on the Games page." : "Published! Your game is on the Games page under Community Games."; m.className = "msg ok"; $("gOk").textContent = "Update game"; $("gUn").hidden = false; $("gLink").hidden = false; });
    }).catch(function (e) { m.textContent = e.message || String(e); m.className = "msg"; }).then(function () { $("gOk").disabled = false; });
  }
  function doUnpublish() {
    if (!confirm("Remove this game from Community Games? Your project stays.")) return;
    var m = $("gMsg");
    DC.unpublishGame(proj).then(function () { return save(); }).then(function () { m.textContent = "Removed from Community Games."; m.className = "msg ok"; $("gUn").hidden = true; $("gLink").hidden = true; $("gOk").textContent = "Publish"; }).catch(function (e) { m.textContent = e.message || String(e); m.className = "msg"; });
  }

  function wire() {
    $("tabCode").onclick = function () { setMode("code"); };
    $("tabBlocks").onclick = function () { setMode("blocks"); };
    $("addFile").onclick = newFileDialog; $("newOk").onclick = createFile;
    $("newName").addEventListener("keydown", function (e) { if (e.key === "Enter") createFile(); });
    $("entrySel").onchange = function () { proj.entry = this.value; renderFiles(); touched(); };
    $("title").addEventListener("input", function () { touched(); });
    $("btnTest").onclick = toggleTest; $("handle").onclick = toggleTest; $("tClose").onclick = closeTest; $("tRun").onclick = runIt; $("tStop").onclick = stopIt;
    $("tFull").onclick = function () { if (!document.fullscreenElement) { if (!stopRun) runIt(); var f = $("tFrame"); if (f.requestFullscreen) f.requestFullscreen().then(function () { try { f.contentWindow.focus(); } catch (e) {} }).catch(function () { $("tState").textContent = "Your browser blocked full screen."; }); } else document.exitFullscreen(); };
    $("tClear").onclick = function () { $("tConsole").innerHTML = '<div class="empty">Output will show here.</div>'; };
    $("btnSave").onclick = function () { save(false).catch(function () {}); };
    $("btnShare").onclick = openShare; $("shOk").onclick = saveShare;
    $("gCover").onchange = function () { pickCover(this.files && this.files[0]); }; $("gCoverX").onclick = function () { $("gCover").value = ""; setCover(null); $("gCoverImg").hidden = true; $("gCoverX").hidden = true; };
    $("btnGame").onclick = openGame; $("gOk").onclick = doPublish; $("gUn").onclick = doUnpublish;
    document.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", function () { b.closest("dialog").close(); }); });
    $("btnMore").onclick = function (e) { e.stopPropagation(); var m = $("menu"); m.hidden = !m.hidden; $("mPage").style.display = proj.id ? "" : "none"; if (proj.id) $("mPage").href = "project.html?id=" + proj.id; };
    document.addEventListener("click", function () { $("menu").hidden = true; });
    $("mDownload").onclick = function () { DC.download(proj); };
    $("mDelete").onclick = function () {
      if (!confirm("Delete this project for good?")) return;
      if (proj.id) DC.deleteProject(proj.id).then(function () { location.href = "scripting.html"; }).catch(function (e) { setState(e.message, true); });
      else { if (proj.localId) DC.localDelete(proj.localId); location.href = "scripting.html"; }
    };
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(false).catch(function () {}); }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); openTest(true); }
    });
  }
  boot();
})();
