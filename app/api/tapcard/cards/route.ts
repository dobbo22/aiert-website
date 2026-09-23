import { NextRequest, NextResponse } from "next/server";
import { createCard, updateCard } from "@/lib/tapcardDb";

interface CardBody {
  id?: string;
  name?: string;
  title?: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
  linkedInURL?: string;
}

function sanitize(body: CardBody) {
  return {
    name: (body.name ?? "").trim().slice(0, 200),
    title: (body.title ?? "").trim().slice(0, 200),
    company: (body.company ?? "").trim().slice(0, 200),
    phone: (body.phone ?? "").trim().slice(0, 60),
    email: (body.email ?? "").trim().slice(0, 200),
    website: (body.website ?? "").trim().slice(0, 300),
    linkedin_url: (body.linkedInURL ?? "").trim().slice(0, 300),
  };
}

// No auth: the id returned here is an unguessable token the iOS app stores
// locally and treats as its write credential (see lib/tapcardDb.ts). This
// is TapCard's whole security model for MVP — acceptable for a free,
// no-login lead-gen app with no sensitive data beyond what's on a printed
// business card, but not a pattern to copy for anything more sensitive.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as CardBody;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const fields = sanitize(body);

  if (body.id) {
    const updated = await updateCard(body.id, fields);
    if (updated) return NextResponse.json({ id: body.id });
    // Falls through to create — an id the iOS app has locally but that no
    // longer exists server-side (e.g. after a "Stop sharing" delete)
    // should re-create rather than 404, so re-sharing just works.
  }

  const id = await createCard(fields);
  return NextResponse.json({ id });
}
