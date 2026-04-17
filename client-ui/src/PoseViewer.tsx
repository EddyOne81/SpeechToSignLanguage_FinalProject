import React, { useEffect, useRef } from "react";

let poseViewerRegistered = false;

interface PoseViewerProps {
  buffer: { frames: number[][][]; fps: number; sourceUrl?: string } | null;
}

const PoseViewer: React.FC<PoseViewerProps> = ({ buffer }) => {
  const poseElementRef = useRef<HTMLElement | null>(null);

  const poseViewerNode = buffer?.sourceUrl
    ? React.createElement("pose-viewer", {
        ref: poseElementRef,
        className: "w-full h-full",
        src: buffer.sourceUrl,
        renderer: "canvas",
        autoplay: "true",
        loop: "true",
        width: "100%",
        "aspect-ratio": "1",
        thickness: "2",
        background: "#111827",
      })
    : null;

  useEffect(() => {
    const registerPoseViewer = async () => {
      if (poseViewerRegistered) {
        return;
      }

      const { defineCustomElements } = await import("pose-viewer/loader");
      defineCustomElements();
      poseViewerRegistered = true;
    };

    void registerPoseViewer();
  }, []);

  useEffect(() => {
    const poseElement = poseElementRef.current;
    if (!poseElement || !buffer?.sourceUrl) {
      return;
    }

    poseElement.setAttribute("src", buffer.sourceUrl);
    poseElement.setAttribute("renderer", "canvas");
    poseElement.setAttribute("autoplay", "true");
    poseElement.setAttribute("loop", "true");
    poseElement.setAttribute("background", "#111827");
    poseElement.setAttribute("width", "100%");
    poseElement.setAttribute("aspect-ratio", "1");
    poseElement.setAttribute("thickness", "2");
  }, [buffer?.sourceUrl]);

  return (
    <div className="relative flex h-full min-h-[320px] w-full items-center justify-center overflow-hidden rounded-xl bg-gray-900">
      {buffer?.sourceUrl ? (
        <div className="flex h-full w-full items-center justify-center px-2 py-4 sm:px-4 sm:py-6">
          {poseViewerNode}
        </div>
      ) : (
        <div className="text-slate-500 text-sm">
          Missing pose source URL for pose-viewer.
        </div>
      )}
      {buffer?.sourceUrl && (
        <div className="absolute bottom-4 right-4 bg-slate-800/80 text-emerald-400 font-mono text-xs px-3 py-1.5 rounded border border-slate-700 backdrop-blur-sm z-10">
          pose-viewer | {buffer.frames.length} frames |{" "}
          {Number.isFinite(buffer.fps) && buffer.fps > 0 ? buffer.fps : 25} FPS
        </div>
      )}
    </div>
  );
};
export default PoseViewer;
