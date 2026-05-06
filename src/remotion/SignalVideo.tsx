import {
  AbsoluteFill,
  OffthreadVideo,
  Audio,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  staticFile,
} from "remotion";
import type { SignalVideoProps } from "@/types";
import { STYLES, VIBRATION_TINTS } from "./styles";
import { ensureFontsLoaded } from "./fonts";

export const SignalVideo: React.FC<SignalVideoProps> = ({
  phrase,
  backgroundSource,
  style = "unified",
  duration,
  musicSource,
  musicVolume = 0.3,
  grupo,
  channelName,
  angelNumber,
}) => {
  ensureFontsLoaded();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const styleConfig = STYLES[style];
  const tint = VIBRATION_TINTS[grupo] || "transparent";

  // Resolver assets via staticFile (paths relativos al publicDir = assets/)
  const bgSrc = backgroundSource ? staticFile(backgroundSource) : "";
  const audioSrc = musicSource ? staticFile(musicSource) : undefined;

  // Ken Burns: zoom lento 1.0 → 1.05
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.05]);

  // Fade-out global últimos 40 frames
  const globalOpacity = interpolate(
    frame,
    [durationInFrames - 40, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Respiro visual: primeros 30 frames sin texto
  const BREATH_FRAMES = 30;

  // Texto principal: fadeIn después del respiro
  const textOpacity = interpolate(
    frame,
    [BREATH_FRAMES, BREATH_FRAMES + 30],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Separador: aparece en frame 60-80
  const separatorWidth = interpolate(
    frame,
    [60, 80],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Marca del canal: fadeIn en frame 80-100
  const brandOpacity = interpolate(
    frame,
    [80, 100],
    [0, 0.7],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Número decorativo: fadeIn en frame 100-120
  const numberOpacity = interpolate(
    frame,
    [100, 120],
    [0, 0.4],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ opacity: globalOpacity }}>
      {/* Fondo de video con Ken Burns */}
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <OffthreadVideo
          src={bgSrc}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      {/* Overlay gradiente oscuro */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, rgba(0,0,0,${styleConfig.overlayOpacity}) 0%, rgba(0,0,0,0.1) 100%)`,
        }}
      />

      {/* Tinte de vibración por grupo */}
      <AbsoluteFill style={{ backgroundColor: tint }} />

      {/* Audio */}
      {audioSrc && (
        <Audio
          src={audioSrc}
          volume={(f) => {
            const fadeIn = interpolate(f, [0, 15], [0, musicVolume], {
              extrapolateRight: "clamp",
            });
            const fadeOut = interpolate(
              f,
              [durationInFrames - 45, durationInFrames],
              [musicVolume, 0],
              { extrapolateLeft: "clamp" }
            );
            return Math.min(fadeIn, fadeOut);
          }}
        />
      )}

      {/* Contenido textual */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "60px 40px",
        }}
      >
        {/* Texto principal — salto de línea después del "?" */}
        <div
          style={{
            opacity: textOpacity,
            fontFamily: styleConfig.fontFamily,
            fontSize: styleConfig.fontSize,
            fontWeight: styleConfig.fontWeight,
            color: "#FFFFFF",
            textAlign: "center",
            textShadow: styleConfig.textShadow,
            lineHeight: 1.6,
            maxWidth: "90%",
          }}
        >
          {(() => {
            const qIndex = phrase.indexOf("?");
            if (qIndex === -1) return phrase;
            const firstLine = phrase.slice(0, qIndex + 1);
            const rest = phrase.slice(qIndex + 1).trim();
            return (
              <>
                <span style={{ fontSize: styleConfig.fontSize * 1.15 }}>{firstLine}</span>
                {rest && <><br /><br />{rest}</>}
              </>
            );
          })()}
        </div>

        {/* Separador */}
        <div
          style={{
            width: `${separatorWidth}%`,
            maxWidth: "60%",
            height: 1,
            backgroundColor: "rgba(255,255,255,0.3)",
            marginTop: 30,
            marginBottom: 20,
          }}
        />

        {/* Marca del canal */}
        <div
          style={{
            opacity: brandOpacity,
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: 14,
            color: "#FFFFFF",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          {channelName}
        </div>

        {/* Separador inferior */}
        <div
          style={{
            width: `${separatorWidth * 0.4}%`,
            maxWidth: "25%",
            height: 1,
            backgroundColor: "rgba(255,255,255,0.2)",
            marginTop: 15,
            marginBottom: 20,
          }}
        />

        {/* Número decorativo */}
        <div
          style={{
            opacity: numberOpacity,
            fontFamily: "Cinzel, serif",
            fontSize: 72,
            color: "#FFFFFF",
          }}
        >
          {angelNumber}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
