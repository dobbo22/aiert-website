import { NextResponse } from "next/server";

// Digital Asset Links file for TapCard's Android App Links — served at
// /.well-known/assetlinks.json by proxy.ts on tapcard.aiert.co.uk. Lets
// Android open a card link directly in the app (when installed) instead of
// Chrome, the same way apple-app-site-association does for iOS (see
// app/api/tapcard/aasa). The app then saves the card straight to Contacts
// with no download step — Chrome can't do that (ContactEditorActivity has
// no BROWSABLE filter, so intent:// links to it are refused).
//
// sha256_cert_fingerprints: the upload key (keystore/tapcard-upload.jks in
// the Android repo), used for sideloaded/adb-installed builds. Once the app
// is signed for release through Play App Signing, that certificate's
// fingerprint (Play Console -> Setup -> App integrity) must be added here
// too, or App Links verification will fail for Play-installed copies.
const PACKAGE_NAME = "com.mailbroom.tapcard";
const SHA256_CERT_FINGERPRINTS = [
  "FB:EC:7E:49:66:E6:67:49:22:37:A9:F4:56:C5:B9:FD:AE:78:40:43:8B:B7:DE:FB:D1:1B:A9:26:6E:CA:52:02",
];

export function GET() {
  return NextResponse.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: PACKAGE_NAME,
        sha256_cert_fingerprints: SHA256_CERT_FINGERPRINTS,
      },
    },
  ]);
}
