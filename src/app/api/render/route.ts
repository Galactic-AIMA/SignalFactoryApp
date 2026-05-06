import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { renderAngelNumber, renderAngelNumberDual } from "@/lib/render";
import { sendWebhook } from "@/lib/webhook";
import { getDb } from "@/lib/db";

// Render puede tardar ~5 min — extender timeout a 10 min
export const maxDuration = 600;

const schema = z.object({
  numero: z.number().int().min(0).max(999),
  estilo: z.enum(["unified", "serene", "raw", "minimal", "cinematic", "bold"]).optional(),
  efecto: z.enum(["fadeIn", "typewriter", "slideUp", "scaleIn", "glowPulse"]).optional(),
  idioma: z.enum(["es", "en"]).optional(),
  backgroundId: z.number().int().positive().optional(),
  audioId: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  let parsedNumero: number | undefined;
  try {
    const body = await req.json();
    const { numero, estilo, efecto, idioma, backgroundId, audioId } = schema.parse(body);
    parsedNumero = numero;

    const renderOpts = { estilo, efecto, backgroundId, audioId };

    if (idioma) {
      const outputPath = await renderAngelNumber(numero, idioma, renderOpts);
      await sendWebhook(numero);
      return NextResponse.json({ ok: true, numero, idioma, path: outputPath });
    } else {
      const result = await renderAngelNumberDual(numero, renderOpts);
      await sendWebhook(numero);
      return NextResponse.json({ ok: true, numero, paths: result });
    }
  } catch (err) {
    if (parsedNumero !== undefined) {
      try {
        getDb().prepare("UPDATE angel_numbers SET estado = 'error' WHERE id = ?").run(parsedNumero);
      } catch {}
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
