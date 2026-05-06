/**
 * Test del pipeline de renderizado — número 0
 * Uso: npx tsx scripts/test-render.ts
 */
async function main() {
  console.log("Probando render del número 0...\n");

  const res = await fetch("http://localhost:3001/api/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ numero: 0 }),
  });

  const data = await res.json();
  console.log("Respuesta:", JSON.stringify(data, null, 2));

  if (data.ok) {
    console.log("\nPipeline exitoso!");
    console.log("ES:", data.paths.es);
    console.log("EN:", data.paths.en);
  } else {
    console.error("\nError:", data.error);
  }
}

main().catch(console.error);
