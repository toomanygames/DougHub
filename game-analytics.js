/* DougHub cross-game analytics. Loaded by each built-in game page. */
(() => {
  const tag = document.currentScript;
  if (!tag) return;
  const gameKey = tag.dataset.gameKey;
  const gameTitle = tag.dataset.gameTitle || "DougHub Game";
  if (!gameKey) return;

  const SUPABASE_URL = "https://agsqdqcsmsppcdqxlppj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52";
  const pageStartedAt = Date.now();
  let lastRecordedAt = pageStartedAt;
  let client = null;
  let userId = null;
  let sdkPromise = null;
  let flushing = false;
  let ready = false;

  function loadSdk() {
    if (window.supabase?.createClient) return Promise.resolve();
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      const sdk = document.createElement("script");
      sdk.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      sdk.onload = resolve;
      sdk.onerror = reject;
      document.head.appendChild(sdk);
    });
    return sdkPromise;
  }

  async function insertEvent(eventType, durationSeconds = 0) {
    if (!client) return;
    const payload = {
      game_key: gameKey,
      game_type: "builtin",
      game_title: gameTitle.slice(0, 120),
      event_type: eventType,
      duration_seconds: Math.max(0, Math.min(86400, Math.floor(durationSeconds || 0))),
      user_id: userId
    };
    const { error } = await client.from("game_trending_events").insert(payload);
    if (error) console.warn("[DougHub analytics]", error.message);
  }

  async function flushDuration() {
    if (!ready || flushing) return;
    const now = Date.now();
    const isHidden = document.visibilityState === "hidden";
    const delta = Math.max(0, Math.floor((now - lastRecordedAt) / 1000));
    lastRecordedAt = now;
    if (delta < 1 || isHidden && delta > 86400) return;
    flushing = true;
    try {
      let remaining = Math.min(delta, 86400);
      while (remaining > 0) {
        const chunk = Math.min(60, remaining);
        await insertEvent("duration", chunk);
        remaining -= chunk;
      }
    } catch (error) {
      console.warn("[DougHub analytics] Could not save playtime.", error);
    } finally {
      flushing = false;
    }
  }

  async function start() {
    try {
      await loadSdk();
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data } = await client.auth.getSession();
      userId = data?.session?.user?.id || null;
      await insertEvent("play", 0);
      ready = true;
      lastRecordedAt = Date.now();
    } catch (error) {
      console.warn("[DougHub analytics] Could not initialize.", error);
      return;
    }

    setInterval(() => {
      if (document.visibilityState !== "hidden") flushDuration();
      else lastRecordedAt = Date.now();
    }, 15000);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushDuration();
      else lastRecordedAt = Date.now();
    });
    window.addEventListener("pagehide", flushDuration);
  }

  start();
})();
