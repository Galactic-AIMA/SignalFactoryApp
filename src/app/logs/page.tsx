"use client";

import { useEffect, useState } from "react";
import type { LogEntry } from "@/types";

const TIPO_COLORS: Record<string, string> = {
  render: "bg-sf-primary/20 text-sf-primary",
  webhook: "bg-blue-500/20 text-blue-400",
  error: "bg-red-500/20 text-red-400",
  batch: "bg-sf-accent/20 text-sf-accent",
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/logs").then((r) => r.json()).then(setLogs);
  }, []);

  const filtered = filter === "all" ? logs : logs.filter((l) => l.tipo === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Logs</h1>
        <p className="text-sf-muted text-sm mt-1">Registro de actividad del sistema</p>
      </div>

      <div className="flex gap-2">
        {["all", "render", "webhook", "error", "batch"].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              filter === t ? "bg-sf-primary/20 text-sf-primary" : "text-sf-muted hover:text-sf-text"
            }`}
          >
            {t === "all" ? "Todos" : t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sf-muted text-center py-10">No hay logs</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => (
            <div key={log.id} className="bg-sf-surface border border-sf-border rounded-lg">
              <button
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                className="w-full text-left px-4 py-3 flex items-center gap-3"
              >
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${TIPO_COLORS[log.tipo] || ""}`}>
                  {log.tipo}
                </span>
                <span className="text-sm flex-1">{log.mensaje}</span>
                <span className="text-xs text-sf-muted">{new Date(log.created_at).toLocaleString()}</span>
              </button>
              {expandedId === log.id && log.detalle && (
                <div className="px-4 pb-3">
                  <pre className="bg-sf-bg rounded-md p-3 text-xs text-sf-muted overflow-x-auto">
                    {JSON.stringify(JSON.parse(log.detalle), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
