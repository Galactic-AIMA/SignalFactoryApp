"use client";

import { useState, useEffect, useRef } from "react";
import { AUDIO_SEARCH_TERMS } from "@/types";

interface AudiusTrack {
  id: string;
  title: string;
  duration: number;
  downloadUrl: string;
  previewUrl: string;
  artist: string;
}

interface LocalAudio {
  id: number;
  grupo: number;
  tags: string;
  fuente: string;
  staticPath: string;
}

interface AudioPickerProps {
  grupo: number;
  onSelect: (audioId: number) => void;
  selectedId: number | null;
}

export function AudioPicker({ grupo, onSelect, selectedId }: AudioPickerProps) {
  const [tab, setTab] = useState<"audius" | "local">("local");
  const [query, setQuery] = useState("");
  const [audiusResults, setAudiusResults] = useState<AudiusTrack[]>([]);
  const [localAudios, setLocalAudios] = useState<LocalAudio[]>([]);
  const [searching, setSearching] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const suggestions = AUDIO_SEARCH_TERMS[grupo] || [];

  useEffect(() => {
    setQuery("");
    setAudiusResults([]);
    stopAudio();
    loadLocal();
  }, [grupo]);

  // Limpiar audio al desmontar
  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  async function loadLocal() {
    try {
      const res = await fetch(`/api/audios?grupo=${grupo}`);
      const data = await res.json();
      setLocalAudios(data.audios || []);
    } catch {}
  }

  function handleRandom() {
    if (localAudios.length === 0) return;
    const pick = localAudios[Math.floor(Math.random() * localAudios.length)];
    onSelect(pick.id);
  }

  async function searchAudius(searchQuery?: string) {
    const q = searchQuery || query;
    if (!q && !grupo) return;
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("query", q);
      params.set("grupo", String(grupo));
      const res = await fetch(`/api/music/search?${params}`);
      const data = await res.json();
      setAudiusResults(data.tracks || []);
    } catch {}
    setSearching(false);
  }

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
  }

  function togglePreview(url: string, id: string) {
    if (playingId === id) {
      stopAudio();
      return;
    }
    stopAudio();
    const audio = new Audio(url);
    audio.volume = 0.5;
    audio.play();
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(id);
  }

  async function downloadAndSelect(track: AudiusTrack) {
    setDownloading(track.id);
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
      if (data.ok && data.audioId) {
        onSelect(data.audioId);
        await loadLocal();
        setTab("local");
      }
    } catch {}
    setDownloading(null);
  }

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-sf-text">Audio</h3>
        <div className="flex gap-1 items-center">
          <button
            onClick={handleRandom}
            disabled={localAudios.length === 0}
            title={localAudios.length === 0 ? "Sin audios locales" : "Audio aleatorio del grupo"}
            className="px-2 py-1 rounded-md text-xs transition-colors bg-sf-bg border border-sf-border text-sf-muted hover:text-sf-text hover:border-sf-accent/50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🎲
          </button>
          <button
            onClick={() => setTab("audius")}
            className={`px-3 py-1 rounded-md text-xs transition-colors ${
              tab === "audius"
                ? "bg-sf-accent/20 text-sf-accent"
                : "text-sf-muted hover:text-sf-text"
            }`}
          >
            Buscar en Audius
          </button>
          <button
            onClick={() => setTab("local")}
            className={`px-3 py-1 rounded-md text-xs transition-colors ${
              tab === "local"
                ? "bg-sf-accent/20 text-sf-accent"
                : "text-sf-muted hover:text-sf-text"
            }`}
          >
            Locales ({localAudios.length})
          </button>
        </div>
      </div>

      {tab === "audius" && (
        <div className="space-y-3">
          {/* Barra de búsqueda */}
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchAudius()}
              placeholder={`Buscar audio para grupo ${grupo}...`}
              className="flex-1 bg-sf-bg border border-sf-border rounded-md px-3 py-1.5 text-sm placeholder:text-sf-muted/50 focus:outline-none focus:ring-1 focus:ring-sf-accent"
            />
            <button
              onClick={() => searchAudius()}
              disabled={searching}
              className="bg-sf-accent text-white px-4 py-1.5 rounded-md text-sm hover:bg-sf-accent/80 disabled:opacity-50"
            >
              {searching ? "..." : "Buscar"}
            </button>
          </div>

          {/* Sugerencias */}
          <div className="flex gap-1.5 flex-wrap">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => { setQuery(s); searchAudius(s); }}
                className="px-2.5 py-1 rounded-full text-xs bg-sf-surface border border-sf-border text-sf-muted hover:text-sf-text hover:border-sf-accent/50 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Lista de resultados */}
          {audiusResults.length > 0 && (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {audiusResults.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-sf-bg border border-sf-border hover:border-sf-accent/50 transition-colors"
                >
                  <button
                    onClick={() => togglePreview(track.previewUrl, `audius-${track.id}`)}
                    className="w-8 h-8 rounded-full bg-sf-accent/20 text-sf-accent flex items-center justify-center shrink-0 hover:bg-sf-accent/30"
                  >
                    {playingId === `audius-${track.id}` ? "||" : "▶"}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-sf-text truncate">{track.title}</p>
                    <p className="text-xs text-sf-muted truncate">{track.artist}</p>
                  </div>
                  <span className="text-xs text-sf-muted shrink-0">
                    {track.duration > 0 ? formatDuration(track.duration) : ""}
                  </span>
                  <button
                    onClick={() => downloadAndSelect(track)}
                    disabled={downloading !== null}
                    className="px-3 py-1 rounded-md text-xs bg-sf-accent/20 text-sf-accent hover:bg-sf-accent/30 disabled:opacity-50 shrink-0"
                  >
                    {downloading === track.id ? "..." : "Usar"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {audiusResults.length === 0 && !searching && (
            <p className="text-sf-muted text-xs text-center py-4">
              Usa las sugerencias o escribe un término para buscar en Audius
            </p>
          )}
        </div>
      )}

      {tab === "local" && (
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {localAudios.length > 0 ? (
            localAudios.map((audio) => (
              <button
                key={audio.id}
                onClick={() => onSelect(audio.id)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-colors text-left ${
                  selectedId === audio.id
                    ? "border-sf-accent bg-sf-accent/10"
                    : "border-sf-border bg-sf-bg hover:border-sf-accent/50"
                }`}
              >
                <span
                  onClick={(e) => { e.stopPropagation(); togglePreview(`/api/serve/${audio.staticPath}`, `local-${audio.id}`); }}
                  className="w-8 h-8 rounded-full bg-sf-accent/20 text-sf-accent flex items-center justify-center shrink-0 hover:bg-sf-accent/30"
                >
                  {playingId === `local-${audio.id}` ? "||" : "▶"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-sf-text truncate">{audio.tags || `audio-${audio.id}`}</p>
                  <p className="text-xs text-sf-muted">{audio.fuente}</p>
                </div>
                {selectedId === audio.id && (
                  <span className="w-5 h-5 bg-sf-accent rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </span>
                )}
              </button>
            ))
          ) : (
            <p className="text-sf-muted text-xs text-center py-4">
              No hay audios para este grupo. Busca en Audius primero.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
