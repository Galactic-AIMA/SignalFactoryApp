import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { renderQueue } from "@/lib/render-queue";

export async function DELETE() {
  renderQueue.cancel();
  return NextResponse.json({ ok: true, mensaje: "Lote cancelado" });
}

const schema = z.object({
  desde: z.number().int().min(0).max(999),
  hasta: z.number().int().min(0).max(999),
  idioma: z.enum(["es", "en", "ambos"]).default("ambos"),
  estilo: z.enum(["unified", "serene", "raw", "minimal", "cinematic", "bold"]).optional(),
  efecto: z.enum(["fadeIn", "typewriter", "slideUp", "scaleIn", "glowPulse"]).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { desde, hasta, idioma, estilo, efecto, startDate } = schema.parse(body);

    if (hasta < desde) {
      return NextResponse.json({ ok: false, error: "'hasta' debe ser >= 'desde'" }, { status: 400 });
    }

    if (renderQueue.isActive()) {
      return NextResponse.json({ ok: false, error: "Ya hay un lote en proceso" }, { status: 409 });
    }

    renderQueue.renderBatch(desde, hasta, { idioma, estilo, efecto, startDate }).catch(() => {});

    const videos = idioma === "ambos" ? (hasta - desde + 1) * 2 : hasta - desde + 1;
    const schedMsg = startDate ? ` · Publicación desde ${startDate}` : "";
    return NextResponse.json({
      ok: true,
      mensaje: `Lote ${desde}-${hasta} iniciado — ${hasta - desde + 1} números × ${idioma === "ambos" ? "2 idiomas" : idioma.toUpperCase()} = ${videos} videos${schedMsg}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
