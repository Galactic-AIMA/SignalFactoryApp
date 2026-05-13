import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design system propio del proyecto
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
        // Tokens de shadcn/ui (mapean a CSS variables)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
