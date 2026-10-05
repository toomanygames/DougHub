/* DougHub Supabase Auth Guard */
(function () {
  const SUPABASE_URL = "https://agsqdqcsmsppcdqxlppj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52";

  const script = document.currentScript;
  const requireAuth = script?.dataset.requireAuth === "true";
  const requireAdmin = script?.dataset.requireAdmin === "true";

  if (!requireAuth && !requireAdmin) return;

  document.documentElement.style.visibility = "hidden";

  function safeNext() {
    return window.location.pathname + window.location.search + window.location.hash;
  }

  function goLogin() {
    const next = encodeURIComponent(safeNext());
    window.location.replace("../log-in.html?next=" + next);
  }

  function goHome() {
    window.location.replace("../index.html");
  }

  async function loadSupabase() {
    if (window.supabase) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function protect() {
    try {
      await loadSupabase();

      const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data, error } = await client.auth.getUser();

      if (error || !data?.user) {
        goLogin();
        return;
      }

      if (requireAdmin) {
        const { data: profile, error: profileError } = await client
          .from("profiles")
          .select("is_admin")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profileError || !profile?.is_admin) {
          goHome();
          return;
        }
      }

      document.documentElement.style.visibility = "";
      window.DougHubAuth = {
        supabase: client,
        user: data.user,
        isAdmin: requireAdmin
      };
    } catch (error) {
      console.error("DougHub auth guard failed:", error);
      goLogin();
    }
  }

  protect();
})();