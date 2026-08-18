# -*- coding: utf-8 -*-
"""로컬 settings.json / queue_state.json 경로·입출력."""

from __future__ import annotations

import json
import os
from typing import Any, Dict

from project_paths import webdoc_dir

DEFAULT_VM_PATH = ""
DEFAULT_SITE_URL = "https://www.purmegarden.co.kr"


def settings_path() -> str:
    return os.path.join(webdoc_dir(), "settings.json")


def queue_path() -> str:
    return os.path.join(webdoc_dir(), "queue_state.json")


def default_settings() -> Dict[str, Any]:
    return {
        "site_url": DEFAULT_SITE_URL,
        "out_dir": os.path.join(webdoc_dir(), "output"),
        "keywords_text": "정원인테리어\n테라스인테리어\n조경인테리어\n정원시공\n테라스시공\n옥상정원",
        "regions_text": "서울\n부산\n대구\n인천\n광주\n대전\n울산\n수원\n성남\n고양",
        "total_target": "500",
        "daily_limit": "30",
        "order_mode": "random",
        "do_indexnow": True,
        "open_chrome_after": True,
        "schedule_enabled": False,
        "schedule_time": "09:00",
        "auto_naver_register": True,
        "vm_path": "",
        "blob_token": "",
        "naver_id": "",
        "naver_password": "",
        "naver_site": DEFAULT_SITE_URL,
        "twocaptcha_api_key": "",
        "naver_daily_limit": "50",
        "naver_delay_min": "3",
        "naver_delay_max": "8",
        "schedule_last_run_date": "",
        "gen_mode": "template",
        "gemini_api_key": "",
        "gemini_model": "gemini-3.5-flash-lite",
        "gemini_prompt": (
            "톤: 신뢰감 있는 정원·테라스 인테리어 상담 안내. 과장·허위·보장성 표현 금지.\n"
            "키워드에 지역명이 있으면 그 지역에서 상담·시공 문의하는 독자 시점으로 쓰세요.\n"
            "본문은 정보성 가이드처럼, 광고 카피처럼 쓰지 마세요.\n"
            "{keyword}를 제목·H1·본문·FAQ에 자연스럽게 넣으세요.\n"
        ),
    }


def load_settings() -> Dict[str, Any]:
    path = settings_path()
    base = default_settings()
    if not os.path.isfile(path):
        return base
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            base.update(data)
    except (OSError, json.JSONDecodeError):
        pass
    return base


def save_settings(data: Dict[str, Any]) -> None:
    path = settings_path()
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
