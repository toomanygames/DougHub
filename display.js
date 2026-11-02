(function () {
    if (window.__DOUGHUB_DISPLAY_LOADED) return;
    window.__DOUGHUB_DISPLAY_LOADED = true;

    const SUPABASE_URL =
        "https://agsqdqcsmsppcdqxlppj.supabase.co";

    const SUPABASE_KEY =
        "sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52";


    let supabaseClient = null;
    let currentUser = null;

    let warningQueue = [];
    let showingWarning = false;

    let banned = false;

    let checkTimer = null;
    let presenceTimer = null;


    /* =========================================
       LOAD SUPABASE
    ========================================= */

    function loadSupabase() {

        return new Promise((resolve, reject) => {

            if (window.supabase) {
                resolve();
                return;
            }


            const script =
                document.createElement("script");

            script.src =
                "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

            script.onload =
                resolve;

            script.onerror =
                reject;

            document.head.appendChild(
                script
            );

        });

    }


    /* =========================================
       CREATE DISPLAY STYLES
    ========================================= */

    function createStyles() {

        if (
            document.getElementById(
                "dougHubDisplayStyles"
            )
        ) {
            return;
        }


        const style =
            document.createElement("style");

        style.id =
            "dougHubDisplayStyles";


        style.textContent = `
            #dougHubDisplayOverlay {
                position: fixed;
                inset: 0;
                z-index: 2147483647;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(2, 4, 10, 0.82);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                padding: 20px;
                box-sizing: border-box;
            }

            #dougHubDisplayBox {
                width: min(520px, 100%);
                background: linear-gradient(
                    145deg,
                    rgba(20, 24, 52, 0.98),
                    rgba(10, 13, 30, 0.98)
                );
                border: 1px solid rgba(139, 92, 246, 0.35);
                border-radius: 22px;
                padding: 30px;
                box-sizing: border-box;
                box-shadow: 0 30px 100px rgba(0, 0, 0, 0.65);
                color: white;
                font-family: Arial, sans-serif;
                text-align: center;
            }

            #dougHubDisplayIcon {
                font-size: 48px;
                margin-bottom: 12px;
            }

            #dougHubDisplayTitle {
                margin: 0 0 15px;
                font-size: 26px;
                font-weight: 800;
            }

            #dougHubDisplayMessage {
                color: #d8dbea;
                font-size: 15px;
                line-height: 1.6;
                white-space: pre-wrap;
                overflow-wrap: anywhere;
                margin-bottom: 18px;
            }

            #dougHubDisplayDate {
                color: #858ca1;
                font-size: 12px;
                margin-bottom: 22px;
            }

            #dougHubDisplayButton {
                width: 100%;
                border: 0;
                border-radius: 13px;
                padding: 14px 18px;
                background: linear-gradient(
                    135deg,
                    #6366f1,
                    #a855f7
                );
                color: white;
                font-size: 15px;
                font-weight: 800;
                cursor: pointer;
            }

            #dougHubDisplayButton:hover {
                filter: brightness(1.1);
            }

            #dougHubDisplayReason {
                background: rgba(255,255,255,0.05);
                border-radius: 13px;
                padding: 15px;
                margin: 18px 0;
                color: #d8dbea;
                line-height: 1.6;
                text-align: left;
                overflow-wrap: anywhere;
            }
        `;


        document.head.appendChild(
            style
        );

    }


    /* =========================================
       PAGE LOCKING
    ========================================= */

    function lockPage() {

        document.documentElement.style.overflow =
            "hidden";

        document.body.style.overflow =
            "hidden";

    }


    function unlockPage() {

        document.documentElement.style.overflow =
            "";

        document.body.style.overflow =
            "";

    }


    function removeOverlay() {

        const overlay =
            document.getElementById(
                "dougHubDisplayOverlay"
            );


        if (overlay) {
            overlay.remove();
        }


        unlockPage();

    }


    function createOverlay() {

        removeOverlay();


        const overlay =
            document.createElement("div");

        overlay.id =
            "dougHubDisplayOverlay";


        const box =
            document.createElement("div");

        box.id =
            "dougHubDisplayBox";


        overlay.appendChild(
            box
        );

        document.body.appendChild(
            overlay
        );


        lockPage();


        return box;

    }


    /* =========================================
       WARNING DISPLAY
    ========================================= */

    function showWarning(warning) {

        if (
            showingWarning ||
            banned
        ) {
            return;
        }


        showingWarning =
            true;


        const box =
            createOverlay();


        const icon =
            document.createElement("div");

        icon.id =
            "dougHubDisplayIcon";

        icon.textContent =
            "⚠️";


        const title =
            document.createElement("h2");

        title.id =
            "dougHubDisplayTitle";

        title.textContent =
            "DougHub Warning";


        const message =
            document.createElement("div");

        message.id =
            "dougHubDisplayMessage";

        message.textContent =
            warning.message ||
            "You have received a warning.";


        const date =
            document.createElement("div");

        date.id =
            "dougHubDisplayDate";


        if (warning.created_at) {

            date.textContent =
                "Issued " +
                new Date(
                    warning.created_at
                ).toLocaleString();

        }


        const button =
            document.createElement("button");

        button.id =
            "dougHubDisplayButton";

        button.textContent =
            "I Understand";


        button.addEventListener(
            "click",
            async function () {

                button.disabled =
                    true;

                button.textContent =
                    "Saving...";


                try {

                    await supabaseClient
                        .from("user_warnings")
                        .update({
                            read_at:
                                new Date()
                                    .toISOString()
                        })
                        .eq(
                            "id",
                            warning.id
                        )
                        .eq(
                            "user_id",
                            currentUser.id
                        );


                    warningQueue.shift();

                } catch (error) {

                    console.error(
                        "DougHub warning error:",
                        error
                    );

                }


                showingWarning =
                    false;


                removeOverlay();


                setTimeout(
                    showNextWarning,
                    100
                );

            }
        );


        box.appendChild(
            icon
        );

        box.appendChild(
            title
        );

        box.appendChild(
            message
        );

        box.appendChild(
            date
        );

        box.appendChild(
            button
        );

    }


    function showNextWarning() {

        if (
            banned ||
            showingWarning
        ) {
            return;
        }


        if (
            warningQueue.length === 0
        ) {

            removeOverlay();

            return;
        }


        showWarning(
            warningQueue[0]
        );

    }


    /* =========================================
       BAN DISPLAY
    ========================================= */

    function showBan(reason, suspendedUntil, isSuspension) {

        if (banned) {
            return;
        }


        banned =
            true;

        showingWarning =
            false;

        warningQueue =
            [];


        const box =
            createOverlay();


        const icon =
            document.createElement("div");

        icon.id =
            "dougHubDisplayIcon";

        icon.textContent =
            "🚫";


        const title =
            document.createElement("h2");

        title.id =
            "dougHubDisplayTitle";

        title.textContent =
            isSuspension ? "DougHub Suspension" : "DougHub Ban";


        const message =
            document.createElement("div");

        message.id =
            "dougHubDisplayMessage";

        message.textContent =
            isSuspension
                ? "Your DougHub account has been temporarily suspended."
                : "Your DougHub account has been banned.";


        const reasonBox =
            document.createElement("div");

        reasonBox.id =
            "dougHubDisplayReason";


        reasonBox.textContent =
            reason &&
            reason.trim()
                ? "Reason: " + reason
                : "No reason was provided.";


        const date =
            document.createElement("div");

        date.id =
            "dougHubDisplayDate";

        date.textContent =
            isSuspension && suspendedUntil
                ? "Suspended until " + new Date(suspendedUntil).toLocaleString() +
                  ". If you believe this is a mistake, contact a DougHub administrator."
                : "If you believe this is a mistake, contact a DougHub administrator.";


        box.appendChild(
            icon
        );

        box.appendChild(
            title
        );

        box.appendChild(
            message
        );

        box.appendChild(
            reasonBox
        );

        box.appendChild(
            date
        );

    }


    /* =========================================
       USER PRESENCE
    ========================================= */

    async function updatePresence() {

        if (
            !supabaseClient ||
            !currentUser ||
            banned
        ) {
            return;
        }


        const {
            error
        } =
            await supabaseClient
                .from("user_presence")
                .upsert(
                    {
                        user_id:
                            currentUser.id,

                        last_seen_at:
                            new Date()
                                .toISOString()
                    },
                    {
                        onConflict:
                            "user_id"
                    }
                );


        if (error) {

            console.error(
                "DougHub presence error:",
                error
            );

        }

    }


    function stopPresenceTracking() {

        if (presenceTimer) {

            clearInterval(
                presenceTimer
            );

            presenceTimer =
                null;

        }

    }


    function startPresenceTracking() {

        stopPresenceTracking();


        if (
            !currentUser ||
            banned
        ) {
            return;
        }


        updatePresence();


        /*
            Update every 30 seconds.

            The admin panel considers someone online
            when their last_seen_at is within 2 minutes.
        */

        presenceTimer =
            setInterval(
                updatePresence,
                30000
            );

    }


    /* =========================================
       ACCOUNT CHECK
    ========================================= */

    async function checkAccount() {

        if (!supabaseClient) {
            return;
        }


        const result =
            await supabaseClient
                .auth
                .getSession();


        if (result.error) {
            return;
        }


        const session =
            result.data.session;


        if (
            !session ||
            !session.user
        ) {

            currentUser =
                null;

            banned =
                false;

            warningQueue =
                [];

            showingWarning =
                false;


            stopPresenceTracking();


            removeOverlay();


            return;
        }


        currentUser =
            session.user;


        const profileResult =
            await supabaseClient
                .from("profiles")
                .select(
                    "is_banned, ban_reason, ban_type, suspended_until"
                )
                .eq(
                    "id",
                    currentUser.id
                )
                .maybeSingle();


        if (profileResult.error) {

            console.error(
                "DougHub profile check error:",
                profileResult.error
            );

            return;
        }


        const profile =
            profileResult.data;


        if (
            profile &&
            profile.is_banned === true
        ) {

            if (
                profile.ban_type === "suspend" &&
                profile.suspended_until
            ) {
                const until = new Date(profile.suspended_until).getTime();

                if (Number.isFinite(until) && until <= Date.now()) {
                    await supabaseClient
                        .from("profiles")
                        .update({
                            is_banned: false,
                            ban_reason: null,
                            banned_at: null,
                            ban_type: null,
                            suspended_until: null
                        })
                        .eq("id", currentUser.id);

                    profile.is_banned = false;
                } else {
                    stopPresenceTracking();
                    showBan(
                        profile.ban_reason,
                        profile.suspended_until,
                        true
                    );
                    return;
                }
            } else {
                stopPresenceTracking();
                showBan(
                    profile.ban_reason,
                    null,
                    false
                );
                return;
            }
        }


        if (banned) {

            banned =
                false;

            removeOverlay();

        }


        startPresenceTracking();


        await loadWarnings();

    }


    /* =========================================
       LOAD WARNINGS
    ========================================= */

    async function loadWarnings() {

        if (
            !currentUser ||
            banned
        ) {
            return;
        }


        const result =
            await supabaseClient
                .from("user_warnings")
                .select(
                    "id,message,created_at"
                )
                .eq(
                    "user_id",
                    currentUser.id
                )
                .is(
                    "read_at",
                    null
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );


        if (result.error) {

            console.error(
                "DougHub warning check error:",
                result.error
            );

            return;
        }


        warningQueue =
            result.data ||
            [];


        if (
            !showingWarning &&
            warningQueue.length > 0
        ) {

            showNextWarning();

        }

    }


    /* =========================================
       PAGE VISIBILITY
    ========================================= */

    document.addEventListener(
        "visibilitychange",
        function () {

            if (
                document.visibilityState ===
                "visible"
            ) {

                updatePresence();

            }

        }
    );


    window.addEventListener(
        "focus",
        function () {

            updatePresence();

        }
    );


    /* =========================================
       SITE-WIDE CHAT MESSAGE DINGS
    ========================================= */

    function startDougHubChatDings(client) {
        if (window.__douqhubChatDingsStarted) return;
        window.__douqhubChatDingsStarted = true;

        const enabledKey = "douqhub_chat_dings_enabled";
        let cursorCreatedAt = null;
        let initialized = false;
        let audioContext = null;
        let audioUnlocked = false;
        let checking = false;
        let checkAgain = false;
        let lastDingAt = 0;
        let realtimeChannel = null;

        function enabled() {
            try { return localStorage.getItem(enabledKey) !== "false"; }
            catch (_) { return true; }
        }

        async function unlockAudio() {
            try {
                const AudioCtor = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtor) return false;
                if (!audioContext) {
                    audioContext = new AudioCtor();
                    audioContext.addEventListener("statechange", () => {
                        audioUnlocked = audioContext.state === "running";
                    });
                }
                if (audioContext.state !== "running") await audioContext.resume();
                audioUnlocked = audioContext.state === "running";
                return audioUnlocked;
            } catch (error) {
                audioUnlocked = false;
                console.debug("DougHub chat ding audio is not ready yet:", error);
                return false;
            }
        }

        // Browsers require a user gesture before sound can be enabled. Re-attempt
        // after gestures and whenever a sleeping/throttled tab becomes active.
        window.addEventListener("pointerdown", () => { unlockAudio(); }, { passive: true });
        window.addEventListener("keydown", () => { unlockAudio(); });
        window.addEventListener("touchstart", () => { unlockAudio(); }, { passive: true });
        window.addEventListener("douqhub:chat-ding-setting-changed", () => {
            if (enabled()) unlockAudio();
        });

        async function playDing() {
            if (!enabled()) return;
            if (!audioContext || audioContext.state !== "running") {
                const ready = await unlockAudio();
                if (!ready) return;
            }
            if (!audioContext || audioContext.state !== "running") return;

            // Avoid a burst of duplicate dings if Realtime and the fallback poll
            // notice the same message at nearly the same time.
            const now = Date.now();
            if (now - lastDingAt < 900) return;
            lastDingAt = now;

            try {
                const ctx = audioContext;
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.0001, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.55, ctx.currentTime + 0.025);
                gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.62);
                gain.connect(ctx.destination);
                [880, 1174.66].forEach((frequency, index) => {
                    const oscillator = ctx.createOscillator();
                    oscillator.type = "sine";
                    oscillator.frequency.value = frequency;
                    oscillator.connect(gain);
                    const at = ctx.currentTime + index * 0.13;
                    oscillator.start(at);
                    oscillator.stop(at + 0.24);
                });
            } catch (error) {
                console.debug("DougHub chat ding could not play:", error);
            }
        }

        async function handleIncomingMessage(message) {
            if (!message || !message.created_at) return;
            if (!initialized) {
                cursorCreatedAt = message.created_at;
                initialized = true;
                return;
            }
            // Keep the cursor moving forward even if audio is blocked by browser policy.
            if (cursorCreatedAt && message.created_at <= cursorCreatedAt) return;
            cursorCreatedAt = message.created_at;

            const path = (window.location.pathname || "").toLowerCase();
            const isCommunityChatPage = path.endsWith("/chat.html") || path === "chat.html";
            if (isCommunityChatPage || !message.user_id) return;

            try {
                const sessionResult = await client.auth.getSession();
                const ownUserId = sessionResult.data?.session?.user?.id || null;
                if (ownUserId && message.user_id !== ownUserId) await playDing();
            } catch (error) {
                console.debug("DougHub could not verify chat message sender:", error);
            }
        }

        async function checkForMessages() {
            if (checking) {
                checkAgain = true;
                return;
            }
            checking = true;
            try {
                if (!initialized) {
                    const baseline = await client.from("chat_messages")
                        .select("created_at")
                        .order("created_at", { ascending: false })
                        .limit(1);
                    if (!baseline.error) {
                        cursorCreatedAt = baseline.data?.[0]?.created_at || null;
                        initialized = true;
                    }
                    return;
                }

                let query = client.from("chat_messages")
                    .select("created_at,user_id")
                    .order("created_at", { ascending: true })
                    .limit(100);
                if (cursorCreatedAt) query = query.gt("created_at", cursorCreatedAt);
                const result = await query;
                if (result.error || !result.data?.length) return;

                // Process every fetched row in order; a cursor only advances after
                // each row so multiple messages between polls are not collapsed.
                for (const message of result.data) {
                    await handleIncomingMessage(message);
                }
            } catch (error) {
                console.debug("DougHub chat notification check failed:", error);
            } finally {
                checking = false;
                if (checkAgain) {
                    checkAgain = false;
                    checkForMessages();
                }
            }
        }

        // Realtime delivers promptly while connected; polling is a fallback for
        // temporary Realtime disconnects. Browsers can suspend both in deep sleep.
        try {
            realtimeChannel = client.channel("douqhub-site-chat-dings")
                .on("postgres_changes", {
                    event: "INSERT",
                    schema: "public",
                    table: "chat_messages"
                }, payload => {
                    handleIncomingMessage(payload.new);
                })
                .subscribe(status => {
                    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                        console.debug("DougHub chat ding Realtime status:", status);
                    }
                });
        } catch (error) {
            console.debug("DougHub chat ding Realtime could not start; polling remains active.", error);
        }

        checkForMessages();
        window.setInterval(checkForMessages, 5000);
        const resumeAndCheck = () => {
            unlockAudio();
            checkForMessages();
        };
        window.addEventListener("focus", resumeAndCheck);
        window.addEventListener("pageshow", resumeAndCheck);
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") resumeAndCheck();
        });
    }


    /* =========================================
       GLOBAL OG BADGE DISPLAY
    ========================================= */

    function initializeOgBadges(client) {
        const cache = new Map();
        const selectors = [
            ".user-name", ".username", ".activity-username",
            ".warning-username", ".comment-username", ".comment-author", ".video-author",
            ".author-name", "[data-username]"
        ].join(",");
        const style = document.createElement("style");
        style.textContent = ".dh-og-badge{display:inline-flex;align-items:center;vertical-align:middle;margin-left:6px;padding:2px 6px;border:1px solid rgba(250,204,21,.35);border-radius:6px;background:linear-gradient(135deg,rgba(250,204,21,.15),rgba(249,115,22,.1));color:#fde68a;font:900 10px/1.3 Inter,Arial,sans-serif;letter-spacing:.04em;white-space:nowrap}.dh-character-badge-chip{display:inline-flex;align-items:center;vertical-align:middle;margin-left:4px;padding:2px 5px;border:1px solid rgba(167,139,250,.32);border-radius:6px;background:rgba(139,92,246,.13);color:#d9c7ff;font:800 9px/1.3 Inter,Arial,sans-serif;white-space:nowrap}";

        document.head.appendChild(style);

        async function decorate(element) {
            if (!element || element.dataset.dhOgChecked === "true" || element.querySelector(".dh-og-badge")) return;
            let raw = element.getAttribute("data-username") || "";
            if (!raw) {
                const clean = element.cloneNode(true);
                clean.querySelectorAll(".dh-og-badge,.og-badge,.admin-badge,.message-badge,.staff-role-pill").forEach(node => node.remove());
                raw = clean.textContent || "";
            }
            const usernameMatch = raw.trim().match(/^@?([a-zA-Z0-9_]{2,32})(?:\b|$)/);
            if (!usernameMatch) return;
            const username = usernameMatch[1];
            element.dataset.dhOgChecked = "true";
            const key = username.toLowerCase();
            try {
                let badgeData = cache.get(key);
                if (badgeData === undefined) {
                    const { data, error } = await client.from("profiles")
                        .select("username,reward_badges")
                        .ilike("username", username)
                        .limit(5);
                    if (error) throw error;
                    const profile = (data || []).find(item => String(item.username || "").toLowerCase() === key);
                    const rewards = profile && Array.isArray(profile.reward_badges) ? profile.reward_badges : [];
                    badgeData = { og: rewards.includes("og"), characters: rewards.filter(value => /^badge_[a-z0-9_]+$/.test(value)) };
                    cache.set(key, badgeData);
                }
                if (element.isConnected) {
                    if (badgeData.og && !element.querySelector(".dh-og-badge")) {
                        const badge = document.createElement("span");
                        badge.className = "dh-og-badge";
                        badge.textContent = "★ OG";
                        badge.title = "Original Member badge";
                        element.appendChild(badge);
                    }
                    if (badgeData.characters.length && !element.querySelector(".dh-character-badge-chip")) {
                        const names = badgeData.characters.map(value => value.replace(/^badge_/, "").split("_").map(part => part.charAt(0).toUpperCase()+part.slice(1)).join(" "));
                        names.slice(0, 2).forEach(name => {
                            const badge = document.createElement("span");
                            badge.className = "dh-character-badge-chip";
                            badge.textContent = "✦ " + name;
                            badge.title = name + " character badge";
                            element.appendChild(badge);
                        });
                        if (names.length > 2) {
                            const more = document.createElement("span");
                            more.className = "dh-character-badge-chip";
                            more.textContent = "+" + (names.length - 2);
                            more.title = names.slice(2).join(", ");
                            element.appendChild(more);
                        }
                    }
                }
            } catch (error) {
                element.dataset.dhOgChecked = "false";
                console.debug("Could not load OG badge for username:", error);
            }
        }

        function scan(root) {
            if (root.nodeType === 1 && root.matches && root.matches(selectors)) decorate(root);
            if (root.querySelectorAll) root.querySelectorAll(selectors).forEach(decorate);
        }
        scan(document);
        // Badge awards can change while this page remains open. Clear stale lookups
        // and refresh existing names once, avoiding duplicate/racing refresh handlers.
        window.addEventListener("douqhub:og-badges-updated", () => {
            cache.clear();
            document.querySelectorAll(".dh-og-badge,.dh-character-badge-chip").forEach(badge => badge.remove());
            document.querySelectorAll(selectors).forEach(element => {
                delete element.dataset.dhOgChecked;
            });
            scan(document);
        });
        const observer = new MutationObserver(records => records.forEach(record => {
            record.addedNodes.forEach(node => { if (node.nodeType === 1) scan(node); });
        }));
        observer.observe(document.body, { childList: true, subtree: true });
    }


    /* DAILY CHAT + GAMES ERROR PAGE — Pacific Time. Q dismisses until reload. */
    function startChatGamesDailyButtonSchedule(client) {
        if (window.__douqhubChatGamesDailyScheduleStarted) return;
        window.__douqhubChatGamesDailyScheduleStarted = true;
        const LOCK_PATH = "__daily_chat_games_button_lock__";
        let enabled = false, dismissed = false, overlay = null;
        function withinBlackout() {
            const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
            const hour = Number(parts.find(p => p.type === "hour")?.value || 0), minute = Number(parts.find(p => p.type === "minute")?.value || 0);
            return hour * 60 + minute >= 540 && hour * 60 + minute <= 890;
        }
        function isChatOrGamesPage() {
            const path = location.pathname.toLowerCase().replace(/\/+$/, "");
            const file = (path.split("/").pop() || "").replace(/\.html$/, "");
            return file === "chat";
        }
        function buildOverlay() {
            if (overlay || !document.body) return;
            overlay = document.createElement("div"); overlay.id = "dhScheduledErrorPage"; overlay.setAttribute("role", "alertdialog"); overlay.setAttribute("aria-modal", "true");
            overlay.innerHTML = '<div class="dh-scheduled-error-box"><div class="dh-scheduled-error-code">ERROR 503</div><h1>This page is temporarily unavailable</h1><p>Chat and Games are temporarily unavailable during scheduled hours.</p><p class="dh-scheduled-error-time">Scheduled window: 9:00 AM–2:50 PM Pacific Time</p><div class="dh-scheduled-error-hint">Press <kbd>Q</kbd> to dismiss this screen until you reload</div></div>';
            const style = document.createElement("style"); style.id = "dhScheduledErrorStyles";
            style.textContent = "#dhScheduledErrorPage{position:fixed;inset:0;z-index:2147483647;background:#070912;color:#e8ebff;display:grid;place-items:center;padding:24px;font-family:system-ui,sans-serif}#dhScheduledErrorPage .dh-scheduled-error-box{width:min(620px,100%);border:1px solid #343950;background:#101321;padding:clamp(24px,5vw,48px);box-shadow:0 24px 80px #0009}#dhScheduledErrorPage .dh-scheduled-error-code{color:#ff6978;font:800 12px ui-monospace,monospace;letter-spacing:.18em}#dhScheduledErrorPage h1{font-size:clamp(26px,4vw,40px);line-height:1.12;margin:18px 0 14px}#dhScheduledErrorPage p{color:#b8bfd8;line-height:1.6}#dhScheduledErrorPage .dh-scheduled-error-time{font-size:13px}#dhScheduledErrorPage .dh-scheduled-error-hint{margin-top:30px;border-top:1px solid #303449;padding-top:18px;color:#cbd0e6}#dhScheduledErrorPage kbd{padding:3px 9px;border:1px solid #69708b;border-radius:4px;background:#20253a;color:white;font-weight:800}";
            document.head.appendChild(style); document.body.appendChild(overlay);
        }
        function removeOverlay() { if (overlay) overlay.remove(); overlay = null; const style = document.getElementById("dhScheduledErrorStyles"); if (style) style.remove(); }
        function apply() { if (!isChatOrGamesPage()) { removeOverlay(); return; } if (enabled && withinBlackout() && !dismissed) buildOverlay(); else removeOverlay(); }
        document.addEventListener("keydown", event => { if (event.key.toLowerCase() === "q" && overlay) { dismissed = true; removeOverlay(); } });
        async function refresh() { try { const result = await client.from("site_page_schedules").select("enabled").eq("page_path", LOCK_PATH).maybeSingle(); if (result.error) throw result.error; enabled = !!result.data?.enabled; } catch (error) { console.error("Could not load daily Chat/Games error-page schedule:", error); } apply(); }
        refresh(); setInterval(refresh, 60000); setInterval(apply, 15000);
    }

    /* PRIVACY AWARENESS DEMO — answers are never read or transmitted */
    function startPrivacyAwarenessPrank(client) {
        if (window.__dhPrivacyDemoStarted) return;
        window.__dhPrivacyDemoStarted = true;
        let overlay = null, dismissedForVersion = null;
        const storageKey = "dh-privacy-demo-dismissed-v1";
        function isAdminPage() { return /\/admin(?:\.html)?$/i.test(location.pathname); }
        function wasDismissed(version) {
            try { return sessionStorage.getItem(storageKey) === String(version); }
            catch (_) { return dismissedForVersion === version; }
        }
        function rememberDismissal(version) {
            dismissedForVersion = version;
            try { sessionStorage.setItem(storageKey, String(version)); } catch (_) {}
        }
        function close() {
            if (overlay) overlay.remove();
            overlay = null;
        }
        function show(version) {
            if (overlay || isAdminPage() || wasDismissed(version) || !document.body) return;
            const root = document.createElement("div");
            root.id = "dhPrivacyDemoOverlay";
            root.innerHTML = '<section class="dh-privacy-demo-card" role="dialog" aria-modal="true" aria-labelledby="dhPrivacyDemoTitle">' +
              '<button type="button" class="dh-privacy-demo-close" aria-label="Close privacy demonstration" title="Close">×</button>' +
              '<div class="dh-privacy-demo-kicker">DOUGHUB PRIVACY AWARENESS LAB · EXTREMELY SUSPICIOUS SURVEY</div>' +
              '<h2 id="dhPrivacyDemoTitle">WE NEED TO KNOW… BASICALLY EVERYTHING.</h2>' +
              '<p class="dh-privacy-demo-intro">This is a deliberately ridiculous security-awareness demonstration. Use made-up answers only. Nothing you type is read, saved, or sent anywhere.</p>' +
              '<form class="dh-privacy-demo-form" autocomplete="off">' +
              '<label>1. What is your completely fictional superhero name?<input required placeholder="Captain Toast"></label>' +
              '<label>2. Name of your imaginary pet dragon?<input required placeholder="Sir Flames-a-Lot"></label>' +
              '<label>3. Which planet did you allegedly grow up on?<input required placeholder="Mars, probably"></label>' +
              '<label>4. What is your cereal’s legal name?<input required placeholder="Crunchy McBowlface"></label>' +
              '<label>5. What would your royal castle be called?<input required placeholder="The Fort of Snacks"></label>' +
              '<label>6. Choose your highly classified favorite dinosaur<select required><option value="">Choose one…</option><option>Stegosaurus</option><option>Tiny T-Rex</option><option>Extremely polite triceratops</option><option>Kevin</option></select></label>' +
              '<label>7. What is the password to your imaginary submarine? <small>(Not a real password!)</small><input required placeholder="DefinitelyNotARealPassword"></label>' +
              '<label>8. What is your secret agent codename?<input required placeholder="Agent Waffle"></label>' +
              '<label>9. How many penguins are in your imaginary band?<input required type="number" min="1" max="999" placeholder="7"></label>' +
              '<label>10. What is the name of your fictional hometown?<input required placeholder="Pancake City"></label>' +
              '<label>11. Pick a suspiciously specific snack<select required><option value="">Select snack…</option><option>Cheese-shaped cheese</option><option>Emergency biscuits</option><option>One singular grape</option><option>Invisible pizza</option></select></label>' +
              '<label>12. What is your imaginary spaceship’s registration number?<input required placeholder="UFO-000-NOPE"></label>' +
              '<label>13. What is the middle name of your left shoe?<input required placeholder="Gerald"></label>' +
              '<label>14. Which color would you assign to Tuesday?<input required placeholder="Microwave blue"></label>' +
              '<label>15. What is your fictional villain’s evil plan?<input required placeholder="Replace all water with soup"></label>' +
              '<label>16. How many ducks would it take to run a small airport?<input required type="number" min="0" max="999999" placeholder="A concerning number"></label>' +
              '<label>17. What is the name of your imaginary island?<input required placeholder="Probably Not A Tax Haven"></label>' +
              '<label>18. Final verification: type “I AM A FICTIONAL POTATO”<input required pattern="I AM A FICTIONAL POTATO" title="Type I AM A FICTIONAL POTATO exactly" placeholder="I AM A FICTIONAL POTATO"></label>' +
              '<button class="dh-privacy-demo-submit" type="submit">SUBMIT MY ENTIRELY FAKE EXISTENCE</button></form>' +
              '<p class="dh-privacy-demo-foot">Reminder: never enter real passwords, addresses, phone numbers, or private information into random forms.</p></section>';
            const style = document.createElement("style");
            style.id = "dhPrivacyDemoStyles";
            style.textContent = "#dhPrivacyDemoOverlay{position:fixed;inset:0;z-index:2147483646;background:rgba(3,5,16,.88);backdrop-filter:blur(10px);display:grid;place-items:center;padding:14px;font-family:Inter,system-ui,sans-serif}.dh-privacy-demo-card{position:relative;width:min(680px,100%);max-height:min(92dvh,900px);overflow:auto;background:linear-gradient(145deg,#171d3d,#090d20);border:1px solid #8874ff66;border-radius:22px;padding:clamp(20px,4vw,34px);color:#f7f7ff;box-shadow:0 30px 100px #000b}.dh-privacy-demo-close{position:sticky;float:right;top:0;width:38px;height:38px;padding:0;border:1px solid #ffffff35;border-radius:12px;background:#ffffff12;color:white;font-size:28px;line-height:1;cursor:pointer}.dh-privacy-demo-kicker{color:#a5aaff;font-size:10px;font-weight:900;letter-spacing:.12em;margin:4px 46px 12px 0}#dhPrivacyDemoTitle{font-size:clamp(23px,4vw,34px);line-height:1.08;margin:0 0 12px;letter-spacing:-.04em}.dh-privacy-demo-intro,.dh-privacy-demo-foot{color:#c5c9e3;font-size:13px;line-height:1.6}.dh-privacy-demo-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:20px}.dh-privacy-demo-form label{display:grid;gap:6px;color:#e1e4ff;font-size:11px;font-weight:800;min-width:0}.dh-privacy-demo-form small{color:#a8afd0;font-weight:500}.dh-privacy-demo-form input,.dh-privacy-demo-form select{width:100%;min-width:0;padding:11px;border-radius:10px;border:1px solid #ffffff22;background:#080c1b;color:white;font:inherit;font-size:12px;outline:none}.dh-privacy-demo-form input:focus,.dh-privacy-demo-form select:focus{border-color:#a5aaff;box-shadow:0 0 0 3px #8b5cf633}.dh-privacy-demo-submit{grid-column:1/-1;padding:14px;border:0;border-radius:12px;background:linear-gradient(120deg,#6659e8,#a34ed1);color:white;font-weight:950;letter-spacing:.03em;cursor:pointer}.dh-privacy-demo-foot{border-top:1px solid #ffffff18;padding-top:14px;margin:16px 0 0}.dh-privacy-demo-result{text-align:center;padding:30px 8px}.dh-privacy-demo-result h2{font-size:clamp(28px,5vw,48px);line-height:1.04;color:#ff6b8a;margin:18px 0}.dh-privacy-demo-result p{color:#e2e5ff;line-height:1.7;font-size:14px}.dh-privacy-demo-result strong{color:#9ff3c5}.dh-privacy-demo-done{margin-top:18px;padding:12px 22px;border:0;border-radius:11px;background:#7667ed;color:white;font-weight:900;cursor:pointer}@media(max-width:560px){.dh-privacy-demo-form{grid-template-columns:1fr}.dh-privacy-demo-card{padding:18px}.dh-privacy-demo-submit{grid-column:auto}}";
            document.head.appendChild(style);
            document.body.appendChild(root);
            overlay = root;
            const closeButton = root.querySelector(".dh-privacy-demo-close");
            closeButton.addEventListener("click", () => { rememberDismissal(version); close(); });
            root.querySelector("form").addEventListener("submit", event => {
                event.preventDefault();
                rememberDismissal(version);
                const card = root.querySelector(".dh-privacy-demo-card");
                card.innerHTML = '<div class="dh-privacy-demo-result"><div class="dh-privacy-demo-kicker">SURVEY COMPLETE · DEFINITELY NOT A REAL DATA BREACH</div>' +
                  '<h2>Thnak you your infomation has been sold overseas to russian hackers for a quick buck.</h2>' +
                  '<p><strong>JUST KIDDING.</strong> This was a privacy-awareness demonstration. Your answers were never read by the script, saved, or sent anywhere. Nothing was sold.</p>' +
                  '<p>The lesson: a real website should explain why it needs information, collect only what is necessary, and never ask for passwords or sensitive details in a random pop-up.</p>' +
                  '<button type="button" class="dh-privacy-demo-done">I GET IT — CLOSE</button></div>';
                card.querySelector(".dh-privacy-demo-done").addEventListener("click", close);
            });
            closeButton.focus();
        }
        async function refresh() {
            if (isAdminPage()) { close(); return; }
            try {
                const { data, error } = await client.from("site_announcements")
                    .select("privacy_prank_enabled,privacy_prank_version").eq("id", 1).maybeSingle();
                if (error) throw error;
                if (!data?.privacy_prank_enabled) { close(); return; }
                show(Number(data.privacy_prank_version || 1));
            } catch (error) {
                console.debug("Privacy awareness demo setting unavailable:", error);
            }
        }
        refresh();
        setInterval(refresh, 12000);
    }

    /* =========================================
       INITIALIZE
    ========================================= */


    async function initialize() {

        try {
            await loadSupabase();


            // Reuse an existing client if another DougHub script initialized it.
            // Creating a second client with the same auth storage key can race session
            // reads/writes and trigger the Multiple GoTrueClient warning.
            supabaseClient = window.DougHubSupabaseClient || window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_KEY
            );

            window.DougHubSupabaseClient = supabaseClient;
            window.dispatchEvent(new Event("douqhub:supabase-ready"));
            initializeOgBadges(supabaseClient);
            startDougHubChatDings(supabaseClient);
            startChatGamesDailyButtonSchedule(supabaseClient);
            startPrivacyAwarenessPrank(supabaseClient);

            createStyles();


            await checkAccount();


            supabaseClient.auth.onAuthStateChange(
                function () {

                    setTimeout(
                        checkAccount,
                        0
                    );

                }
            );


            checkTimer =
                setInterval(
                    checkAccount,
                    5000
                );

        } catch (error) {

            console.error(
                "DougHub display system failed to initialize:",
                error
            );

        }

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();

    }


    window.DougHubDisplay = {

        refresh:
            checkAccount

    };

})();
