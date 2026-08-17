import { SITE } from "@/lib/site";
import { HOME_FAQS } from "@/lib/faq-data";

export default function FAQ() {
  return (
    <section id="faq" className="section">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold tracking-wide text-[var(--sky)]">FAQ</p>
          <h2 className="mt-2 text-2xl font-extrabold text-[var(--navy)] md:text-4xl">
            {SITE.brand}, 자주 묻는 질문
          </h2>
          <p className="mt-4 text-[var(--muted)]">
            정원·테라스 인테리어 전 궁금하신 점을 모았습니다.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-2xl space-y-3">
          {HOME_FAQS.map((f) => (
            <details key={f.q} className="soft-card px-5 py-4">
              <summary className="cursor-pointer font-bold text-[var(--navy)]">{f.q}</summary>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
