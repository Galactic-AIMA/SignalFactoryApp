import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import type { AngelNumber, WebhookPayload } from "@/types";
import { VIBRATION_GROUPS } from "@/types";

const WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "";

const schema = z.object({
  angelNumber: z.number().int().min(0).max(999),
  publishAt: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!WEBHOOK_URL) {
    return NextResponse.json({ ok: false, error: "N8N_WEBHOOK_URL no configurada en .env" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON inválido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });
  }

  const { angelNumber, publishAt } = parsed.data;

  const db = getDb();
  const number = db.prepare("SELECT * FROM angel_numbers WHERE id = ?").get(angelNumber) as AngelNumber | undefined;
  if (!number) {
    return NextResponse.json({ ok: false, error: `Número ${angelNumber} no encontrado en la DB` }, { status: 404 });
  }

  const renders = db.prepare(
    "SELECT idioma, video_url FROM renders WHERE angel_number_id = ? ORDER BY created_at DESC"
  ).all(angelNumber) as { idioma: string; video_url: string | null }[];

  if (renders.length === 0) {
    return NextResponse.json({
      ok: false,
      error: `El número ${angelNumber} no tiene renders. Renderízalo primero para obtener una URL de video.`,
    }, { status: 400 });
  }

  // Deduplicar: un render por idioma (el más reciente, que ya viene primero por ORDER BY)
  const seen = new Set<string>();
  const uniqueRenders = renders.filter((r) => {
    if (seen.has(r.idioma)) return false;
    seen.add(r.idioma);
    return true;
  });

  const grupo = VIBRATION_GROUPS[number.grupo as keyof typeof VIBRATION_GROUPS];
  const emojis: Record<number, string> = { 1: "☀️", 2: "🌊", 3: "🦋", 4: "🌅", 5: "🕊️" };
  const emoji = emojis[number.grupo] || "✨";

  const payload: WebhookPayload = {
    angel_number: angelNumber,
    grupo: number.grupo,
    grupo_nombre: grupo.name,
    renders: uniqueRenders.map((r) => ({
      idioma: r.idioma as "es" | "en",
      videoUrl: r.video_url,
      texto: r.idioma === "es" ? number.texto_es : number.texto_en,
      titulo: r.idioma === "es"
        ? `Número Angelical ${angelNumber} ${emoji} Tu Señal de Hoy`
        : `Angel Number ${angelNumber} ${emoji} Your Daily Sign`,
      descripcion: r.idioma === "es"
        ? `Tu señal de hoy: ${angelNumber}. Te recomendamos escribir este número en un pedazo de papel donde frecuentemente puedas verlo y meditar acerca de él para atraer sus propiedades de vibración. ¿En qué pensabas antes de ver esto? Déjalo en los comentarios.`
        : `Your sign today: ${angelNumber}. We recommend writing this number on a piece of paper where you can frequently see it and meditate on it to attract its vibration properties. What were you thinking before seeing this? Leave it in the comments.`,
      tags: r.idioma === "es"
        ? [`número angelical ${angelNumber}`, `significado ${angelNumber}`, "señales divinas", "espiritualidad", "numerología", grupo.name]
        : [`angel number ${angelNumber}`, `${angelNumber} meaning`, "divine signs", "spirituality", "numerology"],
      ...(publishAt ? { publishAt } : {}),
    })),
    batch_id: `test-${angelNumber}-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      payloadEnviado: payload,
      respuestaN8n: responseText,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: `Error de conexión con n8n: ${msg}` }, { status: 502 });
  }
}
