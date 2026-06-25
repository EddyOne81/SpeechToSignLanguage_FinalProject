// Converts a recorded audio blob (typically webm/opus from MediaRecorder) into a
// clean 16 kHz mono 16-bit PCM WAV blob.
//
// Why: MediaRecorder produces webm files whose header often lacks duration/seek
// metadata. Groq Whisper then decodes them as (near) silence and hallucinates a
// generic token like "You" regardless of what was actually spoken. Re-encoding
// to WAV in the browser (which can always decode its own recording) yields a
// format Whisper reliably transcribes, and at 16 kHz mono it is also much
// smaller, so the upload is faster.

const TARGET_SAMPLE_RATE = 16000;

export async function recordedBlobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();

  // Decode the compressed recording into raw PCM samples.
  const AudioCtx: typeof AudioContext =
    window.AudioContext ?? (window as any).webkitAudioContext;
  const decodeCtx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    void decodeCtx.close();
  }

  // Resample to 16 kHz mono using an offline context.
  const offline = new OfflineAudioContext(
    1,
    Math.ceil(decoded.duration * TARGET_SAMPLE_RATE),
    TARGET_SAMPLE_RATE,
  );
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();

  const channel = rendered.getChannelData(0);

  // Measure how loud the capture actually is. A blank/muted microphone (wrong
  // input device, OS-level mute, denied-then-allowed permission) produces near
  // silence, and Groq Whisper then hallucinates a generic token like "You" no
  // matter what was spoken. Detect that up front so the caller can tell the
  // user instead of silently translating garbage.
  let peak = 0;
  let sumSquares = 0;
  for (let i = 0; i < channel.length; i++) {
    const abs = Math.abs(channel[i]);
    if (abs > peak) peak = abs;
    sumSquares += channel[i] * channel[i];
  }
  const rms = Math.sqrt(sumSquares / Math.max(1, channel.length));
  if (peak < 0.01 || rms < 0.0008) {
    throw new Error("SILENT_AUDIO");
  }

  // Normalize quiet recordings toward full scale so a soft-spoken or low-gain
  // microphone still gives Whisper a clearly audible signal. Capped so we don't
  // blow faint background noise up into its own hallucinations.
  const gain = peak < 0.7 ? Math.min(0.95 / peak, 12) : 1;

  return encodeWav(channel, TARGET_SAMPLE_RATE, gain);
}

function encodeWav(samples: Float32Array, sampleRate: number, gain = 1): Blob {
  const bytesPerSample = 2; // 16-bit
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  const dataSize = samples.length * bytesPerSample;
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // audio format = PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Apply gain, clamp, and write 16-bit PCM little-endian.
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] * gain));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += bytesPerSample;
  }

  return new Blob([buffer], { type: "audio/wav" });
}
