# SignalFactory

## Qué es
Fábrica automatizada de videos de números angelicales (0-999) para YouTube.
Dos canales: "Tu Señal de Hoy" (ES) + "Your Daily Sign" (EN).

## Setup inicial (primera vez en una máquina nueva)

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env y completar: PEXELS_API_KEY y N8N_WEBHOOK_URL

# 3. Copiar assets pesados (pedir link de Drive a Camilo)
# Pegar carpetas en: assets/backgrounds/ y assets/music/

# 4. Descargar fonts locales
npx tsx scripts/download-fonts.ts

# 5. Inicializar base de datos
npm run db:seed
npm run db:scan   # registra los assets copiados en la DB

# 6. Verificar con un render de prueba
npx tsx scripts/test-render-direct.ts 0 es
# El video aparece en output/es/000.mp4
```

## Bloqueante actual
Resuelto. Pipeline completo configurado: R2 + n8n workflow v1 importado.

## Stack
Next.js 14 + Remotion v4 + SQLite + Pexels API + Audius API + Tailwind CSS

## Comandos
```bash
npm run dev              # Servidor desarrollo (puerto 3000)
npm run build            # Build producción
npm run db:seed          # Seed DB desde CSV
npm run db:reset         # Reset + re-seed
npm run db:scan          # Escanear assets en disco y registrar en DB
npm run remotion:studio  # Remotion Studio

# Scripts útiles
npx tsx scripts/download-fonts.ts     # Descargar Google Fonts localmente
npx tsx scripts/fill-missing-assets.ts # Llenar backgrounds faltantes
npx tsx scripts/reset-assets.ts       # Reset de flags usado_es/usado_en
npx tsx scripts/test-render-direct.ts 0 es  # Render directo (número, idioma)
npx tsx scripts/download-all-audio.ts         # Descargar audios Audius (5 por grupo)
npx tsx scripts/download-all-backgrounds.ts # Descargar backgrounds Pexels (5 por grupo)
npx tsx scripts/test-audius-search.ts       # Diagnóstico búsqueda Audius
```

## APIs externas requeridas
- `PEXELS_API_KEY` — Fondos de video (backgrounds)
- **Audius API** — Pistas de audio (no requiere API key, acceso público)

## Arquitectura de assets
- `assets/backgrounds/grupo-{1-5}/` — Videos de fondo por grupo de vibración
- `assets/music/grupo-{1-5}/` — Pistas de audio por grupo de vibración
- `assets/fonts/` — Google Fonts locales (Playfair Display, Space Grotesk, Cinzel)
- `output/{es,en}/` — Videos renderizados

## Spec
docs/superpowers/specs/2026-04-19-signalfactory-design.md

## Convenciones
- Idioma: español en comentarios y docs
- TypeScript estricto, sin any
- Siempre usar ñ correctamente
- UI: tokens sf-* (bg, surface, border, primary, secondary, accent, text, muted)
- Fonts: Playfair Display (display), Space Grotesk (body), Cinzel (números)
