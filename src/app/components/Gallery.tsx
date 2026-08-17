import { SITE } from "@/lib/site";
import { allImageUrls, galleryAlt } from "@/lib/images";
import TrimFillImage from "./TrimFillImage";

export default function Gallery() {
  const images = allImageUrls();

  return (
    <section id="gallery" className="section">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold tracking-wide text-[var(--sky)]">GALLERY</p>
          <h2 className="mt-2 text-3xl font-extrabold text-[var(--navy)] md:text-4xl">
            시공 갤러리
          </h2>
          <p className="mt-3 text-[var(--muted)]">
            {SITE.brand}가 완성한 정원·테라스·조경 공간을 모두 담았습니다.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {images.map((src, i) => (
            <div key={src} className="rounded-media relative aspect-square overflow-hidden shadow-sm">
              <TrimFillImage src={src} alt={galleryAlt(i + 1)} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
