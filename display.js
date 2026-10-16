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
        style.textContent = ".dh-og-badge{display:inline-flex;align-items:center;vertical-align:middle;margin-left:6px;padding:2px 6px;border:1px solid rgba(250,204,21,.35);border-radius:6px;background:linear-gradient(135deg,rgba(250,204,21,.15),rgba(249,115,22,.1));color:#fde68a;font:900 10px/1.3 Inter,Arial,sans-serif;letter-spacing:.04em;white-space:nowrap}";
        document.head.appendChild(style);

        async function decorate(element) {
            if (!element || element.dataset.dhOgChecked === "true" || element.querySelector(".dh-og-badge")) return;
            const raw = element.getAttribute("data-username") || element.textContent || "";
            const username = raw.trim().replace(/^@/, "").trim();
            if (!/^[a-zA-Z0-9_]{2,32}$/.test(username)) return;
            element.dataset.dhOgChecked = "true";
            const key = username.toLowerCase();
            try {
                let hasBadge = cache.get(key);
                if (hasBadge === undefined) {
                    const { data, error } = await client.from("profiles")
                        .select("username,reward_badges")
                        .ilike("username", username)
                        .limit(5);
                    if (error) throw error;
                    const profile = (data || []).find(item => String(item.username || "").toLowerCase() === key);
                    hasBadge = !!(profile && Array.isArray(profile.reward_badges) && profile.reward_badges.includes("og"));
                    cache.set(key, hasBadge);
                }
                if (hasBadge && element.isConnected && !element.querySelector(".dh-og-badge")) {
                    const badge = document.createElement("span");
                    badge.className = "dh-og-badge";
                    badge.textContent = "★ OG";
                    badge.title = "Original Member badge";
                    element.appendChild(badge);
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
        const observer = new MutationObserver(records => records.forEach(record => {
            record.addedNodes.forEach(node => { if (node.nodeType === 1) scan(node); });
        }));
        observer.observe(document.body, { childList: true, subtree: true });
        window.addEventListener("douqhub:og-badges-updated", () => {
            cache.clear();
            document.querySelectorAll(selectors).forEach(element => {
                element.dataset.dhOgChecked = "false";
                element.querySelectorAll(".dh-og-badge").forEach(badge => badge.remove());
                decorate(element);
            });
        });
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