(function () {
  "use strict";
  if (window.__dhChatAccessGuardStarted) return;
  window.__dhChatAccessGuardStarted = true;

  function showGate(title, message, canResend, db, user) {
    const gate = document.createElement("div");
    gate.id = "dhChatAccessGate";
    gate.style.cssText = "position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;padding:22px;background:#f4f6fa;color:#182230;font-family:Inter,system-ui,sans-serif";
    const card = document.createElement("section");
    card.style.cssText = "width:min(460px,100%);padding:28px;border:1px solid #dfe5ee;border-radius:14px;background:#fff;box-shadow:0 12px 35px #1f293710;text-align:left";
    const heading = document.createElement("h1");
    heading.textContent = title;
    heading.style.cssText = "margin:0 0 10px;font-size:24px;letter-spacing:-.5px";
    const copy = document.createElement("p");
    copy.textContent = message;
    copy.style.cssText = "margin:0;color:#667085;font-size:14px;line-height:1.65";
    card.append(heading, copy);
    if (canResend && db && user?.email) {
      const resend = document.createElement("button");
      resend.type = "button";
      resend.textContent = "Resend verification email";
      resend.style.cssText = "margin-top:18px;padding:10px 14px;border:0;border-radius:8px;background:#526fda;color:white;font-weight:750;cursor:pointer";
      resend.addEventListener("click", async () => {
        resend.disabled = true;
        resend.textContent = "Sending…";
        const { error } = await db.auth.resend({ type: "signup", email: user.email, options: { emailRedirectTo: location.origin + "/" } });
        resend.textContent = error ? "Could not send email" : "Email sent";
        copy.textContent = error ? error.message : "Check your inbox for the confirmation link, then return here.";
      });
      card.append(resend);
    }
    const back = document.createElement("a");
    back.href = "/dashboard.html";
    back.textContent = "Back to DougHub";
    back.style.cssText = "display:inline-block;margin:18px 0 0 12px;color:#526fda;font-size:13px;font-weight:750;text-decoration:none";
    card.append(back);
    gate.append(card);
    document.body.append(gate);
  }

  async function check() {
    const db = window.DougHubSupabaseClient;
    if (!db) return;
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) {
      location.replace("/log-in.html?redirect=" + encodeURIComponent(location.pathname.split("/").pop() || "chat.html"));
      return;
    }
    const { data: profile, error: profileError } = await db.from("profiles")
      .select("chat_verified,staff_role,is_admin,is_developer,is_owner")
      .eq("id", user.id).maybeSingle();
    if (profileError) {
      showGate("Chat access unavailable", "We couldn't check your chat access. Please refresh or contact an administrator.", false);
      return;
    }
    const role = String(profile?.staff_role || "").toLowerCase();
    const adminPlus = ["admin","developer","tech","owner"].includes(role) ||
      profile?.is_admin === true || profile?.is_developer === true || profile?.is_owner === true;
    if (!user.email_confirmed_at) {
      showGate("Verify your email first", "Confirm your email address before using Community Chat, Class Chat, or direct messages.", true, db, user);
      return;
    }
    if (!profile?.chat_verified && !adminPlus) {
      showGate("Chat access is awaiting approval", "An Admin or higher staff member must approve your account before you can view or send chat messages or direct messages. You can still use the rest of DougHub.", false);
    }
  }

  if (window.DougHubSupabaseClient) check();
  else window.addEventListener("douqhub:supabase-ready", check, { once: true });
})();