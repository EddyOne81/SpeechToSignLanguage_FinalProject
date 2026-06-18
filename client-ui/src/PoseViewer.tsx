import React from "react";
import PoseRenderer from "./PoseRenderer";

interface PoseViewerProps {
  buffer: { frames: number[][][]; fps: number; sourceUrl?: string } | null;
}

const PoseViewer: React.FC<PoseViewerProps> = ({ buffer }) => {
  const hasFrames = (buffer?.frames?.length ?? 0) > 0;

  return (
    <div className="relative flex h-full min-h-[320px] w-full min-w-0 items-center justify-center overflow-hidden rounded-xl bg-gray-900">
      {hasFrames ? (
        <PoseRenderer frames={buffer!.frames} fps={buffer!.fps} />
      ) : (
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <p className="text-sm text-slate-400">Animation unavailable for this phrase.</p>
          <p className="text-xs text-slate-600">The sign language pose data could not be loaded.</p>
        </div>
      )}
    </div>
  );
};

export default PoseViewer;
