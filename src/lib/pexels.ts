import { getDb } from "./db";
import { PEXELS_SEARCH_TERMS } from "@/types";
import fs from "fs";
import path from "path";

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "";
const BASE_URL = "https://api.pexels.com/videos/search";

interface PexelsVideo {
  id: number;
  video_files: { link: string; width: number; height: number; quality: string }[];
}

export async function downloadBackgroundsForGroup(
  grupo: number,
  count: number = 5
): Promise<number> {
  if (!PEXELS_API_KEY) throw new Error("PEXELS_API_KEY no configurada");

  const terms = PEXELS_SEARCH_TERMS[grupo];
  if (!terms) throw new Error(`No hay search terms para grupo ${grupo}`);

  const db = getDb();
  let downloaded = 0;
  const outputDir = path.resolve(process.cwd(), `assets/backgrounds/grupo-${grupo}`);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  for (const term of terms) {
    if (downloaded >= count) break;

    const url = `${BASE_URL}?query=${encodeURIComponent(term)}&orientation=portrait&per_page=${count}&size=medium`;
    const res = await fetch(url, {
      headers: { Authorization: PEXELS_API_KEY },
    });

    if (!res.ok) {
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 60000));
        continue;
      }
      continue;
    }

    const data = await res.json();
    const videos: PexelsVideo[] = data.videos || [];

    for (const video of videos) {
      if (downloaded >= count) break;

      const exists = db.prepare("SELECT id FROM backgrounds WHERE pexels_id = ?")
        .get(String(video.id));
      if (exists) continue;

      const file = video.video_files
        .filter((f) => f.height > f.width)
        .sort((a, b) => b.height - a.height)[0]
        || video.video_files.sort((a, b) => b.height - a.height)[0];

      if (!file) continue;

      const filename = `pexels-${video.id}.mp4`;
      const filepath = path.join(outputDir, filename);

      const videoRes = await fetch(file.link);
      const buffer = Buffer.from(await videoRes.arrayBuffer());
      fs.writeFileSync(filepath, buffer);

      db.prepare(`
        INSERT INTO backgrounds (grupo, archivo, fuente, pexels_id, tags)
        VALUES (?, ?, 'pexels', ?, ?)
      `).run(grupo, filepath, String(video.id), term);

      downloaded++;
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  return downloaded;
}
