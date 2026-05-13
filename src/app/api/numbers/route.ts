import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const numbers = db.prepare(`
    SELECT
      an.*,
      (
        SELECT r.scheduled_at
        FROM renders r
        WHERE r.angel_number_id = an.id
        ORDER BY r.created_at DESC
        LIMIT 1
      ) AS scheduled_at
    FROM angel_numbers an
    ORDER BY an.id
  `).all();
  return NextResponse.json(numbers);
}
