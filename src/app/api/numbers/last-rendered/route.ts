import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const result = db.prepare(
    "SELECT MAX(angel_number_id) AS last FROM renders"
  ).get() as { last: number | null };
  return NextResponse.json({ last: result.last });
}
