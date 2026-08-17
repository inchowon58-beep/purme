import { SITE } from "@/lib/site";

const STEPS = [
  {
    n: "1",
    title: "전화 상담",
    desc: "공간 사진, 희망 분위기, 예산을 들려주세요. 가능 범위와 대략 일정을 안내합니다.",
  },
  {
    n: "2",
    title: "현장 실측",
    desc: "배수·일조·하중·동선을 확인합니다. 전국 상담 후 방문 일정을 맞춥니다.",
  },
  {
    n: "3",
    title: "설계 제안",
    desc: "식재·자재·마감안을 보여 드립니다. 변경이 있으면 확정 전에 다시 맞춥니다.",
  },
  {
    n: "4",
    title: "시공·완공",
    desc: "약속한 범위로 시공하고, 관리 방법까지 안내합니다. 이후에도 문의 가능합니다.",
  },
];

export default function Process() {
  return (
    <section id="process" className="section">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold tracking-wide text-[var(--sky)]">PROCESS</p>
          <h2 className="mt-2 text-3xl font-extrabold text-[var(--navy)] md:text-4xl">
            처음이라 어려우신가요?
          </h2>
          <p className="mt-3 text-[var(--muted)]">
            정원과 테라스 시공은 결정이 많습니다. {SITE.brand}가 단계별로 함께합니다.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="soft-card p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--sky-soft)] text-lg font-extrabold text-[var(--sky-deep)]">
                {s.n}
              </div>
              <h3 className="mt-4 text-lg font-bold text-[var(--navy)]">{s.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
