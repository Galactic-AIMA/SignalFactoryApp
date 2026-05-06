/**
 * Batch render: números 0-9 en ES y EN (20 videos)
 * Reutiliza el bundle de Remotion para máxima velocidad
 */
import { renderAngelNumber } from "../src/lib/render";

async function main() {
  const numeros = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const idiomas: ("es" | "en")[] = ["es", "en"];
  const total = numeros.length * idiomas.length;
  let done = 0;
  let errors: string[] = [];

  console.log(`Iniciando batch render: ${total} videos\n`);
  const startAll = Date.now();

  for (const num of numeros) {
    for (const idioma of idiomas) {
      done++;
      const label = `[${done}/${total}] ${String(num).padStart(3, "0")}-${idioma}`;
      console.log(`${label} — renderizando...`);
      const start = Date.now();

      try {
        const output = await renderAngelNumber(num, idioma, {
          onProgress: (p) => {
            process.stdout.write(`\r${label} — ${(p * 100).toFixed(0)}%`);
          },
        });
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`\r${label} — OK (${elapsed}s) → ${output}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`\r${label} — ERROR: ${msg}`);
        errors.push(`${num}-${idioma}: ${msg}`);
      }
    }
  }

  const totalTime = ((Date.now() - startAll) / 1000 / 60).toFixed(1);
  console.log(`\n=== Batch completo ===`);
  console.log(`Videos: ${done - errors.length}/${total} exitosos`);
  console.log(`Tiempo total: ${totalTime} min`);
  if (errors.length > 0) {
    console.log(`\nErrores:`);
    errors.forEach((e) => console.log(`  - ${e}`));
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

main();
