import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { renderQueue } from "@/lib/render-queue";
import { getDb } from "@/lib/db";
import type { BatchJob, RenderProgress } from "@/types";

export async function GET() {
  const db = getDb();

  // Detectar lote activo desde DB (sobrevive hot-reload del servidor)
  const runningJob = db.prepare(
    "SELECT * FROM batch_jobs WHERE status = 'running' ORDER BY started_at DESC LIMIT 1"
  ).get() as (Omit<BatchJob, "log"> & { log: string }) | undefined;

  const isActiveFromDB = !!runningJob;
  const memProgress = renderQueue.getProgress();

  // Si la memoria dice "rendering" usar eso; si no, reconstruir desde DB
  const progress: RenderProgress = memProgress.status === "rendering"
    ? memProgress
    : runningJob
      ? {
          total: runningJob.total,
          completado: runningJob.completado,
          actual: runningJob.hasta,
          status: "rendering" as const,
          batchId: runningJob.id,
          desde: runningJob.desde,
          hasta: runningJob.hasta,
          idioma: runningJob.idioma,
          startDate: runningJob.start_date ?? undefined,
          log: JSON.parse(runningJob.log) as BatchJob["log"],
        }
      : memProgress;

  const lastJob = db.prepare(
    "SELECT * FROM batch_jobs ORDER BY started_at DESC LIMIT 1"
  ).get() as (Omit<BatchJob, "log"> & { log: string }) | undefined;

  const parsed = lastJob
    ? { ...lastJob, log: JSON.parse(lastJob.log) as BatchJob["log"] }
    : null;

  return NextResponse.json({
    isActive: isActiveFromDB || renderQueue.isActive(),
    progress,
    lastJob: parsed,
  });
}

export async function DELETE() {
  renderQueue.cancel();
  return NextResponse.json({ ok: true, mensaje: "Lote cancelado" });
}

export async function PATCH(req: NextRequest) {
  try {
    const { jobId } = await req.json() as { jobId: string };
    if (!jobId) {
      return NextResponse.json({ ok: false, error: "jobId requerido" }, { status: 400 });
    }
    if (renderQueue.isActive()) {
      return NextResponse.json({ ok: false, error: "Ya hay un lote en proceso" }, { status: 409 });
    }
    renderQueue.renderRetry(jobId).catch(() => {});
    return NextResponse.json({ ok: true, mensaje: "Reintentando números fallidos..." });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
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
