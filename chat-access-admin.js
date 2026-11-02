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
      const allowed = ["admin","developer","tech","owner"].includes(role) ||
        staff?.is_admin === true || staff?.is_developer === true || staff?.is_owner === true;
      if (!allowed) return;

      const card = document.createElement("section");
      card.className = "card";
      card.id = "chatAccessVerificationCard";
      card.style.cssText = "margin:0 0 14px;grid-column:1/-1";
      card.innerHTML = `
        <h2>Chat access approvals</h2>
        <p class="admin-card-help">Only email-confirmed accounts approved here can use Community Chat, Class Chat, and direct messages. Admin+ staff already have access.</p>
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
          .select("id,username,chat_verified,staff_role,is_admin,is_developer,is_owner")
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
        status.textContent = data.length + " account(s) found.";
        data.forEach(person => {
          const personRole = String(person.staff_role || "").toLowerCase();
          const isStaff = ["admin","developer","owner"].includes(personRole) ||
            person.is_admin === true || person.is_developer === true || person.is_owner === true;
          const row = document.createElement("div");
          row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:11px;border:1px solid #ffffff14;border-radius:10px;background:#ffffff04";
          const meta = document.createElement("div");
          meta.style.cssText = "min-width:0;display:grid;gap:4px";
          const name = document.createElement("strong");
          name.textContent = "@" + (person.username || "Unknown");
          const detail = document.createElement("small");
          detail.style.color = "#a7aec9";
          detail.textContent = isStaff ? "Admin+ · access included" : person.chat_verified ? "Chat access approved" : "Not approved";
          meta.append(name, detail);
          row.append(meta);
          if (!isStaff) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = person.chat_verified ? "Revoke access" : "Approve chat";
            button.disabled = false;
            button.addEventListener("click", async () => {
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
              detail.textContent = person.chat_verified ? "Chat access approved" : "Not approved";
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
    } catch (error) {
      console.error("Chat access approvals failed to load:", error);
    }
  }

  if (window.DougHubSupabaseClient) start();
  else window.addEventListener("douqhub:supabase-ready", start, { once: true });
  document.addEventListener("DOMContentLoaded", start, { once: true });
})();