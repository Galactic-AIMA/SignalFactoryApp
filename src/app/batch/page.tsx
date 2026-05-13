"use client";

import { useState, useEffect, useRef } from "react";
import type { VideoStyle, TextEffect, RenderProgress } from "@/types";

const STYLES: VideoStyle[] = ["unified", "serene", "raw", "minimal", "cinematic", "bold"];
const EFFECTS: TextEffect[] = ["fadeIn", "typewriter", "slideUp", "scaleIn", "glowPulse"];

const SS_KEY   = "sf_batch_state";
const SS_START = "sf_batch_start";

interface SavedBatch {
  desde: number;
  hasta: number;
  idioma: "es" | "en" | "ambos";
  estilo: VideoStyle;
  efecto: TextEffect;
  startDate: string;
}

export default function BatchPage() {
  // Restaurar form desde sessionStorage si existe
  const saved: SavedBatch | null = (() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(sessionStorage.getItem(SS_KEY) || "null"); } catch { return null; }
  })();

  const [desde,     setDesde]     = useState(saved?.desde     ?? 0);
  const [hasta,     setHasta]     = useState(saved?.hasta     ?? 9);
  const [idioma,    setIdioma]    = useState<"es" | "en" | "ambos">(saved?.idioma ?? "ambos");
  const [estilo,    setEstilo]    = useState<VideoStyle>(saved?.estilo ?? "unified");
  const [efecto,    setEfecto]    = useState<TextEffect>(saved?.efecto ?? "fadeIn");
  const [startDate, setStartDate] = useState(saved?.startDate ?? "");

  const [progress,     setProgress]     = useState<RenderProgress | null>(null);
  const [running,      setRunning]      = useState(false);
  const [initializing, setInitializing] = useState(true); // true hasta primer mensaje SSE
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
  const [eta,          setEta]          = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const startTimeRef   = useRef<number | null>(null);

  function persistFormState(overrides: Partial<SavedBatch> = {}) {
    const state: SavedBatch = {
      desde, hasta, idioma, estilo, efecto, startDate, ...overrides,
    };
    sessionStorage.setItem(SS_KEY, JSON.stringify(state));
  }

  function connectSSE() {
    if (eventSourceRef.current) eventSourceRef.current.close();
    const es = new EventSource("/api/render/progress");

    es.onmessage = (event) => {
      const data = JSON.parse(event.data) as RenderProgress;
      setProgress(data);
      setInitializing(false);

      if (data.status === "rendering") {
        setRunning(true);

        // Restaurar startTime desde sessionStorage si no lo tenemos en memoria
        if (!startTimeRef.current) {
          const stored = sessionStorage.getItem(SS_START);
          startTimeRef.current = stored ? parseInt(stored) : Date.now();
          if (!stored) sessionStorage.setItem(SS_START, String(startTimeRef.current));
        }

        // Calcular ETA
        if (data.completado > 0 && startTimeRef.current) {
          const elapsed      = (Date.now() - startTimeRef.current) / 1000;
          const secPerNumber = elapsed / data.completado;
          const remaining    = (data.total - data.completado) * secPerNumber;
          const mins         = Math.round(remaining / 60);
          setEta(mins <= 1 ? "~1 min" : `~${mins} min`);
        }
      }

      if (data.status === "done" || data.status === "error") {
        setRunning(false);
        setEta(null);
        startTimeRef.current = null;
        sessionStorage.removeItem(SS_START);
        sessionStorage.removeItem(SS_KEY);
      }
    };

    es.onerror = () => setInitializing(false);
    eventSourceRef.current = es;
  }

  // Conectar SSE al montar y recuperar estado si hay lote activo
  useEffect(() => {
    connectSSE();
    return () => eventSourceRef.current?.close();
  }, []);

  async function handleStart() {
    setErrorMsg(null);
    const res = await fetch("/api/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ desde, hasta, idioma, estilo, efecto, ...(startDate ? { startDate } : {}) }),
    });
    const data = await res.json();
    if (!data.ok) {
      setErrorMsg(data.error);
      return;
    }
    // Persistir en sessionStorage para sobrevivir navegación
    persistFormState();
    sessionStorage.setItem(SS_START, String(Date.now()));
    startTimeRef.current = Date.now();
    setRunning(true);
    setEta(null);
    connectSSE();
  }

  async function handleCancel() {
    await fetch("/api/batch", { method: "DELETE" });
  }

  const pct = progress && progress.total > 0
    ? Math.round((progress.completado / progress.total) * 100)
    : 0;

  const totalVideos = idioma === "ambos" ? (hasta - desde + 1) * 2 : hasta - desde + 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Renderizado por Lotes</h1>
        <p className="text-sf-muted text-sm mt-1">Renderiza un rango de números angelicales</p>
      </div>

      {/* Formulario */}
      <div className="bg-sf-surface border border-sf-border rounded-xl p-6 space-y-4">
        <div className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="text-xs text-sf-muted block mb-1">Desde</label>
            <input
              type="number" min={0} max={999} value={desde}
              onChange={(e) => setDesde(Number(e.target.value))}
              className="bg-sf-bg border border-sf-border rounded-md px-3 py-1.5 text-sm w-24"
            />
          </div>
          <div>
            <label className="text-xs text-sf-muted block mb-1">Hasta</label>
            <input
              type="number" min={0} max={999} value={hasta}
              onChange={(e) => setHasta(Number(e.target.value))}
              className="bg-sf-bg border border-sf-border rounded-md px-3 py-1.5 text-sm w-24"
            />
          </div>
          <div>
            <label className="text-xs text-sf-muted block mb-1">Idioma</label>
            <select value={idioma} onChange={(e) => setIdioma(e.target.value as "es" | "en" | "ambos")}
              className="bg-sf-bg border border-sf-border rounded-md px-3 py-1.5 text-sm">
              <option value="ambos">🌐 ES + EN</option>
              <option value="es">🇪🇸 Solo ES</option>
              <option value="en">🇺🇸 Solo EN</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-sf-muted block mb-1">Estilo</label>
            <select value={estilo} onChange={(e) => setEstilo(e.target.value as VideoStyle)}
              className="bg-sf-bg border border-sf-border rounded-md px-3 py-1.5 text-sm">
              {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-sf-muted block mb-1">Efecto</label>
            <select value={efecto} onChange={(e) => setEfecto(e.target.value as TextEffect)}
              className="bg-sf-bg border border-sf-border rounded-md px-3 py-1.5 text-sm">
              {EFFECTS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <button
            onClick={handleStart}
            disabled={running}
            className="bg-sf-accent text-sf-bg px-6 py-2 rounded-lg font-bold hover:bg-sf-accent/80 disabled:opacity-50 transition-colors"
          >
            {running ? "En progreso..." : "Iniciar Lote"}
          </button>
          {running && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg border border-red-500/50 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>

        {/* Programación de publicación */}
        <div className="pt-3 border-t border-sf-border w-full">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="text-xs text-sf-muted block mb-1">
                Publicar desde <span className="opacity-60">(opcional)</span>
              </label>
              <input
                type="date"
                value={startDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-sf-bg border border-sf-border rounded-md px-3 py-1.5 text-sm"
              />
            </div>
            {startDate && (
              <button
                type="button"
                onClick={() => setStartDate("")}
                className="text-xs text-sf-muted hover:text-red-400 transition-colors mb-2"
              >
                Limpiar
              </button>
            )}
          </div>

          {startDate && (
            <div className="mt-3 p-3 bg-sf-bg rounded-lg border border-sf-border">
              <p className="text-xs font-semibold text-sf-muted mb-2">
                Calendario · 8:00 AM Bogotá
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: Math.min(hasta - desde + 1, 12) }, (_, i) => {
                  const d = new Date(`${startDate}T13:00:00.000Z`);
                  d.setUTCDate(d.getUTCDate() + i);
                  const label = d.toLocaleDateString("es-CO", {
                    day: "numeric", month: "short", timeZone: "America/Bogota",
                  });
                  return (
                    <span key={i} className="text-xs px-2 py-0.5 rounded bg-sf-surface border border-sf-border">
                      <span className="text-sf-muted">#{desde + i}</span>
                      <span className="text-sf-text ml-1">{label}</span>
                    </span>
                  );
                })}
                {hasta - desde + 1 > 12 && (
                  <span className="text-xs text-sf-muted self-center">
                    +{hasta - desde + 1 - 12} más
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {errorMsg && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
            ⚠️ {errorMsg}
          </p>
        )}

        <p className="text-xs text-sf-muted">
          Total: {hasta - desde + 1} números × {idioma === "ambos" ? "2 idiomas" : idioma.toUpperCase()} = {totalVideos} videos
        </p>
      </div>

      {/* Progreso — skeleton mientras inicializa, luego estado real */}
      {initializing ? (
        <div className="bg-sf-surface border border-sf-border rounded-xl p-6">
          <div className="flex items-center gap-2 text-sf-muted text-sm">
            <span className="w-2 h-2 rounded-full bg-sf-muted animate-pulse inline-block" />
            Verificando estado del servidor...
          </div>
        </div>
      ) : progress && progress.status !== "idle" && (
        <div className="bg-sf-surface border border-sf-border rounded-xl p-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="font-medium">
              {progress.completado}/{progress.total} números
            </span>
            <div className="flex items-center gap-3">
              {eta && progress.status === "rendering" && (
                <span className="text-sf-muted text-xs">{eta} restantes</span>
              )}
              <span className={
                progress.status === "done"  ? "text-green-400" :
                progress.status === "error" ? "text-red-400"   : "text-sf-accent"
              }>
                {progress.status === "rendering"
                  ? `Renderizando #${progress.actual}...`
                  : progress.status === "done"
                    ? "✅ Completado"
                    : "❌ Error"}
              </span>
            </div>
          </div>

          <div className="w-full bg-sf-bg rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sf-primary to-sf-accent rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-sf-muted">
            <span>
              {progress.status === "rendering" && saved
                ? `Lote ${saved.desde}–${saved.hasta} · ${saved.idioma === "ambos" ? "ES + EN" : saved.idioma.toUpperCase()}`
                : ""}
            </span>
            <span>{pct}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
