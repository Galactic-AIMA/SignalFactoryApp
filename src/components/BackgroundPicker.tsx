"use client";

import { useState, useEffect } from "react";
import { PEXELS_SEARCH_TERMS } from "@/types";

interface PexelsResult {
  id: number;
  image: string;
  duration: number;
  width: number;
  height: number;
  videoFile: string;
}

interface LocalBackground {
  id: number;
  grupo: number;
  pexelsId: string | null;
  tags: string;
  staticPath: string;
}

interface BackgroundPickerProps {
  grupo: number;
  onSelect: (backgroundId: number) => void;
  selectedId: number | null;
}

export function BackgroundPicker({ grupo, onSelect, selectedId }: BackgroundPickerProps) {
  const [tab, setTab] = useState<"pexels" | "local">("pexels");
  const [query, setQuery] = useState("");
  const [pexelsResults, setPexelsResults] = useState<PexelsResult[]>([]);
  const [localBgs, setLocalBgs] = useState<LocalBackground[]>([]);
  const [searching, setSearching] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Cargar backgrounds locales y sugerencias al cambiar de grupo
  useEffect(() => {
    setQuery("");
    setPexelsResults([]);
    loadLocal();
    setSuggestions(PEXELS_SEARCH_TERMS[grupo] || []);
  }, [grupo]);

  async function loadLocal() {
    try {
      const res = await fetch(`/api/backgrounds?grupo=${grupo}`);
      const data = await res.json();
      setLocalBgs(data.backgrounds || []);
    } catch {}
  }

  function handleRandom() {
    if (localBgs.length === 0) return;
    const pick = localBgs[Math.floor(Math.random() * localBgs.length)];
    onSelect(pick.id);
  }

  async function searchPexels(searchQuery?: string) {
    const q = searchQuery || query;
    if (!q && !grupo) return;
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("query", q);
      if (grupo) params.set("grupo", String(grupo));
      const res = await fetch(`/api/pexels/search?${params}`);
      const data = await res.json();
      setPexelsResults(data.results || []);
    } catch {}
    setSearching(false);
  }

  async function downloadAndSelect(result: PexelsResult) {
    setDownloading(result.id);
    try {
      const res = await fetch("/api/pexels/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pexelsId: result.id,
          videoUrl: result.videoFile,
          grupo,
          tags: query || suggestions[0] || "",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        onSelect(data.backgroundId);
        await loadLocal();
        setTab("local");
      }
    } catch {}
    setDownloading(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-sf-text">Fondo de video</h3>
        <div className="flex gap-1 items-center">
          <button
            onClick={handleRandom}
            disabled={localBgs.length === 0}
            title={localBgs.length === 0 ? "Sin fondos locales" : "Fondo aleatorio del grupo"}
            className="px-2 py-1 rounded-md text-xs transition-colors bg-sf-bg border border-sf-border text-sf-muted hover:text-sf-text hover:border-sf-primary/50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🎲
          </button>
          <button
            onClick={() => setTab("pexels")}
            className={`px-3 py-1 rounded-md text-xs transition-colors ${
              tab === "pexels"
                ? "bg-sf-primary/20 text-sf-primary"
                : "text-sf-muted hover:text-sf-text"
            }`}
          >
            Buscar en Pexels
          </button>
          <button
            onClick={() => setTab("local")}
            className={`px-3 py-1 rounded-md text-xs transition-colors ${
              tab === "local"
                ? "bg-sf-primary/20 text-sf-primary"
                : "text-sf-muted hover:text-sf-text"
            }`}
          >
            Locales ({localBgs.length})
          </button>
        </div>
      </div>

      {tab === "pexels" && (
        <div className="space-y-3">
          {/* Barra de búsqueda */}
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchPexels()}
              placeholder={`Buscar fondos para grupo ${grupo}...`}
              className="flex-1 bg-sf-bg border border-sf-border rounded-md px-3 py-1.5 text-sm placeholder:text-sf-muted/50 focus:outline-none focus:ring-1 focus:ring-sf-primary"
            />
            <button
              onClick={() => searchPexels()}
              disabled={searching}
              className="bg-sf-primary text-white px-4 py-1.5 rounded-md text-sm hover:bg-sf-primary/80 disabled:opacity-50"
            >
              {searching ? "..." : "Buscar"}
            </button>
          </div>

          {/* Sugerencias del grupo */}
          <div className="flex gap-1.5 flex-wrap">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => { setQuery(s); searchPexels(s); }}
                className="px-2.5 py-1 rounded-full text-xs bg-sf-surface border border-sf-border text-sf-muted hover:text-sf-text hover:border-sf-primary/50 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Grid de resultados Pexels */}
          {pexelsResults.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {pexelsResults.map((r) => (
                <button
                  key={r.id}
                  onClick={() => downloadAndSelect(r)}
                  disabled={downloading !== null}
                  className="group relative aspect-[9/16] rounded-lg overflow-hidden border border-sf-border hover:border-sf-primary transition-colors"
                >
                  <img
                    src={r.image}
                    alt={`Pexels ${r.id}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    {downloading === r.id ? (
                      <span className="text-white text-xs font-bold bg-sf-primary/80 px-2 py-1 rounded">
                        Descargando...
                      </span>
                    ) : (
                      <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 bg-sf-primary/80 px-2 py-1 rounded transition-opacity">
                        Seleccionar
                      </span>
                    )}
                  </div>
                  <span className="absolute bottom-1 right-1 text-[10px] text-white/70 bg-black/50 px-1 rounded">
                    {r.duration}s
                  </span>
                </button>
              ))}
            </div>
          )}

          {pexelsResults.length === 0 && !searching && (
            <p className="text-sf-muted text-xs text-center py-6">
              Usa las sugerencias o escribe un término para buscar fondos en Pexels
            </p>
          )}
        </div>
      )}

      {tab === "local" && (
        <div className="space-y-2">
          {localBgs.length > 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {localBgs.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => onSelect(bg.id)}
                  className={`group relative aspect-[9/16] rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedId === bg.id
                      ? "border-sf-primary ring-2 ring-sf-primary/30"
                      : "border-sf-border hover:border-sf-primary/50"
                  }`}
                >
                  {/* Preview del video local */}
                  <video
                    src={`/api/serve/${bg.staticPath}`}
                    muted
                    className="w-full h-full object-cover"
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                    <p className="text-[10px] text-white/80 truncate">
                      {bg.tags || `bg-${bg.id}`}
                    </p>
                  </div>
                  {selectedId === bg.id && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-sf-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sf-muted text-xs text-center py-6">
              No hay fondos descargados para este grupo. Busca en Pexels primero.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
