import { getDb } from "../src/lib/db";

const db = getDb();

// Resetear backgrounds y audios usados
db.prepare("UPDATE backgrounds SET usado_es = 0, usado_en = 0, asignado_a = NULL").run();
db.prepare("UPDATE audios SET usado_es = 0, usado_en = 0, asignado_a = NULL").run();

// Resetear renders y estados de números
db.prepare("DELETE FROM renders").run();
db.prepare("UPDATE angel_numbers SET estado = 'pendiente'").run();

const bgs = (db.prepare("SELECT COUNT(*) as c FROM backgrounds WHERE usado_es = 0").get() as { c: number }).c;
const auds = (db.prepare("SELECT COUNT(*) as c FROM audios WHERE usado_es = 0").get() as { c: number }).c;

console.log(`Reset completado. Backgrounds disponibles: ${bgs}, Audios disponibles: ${auds}`);
