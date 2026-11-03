(function () {
  "use strict";
  if (window.__dhChatAccessAdminLoaded) return;
  window.__dhChatAccessAdminLoaded = true;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[ch]);

  async function start() {
    const db = window.DougHubSupabaseClient;
    const host = document.getElementById("adminArea");
    if (!db || !host || document.getElementById("chatAccessVerificationCard")) return;

    try {
      const { data: { user }, error: authError } = await db.auth.getUser();
      if (authError || !user) return;
      const { data: staff, error: staffError } = await db.from("profiles")
        .select("staff_role,is_admin,is_developer,is_owner")
        .eq("id", user.id).maybeSingle();
      if (staffError) throw staffError;
      const role = String(staff?.staff_role || "").toLowerCase();
      // Admin and higher approve (Helpers do not); staff_role is authoritative, matching the database's approver check.
      const allowed = ["admin","developer","tech","owner"].includes(role) || staff?.is_owner === true;
      if (!allowed) return;

      const card = document.createElement("section");
      card.className = "card";
      card.id = "chatAccessVerificationCard";
      card.style.cssText = "margin:0 0 14px;grid-column:1/-1";
      card.innerHTML = `
        <h2>Chat access approvals</h2>
        <p class="admin-card-help">Only email-confirmed accounts approved here can use Community Chat, Class Chat, and direct messages. Staff of every rank already have access. Admins and higher can approve, deny, or revoke, and every decision is logged.</p>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:9px;margin:4px 0 8px"><h3 style="margin:0;font-size:15px">Waiting for approval <span id="chatAccessPendingCount" style="color:#a7aec9;font-weight:700"></span></h3><button type="button" id="chatAccessRefresh">Refresh</button></div>
        <div id="chatAccessPending" class="admin-scroll-area" style="display:grid;gap:8px;margin-bottom:16px"></div>
        <h3 style="margin:0 0 8px;font-size:15px">Approve or revoke any member</h3>
        <div style="display:flex;gap:9px;flex-wrap:wrap;align-items:center">
          <select id="chatAccessMember" aria-label="Choose a member" style="flex:1;min-width:200px"><option value="">Loading members…</option></select>
          <button type="button" id="chatAccessToggle" disabled>Approve chat</button>
        </div>
        <div id="chatAccessStatus" class="status" role="status" aria-live="polite" style="margin-top:8px">Pick a member to see their chat access.</div>
      `;
      host.prepend(card);

      // Dropdown of every non-staff member, grouped by whether they can chat yet.
      const memberSelect = card.querySelector("#chatAccessMember");
      const toggle = card.querySelector("#chatAccessToggle");
      const status = card.querySelector("#chatAccessStatus");
      const members = new Map();
      const STAFF = ["helper","admin","developer","tech","owner"];

      function syncToggle() {
        const person = members.get(memberSelect.value);
        toggle.disabled = !person;
        toggle.textContent = person?.approved ? "Revoke access" : "Approve chat";
        toggle.className = person?.approved ? "dh-btn-danger" : "";
        if (!person) { status.textContent = "Pick a member to see their chat access."; return; }
        status.innerHTML = person.approved
          ? '<span class="dh-pill dh-pill-approved">Approved</span> @' + esc(person.username) + " can use chat and DMs."
          : '<span class="dh-pill dh-pill-none">Not approved</span> @' + esc(person.username) + " can't chat yet.";
      }

      async function loadMembers() {
        const keep = memberSelect.value;
        const [{ data: people, error }, { data: approvals, error: approvalError }] = await Promise.all([
          db.from("profiles").select("id,username,staff_role,is_owner").order("username").limit(2000),
          db.from("chat_access_approvals").select("user_id").limit(5000)
        ]);
        if (error || approvalError) {
          memberSelect.innerHTML = '<option value="">Couldn’t load members</option>';
          status.textContent = "Couldn't load members: " + (error || approvalError).message;
          return;
        }
        const approved = new Set((approvals || []).map(row => row.user_id));
        members.clear();
        (people || []).forEach(p => {
          if (p.is_owner === true || STAFF.includes(String(p.staff_role || "").toLowerCase())) return;
          members.set(p.id, { id: p.id, username: p.username || "unknown", approved: approved.has(p.id) });
        });
        const list = [...members.values()];
        const group = (label, rows) => rows.length
          ? '<optgroup label="' + label + " (" + rows.length + ')">' + rows.map(m => '<option value="' + m.id + '">@' + esc(m.username) + "</option>").join("") + "</optgroup>"
          : "";
        memberSelect.innerHTML = '<option value="">Choose a member…</option>' +
          group("Not approved", list.filter(m => !m.approved)) + group("Approved", list.filter(m => m.approved));
        if (keep && members.has(keep)) memberSelect.value = keep;
        syncToggle();
      }

      memberSelect.addEventListener("change", syncToggle);
      toggle.addEventListener("click", async () => {
        const person = members.get(memberSelect.value);
        if (!person) return;
        if (person.approved && !confirm("Revoke chat access for @" + person.username + "? They lose Community Chat, Class Chat, and DMs until approved again.")) return;
        toggle.disabled = true;
        status.textContent = (person.approved ? "Revoking" : "Approving") + " chat access…";
        const { error: updateError } = await db.rpc("dh_set_chat_verified", { p_user_id: person.id, p_verified: !person.approved });
        if (updateError) {
          status.textContent = "Couldn't update access: " + updateError.message;
          toggle.disabled = false;
          return;
        }
        await loadMembers();
        loadPending();
        status.innerHTML += " Saved.";
      });
      loadMembers();

      // Queue of members who pressed "Request chat access" on the locked chat screen.
      const pending = card.querySelector("#chatAccessPending");
      const pendingCount = card.querySelector("#chatAccessPendingCount");
      const rowStyle = "display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:11px;border:1px solid #ffffff14;border-radius:10px;background:#ffffff04";
      async function loadPending() {
        pending.replaceChildren();
        const { data: requests, error } = await db.from("chat_access_requests")
          .select("user_id,requested_at").order("requested_at", { ascending: true }).limit(100);
        if (error) {
          pendingCount.textContent = "";
          pending.innerHTML = `<small style="color:#a7aec9">Couldn't load requests: ${esc(error.message)}</small>`;
          return;
        }
        pendingCount.textContent = requests.length ? "(" + requests.length + ")" : "";
        if (!requests.length) {
          pending.innerHTML = `<small style="color:#a7aec9">No one is waiting right now.</small>`;
          return;
        }
        const { data: people } = await db.from("profiles").select("id,username").in("id", requests.map(r => r.user_id));
        const names = new Map((people || []).map(p => [p.id, p.username]));
        requests.forEach(request => {
          const row = document.createElement("div");
          row.style.cssText = rowStyle;
          const meta = document.createElement("div");
          meta.style.cssText = "min-width:0;display:grid;gap:4px";
          const name = document.createElement("strong");
          name.textContent = "@" + (names.get(request.user_id) || "Unknown");
          const when = document.createElement("small");
          when.style.color = "#a7aec9";
          when.innerHTML = '<span class="dh-pill dh-pill-pending">Pending</span> ';
          when.append("Asked " + new Date(request.requested_at).toLocaleString());
          meta.append(name, when);
          const actions = document.createElement("div");
          actions.style.cssText = "display:flex;gap:8px";
          const approve = document.createElement("button");
          approve.type = "button";
          approve.textContent = "Approve";
          const deny = document.createElement("button");
          deny.type = "button";
          deny.textContent = "Deny";
          deny.className = "dh-btn-danger";
          const decide = async ok => {
            approve.disabled = deny.disabled = true;
            const label = "@" + (names.get(request.user_id) || "user");
            if (!ok && !confirm("Deny chat access for " + label + "? They can ask again later.")) {
              approve.disabled = deny.disabled = false;
              return;
            }
            // Both go through checked, logged database functions; denying lets them ask again later.
            let { error: decideError } = ok
              ? await db.rpc("dh_set_chat_verified", { p_user_id: request.user_id, p_verified: true })
              : await db.rpc("dh_deny_chat_request", { p_user_id: request.user_id });
            if (!ok && decideError && /dh_deny_chat_request/.test(decideError.message || "")) {
              ({ error: decideError } = await db.from("chat_access_requests").delete().eq("user_id", request.user_id));
            }
            if (decideError) {
              status.textContent = "Couldn't update " + label + ": " + decideError.message;
              approve.disabled = deny.disabled = false;
              return;
            }
            status.textContent = (ok ? "Approved " : "Denied ") + label + ".";
            if (ok) loadMembers();
            row.remove();
            const left = pending.children.length;
            pendingCount.textContent = left ? "(" + left + ")" : "";
            if (!left) pending.innerHTML = `<small style="color:#a7aec9">No one is waiting right now.</small>`;
          };
          approve.addEventListener("click", () => decide(true));
          deny.addEventListener("click", () => decide(false));
          actions.append(approve, deny);
          row.append(meta, actions);
          pending.append(row);
        });
      }
      card.querySelector("#chatAccessRefresh").addEventListener("click", () => { loadPending(); loadMembers(); });
      loadPending();
    } catch (error) {
      console.error("Chat access approvals failed to load:", error);
    }
  }

  if (window.DougHubSupabaseClient) start();
  else window.addEventListener("douqhub:supabase-ready", start, { once: true });
  document.addEventListener("DOMContentLoaded", start, { once: true });
})();