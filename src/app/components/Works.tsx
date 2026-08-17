import { SITE } from "@/lib/site";
import { WORKS_GALLERY } from "@/lib/works-gallery";
import TrimFillImage from "./TrimFillImage";

export default function Works() {
  return (
    <section id="works" className="section bg-white/50">
      <div className="container">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold tracking-wide text-[var(--sky)]">WORKS</p>
            <h2 className="mt-2 text-3xl font-extrabold text-[var(--navy)] md:text-4xl">
              공간을 바꾸는 시공
            </h2>
            <p className="mt-3 max-w-xl text-[var(--muted)]">
              정원·테라스·옥상·베란다까지, 현장 조건에 맞춰 설계하고 시공합니다.
              마음에 드는 유형을 보신 뒤 전화로 상담해 주세요.
            </p>
          </div>
          <a href={SITE.phoneTel} className="btn-sky shrink-0">
            인테리어 상담하기
          </a>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {WORKS_GALLERY.map((work) => (
            <article key={work.name} className="soft-card group">
              <div className="relative aspect-[4/5] overflow-hidden">
                <div className="absolute inset-0 overflow-hidden transition duration-700 group-hover:scale-105">
                  <TrimFillImage src={work.src} alt={`${work.name} — ${work.type} 시공 사례`} />
                </div>
                <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[0.65rem] font-bold text-[var(--sky-deep)] sm:left-3 sm:top-3 sm:px-3 sm:py-1 sm:text-xs">
                  {work.status}
                </span>
              </div>
              <div className="p-3 sm:p-4">
                <h3 className="text-base font-extrabold text-[var(--navy)] sm:text-lg">{work.name}</h3>
                <p className="mt-0.5 text-xs text-[var(--muted)] sm:text-sm">
                  {work.type} · {work.area}
                </p>
                <ul className="mt-2 hidden space-y-1 sm:mt-3 sm:block">
                  {work.traits.slice(0, 2).map((t) => (
                    <li key={t} className="text-xs text-[var(--muted)]">
                      · {t}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
