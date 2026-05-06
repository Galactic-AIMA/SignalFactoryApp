import { getDb } from "./db";
import fs from "fs";
import path from "path";

// Endpoints alternativos de Audius para mayor resiliencia
const AUDIUS_HOSTS = [
  "https://discoveryprovider.audius.co",
  "https://discoveryprovider2.audius.co",
  "https://discoveryprovider3.audius.co",
];

const APP_NAME = "signalfactory";

// Términos de búsqueda de audio por grupo de vibración
// IMPORTANTE: Audius funciona mejor con queries cortos (1-2 palabras).
// Queries compuestos de 3+ palabras devuelven 0 resultados.
export const AUDIO_SEARCH_TERMS: Record<number, string[]> = {
  1: ["ambient", "ethereal", "bells", "harp", "angelic", "celestial"],
  2: ["ocean", "waves", "rain", "water", "calm", "peaceful"],
  3: ["nature", "forest", "wind", "birds", "relaxing", "healing"],
  4: ["piano", "meditation", "instrumental", "calm piano", "soft piano", "lo-fi"],
  5: ["tibetan", "singing bowl", "chanting", "mantra", "spiritual", "choir"],
};

export interface AudioTrack {
  id: string;
  title: string;
  duration: number;
  downloadUrl: string;
  previewUrl: string;
  artist: string;
  artwork?: string;
}

async function fetchFromAudius(endpoint: string): Promise<Response> {
  let lastError: Error | null = null;
  for (const host of AUDIUS_HOSTS) {
    try {
      const url = `${host}${endpoint}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError || new Error("Todos los hosts de Audius fallaron");
}

/**
 * Busca pistas de audio en Audius para un grupo de vibración
 */
export async function searchAudioForGroup(
  grupo: number,
  query?: string
): Promise<{ tracks: AudioTrack[]; total: number }> {
  const terms = AUDIO_SEARCH_TERMS[grupo];
  if (!terms && !query) throw new Error(`No hay search terms para grupo ${grupo}`);

  const searchQuery = query || terms[0];
  const res = await fetchFromAudius(
    `/v1/tracks/search?query=${encodeURIComponent(searchQuery)}&app_name=${APP_NAME}&limit=20`
  );

  const data = await res.json();

  if (!data.data || !Array.isArray(data.data)) {
    return { tracks: [], total: 0 };
  }

  const tracks: AudioTrack[] = data.data.map((track: Record<string, unknown>) => {
    const user = track.user as Record<string, unknown> | undefined;
    const artwork = track.artwork as Record<string, string> | undefined;
    return {
      id: String(track.id),
      title: String(track.title || ""),
      duration: Number(track.duration || 0),
      downloadUrl: `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream?app_name=${APP_NAME}`,
      previewUrl: `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream?app_name=${APP_NAME}`,
      artist: String(user?.name || "Audius Artist"),
      artwork: artwork?.["150x150"] || undefined,
    };
  });

  return { tracks, total: tracks.length };
}

/**
 * Descarga una pista de audio de Audius y la registra en la DB
 */
export async function downloadAudioTrack(
  audioUrl: string,
  trackId: string,
  grupo: number,
  title: string = "",
  duration: number = 0
): Promise<string> {
  const outputDir = path.resolve(process.cwd(), `assets/music/grupo-${grupo}`);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filename = `audius-${trackId}.mp3`;
  const filepath = path.join(outputDir, filename);

  // No re-descargar si ya existe
  const db = getDb();
  const exists = db.prepare("SELECT id FROM audios WHERE archivo LIKE ?")
    .get(`%audius-${trackId}%`);
  if (exists) return filename;

  const res = await fetch(audioUrl);
  if (!res.ok) throw new Error("Fallo al descargar audio de Audius");

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filepath, buffer);

  db.prepare(`
    INSERT INTO audios (grupo, archivo, fuente, tags)
    VALUES (?, ?, 'audius', ?)
  `).run(grupo, filepath, title.slice(0, 100));

  return filename;
}

/**
 * Descarga automática de audios para un grupo
 */
export async function downloadAudiosForGroup(
  grupo: number,
  count: number = 5
): Promise<number> {
  const terms = AUDIO_SEARCH_TERMS[grupo];
  if (!terms) throw new Error(`No hay search terms para grupo ${grupo}`);

  let downloaded = 0;

  for (const term of terms) {
    if (downloaded >= count) break;

    try {
      const { tracks } = await searchAudioForGroup(grupo, term);

      for (const track of tracks) {
        if (downloaded >= count) break;

        try {
          await downloadAudioTrack(track.downloadUrl, track.id, grupo, track.title, track.duration);
          downloaded++;
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  return downloaded;
}
