import React from "react";
import {
  AlertCircle,
  ArrowRight,
  Clock,
  Loader2,
  Mic,
  PlayCircle,
  Square,
  UploadCloud,
} from "lucide-react";
import PoseViewer from "../PoseViewer";
import { formatDate, formatTime } from "../utils/format";
import type { HistoryItem, PoseBuffer, InputModeType, LangType, TabType } from "../types";

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
  isLoggedIn: boolean;
  recentItems: HistoryItem[];
  setActiveTab: (tab: TabType) => void;
  replayHistory: (text?: string) => void;
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
  isLoggedIn,
  recentItems,
  setActiveTab,
  replayHistory,
}: TranslateTabProps) {
  return (
    <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-12">
      <div className="flex min-h-0 min-w-0 flex-col gap-4 xl:col-span-4">
        <div className="glass-panel flex flex-col rounded-3xl p-5">
          <h3 className="mb-4 text-sm font-semibold ">Input Source</h3>

          <div className="ui-segment mb-4 flex gap-2 rounded-full p-1">
            <button
              onClick={() => setInputMode("text")}
              className={`ui-segment-btn flex-1 rounded-full px-3 py-1.5 text-xs font-semibold ${inputMode === "text" ? "active" : ""}`}>
              Text
            </button>
            <button
              onClick={() => setInputMode("upload")}
              className={`ui-segment-btn flex-1 rounded-full px-3 py-1.5 text-xs font-semibold ${inputMode === "upload" ? "active" : ""}`}>
              Upload
            </button>
            <button
              onClick={() => setInputMode("record")}
              className={`ui-segment-btn flex-1 rounded-full px-3 py-1.5 text-xs font-semibold ${inputMode === "record" ? "active" : ""}`}>
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
                  <div className="ui-segment flex gap-1 rounded-full p-0.5">
                    <button
                      onClick={() => setInputLang("en")}
                      className={`ui-segment-btn rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${inputLang === "en" ? "active" : ""}`}>
                      EN
                    </button>
                    <button
                      onClick={() => setInputLang("vi")}
                      className={`ui-segment-btn rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${inputLang === "vi" ? "active" : ""}`}>
                      VI
                    </button>
                  </div>
                </div>
                <textarea
                  value={inputText}
                  onChange={(event) => setInputText(event.target.value)}
                  placeholder={inputLang === "vi" ? "Type Vietnamese text. Example: Xin chào" : "Type English text. Example: Hello"}
                  className="ui-input h-24 w-full rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={() => startTextTranslation()}
                  disabled={isProcessing || !inputText.trim()}
                  className={`mt-3 flex w-full items-center justify-center rounded-lg py-2.5 font-medium transition-all ${isProcessing || !inputText.trim() ? "ui-btn-disabled" : "ui-btn-primary"}`}>
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
                  className={`flex h-36 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 transition-all ${audioFile && !audioFile.name.includes("recorded_audio") ? "ui-dropzone-active" : "ui-dropzone border-dashed"}`}>
                  <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
                    <UploadCloud
                      className={`mb-2 h-7 w-7 ${audioFile && !audioFile.name.includes("recorded_audio") ? "ui-text-accent" : "text-slate-400"}`}
                    />
                    {audioFile &&
                    !audioFile.name.includes("recorded_audio") ? (
                      <p className="ui-text-accent max-w-full break-all text-sm font-medium">
                        {audioFile.name}
                      </p>
                    ) : (
                      <>
                        <p className="text-sm text-slate-400">
                          <span className="ui-text-accent font-semibold">
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
                className={`glass-inset flex flex-col gap-4 rounded-xl border p-4 shadow-sm transition-all sm:flex-row sm:items-center sm:justify-between ${isRecording ? "ui-state-recording" : audioFile && audioFile.name.includes("recorded_audio") ? "ui-state-ready" : ""}`}>
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-full p-2 ${isRecording ? "animate-pulse bg-rose-500/20 text-rose-500" : "ui-icon-circle-neutral"}`}>
                    <Mic className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium" style={{ color: "var(--text-main)" }}>
                      {isRecording
                        ? "Recording..."
                        : audioFile &&
                            audioFile.name.includes("recorded_audio")
                          ? "Recording ready"
                          : "Record live audio"}
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
                className={`flex w-full items-center justify-center rounded-xl py-3 font-medium shadow-lg transition-all ${isProcessing || !audioFile || isRecording ? "ui-btn-disabled" : "ui-btn-primary"}`}>
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

        {/* Recent Translations */}
        <div className="glass-panel rounded-3xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4" style={{ color: "var(--accent)" }} />
              Recent Translations
            </h3>
            <button
              onClick={() => setActiveTab("history")}
              className="flex items-center gap-1 text-xs ui-text-accent transition-opacity hover:opacity-70">
              View all
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {!isLoggedIn ? (
            <p className="text-xs text-slate-500">Log in to see your recent translations.</p>
          ) : recentItems.length === 0 ? (
            <p className="text-xs text-slate-500">No translations yet. Start translating!</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentItems.map((item) => (
                <button
                  key={item.historyId}
                  onClick={() => replayHistory(item.inputText)}
                  className="glass-inset w-full rounded-xl px-3 py-2.5 text-left transition hover:opacity-80">
                  <p className="truncate text-xs font-medium">{item.inputText || "Untitled"}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{formatDate(item.createdAt)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-col xl:col-span-8">
        <div className="glass-panel relative flex h-[62vh] min-h-[420px] max-h-[680px] flex-1 flex-col overflow-hidden rounded-3xl">
          <div className="ui-panel-header z-10 flex items-center justify-between p-4">
            <h2 className="ui-text-accent text-sm font-semibold">
              Output Rendering
            </h2>
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
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

            <div className="glass-inset mt-3 rounded-xl px-5 py-3 text-center text-base">
              {transcript ? (
                <span className="line-clamp-2 leading-relaxed tracking-[0.01em]">
                  {transcript}
                </span>
              ) : (
                <span className="text-slate-400">
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
