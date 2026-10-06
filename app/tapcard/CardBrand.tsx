"use client";

import { createContext, use, useState, type ReactNode } from "react";
import CompanyLogo from "./CompanyLogo";

// The company's logo across the card banner (a company card's uploaded logo,
// or the logo from the card's website via /api/logo), falling back to the
// card label plus the small round icon badge (CompanyLogo) when there isn't
// one. Shared state so the badge hides once the banner logo has loaded.

const LogoShown = createContext<{ shown: boolean; setShown: (shown: boolean) => void }>({
  shown: false,
  setShown: () => {},
});

export function BrandProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(false);
  return <LogoShown value={{ shown, setShown }}>{children}</LogoShown>;
}

export function BannerBrand({ logoSrc, label, alt }: { logoSrc: string | null; label: string; alt: string }) {
  const { shown, setShown } = use(LogoShown);
  const [failed, setFailed] = useState(false);
  const tryLogo = !!logoSrc && !failed;

  return (
    <>
      {label && !shown && (
        <span className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          {label}
        </span>
      )}
      {tryLogo && (
        <span
          className={`absolute left-4 top-4 flex h-10 max-w-[60%] items-center rounded-xl bg-white px-3 py-1.5 ${shown ? "" : "invisible"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt={alt}
            className="max-h-full max-w-full object-contain"
            // A cached image can finish before hydration, when onLoad has
            // already fired — the ref catches that case.
            ref={(img) => {
              if (img?.complete && img.naturalWidth > 0) setShown(true);
            }}
            onLoad={() => setShown(true)}
            onError={() => setFailed(true)}
          />
        </span>
      )}
    </>
  );
}

export function FaviconBadge({ domain }: { domain: string }) {
  const { shown } = use(LogoShown);
  if (shown) return null;
  return (
    <span className="absolute -bottom-1 -right-1 rounded-full bg-white p-1 ring-4 ring-[#111318]">
      <CompanyLogo domain={domain} />
    </span>
  );
}
