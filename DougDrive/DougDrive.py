import base64
import hashlib
import json
import os
import queue
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import tkinter as tk
from tkinter import ttk, messagebox, filedialog

SUPABASE_URL = "https://tolvtmuolnzhkegphevw.supabase.co"
SUPABASE_KEY = "sb_publishable_nj7z92WGz6tu9KcWWX97CQ_r0Yv7BD3"
BUCKET = "dougdrive"
APP_DIR = os.path.join(os.environ.get("APPDATA", os.path.expanduser("~")), "DougDrive")
CONFIG_FILE = os.path.join(APP_DIR, "config.json")
STATE_FILE = os.path.join(APP_DIR, "state.json")
DEFAULT_FOLDER = os.path.join(os.path.expanduser("~"), "DougDrive")
SYNC_INTERVAL = 5

os.makedirs(APP_DIR, exist_ok=True)

def api(path, method="GET", data=None, token=None, content_type="application/json", raw=False):
    url = SUPABASE_URL + path
    headers = {"apikey": SUPABASE_KEY}
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

def auth_login(email, password):
    status, data = api("/auth/v1/token?grant_type=password", "POST",
                       {"email": email, "password": password})
    return data

def auth_refresh(refresh_token):
    _, data = api("/auth/v1/token?grant_type=refresh_token", "POST",
                  {"refresh_token": refresh_token})
    return data

def remote_list(token):
    # List recursively using the Storage list endpoint.
    found = {}
    folders = [""]
    while folders:
        prefix = folders.pop()
        _, rows = api(f"/storage/v1/object/list/{BUCKET}", "POST",
                      {"prefix": prefix, "limit": 1000, "offset": 0, "sortBy": {"column": "name", "order": "asc"}},
                      token)
        for row in rows:
            name = row.get("name", "")
            full = prefix + name
            if row.get("id") is None:
                folders.append(full.rstrip("/") + "/")
            else:
                found[full] = row
    return found

def remote_download(token, path):
    encoded = "/".join(urllib.parse.quote(x, safe="") for x in path.split("/"))
    _, data = api(f"/storage/v1/object/authenticated/{BUCKET}/{encoded}", "GET", token=token, raw=True)
    return data

def remote_upload(token, path, data):
    encoded = "/".join(urllib.parse.quote(x, safe="") for x in path.split("/"))
    api(f"/storage/v1/object/{BUCKET}/{encoded}", "POST", data=data, token=token,
        content_type="application/octet-stream")

def remote_delete(token, path):
    encoded = "/".join(urllib.parse.quote(x, safe="") for x in path.split("/"))
    api(f"/storage/v1/object/{BUCKET}/{encoded}", "DELETE", token=token)

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
        cfg = load_json(CONFIG_FILE, {})
        cfg.update({"email": email, "folder": self.folder, "refresh_token": self.refresh_token})
        save_json(CONFIG_FILE, cfg)
        self.log("Signed in successfully.")
        self.status("Connected")
        return True

    def try_saved_login(self):
        cfg = load_json(CONFIG_FILE, {})
        rt = cfg.get("refresh_token")
        if not rt: return False
        try:
            data = auth_refresh(rt)
            self.token = data["access_token"]
            self.refresh_token = data.get("refresh_token", rt)
            cfg["refresh_token"] = self.refresh_token
            save_json(CONFIG_FILE, cfg)
            self.status("Connected")
            return True
        except Exception:
            return False

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
            prefix = (self.user_id or "").lower() + "/"
            remote = {k[len(prefix):]: v for k, v in remote.items() if k.startswith(prefix)}
            # Safety: if user id couldn't be read, don't touch storage.
            if not self.user_id:
                raise RuntimeError("Could not determine the signed-in account.")
            changed = 0
            all_paths = set(local) | set(remote) | set(self.state)
            for rel in sorted(all_paths):
                lp = os.path.join(self.folder, *rel.split("/"))
                l = local.get(rel)
                r = remote.get(rel)
                old = self.state.get(rel, {})
                local_changed = l is not None and (old.get("local_mtime") != l["mtime"] or old.get("local_size") != l["size"])
                remote_updated = (r or {}).get("updated_at", "")
                remote_changed = r is not None and (old.get("remote_updated") != remote_updated or old.get("remote_size") != (r.get("metadata") or {}).get("size"))
                if l and not r:
                    with open(lp, "rb") as f: data = f.read()
                    remote_upload(self.token, prefix + rel, data)
                    changed += 1
                    self.log("↑ " + rel)
                    continue
                if r and not l:
                    os.makedirs(os.path.dirname(lp), exist_ok=True)
                    data = remote_download(self.token, prefix + rel)
                    with open(lp, "wb") as f: f.write(data)
                    changed += 1
                    self.log("↓ " + rel)
                    continue
                if not l or not r: continue
                if not local_changed and not remote_changed:
                    continue
                if remote_changed and not local_changed:
                    os.makedirs(os.path.dirname(lp), exist_ok=True)
                    data = remote_download(self.token, prefix + rel)
                    with open(lp, "wb") as f: f.write(data)
                    changed += 1
                    self.log("↓ " + rel)
                elif local_changed and not remote_changed:
                    with open(lp, "rb") as f: data = f.read()
                    remote_upload(self.token, prefix + rel, data)
                    changed += 1
                    self.log("↑ " + rel)
                else:
                    # Both changed since the last sync. Newer local modification wins.
                    if l["mtime"] >= time.time() - 2 or l["mtime"] >= old.get("local_mtime", 0):
                        with open(lp, "rb") as f: data = f.read()
                        remote_upload(self.token, prefix + rel, data)
                        self.log("↑ conflict → local wins: " + rel)
                    else:
                        data = remote_download(self.token, prefix + rel)
                        with open(lp, "wb") as f: f.write(data)
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
                        cfg["refresh_token"] = self.refresh_token
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
        if self.drive.try_saved_login():
            self.login_frame.pack_forget()
            self.drive_frame.pack(fill="both", expand=True)
            self.start_sync()
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

    def close(self):
        self.drive.stop_event.set()
        self.root.destroy()

if __name__=="__main__":
    root=tk.Tk()
    App(root)
    root.mainloop()
