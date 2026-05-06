"use client";

import { useState, useEffect, useRef } from "react";
import type { VideoStyle, TextEffect, RenderProgress } from "@/types";

const STYLES: VideoStyle[] = ["unified", "serene", "raw", "minimal", "cinematic", "bold"];
const EFFECTS: TextEffect[] = ["fadeIn", "typewriter", "slideUp", "scaleIn", "glowPulse"];

export default function BatchPage() {
  const [desde, setDesde] = useState(0);
  const [hasta, setHasta] = useState(9);
  const [idioma, setIdioma] = useState<"es" | "en" | "ambos">("ambos");
  const [estilo, setEstilo] = useState<VideoStyle>("unified");
  const [efecto, setEfecto] = useState<TextEffect>("fadeIn");
  const [progress, setProgress] = useState<RenderProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const startTimeRef = useRef<number | null>(null);

  function connectSSE() {
    if (eventSourceRef.current) eventSourceRef.current.close();
    const es = new EventSource("/api/render/progress");
    es.onmessage = (event) => {
      const data = JSON.parse(event.data) as RenderProgress;
      setProgress(data);
      if (data.status === "rendering") {
        setRunning(true);
        if (!startTimeRef.current) startTimeRef.current = Date.now();
        // Calcular ETA
        if (data.completado > 0 && startTimeRef.current) {
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          const secPerNumber = elapsed / data.completado;
          const remaining = (data.total - data.completado) * secPerNumber;
          const mins = Math.round(remaining / 60);
          setEta(mins <= 1 ? "~1 min" : `~${mins} min`);
        }
      }
      if (data.status === "done" || data.status === "error") {
        setRunning(false);
        setEta(null);
        startTimeRef.current = null;
      }
    };
    eventSourceRef.current = es;
  }

  async function handleStart() {
    setErrorMsg(null);
    const res = await fetch("/api/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ desde, hasta, idioma, estilo, efecto }),
    });
    const data = await res.json();
    if (!data.ok) {
      setErrorMsg(data.error);
      return;
    }
    setRunning(true);
    connectSSE();
  }

  // Al montar: conectar SSE y recuperar estado si hay lote activo
  useEffect(() => {
    connectSSE();
    return () => eventSourceRef.current?.close();
  }, []);

  const pct = progress && progress.total > 0
    ? Math.round((progress.completado / progress.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Renderizado por Lotes</h1>
        <p className="text-sf-muted text-sm mt-1">Renderiza un rango de números angelicales</p>
      </div>

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
              onClick={async () => {
                await fetch("/api/batch", { method: "DELETE" });
              }}
              className="px-4 py-2 rounded-lg border border-red-500/50 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>

        {errorMsg && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
            ⚠️ {errorMsg}
          </p>
        )}

        <p className="text-xs text-sf-muted">
          Total: {hasta - desde + 1} números ×{" "}
          {idioma === "ambos" ? "2 idiomas" : idioma.toUpperCase()} ={" "}
          {idioma === "ambos" ? (hasta - desde + 1) * 2 : hasta - desde + 1} videos
        </p>
      </div>

      {/* Progreso */}
      {progress && progress.status !== "idle" && (
        <div className="bg-sf-surface border border-sf-border rounded-xl p-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span>Progreso: {progress.completado}/{progress.total}</span>
            <div className="flex items-center gap-3">
              {eta && progress.status === "rendering" && (
                <span className="text-sf-muted text-xs">{eta} restantes</span>
              )}
              <span className={progress.status === "done" ? "text-green-400" : progress.status === "error" ? "text-red-400" : "text-sf-accent"}>
                {progress.status === "rendering" ? `Renderizando #${progress.actual}...` : progress.status === "done" ? "✅ Completado" : "❌ Error"}
              </span>
            </div>
          </div>
          <div className="w-full bg-sf-bg rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sf-primary to-sf-accent rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-sf-muted text-right">{pct}%</p>
        </div>
      )}
    </div>
  );
}
