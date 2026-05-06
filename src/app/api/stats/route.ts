import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { DashboardStats } from "@/types";

export async function GET() {
  const db = getDb();

  const total = db.prepare("SELECT COUNT(*) as c FROM angel_numbers").get() as { c: number };
  const pendientes = db.prepare("SELECT COUNT(*) as c FROM angel_numbers WHERE estado = 'pendiente'").get() as { c: number };
  const renderizados = db.prepare("SELECT COUNT(*) as c FROM angel_numbers WHERE estado IN ('completo','renderizado_es','renderizado_en')").get() as { c: number };
  const publicados = db.prepare("SELECT COUNT(*) as c FROM angel_numbers WHERE estado = 'publicado'").get() as { c: number };

  const bgGroups = db.prepare(`
    SELECT grupo, COUNT(*) as c FROM backgrounds WHERE usado_es = 0 GROUP BY grupo
  `).all() as { grupo: number; c: number }[];

  const audioGroups = db.prepare(`
    SELECT grupo, COUNT(*) as c FROM audios WHERE usado_es = 0 GROUP BY grupo
  `).all() as { grupo: number; c: number }[];

  const stats: DashboardStats = {
    total_numbers: total.c,
    pendientes: pendientes.c,
    renderizados: renderizados.c,
    publicados: publicados.c,
    backgrounds_disponibles: Object.fromEntries(bgGroups.map((g) => [g.grupo, g.c])),
    audios_disponibles: Object.fromEntries(audioGroups.map((g) => [g.grupo, g.c])),
  };

  return NextResponse.json(stats);
}
