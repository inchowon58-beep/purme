# -*- coding: utf-8 -*-
"""키워드 × 지역 조합 발행 큐."""

from __future__ import annotations

import json
import os
import random
from dataclasses import asdict, dataclass, field
from datetime import date
from typing import List, Literal, Optional

OrderMode = Literal["sequential", "random"]


@dataclass
class QueueState:
    keywords: List[str] = field(default_factory=list)
    regions: List[str] = field(default_factory=list)
    pending: List[str] = field(default_factory=list)  # 조합 키워드 큐
    total_target: int = 0
    daily_limit: int = 50
    order_mode: OrderMode = "random"
    published_count: int = 0
    last_run_date: str = ""
    created_at: str = ""
    updated_at: str = ""

    @property
    def remaining(self) -> int:
        return len(self.pending)

    @property
    def days_left(self) -> int:
        if self.daily_limit <= 0 or not self.pending:
            return 0
        return (len(self.pending) + self.daily_limit - 1) // self.daily_limit


def parse_lines(text: str) -> List[str]:
    out: List[str] = []
    seen = set()
    for line in (text or "").splitlines():
        s = line.strip()
        if not s or s in seen:
            continue
        seen.add(s)
        out.append(s)
    return out


def build_combos(keywords: List[str], regions: List[str]) -> List[str]:
    """{지역}{키워드} — 지역이 비면 키워드만."""
    kws = [k.strip() for k in keywords if k.strip()]
    regs = [r.strip() for r in regions if r.strip()]
    if not kws:
        return []
    if not regs:
        return list(kws)
    combos: List[str] = []
    for region in regs:
        for kw in kws:
            combos.append(f"{region}{kw}")
    return combos


def fill_queue(
    keywords: List[str],
    regions: List[str],
    total_target: int,
    daily_limit: int = 50,
    order_mode: OrderMode = "random",
) -> QueueState:
    total_target = max(1, int(total_target))
    daily_limit = max(1, min(10000, int(daily_limit)))
    combos = build_combos(keywords, regions)
    if not combos:
        raise ValueError("키워드를 한 줄 이상 입력하세요.")

    pending: List[str] = []
    i = 0
    while len(pending) < total_target:
        pending.append(combos[i % len(combos)])
        i += 1

    if order_mode == "random":
        random.shuffle(pending)

    now = date.today().isoformat()
    return QueueState(
        keywords=list(keywords),
        regions=list(regions),
        pending=pending,
        total_target=total_target,
        daily_limit=daily_limit,
        order_mode=order_mode,
        published_count=0,
        last_run_date="",
        created_at=now,
        updated_at=now,
    )


def dequeue(state: QueueState, n: Optional[int] = None) -> List[str]:
    """큐에서 최대 n건 꺼냄 (기본: daily_limit)."""
    take = state.daily_limit if n is None else max(1, int(n))
    take = min(take, len(state.pending))
    batch = state.pending[:take]
    state.pending = state.pending[take:]
    state.published_count += len(batch)
    state.updated_at = date.today().isoformat()
    return batch


def peek(state: QueueState, n: Optional[int] = None) -> List[str]:
    take = state.daily_limit if n is None else max(1, int(n))
    return state.pending[: min(take, len(state.pending))]


def load_queue(path: str) -> Optional[QueueState]:
    if not os.path.isfile(path):
        return None
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return QueueState(
            keywords=list(data.get("keywords") or []),
            regions=list(data.get("regions") or []),
            pending=list(data.get("pending") or []),
            total_target=int(data.get("total_target") or 0),
            daily_limit=int(data.get("daily_limit") or 50),
            order_mode=data.get("order_mode") or "random",
            published_count=int(data.get("published_count") or 0),
            last_run_date=str(data.get("last_run_date") or ""),
            created_at=str(data.get("created_at") or ""),
            updated_at=str(data.get("updated_at") or ""),
        )
    except (OSError, json.JSONDecodeError, TypeError, ValueError):
        return None


def save_queue(path: str, state: QueueState) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(asdict(state), f, ensure_ascii=False, indent=2)
