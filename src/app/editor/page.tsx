"use client";

import { useEffect, useState, useRef } from "react";
import type { AngelNumber, AngelNumberEstado, VideoStyle, TextEffect } from "@/types";
import { VIBRATION_GROUPS } from "@/types";
import { BackgroundPicker } from "@/components/BackgroundPicker";
import { AudioPicker } from "@/components/AudioPicker";

const STYLES: VideoStyle[] = ["unified", "serene", "raw", "minimal", "cinematic", "bold"];
const EFFECTS: TextEffect[] = ["fadeIn", "typewriter", "slideUp", "scaleIn", "glowPulse"];

const GRUPO_BG: Record<number, string> = {
  1: "bg-yellow-500/20 hover:bg-yellow-500/30",
  2: "bg-cyan-500/20 hover:bg-cyan-500/30",
  3: "bg-green-500/20 hover:bg-green-500/30",
  4: "bg-orange-500/20 hover:bg-orange-500/30",
  5: "bg-purple-500/20 hover:bg-purple-500/30",
};

const GRUPO_DEFAULT_BORDER: Record<number, string> = {
  1: "border-yellow-500/40",
  2: "border-cyan-500/40",
  3: "border-green-500/40",
  4: "border-orange-500/40",
  5: "border-purple-500/40",
};

function getEstadoBorder(estado: AngelNumberEstado, grupo: number): string {
  switch (estado) {
    case "renderizado_es":
    case "renderizado_en": return "border-yellow-400";
    case "completo":       return "border-green-400";
    case "publicado":      return "border-purple-400";
    case "error":          return "border-red-400";
    default:               return GRUPO_DEFAULT_BORDER[grupo] || "border-sf-border/30";
  }
}

function getEstadoIcon(estado: AngelNumberEstado): { text: string; color: string } | null {
  switch (estado) {
    case "renderizado_es": return { text: "ES", color: "text-yellow-400 bg-yellow-500/20" };
    case "renderizado_en": return { text: "EN", color: "text-yellow-400 bg-yellow-500/20" };
    case "completo":       return { text: "✓",  color: "text-green-400 bg-green-500/20" };
    case "publicado":      return { text: "↑",  color: "text-purple-400 bg-purple-500/20" };
    case "error":          return { text: "✕",  color: "text-red-400 bg-red-500/20" };
    default:               return null;
  }
}

// Etapas de progreso de render (~3 min total)
const RENDER_STAGES = [
  { time: 0,   progress: 5,  msg: "Asignando assets..." },
  { time: 8,   progress: 20, msg: "Iniciando Remotion..." },
  { time: 25,  progress: 48, msg: "Renderizando frames..." },
  { time: 100, progress: 78, msg: "Finalizando video..." },
  { time: 160, progress: 92, msg: "Subiendo a R2..." },
];

interface RenderState {
  status: "idle" | "rendering" | "done" | "error";
  mensaje: string;
  progress: number;
}

interface WebhookTestState {
  status: "idle" | "sending" | "ok" | "error";
  mensaje: string;
  detalle: string;
}

const IDLE_STATE: RenderState = { status: "idle", mensaje: "", progress: 0 };

function RenderProgressBar({ state }: { state: RenderState }) {
  if (state.status === "idle") return null;
  const isError    = state.status === "error";
  const isDone     = state.status === "done";
  const isRunning  = state.status === "rendering";
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className={isError ? "text-red-400" : isDone ? "text-green-400" : "text-sf-muted"}>
          {isRunning && <span className="inline-block w-1.5 h-1.5 rounded-full bg-sf-primary animate-ping mr-1.5 align-middle" />}
          {state.mensaje}
        </span>
        {isRunning && <span className="text-sf-muted tabular-nums">{state.progress}%</span>}
      </div>
      <div className="h-1.5 bg-sf-border/40 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isError ? "bg-red-500" : isDone ? "bg-green-500" : "bg-sf-primary"
          }`}
          style={{ width: `${isDone ? 100 : isError ? 0 : state.progress}%` }}
        />
      </div>
    </div>
  );
}

type Canal = "es" | "en";

interface AngelNumberWithSchedule extends AngelNumber {
  scheduled_at: string | null;
}

interface ChannelSelection {
  bgId: number | null;
  bgPath: string | null;
  audioId: number | null;
}

const EMPTY_SELECTION: ChannelSelection = { bgId: null, bgPath: null, audioId: null };

export default function EditorPage() {
  const [numbers, setNumbers]         = useState<AngelNumberWithSchedule[]>([]);
  const [selected, setSelected]       = useState<AngelNumberWithSchedule | null>(null);
  const [estilo, setEstilo]           = useState<VideoStyle>("unified");
  const [efecto, setEfecto]           = useState<TextEffect>("fadeIn");
  const [selEs, setSelEs]             = useState<ChannelSelection>(EMPTY_SELECTION);
  const [selEn, setSelEn]             = useState<ChannelSelection>(EMPTY_SELECTION);
  const [activeCanal, setActiveCanal] = useState<Canal>("es");
  const [renderStateEs, setRenderStateEs] = useState<RenderState>(IDLE_STATE);
  const [renderStateEn, setRenderStateEn] = useState<RenderState>(IDLE_STATE);
  const [webhookTest, setWebhookTest]     = useState<WebhookTestState>({ status: "idle", mensaje: "", detalle: "" });
  const [webhookTestDate, setWebhookTestDate] = useState("");

  const progressEsRef  = useRef<NodeJS.Timeout | null>(null);
  const progressEnRef  = useRef<NodeJS.Timeout | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const isRendering = renderStateEs.status === "rendering" || renderStateEn.status === "rendering";
  const activeSel   = activeCanal === "es" ? selEs : selEn;
  const setActiveSel = activeCanal === "es" ? setSelEs : setSelEn;

  useEffect(() => {
    loadNumbers();
    return () => {
      if (progressEsRef.current) clearInterval(progressEsRef.current);
      if (progressEnRef.current) clearInterval(progressEnRef.current);
    };
  }, []);

  async function loadNumbers() {
    try {
      const res = await fetch("/api/numbers");
      if (res.ok) setNumbers(await res.json());
    } catch {}
  }

  function handleSelectNumber(num: AngelNumberWithSchedule) {
    setSelected(num);
    setSelEs(EMPTY_SELECTION);
    setSelEn(EMPTY_SELECTION);
    setActiveCanal("es");
    setRenderStateEs(IDLE_STATE);
    setRenderStateEn(IDLE_STATE);
  }

  function handleSelectBg(id: number) {
    setActiveSel((prev) => ({ ...prev, bgId: id }));
    fetch(`/api/backgrounds?grupo=${selected?.grupo || 1}`)
      .then((r) => r.json())
      .then((data) => {
        const bg = data.backgrounds?.find((b: { id: number }) => b.id === id);
        if (bg) setActiveSel((prev) => ({ ...prev, bgPath: bg.staticPath }));
      })
      .catch(() => {});
  }

  function handleSelectAudio(id: number) {
    setActiveSel((prev) => ({ ...prev, audioId: id }));
  }

  function handleClearSelection(canal: Canal) {
    if (canal === "es") setSelEs(EMPTY_SELECTION);
    else setSelEn(EMPTY_SELECTION);
  }

  function startProgressAnimation(
    setRenderState: React.Dispatch<React.SetStateAction<RenderState>>,
    intervalRef: React.MutableRefObject<NodeJS.Timeout | null>
  ) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      let stageIdx = 0;
      for (let i = 0; i < RENDER_STAGES.length; i++) {
        if (elapsed >= RENDER_STAGES[i].time) stageIdx = i;
      }
      const stage = RENDER_STAGES[stageIdx];
      const next  = RENDER_STAGES[stageIdx + 1];
      let progress = stage.progress;
      if (next && next.time > stage.time) {
        const ratio = (elapsed - stage.time) / (next.time - stage.time);
        progress = stage.progress + ratio * (next.progress - stage.progress);
      }
      setRenderState((prev) =>
        prev.status === "rendering"
          ? { ...prev, progress: Math.min(Math.round(progress), 96), mensaje: stage.msg }
          : prev
      );
    }, 1000);
  }

  async function doRender(idioma: Canal) {
    if (!selected) return;
    const sel           = idioma === "es" ? selEs : selEn;
    const setRenderState = idioma === "es" ? setRenderStateEs : setRenderStateEn;
    const intervalRef   = idioma === "es" ? progressEsRef : progressEnRef;

    setRenderState({ status: "rendering", mensaje: "Asignando assets...", progress: 5 });
    startProgressAnimation(setRenderState, intervalRef);

    try {
      const payload: Record<string, unknown> = { numero: selected.id, estilo, efecto, idioma };
      if (sel.bgId)   payload.backgroundId = sel.bgId;
      if (sel.audioId) payload.audioId    = sel.audioId;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 900_000); // 15 min
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();

      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

      if (data.ok) {
        setRenderState({ status: "done", mensaje: "✅ Listo — subido a R2", progress: 100 });
      } else {
        setRenderState({ status: "error", mensaje: `Error: ${data.error}`, progress: 0 });
      }
    } catch (err) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      const msg = isTimeout
        ? "⚠️ Sin respuesta — el video puede haberse generado igualmente"
        : "Error de conexión";
      setRenderState({ status: isTimeout ? "done" : "error", mensaje: msg, progress: isTimeout ? 100 : 0 });
    }
  }

  async function handleRender(idioma: Canal) {
    if (!selected || isRendering) return;
    await doRender(idioma);
    await loadNumbers();
  }

  async function handleRenderDual() {
    if (!selected || isRendering) return;
    await doRender("es");
    await doRender("en");
    await loadNumbers();
  }

  async function handleWebhookTest() {
    if (!selected) return;
    setWebhookTest({ status: "sending", mensaje: "Enviando webhook de prueba...", detalle: "" });
    try {
      const res = await fetch("/api/webhook/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          angelNumber: selected.id,
          ...(webhookTestDate ? { publishAt: new Date(`${webhookTestDate}T13:00:00.000Z`).toISOString() } : {}),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setWebhookTest({
          status: "ok",
          mensaje: `✅ n8n respondió HTTP ${data.status}`,
          detalle: data.respuestaN8n ?? "",
        });
      } else {
        setWebhookTest({
          status: "error",
          mensaje: `❌ ${data.error ?? `HTTP ${data.status}`}`,
          detalle: data.respuestaN8n ?? "",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setWebhookTest({ status: "error", mensaje: `❌ ${msg}`, detalle: "" });
    }
  }

  const texto = selected ? { es: selected.texto_es, en: selected.texto_en } : null;

  return (
    <div className="flex gap-6 items-start">

      {/* ── Columna izquierda: grilla de números (sticky) ── */}
      <aside className="w-56 flex-shrink-0 sticky top-6">
        <div className="mb-3">
          <p className="text-xs font-semibold text-sf-text">Números (0–99)</p>
          <p className="text-[10px] text-sf-muted mt-0.5">Haz click para editar</p>
        </div>

        <div className="max-h-[calc(100vh-160px)] overflow-y-auto pr-1">
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: 100 }, (_, i) => {
              const num       = numbers.find((n) => n.id === i);
              const grupo     = num?.grupo || 1;
              const isSelected = selected?.id === i;
              const estado    = (num?.estado || "pendiente") as AngelNumberEstado;
              const icon      = getEstadoIcon(estado);
              const border    = isSelected ? "border-sf-primary" : getEstadoBorder(estado, grupo);
              const bg        = isSelected ? "bg-sf-primary/20" : (GRUPO_BG[grupo] || "bg-sf-surface");

              return (
                <button
                  key={i}
                  onClick={() => num && handleSelectNumber(num)}
                  disabled={!num}
                  title={num
                    ? `${i} — ${num.grupo_nombre} — ${estado}${num.scheduled_at ? ` · Publica ${new Date(num.scheduled_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: "America/Bogota" })}` : ""}`
                    : `${i} (sin datos)`}
                  className={`relative aspect-square rounded-md border-2 text-[11px] font-bold transition-all
                    ${bg} ${border}
                    ${isSelected ? "ring-2 ring-sf-primary scale-110 z-10" : ""}
                    ${!num ? "opacity-20 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {i}
                  {icon && (
                    <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[7px] font-bold flex items-center justify-center ${icon.color}`}>
                      {icon.text}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Leyenda */}
          <div className="mt-3 pt-3 border-t border-sf-border space-y-1 text-[10px] text-sf-muted">
            {[
              { color: "border-yellow-400", label: "Parcial (ES/EN)" },
              { color: "border-green-400",  label: "Completo" },
              { color: "border-purple-400", label: "Publicado" },
              { color: "border-red-400",    label: "Error" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-sm border-2 inline-block flex-shrink-0 ${color}`} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Columna derecha: editor ── */}
      <div className="flex-1 min-w-0 space-y-5">
        <div>
          <h1 className="text-2xl font-bold font-display">Editor</h1>
          <p className="text-sf-muted text-sm mt-1">Selecciona un número en la grilla para renderizar</p>
        </div>

        {!selected && (
          <div className="bg-sf-surface border border-sf-border rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">✨</p>
            <p className="text-sf-text font-medium">Selecciona un número en la grilla</p>
            <p className="text-sf-muted text-sm mt-1">Los bordes de colores indican el estado de cada número</p>
          </div>
        )}

        {selected && texto && (
          <div className="bg-sf-surface border border-sf-border rounded-xl p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Número {selected.id}</h2>
              <span className="text-xs px-2 py-1 rounded bg-sf-primary/20 text-sf-primary">
                Grupo {selected.grupo}: {selected.grupo_nombre}
              </span>
            </div>

            {/* Textos */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-sf-muted mb-1">Español</p>
                <p className="text-sm bg-sf-bg rounded-lg p-3 border border-sf-border">{texto.es}</p>
              </div>
              <div>
                <p className="text-xs text-sf-muted mb-1">English</p>
                <p className="text-sm bg-sf-bg rounded-lg p-3 border border-sf-border">{texto.en}</p>
              </div>
            </div>

            {/* Estilo y efecto */}
            <div className="flex gap-4">
              <div>
                <label className="text-xs text-sf-muted block mb-1">Estilo</label>
                <select
                  value={estilo}
                  onChange={(e) => setEstilo(e.target.value as VideoStyle)}
                  className="bg-sf-bg border border-sf-border rounded-md px-3 py-1.5 text-sm"
                >
                  {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-sf-muted block mb-1">Efecto</label>
                <select
                  value={efecto}
                  onChange={(e) => setEfecto(e.target.value as TextEffect)}
                  className="bg-sf-bg border border-sf-border rounded-md px-3 py-1.5 text-sm"
                >
                  {EFFECTS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>

            {/* Tabs de canal */}
            <div className="flex gap-1 bg-sf-bg rounded-lg p-1">
              <button
                onClick={() => setActiveCanal("es")}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeCanal === "es" ? "bg-sf-primary text-white" : "text-sf-muted hover:text-sf-text"
                }`}
              >
                🇪🇸 Canal ES — Tu Señal de Hoy
              </button>
              <button
                onClick={() => setActiveCanal("en")}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeCanal === "en" ? "bg-sf-accent text-white" : "text-sf-muted hover:text-sf-text"
                }`}
              >
                🇺🇸 Canal EN — Your Daily Sign
              </button>
            </div>

            {/* Preview + Pickers */}
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
              {/* Preview */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-sf-text">
                  Preview {activeCanal === "es" ? "ES" : "EN"}
                </h3>
                <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-black border border-sf-border">
                  {activeSel.bgPath ? (
                    <video
                      ref={previewVideoRef}
                      src={`/api/serve/${activeSel.bgPath}`}
                      autoPlay
                      loop
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-b from-sf-bg to-black flex items-center justify-center">
                      <span className="text-sf-muted text-xs">Selecciona un fondo</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
                    <p className="text-white text-sm font-display leading-relaxed drop-shadow-lg">
                      {(() => {
                        const t = activeCanal === "es" ? texto.es : texto.en;
                        const qIndex = t.indexOf("?");
                        if (qIndex === -1) return t;
                        const pregunta = t.slice(0, qIndex + 1);
                        const resto = t.slice(qIndex + 1).trim();
                        return (
                          <>
                            <span className="text-base font-bold">{pregunta}</span>
                            {resto && <><br /><br />{resto}</>}
                          </>
                        );
                      })()}
                    </p>
                    <div className="w-12 h-px bg-white/30 my-3" />
                    <p className="text-white/60 text-[10px] tracking-[0.25em] uppercase">
                      {activeCanal === "es" ? "Tu Señal de Hoy" : "Your Daily Sign"}
                    </p>
                    <div className="w-6 h-px bg-white/20 my-2" />
                    <p className="text-white/40 text-2xl font-display">{selected.id}</p>
                  </div>
                </div>

                {(activeSel.bgId || activeSel.audioId) && (
                  <div className="flex items-center gap-2 text-xs text-sf-muted flex-wrap">
                    {activeSel.bgId && (
                      <span className="px-2 py-0.5 rounded bg-sf-primary/10 text-sf-primary">
                        Fondo #{activeSel.bgId}
                      </span>
                    )}
                    {activeSel.audioId && (
                      <span className="px-2 py-0.5 rounded bg-sf-accent/10 text-sf-accent">
                        Audio #{activeSel.audioId}
                      </span>
                    )}
                    <button
                      onClick={() => handleClearSelection(activeCanal)}
                      className="text-sf-muted hover:text-red-400 transition-colors ml-auto"
                    >
                      Limpiar
                    </button>
                  </div>
                )}
              </div>

              {/* Pickers */}
              <div className="space-y-5">
                <BackgroundPicker
                  grupo={selected.grupo}
                  selectedId={activeSel.bgId}
                  onSelect={handleSelectBg}
                />
                <AudioPicker
                  grupo={selected.grupo}
                  selectedId={activeSel.audioId}
                  onSelect={handleSelectAudio}
                />
              </div>
            </div>

            {/* Resumen por canal */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className={`p-3 rounded-lg border ${selEs.bgId || selEs.audioId ? "border-sf-primary/30 bg-sf-primary/5" : "border-sf-border bg-sf-bg"}`}>
                <p className="font-semibold text-sf-text mb-1">🇪🇸 ES</p>
                <p className="text-sf-muted">
                  {selEs.bgId ? `Fondo #${selEs.bgId}` : "Fondo auto"} · {selEs.audioId ? `Audio #${selEs.audioId}` : "Audio auto"}
                </p>
              </div>
              <div className={`p-3 rounded-lg border ${selEn.bgId || selEn.audioId ? "border-sf-accent/30 bg-sf-accent/5" : "border-sf-border bg-sf-bg"}`}>
                <p className="font-semibold text-sf-text mb-1">🇺🇸 EN</p>
                <p className="text-sf-muted">
                  {selEn.bgId ? `Fondo #${selEn.bgId}` : "Fondo auto"} · {selEn.audioId ? `Audio #${selEn.audioId}` : "Audio auto"}
                </p>
              </div>
            </div>

            {/* Botones de render + barras de progreso */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <button
                    onClick={() => handleRender("es")}
                    disabled={isRendering}
                    className="w-full bg-sf-primary text-white px-4 py-2.5 rounded-lg font-medium hover:bg-sf-primary/80 disabled:opacity-50 transition-colors text-sm"
                  >
                    {renderStateEs.status === "rendering" ? "Renderizando ES..." : "Renderizar ES"}
                  </button>
                  <RenderProgressBar state={renderStateEs} />
                </div>

                <div>
                  <button
                    onClick={() => handleRender("en")}
                    disabled={isRendering}
                    className="w-full bg-sf-accent text-white px-4 py-2.5 rounded-lg font-medium hover:bg-sf-accent/80 disabled:opacity-50 transition-colors text-sm"
                  >
                    {renderStateEn.status === "rendering" ? "Renderizando EN..." : "Renderizar EN"}
                  </button>
                  <RenderProgressBar state={renderStateEn} />
                </div>
              </div>

              <button
                onClick={handleRenderDual}
                disabled={isRendering}
                className="w-full bg-gradient-to-r from-sf-primary to-sf-accent text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
              >
                {isRendering ? "Renderizando..." : "Renderizar ES + EN"}
              </button>
            </div>

            {/* Panel de prueba de webhook */}
            {selected.estado !== "pendiente" && (
              <div className="pt-4 border-t border-sf-border space-y-3">
                <p className="text-xs font-semibold text-sf-muted">
                  Prueba de webhook → n8n
                  <span className="ml-2 font-normal opacity-60">Sin cambios en DB</span>
                </p>
                <div className="flex items-end gap-3 flex-wrap">
                  <div>
                    <label className="text-[10px] text-sf-muted block mb-1">
                      publishAt <span className="opacity-60">(opcional)</span>
                    </label>
                    <input
                      type="date"
                      value={webhookTestDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setWebhookTestDate(e.target.value)}
                      className="bg-sf-bg border border-sf-border rounded-md px-3 py-1.5 text-xs"
                    />
                  </div>
                  <button
                    onClick={handleWebhookTest}
                    disabled={webhookTest.status === "sending"}
                    className="px-4 py-2 rounded-lg border border-sf-border text-sf-text text-sm hover:bg-sf-surface disabled:opacity-50 transition-colors"
                  >
                    {webhookTest.status === "sending" ? "Enviando..." : "Probar webhook"}
                  </button>
                  {webhookTest.status !== "idle" && webhookTest.status !== "sending" && (
                    <button
                      onClick={() => setWebhookTest({ status: "idle", mensaje: "", detalle: "" })}
                      className="text-[10px] text-sf-muted hover:text-sf-text transition-colors"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {webhookTest.status !== "idle" && (
                  <div className={`rounded-lg border p-3 text-xs space-y-1.5 ${
                    webhookTest.status === "ok"
                      ? "border-green-500/30 bg-green-500/5"
                      : webhookTest.status === "error"
                        ? "border-red-500/30 bg-red-500/5"
                        : "border-sf-border bg-sf-bg"
                  }`}>
                    <p className={
                      webhookTest.status === "ok" ? "text-green-400" :
                      webhookTest.status === "error" ? "text-red-400" : "text-sf-muted"
                    }>
                      {webhookTest.mensaje}
                    </p>
                    {webhookTest.detalle && (
                      <p className="text-sf-muted font-mono break-all opacity-70">
                        {webhookTest.detalle.length > 300
                          ? webhookTest.detalle.slice(0, 300) + "…"
                          : webhookTest.detalle}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
