import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import fs from "fs";
import path from "path";

const schema = z.object({
  pexelsId: z.number(),
  videoUrl: z.string().url(),
  grupo: z.number().min(1).max(5),
  tags: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pexelsId, videoUrl, grupo, tags } = schema.parse(body);

    const db = getDb();

    // Verificar si ya existe
    const existing = db.prepare("SELECT id FROM backgrounds WHERE pexels_id = ?")
      .get(String(pexelsId)) as { id: number } | undefined;

    if (existing) {
      return NextResponse.json({ ok: true, backgroundId: existing.id, alreadyExists: true });
    }

    // Descargar video
    const outputDir = path.resolve(process.cwd(), `assets/backgrounds/grupo-${grupo}`);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const filename = `pexels-${pexelsId}.mp4`;
    const filepath = path.join(outputDir, filename);

    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error(`Error descargando video: ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    // Registrar en DB
    const result = db.prepare(`
      INSERT INTO backgrounds (grupo, archivo, fuente, pexels_id, tags)
      VALUES (?, ?, 'pexels', ?, ?)
    `).run(grupo, filepath, String(pexelsId), tags || "");

    return NextResponse.json({
      ok: true,
      backgroundId: result.lastInsertRowid,
      alreadyExists: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
