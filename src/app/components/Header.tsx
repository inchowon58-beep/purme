"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Phone, X } from "lucide-react";
import { SITE, CTA_LABEL } from "@/lib/site";

const NAV = [
  { href: "/#about", label: "우리 이야기" },
  { href: "/#works", label: "시공사례" },
  { href: "/#gallery", label: "갤러리" },
  { href: "/#process", label: "절차안내" },
  { href: "/#reviews", label: "후기" },
  { href: "/guide", label: "지역안내" },
  { href: "/#contact", label: "문의" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[rgba(247,250,247,0.92)] backdrop-blur-md">
      <div className="trust-pulse flex items-center justify-center gap-2 bg-[var(--sky-deep)] px-3 py-2 text-center text-[0.78rem] font-semibold text-white md:text-sm">
        <span>정원·테라스 인테리어 · 신뢰 시공 상담 {SITE.phoneDisplay}</span>
      </div>

      <div className="container flex h-14 items-center justify-between md:h-16">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-[0.7rem] font-semibold tracking-wide text-[var(--sky)]">
            {SITE.farm}
          </span>
          <span className="text-lg font-extrabold tracking-tight text-[var(--navy)] md:text-xl">
            {SITE.brand}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--muted)] lg:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-[var(--coral)]">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={SITE.phoneTel}
            className="hidden items-center gap-1.5 rounded-full bg-[var(--sky)] px-3 py-2 text-sm font-semibold text-white sm:inline-flex"
          >
            <Phone size={16} />
            {SITE.phoneDisplay}
          </a>
          <Link
            href="/#contact"
            className="hidden rounded-full bg-[var(--coral)] px-3.5 py-2 text-sm font-bold text-white md:inline-flex"
          >
            {CTA_LABEL}
          </Link>
          <button
            type="button"
            className="inline-flex rounded-lg p-2 text-[var(--navy)] lg:hidden"
            aria-label="메뉴"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[var(--line)] bg-white px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--navy)] hover:bg-[var(--sky-soft)]"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <a
              href={SITE.phoneTel}
              className="mt-1 inline-flex items-center gap-2 rounded-xl bg-[var(--sky)] px-3 py-2.5 text-sm font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              <Phone size={16} />
              {SITE.phoneDisplay}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
