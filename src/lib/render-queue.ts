import { EventEmitter } from "events";
import { renderAngelNumber, renderAngelNumberDual, type RenderOptions } from "./render";
import { sendWebhook } from "./webhook";
import { log, generateReport } from "./logger";
import { calculatePublishAt, getGroupForNumber } from "./utils";
import { getDb } from "./db";
import { downloadAudiosForGroup } from "./audius";
import type { RenderProgress, BatchLogEntry, BatchJob } from "@/types";

export type BatchIdioma = "es" | "en" | "ambos";

interface BatchOptions extends RenderOptions {
  idioma?: BatchIdioma;
  startDate?: string;
}

class RenderQueue extends EventEmitter {
  private isRunning = false;
  private currentProgress: RenderProgress = {
    total: 0,
    completado: 0,
    actual: 0,
    status: "idle",
  };
  private currentLog: BatchLogEntry[] = [];

  getProgress(): RenderProgress {
    return { ...this.currentProgress, log: [...this.currentLog] };
  }

  isActive(): boolean {
    return this.isRunning;
  }

  cancel(): void {
    if (this.isRunning) {
      this.isRunning = false;
      this.currentProgress.status = "error";
      this.emit("progress", { ...this.currentProgress, log: this.currentLog });
      log("batch", "Lote cancelado por el usuario");
    }
  }

  async renderBatch(
    desde: number,
    hasta: number,
    options: BatchOptions = {}
  ): Promise<void> {
    if (this.isRunning) throw new Error("Ya hay un lote en proceso");

    this.isRunning = true;
    const { idioma = "ambos", startDate, ...renderOpts } = options;
    const total = hasta - desde + 1;
    const batchId = `batch-${desde}-${hasta}-${Date.now()}`;

    this.currentLog = [];
    this.currentProgress = {
      total,
      completado: 0,
      actual: desde,
      status: "rendering",
      batchId,
      desde,
      hasta,
      idioma,
      startDate,
    };

    // Guardar job en DB
    const db = getDb();
    db.prepare(`
      INSERT INTO batch_jobs (id, desde, hasta, idioma, start_date, status, total, completado, log)
      VALUES (?, ?, ?, ?, ?, 'running', ?, 0, '[]')
    `).run(batchId, desde, hasta, idioma, startDate ?? null, total);

    this.emit("progress", { ...this.currentProgress, log: this.currentLog });
    log("batch", `Iniciando lote ${desde}-${hasta} (${total} números, idioma: ${idioma})`, { batchId });

    // Asegurar mínimo 20 audios por cada grupo involucrado en el lote
    const gruposInvolucrados = new Set<number>();
    for (let n = desde; n <= hasta; n++) gruposInvolucrados.add(getGroupForNumber(n));

    for (const grupo of Array.from(gruposInvolucrados)) {
      const row = db.prepare("SELECT COUNT(*) as c FROM audios WHERE grupo = ?").get(grupo) as { c: number };
      const needed = Math.max(0, 20 - row.c);
      if (needed > 0) {
        this.currentProgress.mensaje = `Preparando audios grupo ${grupo} (${row.c}/20)...`;
        this.emit("progress", { ...this.currentProgress, log: this.currentLog });
        try {
          const downloaded = await downloadAudiosForGroup(grupo, needed);
          log("batch", `Grupo ${grupo}: ${downloaded} audios descargados de Audius`, { batchId });
        } catch (err) {
          log("error", `No se pudo descargar audios para grupo ${grupo}: ${err}`, { batchId });
        }
        this.currentProgress.mensaje = undefined;
      }
    }

    const addLog = (entry: BatchLogEntry) => {
      this.currentLog.push(entry);
      // Actualizar log en DB
      const job = db.prepare("SELECT log FROM batch_jobs WHERE id = ?").get(batchId) as { log: string } | undefined;
      if (job) {
        const existing: BatchLogEntry[] = JSON.parse(job.log);
        existing.push(entry);
        db.prepare("UPDATE batch_jobs SET log = ? WHERE id = ?")
          .run(JSON.stringify(existing), batchId);
      }
    };

    const emitProgress = () => {
      this.emit("progress", { ...this.currentProgress, log: [...this.currentLog] });
    };

    const mkEntry = (
      n: number,
      idiomaEntry: BatchLogEntry["idioma"],
      fase: BatchLogEntry["fase"],
      status: BatchLogEntry["status"],
      msg: string
    ): BatchLogEntry => ({ n, idioma: idiomaEntry, fase, status, msg, ts: new Date().toISOString() });

    for (let n = desde; n <= hasta; n++) {
      if (!this.isRunning) break;

      this.currentProgress.actual = n;
      emitProgress();

      const index = n - desde;
      const scheduledAt = startDate ? calculatePublishAt(startDate, index) : undefined;

      try {
        if (idioma === "ambos") {
          addLog(mkEntry(n, "es", "render", "running", `#${n} ES → Renderizando...`));
          emitProgress();
          await renderAngelNumber(n, "es", { ...renderOpts, scheduledAt });
          addLog(mkEntry(n, "es", "render", "done", `#${n} ES → Renderizado ✓`));
          emitProgress();

          addLog(mkEntry(n, "en", "render", "running", `#${n} EN → Renderizando...`));
          emitProgress();
          await renderAngelNumber(n, "en", { ...renderOpts, scheduledAt });
          addLog(mkEntry(n, "en", "render", "done", `#${n} EN → Renderizado ✓`));
          emitProgress();
        } else {
          addLog(mkEntry(n, idioma as "es" | "en", "render", "running", `#${n} ${idioma.toUpperCase()} → Renderizando...`));
          emitProgress();
          await renderAngelNumber(n, idioma as "es" | "en", { ...renderOpts, scheduledAt });
          addLog(mkEntry(n, idioma as "es" | "en", "render", "done", `#${n} ${idioma.toUpperCase()} → Renderizado ✓`));
          emitProgress();
        }

        addLog(mkEntry(n, "ambos", "webhook", "running", `#${n} → Enviando a n8n...`));
        emitProgress();
        await sendWebhook(n, batchId, scheduledAt);
        addLog(mkEntry(n, "ambos", "webhook", "done", `#${n} → Webhook enviado ✓`));

        this.currentProgress.completado++;
        db.prepare("UPDATE batch_jobs SET completado = ? WHERE id = ?")
          .run(this.currentProgress.completado, batchId);
        emitProgress();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        addLog(mkEntry(n, "ambos", "render", "error", `#${n} → Error: ${msg}`));
        emitProgress();
        log("error", `Error en número ${n}: ${msg}`, { angelNumber: n, batchId });
      }
    }

    this.currentProgress.status = this.isRunning ? "done" : "error";
    this.isRunning = false;

    // Actualizar estado final en DB
    db.prepare("UPDATE batch_jobs SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(this.currentProgress.status, batchId);

    emitProgress();

    const report = generateReport(batchId, desde, hasta);
    log("batch", report, { batchId });
  }

  async renderRetry(jobId: string): Promise<void> {
    if (this.isRunning) throw new Error("Ya hay un lote en proceso");

    const db = getDb();
    const jobRow = db.prepare("SELECT * FROM batch_jobs WHERE id = ?")
      .get(jobId) as (Omit<BatchJob, "log"> & { log: string }) | undefined;
    if (!jobRow) throw new Error(`Job ${jobId} no encontrado`);

    const originalLog: BatchLogEntry[] = JSON.parse(jobRow.log);
    const failedSet = new Set(originalLog.filter((e) => e.status === "error").map((e) => e.n));
    const failedNumbers = Array.from(failedSet).sort((a, b) => a - b);

    if (failedNumbers.length === 0) throw new Error("No hay números fallidos en este lote");

    this.isRunning = true;
    const idioma = jobRow.idioma as BatchIdioma;
    const startDate = jobRow.start_date ?? undefined;
    const originalDesde = jobRow.desde;
    const total = failedNumbers.length;
    const batchId = `retry-${jobId}-${Date.now()}`;

    this.currentLog = [];
    this.currentProgress = {
      total,
      completado: 0,
      actual: failedNumbers[0],
      status: "rendering",
      batchId,
      desde: failedNumbers[0],
      hasta: failedNumbers[failedNumbers.length - 1],
      idioma,
      startDate,
    };

    db.prepare(`
      INSERT INTO batch_jobs (id, desde, hasta, idioma, start_date, status, total, completado, log)
      VALUES (?, ?, ?, ?, ?, 'running', ?, 0, '[]')
    `).run(batchId, failedNumbers[0], failedNumbers[failedNumbers.length - 1], idioma, startDate ?? null, total);

    this.emit("progress", { ...this.currentProgress, log: this.currentLog });
    log("batch", `Reintentando ${total} números fallidos del lote ${jobId}`, { batchId });

    const addLog = (entry: BatchLogEntry) => {
      this.currentLog.push(entry);
      const job = db.prepare("SELECT log FROM batch_jobs WHERE id = ?").get(batchId) as { log: string } | undefined;
      if (job) {
        const existing: BatchLogEntry[] = JSON.parse(job.log);
        existing.push(entry);
        db.prepare("UPDATE batch_jobs SET log = ? WHERE id = ?").run(JSON.stringify(existing), batchId);
      }
    };

    const emitProgress = () => {
      this.emit("progress", { ...this.currentProgress, log: [...this.currentLog] });
    };

    const mkEntry = (
      n: number,
      idiomaEntry: BatchLogEntry["idioma"],
      fase: BatchLogEntry["fase"],
      status: BatchLogEntry["status"],
      msg: string
    ): BatchLogEntry => ({ n, idioma: idiomaEntry, fase, status, msg, ts: new Date().toISOString() });

    for (const n of failedNumbers) {
      if (!this.isRunning) break;

      this.currentProgress.actual = n;
      emitProgress();

      // Preservar la fecha de publicación original del número
      const index = n - originalDesde;
      const scheduledAt = startDate ? calculatePublishAt(startDate, index) : undefined;

      try {
        if (idioma === "ambos") {
          addLog(mkEntry(n, "es", "render", "running", `#${n} ES → Renderizando...`));
          emitProgress();
          await renderAngelNumber(n, "es", { scheduledAt });
          addLog(mkEntry(n, "es", "render", "done", `#${n} ES → Renderizado ✓`));
          emitProgress();

          addLog(mkEntry(n, "en", "render", "running", `#${n} EN → Renderizando...`));
          emitProgress();
          await renderAngelNumber(n, "en", { scheduledAt });
          addLog(mkEntry(n, "en", "render", "done", `#${n} EN → Renderizado ✓`));
          emitProgress();
        } else {
          addLog(mkEntry(n, idioma as "es" | "en", "render", "running", `#${n} ${idioma.toUpperCase()} → Renderizando...`));
          emitProgress();
          await renderAngelNumber(n, idioma as "es" | "en", { scheduledAt });
          addLog(mkEntry(n, idioma as "es" | "en", "render", "done", `#${n} ${idioma.toUpperCase()} → Renderizado ✓`));
          emitProgress();
        }

        addLog(mkEntry(n, "ambos", "webhook", "running", `#${n} → Enviando a n8n...`));
        emitProgress();
        await sendWebhook(n, batchId, scheduledAt);
        addLog(mkEntry(n, "ambos", "webhook", "done", `#${n} → Webhook enviado ✓`));

        this.currentProgress.completado++;
        db.prepare("UPDATE batch_jobs SET completado = ? WHERE id = ?")
          .run(this.currentProgress.completado, batchId);
        emitProgress();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        addLog(mkEntry(n, "ambos", "render", "error", `#${n} → Error: ${msg}`));
        emitProgress();
        log("error", `Error reintentando número ${n}: ${msg}`, { angelNumber: n, batchId });
      }
    }

    this.currentProgress.status = this.isRunning ? "done" : "error";
    this.isRunning = false;

    db.prepare("UPDATE batch_jobs SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(this.currentProgress.status, batchId);

    emitProgress();
  }
}

export const renderQueue = new RenderQueue();
