import { EventEmitter } from "events";
import { renderAngelNumber, renderAngelNumberDual, type RenderOptions } from "./render";
import { sendWebhook } from "./webhook";
import { log, generateReport } from "./logger";
import { calculatePublishAt } from "./utils";
import type { RenderProgress } from "@/types";

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

  getProgress(): RenderProgress {
    return { ...this.currentProgress };
  }

  isActive(): boolean {
    return this.isRunning;
  }

  cancel(): void {
    if (this.isRunning) {
      this.isRunning = false;
      this.currentProgress.status = "error";
      this.emit("progress", { ...this.currentProgress });
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

    this.currentProgress = { total, completado: 0, actual: desde, status: "rendering" };
    this.emit("progress", this.currentProgress);

    log("batch", `Iniciando lote ${desde}-${hasta} (${total} números, idioma: ${idioma})`, { batchId });

    for (let n = desde; n <= hasta; n++) {
      this.currentProgress.actual = n;
      this.emit("progress", { ...this.currentProgress });

      const index = n - desde;
      const scheduledAt = startDate ? calculatePublishAt(startDate, index) : undefined;

      try {
        if (idioma === "ambos") {
          await renderAngelNumberDual(n, { ...renderOpts, scheduledAt });
        } else {
          await renderAngelNumber(n, idioma, { ...renderOpts, scheduledAt });
        }
        await sendWebhook(n, batchId, scheduledAt);
        this.currentProgress.completado++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("error", `Error en número ${n}: ${msg}`, { angelNumber: n, batchId });
      }

      this.emit("progress", { ...this.currentProgress });
    }

    this.currentProgress.status = "done";
    this.emit("progress", { ...this.currentProgress });

    const report = generateReport(batchId, desde, hasta);
    log("batch", report, { batchId });

    this.isRunning = false;
  }
}

export const renderQueue = new RenderQueue();
