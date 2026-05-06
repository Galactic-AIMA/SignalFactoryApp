import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { downloadBackgroundsForGroup } from "@/lib/pexels";
import { downloadAudiosForGroup } from "@/lib/audius";
import { z } from "zod";

export async function GET() {
  const db = getDb();
  const backgrounds = db.prepare(`
    SELECT grupo, COUNT(*) as total,
      SUM(CASE WHEN usado_es = 0 THEN 1 ELSE 0 END) as disponibles_es,
      SUM(CASE WHEN usado_en = 0 THEN 1 ELSE 0 END) as disponibles_en
    FROM backgrounds GROUP BY grupo
  `).all();
  const audios = db.prepare(`
    SELECT grupo, COUNT(*) as total,
      SUM(CASE WHEN usado_es = 0 THEN 1 ELSE 0 END) as disponibles_es,
      SUM(CASE WHEN usado_en = 0 THEN 1 ELSE 0 END) as disponibles_en
    FROM audios GROUP BY grupo
  `).all();

  return NextResponse.json({ backgrounds, audios });
}

const downloadSchema = z.object({
  grupo: z.number().int().min(1).max(5),
  tipo: z.enum(["background", "audio"]).default("background"),
  cantidad: z.number().int().min(1).max(20).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { grupo, tipo, cantidad = 5 } = downloadSchema.parse(body);

    const downloaded = tipo === "audio"
      ? await downloadAudiosForGroup(grupo, cantidad)
      : await downloadBackgroundsForGroup(grupo, cantidad);

    const label = tipo === "audio" ? "audios" : "fondos";
    return NextResponse.json({ ok: true, descargados: downloaded, grupo, tipo: label });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
