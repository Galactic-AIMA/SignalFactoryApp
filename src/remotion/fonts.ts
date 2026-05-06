import { staticFile } from "remotion";

// Fuentes locales en assets/fonts/ — funciona offline durante el render headless
const fontFaces = [
  { family: "Playfair Display", file: "fonts/PlayfairDisplay-Regular.woff2", weight: "400" },
  { family: "Playfair Display", file: "fonts/PlayfairDisplay-Bold.woff2", weight: "700" },
  { family: "Space Grotesk", file: "fonts/SpaceGrotesk-Regular.woff2", weight: "400" },
  { family: "Space Grotesk", file: "fonts/SpaceGrotesk-Medium.woff2", weight: "500" },
  { family: "Space Grotesk", file: "fonts/SpaceGrotesk-SemiBold.woff2", weight: "600" },
  { family: "Cinzel", file: "fonts/Cinzel-Regular.woff2", weight: "400" },
  { family: "Cinzel", file: "fonts/Cinzel-Bold.woff2", weight: "700" },
];

let fontsLoaded = false;

export function ensureFontsLoaded(): void {
  if (fontsLoaded) return;
  for (const font of fontFaces) {
    const url = staticFile(font.file);
    const style = document.createElement("style");
    style.textContent = `
      @font-face {
        font-family: '${font.family}';
        src: url('${url}') format('woff2');
        font-weight: ${font.weight};
        font-style: normal;
        font-display: swap;
      }
    `;
    document.head.appendChild(style);
  }
  fontsLoaded = true;
}
