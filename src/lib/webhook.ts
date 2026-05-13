import { getDb } from "./db";
import { log } from "./logger";
import type { WebhookPayload, AngelNumber } from "@/types";
import { VIBRATION_GROUPS } from "@/types";

const WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "";

export async function sendWebhook(angelNumberId: number, batchId?: string, publishAt?: string): Promise<boolean> {
  if (!WEBHOOK_URL) {
    log("webhook", `Webhook URL no configurada — skipping número ${angelNumberId}`);
    return false;
  }

  const db = getDb();
  const number = db.prepare("SELECT * FROM angel_numbers WHERE id = ?")
    .get(angelNumberId) as AngelNumber;
  const renders = db.prepare("SELECT * FROM renders WHERE angel_number_id = ?")
    .all(angelNumberId) as { idioma: string; archivo_output: string; video_url: string | null }[];

  const grupo = VIBRATION_GROUPS[number.grupo as keyof typeof VIBRATION_GROUPS];
  const emojis: Record<number, string> = {
    1: "☀️", 2: "🌊", 3: "🦋", 4: "🌅", 5: "🕊️"
  };
  const emoji = emojis[number.grupo] || "✨";

  const payload: WebhookPayload = {
    angel_number: angelNumberId,
    grupo: number.grupo,
    grupo_nombre: grupo.name,
    renders: renders.map((r) => ({
      idioma: r.idioma as "es" | "en",
      videoUrl: r.video_url,
      texto: r.idioma === "es" ? number.texto_es : number.texto_en,
      titulo: r.idioma === "es"
        ? `Número Angelical ${angelNumberId} ${emoji} Tu Señal de Hoy`
        : `Angel Number ${angelNumberId} ${emoji} Your Daily Sign`,
      descripcion: r.idioma === "es"
        ? `Tu señal de hoy: ${angelNumberId}. Te recomendamos escribir este número en un pedazo de papel donde frecuentemente puedas verlo y meditar acerca de él para atraer sus propiedades de vibración. ¿En qué pensabas antes de ver esto? Déjalo en los comentarios.`
        : `Your sign today: ${angelNumberId}. We recommend writing this number on a piece of paper where you can frequently see it and meditate on it to attract its vibration properties. What were you thinking before seeing this? Leave it in the comments.`,
      tags: r.idioma === "es"
        ? [`número angelical ${angelNumberId}`, `significado ${angelNumberId}`, "señales divinas", "espiritualidad", "numerología", grupo.name]
        : [`angel number ${angelNumberId}`, `${angelNumberId} meaning`, "divine signs", "spirituality", "numerology"],
      ...(publishAt ? { publishAt } : {}),
    })),
    batch_id: batchId,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    const success = response.ok;

    db.prepare("UPDATE renders SET webhook_enviado = ?, webhook_response = ? WHERE angel_number_id = ?")
      .run(success ? 1 : 0, responseText, angelNumberId);

    log("webhook", `Webhook ${success ? "OK" : "FAIL"} para número ${angelNumberId}`, {
      status: response.status,
      angelNumber: angelNumberId,
    });

    return success;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", `Webhook falló para número ${angelNumberId}: ${msg}`, {
      angelNumber: angelNumberId,
      error: msg,
    });
    return false;
  }
}
