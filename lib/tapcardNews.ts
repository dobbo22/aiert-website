import crypto from "crypto";
import { Resend } from "resend";
import sql from "@/lib/db";
import { inviteEmailRoute } from "@/lib/inviteEmailRoute";

// "Email me TapCard news": an optional sign-up in the apps for people who want occasional news from AIERT by email. Consent is
// double opt-in: the address is stored unconfirmed, a confirmation email goes to it, and only a click on that link makes it a
// subscriber. Every address has its own unsubscribe link. Nothing here reads the emails people typed onto their own cards.

const ORIGIN = "https://tapcard.aiert.co.uk";
let ready: Promise<unknown> | null = null;

function ensureSchema() {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS tapcard_news_signups (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        token TEXT NOT NULL UNIQUE,
        platform TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL DEFAULT 'app',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        confirmed_at TIMESTAMPTZ,
        unsubscribed_at TIMESTAMPTZ
      )
    `.catch((err) => { ready = null; throw err; });
  }
  return ready;
}

export function validEmail(raw: unknown): string | null {
  const e = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return e.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : null;
}

/** Stores the address (unconfirmed) and sends the confirmation email. An address that already confirmed is left alone. */
export async function requestNewsSignup(email: string, platform: string, source: string): Promise<void> {
  await ensureSchema();
  const token = crypto.randomBytes(16).toString("base64url");
  const rows = (await sql`
    INSERT INTO tapcard_news_signups (email, token, platform, source)
    VALUES (${email}, ${token}, ${platform.slice(0, 20)}, ${source.slice(0, 40)})
    ON CONFLICT (email) DO UPDATE SET unsubscribed_at = NULL
    RETURNING token, confirmed_at
  `) as { token: string; confirmed_at: string | null }[];
  const row = rows[0];
  if (!row || row.confirmed_at) return;
  await sendConfirmationEmail(email, row.token);
}

export async function confirmNewsSignup(token: string): Promise<boolean> {
  await ensureSchema();
  const r = (await sql`UPDATE tapcard_news_signups SET confirmed_at = coalesce(confirmed_at, now()), unsubscribed_at = NULL WHERE token = ${token} RETURNING id`) as unknown[];
  return r.length > 0;
}

export async function unsubscribeNews(token: string): Promise<boolean> {
  await ensureSchema();
  const r = (await sql`UPDATE tapcard_news_signups SET unsubscribed_at = now() WHERE token = ${token} RETURNING id`) as unknown[];
  return r.length > 0;
}

async function sendConfirmationEmail(to: string, token: string): Promise<void> {
  const confirmUrl = `${ORIGIN}/news/confirm/${token}`;
  const unsubUrl = `${ORIGIN}/news/unsub/${token}`;
  const subject = "Please confirm: TapCard news by email";
  const text = `Someone asked for TapCard news by email at this address, from the TapCard app.\n\nTo confirm it was you, open this link:\n${confirmUrl}\n\nIf it wasn't you, ignore this email and nothing will be sent. We will not email you again unless you confirm.\n\nAIERT Ltd\nNo longer interested? ${unsubUrl}`;
  const html = `
    <p>Someone asked for TapCard news by email at this address, from the TapCard app.</p>
    <p>To confirm it was you, <a href="${confirmUrl}">tap here to confirm</a>.</p>
    <p>If it wasn't you, ignore this email and nothing will be sent. We will not email you again unless you confirm.</p>
    <p style="color:#888;font-size:12px;margin-top:24px;">AIERT Ltd. <a href="${unsubUrl}">Not interested</a>.</p>`;
  const route = inviteEmailRoute();
  if (route.viaResend) {
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: route.from, to, replyTo: route.replyTo, subject, text, html,
      headers: { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (error) throw new Error(error.message ?? "Email send failed");
    return;
  }
  const { sendMailbroomEmail } = await import("@/lib/mailbroomGraphMail");
  await sendMailbroomEmail({ to, subject, bodyHtml: html, signatureHtml: "" });
}
