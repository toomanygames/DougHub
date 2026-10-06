import base64
import hashlib
import json
import os
import sys
import queue
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
            body = r.read()
            return json.loads(body.decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try: detail = json.loads(raw)
        except Exception: detail = {"message": raw}
        raise RuntimeError(detail.get("msg") or detail.get("message") or raw or f"HTTP {e.code}")

def drive_request(token, action="list", path="", method="GET", data=None, raw=False):
    # DougBase storage is accessed through the DougDrive Edge Function,
    # which validates the DougHub session before touching private storage.
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

