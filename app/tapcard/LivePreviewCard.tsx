"use client";

import { DEFAULT_PALETTE } from "@/lib/brandPalette";
import ContactIcon, { type ContactIconName } from "./ContactIcon";

// A scaled-down, live-updating version of the public card page's own visual
// — reuses the same default gradient (paletteFor has nothing to extract a
// brand colour from here, so just DEFAULT_PALETTE directly) and ContactIcon,
// both pure/presentational, safe in a client component driven by form state
// rather than a stored card. Not a pixel-identical clone of the real page,
// just close enough that it reads as "this is what your TapCard looks like."
export default function LivePreviewCard({
  name,
  title,
  company,
  phone,
  email,
  website,
}: {
  name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
  website: string;
}) {
  const palette = DEFAULT_PALETTE;
  const allLines: { value: string; icon: ContactIconName; iconBg: string }[] = [
    { value: phone, icon: "phone" as ContactIconName, iconBg: "#22C55E" },
    { value: email, icon: "mail" as ContactIconName, iconBg: "#A855F7" },
    { value: website, icon: "globe" as ContactIconName, iconBg: "#3B82F6" },
  ];
  const lines = allLines.filter((l) => l.value);

  return (
    <div className="overflow-hidden rounded-2xl bg-[#111318] text-center shadow-lg ring-1 ring-white/10">
      <div
        className="relative h-16"
        style={{ background: `linear-gradient(to bottom right, ${palette.gradStart}, ${palette.gradEnd})` }}
      />
      <div className="relative -mt-8 px-4 pb-5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-2xl text-white ring-4 ring-[#111318]">
          🙂
        </div>
        <h2 className="mt-2 truncate text-lg font-bold text-white">{name || "Your name"}</h2>
        {(title || company) && (
          <p className="mt-0.5 truncate text-xs text-white">{[title, company].filter(Boolean).join(" · ")}</p>
        )}
        {lines.length > 0 && (
          <div className="mt-3 space-y-1.5 text-left">
            {lines.map((line) => (
              <div key={line.icon} className="flex items-center gap-2 rounded-xl bg-white/[0.07] px-2.5 py-1.5">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/15"
                  style={{ background: line.iconBg }}
                >
                  <ContactIcon name={line.icon} />
                </span>
                <span className="truncate text-xs text-white">{line.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
