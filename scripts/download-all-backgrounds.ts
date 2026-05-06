import "dotenv/config";
import { downloadBackgroundsForGroup } from "../src/lib/pexels";

async function main() {
  console.log("=== Descargando backgrounds para todos los grupos ===\n");

  for (let grupo = 1; grupo <= 5; grupo++) {
    console.log(`Descargando grupo ${grupo}...`);
    try {
      const count = await downloadBackgroundsForGroup(grupo, 5);
      console.log(`  → ${count} backgrounds descargados\n`);
    } catch (err) {
      console.error(`  Error grupo ${grupo}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("=== Listo ===");
}

main().catch(console.error);
