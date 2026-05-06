import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const numbers = db.prepare("SELECT * FROM angel_numbers ORDER BY id").all();
  return NextResponse.json(numbers);
}
