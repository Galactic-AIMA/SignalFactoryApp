import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sf: {
          bg: "#0a0e1a",
          surface: "#111827",
          border: "#1f2937",
          primary: "#a78bfa",
          secondary: "#7dd3fc",
          accent: "#fbbf24",
          text: "#f9fafb",
          muted: "#9ca3af",
        },
        vibration: {
          1: "rgba(255, 200, 50, 0.08)",
          2: "rgba(0, 150, 200, 0.08)",
          3: "rgba(80, 180, 80, 0.08)",
          4: "rgba(255, 150, 100, 0.08)",
          5: "rgba(150, 100, 255, 0.08)",
        },
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        body: ["Space Grotesk", "sans-serif"],
        number: ["Cinzel", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
