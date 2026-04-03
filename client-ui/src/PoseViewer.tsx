import React, { useEffect, useRef, useState } from 'react';

interface PoseViewerProps {
  buffer: { frames: number[][][]; fps: number; } | null;
}

const PoseViewer: React.FC<PoseViewerProps> = ({ buffer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef<number>(0);
  const lastDrawTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!buffer || !buffer.frames || buffer.frames.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1000;
    canvas.height = 700;
    const fpsInterval = 1000 / buffer.fps;
    let frameIdx = 0;
    const totalFrames = buffer.frames.length;

    const THEME = {
      bg: '#111827',        // Màu nền
      body: '#E50000',      
      head: '#E50000',      
      thumb: '#FF9900',     
      index: '#00FF00',     
      middle: '#0066FF',    
      ring: '#FF00FF',      
      pinky: '#FF3399',     
      lineWidth: 6          
    };

    const drawLine = (p1: number[], p2: number[], color: string, width: number) => {
      if (!p1 || !p2 || p1.length < 2 || p2.length < 2 || p1[0] === 0 || p2[0] === 0) return;
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    };

    const drawHand = (wristIndex: number, handStartIndex: number) => {
      const pose = buffer.frames[frameIdx]; 
      if (!pose) return;

      const wrist = pose[wristIndex];
      const fingerColors = [THEME.thumb, THEME.index, THEME.middle, THEME.ring, THEME.pinky];
      const knuckles = [];
      for (let f = 0; f < 5; f++) { knuckles.push(pose[handStartIndex + f * 4]); }

      // 1. VẼ KHỐI LÒNG BÀN TAY ĐẶC (Che đi các đường gân)
      if (wrist[0] !== 0 && knuckles[0][0] !== 0) {
        ctx.beginPath();
        ctx.moveTo(wrist[0], wrist[1]);
        for (let f = 0; f < 5; f++) {
          ctx.lineTo(knuckles[f][0], knuckles[f][1]);
        }
        ctx.closePath();
        ctx.fillStyle = THEME.body;
        ctx.fill(); 
        ctx.strokeStyle = THEME.body;
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // 2. VẼ NGÓN TAY
      for (let f = 0; f < 5; f++) {
        const color = fingerColors[f];
        const base = handStartIndex + f * 4;
        drawLine(pose[base], pose[base+1], color, 5);
        drawLine(pose[base+1], pose[base+2], color, 5);
        drawLine(pose[base+2], pose[base+3], color, 5);
      }
    };

    const drawFace = (pose: number[][]) => {
      if (!pose || pose.length < 52) return;
      const nose = pose[0];
      const neck = pose[1];
      if (!nose || !neck || nose[0] === 0) return;
      
      const headHeight = Math.abs(neck[1] - nose[1]) * 1.6; 
      const headWidth = headHeight * 0.7;
      const centerY = nose[1] - headHeight * 0.15;

      // ❗ SỬA LỖI MẶT XIÊN: Đổ màu nền đen che đi đường kẻ của Cổ
      ctx.beginPath();
      ctx.ellipse(nose[0], centerY, headWidth / 2, headHeight / 2, 0, 0, 2 * Math.PI);
      ctx.fillStyle = THEME.bg; // Màu đen nền
      ctx.fill();               // Đổ nền trước
      ctx.strokeStyle = THEME.head;
      ctx.lineWidth = THEME.lineWidth;
      ctx.stroke();             // Viền đỏ sau

      // Mắt nhắm hờ
      const eyeOffset = headWidth * 0.2;
      const eyeY = centerY - headHeight * 0.05;
      ctx.beginPath(); ctx.arc(nose[0] - eyeOffset, eyeY, 4, 0, Math.PI, true); ctx.stroke();
      ctx.beginPath(); ctx.arc(nose[0] + eyeOffset, eyeY, 4, 0, Math.PI, true); ctx.stroke();

      // Môi
      const mouthY = nose[1] + headHeight * 0.1;
      drawLine([nose[0] - 8, mouthY], [nose[0] + 8, mouthY], THEME.head, 3);
    };

    const renderFrame = (timestamp: number) => {
      if (!lastDrawTimeRef.current) lastDrawTimeRef.current = timestamp;
      const elapsed = timestamp - lastDrawTimeRef.current;

      if (elapsed > fpsInterval) {
        lastDrawTimeRef.current = timestamp - (elapsed % fpsInterval);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = THEME.bg; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const pose = buffer.frames[frameIdx]; 

        if (pose && pose.length >= 52) {
          // Vẽ Cổ (Sẽ bị vẽ đè một phần bởi khuôn mặt ở bước sau)
          drawLine(pose[1], pose[0], THEME.body, THEME.lineWidth); 

          // Thân mình
          ctx.beginPath();
          ctx.moveTo(pose[2][0], pose[2][1]); 
          ctx.lineTo(pose[5][0], pose[5][1]); 
          ctx.lineTo(pose[9][0], pose[9][1]); 
          ctx.lineTo(pose[8][0], pose[8][1]); 
          ctx.closePath();
          ctx.strokeStyle = THEME.body;
          ctx.lineWidth = THEME.lineWidth;
          ctx.stroke();

          // Cánh tay
          drawLine(pose[2], pose[3], THEME.body, THEME.lineWidth); 
          drawLine(pose[3], pose[4], THEME.body, THEME.lineWidth); 
          drawLine(pose[5], pose[6], THEME.body, THEME.lineWidth); 
          drawLine(pose[6], pose[7], THEME.body, THEME.lineWidth); 

          drawFace(pose); // Vẽ mặt lên trên cùng để đè lên cổ
          drawHand(4, 10);  
          drawHand(7, 31);  
        }

        setCurrentFrame(frameIdx + 1);
        frameIdx = (frameIdx + 1) % totalFrames;
      }
      animationRef.current = requestAnimationFrame(renderFrame);
    };

    animationRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [buffer]);

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-gray-900 rounded-xl overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full object-contain" />
      {buffer && (
        <div className="absolute bottom-4 right-4 bg-slate-800/80 text-emerald-400 font-mono text-xs px-3 py-1.5 rounded border border-slate-700 backdrop-blur-sm z-10">
          Frame: {currentFrame} / {buffer.frames.length} | {buffer.fps} FPS
        </div>
      )}
    </div>
  );
};
export default PoseViewer;