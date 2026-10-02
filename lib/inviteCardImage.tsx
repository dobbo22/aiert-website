import { ImageResponse } from "next/og";
import sql from "@/lib/db";
import { findSiteIcon, normalizeDomain } from "@/lib/siteIcon";

// "Here's what your TapCard could look like": a picture of the recipient's
// own card, drawn like the app's Business card, from what's in Martin's
// contacts — name, company, phone, email, and (for a company email address)
// their website and company logo. Used in the invite email via {cardImage}.

/// Email providers, not companies: no website row or logo for these.
const PERSONAL_DOMAINS =
  /^(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|mac|aol|btinternet|btopenworld|bt|sky|talktalk|tiscali|virginmedia|ntlworld|blueyonder|plus|orange|protonmail|proton|gmx|mail|yandex|fastmail|zoho|hey)\./;

export function companyDomain(email: string): string | null {
  const domain = normalizeDomain(email.split("@")[1] ?? "");
  return domain && !PERSONAL_DOMAINS.test(domain) ? domain : null;
}

export type InviteCardPerson = {
  name: string;
  company: string;
  email: string;
  phone: string;
  title?: string;
  website?: string;
  linkedin_url?: string;
  facebook_url?: string;
  x_url?: string;
  instagram_url?: string;
  photo_url?: string;
};

/// The site's domain from whatever was typed ("https://www.acme.com/about" → acme.com).
export function websiteDomain(website: string | undefined): string | null {
  const host = (website ?? "").trim().replace(/^[a-z]+:\/\//i, "").split(/[/?#]/)[0]!.replace(/^www\./i, "");
  return host ? normalizeDomain(host) : null;
}

type Social = { label: string; bg: string; mark: string };

function socialsFor(person: InviteCardPerson): Social[] {
  const out: Social[] = [];
  if (person.linkedin_url) out.push({ label: "LinkedIn", bg: "#0a66c2", mark: "in" });
  if (person.x_url) out.push({ label: "X", bg: "#000000", mark: "X" });
  if (person.instagram_url) out.push({ label: "Instagram", bg: "linear-gradient(135deg, #feda75, #d62976 50%, #4f5bd5)", mark: "IG" });
  if (person.facebook_url) out.push({ label: "Facebook", bg: "#1877f2", mark: "f" });
  return out;
}

const WIDTH = 560;

function initials(name: string): string {
  // First and last name ("Martin CJ Dobson" → MD).
  const words = name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
  if (words.length === 0) return "";
  const picked = words.length > 1 ? [words[0], words[words.length - 1]] : [words[0]];
  return picked.map((w) => w![0]!.toUpperCase()).join("");
}

let logoTableReady: Promise<unknown> | null = null;
function ensureLogoTable() {
  logoTableReady ??= sql`
    CREATE TABLE IF NOT EXISTS tapcard_logo_cache (
      domain TEXT PRIMARY KEY,
      data_uri TEXT,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.catch((err) => {
    logoTableReady = null;
    throw err;
  });
  return logoTableReady;
}

/// A company's logo as a data: URI, remembered for 30 days (including "no
/// logo found") — fetching it from their site can take seconds, and
/// WhatsApp gives up on a slow preview picture.
async function logoDataUri(domain: string | null): Promise<string | null> {
  if (!domain) return null;
  try {
    await ensureLogoTable();
    const cached = (await sql`
      SELECT data_uri FROM tapcard_logo_cache WHERE domain = ${domain} AND fetched_at > now() - interval '30 days'
    `) as { data_uri: string | null }[];
    if (cached.length) return cached[0]!.data_uri;
  } catch {
    // No cache — fetch it anyway.
  }
  // Satori can't draw .ico, and a slow site mustn't hold up the picture.
  const icon = await Promise.race([
    findSiteIcon(domain, { allowIco: false }).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
  ]);
  const uri = icon ? `data:${icon.contentType};base64,${icon.bytes.toString("base64")}` : null;
  await sql`
    INSERT INTO tapcard_logo_cache (domain, data_uri) VALUES (${domain}, ${uri})
    ON CONFLICT (domain) DO UPDATE SET data_uri = EXCLUDED.data_uri, fetched_at = now()
  `.catch(() => {});
  return uri;
}

type Icon = "phone" | "mail" | "globe";

/// Drawn, not font glyphs: the card renderer's font has no symbols.
function RowIcon({ icon }: { icon: Icon }) {
  const stroke = { fill: "none", stroke: "#ffffff", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width="28" height="28" viewBox="0 0 24 24">
      {/* Separate elements, not fragments: the renderer can't draw <></> inside an svg. */}
      {icon === "phone" && (
        <path {...stroke} d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
      )}
      {icon === "mail" && <rect {...stroke} x="2" y="4" width="20" height="16" rx="2" />}
      {icon === "mail" && <path {...stroke} d="M22 6l-10 7L2 6" />}
      {icon === "globe" && <circle {...stroke} cx="12" cy="12" r="10" />}
      {icon === "globe" && (
        <path {...stroke} d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      )}
    </svg>
  );
}

function Row({ color, label, value, icon }: { color: string; label: string; value: string; icon: Icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", background: "#1f2128", borderRadius: 18, padding: "14px 16px", marginTop: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 52,
          height: 52,
          borderRadius: 14,
          background: color,
        }}
      >
        <RowIcon icon={icon} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginLeft: 16, overflow: "hidden" }}>
        <div style={{ display: "flex", fontSize: 19, color: "#e5e7eb", fontWeight: 600 }}>{label}</div>
        <div style={{ display: "flex", fontSize: 24, color: "#ffffff", marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}

export async function inviteCardImage(person: InviteCardPerson): Promise<ImageResponse> {
  // A website typed in on the Send tab wins over the email's domain.
  const domain = websiteDomain(person.website) ?? companyDomain(person.email);
  // A real photo wins over the company logo, so don't wait on a logo fetch
  // (up to 6s) when it won't be shown.
  const logo = person.photo_url ? null : await logoDataUri(domain);
  const socials = socialsFor(person);
  const rows: { color: string; label: string; value: string; icon: Icon }[] = [];
  if (person.phone) rows.push({ color: "#22c55e", label: "Call me", value: person.phone, icon: "phone" });
  if (person.email) rows.push({ color: "#a855f7", label: "Email me", value: person.email, icon: "mail" });
  if (domain) rows.push({ color: "#3b82f6", label: "Visit my site", value: domain, icon: "globe" });
  const subtitle =
    [person.title, person.company].filter(Boolean).join(" · ") ||
    (domain ? domain.split(".")[0]!.replace(/^./, (c) => c.toUpperCase()) : "");
  const height = 330 + (subtitle ? 34 : 0) + rows.length * 92 + (socials.length ? 150 : 0) + 70;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#ffffff", padding: 10 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            borderRadius: 36,
            padding: "26px 28px",
            background: "linear-gradient(180deg, #3b2a6b 0%, #16171c 22%, #111318 100%)",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ display: "flex" }}>
            <div style={{ display: "flex", background: "#0b0c10", color: "#fff", fontSize: 17, fontWeight: 700, letterSpacing: 2, padding: "7px 16px", borderRadius: 999 }}>
              BUSINESS
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 140,
                height: 140,
                borderRadius: 70,
                background: person.photo_url ? "#3a3b42" : logo ? "#ffffff" : "#3a3b42",
                border: "6px solid #0b0c10",
                overflow: "hidden",
              }}
            >
              {person.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={person.photo_url} alt="" width={140} height={140} style={{ objectFit: "cover" }} />
              ) : logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" width={92} height={92} style={{ objectFit: "contain" }} />
              ) : (
                <div style={{ display: "flex", color: "#ffffff", fontSize: 52, fontWeight: 700 }}>{initials(person.name)}</div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", color: "#fff", fontSize: 40, fontWeight: 800, marginTop: 18 }}>{person.name}</div>
          {subtitle && <div style={{ display: "flex", justifyContent: "center", color: "#e5e7eb", fontSize: 24, marginTop: 6 }}>{subtitle}</div>}
          <div style={{ display: "flex", flexDirection: "column", marginTop: 20 }}>
            {rows.map((r) => (
              <Row key={r.label} {...r} />
            ))}
          </div>
          {socials.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 22 }}>
              <div style={{ display: "flex", color: "#ffffff", fontSize: 18, letterSpacing: 3 }}>FOLLOW ME</div>
              <div style={{ display: "flex", marginTop: 12 }}>
                {socials.map((so) => (
                  <div key={so.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0 12px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 64,
                        height: 64,
                        borderRadius: 16,
                        background: so.bg,
                        border: "1px solid #3a3b42",
                        color: "#ffffff",
                        fontSize: 30,
                        fontWeight: 700,
                      }}
                    >
                      {so.mark}
                    </div>
                    <div style={{ display: "flex", color: "#e5e7eb", fontSize: 16, marginTop: 6 }}>{so.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "center", color: "#9ca3af", fontSize: 17, marginTop: "auto", paddingTop: 18 }}>
            Made with TapCard
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height,
      // Short, so a re-sent invite picks up edited details.
      headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
    },
  );
}
