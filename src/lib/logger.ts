import { getDb } from "./db";
import type { LogEntry } from "@/types";

type LogTipo = "render" | "webhook" | "error" | "batch";

export function log(tipo: LogTipo, mensaje: string, detalle?: Record<string, unknown>): void {
  const db = getDb();
  db.prepare("INSERT INTO logs (tipo, mensaje, detalle) VALUES (?, ?, ?)")
    .run(tipo, mensaje, detalle ? JSON.stringify(detalle) : null);
}

export function getLogs(limit = 100, tipo?: LogTipo): LogEntry[] {
  const db = getDb();
  if (tipo) {
    return db.prepare("SELECT * FROM logs WHERE tipo = ? ORDER BY created_at DESC LIMIT ?")
      .all(tipo, limit) as LogEntry[];
  }
  return db.prepare("SELECT * FROM logs ORDER BY created_at DESC LIMIT ?")
    .all(limit) as LogEntry[];
}

export function generateReport(batchId: string, desde: number, hasta: number): string {
  const db = getDb();
  const total = hasta - desde + 1;
  const renderizados = db.prepare(`
    SELECT COUNT(DISTINCT angel_number_id) as c FROM renders
    WHERE angel_number_id BETWEEN ? AND ?
  `).get(desde, hasta) as { c: number };
  const webhooks = db.prepare(`
    SELECT COUNT(*) as c FROM renders
    WHERE angel_number_id BETWEEN ? AND ? AND webhook_enviado = 1
  `).get(desde, hasta) as { c: number };
  const errores = db.prepare(`
    SELECT COUNT(*) as c FROM logs
    WHERE tipo = 'error' AND detalle LIKE ?
  `).get(`%${batchId}%`) as { c: number };

  return `Lote ${desde}-${hasta}: ${renderizados.c}/${total} números renderizados. ` +
    `${webhooks.c} webhooks enviados. ${errores.c} errores.`;
}
