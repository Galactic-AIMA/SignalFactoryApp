/**
 * Revierte un lote de renders: limpia DB, libera flags de assets y borra archivos locales.
 * Uso: npx tsx scripts/rollback-batch.ts <desde> <hasta>
 * Ejemplo: npx tsx scripts/rollback-batch.ts 14 23
 */
import path from "path";
import fs from "fs";
import { getDb } from "../src/lib/db";
import { padNumber } from "../src/lib/utils";

const args = process.argv.slice(2);
const desde = parseInt(args[0] ?? "14");
const hasta  = parseInt(args[1] ?? "23");

if (isNaN(desde) || isNaN(hasta) || desde > hasta) {
  console.error("Uso: npx tsx scripts/rollback-batch.ts <desde> <hasta>");
  process.exit(1);
}

function main() {
  const db = getDb();
  console.log(`\n=== Rollback renders ${desde}–${hasta} ===\n`);

  // 1. Renders existentes en el rango
  const renders = db.prepare(
    "SELECT id, angel_number_id, idioma, background_id, audio_id FROM renders WHERE angel_number_id BETWEEN ? AND ?"
  ).all(desde, hasta) as { id: number; angel_number_id: number; idioma: string; background_id: number; audio_id: number }[];

  if (renders.length === 0) {
    console.log("No hay renders en ese rango. Nada que hacer.");
    return;
  }
  console.log(`Renders encontrados: ${renders.length}`);

  // 2. Liberar flags de assets usados EXCLUSIVAMENTE en ese rango
  let bgLiberados = 0;
  let audioLiberados = 0;

  for (const idioma of ["es", "en"] as const) {
    const usadoCol = idioma === "es" ? "usado_es" : "usado_en";

    // Backgrounds que solo aparecen en renders del rango (no en renders fuera del rango)
    const bgsExclusivos = db.prepare(`
      SELECT DISTINCT background_id FROM renders
      WHERE angel_number_id BETWEEN ? AND ? AND idioma = ?
        AND NOT EXISTS (
          SELECT 1 FROM renders r2
          WHERE r2.background_id = renders.background_id
            AND r2.idioma = ?
            AND r2.angel_number_id NOT BETWEEN ? AND ?
        )
    `).all(desde, hasta, idioma, idioma, desde, hasta) as { background_id: number }[];

    for (const { background_id } of bgsExclusivos) {
      db.prepare(`UPDATE backgrounds SET ${usadoCol} = 0 WHERE id = ?`).run(background_id);
      bgLiberados++;
    }

    // Audios exclusivos
    const audiosExclusivos = db.prepare(`
      SELECT DISTINCT audio_id FROM renders
      WHERE angel_number_id BETWEEN ? AND ? AND idioma = ?
        AND NOT EXISTS (
          SELECT 1 FROM renders r2
          WHERE r2.audio_id = renders.audio_id
            AND r2.idioma = ?
            AND r2.angel_number_id NOT BETWEEN ? AND ?
        )
    `).all(desde, hasta, idioma, idioma, desde, hasta) as { audio_id: number }[];

    for (const { audio_id } of audiosExclusivos) {
      db.prepare(`UPDATE audios SET ${usadoCol} = 0 WHERE id = ?`).run(audio_id);
      audioLiberados++;
    }
  }

  // Limpiar puntero asignado_a para assets que apuntan a números del rango
  db.prepare("UPDATE backgrounds SET asignado_a = NULL WHERE asignado_a BETWEEN ? AND ?").run(desde, hasta);
  db.prepare("UPDATE audios      SET asignado_a = NULL WHERE asignado_a BETWEEN ? AND ?").run(desde, hasta);

  console.log(`Assets liberados: ${bgLiberados} backgrounds, ${audioLiberados} audios`);

  // 3. Borrar registros de renders
  const { changes } = db.prepare("DELETE FROM renders WHERE angel_number_id BETWEEN ? AND ?").run(desde, hasta);
  console.log(`Renders eliminados de DB: ${changes}`);

  // 4. Resetear estado de angel_numbers a pendiente
  db.prepare("UPDATE angel_numbers SET estado = 'pendiente' WHERE id BETWEEN ? AND ?").run(desde, hasta);
  console.log(`Estado reseteado a 'pendiente' para números ${desde}–${hasta}`);

  // 5. Marcar el batch_job más reciente que cubra ese rango como cancelado
  db.prepare(`
    UPDATE batch_jobs SET status = 'cancelled'
    WHERE id = (
      SELECT id FROM batch_jobs
      WHERE desde <= ? AND hasta >= ? AND status IN ('done', 'error', 'running')
      ORDER BY started_at DESC LIMIT 1
    )
  `).run(desde, hasta);
  console.log("Batch job marcado como cancelado");

  // 6. Borrar archivos .mp4 locales
  const outputDir = path.resolve(process.cwd(), "output");
  let archivosEliminados = 0;

  for (let n = desde; n <= hasta; n++) {
    const pad = padNumber(n);
    for (const idioma of ["es", "en"]) {
      const filePath = path.join(outputDir, idioma, `${pad}-${idioma}.mp4`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`  Borrado: output/${idioma}/${pad}-${idioma}.mp4`);
        archivosEliminados++;
      }
    }
  }
  console.log(`Archivos eliminados: ${archivosEliminados}`);

  console.log(`\n✓ Rollback completado. Puedes re-renderizar el lote ${desde}–${hasta} desde la app.`);
  console.log("  Recuerda borrar manualmente los videos en YouTube Studio / R2 si ya se subieron.\n");
}

main();
