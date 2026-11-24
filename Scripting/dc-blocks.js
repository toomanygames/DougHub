/* DougCode blocks: one block workspace that writes JavaScript, Python or Lua.
   Every block in the toolbox has a generator for the project's language. Blocks that only make sense in a browser
   (page, game and sound blocks) are shown for Web and JavaScript projects only. */
(function () {
  "use strict";
  var B = window.Blockly;
  if (!B) return;
  var GEN = { web: B.JavaScript, javascript: B.JavaScript, python: B.Python, lua: B.Lua };

  /* ---------- custom blocks ---------- */
  function stmt(type, msg, args, colour, tip) { return { type: type, message0: msg, args0: args || [], previousStatement: null, nextStatement: null, colour: colour, tooltip: tip || "" }; }
  function val(type, msg, args, out, colour, tip) { return { type: type, message0: msg, args0: args || [], output: out, colour: colour, tooltip: tip || "" }; }
  function box(type, msg, args, colour, tip) { return { type: type, message0: msg, args0: args || [], message1: "%1", args1: [{ type: "input_statement", name: "DO" }], previousStatement: null, nextStatement: null, colour: colour, tooltip: tip || "" }; }
  var V = function (n, check) { return { type: "input_value", name: n, check: check }; };
  var F = function (n, d) { return { type: "field_input", name: n, text: d }; };
  var D = function (n, opts) { return { type: "field_dropdown", name: n, options: opts }; };
  var COLOURS = [["red", "#ef4444"], ["orange", "#f97316"], ["yellow", "#facc15"], ["green", "#22c55e"], ["cyan", "#67e8f9"], ["blue", "#3b82f6"], ["purple", "#a855f7"], ["pink", "#f472b6"], ["white", "#ffffff"], ["black", "#000000"], ["gray", "#9ca3af"], ["dark blue", "#0b0e20"]];
  var KEYS = [["left arrow", "ArrowLeft"], ["right arrow", "ArrowRight"], ["up arrow", "ArrowUp"], ["down arrow", "ArrowDown"], ["space", " "], ["Enter", "Enter"], ["A", "a"], ["D", "d"], ["W", "w"], ["S", "s"]];
  B.defineBlocksWithJsonArray([
    stmt("dh_print", "print %1", [V("TEXT")], 160, "Show a message in the test panel."),
    stmt("dh_comment", "note: %1", [F("TEXT", "what this does")], 160, "A note for people reading the code."),
    val("dh_to_number", "to number %1", [V("X")], "Number", 160, "Turn text into a number."),
    val("dh_to_text", "to text %1", [V("X")], "String", 160, "Turn anything into text."),
    val("dh_now_ms", "milliseconds now", [], "Number", 160, "The current time in milliseconds."),
    val("dh_distance", "distance from x %1 y %2 to x %3 y %4", [V("X1", "Number"), V("Y1", "Number"), V("X2", "Number"), V("Y2", "Number")], "Number", 230, "How far apart two points are."),
    val("dh_pick_random", "random item from %1", [V("LIST", "Array")], null, 260, "Pick one item from a list."),
    /* page blocks (Web and JavaScript) */
    box("dh_on_click", "when %1 is clicked", [F("SEL", "#hello")], 200, "Run blocks when something on the page is clicked. Use a selector like #id."),
    stmt("dh_set_text", "set text of %1 to %2", [F("SEL", "#message"), V("TEXT")], 200),
    val("dh_get_value", "value of %1", [F("SEL", "#name")], "String", 200, "What is typed into an input."),
    stmt("dh_set_style", "set %1 style %2 to %3", [F("SEL", "#message"), F("PROP", "color"), V("VAL")], 200),
    stmt("dh_class", "%1 class %2 on %3", [D("OP", [["add", "add"], ["remove", "remove"], ["toggle", "toggle"]]), F("CLS", "active"), F("SEL", "#message")], 200),
    stmt("dh_show", "%1 %2", [D("OP", [["show", "show"], ["hide", "hide"]]), F("SEL", "#message")], 200),
    stmt("dh_append", "add line %1 to %2", [V("TEXT"), F("SEL", "body")], 200, "Add a new paragraph to the page."),
    /* game blocks (Web and JavaScript) */
    stmt("dh_canvas", "make canvas width %1 height %2", [V("W", "Number"), V("H", "Number")], 290, "Makes the drawing area."),
    stmt("dh_clear", "clear canvas with colour %1", [V("COLOUR")], 290),
    stmt("dh_rect", "draw rectangle x %1 y %2 width %3 height %4 colour %5", [V("X", "Number"), V("Y", "Number"), V("W", "Number"), V("H", "Number"), V("COLOUR")], 290),
    stmt("dh_circle", "draw circle x %1 y %2 radius %3 colour %4", [V("X", "Number"), V("Y", "Number"), V("R", "Number"), V("COLOUR")], 290),
    stmt("dh_text", "draw text %1 at x %2 y %3 size %4 colour %5", [V("TEXT"), V("X", "Number"), V("Y", "Number"), V("SIZE", "Number"), V("COLOUR")], 290),
    box("dh_on_key", "when key %1 is pressed", [D("KEY", KEYS)], 290, "Run blocks once each time the key goes down."),
    val("dh_key_held", "key %1 is held down", [D("KEY", KEYS)], "Boolean", 290, "True while the key is being held."),
    box("dh_frame", "every frame (about 60 times a second)", [], 290, "The game loop."),
    box("dh_every", "every %1 ms", [V("MS", "Number")], 290),
    box("dh_after", "after %1 ms", [V("MS", "Number")], 290),
    stmt("dh_beep", "play beep pitch %1 for %2 ms", [V("HZ", "Number"), V("MS", "Number")], 290),
    val("dh_random_colour", "random colour", [], "Colour", 290),
    { type: "dh_colour", message0: "%1", args0: [D("C", COLOURS)], output: "Colour", colour: 290, tooltip: "Pick a colour." },
    val("dh_rgb", "colour red %1 green %2 blue %3", [V("R", "Number"), V("G", "Number"), V("B", "Number")], "Colour", 290, "Mix a colour. Each number goes from 0 to 255.")
  ]);

  /* ---------- generators ---------- */
  function setup(lang, g) {
    if (!g) return;
    var A = g.ORDER_ATOMIC, N = g.ORDER_NONE;
    var v = function (b, n) { return g.valueToCode(b, n, N) || "0"; };
    var vt = function (b, n) { return g.valueToCode(b, n, N) || "''"; };
    var s = function (b, n) { return g.statementToCode(b, n) || ""; };
    var q = function (x) { return JSON.stringify(String(x)); };
    var f = g.forBlock;
    var py = lang === "python", lua = lang === "lua";
    var comment = py ? "# " : lua ? "-- " : "// ";
    f.dh_print = function (b) { return (py || lua ? "print(" : "console.log(") + vt(b, "TEXT") + ")\n".replace(")\n", py || lua ? ")\n" : ");\n"); };
    f.dh_comment = function (b) { return comment + String(b.getFieldValue("TEXT")).replace(/[\r\n]+/g, " ") + "\n"; };
    f.dh_to_number = function (b) { return [(py ? "float(" : lua ? "tonumber(" : "Number(") + vt(b, "X") + ")", A]; };
    f.dh_to_text = function (b) { return [(py ? "str(" : lua ? "tostring(" : "String(") + vt(b, "X") + ")", A]; };
    f.dh_now_ms = function () {
      if (py) { g.definitions_.import_time = "import time"; return ["int(time.time() * 1000)", A]; }
      return [lua ? "(os.time() * 1000)" : "Date.now()", A];
    };
    f.dh_distance = function (b) {
      var dx = "(" + v(b, "X2") + " - " + v(b, "X1") + ")", dy = "(" + v(b, "Y2") + " - " + v(b, "Y1") + ")";
      if (py) { g.definitions_.import_math = "import math"; return ["math.hypot(" + dx + ", " + dy + ")", A]; }
      return [lua ? "math.sqrt(" + dx + " ^ 2 + " + dy + " ^ 2)" : "Math.hypot(" + dx + ", " + dy + ")", A];
    };
    f.dh_pick_random = function (b) {
      var l = g.valueToCode(b, "LIST", N) || (py ? "[]" : lua ? "{}" : "[]");
      if (py) { g.definitions_.import_random = "import random"; return ["random.choice(" + l + ")", A]; }
      if (lua) return ["(function(t) return t[math.random(#t)] end)(" + l + ")", A];
      return ["(function(l){return l[Math.floor(Math.random()*l.length)]})(" + l + ")", A];
    };
    if (py || lua) return;   /* the rest only exist for the browser */
    var sel = function (b) { return q(b.getFieldValue("SEL")); };
    var ctx = function () { g.definitions_.dh_ctx = 'function dh_ctx(){var c=document.getElementById("game");if(!c){c=document.createElement("canvas");c.id="game";c.width=480;c.height=320;document.body.appendChild(c);}return c.getContext("2d");}'; return "dh_ctx()"; };
    f.dh_on_click = function (b) { return "document.querySelector(" + sel(b) + ")?.addEventListener('click', function () {\n" + s(b, "DO") + "});\n"; };
    f.dh_set_text = function (b) { return "{ const e = document.querySelector(" + sel(b) + "); if (e) e.textContent = " + vt(b, "TEXT") + "; }\n"; };
    f.dh_get_value = function (b) { return ["(document.querySelector(" + sel(b) + ")?.value ?? '')", A]; };
    f.dh_set_style = function (b) { return "{ const e = document.querySelector(" + sel(b) + "); if (e) e.style[" + q(b.getFieldValue("PROP")) + "] = " + vt(b, "VAL") + "; }\n"; };
    f.dh_class = function (b) { return "document.querySelector(" + sel(b) + ")?.classList." + b.getFieldValue("OP") + "(" + q(b.getFieldValue("CLS")) + ");\n"; };
    f.dh_show = function (b) { return "{ const e = document.querySelector(" + sel(b) + "); if (e) e.style.display = " + (b.getFieldValue("OP") === "hide" ? "'none'" : "''") + "; }\n"; };
    f.dh_append = function (b) { return "{ const p = document.createElement('p'); p.textContent = " + vt(b, "TEXT") + "; (document.querySelector(" + sel(b) + ") || document.body).appendChild(p); }\n"; };
    f.dh_canvas = function (b) { return "{ let c = document.getElementById('game'); if (!c) { c = document.createElement('canvas'); c.id = 'game'; document.body.appendChild(c); } c.width = " + v(b, "W") + "; c.height = " + v(b, "H") + "; }\n"; };
    f.dh_clear = function (b) { var c = ctx(); return c + ".fillStyle = " + vt(b, "COLOUR") + "; " + c + ".fillRect(0, 0, " + c + ".canvas.width, " + c + ".canvas.height);\n"; };
    f.dh_rect = function (b) { var c = ctx(); return "{ const c = " + c + "; c.fillStyle = " + vt(b, "COLOUR") + "; c.fillRect(" + v(b, "X") + ", " + v(b, "Y") + ", " + v(b, "W") + ", " + v(b, "H") + "); }\n"; };
    f.dh_circle = function (b) { var c = ctx(); return "{ const c = " + c + "; c.fillStyle = " + vt(b, "COLOUR") + "; c.beginPath(); c.arc(" + v(b, "X") + ", " + v(b, "Y") + ", " + v(b, "R") + ", 0, Math.PI * 2); c.fill(); }\n"; };
    f.dh_text = function (b) { var c = ctx(); return "{ const c = " + c + "; c.fillStyle = " + vt(b, "COLOUR") + "; c.font = (" + v(b, "SIZE") + ") + 'px sans-serif'; c.fillText(" + vt(b, "TEXT") + ", " + v(b, "X") + ", " + v(b, "Y") + "); }\n"; };
    var keys = function () { g.definitions_.dh_keys = "var dh_keys = {}; addEventListener('keydown', function (e) { dh_keys[e.key] = true; }); addEventListener('keyup', function (e) { dh_keys[e.key] = false; });"; };
    f.dh_on_key = function (b) { return "addEventListener('keydown', function (e) { if (e.key === " + q(b.getFieldValue("KEY")) + ") {\n" + s(b, "DO") + "} });\n"; };
    f.dh_key_held = function (b) { keys(); return ["(dh_keys[" + q(b.getFieldValue("KEY")) + "] === true)", A]; };
    f.dh_frame = function (b) { return "(function dh_loop() {\n" + s(b, "DO") + "  requestAnimationFrame(dh_loop);\n})();\n"; };
    f.dh_every = function (b) { return "setInterval(function () {\n" + s(b, "DO") + "}, " + v(b, "MS") + ");\n"; };
    f.dh_after = function (b) { return "setTimeout(function () {\n" + s(b, "DO") + "}, " + v(b, "MS") + ");\n"; };
    f.dh_beep = function (b) {
      g.definitions_.dh_beep = "function dh_beep(hz, ms) { try { var a = new (window.AudioContext || window.webkitAudioContext)(); var o = a.createOscillator(), g = a.createGain(); o.frequency.value = hz; g.gain.value = 0.15; o.connect(g); g.connect(a.destination); o.start(); setTimeout(function () { o.stop(); a.close(); }, ms); } catch (e) {} }";
      return "dh_beep(" + v(b, "HZ") + ", " + v(b, "MS") + ");\n";
    };
    f.dh_colour = function (b) { return [q(b.getFieldValue("C")), A]; };
    f.dh_rgb = function (b) { return ["('rgb(' + (" + v(b, "R") + ") + ',' + (" + v(b, "G") + ") + ',' + (" + v(b, "B") + ") + ')')", A]; };
    f.dh_random_colour = function () { return ["('hsl(' + Math.floor(Math.random() * 360) + ', 80%, 60%)')", A]; };
  }
  setup("javascript", B.JavaScript); setup("python", B.Python); setup("lua", B.Lua);

  /* ---------- toolbox ---------- */
  function blk(type, extra) { var o = { kind: "block", type: type }; if (extra) for (var k in extra) o[k] = extra[k]; return o; }
  function num(n) { return { kind: "block", type: "math_number", fields: { NUM: n } }; }
  function txt(t) { return { kind: "block", type: "text", fields: { TEXT: t } }; }
  function withShadow(type, inputs) { var o = { kind: "block", type: type, inputs: {} }; for (var k in inputs) o.inputs[k] = { shadow: inputs[k] }; return o; }
  function cat(name, colour, contents) { return { kind: "category", name: name, colour: colour, contents: contents }; }
  function sh(t) { return { type: "text", fields: { TEXT: t } }; }
  function sn(n) { return { type: "math_number", fields: { NUM: n } }; }
  function sc(c) { return { type: "dh_colour", fields: { C: c } }; }
  function toolbox(lang) {
    var browser = lang === "web" || lang === "javascript";
    var cats = [
      cat("Say", "#4cae8a", [withShadow("dh_print", { TEXT: sh("Hello!") }), blk("dh_comment"), withShadow("dh_to_number", { X: sh("5") }), withShadow("dh_to_text", { X: sn(5) }), blk("dh_now_ms")]),
      cat("Logic", "#5b80a5", [blk("controls_if"), blk("controls_if", { extraState: { hasElse: true } }), blk("logic_compare"), blk("logic_operation"), blk("logic_negate"), blk("logic_boolean"), blk("logic_null"), blk("logic_ternary")]),
      cat("Loops", "#5ba55b", [withShadow("controls_repeat_ext", { TIMES: sn(10) }), blk("controls_whileUntil"), withShadow("controls_for", { FROM: sn(1), TO: sn(10), BY: sn(1) }), blk("controls_forEach"), blk("controls_flow_statements")]),
      cat("Math", "#5b67a5", [blk("math_number"), blk("math_arithmetic"), blk("math_single"), blk("math_trig"), blk("math_constant"), blk("math_number_property"), blk("math_round"), blk("math_on_list"), blk("math_modulo"), withShadow("math_constrain", { LOW: sn(1), HIGH: sn(100) }), withShadow("math_random_int", { FROM: sn(1), TO: sn(100) }), blk("math_random_float"), blk("dh_distance")]),
      cat("Text", "#5ba58c", [blk("text"), blk("text_join"), blk("text_append"), blk("text_length"), blk("text_isEmpty"), blk("text_indexOf"), blk("text_charAt"), blk("text_getSubstring"), blk("text_changeCase"), blk("text_trim"), blk("text_count"), blk("text_replace"), blk("text_reverse")]),
      cat("Lists", "#745ba5", [blk("lists_create_with"), blk("lists_repeat"), blk("lists_length"), blk("lists_isEmpty"), blk("lists_indexOf"), blk("lists_getIndex"), blk("lists_setIndex"), blk("lists_getSublist"), blk("lists_sort"), blk("lists_split"), blk("lists_reverse"), blk("dh_pick_random")]),
      { kind: "category", name: "Variables", colour: "#a55b80", custom: "VARIABLE" },
      { kind: "category", name: "Functions", colour: "#995ba5", custom: "PROCEDURE" }
    ];
    if (browser) {
      cats.push(cat("Page", "#4c97ff", [
        withShadow("dh_on_click", {}), withShadow("dh_set_text", { TEXT: sh("It works!") }), blk("dh_get_value"), withShadow("dh_set_style", { VAL: sh("tomato") }), blk("dh_class"), blk("dh_show"), withShadow("dh_append", { TEXT: sh("A new line") })
      ]));
      cats.push(cat("Game", "#a35bd8", [
        withShadow("dh_canvas", { W: sn(480), H: sn(320) }), withShadow("dh_clear", { COLOUR: sc("#0b0e20") }),
        withShadow("dh_rect", { X: sn(20), Y: sn(20), W: sn(60), H: sn(40), COLOUR: sc("#67e8f9") }),
        withShadow("dh_circle", { X: sn(100), Y: sn(100), R: sn(20), COLOUR: sc("#facc15") }),
        withShadow("dh_text", { TEXT: sh("Score"), X: sn(10), Y: sn(24), SIZE: sn(18), COLOUR: sc("#ffffff") }),
        blk("dh_frame"), withShadow("dh_every", { MS: sn(1000) }), withShadow("dh_after", { MS: sn(500) }),
        blk("dh_on_key"), blk("dh_key_held"), withShadow("dh_beep", { HZ: sn(440), MS: sn(150) }), blk("dh_random_colour"), blk("dh_colour"), withShadow("dh_rgb", { R: sn(255), G: sn(120), B: sn(60) })
      ]));
    }
    return { kind: "categoryToolbox", contents: cats };
  }

  /* ---------- workspace ---------- */
  var theme = B.Theme.defineTheme("dougcode", { base: B.Themes.Classic, name: "dougcode", componentStyles: { workspaceBackgroundColour: "#0b0e20", toolboxBackgroundColour: "#141935", toolboxForegroundColour: "#e6e9ff", flyoutBackgroundColour: "#1a2048", flyoutForegroundColour: "#ccd", flyoutOpacity: 1, scrollbarColour: "#3a4290", insertionMarkerColour: "#fff", insertionMarkerOpacity: 0.3, cursorColour: "#d0d0d0" } });
  function init(div, lang, onChange) {
    var ws = B.inject(div, { toolbox: toolbox(lang), theme: theme, renderer: "zelos", grid: { spacing: 28, length: 2, colour: "#1a2048", snap: true }, zoom: { controls: true, wheel: true, startScale: 0.9, minScale: 0.4, maxScale: 1.6 }, move: { scrollbars: true, drag: true, wheel: false }, trashcan: true, sounds: false });
    ws.addChangeListener(function (e) { if (e.isUiEvent) return; if (onChange) onChange(); });
    return ws;
  }
  function generate(ws, lang) {
    var g = GEN[lang]; if (!g) return "";
    g.init && g.init(ws);
    var code = g.workspaceToCode(ws);
    return code.replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }
  function save(ws) { return JSON.stringify(B.serialization.workspaces.save(ws)); }
  function load(ws, text) { try { B.serialization.workspaces.load(JSON.parse(text), ws); return true; } catch (e) { return false; } }

  /* Checks every block of the toolbox against a language; returns the ones that fail. */
  function selfTest(lang) {
    var g = GEN[lang], bad = [], seen = {};
    var ws = new B.Workspace();
    g.init(ws);
    function walk(items) { (items || []).forEach(function (it) { if (it.kind === "category") { walk(it.contents); return; } if (it.kind !== "block" || seen[it.type + JSON.stringify(it.extraState || "")]) return; seen[it.type + JSON.stringify(it.extraState || "")] = 1;
      try { var b = ws.newBlock(it.type); if (it.extraState && b.loadExtraState) b.loadExtraState(it.extraState); b.initSvg && 0; var code = b.outputConnection ? g.blockToCode(b) : g.blockToCode(b); var c = Array.isArray(code) ? code[0] : code; if (typeof c !== "string") bad.push(it.type + ": no code"); } catch (e) { bad.push(it.type + ": " + e.message); } }); }
    walk(toolbox(lang).contents);
    ws.dispose();
    return bad;
  }
  window.DCB = { init: init, generate: generate, save: save, load: load, toolbox: toolbox, selfTest: selfTest };
})();
