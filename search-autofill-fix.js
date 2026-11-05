/* DougHub search autofill guard (the one shared guard for every page; nav.js loads it too).
   Stops browsers and password managers from treating a search box as a username/login field:
   no saved-login dropdown, no autofilled usernames, no "save this username" prompts.
   Never use autocomplete="new-password" on a search box: that makes browsers treat it as a password field.
   Opt out with data-no-guard. Element ids are never changed. */
(() => {
  "use strict";
  if (window.__dhSearchGuard) return; window.__dhSearchGuard = true;

  const WEAK = /search|filter|find|query/i;
  const STRONG = 'input[type="search"],input[role="searchbox"],input[data-search],input[data-search-input],input.search,input[class*="search" i],input[id*="search" i],input[placeholder^="Search" i],input[placeholder^="Find " i],input[placeholder^="Filter" i],input[placeholder*="\u{1F50D}"]';
  const BADNAME = /user|name|e-?mail|login|account|pass|credential/i;
  const SKIP_TYPES = ["password", "email", "number", "checkbox", "radio", "submit", "button", "hidden", "file", "range", "color", "date"];
  let counter = 0;

  function isStrong(input) { try { return input.matches(STRONG) || input.closest('[role="search"]') !== null; } catch (_) { return false; } }
  function isWeak(input) {
    const clues = [input.name, input.id, input.placeholder, input.getAttribute("aria-label"), input.getAttribute("data-search")].filter(Boolean).join(" ");
    return WEAK.test(clues);
  }

  function protect(input) {
    if (!(input instanceof HTMLInputElement) || input.__dhg || input.hasAttribute("data-no-guard")) return;
    if (SKIP_TYPES.includes(input.type)) return;
    const strong = isStrong(input);
    if (!strong && !isWeak(input)) return;
    input.__dhg = true;
    if (!input.hasAttribute("data-autofill-safe")) {
      input.setAttribute("autocomplete", "off");
      input.setAttribute("autocapitalize", "off");
      input.setAttribute("autocorrect", "off");
      input.setAttribute("spellcheck", "false");
      input.setAttribute("data-lpignore", "true");
      input.setAttribute("data-1p-ignore", "true");
      input.setAttribute("data-bwignore", "true");
      input.setAttribute("data-form-type", "other");
      input.removeAttribute("aria-autocomplete");
      const nm = input.getAttribute("name");
      if (!nm || BADNAME.test(nm) || nm === "dh-search-field") input.setAttribute("name", "dh_find_" + (++counter));
    }
    if (strong && input.type === "text" && !input.getAttribute("role")) input.setAttribute("role", "searchbox");
    if (strong && !input.getAttribute("aria-label") && !(input.labels && input.labels.length) && input.placeholder) {
      input.setAttribute("aria-label", input.placeholder.replace(/[^\w .,'-]/g, "").trim() || "Search");
    }
    /* Chrome can ignore autocomplete="off" on fields it thinks are logins. Keeping the box read-only until the person
       actually touches it stops the autofill popup from ever appearing. */
    if (strong && !input.readOnly && !input.disabled && document.activeElement !== input) {
      input.readOnly = true; input.__dhRo = true;
      const free = () => { if (input.__dhRo) { input.__dhRo = false; input.readOnly = false; } };
      ["focus", "pointerdown", "touchstart", "keydown"].forEach(ev => input.addEventListener(ev, free, { once: true, passive: true }));
    }
  }

  function scan(root) {
    if (root instanceof HTMLInputElement) protect(root);
    else if (root && typeof root.querySelectorAll === "function") root.querySelectorAll("input").forEach(protect);
  }

  function init() {
    scan(document);
    document.querySelectorAll("form").forEach(form => {
      if (form.querySelector('input[type="search"], input[data-search-input], [role="search"] input') && !form.querySelector('input[type="password"]')) form.setAttribute("autocomplete", "off");
    });
    new MutationObserver(records => {
      for (const record of records) {
        record.addedNodes.forEach(node => { if (node.nodeType === Node.ELEMENT_NODE) scan(node); });
        if (record.type === "attributes" && record.target instanceof HTMLInputElement) protect(record.target);
      }
    }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["type", "placeholder", "aria-label", "data-search"] });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
