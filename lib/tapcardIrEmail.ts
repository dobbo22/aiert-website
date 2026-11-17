import { firstNameOf } from "@/lib/tapcardName";
import type { IrPersonKind } from "@/lib/tapcardIrOutreach";

// The email to a person on the investor relations outreach list (admin > IR outreach): written from their type, name, organisation and personal link.
// Wording rules: never "free app" or an unqualified "no app needed"; no prices; TapCard does not provide RNS; say some parts are still being built.
// The first email carries the video picture and the personal link; the follow-up is a short, polite reply for about five working days later.

export interface IrEmail { subject: string; html: string; text: string }
export type IrEmailStep = "first" | "followup";

const THUMB = "https://www.aiert.co.uk/tapcard-ir-demo-thumb-v3.png";
const FONT = "font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:15pt;line-height:1.45;color:#111;";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const BULLETS = [
  "A QR code on a slide, report, notice or website, or the TapCard e-business card on your team's phones: an investor scans it and follows the company. Following any of your team's cards follows the company.",
  "They choose whether to share their name and email. You see only the people who choose to.",
  "When the company announces, a notification goes to followers' phones: a one-line headline with a link to the announcement on the company's own website. It goes to their phone, not their inbox, and you can see how many it was sent to, how many tapped through and when they read it.",
  "A QR code for each event, with a time slot for each firm on a roadshow, so you can see who registered and when.",
  "An admin for the IR team with followers, insights and a monthly report. We can adapt reports to what the company, its board or its adviser want to see.",
];

const RNS = "TapCard does not provide RNS: the announcement and the data stay with the company, published only from its own website, and a post goes out only once it is public.";
const STILL = "Some parts are still being built and I will be straight about which. Pricing is by request.";

interface Parts { intro: string; ask: string; subject: string; followup: string }

function parts(kind: IrPersonKind, first: string, org: string): Parts {
  const hi = first ? `Hi ${first},` : "Hello,";
  const of = org ? `${org}'s` : "your";
  switch (kind) {
    case "company":
      return {
        subject: org ? `TapCard for investor relations: a direct line to ${org}'s shareholders` : "TapCard for investor relations: a direct line to your shareholders",
        intro: `${hi}\n\nI am Martin Dobson at AIERT. We have built TapCard for investor relations to give an IR team a direct line to ${of} shareholders, and put it on one page with a 30-second video so you can see what you and your investors would actually use.`,
        ask: "Would you be open to a short call or a Teams or Zoom? I would particularly value your view on what you would want to see in a report.",
        followup: `${hi}\n\nA gentle nudge on my note below. I know how full a diary gets around results season, so there is no pressure.\n\nIf it is easier, I can walk you through it on the phone in ten minutes. And if this is not for you, a one-line steer would help, so I do not keep chasing.`,
      };
    case "agency":
      return {
        subject: "TapCard for investor relations: what it could mean for your clients",
        intro: `${hi}\n\nI am Martin Dobson at AIERT. We have built TapCard for investor relations, and I think it may be useful to the listed companies you advise. I have put it on one page with a 30-second video.`,
        ask: "We have a partner arrangement for advisers and agencies, and I will send the terms if you are interested. I would value your view on what your clients would want to see in a report, and a short call if you have time.",
        followup: `${hi}\n\nA light nudge on my note below. If it is easier, I can show you in ten minutes on a call.\n\nEven a line on what your clients would want in a report would help me, and if it is not for you, a quick steer so I do not keep chasing.`,
      };
    case "broker":
      return {
        subject: "TapCard for investor relations: roadshows, events and notifications, on one page",
        intro: `${hi}\n\nI am Martin Dobson at AIERT. We have built TapCard for investor relations, with roadshows and investor events in mind, and put it on one page with a 30-second video.`,
        ask: "I would value your view, as someone who advises listed companies, on what a company's broker would want to see in a report, and on the rule I have built around: anything goes out only once the announcement is public, and says nothing that is not in it. Could we find ten minutes, or could I come to you?",
        followup: `${hi}\n\nA gentle nudge on my note below. I can come to you with a phone and show it in ten minutes, whenever suits.\n\nYour view on roadshows in particular would be a real help.`,
      };
    default:
      return {
        subject: "TapCard for investor relations, on one page with a 30-second video",
        intro: `${hi}\n\nI hope you are well. I have been building TapCard for investor relations and put it on one page with a 30-second video, and I would value your view.`,
        ask: "If it is of interest, I would be glad to show you in ten minutes, and I would particularly value your view on what you would want to see in a report.",
        followup: `${hi}\n\nA light nudge on my note below. No pressure at all. If it is easier, I can show you in ten minutes, and if it is not for you, just say so and I will not chase.`,
      };
  }
}

export function buildIrEmail(p: { name: string; org: string; kind: IrPersonKind; link: string; step?: IrEmailStep }): IrEmail {
  const first = firstNameOf(p.name);
  const o = parts(p.kind, first, p.org.trim());
  const sign = "Kind regards,\nMartin Dobson\nAIERT Ltd";

  if (p.step === "followup") {
    const text = `${o.followup}\n\n${sign}`;
    const html = `<div style="${FONT}">${text.split("\n\n").map((para) => `<p style="margin:0 0 12px">${esc(para).replace(/\n/g, "<br>")}</p>`).join("")}</div>`;
    return { subject: `Following up: ${o.subject}`, html, text };
  }

  const text = [
    o.intro, "", `Here is the page: ${p.link}`, "", "What is on it:", ...BULLETS.map((b) => `- ${b}`), "", RNS, "", STILL, "", o.ask, "", sign,
  ].join("\n");
  const html = `<div style="${FONT}max-width:640px">
${o.intro.split("\n\n").map((para) => `<p style="margin:0 0 12px">${esc(para).replace(/\n/g, "<br>")}</p>`).join("")}
<p style="margin:0 0 12px"><a href="${esc(p.link)}"><img src="${THUMB}" width="520" style="border-radius:12px;border:1px solid #ddd;max-width:100%" alt="Watch the 30-second video of TapCard for investor relations"></a></p>
<p style="margin:0 0 12px"><a href="${esc(p.link)}">${esc(p.link)}</a></p>
<p style="margin:0 0 12px">What is on it:</p>
<ul style="margin:0 0 12px;padding-left:22px;list-style:disc">${BULLETS.map((b) => `<li style="margin-bottom:6px;list-style:disc">${esc(b)}</li>`).join("")}</ul>
<p style="margin:0 0 12px">${esc(RNS)}</p>
<p style="margin:0 0 12px">${esc(STILL)}</p>
<p style="margin:0 0 12px">${esc(o.ask)}</p>
<p style="margin:0 0 12px">Kind regards,<br>Martin Dobson<br>AIERT Ltd</p>
</div>`;
  return { subject: o.subject, html, text };
}
