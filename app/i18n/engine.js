/* DougHub translation engine.
   A game page loads a language pack (window.DH_PACK) and this file. The engine swaps English text for the chosen language:
   page text, titles / labels, text drawn on a canvas, and alert / confirm boxes. Text with no translation stays in English. */
(function () {
  "use strict";
  var P = window.DH_PACK; if (!P) return;
  var exact = P.exact || {}, ci = {}, rx = [], sub = (P.sub || []).slice().sort(function (a, b) { return b[0].length - a[0].length; });
  Object.keys(exact).forEach(function (k) { ci[k.toLowerCase()] = exact[k]; });
  (P.re || []).forEach(function (r) { try { rx.push([new RegExp(r[0]), r[1]]); } catch (e) {} });
  function norm(s) { return s.replace(/\s+/g, " ").trim(); }
  function tr(s) {
    if (typeof s !== "string" || s.length < 2) return null;
    var n = norm(s); if (n.length < 2) return null;
    var t = exact[n]; if (t === undefined) t = ci[n.toLowerCase()];
    if (t === undefined) { for (var i = 0; i < rx.length; i++) { if (rx[i][0].test(n)) { t = n.replace(rx[i][0], rx[i][1]); break; } } }
    if (t === undefined && sub.length) {            // phrases inside longer text, e.g. "Beat Week 2 to unlock"
      var out = n, hit = false;
      for (var j = 0; j < sub.length; j++) { if (out.indexOf(sub[j][0]) > -1) { out = out.split(sub[j][0]).join(sub[j][1]); hit = true; } }
      if (hit) t = out;
    }
    if (t === undefined) return null;
    return s.match(/^\s*/)[0] + t + s.match(/\s*$/)[0];
  }
  window.__dhTr = tr;
  try { document.documentElement.lang = P.lang || "en"; } catch (e) {}

  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1 }, seen = new WeakMap(), ATTR = ["title", "aria-label", "placeholder", "alt"];
  function doText(n) {
    var cur = n.nodeValue, rec = seen.get(n); if (rec && cur === rec) return;
    var t = tr(cur); if (t !== null && t !== cur) { seen.set(n, t); n.nodeValue = t; }
  }
  function attrs(el) {
    if (el.nodeType !== 1) return;
    for (var i = 0; i < ATTR.length; i++) {
      var a = ATTR[i], v = el.getAttribute(a); if (!v) continue;
      var rec = el.__dhA && el.__dhA[a]; if (rec === v) continue;
      var t = tr(v); if (t !== null && t !== v) { (el.__dhA = el.__dhA || {})[a] = t; el.setAttribute(a, t); }
    }
  }
  function walk(root) {
    if (root.nodeType === 3) { var p = root.parentNode; if (!(p && SKIP[p.nodeName])) doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (SKIP[root.nodeName]) return; attrs(root); }
    for (var c = root.firstChild; c; c = c.nextSibling) walk(c);
  }
  var mo = new MutationObserver(function (ms) {
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (m.type === "characterData") walk(m.target);
      else if (m.type === "childList") { for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]); }
      else if (m.type === "attributes") attrs(m.target);
    }
  });
  function start() { walk(document.documentElement); mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTR }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();

  /* text drawn on a canvas */
  var C = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (C) {
    ["fillText", "strokeText"].forEach(function (f) {
      var o = C[f]; if (!o) return;
      C[f] = function (t) { var a = arguments; if (typeof t === "string") { var x = tr(t); if (x !== null) { a = Array.prototype.slice.call(arguments); a[0] = x; } } return o.apply(this, a); };
    });
    var om = C.measureText;
    if (om) C.measureText = function (t) { if (typeof t === "string") { var x = tr(t); if (x !== null) t = x; } return om.call(this, t); };
  }
  /* pop-up boxes */
  ["alert", "confirm"].forEach(function (f) { var o = window[f]; if (!o) return; window[f] = function (m) { var x = tr(String(m)); return o.call(window, x === null ? m : x); }; });
})();
