const https = require("https");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { app, dialog } = require("electron");

const RELEASE_API = "https://api.github.com/repos/toomanygames/DougHub/releases/latest";
let checking = false;
let updateInProgress = false;

function getJson(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error("Too many redirects"));
    https.get(url, { headers: { "User-Agent": "DougHub-Quick-Reply", "Accept": "application/vnd.github+json" } }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        return resolve(getJson(res.headers.location, redirects + 1));
      }
      let data = "";
      res.setEncoding("utf8");
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error("GitHub returned HTTP " + res.statusCode));
        try { resolve(JSON.parse(data)); } catch { reject(new Error("GitHub returned invalid update information")); }
      });
    }).on("error", reject);
  });
}

function download(url, destination, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 8) return reject(new Error("Too many download redirects"));
    const output = fs.createWriteStream(destination);
    https.get(url, { headers: { "User-Agent": "DougHub-Quick-Reply" } }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        output.close();
        fs.rm(destination, { force: true }, () => resolve(download(res.headers.location, destination, redirects + 1)));
        return;
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        output.close();
        fs.rm(destination, { force: true }, () => reject(new Error("Installer download failed (HTTP " + res.statusCode + ")")));
        res.resume();
        return;
      }
      res.pipe(output);
      output.on("finish", () => output.close(() => {
        fs.stat(destination, (err, stats) => {
          if (err || !stats.size) return reject(new Error("The downloaded update is empty or incomplete."));
          resolve();
        });
      }));
      output.on("error", reject);
    }).on("error", error => {
      output.close();
      reject(error);
    });
  });
}

async function checkForUpdates(manual = true) {
  if (checking || updateInProgress) return;
  checking = true;
  try {
    const release = await getJson(RELEASE_API);
    if (release.draft || release.prerelease) {
      if (manual) dialog.showMessageBox({ type: "info", title: "DougHub Quick Reply", message: "No stable update is available yet." });
      return;
    }

    const match = String(release.tag_name || "").match(/^quick-reply-build-(\\d+)$/);
    const latestBuild = match ? Number(match[1]) : 0;
    const currentBuild = Number(String(app.getVersion()).split(".").pop()) || 0;

    if (!latestBuild || latestBuild <= currentBuild) {
      if (manual) dialog.showMessageBox({ type: "info", title: "DougHub Quick Reply", message: "You're up to date!", detail: "Installed version: " + app.getVersion() });
      return;
    }

    const asset = (release.assets || []).find(item => /^DougHub-Quick-Reply-Setup-1\\.0\\.\\d+\\.exe$/i.test(item.name));
    if (!asset || !asset.browser_download_url) throw new Error("The latest stable release does not contain a Windows installer yet.");

    const choice = await dialog.showMessageBox({
      type: "info",
      title: "DougHub Quick Reply update",
      message: "DougHub Quick Reply " + latestBuild + " is ready.",
      detail: "The app will download and install this update automatically, then restart. You do not need to find or download an installer yourself.",
      buttons: ["Update now", "Later"],
      defaultId: 0,
      cancelId: 1
    });
    if (choice.response !== 0) return;

    updateInProgress = true;
    const installerPath = path.join(os.tmpdir(), "DougHub-Quick-Reply-Update-" + latestBuild + ".exe");
    await fs.promises.rm(installerPath, { force: true }).catch(() => {});
    await download(asset.browser_download_url, installerPath);

    // Start the silent installer; quit this app promptly so Windows can replace its files.
    const child = spawn(installerPath, ["/S"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.on("error", error => {
      updateInProgress = false;
      dialog.showErrorBox("Update could not start", "The update was downloaded, but Windows could not start its installer. Try Check for updates again. " + error.message);
    });
    child.unref();
    setTimeout(() => app.quit(), 400);
  } catch (error) {
    updateInProgress = false;
    if (manual) dialog.showMessageBox({ type: "error", title: "Update check failed", message: "Couldn't update DougHub Quick Reply.", detail: error.message });
  } finally {
    checking = false;
  }
}

function setupUpdater() {
  // Check on launch and every six hours. The update is downloaded and installed from inside the app.
  setTimeout(() => checkForUpdates(false), 12000);
  setInterval(() => checkForUpdates(false), 6 * 60 * 60 * 1000);
  return () => checkForUpdates(true);
}

module.exports = { setupUpdater };
