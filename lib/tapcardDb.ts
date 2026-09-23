import sql from "@/lib/db";
import crypto from "crypto";

export interface TapCardRecord {
  id: string;
  name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  linkedin_url: string;
  photo_url: string | null;
}

type TapCardInput = Omit<TapCardRecord, "id" | "photo_url"> & { photo_url?: string | null };

export function newCardId(): string {
  // URL-safe, unguessable — this id is the only thing standing between a
  // card and the public internet (see the plan's privacy section: no auth,
  // security is obscurity of the id). 22 base64url chars ~= 128 bits.
  return crypto.randomBytes(16).toString("base64url");
}

export async function createCard(input: TapCardInput): Promise<string> {
  const id = newCardId();
  await sql`
    INSERT INTO tapcard_cards (id, name, title, company, phone, email, website, linkedin_url, photo_url)
    VALUES (${id}, ${input.name}, ${input.title}, ${input.company}, ${input.phone}, ${input.email}, ${input.website}, ${input.linkedin_url}, ${input.photo_url ?? null})
  `;
  return id;
}

export async function updateCard(id: string, input: TapCardInput): Promise<boolean> {
  const rows = await sql`
    UPDATE tapcard_cards
    SET name = ${input.name}, title = ${input.title}, company = ${input.company},
        phone = ${input.phone}, email = ${input.email}, website = ${input.website},
        linkedin_url = ${input.linkedin_url},
        photo_url = COALESCE(${input.photo_url ?? null}, photo_url),
        updated_at = now()
    WHERE id = ${id}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function getCard(id: string): Promise<TapCardRecord | null> {
  const rows = (await sql`SELECT * FROM tapcard_cards WHERE id = ${id}`) as TapCardRecord[];
  return rows[0] ?? null;
}

export async function deleteCard(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM tapcard_cards WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}
