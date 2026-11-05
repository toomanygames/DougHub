/* DougHub shared dictionary for word games.
   Load it with <script src="dictionary.js"></script>, then:
     const dict = await DHDictionary.load();
     dict.has("crane")            // is it a real word? (ENABLE public-domain word list, about 172,000 words)
     dict.pick(6, 8)              // a random common word with 6 to 8 letters
     dict.common                  // everyday words that are also in the dictionary (used for puzzle answers)
     await dict.define("crane")   // a short definition, or null when unavailable
   Guesses are checked against the full dictionary. Answers come from everyday words so puzzles stay fair. */
(function () {
  "use strict";
  if (window.DHDictionary) return;
  var FULL = [
    "https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt",
    "https://cdn.jsdelivr.net/gh/dolph/dictionary@master/enable1.txt"
  ];
  var COMMON = [
    "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt",
    "https://cdn.jsdelivr.net/gh/first20hours/google-10000-english@master/google-10000-english-no-swears.txt"
  ];

  function fetchFirst(urls, minLength) {
    var chain = Promise.resolve("");
    urls.forEach(function (url) {
      chain = chain.then(function (found) {
        if (found) return found;
        return fetch(url, { cache: "force-cache" })
          .then(function (r) { if (!r.ok) throw new Error("download failed"); return r.text(); })
          .then(function (t) { return t.length >= minLength ? t : ""; })
          .catch(function () { return ""; });
      });
    });
    return chain;
  }

  var promise = null;
  function load() {
    if (promise) return promise;
    promise = Promise.all([fetchFirst(FULL, 100000), fetchFirst(COMMON, 20000)]).then(function (texts) {
      var all = texts[0].toLowerCase().split(/\s+/).filter(function (w) { return /^[a-z]+$/.test(w); });
      var set = new Set(all);
      var common = texts[1].toLowerCase().split(/\s+/).filter(function (w) { return /^[a-z]+$/.test(w) && set.has(w); });
      var dict = {
        ok: set.size > 0, raw: texts[0], all: all, set: set, common: common,
        has: function (w) { return set.has(String(w || "").toLowerCase()); },
        pick: function (min, max, rng) {
          var inRange = function (w) { return w.length >= min && w.length <= max; };
          var pool = common.filter(inRange);
          if (pool.length < 50) pool = all.filter(inRange);
          return pool.length ? pool[Math.floor((rng || Math.random)() * pool.length)] : null;
        },
        define: function (w) {
          return new Promise(function (resolve) {
            var done = false, timer = setTimeout(function () { if (!done) { done = true; resolve(null); } }, 3500);
            fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(String(w).toLowerCase()))
              .then(function (r) { return r.ok ? r.json() : null; })
              .then(function (data) {
                var text = null;
                try { text = data[0].meanings[0].definitions[0].definition; } catch (_) {}
                if (text) text = String(text).replace(new RegExp(String(w), "ig"), "_____").slice(0, 160);
                if (!done) { done = true; clearTimeout(timer); resolve(text || null); }
              })
              .catch(function () { if (!done) { done = true; clearTimeout(timer); resolve(null); } });
          });
        }
      };
      if (!dict.ok) promise = null; // allow a retry later if the download failed
      return dict;
    });
    return promise;
  }
  window.DHDictionary = { load: load };
})();
