import { NextRequest, NextResponse } from "next/server";
import { del, put } from "@vercel/blob";
import { getEmployee, setEmployeePhoto } from "@/lib/tapcardBiz";
import { requireBizSession } from "@/lib/tapcardBizSession";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

// An employee's photo, set by their admin (employees page). Used as the
// card photo when they claim, and on an already-claimed card unless the
// employee has picked their own photo in the app (see setEmployeePhoto).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const employee = await getEmployee(session.orgId, (await params).id);
  if (!employee) return NextResponse.json({ error: "not found" }, { status: 404 });

  const file = (await req.formData()).get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
  }
  if (!PHOTO_TYPES.includes(file.type) || file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "The photo must be a JPEG, PNG or WebP under 5 MB." }, { status: 400 });
  }

  const blob = await put(`tapcard-biz/${employee.org_id}-employee-${employee.id}-${Date.now()}`, file, {
    access: "public",
    contentType: file.type,
  });
  await setEmployeePhoto(employee, blob.url);
  if (employee.photo_url) await del(employee.photo_url).catch(() => {});
  return NextResponse.json({ url: blob.url });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const employee = await getEmployee(session.orgId, (await params).id);
  if (!employee) return NextResponse.json({ error: "not found" }, { status: 404 });

  await setEmployeePhoto(employee, null);
  if (employee.photo_url) await del(employee.photo_url).catch(() => {});
  return NextResponse.json({ ok: true });
}
