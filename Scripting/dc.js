/* DougCode shared code: languages, projects (cloud + this browser), the runner that tests code, and publishing.
   Used by the DougCode home (scripting.html), the editor (editor.html) and the project page (project.html). */
(function () {
  "use strict";
  var URL_ = "https://agsqdqcsmsppcdqxlppj.supabase.co";
  var KEY_ = "sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52";
  var db = window.supabase ? window.supabase.createClient(URL_, KEY_) : null;
  var META = ".dougcode.json";   /* hidden file inside every project: { kind, gameId } */
  var BLOCKS = "blocks.dcb";     /* hidden file: the saved block workspace */

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ago(iso) {
    if (!iso) return "";
    var s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + " h ago";
    if (s < 86400 * 30) return Math.floor(s / 86400) + " days ago";
    return new Date(iso).toLocaleDateString();
  }

  /* ---------- languages ---------- */
  var GAME_JS = [
    '/* Catch the falling stars with the arrow keys. */',
    'const canvas = document.getElementById("game");',
    'const ctx = canvas.getContext("2d");',
    'let player = { x: 220, y: 290, w: 60, h: 14 };',
    'let stars = [];',
    'let score = 0;',
    'const keys = {};',
    'addEventListener("keydown", e => keys[e.key] = true);',
    'addEventListener("keyup", e => keys[e.key] = false);',
    '',
    'function tick() {',
    '  if (keys.ArrowLeft) player.x -= 6;',
    '  if (keys.ArrowRight) player.x += 6;',
    '  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));',
    '  if (Math.random() < 0.04) stars.push({ x: Math.random() * (canvas.width - 16), y: -10 });',
    '  stars.forEach(s => s.y += 3);',
    '  stars = stars.filter(s => {',
    '    const hit = s.y > player.y - 12 && s.x > player.x - 12 && s.x < player.x + player.w;',
    '    if (hit) score++;',
    '    return !hit && s.y < canvas.height;',
    '  });',
    '  ctx.fillStyle = "#0b0e20"; ctx.fillRect(0, 0, canvas.width, canvas.height);',
    '  ctx.fillStyle = "#67e8f9"; ctx.fillRect(player.x, player.y, player.w, player.h);',
    '  ctx.fillStyle = "#fde047"; stars.forEach(s => { ctx.beginPath(); ctx.arc(s.x + 6, s.y, 7, 0, 7); ctx.fill(); });',
    '  ctx.fillStyle = "#fff"; ctx.font = "18px sans-serif"; ctx.fillText("Score: " + score, 12, 26);',
    '  requestAnimationFrame(tick);',
    '}',
    'tick();'
  ].join("\n");
  var LANGS = {
    web: {
      label: "Web (HTML, CSS and JavaScript)", short: "Web", color: "#f97316", entry: "index.html", ext: ["html", "css", "js"], runs: "page", game: true,
      starter: {
        project: [
          { name: "index.html", content: '<main class="app">\n  <p class="eyebrow">MY FIRST PROJECT</p>\n  <h1>Hello, world!</h1>\n  <p>Edit these files, then press <strong>Test</strong>.</p>\n  <button id="hello">Click me</button>\n  <p id="message"></p>\n</main>\n<link rel="stylesheet" href="style.css">\n<script src="main.js"><\/script>' },
          { name: "style.css", content: 'body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif; color: #f8fafc; background: #0b1024; }\n.app { padding: 32px; border: 1px solid #ffffff22; border-radius: 22px; background: #151b35; }\n.eyebrow { color: #a5b4fc; font-size: 12px; letter-spacing: 2px; }\nbutton { border: 0; border-radius: 10px; padding: 11px 16px; color: #fff; background: linear-gradient(135deg, #6366f1, #a855f7); cursor: pointer; font-weight: 800; }' },
          { name: "main.js", content: 'document.getElementById("hello").addEventListener("click", () => {\n  document.getElementById("message").textContent = "It works!";\n  console.log("Button clicked");\n});' }
        ],
        game: [
          { name: "index.html", content: '<canvas id="game" width="480" height="320"></canvas>\n<link rel="stylesheet" href="style.css">\n<script src="main.js"><\/script>' },
          { name: "style.css", content: 'body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #05060f; }\ncanvas { max-width: 100%; border-radius: 14px; box-shadow: 0 20px 60px #0008; }' },
          { name: "main.js", content: GAME_JS }
        ]
      }
    },
    javascript: {
      label: "JavaScript", short: "JavaScript", color: "#eab308", entry: "main.js", ext: ["js"], runs: "page", game: true,
      starter: {
        project: [{ name: "main.js", content: 'const names = ["Doug", "Ada", "Linus"];\nfor (const n of names) {\n  console.log("Hello, " + n + "!");\n}\n\nfunction square(x) { return x * x; }\nconsole.log("5 squared is", square(5));' }],
        game: [{ name: "main.js", content: '/* A canvas is made for you. */\nconst canvas = document.createElement("canvas");\ncanvas.id = "game"; canvas.width = 480; canvas.height = 320;\ndocument.body.style.cssText = "margin:0;min-height:100vh;display:grid;place-items:center;background:#05060f";\ndocument.body.appendChild(canvas);\n' + GAME_JS.replace(/^\/\*[^*]*\*\/\n/, "").replace('const canvas = document.getElementById("game");\n', "") }]
      }
    },
    python: {
      label: "Python", short: "Python", color: "#3b82f6", entry: "main.py", ext: ["py"], runs: "console", game: false,
      starter: {
        project: [
          { name: "main.py", content: 'from helpers import greet\n\nfor name in ["Doug", "Ada", "Linus"]:\n    print(greet(name))\n\ntotal = sum(range(1, 11))\nprint("1 + 2 + ... + 10 =", total)' },
          { name: "helpers.py", content: 'def greet(name):\n    return "Hello, " + name + "!"' }
        ],
        game: [{ name: "main.py", content: '# A number guessing game that plays itself.\nimport random\n\nsecret = random.randint(1, 20)\nlow, high = 1, 20\ntries = 0\nwhile True:\n    guess = (low + high) // 2\n    tries += 1\n    print("Guess", tries, ":", guess)\n    if guess == secret:\n        print("Found", secret, "in", tries, "tries!")\n        break\n    if guess < secret:\n        low = guess + 1\n    else:\n        high = guess - 1' }]
      }
    },
    lua: {
      label: "Lua", short: "Lua", color: "#6366f1", entry: "main.lua", ext: ["lua"], runs: "console", game: false,
      starter: {
        project: [
          { name: "main.lua", content: 'local helpers = require("helpers")\n\nfor _, name in ipairs({"Doug", "Ada", "Linus"}) do\n  print(helpers.greet(name))\nend\n\nlocal total = 0\nfor i = 1, 10 do total = total + i end\nprint("1 + 2 + ... + 10 =", total)' },
          { name: "helpers.lua", content: 'local M = {}\nfunction M.greet(name)\n  return "Hello, " .. name .. "!"\nend\nreturn M' }
        ],
        game: [{ name: "main.lua", content: '-- A number guessing game that plays itself.\nmath.randomseed(os.time())\nlocal secret = math.random(1, 20)\nlocal low, high, tries = 1, 20, 0\nwhile true do\n  local guess = (low + high) // 2\n  tries = tries + 1\n  print("Guess " .. tries .. ": " .. guess)\n  if guess == secret then\n    print("Found " .. secret .. " in " .. tries .. " tries!")\n    break\n  end\n  if guess < secret then low = guess + 1 else high = guess - 1 end\nend' }]
      }
    }
  };
  function extOf(n) { var m = /\.([a-z0-9]+)$/i.exec(n || ""); return m ? m[1].toLowerCase() : ""; }
  function modeFor(n) { var e = extOf(n); return ({ html: "htmlmixed", css: "css", js: "javascript", py: "python", lua: "lua", json: "javascript" })[e] || "text/plain"; }
  function visibleFiles(files) { return (files || []).filter(function (f) { return f.name !== META && f.name !== BLOCKS; }); }
  function getFile(files, name) { for (var i = 0; i < files.length; i++) if (files[i].name === name) return files[i]; return null; }
  function setFile(files, name, content) { var f = getFile(files, name); if (f) f.content = content; else files.push({ name: name, type: extOf(name), content: content }); }
  function getMeta(files) { var f = getFile(files, META); try { return f ? JSON.parse(f.content) || {} : {}; } catch (e) { return {}; } }
  function setMeta(files, meta) { setFile(files, META, JSON.stringify(meta)); }

  /* ---------- projects: cloud rows normalised into { id, title, description, runtime, entry, files, ... } ---------- */
  function normalise(row) {
    var files = Array.isArray(row.files) ? row.files.map(function (f) { return { name: f.name, type: f.type || extOf(f.name), content: f.content == null ? "" : String(f.content) }; }) : [];
    if (!files.length) {   /* old projects stored html/css/js in three columns */
      if (row.html_code) files.push({ name: "index.html", type: "html", content: row.html_code });
      if (row.css_code) files.push({ name: "style.css", type: "css", content: row.css_code });
      if (row.js_code) files.push({ name: "main.js", type: "js", content: row.js_code });
    }
    var rt = LANGS[row.runtime] ? row.runtime : "web";
    return { id: row.id, owner_id: row.owner_id, title: row.title || "Untitled", description: row.description || "", runtime: rt, entry: row.entry_file || LANGS[rt].entry, files: files, visibility: row.visibility || "private", allow_copy: row.allow_copy !== false, allow_download: row.allow_download !== false, created_at: row.created_at, updated_at: row.updated_at };
  }
  var LIST_COLS = "id,owner_id,title,description,runtime,visibility,allow_copy,allow_download,created_at,updated_at";
  var user = null, profile = null;
  function getUser() {
    if (!db) return Promise.resolve(null);
    return db.auth.getSession().then(function (r) {
      user = r.data && r.data.session ? r.data.session.user : null;
      if (!user) return null;
      return db.from("profiles").select("username,avatar_url,is_admin,is_owner,staff_role").eq("id", user.id).maybeSingle().then(function (p) { profile = p.data || {}; return user; });
    }).catch(function () { return null; });
  }
  function ownerNames(rows) {
    var ids = Array.from(new Set(rows.map(function (r) { return r.owner_id; }).filter(Boolean)));
    if (!ids.length) return Promise.resolve({});
    return db.from("profiles").select("id,username").in("id", ids).then(function (r) { var m = {}; (r.data || []).forEach(function (p) { m[p.id] = p.username; }); return m; });
  }
  function listPublic(q, lang) {
    var req = db.from("code_projects").select(LIST_COLS).eq("visibility", "public").order("updated_at", { ascending: false }).limit(60);
    if (lang && lang !== "all") req = req.eq("runtime", lang);
    if (q) { var t = q.replace(/[%,()]/g, " ").trim(); if (t) req = req.or("title.ilike.%" + t + "%,description.ilike.%" + t + "%"); }
    return req.then(function (r) { if (r.error) throw r.error; return r.data || []; });
  }
  function listMine() {
    if (!user) return Promise.resolve([]);
    return db.from("code_projects").select(LIST_COLS + ",files").eq("owner_id", user.id).order("updated_at", { ascending: false }).limit(100)
      .then(function (r) { if (r.error) throw r.error; return (r.data || []).map(function (row) { var f = Array.isArray(row.files) ? row.files : []; var m = {}; var mf = f.filter(function (x) { return x && x.name === META; })[0]; try { m = mf ? JSON.parse(mf.content) : {}; } catch (e) {} delete row.files; row.kind = m.kind || "project"; row.gameId = m.gameId || null; return row; }); });
  }
  function getProject(id) {
    return db.from("code_projects").select("*").eq("id", id).maybeSingle().then(function (r) { if (r.error) throw r.error; if (!r.data) return null; return normalise(r.data); });
  }
  function payload(p) {
    var f = {}; p.files.forEach(function (x) { f[x.name] = 1; });
    return { title: String(p.title || "Untitled").slice(0, 80), description: String(p.description || "").slice(0, 500), runtime: p.runtime, entry_file: p.entry, visibility: p.visibility || "private", allow_copy: p.allow_copy !== false, allow_download: p.allow_download !== false, files: p.files.map(function (x) { return { name: x.name, type: x.type || extOf(x.name), content: x.content }; }), html_code: (getFile(p.files, "index.html") || {}).content || "", css_code: (getFile(p.files, "style.css") || {}).content || "", js_code: (getFile(p.files, "main.js") || {}).content || "", updated_at: new Date().toISOString() };
  }
  function saveProject(p) {
    if (!user) return Promise.reject(new Error("Log in to save to your account."));
    var body = payload(p);
    if (p.id) return db.from("code_projects").update(body).eq("id", p.id).eq("owner_id", user.id).select("id").then(function (r) { if (r.error) throw r.error; if (!r.data || !r.data.length) throw new Error("That project could not be saved."); return p; });
    body.owner_id = user.id;
    return db.from("code_projects").insert(body).select("id").single().then(function (r) { if (r.error) throw r.error; p.id = r.data.id; return p; });
  }
  function deleteProject(id) { return db.from("code_projects").delete().eq("id", id).eq("owner_id", user.id).then(function (r) { if (r.error) throw r.error; }); }
  function fork(p) {
    var c = JSON.parse(JSON.stringify(p)); c.id = null; c.title = ("Copy of " + p.title).slice(0, 80); c.visibility = "private";
    var m = getMeta(c.files); delete m.gameId; setMeta(c.files, m);
    return saveProject(c);
  }

  /* guests keep projects in this browser only */
  var LOCAL_KEY = "dougcode_local_projects_v2";
  function localAll() { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}") || {}; } catch (e) { return {}; } }
  function localSave(p) { var a = localAll(); if (!p.localId) p.localId = "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); p.updated_at = new Date().toISOString(); a[p.localId] = p; try { localStorage.setItem(LOCAL_KEY, JSON.stringify(a)); } catch (e) {} return p; }
  function localGet(id) { return localAll()[id] || null; }
  function localList() { var a = localAll(); return Object.keys(a).map(function (k) { var p = a[k]; return { localId: k, title: p.title, runtime: p.runtime, updated_at: p.updated_at, kind: getMeta(p.files).kind || "project" }; }).sort(function (x, y) { return String(y.updated_at).localeCompare(String(x.updated_at)); }); }
  function localDelete(id) { var a = localAll(); delete a[id]; try { localStorage.setItem(LOCAL_KEY, JSON.stringify(a)); } catch (e) {} }

  function newProject(lang, kind, title) {
    var L = LANGS[lang] || LANGS.web; var k = kind === "game" ? "game" : "project";
    var files = JSON.parse(JSON.stringify(L.starter[k] || L.starter.project)).map(function (f) { f.type = extOf(f.name); return f; });
    setMeta(files, { kind: k });
    return { id: null, title: title || (k === "game" ? "My game" : "My project"), description: "", runtime: lang, entry: L.entry, files: files, visibility: "private", allow_copy: true, allow_download: true };
  }

  /* ---------- runner: builds a page for the language and reports output ---------- */
  var HOOK = '<script>(function(){function s(k,a){try{parent.postMessage({dc:"out",kind:k,text:[].map.call(a,function(x){try{return typeof x==="string"?x:(x instanceof Error?String(x):JSON.stringify(x))}catch(e){return String(x)}}).join(" ")},"*")}catch(e){}}["log","info","warn","error"].forEach(function(k){var o=console[k];console[k]=function(){s(k==="info"?"log":k,arguments);try{o.apply(console,arguments)}catch(e){}}});window.addEventListener("error",function(e){s("error",[e.message+(e.lineno?" (line "+e.lineno+")":"")])});window.addEventListener("unhandledrejection",function(e){s("error",[String(e.reason)])});})();<\/script>';
  function safeScript(code) { return String(code).replace(/<\/script/gi, "<\\/script"); }
  function inlineWeb(files, entry) {
    var html = (getFile(files, entry) || getFile(files, "index.html") || { content: "" }).content;
    html = html.replace(/<link[^>]+href=["']([^"']+\.css)["'][^>]*>/gi, function (m, h) { var f = getFile(files, h.replace(/^\.?\//, "")); return f ? "<style>" + f.content + "</style>" : m; });
    html = html.replace(/<script([^>]*)src=["']([^"']+\.js)["']([^>]*)>\s*<\/script>/gi, function (m, a, h, b) { var f = getFile(files, h.replace(/^\.?\//, "")); return f ? "<script" + a + b + ">" + safeScript(f.content) + "<\/script>" : m; });
    return html;
  }
  function buildDoc(p, withHook) {
    var files = visibleFiles(p.files), h = withHook ? HOOK : "";
    if (p.runtime === "web") {
      var html = inlineWeb(files, p.entry);
      if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, function (m) { return m + h; });
      if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, function (m) { return m + "<head>" + h + "</head>"; });
      return "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" + h + "</head><body>" + html + "</body></html>";
    }
    if (p.runtime === "javascript") {
      var js = files.filter(function (f) { return extOf(f.name) === "js" && f.name !== p.entry; }).concat(files.filter(function (f) { return f.name === p.entry; })).map(function (f) { return "<script>" + safeScript(f.content) + "<\/script>"; }).join("\n");
      return "<!doctype html><html><head><meta charset=\"utf-8\">" + h + "<style>body{font-family:system-ui,sans-serif;color:#e8ebff;background:#0b0e20;margin:0}</style></head><body>" + js + "</body></html>";
    }
    var payload = JSON.stringify({ files: files.map(function (f) { return { name: f.name, content: f.content }; }), entry: p.entry }).replace(/</g, "\\u003c");
    if (p.runtime === "python") {
      return "<!doctype html><html><head><meta charset=\"utf-8\">" + h + "<script src=\"https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js\"><\/script></head><body><script>(function(){var P=" + payload + ";function post(k,t){parent.postMessage({dc:'out',kind:k,text:t},'*')}(async function(){try{post('sys','Starting Python. The first run downloads about 10 MB.');var py=await loadPyodide();py.setStdout({batched:function(s){post('log',s)}});py.setStderr({batched:function(s){post('error',s)}});P.files.forEach(function(f){if(/\\.py$/.test(f.name))py.FS.writeFile(f.name,f.content)});var e=P.files.filter(function(f){return f.name===P.entry})[0];await py.runPythonAsync(e?e.content:'');}catch(err){var m=String(err&&err.message||err).split('\\n').filter(function(l){return l.trim()}).slice(-4).join('\\n');post('error',m)}post('done','')})()})();<\/script></body></html>";
    }
    if (p.runtime === "lua") {
      return "<!doctype html><html><head><meta charset=\"utf-8\">" + h + "<script src=\"https://cdn.jsdelivr.net/npm/fengari-web@0.1.4/dist/fengari-web.js\"><\/script></head><body><script>(function(){var P=" + payload + ";function post(k,t){parent.postMessage({dc:'out',kind:k,text:t},'*')}function lvl(s){var n=0;while(s.indexOf(']'+'='.repeat(n)+']')>=0)n++;return n}function long(s){var e='='.repeat(lvl(s));return '['+e+'['+s+']'+e+']'}try{fengari.load(\"local js=require('js') print=function(...) local t={} for i=1,select('#',...) do t[#t+1]=tostring((select(i,...))) end js.global.console:log(table.concat(t,'\\\\t')) end\")();P.files.forEach(function(f){if(/\\.lua$/.test(f.name)&&f.name!==P.entry){var mod=f.name.replace(/\\.lua$/,'');fengari.load('package.preload['+JSON.stringify(mod)+']=load('+long(f.content)+','+JSON.stringify('='+mod)+')')()}});var e=P.files.filter(function(f){return f.name===P.entry})[0];fengari.load(e?e.content:'','='+P.entry)()}catch(err){post('error',String(err&&err.message||err))}post('done','')})();<\/script></body></html>";
    }
    return "";
  }
  /* run(p, frame, onMsg) puts the program into an iframe; returns stop() */
  function run(p, frame, onMsg) {
    var handler = function (ev) { if (ev.source !== frame.contentWindow || !ev.data || ev.data.dc !== "out") return; onMsg(ev.data); };
    window.addEventListener("message", handler);
    frame.setAttribute("sandbox", "allow-scripts allow-pointer-lock allow-forms");
    frame.srcdoc = buildDoc(p, true);
    return function stop() { window.removeEventListener("message", handler); frame.srcdoc = "<!doctype html><body style='margin:0;background:#0b0e20'></body>"; };
  }

  /* ---------- publishing a game to Community Games (the page must run in a browser) ---------- */
  function gameDocument(p) {
    var d = buildDoc(p, false);
    if (!/<meta[^>]+viewport/i.test(d)) d = d.replace(/<head[^>]*>/i, function (m) { return m + '<meta name="viewport" content="width=device-width,initial-scale=1">'; });
    return /^\s*<!doctype/i.test(d) ? d : "<!doctype html>\n" + d;
  }
  function publishGame(p, opts) {
    if (!user) return Promise.reject(new Error("Log in to publish."));
    if (!LANGS[p.runtime].game) return Promise.reject(new Error("Games on the Games page run in the browser. Choose Web or JavaScript for a game."));
    var meta = getMeta(p.files), code = gameDocument(p);
    var row = { title: String(opts.title || p.title).slice(0, 80), description: String(opts.description || p.description || "").slice(0, 500), code: code };
    if (meta.gameId) {
      return db.from("community_games").update(row).eq("id", meta.gameId).eq("creator_id", user.id).select("id").then(function (r) {
        if (r.error) throw r.error;
        if (r.data && r.data.length) return { id: meta.gameId, updated: true };
        delete meta.gameId; return publishGame(p, opts);
      });
    }
    row.author = (profile && profile.username) || "DougHub member"; row.category = opts.category || "Arcade"; row.creator_id = user.id; row.is_official = false;
    return db.from("community_games").insert(row).select("id").single().then(function (r) { if (r.error) throw r.error; meta.gameId = r.data.id; meta.kind = "game"; setMeta(p.files, meta); return { id: r.data.id, updated: false }; });
  }
  function unpublishGame(p) {
    var meta = getMeta(p.files); if (!meta.gameId) return Promise.resolve();
    return db.from("community_games").delete().eq("id", meta.gameId).eq("creator_id", user.id).then(function (r) { if (r.error) throw r.error; delete meta.gameId; setMeta(p.files, meta); });
  }

  /* ---------- download ---------- */
  function loadScript(src) { return new Promise(function (ok, bad) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); }); }
  function download(p) {
    var files = visibleFiles(p.files), base = String(p.title || "project").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "project";
    function save(blob, name) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); }
    if (files.length === 1) { save(new Blob([files[0].content], { type: "text/plain" }), files[0].name); return Promise.resolve(); }
    return (window.JSZip ? Promise.resolve() : loadScript("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js")).then(function () {
      var z = new window.JSZip(); files.forEach(function (f) { z.file(f.name, f.content); });
      return z.generateAsync({ type: "blob" }).then(function (b) { save(b, base + ".zip"); });
    });
  }

  window.DC = { db: db, esc: esc, ago: ago, LANGS: LANGS, META: META, BLOCKS: BLOCKS, extOf: extOf, modeFor: modeFor, visibleFiles: visibleFiles, getFile: getFile, setFile: setFile, getMeta: getMeta, setMeta: setMeta,
    normalise: normalise, getUser: getUser, user: function () { return user; }, profile: function () { return profile; }, ownerNames: ownerNames, listPublic: listPublic, listMine: listMine, getProject: getProject, saveProject: saveProject, deleteProject: deleteProject, fork: fork,
    localSave: localSave, localGet: localGet, localList: localList, localDelete: localDelete, newProject: newProject, buildDoc: buildDoc, run: run, publishGame: publishGame, unpublishGame: unpublishGame, download: download, loadScript: loadScript };
})();
