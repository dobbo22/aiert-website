import { NextResponse } from "next/server";

// TEMPORARY diagnostic route — reads back the GenericObject Google actually
// stored for this card, to see why the Wallet app reports "Unable to load
// this pass" even though our own upsert call reports success. Delete once
// the bug is found; never exposes the service-account key itself.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const keyBase64 = process.env.GOOGLE_WALLET_SA_KEY_BASE64;
  if (!issuerId || !keyBase64) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const sa = JSON.parse(Buffer.from(keyBase64, "base64").toString("utf8")) as { client_email: string; private_key: string };
  const crypto = await import("crypto");
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const sign = (p: object) => {
    const u = `${b64({ alg: "RS256", typ: "JWT" })}.${b64(p)}`;
    return `${u}.${crypto.sign("RSA-SHA256", Buffer.from(u), sa.private_key).toString("base64url")}`;
  };
  const now = Math.floor(Date.now() / 1000);
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: sign({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/wallet_object.issuer", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }),
    }),
  });
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const API = "https://walletobjects.googleapis.com/walletobjects/v1";
  const objectId = `${issuerId}.${id}`;
  const classId = `${issuerId}.tapcard_card_v1`;
  const [objRes, classRes, issuerRes] = await Promise.all([
    fetch(`${API}/genericObject/${encodeURIComponent(objectId)}`, { headers: { Authorization: `Bearer ${access_token}` } }),
    fetch(`${API}/genericClass/${encodeURIComponent(classId)}`, { headers: { Authorization: `Bearer ${access_token}` } }),
    fetch(`${API}/issuer/${encodeURIComponent(issuerId)}`, { headers: { Authorization: `Bearer ${access_token}` } }),
  ]);
  const [obj, cls, issuer] = await Promise.all([objRes.json(), classRes.json(), issuerRes.json()]);
  return NextResponse.json({
    objectStatus: objRes.status, object: obj,
    classStatus: classRes.status, class: cls,
    issuerStatus: issuerRes.status, issuer,
  });
}
