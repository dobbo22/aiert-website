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
  // Upload key: sideloaded / adb-installed builds.
  "FB:EC:7E:49:66:E6:67:49:22:37:A9:F4:56:C5:B9:FD:AE:78:40:43:8B:B7:DE:FB:D1:1B:A9:26:6E:CA:52:02",
  // Google Play app signing key: what every Play-installed copy is signed with (Play Console -> App integrity;
  // also the certificateSha256Hash of the generated APKs). Without it Android never verifies the links, so
  // card and company-invite links open in the browser and offer the Play listing instead of opening the app.
  "B4:EF:1E:25:6A:10:1E:41:58:6E:69:B3:2B:02:75:06:F9:75:2B:6C:5F:4C:EE:DD:20:A8:FB:3A:25:8E:84:03",
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
