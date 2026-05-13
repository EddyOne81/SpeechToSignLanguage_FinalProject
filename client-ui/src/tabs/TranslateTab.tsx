import React from "react";
import {
  AlertCircle,
  Loader2,
  Mic,
  PlayCircle,
  Square,
  UploadCloud,
} from "lucide-react";
import PoseViewer from "../PoseViewer";
import { formatTime } from "../utils/format";
import type { PoseBuffer, InputModeType, LangType } from "../types";

interface TranslateTabProps {
  inputMode: InputModeType;
  setInputMode: (mode: InputModeType) => void;
  inputText: string;
  setInputText: (text: string) => void;
  inputLang: LangType;
  setInputLang: (lang: LangType) => void;
  audioFile: File | null;
  isProcessing: boolean;
  errorMsg: string | null;
  isRecording: boolean;
  recordingTime: number;
  poseBuffer: PoseBuffer | null;
  transcript: string;
  isOfflineMode: boolean;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  startTextTranslation: (overrideText?: string) => Promise<void>;
  startTranslation: () => Promise<void>;
}

export default function TranslateTab({
  inputMode,
  setInputMode,
  inputText,
  setInputText,
  inputLang,
  setInputLang,
  audioFile,
  isProcessing,
  errorMsg,
  isRecording,
  recordingTime,
  poseBuffer,
  transcript,
  isOfflineMode,
  handleFileChange,
  startRecording,
  stopRecording,
  startTextTranslation,
  startTranslation,
}: TranslateTabProps) {
  return (
    <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-12">
      <div className="flex min-h-0 min-w-0 flex-col gap-4 xl:col-span-4">
        <div className="glass-panel flex flex-col rounded-3xl p-5">
          <h3 className="mb-4 text-sm font-semibold ">Input Source</h3>

          <div className="mb-4 flex gap-2 rounded-full bg-slate-900/50 p-1 shadow-inner shadow-slate-950/30">
            <button
              onClick={() => setInputMode("text")}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${inputMode === "text" ? "bg-violet-500/25 text-violet-100 shadow" : "text-slate-300 hover:text-slate-100"}`}>
              Text
            </button>
            <button
              onClick={() => setInputMode("upload")}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${inputMode === "upload" ? "bg-violet-500/25 text-violet-100 shadow" : "text-slate-300 hover:text-slate-100"}`}>
              Upload
            </button>
            <button
              onClick={() => setInputMode("record")}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${inputMode === "record" ? "bg-violet-500/25 text-violet-100 shadow" : "text-slate-300 hover:text-slate-100"}`}>
              Record
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {inputMode === "text" && (
              <div className="glass-inset rounded-xl p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Quick Text Input
                  </p>
                  <div className="flex gap-1 rounded-full bg-slate-900/60 p-0.5">
                    <button
                      onClick={() => setInputLang("en")}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all ${inputLang === "en" ? "bg-violet-500/30 text-violet-100 shadow" : "text-slate-400 hover:text-slate-200"}`}>
                      EN
                    </button>
                    <button
                      onClick={() => setInputLang("vi")}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all ${inputLang === "vi" ? "bg-violet-500/30 text-violet-100 shadow" : "text-slate-400 hover:text-slate-200"}`}>
                      VI
                    </button>
                  </div>
                </div>
                <textarea
                  value={inputText}
                  onChange={(event) => setInputText(event.target.value)}
                  placeholder={inputLang === "vi" ? "Nhập văn bản tiếng Việt. Ví dụ: Xin chào" : "Type English text. Example: Hello"}
                  className="ui-input h-24 w-full rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={() => startTextTranslation()}
                  disabled={isProcessing || !inputText.trim()}
                  className={`mt-3 flex w-full items-center justify-center rounded-lg py-2.5 font-medium text-white transition-all ${isProcessing || !inputText.trim() ? "cursor-not-allowed bg-slate-700/80 text-slate-400" : "ui-btn-primary"}`}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Translating Text...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Start
                    </>
                  )}
                </button>
              </div>
            )}

            {inputMode === "upload" && (
              <div className="glass-inset rounded-xl p-3 shadow-sm">
                <label
                  className={`flex h-36 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 transition-all ${audioFile && !audioFile.name.includes("recorded_audio") ? "border-pink-400/55 bg-pink-400/12" : "border-dashed border-slate-500/35 hover:border-pink-400/55 hover:bg-slate-800/55"}`}>
                  <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
                    <UploadCloud
                      className={`mb-2 h-7 w-7 ${audioFile && !audioFile.name.includes("recorded_audio") ? "text-orange-300" : "text-slate-400"}`}
                    />
                    {audioFile &&
                    !audioFile.name.includes("recorded_audio") ? (
                      <p className="max-w-full break-all text-sm font-medium text-orange-300">
                        {audioFile.name}
                      </p>
                    ) : (
                      <>
                        <p className="text-sm text-slate-400">
                          <span className="font-semibold text-orange-300">
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
              </div>
            )}

            {inputMode === "record" && (
              <div
                className={`glass-inset flex flex-col gap-4 rounded-xl border p-4 shadow-sm transition-all sm:flex-row sm:items-center sm:justify-between ${isRecording ? "border-rose-400/60 bg-rose-400/10" : audioFile && audioFile.name.includes("recorded_audio") ? "border-pink-400/55 bg-pink-400/12" : "border-slate-500/25"}`}>
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-full p-2 ${isRecording ? "animate-pulse bg-rose-500/20 text-rose-500" : "bg-slate-800 text-slate-400"}`}>
                    <Mic className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-200">
                      {isRecording
                        ? "Dang ghi am..."
                        : audioFile &&
                            audioFile.name.includes("recorded_audio")
                          ? "Da ghi am xong"
                          : "Ghi am truc tiep"}
                    </span>
                    <span
                      className={`font-mono text-xs ${isRecording ? "text-rose-400" : "text-slate-500"}`}>
                      {formatTime(recordingTime)}
                    </span>
                  </div>
                </div>

                {isRecording ? (
                  <button
                    onClick={stopRecording}
                    className="flex items-center justify-center rounded-lg bg-rose-500 p-2 text-white transition-colors hover:bg-rose-600">
                    <Square className="mr-1.5 h-4 w-4 fill-current" />
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    className="ui-btn-secondary rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                    Start
                  </button>
                )}
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="mt-4 ui-alert-error flex items-center rounded-lg p-2.5 text-xs">
              <AlertCircle className="mr-2 h-4 w-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {inputMode !== "text" && (
            <div className="mt-auto pt-4">
              <button
                onClick={startTranslation}
                disabled={isProcessing || !audioFile || isRecording}
                className={`flex w-full items-center justify-center rounded-xl py-3 font-medium text-white shadow-lg transition-all ${isProcessing || !audioFile || isRecording ? "cursor-not-allowed bg-slate-700/80 text-slate-400" : "bg-pink-700 shadow-pink-900/25 hover:bg-pink-600"}`}>
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
          )}
        </div>

      </div>

      <div className="flex min-h-0 min-w-0 flex-col xl:col-span-8">
        <div className="glass-panel relative flex h-[62vh] min-h-[420px] max-h-[680px] flex-1 flex-col overflow-hidden rounded-3xl">
          <div className="z-10 flex items-center justify-between border-b border-slate-500/25 bg-slate-900/30 p-4">
            <h2 className="text-sm font-semibold text-violet-200">
              Output Rendering
            </h2>
          </div>

          <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-slate-900/35 to-slate-950/40 p-4 sm:p-6">
            {isOfflineMode && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-xs text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Offline mode: Sign-MT cloud unavailable. Translation was processed locally via Sockeye (FSW generated), but 3D animation requires cloud connectivity.
                </span>
              </div>
            )}
            <div className="glass-inset relative flex min-h-[320px] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-black/65 p-2">
              {poseBuffer ? (
                <PoseViewer buffer={poseBuffer} />
              ) : isOfflineMode ? (
                <p className="text-sm text-amber-600/70">
                  Animation unavailable in offline mode
                </p>
              ) : (
                <p className="text-sm text-slate-600">
                  2D/3D Canvas Display Space
                </p>
              )}
            </div>

            <div className="mt-3 rounded-xl border border-white/14 bg-black/60 px-5 py-3 text-center text-base text-slate-100 backdrop-blur-sm">
              {transcript ? (
                <span className="line-clamp-2 leading-relaxed tracking-[0.01em]">
                  {transcript}
                </span>
              ) : (
                <span className="text-slate-300">
                  Waiting for recognized text...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
