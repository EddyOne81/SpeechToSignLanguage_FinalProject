import React, { useEffect, useRef } from "react";

// Upper body pose connections (MediaPipe Holistic indices 0-32)
const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], // shoulders
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  [11, 23], [12, 24], // torso sides
  [23, 24], // hips
];

// Hand connections (same layout for both hands, 21 points each)
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],          // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],          // index
  [0, 9], [9, 10], [10, 11], [11, 12],     // middle
  [0, 13], [13, 14], [14, 15], [15, 16],   // ring
  [0, 17], [17, 18], [18, 19], [19, 20],   // pinky
  [5, 9], [9, 13], [13, 17],               // palm arch
];

// MediaPipe Holistic combined keypoint layout:
//   pose: 33  (0-32)
//   face: 468 (33-500)
//   left_hand: 21  (501-521)
//   right_hand: 21 (522-542)
const LEFT_HAND_START = 501;
const RIGHT_HAND_START = 522;

interface PoseRendererProps {
  frames: number[][][];
  fps: number;
}

const PoseRenderer: React.FC<PoseRendererProps> = ({ frames, fps }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Detect whether coords are normalised [0,1] or pixel-space.
    // Sample the first frame: if any x/y > 10 assume pixel space.
    const firstFrame = frames[0] ?? [];
    let maxVal = 1;
    for (const pt of firstFrame) {
      if ((pt[0] ?? 0) > maxVal) maxVal = pt[0];
      if ((pt[1] ?? 0) > maxVal) maxVal = pt[1];
    }
    const coordScale = maxVal > 10 ? maxVal : 1;

    const msPerFrame = 1000 / (fps > 0 ? fps : 25);
    let frameIdx = 0;
    let lastTs = 0;
    let rafId: number;

    const draw = (frame: number[][]) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#111827";
      ctx.fillRect(0, 0, w, h);

      const getPoint = (idx: number): [number, number] | null => {
        const p = frame[idx];
        if (!p || p.length < 2) return null;
        // Skip low-confidence keypoints
        if (p.length >= 4 && (p[3] ?? 1) < 0.05) return null;
        return [(p[0] / coordScale) * w, (p[1] / coordScale) * h];
      };

      const drawSegments = (
        connections: [number, number][],
        offset: number,
        lineColor: string,
        dotColor: string,
        lineWidth: number,
      ) => {
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        for (const [a, b] of connections) {
          const pa = getPoint(a + offset);
          const pb = getPoint(b + offset);
          if (!pa || !pb) continue;
          ctx.beginPath();
          ctx.moveTo(pa[0], pa[1]);
          ctx.lineTo(pb[0], pb[1]);
          ctx.stroke();
        }
        ctx.fillStyle = dotColor;
        const drawn = new Set<number>();
        for (const [a, b] of connections) {
          for (const i of [a + offset, b + offset]) {
            if (drawn.has(i)) continue;
            drawn.add(i);
            const p = getPoint(i);
            if (!p) continue;
            ctx.beginPath();
            ctx.arc(p[0], p[1], lineWidth * 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      };

      drawSegments(POSE_CONNECTIONS, 0, "#60a5fa", "#93c5fd", 2.5);
      drawSegments(HAND_CONNECTIONS, LEFT_HAND_START, "#4ade80", "#86efac", 2);
      drawSegments(HAND_CONNECTIONS, RIGHT_HAND_START, "#fb923c", "#fdba74", 2);
    };

    const animate = (ts: number) => {
      if (ts - lastTs >= msPerFrame) {
        const frame = frames[frameIdx];
        if (frame) draw(frame);
        frameIdx = (frameIdx + 1) % frames.length;
        lastTs = ts;
      }
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [frames, fps]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={500}
      className="max-h-full max-w-full"
    />
  );
};

export default PoseRenderer;
