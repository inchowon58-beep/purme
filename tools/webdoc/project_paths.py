# -*- coding: utf-8 -*-
"""프로젝트 루트·스크립트 경로 (소스 / exe 공통)."""

from __future__ import annotations

import os
import re
import sys
from typing import Optional


def project_root() -> str:
    starts = []
    if getattr(sys, "frozen", False):
        starts.append(os.path.dirname(sys.executable))
    starts.append(os.path.dirname(os.path.abspath(__file__)))
    # cwd 도 후보 (exe를 프로젝트에서 실행한 경우)
    starts.append(os.getcwd())

    for start in starts:
        cur = os.path.abspath(start)
        for _ in range(10):
            pkg = os.path.join(cur, "package.json")
            pub = os.path.join(cur, "public")
            if os.path.isfile(pkg) and os.path.isdir(pub):
                return cur
            parent = os.path.dirname(cur)
            if parent == cur:
                break
            cur = parent

    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def blob_upload_script() -> str:
    root = project_root()
    # 프로젝트 원본을 우선 (exe 임시폴더는 .env 경로가 깨짐)
    candidates = [
        os.path.join(root, "tools", "webdoc", "blob-upload.mjs"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "blob-upload.mjs"),
    ]
    meipass = getattr(sys, "_MEIPASS", None)
    if meipass:
        candidates.append(os.path.join(meipass, "blob-upload.mjs"))
    for path in candidates:
        if os.path.isfile(path):
            return path
    return candidates[0]


def webdoc_dir() -> str:
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def load_blob_token() -> Optional[str]:
    env = os.environ.get("BLOB_READ_WRITE_TOKEN", "").strip()
    if env:
        return env

    root = project_root()
    for name in (".env.local", ".env"):
        path = os.path.join(root, name)
        if not os.path.isfile(path):
            continue
        try:
            text = open(path, encoding="utf-8").read()
        except OSError:
            continue
        m = re.search(
            r"^(?:export\s+)?BLOB_READ_WRITE_TOKEN\s*=\s*[\"']?([^\"'\r\n#]+)[\"']?",
            text,
            re.M,
        )
        if m:
            return m.group(1).strip()
        m2 = re.search(
            r"^(?:export\s+)?(\w*BLOB\w*READ_WRITE_TOKEN)\s*=\s*[\"']?([^\"'\r\n#]+)[\"']?",
            text,
            re.M,
        )
        if m2:
            return m2.group(2).strip()
    return None
