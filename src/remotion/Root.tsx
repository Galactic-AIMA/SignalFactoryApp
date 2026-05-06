import { Composition } from "remotion";
import { SignalVideo } from "./SignalVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SignalVideo"
        component={SignalVideo as unknown as React.FC<Record<string, unknown>>}
        durationInFrames={240}
        fps={24}
        width={720}
        height={1280}
        defaultProps={{
          phrase: "¿Ves el 0? El Universo te habla.",
          backgroundSource: "",
          style: "unified",
          textEffect: "fadeIn",
          duration: 10,
          grupo: 1,
          channelName: "TU SEÑAL DE HOY",
          angelNumber: 0,
        }}
      />
    </>
  );
};
