import { getDb } from "../src/lib/db";

const db = getDb();
const rows = db.prepare("SELECT id, grupo, usado_es, usado_en, asignado_a, archivo FROM audios").all();
console.log("Audios en DB:");
for (const r of rows as any[]) {
  console.log(`  id=${r.id} grupo=${r.grupo} usado_es=${r.usado_es} usado_en=${r.usado_en} asignado_a=${r.asignado_a}`);
  console.log(`    ${r.archivo}`);
}

// Resetear flags de uso para test
db.prepare("UPDATE audios SET usado_es = 0, usado_en = 0, asignado_a = NULL").run();
console.log("\nFlags de uso reseteados para test.");

const avail = db.prepare("SELECT COUNT(*) as c FROM audios WHERE grupo = 1 AND usado_es = 0").get() as { c: number };
console.log("Audios grupo 1 disponibles ahora:", avail.c);
