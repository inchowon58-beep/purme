# -*- coding: utf-8 -*-
"""Flask 웹 UI + 일반 브라우저 새 창 실행 (콘솔 없음)."""

from __future__ import annotations

import os
import socket
import threading
import time
import webbrowser
from pathlib import Path

from flask import Flask, jsonify, render_template, request

from project_paths import webdoc_dir
from runtime import RUNTIME


def _resource_dir() -> Path:
    import sys

    if getattr(sys, "frozen", False):
        meipass = Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent))
        cand = meipass / "templates"
        if cand.is_dir():
            return meipass
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


ROOT = _resource_dir()
app = Flask(
    __name__,
    template_folder=str(ROOT / "templates"),
    static_folder=None,
)


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/state")
def api_state():
    return jsonify(RUNTIME.snapshot())


@app.post("/api/settings")
def api_settings():
    data = request.get_json(force=True, silent=True) or {}
    RUNTIME.save_settings(data)
    return jsonify(RUNTIME.snapshot())


@app.post("/api/queue/build")
def api_queue_build():
    try:
        result = RUNTIME.build_queue()
        snap = RUNTIME.snapshot()
        snap.update(result)
        return jsonify(snap)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.post("/api/batch/run")
def api_batch_run():
    RUNTIME.start_batch(from_schedule=False)
    return jsonify(RUNTIME.snapshot())


@app.post("/api/batch/stop")
def api_batch_stop():
    RUNTIME.request_stop()
    return jsonify(RUNTIME.snapshot())


@app.post("/api/schedule")
def api_schedule():
    data = request.get_json(force=True, silent=True) or {}
    try:
        RUNTIME.set_schedule_enabled(
            bool(data.get("enabled")),
            str(data.get("time") or "09:00"),
        )
        return jsonify(RUNTIME.snapshot())
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.post("/api/naver/pending")
def api_naver_pending():
    RUNTIME.start_naver_pending()
    return jsonify(RUNTIME.snapshot())


@app.post("/api/admin/unlock")
def api_admin_unlock():
    data = request.get_json(force=True, silent=True) or {}
    ok = RUNTIME.unlock_admin(str(data.get("password") or ""))
    snap = RUNTIME.snapshot()
    if not ok:
        return jsonify({"error": "비밀번호가 올바르지 않습니다.", **snap}), 403
    return jsonify(snap)


@app.post("/api/admin/lock")
def api_admin_lock():
    RUNTIME.lock_admin()
    return jsonify(RUNTIME.snapshot())


@app.post("/api/quit")
def api_quit():
    """UI에서 완전 종료 (스케줄 포함)."""
    RUNTIME.request_quit()

    def _die() -> None:
        time.sleep(0.4)
        os._exit(0)

    threading.Thread(target=_die, daemon=True).start()
    return jsonify({"ok": True})


def find_free_port(prefer: int = 17865) -> int:
    for port in [prefer, *range(prefer + 1, prefer + 30)]:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return prefer


def run_browser_ui(port: int) -> None:
    """일반 브라우저 새 창으로 UI 열기 (Chrome --app 아님)."""
    url = f"http://127.0.0.1:{port}/"

    def serve() -> None:
        app.run(host="127.0.0.1", port=port, threaded=True, use_reloader=False)

    threading.Thread(target=serve, daemon=True).start()
    for _ in range(50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", port)) == 0:
                break
        time.sleep(0.1)

    # new=1 → 가능하면 새 창, new=2 → 새 탭
    try:
        webbrowser.open(url, new=1)
    except Exception:
        webbrowser.open(url)

    # 브라우저를 닫아도 백엔드는 유지 — [프로그램 종료] 로만 끝냄
    while not RUNTIME.quit_requested:
        time.sleep(0.4)

    RUNTIME.shutdown()
    os._exit(0)


# 하위 호환
def run_chrome_app(port: int) -> None:
    run_browser_ui(port)
