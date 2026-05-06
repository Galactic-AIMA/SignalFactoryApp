/**
 * Escanea assets/backgrounds y assets/music en disco
 * y registra en la DB los que no existen.
 * Uso: npx tsx src/lib/scan-assets.ts
 */
import fs from "fs";
import path from "path";
import { getDb } from "./db";

const ASSETS_DIR = path.resolve(process.cwd(), "assets");

function scanDir(baseDir: string, table: "backgrounds" | "audios", fuente: string) {
  const db = getDb();
  let registered = 0;

  for (let grupo = 1; grupo <= 5; grupo++) {
    const dir = path.join(baseDir, `grupo-${grupo}`);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter((f) =>
      table === "backgrounds"
        ? f.endsWith(".mp4") || f.endsWith(".webm")
        : f.endsWith(".mp3") || f.endsWith(".wav") || f.endsWith(".ogg")
    );

    for (const file of files) {
      const filepath = path.join(dir, file);
      const exists = db.prepare(`SELECT id FROM ${table} WHERE archivo = ?`).get(filepath);
      if (exists) continue;

      db.prepare(`INSERT INTO ${table} (grupo, archivo, fuente, tags) VALUES (?, ?, ?, ?)`)
        .run(grupo, filepath, fuente, `grupo-${grupo}`);
      registered++;
    }
  }

  return registered;
}

const bgs = scanDir(path.join(ASSETS_DIR, "backgrounds"), "backgrounds", "pexels");
const auds = scanDir(path.join(ASSETS_DIR, "music"), "audios", "manual");

console.log(`Escaneo completado: ${bgs} fondos y ${auds} audios registrados.`);
