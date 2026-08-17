# -*- coding: utf-8 -*-
"""조경인테리어 푸르메정원 SEO·블로그 등록기 — 웹앱 UI 진입점 (콘솔 없음).

일반 브라우저 새 창으로 UI를 엽니다.
"""

from __future__ import annotations

import os
import sys


def _ensure_stdio() -> None:
    """windowed(PyInstaller) 모드에서 stdout/stderr 가 None 이어도 안전."""
    if sys.stdout is None:
        sys.stdout = open(os.devnull, "w", encoding="utf-8")
    if sys.stderr is None:
        sys.stderr = open(os.devnull, "w", encoding="utf-8")


def main() -> None:
    _ensure_stdio()
    from webui import find_free_port, run_browser_ui

    port = find_free_port()
    run_browser_ui(port)


if __name__ == "__main__":
    main()
