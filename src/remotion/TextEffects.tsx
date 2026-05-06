import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import type { TextEffect } from "@/types";
import type { StyleConfig } from "./styles";
import { getTextTop, TYPOGRAPHY_DEFAULTS } from "./styles";

export interface TextEffectsProps {
  text: string;
  effect: TextEffect;
  styleConfig: StyleConfig;
  delayFrames?: number;
  textY?: number;
  highlightColor?: string;
  textColor?: string;
  fontWeight?: string | number;
  fontStyle?: "normal" | "italic";
  fontSize?: number;
  fontFamily?: string;
}

const parseTextSegments = (text: string) => {
  const parts = text.split(/(\[[^\]]+\]|\[[^\]]*$)/g);
  return parts.map((part) => {
    if (part.startsWith("[")) {
      const isClosed = part.endsWith("]");
      const rawContent = part.slice(1, isClosed ? -1 : undefined);
      const [content, customColor] = rawContent.split("|");
      return { text: content, styled: true, color: customColor || null };
    }
    return { text: part, styled: false, color: null };
  }).filter(p => p.text.length > 0);
};

const RenderPartialSegments: React.FC<{
  segments: { text: string; styled: boolean; color?: string | null }[];
  visibleCount: number;
  highlightColor?: string;
}> = ({ segments, visibleCount, highlightColor }) => {
  let charsLeft = visibleCount;
  return (
    <>
      {segments.map((seg, i) => {
        if (charsLeft <= 0) return null;
        const textToShow = seg.text.slice(0, charsLeft);
        charsLeft -= seg.text.length;
        if (seg.styled) {
          return (
            <span key={i} style={{ color: seg.color || highlightColor || "#FFD700", fontWeight: 800 }}>
              {textToShow}
            </span>
          );
        }
        return <span key={i}>{textToShow}</span>;
      })}
    </>
  );
};

const RenderFullText: React.FC<{ text: string, highlightColor?: string }> = ({ text, highlightColor }) => {
  const segments = parseTextSegments(text);
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.styled) {
          return (
            <span key={i} style={{ color: seg.color || highlightColor || "#FFD700", fontWeight: 800 }}>
              {seg.text}
            </span>
          );
        }
        return <span key={i}>{seg.text}</span>;
      })}
    </>
  );
};

export const TextEffects: React.FC<TextEffectsProps> = ({
  text,
  effect,
  styleConfig,
  delayFrames = 15,
  textY,
  highlightColor,
  textColor,
  fontWeight,
  fontStyle,
  fontSize,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delayFrames);
  const scaleRatio = width / 1080;

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    top: textY !== undefined ? `${textY}%` : getTextTop(styleConfig.textPosition),
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "85%",
    textAlign: "center",
    fontFamily: fontFamily || TYPOGRAPHY_DEFAULTS.fontFamily,
    fontSize: fontSize || TYPOGRAPHY_DEFAULTS.fontSize,
    fontWeight: fontWeight || TYPOGRAPHY_DEFAULTS.fontWeight,
    fontStyle: fontStyle || "normal",
    color: textColor || "white",
    textShadow: styleConfig.textShadow,
    lineHeight: 1.4,
    whiteSpace: "pre-line",
    zoom: scaleRatio,
    ...styleConfig.extraStyles,
  };

  const commonProps = {
    frame: adjustedFrame,
    fps,
    style: containerStyle,
    text,
    highlightColor,
    textColor
  };

  switch (effect) {
    case "fadeIn":
      return <FadeIn {...commonProps} />;
    case "typewriter":
      return <Typewriter {...commonProps} />;
    case "slideUp":
      return <SlideUp {...commonProps} />;
    case "scaleIn":
      return <ScaleIn {...commonProps} />;
    case "glowPulse":
      return <GlowPulse {...commonProps} baseShadow={styleConfig.textShadow} />;
    default:
      return <FadeIn {...commonProps} />;
  }
};

const FadeIn: React.FC<any> = ({ frame, fps, style, text, highlightColor }) => {
  const opacity = spring({ frame, fps, config: { damping: 200 } });
  return (
    <div style={{ ...style, opacity }}>
      <RenderFullText text={text} highlightColor={highlightColor} />
    </div>
  );
};

const Typewriter: React.FC<any> = ({ frame, style, text, highlightColor }) => {
  const segments = parseTextSegments(text);
  const totalLength = segments.reduce((sum, s) => sum + s.text.length, 0);
  const charsVisible = Math.floor(frame / 1.5);
  const showCursor = charsVisible < totalLength && frame % 8 < 4;
  return (
    <div style={style}>
      <RenderPartialSegments
        segments={segments}
        visibleCount={charsVisible}
        highlightColor={highlightColor}
      />
      {showCursor && (
        <span style={{ opacity: 0.8, fontWeight: 100, marginLeft: 2 }}>|</span>
      )}
    </div>
  );
};

const SlideUp: React.FC<any> = ({ frame, fps, style, text, highlightColor }) => {
  const progress = spring({ frame, fps, config: { damping: 12, mass: 0.5 } });
  const translateY = interpolate(progress, [0, 1], [120, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  return (
    <div style={{ ...style, transform: `translate(-50%, -50%) translateY(${translateY}px)`, opacity }}>
      <RenderFullText text={text} highlightColor={highlightColor} />
    </div>
  );
};

const ScaleIn: React.FC<any> = ({ frame, fps, style, text, highlightColor }) => {
  const progress = spring({ frame, fps, config: { damping: 10, stiffness: 100 } });
  const scale = interpolate(progress, [0, 1], [0.3, 1]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  return (
    <div style={{ ...style, transform: `translate(-50%, -50%) scale(${scale})`, opacity }}>
      <RenderFullText text={text} highlightColor={highlightColor} />
    </div>
  );
};

const GlowPulse: React.FC<any> = ({ frame, fps, style, text, baseShadow, highlightColor }) => {
  const opacity = spring({ frame, fps, config: { damping: 200 } });
  const glowIntensity = interpolate(Math.sin((frame / 30) * Math.PI * 2), [-1, 1], [10, 30]);
  return (
    <div style={{ ...style, opacity, textShadow: `${baseShadow}, 0 0 ${glowIntensity}px rgba(255,255,255,0.5)` }}>
      <RenderFullText text={text} highlightColor={highlightColor} />
    </div>
  );
};
