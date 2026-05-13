"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { VideoStyle, TextEffect, RenderProgress, BatchLogEntry, BatchJob } from "@/types";

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

// ── Componente: stepper numérico ───────────────────────────────────────────
function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div>
      <label className="text-xs text-sf-muted block mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 10))}
          className="px-2 py-1.5 rounded-md bg-sf-surface border border-sf-border text-xs hover:bg-sf-border/50 transition-colors select-none"
        >
          −10
        </button>
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          className="px-2 py-1.5 rounded-md bg-sf-surface border border-sf-border text-xs hover:bg-sf-border/50 transition-colors select-none"
        >
          −
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          className="bg-sf-bg border border-sf-border rounded-md px-2 py-1.5 text-sm w-16 text-center"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          className="px-2 py-1.5 rounded-md bg-sf-surface border border-sf-border text-xs hover:bg-sf-border/50 transition-colors select-none"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => onChange(clamp(value + 10))}
          className="px-2 py-1.5 rounded-md bg-sf-surface border border-sf-border text-xs hover:bg-sf-border/50 transition-colors select-none"
        >
          +10
        </button>
      </div>
    </div>
  );
}

// ── Componente: feed de log en vivo ────────────────────────────────────────
function BatchLogFeed({ log }: { log: BatchLogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log.length]);

  return (
    <div className="max-h-52 overflow-y-auto space-y-0.5 font-mono text-[11px] bg-sf-bg rounded-lg p-3 border border-sf-border">
      {log.length === 0 ? (
        <p className="text-sf-muted">Iniciando primer número...</p>
      ) : (
        log.map((entry, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 leading-relaxed ${
              entry.status === "done"    ? "text-green-400" :
              entry.status === "error"   ? "text-red-400"   :
              entry.status === "running" ? "text-sf-accent"  : "text-sf-muted"
            }`}
          >
            <span className="w-3 flex-shrink-0 mt-px">
              {entry.status === "done"    ? "✓" :
               entry.status === "error"   ? "✕" :
               entry.status === "running" ? "▶" : " "}
            </span>
            <span>{entry.msg}</span>
          </div>
        ))
      )}
      <div ref={endRef} />
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────
export default function BatchPage() {
  const saved: SavedBatch | null = (() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(sessionStorage.getItem(SS_KEY) || "null"); } catch { return null; }
  })();

  const [desde,     setDesde]     = useState(saved?.desde  ?? 0);
  const [hasta,     setHasta]     = useState(saved?.hasta  ?? 9);
  const [idioma,    setIdioma]    = useState<"es" | "en" | "ambos">(saved?.idioma ?? "ambos");
  const [estilo,    setEstilo]    = useState<VideoStyle>(saved?.estilo ?? "unified");
  const [efecto,    setEfecto]    = useState<TextEffect>(saved?.efecto ?? "fadeIn");
  const [startDate, setStartDate] = useState<Date | null>(
    saved?.startDate ? new Date(saved.startDate) : null
  );

  const [progress,     setProgress]     = useState<RenderProgress | null>(null);
  const [batchLog,     setBatchLog]     = useState<BatchLogEntry[]>([]);
  const [running,      setRunning]      = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
  const [eta,          setEta]          = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const startTimeRef   = useRef<number | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function persistFormState(overrides: Partial<SavedBatch> = {}) {
    const state: SavedBatch = {
      desde, hasta, idioma, estilo, efecto,
      startDate: startDate ? format(startDate, "yyyy-MM-dd") : "",
      ...overrides,
    };
    sessionStorage.setItem(SS_KEY, JSON.stringify(state));
  }

  function applyProgress(data: RenderProgress) {
    setProgress(data);
    if (data.log) setBatchLog(data.log);

    if (data.status === "rendering") {
      setRunning(true);
      if (!startTimeRef.current) {
        const stored = sessionStorage.getItem(SS_START);
        startTimeRef.current = stored ? parseInt(stored) : Date.now();
        if (!stored) sessionStorage.setItem(SS_START, String(startTimeRef.current));
      }
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
      stopPolling();
    }
  }

  function startPolling() {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(() => {
      fetch("/api/batch")
        .then((r) => r.json())
        .then(({ isActive, progress: prog }: { isActive: boolean; progress: RenderProgress; lastJob: BatchJob | null }) => {
          if (isActive && prog.status === "rendering") {
            applyProgress(prog);
          } else if (!isActive && prog.status !== "rendering") {
            // El render terminó — actualizar y detener polling
            applyProgress(prog);
          }
        })
        .catch(() => {});
    }, 3000);
  }

  function stopPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }

  function connectSSE() {
    if (eventSourceRef.current) eventSourceRef.current.close();
    const evtSrc = new EventSource("/api/render/progress");

    evtSrc.onmessage = (event) => {
      const data = JSON.parse(event.data) as RenderProgress;
      setInitializing(false);
      applyProgress(data);
      // SSE activo y funcionando: no necesitamos polling
      if (data.status === "rendering") stopPolling();
    };

    evtSrc.onerror = () => setInitializing(false);
    eventSourceRef.current = evtSrc;
  }

  // Al montar: recuperar estado desde DB + conectar SSE
  useEffect(() => {
    fetch("/api/batch")
      .then((r) => r.json())
      .then(({ isActive, progress: prog, lastJob }: { isActive: boolean; progress: RenderProgress; lastJob: BatchJob | null }) => {
        if (isActive && prog.status === "rendering") {
          setProgress(prog);
          setRunning(true);
          if (prog.log) setBatchLog(prog.log);
          if (lastJob) {
            setDesde(lastJob.desde);
            setHasta(lastJob.hasta);
            setIdioma(lastJob.idioma as "es" | "en" | "ambos");
            if (lastJob.start_date) setStartDate(new Date(lastJob.start_date));
          }
          // Arrancar polling como fallback mientras SSE no confirme
          startPolling();
        } else if (lastJob) {
          setBatchLog(lastJob.log);
          setProgress({
            total: lastJob.total,
            completado: lastJob.completado,
            actual: lastJob.hasta,
            status: lastJob.status === "done" ? "done" : lastJob.status === "error" ? "error" : "idle",
          });
        }
      })
      .catch(() => {})
      .finally(() => setInitializing(false));

    // Default inteligente: empezar desde el último número renderizado + 1
    if (!saved) {
      fetch("/api/numbers/last-rendered")
        .then((r) => r.json())
        .then(({ last }: { last: number | null }) => {
          if (last !== null) {
            setDesde(last + 1);
            setHasta(Math.min(999, last + 10));
          }
        })
        .catch(() => {});
    }

    connectSSE();
    return () => {
      eventSourceRef.current?.close();
      stopPolling();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStart() {
    setErrorMsg(null);
    const startDateStr = startDate ? format(startDate, "yyyy-MM-dd") : undefined;
    const res = await fetch("/api/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        desde, hasta, idioma, estilo, efecto,
        ...(startDateStr ? { startDate: startDateStr } : {}),
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      setErrorMsg(data.error);
      return;
    }
    setBatchLog([]);
    persistFormState();
    sessionStorage.setItem(SS_START, String(Date.now()));
    startTimeRef.current = Date.now();
    setRunning(true);
    setEta(null);
    connectSSE();
    startPolling();
  }

  async function handleCancel() {
    await fetch("/api/batch", { method: "DELETE" });
  }

  const pct = progress && progress.total > 0
    ? Math.round((progress.completado / progress.total) * 100)
    : 0;

  const totalVideos = idioma === "ambos" ? (hasta - desde + 1) * 2 : hasta - desde + 1;
  const startDateStr = startDate ? format(startDate, "yyyy-MM-dd") : undefined;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold font-display">Renderizado por Lotes</h1>
        <p className="text-sf-muted text-sm mt-1">Genera un rango de números angelicales y prográmalos en YouTube</p>
      </div>

      {/* Formulario */}
      <div className="bg-sf-surface border border-sf-border rounded-xl p-6 space-y-5">

        {/* Fila 1: Desde / Hasta */}
        <div className="flex gap-6 flex-wrap">
          <NumberStepper label="Desde" value={desde} onChange={(v) => setDesde(Math.min(v, hasta))} />
          <NumberStepper label="Hasta" value={hasta} onChange={(v) => setHasta(Math.max(v, desde))} />
          <div className="flex items-end">
            <p className="text-xs text-sf-muted pb-2">
              <span className="text-sf-text font-semibold">{hasta - desde + 1}</span> números ·{" "}
              <span className="text-sf-text font-semibold">{totalVideos}</span> videos
            </p>
          </div>
        </div>

        {/* Fila 2: Idioma / Estilo / Efecto */}
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="text-xs text-sf-muted block mb-1">Idioma</label>
            <Select value={idioma} onValueChange={(v) => setIdioma(v as typeof idioma)}>
              <SelectTrigger className="bg-sf-bg border-sf-border text-sf-text w-36 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-sf-surface border-sf-border text-sf-text">
                <SelectItem value="ambos">🌐 ES + EN</SelectItem>
                <SelectItem value="es">🇪🇸 Solo ES</SelectItem>
                <SelectItem value="en">🇺🇸 Solo EN</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-sf-muted block mb-1">Estilo</label>
            <Select value={estilo} onValueChange={(v) => setEstilo(v as VideoStyle)}>
              <SelectTrigger className="bg-sf-bg border-sf-border text-sf-text w-32 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-sf-surface border-sf-border text-sf-text">
                {STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-sf-muted block mb-1">Efecto</label>
            <Select value={efecto} onValueChange={(v) => setEfecto(v as TextEffect)}>
              <SelectTrigger className="bg-sf-bg border-sf-border text-sf-text w-36 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-sf-surface border-sf-border text-sf-text">
                {EFFECTS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Fila 3: Publicar desde (date picker) */}
        <div className="pt-3 border-t border-sf-border">
          <label className="text-xs text-sf-muted block mb-2">
            Publicar desde <span className="opacity-60">(opcional · 8:00 AM Bogotá)</span>
          </label>
          <div className="flex items-center gap-3 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-sf-bg border-sf-border text-sf-text hover:bg-sf-surface hover:text-sf-text h-9 text-sm gap-2"
                >
                  <CalendarIcon className="w-4 h-4 text-sf-muted" />
                  {startDate
                    ? format(startDate, "d 'de' MMM yyyy", { locale: es })
                    : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-sf-surface border-sf-border" align="start">
                <Calendar
                  mode="single"
                  selected={startDate ?? undefined}
                  onSelect={(d) => setStartDate(d ?? null)}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
            {startDate && (
              <button
                type="button"
                onClick={() => setStartDate(null)}
                className="text-xs text-sf-muted hover:text-red-400 transition-colors"
              >
                Limpiar fecha
              </button>
            )}
          </div>

          {/* Calendario calculado */}
          {startDate && (
            <div className="mt-3 p-3 bg-sf-bg rounded-lg border border-sf-border">
              <p className="text-[10px] font-semibold text-sf-muted mb-2 uppercase tracking-wide">
                Calendario de publicación
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: Math.min(hasta - desde + 1, 12) }, (_, i) => {
                  const d = new Date(`${startDateStr}T13:00:00.000Z`);
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

        {/* Fila 4: Botones de acción */}
        <div className="flex gap-3 items-center pt-1">
          <button
            onClick={handleStart}
            disabled={running}
            className="bg-sf-accent text-sf-bg px-6 py-2 rounded-lg font-bold hover:bg-sf-accent/80 disabled:opacity-50 transition-colors text-sm"
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

        {errorMsg && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
            ⚠️ {errorMsg}
          </p>
        )}
      </div>

      {/* Progreso — skeleton mientras inicializa */}
      {initializing ? (
        <div className="bg-sf-surface border border-sf-border rounded-xl p-6">
          <div className="flex items-center gap-2 text-sf-muted text-sm">
            <span className="w-2 h-2 rounded-full bg-sf-muted animate-pulse inline-block" />
            Verificando estado del servidor...
          </div>
        </div>
      ) : progress && progress.status !== "idle" && (
        <div className="bg-sf-surface border border-sf-border rounded-xl p-6 space-y-4">

          {/* Cabecera: estado + ETA */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">
                {progress.desde !== undefined
                  ? `Lote ${progress.desde}–${progress.hasta} · ${progress.idioma === "ambos" ? "ES + EN" : (progress.idioma ?? "").toUpperCase()}`
                  : "Procesando lote"}
                {progress.startDate && (
                  <span className="ml-2 text-xs font-normal text-sf-muted">
                    · Publica desde {progress.startDate}
                  </span>
                )}
              </p>
              <p className="text-xs text-sf-muted">
                {progress.completado}/{progress.total} números completados
              </p>
            </div>
            <div className="text-right space-y-0.5">
              {eta && progress.status === "rendering" && (
                <p className="text-xs text-sf-muted">{eta} restantes</p>
              )}
              <span className={`text-sm font-medium ${
                progress.status === "done"  ? "text-green-400" :
                progress.status === "error" ? "text-red-400"   : "text-sf-accent"
              }`}>
                {progress.status === "rendering"
                  ? `▶ Número #${progress.actual}`
                  : progress.status === "done"
                    ? "✅ Completado"
                    : "❌ Error / Cancelado"}
              </span>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="w-full bg-sf-bg rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sf-primary to-sf-accent rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-sf-muted text-right -mt-2">{pct}%</p>

          {/* Log en vivo */}
          <div>
            <p className="text-[10px] text-sf-muted uppercase tracking-wide mb-1.5 font-semibold">
              Log en vivo
            </p>
            <BatchLogFeed log={batchLog} />
          </div>
        </div>
      )}
    </div>
  );
}
