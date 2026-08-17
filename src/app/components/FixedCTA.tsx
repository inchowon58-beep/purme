import { Phone } from "lucide-react";
import { SITE, CTA_LABEL, CTA_BUILD } from "@/lib/site";

export default function FixedCTA() {
  return (
    <div className="fixed-cta" aria-label="빠른 상담">
      <div className="fixed-cta-inner">
        <a href={SITE.phoneTel} className="fixed-cta-call">
          <Phone size={16} aria-hidden />
          {CTA_LABEL}
        </a>
        <a
          href={SITE.infocsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed-cta-build"
        >
          {CTA_BUILD}
        </a>
      </div>
    </div>
  );
}
