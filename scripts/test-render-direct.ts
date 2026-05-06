/**
 * Test de render directo (sin pasar por API) — evita timeouts
 */
import "dotenv/config";
import { renderAngelNumber, clearBundleCache } from "../src/lib/render";

async function main() {
  const numero = parseInt(process.argv[2] || "0");
  const idioma = (process.argv[3] || "en") as "es" | "en";

  console.log(`Renderizando número ${numero} (${idioma})...`);
  console.time("render");

  try {
    const output = await renderAngelNumber(numero, idioma, {
      onProgress: (p) => {
        process.stdout.write(`\rProgreso: ${(p * 100).toFixed(1)}%`);
      },
    });
    console.log(`\nListo: ${output}`);
  } catch (err) {
    console.error("\nError:", err);
  }

  console.timeEnd("render");
  process.exit(0);
}

main();
