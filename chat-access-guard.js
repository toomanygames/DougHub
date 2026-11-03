(function () {
  "use strict";
  if (window.__dhChatAccessGuardStarted) return;
  window.__dhChatAccessGuardStarted = true;

  function showGate(title, message, canResend, db, user, request) {
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
    if (request && db && user) {
      // Members can ask staff to review them; the request shows up in the admin panel's queue.
      const ask = document.createElement("button");
      ask.type = "button";
      ask.style.cssText = "margin-top:18px;padding:10px 14px;border:0;border-radius:8px;background:#526fda;color:white;font-weight:750;cursor:pointer";
      const note = document.createElement("p");
      note.style.cssText = "margin:10px 0 0;color:#667085;font-size:13px;line-height:1.55";
      const showRequested = when => {
        ask.textContent = "Request sent";
        ask.disabled = true;
        ask.style.background = "#98a2b3";
        note.textContent = "Requested " + new Date(when).toLocaleString() + ". A staff member will review it soon. Refresh this page after you're approved.";
      };
      if (request.requestedAt) showRequested(request.requestedAt);
      else ask.textContent = "Request chat access";
      ask.addEventListener("click", async () => {
        ask.disabled = true;
        ask.textContent = "Sending…";
        const { data, error } = await db.from("chat_access_requests").insert({ user_id: user.id }).select("requested_at").maybeSingle();
        if (error && error.code !== "23505") {
          ask.disabled = false;
          ask.textContent = "Request chat access";
          note.textContent = "Couldn't send the request: " + error.message;
          return;
        }
        showRequested(data?.requested_at || Date.now());
      });
      card.append(ask, note);
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
      .select("staff_role,is_admin,is_developer,is_owner")
      .eq("id", user.id).maybeSingle();
    if (profileError) {
      showGate("Chat access unavailable", "We couldn't check your chat access. Please refresh or contact an administrator.", false);
      return;
    }
    // Any staff rank (Helper and up) has chat access and can approve others; staff_role is authoritative.
    const role = String(profile?.staff_role || "").toLowerCase();
    const isStaff = ["helper","admin","developer","tech","owner"].includes(role) || profile?.is_owner === true;
    if (!user.email_confirmed_at) {
      showGate("Verify your email first", "Confirm your email address before using Community Chat, Class Chat, or direct messages.", true, db, user);
      return;
    }
    const { data: approval, error: approvalError } = await db.from("chat_access_approvals")
      .select("user_id").eq("user_id", user.id).maybeSingle();
    if (approvalError) {
      showGate("Chat access unavailable", "We couldn't check your chat approval. Please refresh or contact an administrator.", false);
      return;
    }
    if (!approval && !isStaff) {
      const { data: pending, error: pendingError } = await db.from("chat_access_requests")
        .select("requested_at").eq("user_id", user.id).maybeSingle();
      // If the requests table isn't available yet, still show the gate, just without the request button.
      const request = pendingError ? null : { requestedAt: pending?.requested_at || null };
      showGate("Chat needs staff approval", "A DougHub staff member (Helper or above) has to approve your account before you can see or send chat messages or direct messages. You can still use the rest of DougHub.", false, db, user, request);
    }
  }

  if (window.DougHubSupabaseClient) check();
  else window.addEventListener("douqhub:supabase-ready", check, { once: true });
})();