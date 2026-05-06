"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface AssetGroup {
  grupo: number;
  total: number;
  disponibles_es: number;
  disponibles_en: number;
}

interface AudioTrack {
  id: string;
  title: string;
  duration: number;
  downloadUrl: string;
  previewUrl: string;
  artist: string;
  artwork?: string;
}

type DownloadingKey = `${"bg" | "audio"}-${number}`;

const GRUPO_NAMES: Record<number, string> = {
  1: "Presencia y Protección",
  2: "Flujo y Abundancia",
  3: "Cambio y Transición",
  4: "Fe y Manifestación",
  5: "Propósito y Elevación",
};

const GRUPO_COLORS: Record<number, string> = {
  1: "border-l-yellow-500/60",
  2: "border-l-cyan-500/60",
  3: "border-l-green-500/60",
  4: "border-l-orange-500/60",
  5: "border-l-purple-500/60",
};

// Iconos SVG — no emojis (UI/UX Pro Max §4)
function VideoIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function AudioIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function DownloadIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function AssetsPage() {
  const [backgrounds, setBackgrounds] = useState<AssetGroup[]>([]);
  const [audios, setAudios] = useState<AssetGroup[]>([]);
  const [downloading, setDownloading] = useState<Set<DownloadingKey>>(new Set());
  const [message, setMessage] = useState<{ text: string; tipo: "ok" | "error" } | null>(null);

  // Estado del buscador de audio
  const [searchOpen, setSearchOpen] = useState<number | null>(null);
  const [searchTracks, setSearchTracks] = useState<AudioTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [downloadingTrackId, setDownloadingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Limpiar audio al desmontar (§3 performance, memory leak)
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  async function loadAssets() {
    const res = await fetch("/api/assets");
    const data = await res.json();
    setBackgrounds(data.backgrounds);
    setAudios(data.audios);
  }

  useEffect(() => { loadAssets(); }, []);

  async function handleDownload(grupo: number, tipo: "background" | "audio") {
    const key: DownloadingKey = `${tipo === "background" ? "bg" : "audio"}-${grupo}`;
    setDownloading((prev) => new Set(prev).add(key));
    setMessage(null);

    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grupo, tipo, cantidad: 10 }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ text: `${data.descargados} ${data.tipo} descargados para grupo ${grupo}`, tipo: "ok" });
      } else {
        setMessage({ text: data.error, tipo: "error" });
      }
      loadAssets();
    } catch {
      setMessage({ text: "Error de conexión al servidor", tipo: "error" });
    }

    setDownloading((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  const isDownloading = (grupo: number, tipo: "bg" | "audio") =>
    downloading.has(`${tipo}-${grupo}` as DownloadingKey);

  // Buscar audio en Pixabay para un grupo
  const searchAudio = useCallback(async (grupo: number) => {
    setIsSearching(true);
    setSearchTracks([]);
    try {
      const res = await fetch(`/api/music/search?grupo=${grupo}&perPage=12`);
      const data = await res.json();
      if (data.ok) {
        setSearchTracks(data.tracks);
      } else {
        setMessage({ text: data.error, tipo: "error" });
      }
    } catch {
      setMessage({ text: "Error buscando audio en Pixabay", tipo: "error" });
    }
    setIsSearching(false);
  }, []);

  // Toggle panel de búsqueda
  function toggleSearch(grupo: number) {
    if (searchOpen === grupo) {
      setSearchOpen(null);
      setSearchTracks([]);
      if (audioRef.current) {
        audioRef.current.pause();
        setPlayingId(null);
      }
    } else {
      setSearchOpen(grupo);
      searchAudio(grupo);
    }
  }

  // Preview de audio
  function togglePlay(track: AudioTrack) {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.onended = () => setPlayingId(null);
      }
      audioRef.current.src = track.previewUrl;
      audioRef.current.play();
      setPlayingId(track.id);
    }
  }

  // Descargar track individual al grupo
  async function downloadTrack(track: AudioTrack, grupo: number) {
    setDownloadingTrackId(track.id);
    try {
      const res = await fetch("/api/music/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioUrl: track.downloadUrl,
          trackId: track.id,
          grupo,
          title: track.title,
          duration: track.duration,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ text: `Audio "${track.title.slice(0, 30)}..." descargado a grupo ${grupo}`, tipo: "ok" });
        loadAssets();
      } else {
        setMessage({ text: data.error, tipo: "error" });
      }
    } catch {
      setMessage({ text: "Error descargando audio", tipo: "error" });
    }
    setDownloadingTrackId(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Gestión de Assets</h1>
        <p className="text-sf-muted text-sm mt-1">Fondos de video y pistas de audio por grupo de vibración</p>
      </div>

      {/* Feedback (§8 error-placement, §8 toast-accessibility) */}
      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm border transition-opacity ${
            message.tipo === "ok"
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
          role="status"
          aria-live="polite"
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((g) => {
          const bg = backgrounds.find((b) => b.grupo === g);
          const au = audios.find((a) => a.grupo === g);
          const isSearchOpenForGroup = searchOpen === g;

          return (
            <div
              key={g}
              className={`bg-sf-surface border border-sf-border border-l-4 ${GRUPO_COLORS[g]} rounded-xl p-5`}
            >
              {/* Header del grupo */}
              <h3 className="font-semibold text-base mb-4">
                Grupo {g}
                <span className="text-sf-muted font-normal ml-2 text-sm">
                  {GRUPO_NAMES[g]}
                </span>
              </h3>

              {/* Grid: Fondos | Audios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fondos de video */}
                <div className="bg-sf-bg/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <VideoIcon className="text-sf-secondary" />
                    <span className="text-sm font-medium">Fondos de video</span>
                    <span className="text-sf-muted text-xs ml-auto">Pexels</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm mb-4">
                    <div>
                      <p className="text-sf-muted text-xs">Total</p>
                      <p className="font-bold text-lg">{bg?.total || 0}</p>
                    </div>
                    <div>
                      <p className="text-sf-muted text-xs">Disp. ES</p>
                      <p className="font-bold text-lg text-green-400">{bg?.disponibles_es || 0}</p>
                    </div>
                    <div>
                      <p className="text-sf-muted text-xs">Disp. EN</p>
                      <p className="font-bold text-lg text-blue-400">{bg?.disponibles_en || 0}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(g, "background")}
                    disabled={isDownloading(g, "bg")}
                    className="w-full flex items-center justify-center gap-2 min-h-[44px] bg-sf-secondary/15 text-sf-secondary border border-sf-secondary/25 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-sf-secondary/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <DownloadIcon />
                    {isDownloading(g, "bg") ? "Descargando fondos..." : "Descargar fondos"}
                  </button>
                </div>

                {/* Pistas de audio */}
                <div className="bg-sf-bg/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AudioIcon className="text-sf-primary" />
                    <span className="text-sm font-medium">Pistas de audio</span>
                    <span className="text-sf-muted text-xs ml-auto">Audius</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm mb-4">
                    <div>
                      <p className="text-sf-muted text-xs">Total</p>
                      <p className="font-bold text-lg">{au?.total || 0}</p>
                    </div>
                    <div>
                      <p className="text-sf-muted text-xs">Disp. ES</p>
                      <p className="font-bold text-lg text-green-400">{au?.disponibles_es || 0}</p>
                    </div>
                    <div>
                      <p className="text-sf-muted text-xs">Disp. EN</p>
                      <p className="font-bold text-lg text-blue-400">{au?.disponibles_en || 0}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {/* Botón descarga rápida */}
                    <button
                      onClick={() => handleDownload(g, "audio")}
                      disabled={isDownloading(g, "audio")}
                      className="w-full flex items-center justify-center gap-2 min-h-[44px] bg-sf-primary/15 text-sf-primary border border-sf-primary/25 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-sf-primary/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <DownloadIcon />
                      {isDownloading(g, "audio") ? "Descargando audios..." : "Descarga rápida"}
                    </button>

                    {/* Botón buscar y elegir */}
                    <button
                      onClick={() => toggleSearch(g)}
                      className="w-full flex items-center justify-center gap-2 min-h-[44px] bg-sf-surface text-sf-muted border border-sf-border px-4 py-2.5 rounded-lg text-sm hover:text-sf-text hover:border-sf-primary/30 transition-colors"
                    >
                      <SearchIcon />
                      <span>Buscar y elegir</span>
                      <ChevronIcon open={isSearchOpenForGroup} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Panel de búsqueda de audio expandible */}
              {isSearchOpenForGroup && (
                <div className="mt-4 bg-sf-bg/70 border border-sf-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AudioIcon className="text-sf-primary" />
                    <span className="text-sm font-medium">
                      Resultados Audius — Grupo {g}
                    </span>
                    {isSearching && (
                      <div className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-sf-primary border-t-transparent" />
                    )}
                  </div>

                  {searchTracks.length === 0 && !isSearching && (
                    <p className="text-sf-muted text-sm text-center py-4">
                      No se encontraron resultados. Intenta con otra búsqueda.
                    </p>
                  )}

                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {searchTracks.map((track) => (
                      <div
                        key={track.id}
                        className="flex items-center gap-3 bg-sf-surface rounded-lg p-3 border border-sf-border"
                      >
                        {/* Play/Pause — min 44px (§2 touch-target-size) */}
                        <button
                          onClick={() => togglePlay(track)}
                          className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                          aria-label={playingId === track.id ? "Pausar" : "Reproducir"}
                        >
                          {playingId === track.id ? <PauseIcon /> : <PlayIcon />}
                        </button>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{track.title}</p>
                          <p className="text-xs text-sf-muted">
                            {Math.floor(track.duration)}s
                            {track.artist && ` — ${track.artist}`}
                          </p>
                        </div>

                        {/* Descargar — min 44px (§2) */}
                        <button
                          onClick={() => downloadTrack(track, g)}
                          disabled={downloadingTrackId !== null}
                          className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full bg-sf-primary/20 text-sf-primary hover:bg-sf-primary/30 disabled:opacity-40 transition-colors"
                          aria-label="Descargar a este grupo"
                        >
                          {downloadingTrackId === track.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-sf-primary border-t-transparent" />
                          ) : (
                            <DownloadIcon />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Nota informativa */}
      <div className="bg-sf-bg/80 border border-sf-border rounded-lg p-4 text-sm text-sf-muted">
        <p className="font-medium text-sf-text mb-1">Fuentes de assets</p>
        <p>Fondos de video: <span className="text-sf-secondary">Pexels API</span> (PEXELS_API_KEY)</p>
        <p>Pistas de audio: <span className="text-sf-primary">Audius</span> (gratuita, sin API key)</p>
        <p className="mt-2 text-xs">
          <strong>Descarga rápida:</strong> baja automáticamente las mejores pistas para el grupo.
          <strong className="ml-2">Buscar y elegir:</strong> explora, escucha previews y elige manualmente.
        </p>
      </div>
    </div>
  );
}
