const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("douqhubDesktop", {
  incoming: message => ipcRenderer.send("incoming-message", message),
  openChat: () => ipcRenderer.send("open-chat"),
  dismiss: () => ipcRenderer.send("dismiss-popup"),
  sendReply: payload => ipcRenderer.invoke("send-quick-reply", payload),
  onNotification: callback => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("notification-data", listener);
    return () => ipcRenderer.removeListener("notification-data", listener);
  }
});
