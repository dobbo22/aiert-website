import { send } from "@/lib/tapcardBizEmail";

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function sendPrebuiltEmail(to: string, business: string, link: string): Promise<void> {
  const html = `
    <p>Hello,</p>
    <p>Your TapCard for <strong>${esc(business)}</strong> is ready. Open this link on your phone, install TapCard (it's free), and your card is already built when you open the app:</p>
    <p><a href="${link}">${link}</a></p>
    <p>It's made from your own website, so check the details and add anything missing.</p>
    <p>Reply to this email if you'd like to talk to a person. You asked for this link on tapcard.aiert.co.uk/demo; we'll delete your details after 60 days.</p>
    <p>Martin, TapCard</p>
  `;
  await send(to, `Your TapCard for ${business} is ready`, html,
    `Your TapCard for ${business} is ready.\n\nOpen this link on your phone, install TapCard (it's free), and your card is already built when you open the app:\n${link}\n\nIt's made from your own website, so check the details and add anything missing.\n\nReply to this email if you'd like to talk to a person. You asked for this link on tapcard.aiert.co.uk/demo; we'll delete your details after 60 days.\n\nMartin, TapCard`);
}
