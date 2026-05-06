"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardCard } from "@/components/DashboardCard";
import type { DashboardStats } from "@/types";

const GRUPO_NAMES: Record<number, string> = {
  1: "Presencia y Protección",
  2: "Flujo y Abundancia",
  3: "Cambio y Transición",
  4: "Fe y Manifestación",
  5: "Propósito y Elevación",
};

const GRUPO_COLORS: Record<number, string> = {
  1: "bg-yellow-500/20 text-yellow-400",
  2: "bg-cyan-500/20 text-cyan-400",
  3: "bg-green-500/20 text-green-400",
  4: "bg-orange-500/20 text-orange-400",
  5: "bg-purple-500/20 text-purple-400",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats);
  }, []);

  if (!stats) {
    return <div className="text-sf-muted text-center py-20">Cargando estadísticas...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display">Dashboard</h1>
        <p className="text-sf-muted text-sm mt-1">Estado general de la fábrica de señales</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard title="Total números" value={stats.total_numbers} accent="text-sf-text" />
        <DashboardCard title="Pendientes" value={stats.pendientes} accent="text-sf-accent" />
        <DashboardCard title="Renderizados" value={stats.renderizados} accent="text-sf-primary" />
        <DashboardCard title="Publicados" value={stats.publicados} accent="text-green-400" />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Assets por grupo</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((g) => (
            <div key={g} className="bg-sf-surface border border-sf-border rounded-lg p-4">
              <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${GRUPO_COLORS[g]}`}>
                Grupo {g}
              </div>
              <p className="text-xs text-sf-muted">{GRUPO_NAMES[g]}</p>
              <p className="text-sm mt-2">
                Fondos: <span className="font-bold text-sf-text">{stats.backgrounds_disponibles[g] || 0}</span>
              </p>
              <p className="text-sm">
                Audios: <span className="font-bold text-sf-text">{stats.audios_disponibles[g] || 0}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <Link
          href="/editor"
          className="bg-sf-primary/20 text-sf-primary border border-sf-primary/30 px-6 py-3 rounded-lg hover:bg-sf-primary/30 transition-colors"
        >
          Abrir Editor
        </Link>
        <Link
          href="/batch"
          className="bg-sf-accent/20 text-sf-accent border border-sf-accent/30 px-6 py-3 rounded-lg hover:bg-sf-accent/30 transition-colors"
        >
          Renderizar Lote
        </Link>
      </div>
    </div>
  );
}
