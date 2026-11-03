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
        <h3 style="margin:0 0 8px;font-size:15px">Find any account</h3>
        <form id="chatAccessSearchForm" style="display:flex;gap:9px;flex-wrap:wrap">
          <input id="chatAccessSearch" type="search" maxlength="32" placeholder="Search by username" aria-label="Search by username" style="flex:1;min-width:180px;padding:10px 12px;border:1px solid #ffffff20;border-radius:9px;background:#080b18;color:#fff">
          <button type="submit">Search users</button>
        </form>
        <div id="chatAccessStatus" class="status" role="status" aria-live="polite">Search for a username to approve chat access.</div>
        <div id="chatAccessResults" class="admin-scroll-area" style="display:grid;gap:8px"></div>
      `;
      host.prepend(card);

      const form = card.querySelector("#chatAccessSearchForm");
      const input = card.querySelector("#chatAccessSearch");
      const status = card.querySelector("#chatAccessStatus");
      const results = card.querySelector("#chatAccessResults");

      async function search() {
        const term = input.value.trim();
        if (term.length < 2) {
          status.textContent = "Enter at least 2 characters.";
          results.replaceChildren();
          return;
        }
        status.textContent = "Searching…";
        results.replaceChildren();
        const { data, error } = await db.from("profiles")
          .select("id,username,staff_role,is_admin,is_developer,is_owner")
          .ilike("username", "%" + term.replace(/[%_]/g, "") + "%")
          .order("username").limit(20);
        if (error) {
          status.textContent = "Search failed: " + error.message;
          return;
        }
        if (!data?.length) {
          status.textContent = "No matching accounts found.";
          return;
        }
        const { data: approvalRows, error: approvalError } = await db.from("chat_access_approvals")
          .select("user_id").in("user_id", data.map(person => person.id));
        if (approvalError) {
          status.textContent = "Could not load chat approvals: " + approvalError.message;
          return;
        }
        const approvedIds = new Set((approvalRows || []).map(row => row.user_id));
        status.textContent = data.length + " account(s) found.";
        data.forEach(person => {
          person.chat_verified = approvedIds.has(person.id);
          const personRole = String(person.staff_role || "").toLowerCase();
          const isStaff = ["helper","admin","developer","tech","owner"].includes(personRole) || person.is_owner === true;
          const row = document.createElement("div");
          row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:11px;border:1px solid #ffffff14;border-radius:10px;background:#ffffff04";
          const meta = document.createElement("div");
          meta.style.cssText = "min-width:0;display:grid;gap:4px";
          const name = document.createElement("strong");
          name.textContent = "@" + (person.username || "Unknown");
          const detail = document.createElement("small");
          detail.style.color = "#a7aec9";
          const describe = () => {
            const state = isStaff ? "Staff" : person.chat_verified ? "Approved" : "Not approved";
            detail.innerHTML = '<span class="dh-pill dh-pill-' + (isStaff ? "staff" : person.chat_verified ? "approved" : "none") + '">' + state + "</span>" + (isStaff ? " access included" : "");
          };
          describe();
          meta.append(name, detail);
          row.append(meta);
          if (!isStaff) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = person.chat_verified ? "Revoke access" : "Approve chat";
            button.disabled = false;
            button.addEventListener("click", async () => {
              if (person.chat_verified && !confirm("Revoke chat access for @" + (person.username || "this user") + "? They lose Community Chat, Class Chat, and DMs until approved again.")) return;
              button.disabled = true;
              status.textContent = (person.chat_verified ? "Revoking" : "Approving") + " chat access…";
              const { error: updateError } = await db.rpc("dh_set_chat_verified", {
                p_user_id: person.id,
                p_verified: !person.chat_verified
              });
              if (updateError) {
                status.textContent = "Could not update access: " + updateError.message;
                button.disabled = false;
                return;
              }
              person.chat_verified = !person.chat_verified;
              describe();
              button.textContent = person.chat_verified ? "Revoke access" : "Approve chat";
              button.disabled = false;
              status.textContent = "Updated @" + (person.username || "user") + ".";
            });
            row.append(button);
          }
          results.append(row);
        });
      }
      form.addEventListener("submit", event => { event.preventDefault(); search(); });

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
      card.querySelector("#chatAccessRefresh").addEventListener("click", loadPending);
      loadPending();
    } catch (error) {
      console.error("Chat access approvals failed to load:", error);
    }
  }

  if (window.DougHubSupabaseClient) start();
  else window.addEventListener("douqhub:supabase-ready", start, { once: true });
  document.addEventListener("DOMContentLoaded", start, { once: true });
})();