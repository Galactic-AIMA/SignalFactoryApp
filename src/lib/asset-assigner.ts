import { getDb } from "./db";
import type { Background, Audio } from "@/types";

interface AssignedAssets {
  background: Background;
  audio: Audio;
}

export function assignAssets(
  angelNumberId: number,
  grupo: number,
  idioma: "es" | "en",
  backgroundId?: number,
  audioId?: number
): AssignedAssets {
  const db = getDb();
  const usadoCol = idioma === "es" ? "usado_es" : "usado_en";

  let bg: Background | undefined;

  if (backgroundId) {
    // Background seleccionado manualmente por el usuario
    bg = db.prepare(`SELECT * FROM backgrounds WHERE id = ?`)
      .get(backgroundId) as Background | undefined;
    if (!bg) throw new Error(`Background id=${backgroundId} no encontrado`);
  } else {
    // Asignación automática (aleatorio del grupo)
    bg = db.prepare(`
      SELECT * FROM backgrounds
      WHERE grupo = ? AND ${usadoCol} = 0
      ORDER BY RANDOM()
      LIMIT 1
    `).get(grupo) as Background | undefined;

    // Si no hay backgrounds libres, reciclar
    if (!bg) {
      db.prepare(`UPDATE backgrounds SET ${usadoCol} = 0, asignado_a = NULL WHERE grupo = ?`)
        .run(grupo);
      bg = db.prepare(`
        SELECT * FROM backgrounds
        WHERE grupo = ? AND ${usadoCol} = 0
        ORDER BY RANDOM()
        LIMIT 1
      `).get(grupo) as Background | undefined;
    }
  }

  if (!bg) {
    throw new Error(
      `No hay backgrounds para grupo ${grupo}. Descarga más assets.`
    );
  }

  let audio: Audio | undefined;

  if (audioId) {
    audio = db.prepare(`SELECT * FROM audios WHERE id = ?`).get(audioId) as Audio | undefined;
    if (!audio) throw new Error(`Audio id=${audioId} no encontrado`);
  } else {
    audio = db.prepare(`
      SELECT * FROM audios
      WHERE grupo = ? AND ${usadoCol} = 0
      ORDER BY RANDOM()
      LIMIT 1
    `).get(grupo) as Audio | undefined;

    // Si no hay audios libres, reciclar
    if (!audio) {
      db.prepare(`UPDATE audios SET ${usadoCol} = 0, asignado_a = NULL WHERE grupo = ?`).run(grupo);
      audio = db.prepare(`
        SELECT * FROM audios
        WHERE grupo = ? AND ${usadoCol} = 0
        ORDER BY RANDOM()
        LIMIT 1
      `).get(grupo) as Audio | undefined;
    }
  }

  if (!audio) {
    throw new Error(
      `No hay audios para grupo ${grupo}. Agrega pistas de audio.`
    );
  }

  db.prepare(`UPDATE backgrounds SET ${usadoCol} = 1, asignado_a = ? WHERE id = ?`)
    .run(angelNumberId, bg.id);
  db.prepare(`UPDATE audios SET ${usadoCol} = 1, asignado_a = ? WHERE id = ?`)
    .run(angelNumberId, audio.id);

  return {
    background: { ...bg, [`usado_${idioma}`]: true, asignado_a: angelNumberId },
    audio: { ...audio, [`usado_${idioma}`]: true, asignado_a: angelNumberId },
  };
}

export function getAvailableCount(grupo: number, idioma: "es" | "en"): {
  backgrounds: number;
  audios: number;
} {
  const db = getDb();
  const col = idioma === "es" ? "usado_es" : "usado_en";
  const bgs = db.prepare(`SELECT COUNT(*) as c FROM backgrounds WHERE grupo = ? AND ${col} = 0`).get(grupo) as { c: number };
  const auds = db.prepare(`SELECT COUNT(*) as c FROM audios WHERE grupo = ? AND ${col} = 0`).get(grupo) as { c: number };
  return { backgrounds: bgs.c, audios: auds.c };
}
