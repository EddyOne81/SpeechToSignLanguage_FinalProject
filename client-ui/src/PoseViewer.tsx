import React, { useEffect, useRef, useState } from "react";

let poseViewerRegistered = false;

interface PoseViewerProps {
  buffer: { frames: number[][][]; fps: number; sourceUrl?: string } | null;
}

const PoseViewer: React.FC<PoseViewerProps> = ({ buffer }) => {
  const poseElementRef = useRef<HTMLElement | null>(null);
  const [poseError, setPoseError] = useState(false);

  useEffect(() => {
    setPoseError(false);
  }, [buffer?.sourceUrl]);

  const poseViewerNode = buffer?.sourceUrl
    ? React.createElement("pose-viewer", {
        ref: poseElementRef,
        className: "pose-viewer-fit w-full h-full",
        src: buffer.sourceUrl,
        renderer: "canvas",
        autoplay: "true",
        loop: "true",
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
    poseElement.setAttribute("thickness", "2");

    const handleError = () => setPoseError(true);
    poseElement.addEventListener("error", handleError);
    return () => poseElement.removeEventListener("error", handleError);
  }, [buffer?.sourceUrl]);

  return (
    <div className="relative flex h-full min-h-[320px] w-full min-w-0 items-center justify-center overflow-hidden rounded-xl bg-gray-900">
      {buffer?.sourceUrl && !poseError ? (
        <div className="pose-viewer-stage flex min-w-0 items-center justify-center px-2 py-3 sm:px-3 sm:py-4">
          <div className="h-full w-full">{poseViewerNode}</div>
        </div>
      ) : poseError ? (
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <p className="text-sm text-slate-400">Animation unavailable for this phrase.</p>
          <p className="text-xs text-slate-600">The sign language pose data could not be loaded.</p>
        </div>
      ) : (
        <div className="text-slate-500 text-sm">
          Missing pose source URL for pose-viewer.
        </div>
      )}
    </div>
  );
};
export default PoseViewer;
