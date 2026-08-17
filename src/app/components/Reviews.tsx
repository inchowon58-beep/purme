import { SITE } from "@/lib/site";

const REVIEWS = [
  {
    quote:
      "테라스만 손보려다 전체 동선까지 제안해 주셨어요. 견적 항목이 분명해서 믿고 맡겼습니다.",
    name: "김○○ 고객",
    course: "테라스 인테리어",
  },
  {
    quote:
      "마당이 휑했는데, 식재와 데크 배치가 실제 생활과 맞았습니다. 완공 사진보다 살아보니 더 좋았습니다.",
    name: "이○○ 고객",
    course: "정원 인테리어",
  },
  {
    quote:
      "옥상 배수 문제를 먼저 짚어 주셔서 안심이 됐습니다. 예쁜 그림만 그리지 않는 느낌이었어요.",
    name: "박○○ 고객",
    course: "옥상 정원",
  },
  {
    quote:
      "시공 중간중간 사진을 보내 주셔서 멀리 있어도 진행이 보였습니다. 일정 약속도 지켜 주셨어요.",
    name: "최○○ 고객",
    course: "현장 공유",
  },
  {
    quote:
      "베란다 협소 공간인데도 관리 쉬운 수종으로 맞춰 주셨습니다. 과한 시공을 권하지 않아 신뢰가 갔습니다.",
    name: "정○○ 고객",
    course: "베란다 정원",
  },
  {
    quote:
      "전화 상담만으로도 필요한 준비물이 정리됐습니다. 방문 실측 후 바로 설계안이 나와 편했어요.",
    name: "한○○ 고객",
    course: "상담·실측",
  },
];

export default function Reviews() {
  return (
    <section id="reviews" className="section bg-white/50">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold tracking-wide text-[var(--sky)]">REVIEWS</p>
          <h2 className="mt-2 text-3xl font-extrabold text-[var(--navy)] md:text-4xl">
            고객님이 남겨 주신 이야기
          </h2>
          <p className="mt-3 text-[var(--muted)]">
            {SITE.brand}와 정원·테라스 시공을 진행하신 분들의 후기입니다.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REVIEWS.map((r) => (
            <blockquote key={r.name + r.course} className="soft-card p-6">
              <p className="text-[var(--ink)] leading-relaxed">&ldquo;{r.quote}&rdquo;</p>
              <footer className="mt-4 border-t border-[var(--line)] pt-3">
                <p className="text-sm font-bold text-[var(--navy)]">{r.name}</p>
                <p className="text-xs text-[var(--sky)]">{r.course}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
