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
      // The older appID/paths format (same as MailBroom's app.mailbroom.app
      // file) — the newer appIDs/components form wasn't opening the app.
      apps: [],
      details: [
        {
          appID: APP_ID,
          // The vCard download must stay a plain web download. Apple's legacy
          // "paths" wildcard can span "/", so a loose "*/*" exclude also
          // swallows plain single-segment card links — confirmed on-device
          // via swcd's log (`Inputs blocked by pattern {"exclude":true}` on
          // a plain /c/<id> link). Match the literal /vcard suffix instead.
          paths: [`NOT ${prefix}/c/*/vcard`, `${prefix}/c/*`, `${prefix}/business/claim/*`],
        },
      ],
    },
  });
}
