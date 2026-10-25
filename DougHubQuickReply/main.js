const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, screen } = require("electron");
const path = require("path");

const CHAT_URL = "https://doughub.online/chat.html";
let mainWindow = null;
let popupWindow = null;
let tray = null;
let lastMessageIds = new Set();
let closing = false;

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
  mainWindow.loadURL(CHAT_URL);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://doughub.online/")) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("did-finish-load", () => {
    // Hook the exact callback used by Chat's working realtime subscription.
    // This avoids creating a second subscription that may be blocked by project settings.
    mainWindow.webContents.executeJavaScript(`
      (() => {
        let attempts = 0;
        const attach = () => {
          attempts++;
          try {
            if (typeof notifyIncomingChatMessage === "function" &&
                !window.__douqhubQuickReplyWrapped) {
              const originalNotify = notifyIncomingChatMessage;
              notifyIncomingChatMessage = function(row) {
                originalNotify(row);
                try {
                  if (!row || !row.id || !row.user_id ||
                      typeof currentUser === "undefined" || !currentUser?.id ||
                      String(row.user_id) === String(currentUser.id)) return;
                  window.douqhubDesktop?.incoming({
                    id: String(row.id),
                    user_id: String(row.user_id),
                    username: String(row.username || "Someone").slice(0, 60),
                    message: String(row.message || (row.attachment_type ? "Sent an attachment" : "Sent a message")).replace(/\\s+/g, " ").slice(0, 240),
                    group_id: row.group_id == null ? null : String(row.group_id)
                  });
                } catch (e) { console.warn("DougHub Quick Reply popup error:", e); }
              };
              window.__douqhubQuickReplyWrapped = true;
              console.log("DougHub Quick Reply: message notifications connected.");
              return;
            }
          } catch (e) {
            console.warn("DougHub Quick Reply hook setup error:", e);
          }
          if (attempts < 600) window.setTimeout(attach, 1000);
        };
        attach();
      })();
    `).catch(err => console.warn("Could not attach Quick Reply listener:", err));
  });
  mainWindow.on("close", event => {
    if (!closing) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const icon = nativeImage.createFromDataURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAEklEQVR4nGNgGAWjYBSMglEwCkYAAAwAAf4AAf8AAAAASUVORK5CYII=");
  tray = new Tray(icon);
  tray.setToolTip("DougHub Quick Reply");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open DougHub Chat", click: () => openChatWindow() },
    { label: "Check connection", click: () => mainWindow?.webContents.executeJavaScript("location.reload()") },
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

ipcMain.on("open-chat", () => {
  shell.openExternal(CHAT_URL);
});

ipcMain.on("dismiss-popup", () => {
  if (popupWindow && !popupWindow.isDestroyed()) popupWindow.close();
});

ipcMain.handle("send-quick-reply", async (_event, payload) => {
  const text = String(payload?.text || "").trim().slice(0, 1000);
  const groupId = payload?.groupId == null ? null : String(payload.groupId);
  if (!text) return { ok: false, error: "Type a reply first." };
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false, error: "Open DougHub Quick Reply again." };

  // The insert runs inside the signed-in DougHub page, using its current session.
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
  } catch (error) {
    return { ok: false, error: "Could not reach DougHub. Check your connection and sign-in." };
  }
});

app.whenReady().then(() => {
  createMainWindow();
  createTray();
});
app.on("window-all-closed", () => { /* Keep running in the system tray. */ });
app.on("before-quit", () => { closing = true; });
