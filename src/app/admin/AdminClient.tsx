"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { absoluteUrl } from "@/lib/site";

const PAGE_SIZE = 25;

type PageItem = {
  slug: string;
  keyword: string;
  title: string;
  path: string;
  createdAt: string;
};

type OrderItem = {
  id: string;
  name: string;
  phone: string;
  address: string;
  product: string;
  productLabel: string;
  quantity: string;
  memo: string;
  status: string;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  new: "답변대기",
  contacted: "연락완료",
  done: "답변완료",
  cancelled: "취소",
};

const STATUS_STYLE: Record<string, string> = {
  new: "bg-[#fff0eb] text-[#e85d3d] ring-1 ring-[#ffd4c8]",
  contacted: "bg-[#e8f1ff] text-[#3d6fd4] ring-1 ring-[#c9dbff]",
  done: "bg-[#eaf7f1] text-[#1f7a4d] ring-1 ring-[#c6ead7]",
  cancelled: "bg-[#f3f4f6] text-[#6b7280] ring-1 ring-[#e5e7eb]",
};

function shortText(text: string, max = 28) {
  const t = (text || "").trim();
  if (!t) return "—";
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function formatInquiryTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminClient() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<"orders" | "publish" | "telegram">("orders");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [keyword, setKeyword] = useState("정원인테리어");
  const [mode, setMode] = useState<"gemini" | "template">("template");
  const [apiKey, setApiKey] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<PageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [copiedSlug, setCopiedSlug] = useState("");
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotalPages, setOrderTotalPages] = useState(1);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [deletingOrders, setDeletingOrders] = useState(false);
  const [inquiryFilter, setInquiryFilter] = useState<"all" | "new" | "done">("all");
  const [telegramStatus, setTelegramStatus] = useState<{
    enabled: boolean;
    botUsername: string;
    botUrl: string;
    chatIdConfigured: boolean;
    chatIdHint: string | null;
    ownerChatIdHint: string;
    recipientCount?: number;
  } | null>(null);
  const [telegramMsg, setTelegramMsg] = useState("");
  const [telegramTesting, setTelegramTesting] = useState(false);
  const [detailOrder, setDetailOrder] = useState<OrderItem | null>(null);

  function absolutePageUrl(path: string) {
    if (!path) return absoluteUrl("/guide");
    if (path.startsWith("http")) {
      try {
        const u = new URL(path);
        return absoluteUrl(`${u.pathname}${u.search}`.replace(/\/+$/, "") || "/");
      } catch {
        return absoluteUrl("/guide");
      }
    }
    return absoluteUrl(path.replace(/\/+$/, "") || "/");
  }

  async function copyPageUrl(path: string, slug: string) {
    const url = absolutePageUrl(path);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(""), 1800);
    } catch {
      window.prompt("주소를 복사하세요", url);
    }
  }

  const loadPages = useCallback(async (p = 1) => {
    const res = await fetch(`/api/admin/pages?page=${p}`);
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const data = await res.json();
    setItems(data.items || []);
    setTotal(data.total || 0);
    setPage(data.page || 1);
    setTotalPages(data.totalPages || 1);
    setAuthed(true);
  }, []);

  const loadOrders = useCallback(async (p = 1) => {
    const res = await fetch(`/api/admin/orders?page=${p}`);
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const data = await res.json();
    setOrders(data.items || []);
    setOrderTotal(data.total || 0);
    setOrderPage(data.page || 1);
    setOrderTotalPages(data.totalPages || 1);
    setSelectedOrderIds([]);
    setAuthed(true);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/orders?page=1");
        if (res.ok) {
          const data = await res.json();
          setOrders(data.items || []);
          setOrderTotal(data.total || 0);
          setOrderPage(data.page || 1);
          setOrderTotalPages(data.totalPages || 1);
          setAuthed(true);
          await loadPages(1);
        }
      } finally {
        setChecking(false);
      }
    })();
  }, [loadPages]);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setLoginError(data.error || "로그인 실패");
      return;
    }
    setAuthed(true);
    await Promise.all([loadOrders(1), loadPages(1)]);
  }

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthed(false);
  }

  async function onPublish(e: FormEvent) {
    e.preventDefault();
    setPublishing(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          mode,
          apiKey: apiKey || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "발행 실패");
      setMessage(
        `발행 완료: ${data.path}` +
          (data.indexNow ? `\nIndexNow: ${data.indexNow.message}` : "")
      );
      await loadPages(1);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "발행 실패");
    } finally {
      setPublishing(false);
    }
  }

  async function changeOrderStatus(id: string, status: string) {
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) await loadOrders(orderPage);
  }

  function toggleOrderSelect(id: string) {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAllOrders() {
    if (selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedOrderIds([]);
      return;
    }
    setSelectedOrderIds(filteredOrders.map((o) => o.id));
  }

  async function deleteSelectedOrders() {
    if (!selectedOrderIds.length) return;
    if (!confirm(`선택한 문의 ${selectedOrderIds.length}건을 삭제할까요?`)) return;
    setDeletingOrders(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedOrderIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "삭제에 실패했습니다.");
        return;
      }
      await loadOrders(orderPage);
    } finally {
      setDeletingOrders(false);
    }
  }

  const loadTelegramStatus = useCallback(async () => {
    const res = await fetch("/api/admin/telegram");
    if (!res.ok) return;
    const data = await res.json();
    setTelegramStatus(data);
  }, []);

  useEffect(() => {
    if (authed) void loadTelegramStatus();
  }, [authed, loadTelegramStatus]);

  async function sendTelegramTest() {
    setTelegramTesting(true);
    setTelegramMsg("");
    try {
      const res = await fetch("/api/admin/telegram", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setTelegramMsg(data.message || (res.ok ? "전송 완료" : "전송 실패"));
      await loadTelegramStatus();
    } finally {
      setTelegramTesting(false);
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (inquiryFilter === "new") return o.status === "new";
    if (inquiryFilter === "done") return o.status === "done" || o.status === "contacted";
    return true;
  });

  const waitingCount = orders.filter((o) => o.status === "new").length;
  const doneCount = orders.filter((o) => o.status === "done" || o.status === "contacted").length;

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-24">
        <p className="text-[var(--muted)]">확인 중…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-24">
        <form
          onSubmit={onLogin}
          className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-8 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
        >
          <p className="text-sm font-bold text-[var(--orange)]">Admin</p>
          <h1 className="mt-2 text-3xl font-extrabold text-[var(--navy)]">관리자 로그인</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            푸르메정원 · 문의·SEO 발행 관리
          </p>
          <label className="mt-6 block text-sm font-semibold">
            아이디
            <input
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="mt-4 block text-sm font-semibold">
            비밀번호
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {loginError && <p className="mt-3 text-sm text-red-700">{loginError}</p>}
          <button type="submit" className="btn-primary mt-6 w-full">
            로그인
          </button>
          <Link href="/" className="mt-4 block text-center text-sm text-[var(--muted)]">
            ← 사이트로 돌아가기
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className="container min-h-screen py-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[var(--orange)]">Dashboard</p>
          <h1 className="text-4xl font-extrabold text-[var(--navy)]">관리자</h1>
          <p className="mt-2 text-[var(--muted)]">
            문의 <strong className="text-[var(--ink)]">{orderTotal}</strong>건 · SEO 글{" "}
            <strong className="text-[var(--ink)]">{total}</strong>건
          </p>
        </div>
        <button type="button" onClick={onLogout} className="btn-secondary !text-[var(--navy)] !border-[var(--line)]">
          로그아웃
        </button>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("orders")}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${
            tab === "orders" ? "bg-[var(--orange)] text-white" : "bg-white border border-[var(--line)]"
          }`}
        >
          신청문의
        </button>
        <button
          type="button"
          onClick={() => setTab("publish")}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${
            tab === "publish" ? "bg-[var(--orange)] text-white" : "bg-white border border-[var(--line)]"
          }`}
        >
          SEO 발행
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("telegram");
            void loadTelegramStatus();
          }}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${
            tab === "telegram" ? "bg-[var(--orange)] text-white" : "bg-white border border-[var(--line)]"
          }`}
        >
          텔레그램설정
        </button>
      </div>

      {tab === "orders" && (
        <div className="mt-8 space-y-5">
          {/* 문의 목록 */}
          <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_32px_rgba(28,36,52,0.05)]">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] px-4 py-4 md:px-5">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--navy)] md:text-2xl">푸르메정원 문의목록</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  총 {orderTotal}건 · 가독성 있게 한 줄씩 확인하세요
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSelectAllOrders}
                  disabled={filteredOrders.length === 0}
                  className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                >
                  {selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0
                    ? "선택 해제"
                    : "전체 선택"}
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedOrders}
                  disabled={!selectedOrderIds.length || deletingOrders}
                  className="rounded-lg bg-[#dc2626] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                >
                  {deletingOrders ? "삭제 중…" : `선택 삭제 (${selectedOrderIds.length})`}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-[var(--line)] bg-[#f8fafc] px-4 py-3 md:px-5">
              {(
                [
                  { key: "all", label: `전체보기 (${orders.length})` },
                  { key: "new", label: `미처리 (${waitingCount})` },
                  { key: "done", label: `답변완료 (${doneCount})` },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setInquiryFilter(f.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    inquiryFilter === f.key
                      ? "bg-[var(--navy)] text-white"
                      : "bg-white text-[var(--muted)] ring-1 ring-[var(--line)]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <p className="text-base font-bold text-[var(--navy)]">표시할 문의가 없습니다</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  메인에서 상담 신청이 오면 이 목록에 나타납니다.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-[#f1f5f9] text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                    <tr>
                      <th className="w-10 px-3 py-3" />
                      <th className="px-3 py-3">상태</th>
                      <th className="px-3 py-3">신청자</th>
                      <th className="px-3 py-3">연락처</th>
                      <th className="px-3 py-3">유형</th>
                      <th className="px-3 py-3">내용</th>
                      <th className="px-3 py-3">접수</th>
                      <th className="px-3 py-3">처리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o) => {
                      const selected = selectedOrderIds.includes(o.id);
                      const preview =
                        o.memo?.trim() ||
                        (o.address && o.address !== "미입력" ? o.address : "") ||
                        o.productLabel ||
                        "";
                      return (
                        <tr
                          key={o.id}
                          className={`border-t border-[var(--line)] ${
                            selected ? "bg-[#fff7f4]" : "bg-white hover:bg-[#f8fafc]"
                          }`}
                        >
                          <td className="px-3 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[var(--coral)]"
                              checked={selected}
                              onChange={() => toggleOrderSelect(o.id)}
                              aria-label={`${o.name} 선택`}
                            />
                          </td>
                          <td
                            className="cursor-pointer px-3 py-3 align-middle"
                            onClick={() => setDetailOrder(o)}
                          >
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${
                                STATUS_STYLE[o.status] || STATUS_STYLE.new
                              }`}
                            >
                              {STATUS_LABEL[o.status] || o.status}
                            </span>
                          </td>
                          <td
                            className="cursor-pointer px-3 py-3 align-middle font-bold text-[var(--navy)]"
                            onClick={() => setDetailOrder(o)}
                          >
                            {o.name}
                          </td>
                          <td className="px-3 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                            <a
                              href={`tel:${o.phone.replace(/-/g, "")}`}
                              className="font-semibold text-[var(--sky-deep)] underline-offset-2 hover:underline"
                            >
                              {o.phone}
                            </a>
                          </td>
                          <td
                            className="cursor-pointer px-3 py-3 align-middle text-[var(--ink)]"
                            onClick={() => setDetailOrder(o)}
                          >
                            {shortText(o.productLabel, 12)}
                          </td>
                          <td
                            className="max-w-[200px] cursor-pointer px-3 py-3 align-middle text-[var(--muted)]"
                            onClick={() => setDetailOrder(o)}
                            title="클릭하면 상세 보기"
                          >
                            <span className="line-clamp-1">{shortText(preview, 32)}</span>
                            <span className="mt-0.5 block text-[0.7rem] font-semibold text-[var(--sky)]">
                              상세보기
                            </span>
                          </td>
                          <td
                            className="cursor-pointer whitespace-nowrap px-3 py-3 align-middle text-xs text-[var(--muted)]"
                            onClick={() => setDetailOrder(o)}
                          >
                            {formatInquiryTime(o.createdAt)}
                          </td>
                          <td className="px-3 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                            <select
                              className="w-full min-w-[110px] rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-xs font-semibold"
                              value={o.status}
                              onChange={(e) => changeOrderStatus(o.id, e.target.value)}
                            >
                              <option value="new">답변대기</option>
                              <option value="contacted">연락완료</option>
                              <option value="done">답변완료</option>
                              <option value="cancelled">취소</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {detailOrder && (
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="문의 상세"
              onClick={() => setDetailOrder(null)}
            >
              <div
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl md:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold tracking-wide text-[var(--sky)]">INQUIRY DETAIL</p>
                    <h3 className="mt-1 text-xl font-extrabold text-[var(--navy)]">
                      {detailOrder.name} 님 문의
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-[var(--line)] px-3 py-1 text-sm font-semibold"
                    onClick={() => setDetailOrder(null)}
                  >
                    닫기
                  </button>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${
                        STATUS_STYLE[detailOrder.status] || STATUS_STYLE.new
                      }`}
                    >
                      {STATUS_LABEL[detailOrder.status] || detailOrder.status}
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      {formatInquiryTime(detailOrder.createdAt)}
                    </span>
                  </div>

                  <div className="rounded-xl bg-[#f8fafc] px-4 py-3">
                    <p className="text-xs font-bold text-[var(--muted)]">연락처</p>
                    <a
                      href={`tel:${detailOrder.phone.replace(/-/g, "")}`}
                      className="mt-1 inline-block text-base font-bold text-[var(--sky-deep)]"
                    >
                      {detailOrder.phone}
                    </a>
                  </div>

                  <div className="rounded-xl bg-[#f8fafc] px-4 py-3">
                    <p className="text-xs font-bold text-[var(--muted)]">문의 유형</p>
                    <p className="mt-1 font-semibold text-[var(--navy)]">{detailOrder.productLabel}</p>
                  </div>

                  {detailOrder.address && detailOrder.address !== "미입력" && (
                    <div className="rounded-xl bg-[#f8fafc] px-4 py-3">
                      <p className="text-xs font-bold text-[var(--muted)]">지역</p>
                      <p className="mt-1 text-[var(--ink)]">{detailOrder.address}</p>
                    </div>
                  )}

                  <div className="rounded-xl bg-[#f8fafc] px-4 py-3">
                    <p className="text-xs font-bold text-[var(--muted)]">상세 내용</p>
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed text-[var(--ink)]">
                      {detailOrder.memo?.trim() || "내용 없음"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <label className="text-xs font-semibold text-[var(--muted)]">상태 변경</label>
                    <select
                      className="flex-1 rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-semibold"
                      value={detailOrder.status}
                      onChange={async (e) => {
                        const next = e.target.value;
                        await changeOrderStatus(detailOrder.id, next);
                        setDetailOrder({ ...detailOrder, status: next });
                      }}
                    >
                      <option value="new">답변대기</option>
                      <option value="contacted">연락완료</option>
                      <option value="done">답변완료</option>
                      <option value="cancelled">취소</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-2">
            {Array.from({ length: Math.max(1, orderTotalPages) }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => loadOrders(n)}
                className={`min-w-9 rounded-full px-2 py-1 text-sm ${
                  n === orderPage
                    ? "bg-[var(--sky)] text-white"
                    : "border border-[var(--line)] bg-white"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "telegram" && (
        <div className="mt-8">
          <section className="rounded-2xl border border-[#c9dbff] bg-[#f3f7ff] p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tracking-wide text-[var(--sky-deep)]">TELEGRAM ALERT</p>
                <h2 className="mt-1 text-xl font-extrabold text-[var(--navy)]">텔레그램 설정</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  본인({telegramStatus?.ownerChatIdHint || "8433555162"})은 이미 연결돼 있습니다.
                  <strong className="text-[var(--navy)]"> 전화를 받을 운영자</strong>도 같이 받으려면
                  아래처럼 <strong className="text-[var(--navy)]">단톡방(그룹)</strong>을 만드세요.
                </p>

                <div className="mt-4 rounded-xl border border-white bg-white/90 p-4 text-sm text-[var(--ink)] shadow-sm">
                  <p className="font-extrabold text-[var(--navy)]">운영자를 채팅방에 넣는 방법</p>
                  <ol className="mt-2 list-decimal space-y-2 pl-5 leading-relaxed">
                    <li>
                      텔레그램에서 <b>새 그룹</b>을 만듭니다.
                      <br />
                      <span className="text-[var(--muted)]">이름 예: 푸르메정원 문의알림</span>
                    </li>
                    <li>
                      그룹에 <b>본인</b> + <b>운영자</b> + 봇
                      <code className="mx-1 rounded bg-[#e8f1ff] px-1.5 py-0.5 text-xs">
                        @{telegramStatus?.botUsername || "purme_alert_bot"}
                      </code>
                      를 초대합니다.
                    </li>
                    <li>
                      그룹에서 봇에게 <code className="rounded bg-[#e8f1ff] px-1.5 py-0.5 text-xs">/start</code> 를
                      보냅니다. (안 되면 그룹 → 봇 → 관리자로 지정)
                    </li>
                    <li>
                      그룹 ID를 확인합니다. (보통 <b>-100</b>으로 시작하는 숫자)
                      <br />
                      <span className="text-[var(--muted)]">
                        방법: 그룹에 아무 말 → 브라우저에서
                        <code className="mx-1 break-all rounded bg-[#eef2f7] px-1 text-[0.7rem]">
                          api.telegram.org/bot토큰/getUpdates
                        </code>
                        열어 <code className="rounded bg-[#eef2f7] px-1 text-[0.7rem]">chat.id</code> 확인
                      </span>
                    </li>
                    <li>
                      사이트 Environment Variables에서
                      <br />
                      <code className="rounded bg-[#fff0eb] px-1.5 py-0.5 text-xs font-bold">
                        TELEGRAM_CHAT_ID
                      </code>
                      를 <b>그룹 ID</b>로 바꾸거나,
                      <br />
                      개인+운영자 각각이면{" "}
                      <code className="rounded bg-[#fff0eb] px-1.5 py-0.5 text-xs">
                        8433555162,운영자ID
                      </code>{" "}
                      처럼 쉼표로 넣습니다.
                    </li>
                    <li>
                      저장 후 <b>Redeploy</b> → 아래 「테스트 알림」으로 단톡/운영자 폰 확인
                    </li>
                  </ol>
                  <p className="mt-3 rounded-lg bg-[#e8f1ff] px-3 py-2 text-xs text-[var(--sky-deep)]">
                    팁: 개인 채팅(본인만)은 본인만 받습니다. 운영자와 같이 받으려면 반드시
                    <b> 그룹 단톡</b> 또는 <b>ID 여러 개(쉼표)</b>가 필요합니다.
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-white px-3 py-1 font-semibold text-[var(--navy)] ring-1 ring-[var(--line)]">
                    내 ID: 8433555162
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 font-semibold text-[var(--navy)] ring-1 ring-[var(--line)]">
                    봇: @{telegramStatus?.botUsername || "purme_alert_bot"}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 font-semibold text-[var(--navy)] ring-1 ring-[var(--line)]">
                    수신 {telegramStatus?.recipientCount ?? 1}곳
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 font-bold ${
                      telegramStatus?.enabled
                        ? "bg-[#eaf7f1] text-[#1f7a4d]"
                        : "bg-[#fff0eb] text-[#e85d3d]"
                    }`}
                  >
                    {telegramStatus?.enabled ? "알림 연결됨" : "환경변수 확인 필요"}
                  </span>
                </div>
                {telegramMsg && (
                  <p className="mt-2 text-sm font-semibold text-[var(--navy)]">{telegramMsg}</p>
                )}
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto">
                <a
                  href={telegramStatus?.botUrl || "https://t.me/purme_alert_bot"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-[#2AABEE] px-4 py-2.5 text-sm font-bold text-white shadow-sm"
                >
                  봇 채팅방 열기
                </a>
                <button
                  type="button"
                  onClick={sendTelegramTest}
                  disabled={telegramTesting}
                  className="rounded-full border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--navy)] disabled:opacity-50"
                >
                  {telegramTesting ? "전송 중…" : "테스트 알림 보내기"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText("8433555162");
                    setTelegramMsg(
                      "내 Chat ID 8433555162 복사됨. 운영자와 같이 받을 때는 그룹 ID로 바꾸거나 쉼표로 운영자 ID를 추가하세요."
                    );
                  }}
                  className="rounded-full border border-dashed border-[var(--sky)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--sky-deep)]"
                >
                  내 Chat ID 복사
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === "publish" && (
        <>
          <form
            onSubmit={onPublish}
            className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-6"
          >
            <h2 className="text-2xl font-extrabold text-[var(--navy)]">SEO 1건 발행</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              대량 발행은 tools/webdoc 웹문서 발행기를 사용하세요.
            </p>
            <label className="mt-4 block text-sm font-semibold">
              키워드
              <input
                className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="예: 정원인테리어"
                required
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={mode === "template"}
                  onChange={() => setMode("template")}
                />
                기본 양식 (API 없음)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={mode === "gemini"}
                  onChange={() => setMode("gemini")}
                />
                Gemini
              </label>
            </div>
            {mode === "gemini" && (
              <label className="mt-4 block text-sm font-semibold">
                Gemini API Key (선택 · 서버 .env 우선)
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="비우면 GEMINI_API_KEY 사용"
                />
              </label>
            )}
            <button type="submit" className="btn-primary mt-5" disabled={publishing}>
              {publishing ? "발행 중…" : "발행하기"}
            </button>
            {message && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--muted)]">{message}</p>
            )}
          </form>

          <div className="mt-10">
            <h2 className="text-2xl font-extrabold text-[var(--navy)]">발행된 페이지</h2>
            <ul className="mt-4 divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
              {items.length === 0 && (
                <li className="px-4 py-6 text-sm text-[var(--muted)]">아직 발행된 글이 없습니다.</li>
              )}
              {items.map((item, i) => {
                const no = (page - 1) * PAGE_SIZE + i + 1;
                return (
                  <li
                    key={item.slug}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex min-w-0 flex-1 gap-3">
                      <span className="w-8 shrink-0 text-lg font-bold text-[var(--orange)]">
                        {String(no).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs text-[var(--orange)]">{item.keyword}</div>
                        <a
                          href={item.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[var(--navy)] hover:underline"
                        >
                          {no}. {item.title}
                        </a>
                        <div className="truncate text-xs text-[var(--muted)]">
                          {absolutePageUrl(item.path)}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyPageUrl(item.path, item.slug)}
                      className="shrink-0 rounded-full border border-[var(--orange)] px-3 py-1.5 text-xs font-semibold text-[var(--orange)]"
                    >
                      {copiedSlug === item.slug ? "복사됨" : "주소복사하기"}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => loadPages(n)}
                  className={`min-w-9 rounded-full px-2 py-1 text-sm ${
                    n === page
                      ? "bg-[var(--green)] text-white"
                      : "rounded-xl border border-[var(--line)] bg-white"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
