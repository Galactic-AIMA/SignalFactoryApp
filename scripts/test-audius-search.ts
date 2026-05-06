/**
 * Diagnóstico: qué devuelve Audius para cada grupo de vibración
 */
import { searchAudioForGroup, AUDIO_SEARCH_TERMS } from "../src/lib/audius";

async function main() {
  for (let grupo = 1; grupo <= 5; grupo++) {
    const terms = AUDIO_SEARCH_TERMS[grupo];
    console.log(`\n=== GRUPO ${grupo} ===`);

    for (const term of terms) {
      try {
        const result = await searchAudioForGroup(grupo, term);
        console.log(`  "${term}" → ${result.tracks.length} resultados`);
        for (const t of result.tracks.slice(0, 3)) {
          console.log(`    - ${t.title} (${t.duration}s) by ${t.artist}`);
        }
      } catch (err) {
        console.log(`  "${term}" → ERROR: ${err}`);
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

main().catch(console.error);
