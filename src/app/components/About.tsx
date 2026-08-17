import Image from "next/image";
import { SITE } from "@/lib/site";
import { imageUrl } from "@/lib/images";

const PROMISES = [
  {
    n: "01",
    title: "약속을 지킵니다",
    desc: "범위·일정·마감을 상담에서 말한 그대로 진행합니다. 보이지 않는 추가 작업을 먼저 알리지 않고 진행하지 않습니다.",
  },
  {
    n: "02",
    title: "과정을 보여 드립니다",
    desc: "실측, 설계안, 자재, 식재, 시공 단계를 사진과 설명으로 공유합니다. 결정이 필요할 때는 선택지를 명확히 드립니다.",
  },
  {
    n: "03",
    title: "끝까지 책임집니다",
    desc: "완공 후에도 관리 방법을 안내합니다. 하자·보완이 있으면 미루지 않고 확인합니다.",
  },
];

export default function About() {
  return (
    <section id="about" className="section">
      <div className="container grid items-center gap-10 md:grid-cols-2">
        <div className="rounded-media relative aspect-[4/5] overflow-hidden shadow-[0_20px_50px_rgba(28,46,38,0.12)] md:aspect-[5/6]">
          <Image
            src={imageUrl(8)}
            alt={`${SITE.name} 정원 인테리어 시공 공간`}
            fill
            unoptimized
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
        <div>
          <p className="text-sm font-bold tracking-wide text-[var(--sky)]">OUR PROMISE</p>
          <h2 className="mt-2 text-3xl font-extrabold text-[var(--navy)] md:text-4xl">
            신뢰가 먼저이고,
            <br />
            풍경은 그다음입니다
          </h2>
          <p className="mt-4 text-[var(--muted)]">
            {SITE.brand}는 정원인테리어와 테라스인테리어를 전문으로 합니다. 예쁜 사진보다
            오래 쓸 수 있는 마감, 관리 가능한 식재, 솔직한 견적이 저희의 기준입니다.
          </p>
          <div className="mt-8 space-y-5">
            {PROMISES.map((p) => (
              <div key={p.n} className="soft-card p-5">
                <p className="text-xs font-bold text-[var(--coral)]">— 약속 {p.n}</p>
                <h3 className="mt-1 text-lg font-bold text-[var(--navy)]">{p.title}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
