const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, screen } = require("electron");
const path = require("path");
const { setupUpdater } = require("./updater");

const CHAT_URL = "https://doughub.online/chat.html";
let mainWindow = null;
let popupWindow = null;
let tray = null;
let lastMessageIds = new Set();
let closing = false;
let checkForUpdates = () => {};

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1180, height: 820, minWidth: 760, minHeight: 560,
    title: "DougHub Quick Reply",
    backgroundColor: "#080b18",
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  // Keep realtime chat notifications alive while the window is minimized or hidden.
  mainWindow.webContents.setBackgroundThrottling(false);
  mainWindow.loadURL(CHAT_URL);
  mainWindow.webContents.on("did-finish-load", installAppToolbar);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://doughub.online/")) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.on("close", event => {
    if (!closing) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}


function installAppToolbar() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const url = mainWindow.webContents.getURL();
  if (!url.startsWith(CHAT_URL)) return;

  mainWindow.webContents.executeJavaScript(`
    (() => {
      if (document.getElementById("douqhub-quickreply-appbar")) return true;
      const style = document.createElement("style");
      style.id = "douqhub-quickreply-appbar-style";
      style.textContent = \`
        html,body{height:100%!important;box-sizing:border-box!important}
        body{padding-top:42px!important}
        main{height:calc(100vh - 42px)!important;padding:10px 0!important;width:calc(100% - 20px)!important;max-width:none!important}
        .chat-container{border-radius:14px!important}
        .chat-back-button,.dmail-notice,#chatNotificationsButton,#chatHelpButton,#chatHelpPopover{display:none!important}
        #douqhub-quickreply-appbar{position:fixed;z-index:2147483647;inset:0 0 auto;height:42px;display:flex;align-items:center;gap:10px;padding:0 12px;background:rgba(5,7,19,.98);border-bottom:1px solid rgba(129,140,248,.24);font:12px/1.2 "Segoe UI",system-ui,sans-serif;color:#eef0ff}
        #douqhub-quickreply-appbar .brand{display:flex;align-items:center;gap:8px;font-weight:800;font-size:12px;white-space:nowrap}
        #douqhub-quickreply-appbar .mark{width:23px;height:23px;border-radius:7px;display:grid;place-items:center;background:linear-gradient(135deg,#6366f1,#a855f7);color:white;font-size:12px}
        #douqhub-quickreply-appbar .spacer{flex:1}
        #douqhub-quickreply-appbar button{border:1px solid #34395c;border-radius:8px;background:#141a31;color:#e7e9ff;padding:6px 10px;font:650 11px "Segoe UI",system-ui,sans-serif;cursor:pointer}
        #douqhub-quickreply-appbar button:hover{border-color:#818cf8;background:#202747}
        #douqhub-quickreply-appbar #dq-sign-in{background:#6366f1;border-color:#6366f1;color:#fff}
        #douqhub-quickreply-appbar .version{color:#8f97bb;font-size:10px;white-space:nowrap}
        @media(max-width:600px){main{width:calc(100% - 10px)!important;padding:5px 0!important}.chat-top{gap:7px;padding:10px!important}.chat-heading h1{font-size:18px!important}.chat-status,.chat-ding-setting{display:none!important}}
      \`;
      document.head.appendChild(style);
      const bar = document.createElement("div");
      bar.id = "douqhub-quickreply-appbar";
      bar.innerHTML = '<div class="brand"><span class="mark">D</span><span>DougHub Quick Reply</span></div><span class="version">Desktop chat</span><span class="spacer"></span><button id="dq-sign-in" type="button">Sign in</button><button id="dq-update" type="button">Check for updates</button>';
      document.body.appendChild(bar);
      bar.querySelector("#dq-sign-in").addEventListener("click", () => {
        window.location.href = "https://doughub.online/log-in.html?redirect=chat.html";
      });
      bar.querySelector("#dq-update").addEventListener("click", () => {
        if (window.douqhubDesktop?.checkForUpdates) window.douqhubDesktop.checkForUpdates();
      });
      const syncSignIn = () => {
        const name = document.getElementById("currentUsername")?.textContent?.trim() || "Guest";
        const button = bar.querySelector("#dq-sign-in");
        if (button) button.hidden = name !== "Guest" && name !== "Loading...";
      };
      syncSignIn();
      setInterval(syncSignIn, 1000);
      return true;
    })()
  `).catch(error => console.warn("Could not install Quick Reply toolbar:", error));
}

function createTray() {
  const icon = nativeImage.createFromDataURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAEklEQVR4nGNgGAWjYBSMglEwCkYAAAwAAf4AAf8AAAAASUVORK5CYII=");
  tray = new Tray(icon);
  tray.setToolTip("DougHub Quick Reply");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open DougHub Chat", click: () => openChatWindow() },
    { label: "Check connection", click: () => mainWindow?.webContents.executeJavaScript("location.reload()") },
    { label: "Check for updates", click: () => checkForUpdates() },
    { type: "separator" },
    { label: "Quit DougHub Quick Reply", click: () => { closing = true; app.quit(); } }
  ]));
  tray.on("double-click", openChatWindow);
}

function openChatWindow() {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
}

function showReplyPopup(message) {
  if (!message.id || lastMessageIds.has(message.id)) return;
  lastMessageIds.add(message.id);
  if (lastMessageIds.size > 300) lastMessageIds = new Set([...lastMessageIds].slice(-150));
  if (popupWindow && !popupWindow.isDestroyed()) popupWindow.close();

  const area = screen.getPrimaryDisplay().workArea;
  const width = Math.min(390, area.width - 24);
  const height = 260;
  popupWindow = new BrowserWindow({
    width, height, x: area.x + area.width - width - 16, y: area.y + area.height - height - 16,
    resizable: false, frame: false, alwaysOnTop: true, skipTaskbar: true,
    show: false, backgroundColor: "#101329",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true, nodeIntegration: false, sandbox: true
    }
  });
  popupWindow.loadFile(path.join(__dirname, "popup.html"));
  popupWindow.webContents.once("did-finish-load", () => {
    popupWindow.webContents.send("notification-data", message);
    popupWindow.show();
    popupWindow.setAlwaysOnTop(true, "screen-saver");
  });
  popupWindow.on("closed", () => { popupWindow = null; });
}

ipcMain.on("incoming-message", (_event, message) => {
  if (!message || !message.id || !message.user_id) return;
  showReplyPopup(message);
});
ipcMain.on("open-chat", () => shell.openExternal(CHAT_URL));
ipcMain.on("check-for-updates", () => checkForUpdates());
ipcMain.on("dismiss-popup", () => {
  if (popupWindow && !popupWindow.isDestroyed()) popupWindow.close();
});

ipcMain.handle("send-quick-reply", async (_event, payload) => {
  const text = String(payload?.text || "").trim().slice(0, 1000);
  const groupId = payload?.groupId == null ? null : String(payload.groupId);
  if (!text) return { ok: false, error: "Type a reply first." };
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false, error: "Open DougHub Quick Reply again." };
  const script = `
    (async () => {
      if (!currentUser || !supabaseClient) return { ok: false, error: "Sign in to DougHub in the Quick Reply app first." };
      const text = ${JSON.stringify(text)};
      const groupId = ${JSON.stringify(groupId)};
      const { error } = await supabaseClient.from("chat_messages").insert({
        user_id: currentUser.id,
        username: currentUsername,
        message: text,
        attachment_url: null,
        attachment_type: null,
        attachment_name: null,
        attachment_source: null,
        group_id: groupId
      });
      if (error) return { ok: false, error: error.message || "DougHub could not send that reply." };
      return { ok: true };
    })()
  `;
  try {
    return await mainWindow.webContents.executeJavaScript(script, true);
  } catch {
    return { ok: false, error: "Could not reach DougHub. Check your connection and sign-in." };
  }
});

app.whenReady().then(() => {
  createMainWindow();
  createTray();
  checkForUpdates = setupUpdater();
});
app.on("window-all-closed", () => { /* Keep running in the system tray. */ });
app.on("before-quit", () => { closing = true; });
