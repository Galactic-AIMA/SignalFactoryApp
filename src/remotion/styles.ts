import type { VideoStyle } from "@/types";

export interface StyleConfig {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  textAlign: "center" | "left" | "right";
  overlayType: "gradient-bottom" | "full" | "none" | "gradient-radial" | "letterbox";
  overlayOpacity: number;
  textPosition: "center" | "center-bottom" | "center-top";
  textShadow: string;
  letterSpacing?: string;
  extraStyles?: React.CSSProperties;
}

export const STYLES: Record<VideoStyle, StyleConfig> = {
  unified: {
    fontFamily: "Playfair Display, serif",
    fontSize: 36,
    fontWeight: 400,
    textAlign: "center",
    overlayType: "gradient-bottom",
    overlayOpacity: 0.55,
    textPosition: "center",
    textShadow: "0 2px 8px rgba(0,0,0,0.6)",
  },
  serene: {
    fontFamily: "Playfair Display, serif",
    fontSize: 32,
    fontWeight: 400,
    textAlign: "center",
    overlayType: "gradient-bottom",
    overlayOpacity: 0.4,
    textPosition: "center-bottom",
    textShadow: "0 2px 12px rgba(0,0,0,0.8)",
  },
  raw: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 28,
    fontWeight: 500,
    textAlign: "center",
    overlayType: "full",
    overlayOpacity: 0.3,
    textPosition: "center",
    textShadow: "0 1px 4px rgba(0,0,0,0.5)",
  },
  minimal: {
    fontFamily: "Inter, sans-serif",
    fontSize: 26,
    fontWeight: 400,
    textAlign: "center",
    overlayType: "none",
    overlayOpacity: 0,
    textPosition: "center",
    textShadow: "0 2px 16px rgba(0,0,0,0.9), 0 0px 4px rgba(0,0,0,0.7)",
  },
  cinematic: {
    fontFamily: "Cinzel, serif",
    fontSize: 24,
    fontWeight: 400,
    textAlign: "center",
    overlayType: "letterbox",
    overlayOpacity: 0.5,
    textPosition: "center",
    textShadow: "0 2px 8px rgba(0,0,0,0.7)",
  },
  bold: {
    fontFamily: "Bebas Neue, sans-serif",
    fontSize: 42,
    fontWeight: 400,
    textAlign: "center",
    overlayType: "gradient-radial",
    overlayOpacity: 0.4,
    textPosition: "center-top",
    textShadow: "0 3px 6px rgba(0,0,0,0.5)",
  },
};

export const VIBRATION_TINTS: Record<number, string> = {
  1: "rgba(255, 200, 50, 0.08)",
  2: "rgba(0, 150, 200, 0.08)",
  3: "rgba(80, 180, 80, 0.08)",
  4: "rgba(255, 150, 100, 0.08)",
  5: "rgba(150, 100, 255, 0.08)",
};

export function getTextTop(position: string): string {
  switch (position) {
    case "center-bottom": return "70%";
    case "center-top": return "30%";
    default: return "50%";
  }
}

export const TYPOGRAPHY_DEFAULTS = {
  fontFamily: "Playfair Display, serif",
  fontSize: 28,
  fontWeight: 400,
};
