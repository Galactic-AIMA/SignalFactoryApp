/**
 * Descarga backgrounds faltantes para grupos 3 y 5 via la API local.
 * Requiere que el servidor esté corriendo en localhost:3001
 * Uso: npx tsx scripts/fill-missing-assets.ts
 */
async function downloadForGroup(grupo: number, tipo: "background" | "audio", cantidad: number) {
  console.log(`\nDescargando ${cantidad} ${tipo}s para grupo ${grupo}...`);

  const res = await fetch("http://localhost:3001/api/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grupo, tipo, cantidad }),
  });

  const data = await res.json();

  if (data.ok) {
    console.log(`  OK: ${data.descargados} ${data.tipo} descargados`);
  } else {
    console.error(`  Error: ${data.error}`);
  }

  return data;
}

async function main() {
  console.log("=== Llenando assets faltantes ===\n");

  // Verificar que el servidor responde
  try {
    const stats = await fetch("http://localhost:3001/api/stats");
    const data = await stats.json();
    console.log("Estado actual de backgrounds:");
    for (const [g, count] of Object.entries(data.backgrounds_disponibles)) {
      console.log(`  Grupo ${g}: ${count} disponibles`);
    }
    console.log("Audios:");
    for (const [g, count] of Object.entries(data.audios_disponibles)) {
      console.log(`  Grupo ${g}: ${count} disponibles`);
    }
  } catch {
    console.error("Error: El servidor no está corriendo en localhost:3001");
    console.error("Ejecuta primero: npm run dev");
    process.exit(1);
  }

  // Descargar backgrounds faltantes (grupos 3 y 5 tienen 0)
  await downloadForGroup(3, "background", 10);
  await downloadForGroup(5, "background", 10);

  // Verificar estado final
  const finalStats = await fetch("http://localhost:3001/api/stats");
  const finalData = await finalStats.json();
  console.log("\n=== Estado final ===");
  console.log("Backgrounds:", finalData.backgrounds_disponibles);
  console.log("Audios:", finalData.audios_disponibles);
}

main().catch(console.error);
