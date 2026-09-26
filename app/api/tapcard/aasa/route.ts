import { NextResponse } from "next/server";

// apple-app-site-association for TapCard's Universal Links — served at
// /.well-known/apple-app-site-association by proxy.ts on tapcard.aiert.co.uk
// and www.aiert.co.uk. Card links open the app when it's installed, so a
// receiver who already has TapCard can save the card and send theirs back.
//
// www.aiert.co.uk/tapcard/c/* is the same card page on a second domain: iOS
// never opens the app for a link to the page you're already on, so the web
// page's "Send your card back" button points across to the other host.
const APP_ID = "ATMHQQQQ5S.com.mailbroom.tapcard";

export function GET(req: Request) {
  // The Host header, not req.url — proxy.ts's rewrite leaves req.url on the
  // internal origin.
  const host = req.headers.get("host") ?? "";
  const prefix = host.startsWith("tapcard.") ? "" : "/tapcard";
  return NextResponse.json({
    applinks: {
      details: [
        {
          appIDs: [APP_ID],
          components: [
            // The vCard download must stay a plain web download.
            { "/": `${prefix}/c/*/*`, exclude: true },
            { "/": `${prefix}/c/*` },
          ],
        },
      ],
    },
  });
}
