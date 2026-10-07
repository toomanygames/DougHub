import base64
import hashlib
import json
import os
import sys
import queue
import subprocess
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import tkinter as tk
from tkinter import ttk, messagebox, filedialog

# DougHub is the account/login system. DougBase remains the private storage backend.
HUB_URL = "https://agsqdqcsmsppcdqxlppj.supabase.co"
HUB_KEY = "sb_publishable_Oq1WvEHgoHcjmCBGbEnoYQ_BqYA1p52"
DRIVE_URL = "https://tolvtmuolnzhkegphevw.supabase.co"
DRIVE_KEY = "sb_publishable_nj7z92WGz6tu9KcWWX97CQ_r0Yv7BD3"
DRIVE_FN = DRIVE_URL + "/functions/v1/dougdrive"
GITHUB_RELEASE_API = "https://api.github.com/repos/toomanygames/DougHub/releases/tags/dougdrive-latest"
GITHUB_INSTALLER = "https://github.com/toomanygames/DougHub/releases/latest/download/DougDrive.Setup.exe"
BUCKET = "dougdrive"
APP_DIR = os.path.join(os.environ.get("APPDATA", os.path.expanduser("~")), "DougDrive")
CONFIG_FILE = os.path.join(APP_DIR, "config.json")
STATE_FILE = os.path.join(APP_DIR, "state.json")
DEFAULT_FOLDER = os.path.join(os.path.expanduser("~"), "DougDrive")
SYNC_INTERVAL = 5

os.makedirs(APP_DIR, exist_ok=True)

def api(path, method="GET", data=None, token=None, content_type="application/json", raw=False):
    url = DRIVE_URL + path
    headers = {"apikey": DRIVE_KEY}
    if token:
        headers["Authorization"] = "Bearer " + token
    if data is not None:
        body = data if isinstance(data, bytes) else json.dumps(data).encode()
        headers["Content-Type"] = content_type
    else:
        body = None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read()
            if raw:
                return r.status, body
            if not body:
                return r.status, {}
            try:
                return r.status, json.loads(body.decode("utf-8"))
            except Exception:
                return r.status, body
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try: detail = json.loads(raw)
        except Exception: detail = {"message": raw}
        raise RuntimeError(detail.get("msg") or detail.get("message") or detail.get("error_description") or raw or f"HTTP {e.code}")

def hub_auth(path, data):
    url = HUB_URL + path
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode(),
        headers={"apikey": HUB_KEY, "Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read()
            return json.loads(body.decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try: detail = json.loads(raw)
        except Exception: detail = {"message": raw}
        raise RuntimeError(detail.get("msg") or detail.get("message") or detail.get("error_description") or raw or f"HTTP {e.code}")

def auth_login(email, password):
    return hub_auth("/auth/v1/token?grant_type=password", {"email": email, "password": password})

def auth_refresh(refresh_token):
    return hub_auth("/auth/v1/token?grant_type=refresh_token", {"refresh_token": refresh_token})

def get_hub_user(token):
    url = HUB_URL + "/auth/v1/user"
    req = urllib.request.Request(url, headers={"apikey": HUB_KEY, "Authorization": "Bearer " + token}, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try: detail = json.loads(raw)
        except Exception: detail = {"message": raw}
        raise RuntimeError(detail.get("msg") or detail.get("message") or raw or f"HTTP {e.code}")

def drive_request(token, action="list", path="", method="GET", data=None, raw=False):
    params = {"action": action}
    if path:
        params["path"] = path
    url = DRIVE_FN + "?" + urllib.parse.urlencode(params)
    headers = {"Authorization": "Bearer " + token, "apikey": DRIVE_KEY}
    if data is not None:
        body = data if isinstance(data, bytes) else json.dumps(data).encode()
        headers["Content-Type"] = "application/octet-stream" if isinstance(data, bytes) else "application/json"
    else:
        body = None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            body = r.read()
            if raw:
                return r.status, body
            if not body:
                return r.status, {}
            return r.status, json.loads(body.decode("utf-8"))
    except urllib.error.HTTPError as ex:
        raw_body = ex.read().decode(errors="replace")
        try: detail = json.loads(raw_body)
        except Exception: detail = {"message": raw_body}
        raise RuntimeError(detail.get("error") or detail.get("message") or raw_body or f"HTTP {ex.code}")

def remote_list(token):
    _, result = drive_request(token, "list")
    return {row["path"]: row for row in result.get("items", []) if row.get("path")}

def remote_download(token, path):
    _, data = drive_request(token, "download", path=path, raw=True)
    return data

def remote_upload(token, path, data):
    drive_request(token, "upload", path=path, method="POST", data=data)

def remote_delete(token, path):
    drive_request(token, "delete", path=path, method="DELETE")

def file_hash(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            b = f.read(1024 * 1024)
            if not b: break
            h.update(b)
    return h.hexdigest()

def load_json(path, default):
    try:
        with open(path, "r", encoding="utf-8") as f: return json.load(f)
    except Exception: return default

def save_json(path, value):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f: json.dump(value, f, indent=2)
    os.replace(tmp, path)

class DougDrive:
    def __init__(self, ui_log, ui_status):
        self.log = ui_log
        self.status = ui_status
        self.stop_event = threading.Event()
        self.sync_lock = threading.Lock()
        self.token = None
        self.refresh_token = None
        self.user_id = None
        self.folder = load_json(CONFIG_FILE, {}).get("folder", DEFAULT_FOLDER)
        self.state = load_json(STATE_FILE, {})
        os.makedirs(self.folder, exist_ok=True)

    def login(self, email, password):
        data = auth_login(email, password)
        self.token = data["access_token"]
        self.refresh_token = data.get("refresh_token")
        # Read user id from JWT payload without needing a JWT package.
        try:
            payload = self.token.split(".")[1]
            payload += "=" * (-len(payload) % 4)
            self.user_id = json.loads(base64.urlsafe_b64decode(payload)).get("sub")
        except Exception:
            self.user_id = None
        if not self.user_id:
            self.user_id = (data.get("user") or {}).get("id")
        if not self.user_id:
            try:
                self.user_id = get_hub_user(self.token).get("id")
            except Exception:
                self.user_id = None
        # Keep email/folder for convenience, but never persist a session token.
        # DougDrive requires a fresh sign-in every time it starts.
        cfg = load_json(CONFIG_FILE, {})
        cfg.pop("refresh_token", None)
        cfg.update({"email": email, "folder": self.folder})
        save_json(CONFIG_FILE, cfg)
        self.log("Signed in successfully.")
        self.status("Connected")
        return True

    def scan_local(self):
        out = {}
        for root, dirs, files in os.walk(self.folder):
            dirs[:] = [d for d in dirs if d != ".dougdrive"]
            for fn in files:
                path = os.path.join(root, fn)
                try:
                    rel = os.path.relpath(path, self.folder).replace("\\", "/")
                    st = os.stat(path)
                    out[rel] = {"size": st.st_size, "mtime": st.st_mtime}
                except OSError: pass
        return out

    def sync_once(self):
        if not self.token or not self.sync_lock.acquire(blocking=False): return
        try:
            self.status("Syncing…")
            local = self.scan_local()
            remote = remote_list(self.token)
            # The private bucket policy expects each user's UUID as the first path segment.
            prefix = ""
            remote = remote
            # The Edge Function validates the DougHub token and scopes storage to that user.
            changed = 0
            all_paths = set(local) | set(remote) | set(self.state)
            for rel in sorted(all_paths):
                lp = os.path.join(self.folder, *rel.split("/"))
                l = local.get(rel)
                r = remote.get(rel)
                old = self.state.get(rel, {})

                # Deletion-aware sync:
                # - If a file existed at the last sync and is now missing locally, delete the cloud copy.
                # - If it existed remotely and is now missing remotely, delete the local copy.
                if not l and r and old:
                    try:
                        remote_delete(self.token, rel)
                        changed += 1
                        self.log("☁ deleted: " + rel)
                    except Exception as e:
                        self.log("ERROR deleting cloud file " + rel + ": " + str(e))
                    continue

                if l and not r and old:
                    try:
                        os.remove(lp)
                        changed += 1
                        self.log("deleted locally: " + rel)
                    except OSError as e:
                        self.log("ERROR deleting local file " + rel + ": " + str(e))
                    continue

                local_changed = l is not None and (
                    old.get("local_mtime") != l["mtime"] or
                    old.get("local_size") != l["size"]
                )
                remote_updated = (r or {}).get("updated_at", "")
                remote_changed = r is not None and (
                    old.get("remote_updated") != remote_updated or
                    old.get("remote_size") != (r.get("metadata") or {}).get("size")
                )

                if l and not r:
                    with open(lp, "rb") as f:
                        data = f.read()
                    remote_upload(self.token, rel, data)
                    changed += 1
                    self.log("↑ " + rel)
                    continue

                if r and not l:
                    os.makedirs(os.path.dirname(lp), exist_ok=True)
                    data = remote_download(self.token, rel)
                    with open(lp, "wb") as f:
                        f.write(data)
                    changed += 1
                    self.log("↓ " + rel)
                    continue

                if not l or not r:
                    continue

                if not local_changed and not remote_changed:
                    continue

                if remote_changed and not local_changed:
                    os.makedirs(os.path.dirname(lp), exist_ok=True)
                    data = remote_download(self.token, rel)
                    with open(lp, "wb") as f:
                        f.write(data)
                    changed += 1
                    self.log("↓ " + rel)
                elif local_changed and not remote_changed:
                    with open(lp, "rb") as f:
                        data = f.read()
                    remote_upload(self.token, rel, data)
                    changed += 1
                    self.log("↑ " + rel)
                else:
                    # Both changed since the last sync. Newer local modification wins.
                    if l["mtime"] >= old.get("local_mtime", 0):
                        with open(lp, "rb") as f:
                            data = f.read()
                        remote_upload(self.token, rel, data)
                        self.log("↑ conflict → local wins: " + rel)
                    else:
                        data = remote_download(self.token, rel)
                        with open(lp, "wb") as f:
                            f.write(data)
                        self.log("↓ conflict → cloud wins: " + rel)
                    changed += 1
            local = self.scan_local()
            remote = remote_list(self.token)
            remote = {k[len(prefix):]: v for k, v in remote.items() if k.startswith(prefix)}
            new_state = {}
            for rel, l in local.items():
                r = remote.get(rel, {})
                new_state[rel] = {
                    "local_mtime": l["mtime"], "local_size": l["size"],
                    "remote_updated": r.get("updated_at"), "remote_size": (r.get("metadata") or {}).get("size")
                }
            self.state = new_state
            save_json(STATE_FILE, self.state)
            self.status("Synced" + (f" • {changed} change(s)" if changed else ""))
        except Exception as e:
            self.status("Sync error")
            self.log("ERROR: " + str(e))
            if "JWT" in str(e) or "token" in str(e).lower():
                try:
                    if self.refresh_token:
                        data = auth_refresh(self.refresh_token)
                        self.token = data["access_token"]
                        self.refresh_token = data.get("refresh_token", self.refresh_token)
                        cfg = load_json(CONFIG_FILE, {})
                        cfg.pop("refresh_token", None)
                        save_json(CONFIG_FILE, cfg)
                except Exception: pass
        finally:
            self.sync_lock.release()

    def loop(self):
        while not self.stop_event.is_set():
            if self.token:
                self.sync_once()
            self.stop_event.wait(SYNC_INTERVAL)

class App:
    def __init__(self, root):
        self.root = root
        root.title("DougDrive")
        root.geometry("650x500")
        root.minsize(560, 420)
        self.drive = DougDrive(self.log, self.status)
        self.build()
        # Always show the sign-in screen on startup.
        # The updater reopens the new EXE normally, so it will require sign-in too.
        saved_email = load_json(CONFIG_FILE, {}).get("email", "")
        if saved_email:
            self.email.insert(0, saved_email)
        root.protocol("WM_DELETE_WINDOW", self.close)

    def build(self):
        style = ttk.Style()
        try: style.theme_use("clam")
        except Exception: pass
        self.login_frame = ttk.Frame(self.root, padding=30)
        ttk.Label(self.login_frame, text="DougDrive", font=("Segoe UI", 28, "bold")).pack(pady=(20, 4))
        ttk.Label(self.login_frame, text="Your DougBase files, synced to Windows.", font=("Segoe UI", 11)).pack(pady=(0, 25))
        form = ttk.Frame(self.login_frame); form.pack()
        ttk.Label(form, text="DougHub email").grid(row=0,column=0,sticky="w",pady=6)
        self.email = ttk.Entry(form,width=42); self.email.grid(row=1,column=0,pady=(0,8))
        ttk.Label(form, text="Password").grid(row=2,column=0,sticky="w",pady=6)
        self.password = ttk.Entry(form,width=42,show="•"); self.password.grid(row=3,column=0,pady=(0,14))
        ttk.Button(form,text="Sign in & start DougDrive",command=self.do_login).grid(row=4,column=0,sticky="ew")
        self.login_msg = ttk.Label(form,text=""); self.login_msg.grid(row=5,column=0,pady=10)
        self.login_frame.pack(fill="both",expand=True)

        self.drive_frame = ttk.Frame(self.root,padding=20)
        top=ttk.Frame(self.drive_frame); top.pack(fill="x")
        ttk.Label(top,text="DougDrive",font=("Segoe UI",24,"bold")).pack(side="left")
        self.status_var=tk.StringVar(value="Disconnected")
        ttk.Label(top,textvariable=self.status_var).pack(side="right")
        ttk.Label(self.drive_frame,text="Local folder",font=("Segoe UI",10,"bold")).pack(anchor="w",pady=(24,3))
        row=ttk.Frame(self.drive_frame);row.pack(fill="x")
        self.folder_var=tk.StringVar(value=self.drive.folder)
        ttk.Entry(row,textvariable=self.folder_var).pack(side="left",fill="x",expand=True)
        ttk.Button(row,text="Change…",command=self.choose_folder).pack(side="left",padx=(8,0))
        ttk.Button(self.drive_frame,text="Sync now",command=lambda:threading.Thread(target=self.drive.sync_once,daemon=True).start()).pack(anchor="w",pady=12)
        ttk.Button(self.drive_frame,text="Check for updates",command=self.update_app).pack(anchor="w",pady=(0,12))
        self.log_box=tk.Text(self.drive_frame,height=16,wrap="word")
        self.log_box.pack(fill="both",expand=True)
        ttk.Label(self.drive_frame,text="Files sync automatically every 5 seconds.",foreground="#777").pack(anchor="w",pady=(8,0))

    def do_login(self):
        email=self.email.get().strip(); password=self.password.get()
        if not email or not password:
            self.login_msg.config(text="Enter your email and password."); return
        self.login_msg.config(text="Signing in…")
        def work():
            try:
                self.drive.login(email,password)
                self.root.after(0,lambda:(self.login_frame.pack_forget(),self.drive_frame.pack(fill="both",expand=True),self.start_sync()))
            except Exception as e:
                self.root.after(0,lambda:self.login_msg.config(text=str(e)))
        threading.Thread(target=work,daemon=True).start()

    def choose_folder(self):
        p=filedialog.askdirectory(initialdir=self.drive.folder)
        if p:
            self.drive.folder=p
            self.folder_var.set(p)
            cfg=load_json(CONFIG_FILE,{})
            cfg["folder"]=p
            save_json(CONFIG_FILE,cfg)
            os.makedirs(p,exist_ok=True)

    def start_sync(self):
        threading.Thread(target=self.drive.loop,daemon=True).start()
        self.log("DougDrive is running.")
        self.log("Folder: " + self.drive.folder)

    def log(self,msg):
        if hasattr(self,"log_box"):
            self.root.after(0,lambda:(self.log_box.insert("end",time.strftime("[%H:%M:%S] ")+msg+"\n"),self.log_box.see("end")))

    def status(self,msg):
        if hasattr(self,"status_var"):
            self.root.after(0,lambda:self.status_var.set(msg))

    def update_app(self):
        self.status_var.set("Checking for updates…")

        def work():
            try:
                req = urllib.request.Request(
                    GITHUB_RELEASE_API,
                    headers={
                        "Accept": "application/vnd.github+json",
                        "User-Agent": "DougDrive-Updater",
                        "X-GitHub-Api-Version": "2026-03-10"
                    }
                )
                with urllib.request.urlopen(req, timeout=20) as r:
                    release = json.loads(r.read().decode("utf-8"))

                if release.get("draft") or release.get("prerelease"):
                    raise RuntimeError("The latest DougDrive release is not published yet.")

                assets = release.get("assets", [])
                portable = next(
                    (a for a in assets if a.get("name", "").lower() == "dougdrive.exe"),
                    None
                )
                if not portable:
                    raise RuntimeError("The latest DougDrive EXE was not found on GitHub.")

                current_exe = os.path.abspath(sys.executable)
                current_hash = file_hash(current_exe) if getattr(sys, "frozen", False) and os.path.isfile(current_exe) else None
                remote_digest = portable.get("digest", "") or ""
                remote_hash = remote_digest.split(":", 1)[1] if remote_digest.startswith("sha256:") else None

                if current_hash and remote_hash and current_hash.lower() == remote_hash.lower():
                    self.root.after(0, lambda: self.status_var.set("Up to date"))
                    self.root.after(0, lambda: messagebox.showinfo(
                        "DougDrive Update", "DougDrive is already up to date."
                    ))
                    return

                version = release.get("name") or release.get("tag_name") or "latest"
                url = portable.get("browser_download_url")
                if not url:
                    raise RuntimeError("The DougDrive EXE download URL is missing.")

                self.root.after(0, lambda: self._offer_update(
                    version, url, remote_digest, portable.get("size")
                ))

            except Exception as ex:
                self.root.after(0, lambda: (
                    self.status_var.set("Update check failed"),
                    messagebox.showerror("DougDrive Update", str(ex))
                ))

        threading.Thread(target=work, daemon=True).start()

    def _offer_update(self, version, url, expected_digest="", expected_size=None):
        self.status_var.set("Update available")

        if not messagebox.askyesno(
            "DougDrive Update",
            f"A DougDrive update is available ({version}).\n\n"
            "DougDrive will close, replace its old EXE with the new one, and reopen automatically.\n\n"
            "Update now?"
        ):
            self.status_var.set("Running")
            return

        self.status_var.set("Downloading update…")

        def download():
            temp_target = os.path.join(APP_DIR, "DougDrive.new.exe")
            try:
                req = urllib.request.Request(
                    url,
                    headers={"User-Agent": "DougDrive-Updater"}
                )
                with urllib.request.urlopen(req, timeout=300) as r, open(temp_target, "wb") as out:
                    while True:
                        chunk = r.read(1024 * 1024)
                        if not chunk:
                            break
                        out.write(chunk)

                if not os.path.isfile(temp_target) or os.path.getsize(temp_target) == 0:
                    raise RuntimeError("The update download was empty.")

                if expected_size is not None and os.path.getsize(temp_target) != int(expected_size):
                    raise RuntimeError("The downloaded EXE size does not match GitHub.")

                if expected_digest and expected_digest.startswith("sha256:"):
                    if file_hash(temp_target).lower() != expected_digest.split(":", 1)[1].lower():
                        raise RuntimeError("The downloaded EXE failed its SHA-256 check.")

                if not getattr(sys, "frozen", False):
                    raise RuntimeError("In-app replacement is only available in the installed Windows version.")

                installed_exe = os.path.abspath(sys.executable)
                backup_exe = installed_exe + ".old"
                updater_cmd = os.path.join(APP_DIR, "update-dougdrive.cmd")
                parent_pid = os.getpid()

                # Wait for DougDrive itself to fully exit before replacing the EXE.
                lines = [
                    "@echo off",
                    "setlocal EnableExtensions",
                    f'set "TARGET={installed_exe}"',
                    f'set "NEWFILE={temp_target}"',
                    f'set "BACKUP={backup_exe}"',
                    f'set "PID={parent_pid}"',
                    "set /a waittries=0",
                    ":wait_for_app",
                    'tasklist /FI "PID eq %PID%" /FO CSV /NH >nul 2>&1',
                    "if errorlevel 1 goto app_closed",
                    "set /a waittries+=1",
                    "if %waittries% GEQ 60 goto wait_failed",
                    "timeout /t 1 /nobreak >nul",
                    "goto wait_for_app",
                    ":app_closed",
                    "timeout /t 1 /nobreak >nul",
                    "set /a tries=0",
                    ":replace",
                    'if exist "%BACKUP%" del /f /q "%BACKUP%" >nul 2>&1',
                    'move /y "%TARGET%" "%BACKUP%" >nul 2>&1',
                    'if not exist "%BACKUP%" goto replace_retry',
                    'copy /y "%NEWFILE%" "%TARGET%" >nul 2>&1',
                    'if exist "%TARGET%" goto success',
                    ":replace_retry",
                    "set /a tries+=1",
                    "if %tries% GEQ 30 goto failed",
                    "timeout /t 1 /nobreak >nul",
                    "goto replace",
                    ":success",
                    'del /f /q "%BACKUP%" >nul 2>&1',
                    'del /f /q "%NEWFILE%" >nul 2>&1',
                    'start "" "%TARGET%"',
                    'del "%~f0"',
                    "endlocal",
                    "exit /b 0",
                    ":wait_failed",
                    'msg * "DougDrive could not close cleanly for the update. The old version was left untouched."',
                    'del /f /q "%NEWFILE%" >nul 2>&1',
                    'del "%~f0"',
                    "endlocal",
                    "exit /b 1",
                    ":failed",
                    'del /f /q "%TARGET%" >nul 2>&1',
                    'if exist "%BACKUP%" move /y "%BACKUP%" "%TARGET%" >nul 2>&1',
                    'del /f /q "%NEWFILE%" >nul 2>&1',
                    'msg * "DougDrive could not replace the old EXE. The previous version was restored."',
                    'del "%~f0"',
                    "endlocal",
                    "exit /b 1"
                ]

                with open(updater_cmd, "w", encoding="utf-8", newline="") as fh:
                    fh.write("\r\n".join(lines) + "\r\n")

                self.root.after(0, lambda: self._launch_update(updater_cmd))

            except Exception as ex:
                try:
                    if os.path.exists(temp_target):
                        os.remove(temp_target)
                except Exception:
                    pass
                self.root.after(0, lambda: (
                    self.status_var.set("Update failed"),
                    messagebox.showerror("DougDrive Update", str(ex))
                ))

        threading.Thread(target=download, daemon=True).start()

    def _launch_update(self, updater_cmd):
        self.drive.stop_event.set()

        creationflags = (
            getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
            | getattr(subprocess, "DETACHED_PROCESS", 0)
        )

        try:
            subprocess.Popen(
                ["cmd.exe", "/c", updater_cmd],
                creationflags=creationflags,
                close_fds=True
            )
        except Exception as ex:
            self.status_var.set("Update failed")
            messagebox.showerror("DougDrive Update", f"Could not start the updater: {ex}")
            return

        # Let the updater detect our PID disappearing before it replaces the EXE.
        self.root.after(150, self.root.destroy)

    def close(self):
        self.drive.stop_event.set()
        self.root.after(50, self.root.destroy)

if __name__=="__main__":
    root=tk.Tk()
    App(root)
    root.mainloop()
