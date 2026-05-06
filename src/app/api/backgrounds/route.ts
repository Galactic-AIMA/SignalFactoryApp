import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import path from "path";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const grupo = parseInt(searchParams.get("grupo") || "0");

  const db = getDb();
  const assetsDir = path.resolve(process.cwd(), "assets");

  const rows = grupo
    ? (db.prepare("SELECT * FROM backgrounds WHERE grupo = ? ORDER BY id DESC").all(grupo) as Record<string, unknown>[])
    : (db.prepare("SELECT * FROM backgrounds ORDER BY grupo, id DESC").all() as Record<string, unknown>[]);

  const backgrounds = rows.map((r) => ({
    id: r.id as number,
    grupo: r.grupo as number,
    pexelsId: (r.pexels_id as string | null) ?? null,
    tags: (r.tags as string) || "",
    staticPath: path.relative(assetsDir, r.archivo as string).replace(/\\/g, "/"),
  }));

  return NextResponse.json({ backgrounds, total: backgrounds.length });
}
