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
    <div className="w-full h-full relative flex items-center justify-center bg-gray-900 rounded-xl overflow-hidden">
      {buffer?.sourceUrl ? (
        <div className="w-full h-full flex items-center justify-center transform-gpu -translate-y-[14%] scale-[1.08]">
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
