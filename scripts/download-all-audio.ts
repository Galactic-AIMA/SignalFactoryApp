/**
 * Descarga automática de audios para todos los grupos de vibración
 */
import { downloadAudiosForGroup } from "../src/lib/audius";

async function main() {
  const porGrupo = 5;
  let total = 0;

  for (let g = 1; g <= 5; g++) {
    console.log(`\nDescargando grupo ${g}...`);
    try {
      const count = await downloadAudiosForGroup(g, porGrupo);
      console.log(`  → ${count} pistas descargadas`);
      total += count;
    } catch (err) {
      console.log(`  → ERROR: ${err}`);
    }
  }

  console.log(`\nTotal descargado: ${total} pistas`);
}

main().catch(console.error);
