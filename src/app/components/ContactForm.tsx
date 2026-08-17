"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Phone, Send } from "lucide-react";
import { SITE } from "@/lib/site";

type FormState = {
  name: string;
  phone: string;
  address: string;
  product: string;
  quantity: string;
  memo: string;
};

const initial: FormState = {
  name: "",
  phone: "",
  address: "",
  product: "정원인테리어",
  quantity: "1",
  memo: "",
};

const TOPICS = [
  { id: "정원인테리어", label: "정원인테리어 상담" },
  { id: "테라스인테리어", label: "테라스인테리어 상담" },
  { id: "조경설계", label: "조경설계·시공" },
  { id: "기타", label: "기타 문의" },
];

export default function ContactForm() {
  const [form, setForm] = useState<FormState>(initial);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          address: form.address.trim() || "미입력",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "문의 접수에 실패했습니다.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "문의 접수에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <section id="contact" className="section bg-white/70">
        <div className="container">
          <div className="soft-card mx-auto max-w-lg p-8 text-center">
            <CheckCircle2 className="mx-auto text-[var(--sky)]" size={48} />
            <h2 className="mt-4 text-2xl font-extrabold text-[var(--navy)]">문의가 접수되었습니다</h2>
            <p className="mt-3 text-[var(--muted)]">확인 후 빠르게 연락드리겠습니다.</p>
            <a href={SITE.phoneTel} className="btn-primary mt-6 inline-flex">
              <Phone size={18} />
              {SITE.phoneDisplay} 전화하기
            </a>
            <button
              type="button"
              className="mt-4 block w-full text-sm font-semibold text-[var(--muted)] underline"
              onClick={() => {
                setDone(false);
                setForm(initial);
              }}
            >
              다시 작성하기
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="section bg-white/70">
      <div className="container grid gap-10 md:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="text-sm font-bold tracking-wide text-[var(--sky)]">CONTACT</p>
          <h2 className="mt-2 text-3xl font-extrabold text-[var(--navy)] md:text-4xl">
            언제든 편하게 연락주세요
          </h2>
          <p className="mt-4 text-[var(--muted)]">
            정원·테라스 인테리어 모두 {SITE.phoneDisplay}로 상담 가능합니다.
            급하신 경우 전화가 가장 빠릅니다.
          </p>
          <a href={SITE.phoneTel} className="btn-sky mt-6 inline-flex">
            <Phone size={18} />
            {SITE.phoneDisplay}
          </a>
        </div>

        <form onSubmit={onSubmit} className="soft-card p-6 md:p-8">
          <div className="field">
            <label htmlFor="name">성함</label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="홍길동"
            />
          </div>
          <div className="field">
            <label htmlFor="phone">연락처</label>
            <input
              id="phone"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="010-0000-0000"
            />
          </div>
          <div className="field">
            <label htmlFor="address">지역 (선택)</label>
            <input
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="예: 수원 / 서울 강남"
            />
          </div>
          <div className="field">
            <label htmlFor="product">문의 유형</label>
            <select
              id="product"
              value={form.product}
              onChange={(e) => setForm({ ...form, product: e.target.value })}
            >
              {TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="memo">상담 내용</label>
            <textarea
              id="memo"
              rows={4}
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
              placeholder="공간 형태, 희망 분위기, 예산·일정 등을 적어주세요."
            />
          </div>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            <Send size={18} />
            {submitting ? "접수 중…" : "상담 신청하기"}
          </button>
        </form>
      </div>
    </section>
  );
}
