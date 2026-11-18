/* DougHub app service worker.
   - Saves every file so the app works without internet.
   - When a new version is published, this file changes; the browser installs it in the background and only
     downloads the files that actually changed. The app then offers (or just applies) the update. */
const VERSION = "2026.11.17.5";
const FILES = [["app.css", "74ed241ad6f9"], ["app.js", "790e167bafa3"], ["art/bubble-grove.svg", "e0abf9a3b9fc"], ["art/bundt-bakery.svg", "1f8ad75ab1b4"], ["art/farm-idle.svg", "fac7e11d7e87"], ["art/fighting-fantasy.svg", "9a29d374a22f"], ["art/fix-it-crew.svg", "745c1e194e5d"], ["art/goose-gig.svg", "70710cd3fbad"], ["art/honk-empire.svg", "d1c7fa75eb36"], ["art/off-brand-beat-battle.svg", "3ef1dd50494c"], ["art/quiet-woods.svg", "a6b4ddd02279"], ["art/sparkroot.svg", "43b054504a5b"], ["games/bubble-grove.html", "42cf9134b60f"], ["games/bundt-bakery.html", "159d1f344885"], ["games/farm-idle.html", "7b6995faa51c"], ["games/fighting-fantasy.html", "9b3fbd37976a"], ["games/fix-it-crew.html", "1ee72f6ee936"], ["games/goose-gig.html", "40e9112b040d"], ["games/honk-empire.html", "f10654e1a038"], ["games/off-brand-beat-battle.html", "65483f55a7fe"], ["games/quiet-woods.html", "658e9a1d60b2"], ["games/sparkroot.html", "f6c412f8639b"], ["i18n.js", "ae2774134f2d"], ["i18n/coverage.json", "c14f8eecc252"], ["i18n/engine.js", "6f35fc92c7b6"], ["i18n/packs/bubble-grove.de.js", "4c034c7a092d"], ["i18n/packs/bubble-grove.es.js", "3b924bd153bf"], ["i18n/packs/bubble-grove.fr.js", "c3e51636f6ee"], ["i18n/packs/bubble-grove.it.js", "3e05738d251f"], ["i18n/packs/bubble-grove.ja.js", "8e6090d7d541"], ["i18n/packs/bubble-grove.pt.js", "21d4fe9f01cd"], ["i18n/packs/bundt-bakery.de.js", "8d58043cf5ca"], ["i18n/packs/bundt-bakery.es.js", "8a1e96cf7c49"], ["i18n/packs/bundt-bakery.fr.js", "65ffa671d3ed"], ["i18n/packs/bundt-bakery.it.js", "73a4907bfa88"], ["i18n/packs/bundt-bakery.ja.js", "35c5bd6a953d"], ["i18n/packs/bundt-bakery.pt.js", "4d82c8126e9a"], ["i18n/packs/farm-idle.de.js", "70ddad0a42b3"], ["i18n/packs/farm-idle.es.js", "61bbcb3f8cf1"], ["i18n/packs/farm-idle.fr.js", "22015446066d"], ["i18n/packs/farm-idle.it.js", "78b139f240a2"], ["i18n/packs/farm-idle.ja.js", "b51936cf7e49"], ["i18n/packs/farm-idle.pt.js", "c0306446744c"], ["i18n/packs/fighting-fantasy.de.js", "55c2ac1fd276"], ["i18n/packs/fighting-fantasy.es.js", "5249abdbd4d6"], ["i18n/packs/fighting-fantasy.fr.js", "41277938e314"], ["i18n/packs/fighting-fantasy.it.js", "62fe31af3852"], ["i18n/packs/fighting-fantasy.ja.js", "b4e7e994bd3f"], ["i18n/packs/fighting-fantasy.pt.js", "c4f488c23d4e"], ["i18n/packs/fix-it-crew.de.js", "55c2ac1fd276"], ["i18n/packs/fix-it-crew.es.js", "5249abdbd4d6"], ["i18n/packs/fix-it-crew.fr.js", "41277938e314"], ["i18n/packs/fix-it-crew.it.js", "62fe31af3852"], ["i18n/packs/fix-it-crew.ja.js", "b4e7e994bd3f"], ["i18n/packs/fix-it-crew.pt.js", "c4f488c23d4e"], ["i18n/packs/goose-gig.de.js", "55c2ac1fd276"], ["i18n/packs/goose-gig.es.js", "5249abdbd4d6"], ["i18n/packs/goose-gig.fr.js", "41277938e314"], ["i18n/packs/goose-gig.it.js", "62fe31af3852"], ["i18n/packs/goose-gig.ja.js", "b4e7e994bd3f"], ["i18n/packs/goose-gig.pt.js", "c4f488c23d4e"], ["i18n/packs/honk-empire.de.js", "eb066a2ea464"], ["i18n/packs/honk-empire.es.js", "122c2eb39c31"], ["i18n/packs/honk-empire.fr.js", "944165fa99b0"], ["i18n/packs/honk-empire.it.js", "06160f5035c8"], ["i18n/packs/honk-empire.ja.js", "edcc8ee91501"], ["i18n/packs/honk-empire.pt.js", "548988fbff0b"], ["i18n/packs/off-brand-beat-battle.de.js", "8922540336cb"], ["i18n/packs/off-brand-beat-battle.es.js", "f9be6fc5e182"], ["i18n/packs/off-brand-beat-battle.fr.js", "b82ca67b38d8"], ["i18n/packs/off-brand-beat-battle.it.js", "8af365d41005"], ["i18n/packs/off-brand-beat-battle.ja.js", "867a2db9fdc0"], ["i18n/packs/off-brand-beat-battle.pt.js", "a653e48a9b25"], ["i18n/packs/quiet-woods.de.js", "55c2ac1fd276"], ["i18n/packs/quiet-woods.es.js", "5249abdbd4d6"], ["i18n/packs/quiet-woods.fr.js", "41277938e314"], ["i18n/packs/quiet-woods.it.js", "62fe31af3852"], ["i18n/packs/quiet-woods.ja.js", "b4e7e994bd3f"], ["i18n/packs/quiet-woods.pt.js", "c4f488c23d4e"], ["i18n/packs/sparkroot.de.js", "55c2ac1fd276"], ["i18n/packs/sparkroot.es.js", "5249abdbd4d6"], ["i18n/packs/sparkroot.fr.js", "41277938e314"], ["i18n/packs/sparkroot.it.js", "62fe31af3852"], ["i18n/packs/sparkroot.ja.js", "b4e7e994bd3f"], ["i18n/packs/sparkroot.pt.js", "c4f488c23d4e"], ["icons/icon-192.png", "23bc0751f328"], ["icons/icon-512.png", "6921ae938d06"], ["icons/maskable-512.png", "bebf293eaca1"], ["index.html", "b1d4e467c6f0"], ["manifest.webmanifest", "b17d10136e85"], ["social.js", "3f1c32a2963d"], ["sw.js", "deca4edb45b7"], ["version.json", "ad9827a98299"]];                       // [[path, hash], ...]
const CACHE = "dh-app-" + VERSION;
const HASHES = "__hashes.json";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const names = (await caches.keys()).filter((n) => n.startsWith("dh-app-") && n !== CACHE).sort();
    let prev = null, prevHashes = {};
    if (names.length) {
      prev = await caches.open(names[names.length - 1]);
      const hr = await prev.match(HASHES);
      if (hr) { try { prevHashes = await hr.json(); } catch (e) {} }
    }
    const cache = await caches.open(CACHE), hashes = {};
    await Promise.all(FILES.map(async ([url, hash]) => {
      hashes[url] = hash;
      if (prev && prevHashes[url] === hash) { const r = await prev.match(url); if (r) { await cache.put(url, r); return; } }
      const r = await fetch(url, { cache: "reload" });
      if (!r.ok) throw new Error("Could not download " + url);
      await cache.put(url, r);
    }));
    await cache.put(HASHES, new Response(JSON.stringify(hashes)));
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const n of await caches.keys()) if (n.startsWith("dh-app-") && n !== CACHE) await caches.delete(n);
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => { if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting(); });

self.addEventListener("fetch", (event) => {
  const req = event.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    let res = await cache.match(req, { ignoreSearch: true });
    if (res) return res;
    if (req.mode === "navigate") { res = await cache.match("index.html"); if (res) return res; }
    try { return await fetch(req); } catch (e) { return new Response("", { status: 504, statusText: "Offline" }); }
  })());
});
