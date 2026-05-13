import type Database from "better-sqlite3";

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS angel_numbers (
      id INTEGER PRIMARY KEY,
      grupo INTEGER NOT NULL CHECK(grupo BETWEEN 1 AND 5),
      grupo_nombre TEXT NOT NULL,
      texto_es TEXT NOT NULL,
      texto_en TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pendiente'
        CHECK(estado IN ('pendiente','renderizado_es','renderizado_en','completo','publicado')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS backgrounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grupo INTEGER NOT NULL CHECK(grupo BETWEEN 1 AND 5),
      archivo TEXT NOT NULL,
      variacion TEXT NOT NULL DEFAULT 'original'
        CHECK(variacion IN ('original','crop','speed','color','mirror','trim')),
      archivo_base_id INTEGER REFERENCES backgrounds(id),
      usado_es INTEGER NOT NULL DEFAULT 0,
      usado_en INTEGER NOT NULL DEFAULT 0,
      asignado_a INTEGER REFERENCES angel_numbers(id),
      fuente TEXT NOT NULL DEFAULT 'pexels',
      pexels_id TEXT,
      tags TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS audios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grupo INTEGER NOT NULL CHECK(grupo BETWEEN 1 AND 5),
      archivo TEXT NOT NULL,
      variacion TEXT NOT NULL DEFAULT 'original'
        CHECK(variacion IN ('original','crop','speed','color','mirror','trim')),
      archivo_base_id INTEGER REFERENCES audios(id),
      usado_es INTEGER NOT NULL DEFAULT 0,
      usado_en INTEGER NOT NULL DEFAULT 0,
      asignado_a INTEGER REFERENCES angel_numbers(id),
      fuente TEXT NOT NULL DEFAULT 'manual',
      tags TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS renders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      angel_number_id INTEGER NOT NULL REFERENCES angel_numbers(id),
      idioma TEXT NOT NULL CHECK(idioma IN ('es','en')),
      background_id INTEGER NOT NULL REFERENCES backgrounds(id),
      audio_id INTEGER NOT NULL REFERENCES audios(id),
      estilo TEXT NOT NULL DEFAULT 'unified',
      efecto_texto TEXT NOT NULL DEFAULT 'fadeIn',
      archivo_output TEXT NOT NULL,
      video_url TEXT,
      duracion_seg INTEGER NOT NULL DEFAULT 10,
      webhook_enviado INTEGER NOT NULL DEFAULT 0,
      webhook_response TEXT,
      youtube_video_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL CHECK(tipo IN ('render','webhook','error','batch')),
      mensaje TEXT NOT NULL,
      detalle TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_backgrounds_grupo_usado_es ON backgrounds(grupo, usado_es);
    CREATE INDEX IF NOT EXISTS idx_backgrounds_grupo_usado_en ON backgrounds(grupo, usado_en);
    CREATE INDEX IF NOT EXISTS idx_audios_grupo_usado_es ON audios(grupo, usado_es);
    CREATE INDEX IF NOT EXISTS idx_audios_grupo_usado_en ON audios(grupo, usado_en);
    CREATE INDEX IF NOT EXISTS idx_renders_angel_number ON renders(angel_number_id);
    CREATE INDEX IF NOT EXISTS idx_angel_numbers_estado ON angel_numbers(estado);
  `);

  // Migración no-destructiva: añadir scheduled_at si no existe
  try {
    db.exec(`ALTER TABLE renders ADD COLUMN scheduled_at DATETIME NULL`);
  } catch {
    // Columna ya existe — ignorar
  }

  // Tabla de jobs de batch para persistencia robusta
  db.exec(`
    CREATE TABLE IF NOT EXISTS batch_jobs (
      id TEXT PRIMARY KEY,
      desde INTEGER NOT NULL,
      hasta INTEGER NOT NULL,
      idioma TEXT NOT NULL,
      start_date TEXT,
      status TEXT NOT NULL DEFAULT 'running'
        CHECK(status IN ('running','done','error','cancelled')),
      total INTEGER NOT NULL,
      completado INTEGER NOT NULL DEFAULT 0,
      log TEXT NOT NULL DEFAULT '[]',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME
    )
  `);
}
