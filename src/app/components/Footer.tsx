import Link from "next/link";
import { Phone, MapPin } from "lucide-react";
import { SITE } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--navy)] py-12 text-white">
      <div className="container grid gap-8 md:grid-cols-[1.2fr_1fr]">
        <div>
          <Link href="/" className="inline-block">
            <p className="text-sm font-semibold text-[#9bb8ff]">{SITE.farm}</p>
            <h2 className="mt-1 text-2xl font-extrabold hover:text-[#ffb399]">{SITE.brand}</h2>
          </Link>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">{SITE.tagline}</p>
        </div>

        <div className="space-y-3 text-sm text-white/80">
          <a href={SITE.phoneTel} className="flex items-center gap-2 hover:text-white">
            <Phone size={16} className="text-[var(--coral)]" />
            {SITE.phoneDisplay}
          </a>
          <p className="flex items-start gap-2">
            <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--coral)]" />
            {SITE.location} · {SITE.address}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Link
              href="/admin"
              className="inline-flex rounded-full border border-white/25 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/50 hover:bg-white/10 hover:text-white"
            >
              관리자 로그인
            </Link>
          </div>
          <p className="pt-2 text-xs text-white/45">
            © {new Date().getFullYear()} {SITE.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
