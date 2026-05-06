/**
 * Descarga las Google Fonts usadas en SignalVideo a assets/fonts/
 * Usa la CSS API de Google Fonts para obtener URLs correctas.
 * Uso: npx tsx scripts/download-fonts.ts
 */
import fs from "fs";
import path from "path";

const FONTS_DIR = path.resolve(process.cwd(), "assets/fonts");

// Google Fonts CSS API — pedir woff2 con user-agent de Chrome
const CSS_URLS = [
  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap",
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&display=swap",
  "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap",
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function main() {
  if (!fs.existsSync(FONTS_DIR)) fs.mkdirSync(FONTS_DIR, { recursive: true });

  let totalDownloaded = 0;

  for (const cssUrl of CSS_URLS) {
    console.log(`\nObteniendo CSS: ${cssUrl.split("family=")[1]?.split("&")[0]}`);

    const cssRes = await fetch(cssUrl, { headers: { "User-Agent": UA } });
    if (!cssRes.ok) {
      console.error(`  Error obteniendo CSS: ${cssRes.status}`);
      continue;
    }

    const css = await cssRes.text();

    // Extraer todos los @font-face del CSS
    const faceRegex = /@font-face\s*\{([^}]+)\}/g;
    let match;

    while ((match = faceRegex.exec(css)) !== null) {
      const block = match[1];

      // Extraer familia, peso y URL
      const familyMatch = block.match(/font-family:\s*'([^']+)'/);
      const weightMatch = block.match(/font-weight:\s*(\d+)/);
      const urlMatch = block.match(/url\(([^)]+)\)\s*format\('woff2'\)/);

      if (!familyMatch || !weightMatch || !urlMatch) continue;

      const family = familyMatch[1];
      const weight = weightMatch[1];
      const fontUrl = urlMatch[1];

      const safeName = family.replace(/\s+/g, "");
      const weightName = weight === "400" ? "Regular" : weight === "500" ? "Medium" : weight === "600" ? "SemiBold" : weight === "700" ? "Bold" : `w${weight}`;
      const filename = `${safeName}-${weightName}.woff2`;
      const filepath = path.join(FONTS_DIR, filename);

      if (fs.existsSync(filepath)) {
        console.log(`  Ya existe: ${filename}`);
        continue;
      }

      console.log(`  Descargando: ${family} ${weight} → ${filename}...`);
      const fontRes = await fetch(fontUrl, { headers: { "User-Agent": UA } });
      if (!fontRes.ok) {
        console.error(`    Error: ${fontRes.status}`);
        continue;
      }

      const buffer = Buffer.from(await fontRes.arrayBuffer());
      fs.writeFileSync(filepath, buffer);
      console.log(`    OK (${(buffer.length / 1024).toFixed(1)} KB)`);
      totalDownloaded++;
    }
  }

  console.log(`\n${totalDownloaded} fonts descargadas a assets/fonts/`);

  // Listar archivos finales
  const files = fs.readdirSync(FONTS_DIR).filter((f) => f.endsWith(".woff2"));
  console.log("Archivos:", files);
}

main().catch(console.error);
