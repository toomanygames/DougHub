/* DougHub search autofill guard.
   Keeps browser/password-manager username suggestions away from search fields. */
(() => {
  "use strict";

  const SEARCH_HINT = /(^|[-_\s])(search|filter|find|query)([-_\s]|$)|search|filter|find/i;
  const AUTOFILL_NAME = "dh-search-field";

  function looksLikeSearch(input) {
    if (!(input instanceof HTMLInputElement)) return false;
    if (["password", "email", "checkbox", "radio", "submit", "button", "hidden", "file"].includes(input.type)) return false;
    if (input.type === "search") return true;

    const clues = [
      input.name,
      input.id,
      input.placeholder,
      input.getAttribute("aria-label"),
      input.getAttribute("data-search"),
      input.closest("form")?.getAttribute("role"),
      input.closest("form")?.getAttribute("aria-label"),
      input.closest("form")?.getAttribute("class")
    ].filter(Boolean).join(" ");

    return SEARCH_HINT.test(clues) ||
      input.hasAttribute("data-search-input") ||
      input.closest('[role="search"], form[role="search"]') !== null;
  }

  function protect(input) {
    if (!looksLikeSearch(input)) return;

    // Chromium browsers sometimes ignore autocomplete="off" and still offer saved usernames.
    // "new-password" is a stronger autofill hint for non-credential search fields.
    input.setAttribute("autocomplete", "new-password");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("data-lpignore", "true");
    input.setAttribute("data-1p-ignore", "true");
    input.setAttribute("data-bwignore", "true");
    input.setAttribute("aria-autocomplete", "none");

    // Password managers often use name/id heuristics even when autocomplete is off.
    // Give search fields a neutral name rather than anything resembling a username.
    if (input.name !== AUTOFILL_NAME) {
      input.name = AUTOFILL_NAME;
    }
    if (/user(name)?|login|account|email|credential/i.test(input.id)) {
      input.id = input.id.replace(/username|user(name)?|login|account|email|credential/ig, "site-search");
    }
  }

  function scan(root) {
    if (root instanceof HTMLInputElement) protect(root);
    if (root && typeof root.querySelectorAll === "function") {
      root.querySelectorAll("input").forEach(protect);
    }
  }

  function init() {
    scan(document);
    document.querySelectorAll("form").forEach(form => {
      if (form.querySelector('input[type="search"], input[data-search-input], [role="search"] input')) {
        form.setAttribute("autocomplete", "off");
      }
    });

    const observer = new MutationObserver(records => {
      for (const record of records) {
        record.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) scan(node);
        });
        if (record.type === "attributes" && record.target instanceof HTMLInputElement) protect(record.target);
      }
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["type", "name", "id", "placeholder", "aria-label", "data-search"]
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();