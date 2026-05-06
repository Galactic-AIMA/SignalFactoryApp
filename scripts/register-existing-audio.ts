import fs from "fs";
import path from "path";
import { getDb } from "../src/lib/db";

const db = getDb();
const dir = path.resolve(process.cwd(), "assets/music/grupo-1");

console.log("Dir:", dir);
console.log("Exists:", fs.existsSync(dir));

if (fs.existsSync(dir)) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mp3"));
  console.log("MP3s encontrados:", files.length);

  for (const file of files) {
    const filepath = path.join(dir, file);
    const exists = db.prepare("SELECT id FROM audios WHERE archivo = ?").get(filepath);
    if (exists) {
      console.log("Ya existe:", file);
      continue;
    }
    db.prepare("INSERT INTO audios (grupo, archivo, fuente, tags) VALUES (?, ?, ?, ?)")
      .run(1, filepath, "manual", "grupo-1 ambient meditation");
    console.log("Registrado:", file);
  }
}

const count = (db.prepare("SELECT COUNT(*) as c FROM audios").get() as { c: number }).c;
console.log("Total audios en DB:", count);
