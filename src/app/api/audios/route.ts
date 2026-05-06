import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import path from "path";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const grupo = parseInt(searchParams.get("grupo") || "0");

  const db = getDb();
  const assetsDir = path.resolve(process.cwd(), "assets");

  const query = grupo
    ? "SELECT * FROM audios WHERE grupo = ? ORDER BY id DESC"
    : "SELECT * FROM audios ORDER BY grupo, id DESC";

  const rows = grupo
    ? db.prepare(query).all(grupo)
    : db.prepare(query).all();

  const items = (rows as Record<string, unknown>[]).map((r) => ({
    id: r.id as number,
    grupo: r.grupo as number,
    tags: (r.tags as string) || "",
    fuente: (r.fuente as string) || "",
    staticPath: path.relative(assetsDir, r.archivo as string).replace(/\\/g, "/"),
  }));

  return NextResponse.json({ audios: items, total: items.length });
}
