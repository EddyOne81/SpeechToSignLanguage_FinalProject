import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  FileText,
  Loader2,
  Mic,
  PlayCircle,
  Square,
  UploadCloud,
} from "lucide-react";
import PoseViewer from "./PoseViewer";

type PoseBuffer = {
  frames: number[][][];
  fps: number;
  sourceUrl?: string;
};

type RuleDebugPayload = {
  source?: string;
  endpoint?: string;
  frame_count?: number;
  point_count?: number;
  [key: string]: unknown;
};

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8080";

const extractPayloadFromApiResponse = (body: any) => {
  if (body?.data?.recognized_text_en) {
    return body.data;
  }

  if (body?.data?.data?.recognized_text_en) {
    return body.data.data;
  }

  if (body?.recognized_text_en) {
    return body;
  }

  return null;
};

const extractErrorMessage = (body: any) => {
  if (!body) {
    return "Server connection failed.";
  }

  return (
    body.message || body.detail || body.error || "Server connection failed."
  );
};

export default function SignLanguageUI() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [inputText, setInputText] = useState<string>("Hello");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  const [transcript, setTranscript] = useState<string>("");
  const [fswCode, setFswCode] = useState<string>("");
  const [poseBuffer, setPoseBuffer] = useState<PoseBuffer | null>(null);
  const [ruleDebug, setRuleDebug] = useState<RuleDebugPayload | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setAudioFile(event.target.files[0]);
      setErrorMsg(null);
    }
  };

  const startRecording = async () => {
    try {
      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        const file = new File([audioBlob], "recorded_audio.webm", {
          type: "audio/webm",
        });
        setAudioFile(file);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("[System] Microphone access error:", err);
      setErrorMsg(
        "Khong the truy cap microphone. Vui long cap quyen trong cai dat trinh duyet.",
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const applyTranslationResult = (data: any) => {
    const {
      recognized_text_en,
      fsw_code,
      pose_coordinates,
      pose_source_url,
      fps,
      rule_debug,
    } = data;

    setTranscript(recognized_text_en);
    setFswCode(fsw_code ?? "");
    setPoseBuffer({
      frames: pose_coordinates,
      fps,
      sourceUrl: pose_source_url,
    });
    setRuleDebug(rule_debug ?? null);

    console.log(
      `[System] Received ${pose_coordinates.length} JSON animation frames.`,
    );
  };

  const startTextTranslation = async () => {
    const text = inputText.trim();
    if (!text) {
      setErrorMsg("Vui long nhap text truoc khi dich.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setTranscript("");
    setFswCode("");
    setPoseBuffer(null);
    setRuleDebug(null);

    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/translate/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          spoken_lang: "en",
          signed_lang: "ase",
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(extractErrorMessage(errData));
      }

      const result = await response.json();
      const payload = extractPayloadFromApiResponse(result);
      if (!payload) {
        throw new Error("Unexpected response payload from backend.");
      }

      applyTranslationResult(payload);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Da xay ra loi khong xac dinh.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startTranslation = async () => {
    if (!audioFile) {
      setErrorMsg("Vui long tai len tep am thanh hoac ghi am truc tiep.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setTranscript("");
    setFswCode("");
    setPoseBuffer(null);
    setRuleDebug(null);

    try {
      const formData = new FormData();
      formData.append("file", audioFile);

      const response = await fetch(
        `${BACKEND_BASE_URL}/api/translate/audio?spoken=en&signed=ase`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(extractErrorMessage(errData));
      }

      const result = await response.json();
      const payload = extractPayloadFromApiResponse(result);
      if (!payload) {
        throw new Error("Unexpected response payload from backend.");
      }

      applyTranslationResult(payload);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Da xay ra loi khong xac dinh.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen w-full text-slate-200">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/70 px-5 py-4 shadow-xl shadow-slate-950/30 backdrop-blur sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              S2S - Speech 2 Sign
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Speech-to-Sign Language Conversion System
            </p>
          </div>
          <div className="flex items-center space-x-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>API Gateway: Online</span>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="flex min-h-0 flex-col gap-6 xl:col-span-5">
            <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
              <h3 className="mb-4 flex items-center text-sm font-semibold text-slate-300">
                <span className="mr-2 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  Step 1
                </span>
                Input Source
              </h3>

              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                    Quick Text Input
                  </p>
                  <textarea
                    value={inputText}
                    onChange={(event) => setInputText(event.target.value)}
                    placeholder="Type English text. Example: Hello"
                    className="h-20 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    onClick={startTextTranslation}
                    disabled={isProcessing || !inputText.trim()}
                    className={`mt-3 flex w-full items-center justify-center rounded-lg py-2.5 font-medium text-white transition-all ${isProcessing || !inputText.trim() ? "cursor-not-allowed bg-slate-800 text-slate-500" : "bg-emerald-600 hover:bg-emerald-500"}`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Translating Text...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Translate From Text
                      </>
                    )}
                  </button>
                </div>

                <label
                  className={`flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 transition-all ${audioFile && !audioFile.name.includes("recorded_audio") ? "border-emerald-500 bg-emerald-500/5" : "border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/50"}`}
                >
                  <div className="flex flex-col items-center justify-center px-4 pt-5 pb-6 text-center">
                    <UploadCloud
                      className={`mb-2 h-7 w-7 ${audioFile && !audioFile.name.includes("recorded_audio") ? "text-emerald-400" : "text-slate-400"}`}
                    />
                    {audioFile && !audioFile.name.includes("recorded_audio") ? (
                      <p className="max-w-full break-all text-sm font-medium text-emerald-400">
                        {audioFile.name}
                      </p>
                    ) : (
                      <>
                        <p className="text-sm text-slate-400">
                          <span className="font-semibold text-emerald-400">
                            Click to upload
                          </span>{" "}
                          or drag and drop
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          .wav, .mp3, .m4a, .webm
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="audio/*"
                    onChange={handleFileChange}
                  />
                </label>

                <div className="flex items-center text-xs font-semibold uppercase text-slate-500">
                  <div className="flex-1 border-b border-slate-800"></div>
                  <span className="mx-4">AUDIO</span>
                  <div className="flex-1 border-b border-slate-800"></div>
                </div>

                <div
                  className={`flex flex-col gap-4 rounded-xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${isRecording ? "border-rose-500/50 bg-rose-500/5" : audioFile && audioFile.name.includes("recorded_audio") ? "border-emerald-500 bg-emerald-500/5" : "border-slate-800 bg-slate-950/50"}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-full p-2 ${isRecording ? "animate-pulse bg-rose-500/20 text-rose-500" : "bg-slate-800 text-slate-400"}`}
                    >
                      <Mic className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-200">
                        {isRecording
                          ? "Dang ghi am..."
                          : audioFile && audioFile.name.includes("recorded_audio")
                            ? "Da ghi am xong"
                            : "Ghi am truc tiep"}
                      </span>
                      <span
                        className={`font-mono text-xs ${isRecording ? "text-rose-400" : "text-slate-500"}`}
                      >
                        {formatTime(recordingTime)}
                      </span>
                    </div>
                  </div>

                  {isRecording ? (
                    <button
                      onClick={stopRecording}
                      className="flex items-center justify-center rounded-lg bg-rose-500 p-2 text-white transition-colors hover:bg-rose-600"
                    >
                      <Square className="mr-1.5 h-4 w-4 fill-current" />
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={startRecording}
                      className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
                    >
                      Start
                    </button>
                  )}
                </div>
              </div>

              {errorMsg && (
                <div className="mt-4 flex items-center rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs text-rose-400">
                  <AlertCircle className="mr-2 h-4 w-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <div className="mt-auto pt-4">
                <button
                  onClick={startTranslation}
                  disabled={isProcessing || !audioFile || isRecording}
                  className={`flex w-full items-center justify-center rounded-xl py-3 font-medium text-white shadow-lg transition-all ${isProcessing || !audioFile || isRecording ? "cursor-not-allowed bg-slate-800 text-slate-500" : "bg-emerald-600 shadow-emerald-900/20 hover:bg-emerald-500"}`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      In progress: AI translation...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="mr-2 h-5 w-5" />
                      Start the transformation
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex min-h-[220px] flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
              <h3 className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-300">
                <div className="flex items-center">
                  <span className="mr-2 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                    Step 2
                  </span>
                  English text
                </div>
              </h3>
              <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800/50 bg-slate-950 p-4 font-medium leading-relaxed text-slate-300">
                {transcript ? (
                  <div className="mb-2 flex items-start">
                    <FileText className="mt-1 mr-2 h-4 w-4 shrink-0 text-emerald-500" />
                    <p>{transcript}</p>
                  </div>
                ) : (
                  <p className="flex h-full items-center justify-center text-sm italic text-slate-600">
                    Wait for a response from the server...
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col xl:col-span-7">
            <div className="relative flex min-h-[640px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg">
              <div className="z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/50 p-4">
                <h2 className="flex items-center text-sm font-semibold text-emerald-400">
                  <span className="mr-2 rounded border border-emerald-500/20 bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                    Step 3
                  </span>
                  Graphics Rendering (Skeletal Animation)
                </h2>
              </div>

              <div className="flex flex-1 flex-col bg-gradient-to-b from-slate-900 to-slate-950 p-4 sm:p-6">
                <div className="group relative mb-4 min-h-[120px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="absolute top-2 right-2 rounded bg-slate-800 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400">
                    Pose Source
                  </div>
                  <p className="break-all font-mono text-xs leading-relaxed text-emerald-500/80">
                    {fswCode ||
                      "FSW parser is disabled. Rendering from Sign-MT pose API payload."}
                  </p>
                </div>

                <div className="group relative mb-4 min-h-[180px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="absolute top-2 right-2 rounded bg-slate-800 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400">
                    Rule Debug
                  </div>
                  {ruleDebug ? (
                    <div className="space-y-2 text-xs text-slate-300">
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <div className="rounded border border-slate-800 bg-slate-900 px-2 py-1">
                          Source:{" "}
                          <span className="font-semibold text-emerald-400">
                            {ruleDebug.source ?? "sign-mt-cloud"}
                          </span>
                        </div>
                        <div className="rounded border border-slate-800 bg-slate-900 px-2 py-1">
                          Frame Count:{" "}
                          <span className="font-semibold text-emerald-400">
                            {ruleDebug.frame_count ??
                              poseBuffer?.frames.length ??
                              0}
                          </span>
                        </div>
                        <div className="rounded border border-slate-800 bg-slate-900 px-2 py-1 md:col-span-2">
                          Endpoint:{" "}
                          <span className="font-semibold text-emerald-400">
                            {String(ruleDebug.endpoint ?? "N/A")}
                          </span>
                        </div>
                      </div>
                      <pre className="whitespace-pre-wrap break-all rounded border border-slate-800 bg-slate-900 p-2 text-[11px] leading-relaxed text-cyan-300/90">
                        {JSON.stringify(ruleDebug, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">
                      Waiting for rule-debug JSON payload from server...
                    </p>
                  )}
                </div>

                <div className="relative flex min-h-[360px] flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-black p-2">
                  {poseBuffer ? (
                    <PoseViewer buffer={poseBuffer} />
                  ) : (
                    <p className="text-sm text-slate-600">
                      2D/3D Canvas Display Space
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
