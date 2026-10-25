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
  mainWindow.loadURL(CHAT_URL);
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
