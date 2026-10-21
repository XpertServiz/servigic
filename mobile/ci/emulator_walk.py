#!/usr/bin/env python3
"""Drives a release build on an Android emulator: launch, (optionally) sign in, tap through every bottom tab, then a
random-input stress run, scanning logcat for the crashes R8 shrinking typically causes (missing classes / methods).

Usage: emulator_walk.py <package> <apk> <out_dir> [phone password]
Exit code 1 if anything crashed or a required screen never appeared."""
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

PKG, APK, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
PHONE = sys.argv[4] if len(sys.argv) > 4 else ""
PASSWORD = sys.argv[5] if len(sys.argv) > 5 else ""

problems: list[str] = []
log_lines: list[str] = []


def adb(*args: str, check: bool = False) -> str:
    r = subprocess.run(["adb", *args], capture_output=True, text=True)
    if check and r.returncode != 0:
        raise RuntimeError(r.stderr)
    return r.stdout


def note(msg: str) -> None:
    print(msg, flush=True)
    log_lines.append(msg)


def shot(name: str) -> None:
    subprocess.run(["adb", "exec-out", "screencap", "-p"], stdout=open(f"{OUT}/{name}.png", "wb"))


def dump() -> list[dict]:
    adb("shell", "uiautomator", "dump", "/sdcard/ui.xml")
    xml = adb("shell", "cat", "/sdcard/ui.xml")
    nodes = []
    try:
        root = ET.fromstring(xml[xml.index("<"):])
    except Exception:
        return nodes
    for n in root.iter("node"):
        m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", n.get("bounds", ""))
        if not m:
            continue
        x1, y1, x2, y2 = map(int, m.groups())
        nodes.append({
            "text": (n.get("text") or "").strip(), "desc": (n.get("content-desc") or "").strip(), "cls": n.get("class", ""),
            "clickable": n.get("clickable") == "true", "x1": x1, "y1": y1, "x2": x2, "y2": y2,
            "cx": (x1 + x2) // 2, "cy": (y1 + y2) // 2,
        })
    return nodes


def dismiss_dialogs() -> None:
    """A slow emulator often shows "Pixel Launcher isn't responding": tap Wait so the real app can start."""
    for _ in range(6):
        nodes = dump()
        txt = " ".join((n["text"] or n["desc"]) for n in nodes)
        if "isn't responding" in txt or "not responding" in txt:
            wait = next((n for n in nodes if (n["text"] or n["desc"]).lower() == "wait"), None)
            if wait:
                adb("shell", "input", "tap", str(wait["cx"]), str(wait["cy"]))
                time.sleep(2)
                continue
        break


def alive() -> bool:
    return bool(adb("shell", "pidof", PKG).strip())


def crashes() -> list[str]:
    out = adb("logcat", "-d", "-v", "brief", "*:E")
    pat = re.compile(r"FATAL EXCEPTION|ClassNotFoundException|NoSuchMethodError|NoSuchFieldError|AbstractMethodError|"
                     r"IncompatibleClassChangeError|Unable to load script|Process: " + re.escape(PKG) + r".*\(has died|ANR in")
    return [l for l in out.splitlines() if pat.search(l) and (PKG in l or "FATAL" in l or "ClassNotFound" in l or "NoSuch" in l)][:15]


def check(label: str) -> None:
    if not alive():
        problems.append(f"{label}: app process is gone")
        note(f"FAIL  {label}: app process is gone")
        return
    c = crashes()
    if c:
        problems.append(f"{label}: {c[0][:160]}")
        note(f"FAIL  {label}: crash lines found\n    " + "\n    ".join(l[:200] for l in c[:5]))
    else:
        note(f"PASS  {label}: no crash, app alive")


def wait_for(pred, timeout: int, step: float = 2.0):
    end = time.time() + timeout
    while time.time() < end:
        nodes = dump()
        if pred(nodes):
            return nodes
        time.sleep(step)
    return None


def type_into(node: dict, text: str) -> None:
    adb("shell", "input", "tap", str(node["cx"]), str(node["cy"]))
    time.sleep(0.8)
    adb("shell", "input", "text", text)
    time.sleep(0.5)


# ---------- install + launch ----------
adb("shell", "settings", "put", "global", "window_animation_scale", "0")
adb("install", "-r", APK, check=True)
for perm in ("ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "POST_NOTIFICATIONS", "RECORD_AUDIO"):
    adb("shell", "pm", "grant", PKG, f"android.permission.{perm}")
adb("logcat", "-c")
time.sleep(20)
dismiss_dialogs()
adb("shell", "monkey", "-p", PKG, "-c", "android.intent.category.LAUNCHER", "1")
time.sleep(25)
dismiss_dialogs()
shot("01-launch")
check("cold start")

first = wait_for(lambda n: len(n) > 3 and not any("responding" in (x["text"] or "") for x in n), 90)
note(f"INFO  first screen texts: {[x['text'] or x['desc'] for x in (first or []) if x['text'] or x['desc']][:12]}")
if not first:
    problems.append("no UI nodes after launch (blank screen)")
    note("FAIL  no UI after launch")

# ---------- sign in ----------
if PHONE and PASSWORD:
    nodes = wait_for(lambda n: sum(1 for x in n if "EditText" in x["cls"]) >= 2, 120)
    if not nodes:
        problems.append("sign-in screen with two inputs never appeared")
        note("FAIL  sign-in screen not found")
    else:
        edits = [x for x in nodes if "EditText" in x["cls"]]
        type_into(edits[0], PHONE)
        type_into(edits[1], PASSWORD)
        adb("shell", "input", "keyevent", "111")  # hide the keyboard
        time.sleep(1)
        nodes = dump()
        btn = next((x for x in nodes if re.fullmatch(r"(?i)(sign in|log in|login|continue)", x["text"] or x["desc"])), None)
        shot("02-signin-filled")
        if btn:
            adb("shell", "input", "tap", str(btn["cx"]), str(btn["cy"]))
        else:
            adb("shell", "input", "keyevent", "66")
        home = wait_for(lambda n: not any("EditText" in x["cls"] for x in n) and len(n) > 6, 90)
        time.sleep(6)
        shot("03-after-signin")
        if not home:
            problems.append("sign-in did not reach a signed-in screen")
            note("FAIL  sign-in did not complete")
        else:
            note("PASS  signed in")
        check("after sign-in")

        # ---------- walk every bottom tab, twice ----------
        for rnd in (1, 2):
            nodes = dump()
            if not nodes:
                break
            height = max(x["y2"] for x in nodes)
            bar = sorted([x for x in nodes if x["cy"] > height * 0.9 and (x["text"] or x["desc"]) and (x["x2"] - x["x1"]) < 600], key=lambda x: x["cx"])
            seen = set()
            tabs = []
            for x in bar:
                label = x["text"] or x["desc"]
                if label not in seen:
                    seen.add(label)
                    tabs.append(x)
            note(f"INFO  round {rnd}: bottom tabs = {[t['text'] or t['desc'] for t in tabs]}")
            for t in tabs:
                label = t["text"] or t["desc"]
                adb("shell", "input", "tap", str(t["cx"]), str(t["cy"]))
                time.sleep(5)
                shot(f"tab-{rnd}-{re.sub(r'[^A-Za-z0-9]+', '_', label)[:24]}")
                check(f"tab '{label}' (round {rnd})")
            if not tabs:
                note("WARN  no bottom tabs found to walk")
                break

# ---------- random-input stress ----------
note("INFO  random-input stress (1200 events)")
r = subprocess.run(["adb", "shell", "monkey", "-p", PKG, "--throttle", "150", "--pct-syskeys", "0", "--pct-appswitch", "0",
                    "-s", "7", "-v", "1200"], capture_output=True, text=True)
tail = "\n".join(r.stdout.splitlines()[-6:])
note(tail)
if "CRASH" in r.stdout or "ANR" in r.stdout:
    problems.append("monkey reported a crash/ANR")
shot("99-after-monkey")
check("after random-input stress")

open(f"{OUT}/walk.log", "w", encoding="utf-8").write("\n".join(log_lines))
open(f"{OUT}/logcat.txt", "w", encoding="utf-8").write(adb("logcat", "-d", "-v", "threadtime"))
print("\nRESULT:", "FAIL - " + "; ".join(problems) if problems else "ALL PASSED")
sys.exit(1 if problems else 0)
