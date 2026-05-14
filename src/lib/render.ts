import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { getDb } from "./db";
import { assignAssets } from "./asset-assigner";
import { log } from "./logger";
import { formatOutputPath } from "./utils";
import { uploadVideoToR2, r2Enabled } from "./r2";
import type { AngelNumber, VideoStyle, TextEffect } from "@/types";

// Carpeta de cache persistente en disco D: — evita usar C:\Users\...\Temp
const CACHE_DIR = path.resolve(process.cwd(), ".cache");
const BUNDLE_CACHE_DIR = path.join(CACHE_DIR, "remotion-bundle");

let bundleLocation: string | null = null;

async function getBundle(): Promise<string> {
  if (bundleLocation) return bundleLocation;

  // Crear directorio de cache en D: si no existe
  if (!fs.existsSync(BUNDLE_CACHE_DIR)) {
    fs.mkdirSync(BUNDLE_CACHE_DIR, { recursive: true });
  }

  bundleLocation = await bundle({
    entryPoint: path.resolve(process.cwd(), "src/remotion/index.ts"),
    publicDir: path.resolve(process.cwd(), "assets"),
    webpackOverride: (config) => config,
    // Forzar el bundle a disco D: en vez del temp del sistema (C:)
    outDir: BUNDLE_CACHE_DIR,
    // Activar cache de webpack para rebuilds más rápidos
    enableCaching: true,
  });
  return bundleLocation;
}

export function clearBundleCache(): void {
  bundleLocation = null;
}

export interface RenderOptions {
  estilo?: VideoStyle;
  efecto?: TextEffect;
  backgroundId?: number;
  audioId?: number;
  onProgress?: (progress: number) => void;
  scheduledAt?: string;
}

export async function renderAngelNumber(
  angelNumberId: number,
  idioma: "es" | "en",
  options: RenderOptions = {}
): Promise<string> {
  const db = getDb();
  const number = db.prepare("SELECT * FROM angel_numbers WHERE id = ?")
    .get(angelNumberId) as AngelNumber | undefined;

  if (!number) throw new Error(`Número ${angelNumberId} no encontrado en la base de datos`);

  const { estilo = "unified", efecto = "fadeIn", backgroundId, audioId, onProgress, scheduledAt } = options;
  const texto = idioma === "es" ? number.texto_es : number.texto_en;
  const channelName = idioma === "es" ? "TU SEÑAL DE HOY" : "YOUR DAILY SIGN";

  // Excluir assets del render previo del mismo número (evita que ES y EN compartan background/audio)
  const prevRender = db.prepare(
    "SELECT background_id, audio_id FROM renders WHERE angel_number_id = ? ORDER BY rendered_at DESC LIMIT 1"
  ).get(angelNumberId) as { background_id: number; audio_id: number } | undefined;

  const { background, audio } = assignAssets(
    angelNumberId, number.grupo, idioma, backgroundId, audioId,
    { backgroundId: prevRender?.background_id, audioId: prevRender?.audio_id }
  );

  // Convertir paths absolutos a relativos desde assets/ para staticFile()
  const assetsDir = path.resolve(process.cwd(), "assets");
  const bgRelative = path.relative(assetsDir, background.archivo).replace(/\\/g, "/");
  const audioRelative = path.relative(assetsDir, audio.archivo).replace(/\\/g, "/");

  const outputPath = path.resolve(process.cwd(), formatOutputPath(angelNumberId, idioma));
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const bundled = await getBundle();
  const composition = await selectComposition({
    serveUrl: bundled,
    id: "SignalVideo",
    inputProps: {
      phrase: texto,
      backgroundSource: bgRelative,
      style: estilo,
      textEffect: efecto,
      duration: 10,
      musicSource: audioRelative,
      musicVolume: 0.3,
      grupo: number.grupo,
      channelName,
      angelNumber: angelNumberId,
    },
  });

  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: outputPath,
    // Optimizaciones de velocidad
    concurrency: 2,             // 2 cores reales — menos thrashing que 4
    imageFormat: "jpeg",        // JPEG ~2x más rápido que PNG
    jpegQuality: 65,            // Menor calidad → frames más livianos, suficiente para Shorts
    offthreadVideoCacheSizeInBytes: 256 * 1024 * 1024, // 256MB — deja RAM para el OS
    chromiumOptions: {
      disableWebSecurity: true,
      gl: "angle",              // ANGLE para aceleración GPU en Windows
    },
    // Timeout generoso para assets pesados (backgrounds de video)
    timeoutInMilliseconds: 60000,
    // Compresión más rápida con CRF alto
    crf: 28,
    // Renderizar 1 de cada 2 frames — para contenido casi estático es imperceptible
    everyNthFrame: 2,
    onProgress: ({ progress }) => {
      onProgress?.(progress);
    },
  });

  let videoUrl: string | null = null;
  if (r2Enabled()) {
    const key = formatOutputPath(angelNumberId, idioma); // e.g. output/es/000-es.mp4
    videoUrl = await uploadVideoToR2(outputPath, key);
    log("render", `Subido a R2: ${videoUrl}`, { angelNumber: angelNumberId, idioma });
  }

  db.prepare(`
    INSERT INTO renders (angel_number_id, idioma, background_id, audio_id, estilo, efecto_texto, archivo_output, video_url, duracion_seg, scheduled_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 10, ?)
  `).run(angelNumberId, idioma, background.id, audio.id, estilo, efecto, outputPath, videoUrl, scheduledAt ?? null);

  // Actualizar estado del número según idioma renderizado
  const current = db.prepare("SELECT estado FROM angel_numbers WHERE id = ?")
    .get(angelNumberId) as { estado: string } | undefined;
  const currentEstado = current?.estado || "pendiente";
  let nuevoEstado: string;
  if (idioma === "es") {
    nuevoEstado = currentEstado === "renderizado_en" ? "completo" : "renderizado_es";
  } else {
    nuevoEstado = currentEstado === "renderizado_es" ? "completo" : "renderizado_en";
  }
  db.prepare("UPDATE angel_numbers SET estado = ? WHERE id = ?").run(nuevoEstado, angelNumberId);

  log("render", `Renderizado: ${angelNumberId}-${idioma}.mp4`, {
    angelNumber: angelNumberId,
    idioma,
    estilo,
  });

  return outputPath;
}

export async function renderAngelNumberDual(
  angelNumberId: number,
  options: RenderOptions = {}
): Promise<{ es: string; en: string }> {
  const esPath = await renderAngelNumber(angelNumberId, "es", options);
  const enPath = await renderAngelNumber(angelNumberId, "en", options);
  return { es: esPath, en: enPath };
}
