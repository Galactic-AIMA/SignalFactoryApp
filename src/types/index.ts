// === Modelo de datos ===

export interface AngelNumber {
  id: number;                    // 0-999
  grupo: number;                 // 1-5
  grupo_nombre: string;
  texto_es: string;
  texto_en: string;
  estado: AngelNumberEstado;
  created_at: string;
}

export type AngelNumberEstado =
  | "pendiente"
  | "renderizado_es"
  | "renderizado_en"
  | "completo"
  | "publicado"
  | "error";

export interface Background {
  id: number;
  grupo: number;
  archivo: string;
  variacion: AssetVariacion;
  archivo_base_id: number | null;
  usado_es: boolean;
  usado_en: boolean;
  asignado_a: number | null;
  fuente: string;
  pexels_id: string | null;
  tags: string;
}

export interface Audio {
  id: number;
  grupo: number;
  archivo: string;
  variacion: AssetVariacion;
  archivo_base_id: number | null;
  usado_es: boolean;
  usado_en: boolean;
  asignado_a: number | null;
  fuente: string;
  tags: string;
}

export type AssetVariacion =
  | "original"
  | "crop"
  | "speed"
  | "color"
  | "mirror"
  | "trim";

export interface Render {
  id: number;
  angel_number_id: number;
  idioma: "es" | "en";
  background_id: number;
  audio_id: number;
  estilo: string;
  efecto_texto: TextEffect;
  archivo_output: string;
  video_url: string | null;
  duracion_seg: number;
  webhook_enviado: boolean;
  webhook_response: string | null;
  youtube_video_id: string | null;
  scheduled_at: string | null;
  created_at: string;
}

export interface LogEntry {
  id: number;
  tipo: "render" | "webhook" | "error" | "batch";
  mensaje: string;
  detalle: string | null;
  created_at: string;
}

// === Remotion ===

export type VideoStyle =
  | "unified"
  | "serene"
  | "raw"
  | "minimal"
  | "cinematic"
  | "bold";

export type TextEffect =
  | "fadeIn"
  | "typewriter"
  | "slideUp"
  | "scaleIn"
  | "glowPulse";

export interface SignalVideoProps {
  phrase: string;
  backgroundSource: string;
  style: VideoStyle;
  textEffect: TextEffect;
  duration: number;
  musicSource?: string;
  musicVolume?: number;
  grupo: number;
  channelName: string;
  angelNumber: number;
}

// === Vibración ===

export const VIBRATION_GROUPS = {
  1: { name: "Presencia y Protección", digits: [0, 4], tint: "rgba(255, 200, 50, 0.08)" },
  2: { name: "Flujo y Abundancia", digits: [8, 6], tint: "rgba(0, 150, 200, 0.08)" },
  3: { name: "Cambio y Transición", digits: [5], tint: "rgba(80, 180, 80, 0.08)" },
  4: { name: "Fe y Manifestación", digits: [1, 2, 7], tint: "rgba(255, 150, 100, 0.08)" },
  5: { name: "Propósito y Elevación", digits: [3, 9], tint: "rgba(150, 100, 255, 0.08)" },
} as const;

// Términos de búsqueda de audio por grupo de vibración
// Audius funciona mejor con queries cortos (1-2 palabras)
export const AUDIO_SEARCH_TERMS: Record<number, string[]> = {
  1: ["ambient", "ethereal", "bells", "harp", "angelic", "celestial"],
  2: ["ocean", "waves", "rain", "water", "calm", "peaceful"],
  3: ["nature", "forest", "wind", "birds", "relaxing", "healing"],
  4: ["piano", "meditation", "instrumental", "calm piano", "soft piano", "lo-fi"],
  5: ["tibetan", "singing bowl", "chanting", "mantra", "spiritual", "choir"],
};

export const PEXELS_SEARCH_TERMS: Record<number, string[]> = {
  1: ["clear sky", "sunlight", "clouds golden", "rays of light"],
  2: ["waterfall", "ocean waves", "river flowing", "calm lake"],
  3: ["forest path", "leaves wind", "autumn trail", "walking path nature"],
  4: ["sunrise road", "illuminated path", "golden forest", "open door light"],
  5: ["mountain peak", "panoramic view", "mountain summit", "vast sky mountains"],
};

// === Webhook ===

export interface WebhookPayload {
  angel_number: number;
  grupo: number;
  grupo_nombre: string;
  renders: {
    idioma: "es" | "en";
    videoUrl: string | null;
    texto: string;
    titulo: string;
    descripcion: string;
    tags: string[];
    publishAt?: string;
  }[];
  batch_id?: string;
  timestamp: string;
}

// === API ===

export interface DashboardStats {
  total_numbers: number;
  pendientes: number;
  renderizados: number;
  publicados: number;
  backgrounds_disponibles: Record<number, number>;
  audios_disponibles: Record<number, number>;
}

export interface BatchRequest {
  desde: number;
  hasta: number;
  estilo?: VideoStyle;
  efecto?: TextEffect;
  startDate?: string;
}

export interface BatchLogEntry {
  n: number;
  idioma: "es" | "en" | "ambos";
  fase: "render" | "webhook";
  status: "running" | "done" | "error";
  msg: string;
  ts: string;
}

export interface BatchJob {
  id: string;
  desde: number;
  hasta: number;
  idioma: string;
  start_date: string | null;
  status: "running" | "done" | "error" | "cancelled";
  total: number;
  completado: number;
  log: BatchLogEntry[];
  started_at: string;
  finished_at: string | null;
}

export interface RenderProgress {
  total: number;
  completado: number;
  actual: number;
  status: "idle" | "rendering" | "done" | "error";
  mensaje?: string;
  batchId?: string;
  desde?: number;
  hasta?: number;
  idioma?: string;
  startDate?: string;
  log?: BatchLogEntry[];
}
