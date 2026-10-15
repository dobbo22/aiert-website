import { send } from "@/lib/tapcardBizEmail";

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function sendPrebuiltEmail(to: string, business: string, link: string): Promise<void> {
  const html = `
    <p>Hello,</p>
    <p>Your TapCard for <strong>${esc(business)}</strong> is ready. Open this link on your phone, install TapCard (it's free), and your card is already built when you open the app:</p>
    <p><a href="${link}">${link}</a></p>
    <p>It's made from your own website, so check the details and add anything missing.</p>
    <p>This is the only email we'll send you about this. Reply to it if you'd like to talk to a person.</p>
    <p>Martin, TapCard</p>
  `;
  await send(to, `Your TapCard for ${business} is ready`, html,
    `Your TapCard for ${business} is ready.\n\nOpen this link on your phone, install TapCard (it's free), and your card is already built when you open the app:\n${link}\n\nIt's made from your own website, so check the details and add anything missing.\n\nThis is the only email we'll send you about this. Reply to it if you'd like to talk to a person.\n\nMartin, TapCard`);
}
