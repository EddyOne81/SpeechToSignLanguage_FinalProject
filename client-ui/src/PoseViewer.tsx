import React, { useEffect, useRef } from 'react';

interface PoseViewerProps {
  buffer: {
    frames: number[][][]; 
    fps: number;
  };
}

// ANATOMY CONFIGURATION: Map the edges of your 52-joint model here.
// These pairs represent [StartJointIndex, EndJointIndex].
// Example below is a generic upper-body mapping. You must adjust these indices 
// to match the exact output structure of your specific AI Sign Language model.
const BONE_CONNECTIONS = [
  // --- UPPER BODY (Indices 0 - 9) ---
  [0, 1], // Nose to Neck
  [1, 2], // Neck to Right Shoulder
  [2, 3], // Right Shoulder to Right Elbow
  [3, 4], // Right Elbow to Right Wrist
  [1, 5], // Neck to Left Shoulder
  [5, 6], // Left Shoulder to Left Elbow
  [6, 7], // Left Elbow to Left Wrist
  [1, 8], // Neck to Right Hip
  [1, 9], // Neck to Left Hip
  [8, 9], // Right Hip to Left Hip (Base of torso)

  // --- RIGHT HAND (Indices 10 - 30) ---
  [4, 10],  // Connect Right Body Wrist to Right Hand Base
  // Thumb
  [10, 11], [11, 12], [12, 13], [13, 14],
  // Index Finger
  [10, 15], [15, 16], [16, 17], [17, 18],
  // Middle Finger
  [10, 19], [19, 20], [20, 21], [21, 22],
  // Ring Finger
  [10, 23], [23, 24], [24, 25], [25, 26],
  // Pinky Finger
  [10, 27], [27, 28], [28, 29], [29, 30],

  // --- LEFT HAND (Indices 31 - 51) ---
  [7, 31],  // Connect Left Body Wrist to Left Hand Base
  // Thumb
  [31, 32], [32, 33], [33, 34], [34, 35],
  // Index Finger
  [31, 36], [36, 37], [37, 38], [38, 39],
  // Middle Finger
  [31, 40], [40, 41], [41, 42], [42, 43],
  // Ring Finger
  [31, 44], [44, 45], [45, 46], [46, 47],
  // Pinky Finger
  [31, 48], [48, 49], [49, 50], [50, 51]
];

export default function PoseViewer({ buffer }: PoseViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !buffer?.frames) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const { frames, fps } = buffer;
    const frameInterval = 1000 / (fps || 25);
    
    canvas.width = 1000;
    canvas.height = 1000;

    let currentFrame = 0;
    let lastDrawTime = performance.now();

    const renderLoop = (currentTime: number) => {
      if (currentTime - lastDrawTime >= frameInterval) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const currentData = frames[currentFrame];
        
        if (currentData) {
          // 1. RENDER EDGES (BONES)
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)'; // Transparent Emerald
          ctx.lineWidth = 3;
          ctx.beginPath();
          
          BONE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
            if (startIdx < currentData.length && endIdx < currentData.length) {
              const startJoint = currentData[startIdx];
              const endJoint = currentData[endIdx];
              
              // Validate coordinates
              if (startJoint[0] !== 0 && startJoint[1] !== 0 && endJoint[0] !== 0 && endJoint[1] !== 0) {
                ctx.moveTo(startJoint[0], startJoint[1]);
                ctx.lineTo(endJoint[0], endJoint[1]);
              }
            }
          });
          ctx.stroke();

          // 2. RENDER NODES (JOINTS)
          ctx.fillStyle = '#10b981';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#059669';

          for (let i = 0; i < currentData.length; i++) {
            const x = currentData[i][0];
            const y = currentData[i][1];
            
            if (x === 0 && y === 0) continue;

            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
        
        currentFrame = (currentFrame + 1) % frames.length;
        lastDrawTime = currentTime;
      }
      animationId = requestAnimationFrame(renderLoop);
    };
    
    animationId = requestAnimationFrame(renderLoop);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [buffer]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full object-contain bg-slate-950 rounded-xl"
    />
  );
}