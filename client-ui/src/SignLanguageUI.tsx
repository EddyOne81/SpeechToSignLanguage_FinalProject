import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  FileText,
  History,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  MessageSquare,
  Mic,
  PlayCircle,
  RefreshCw,
  Search,
  Square,
  UploadCloud,
  UserCircle,
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

type DictionaryItem = {
  wordId: number;
  englishText: string;
  normalizedText?: string;
  entryType?: string | null;
  spokenLang?: string;
  signedLang?: string;
  cacheSource?: string | null;
  fswCode?: string;
  poseFilePath?: string;
  isVerified?: boolean;
  verifiedByUserId?: number | null;
};

type HistoryItem = {
  historyId: number;
  wordId?: number | null;
  inputText?: string;
  fswResult?: string;
  poseFilePath?: string;
  processingTimeMs?: number;
  createdAt?: string;
};

type FeedbackItem = {
  feedbackId: number;
  historyId?: number | null;
  rating?: number;
  comment?: string;
  createdAt?: string;
};

type UserProfile = {
  userId: number;
  username: string;
  email?: string;
  roles?: string[] | string;
  createdAt?: string;
};

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8080";

const unwrapApiResponse = (body: any) => {
  if (body?.data?.data !== undefined) {
    return body.data.data;
  }
  if (body?.data !== undefined) {
    return body.data;
  }
  return body;
};

const extractPayloadFromApiResponse = (body: any) => {
  const payload = unwrapApiResponse(body);
  if (payload?.recognized_text_en) {
    return payload;
  }
  return null;
};

const extractPageContent = (body: any) => {
  const payload = unwrapApiResponse(body);
  if (payload?.content && Array.isArray(payload.content)) {
    return payload;
  }
  if (Array.isArray(payload)) {
    return { content: payload };
  }
  return { content: [] };
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
  const [activeTab, setActiveTab] = useState<
    "translate" | "dictionary" | "history" | "feedback" | "account"
  >("translate");

  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem("s2s_token");
  });
  const [authUser, setAuthUser] = useState<{
    username?: string;
    role?: string;
  } | null>(() => {
    const stored = localStorage.getItem("s2s_user");
    return stored ? JSON.parse(stored) : null;
  });

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [authMessage, setAuthMessage] = useState<string | null>(null);

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

  const [dictQuery, setDictQuery] = useState("");
  const [dictItems, setDictItems] = useState<DictionaryItem[]>([]);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictError, setDictError] = useState<string | null>(null);

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    historyId: "",
    rating: "5",
    comment: "",
  });

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({ email: "" });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
  });

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!authToken) {
      setProfile(null);
      return;
    }
    void loadProfile();
  }, [authToken]);

  useEffect(() => {
    if (activeTab === "dictionary") {
      void loadDictionary();
    }
    if (activeTab === "history") {
      void loadHistories();
    }
    if (activeTab === "feedback") {
      void loadFeedbacks();
    }
  }, [activeTab]);

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

  const apiRequest = async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (authToken) {
      headers.set("Authorization", `Bearer ${authToken}`);
    }
    if (
      !headers.has("Content-Type") &&
      options.body &&
      !(options.body instanceof FormData)
    ) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(extractErrorMessage(body));
    }
    return body;
  };

  const formatDate = (value?: string) => {
    if (!value) {
      return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString();
  };

  const handleLogin = async () => {
    setAuthMessage(null);
    try {
      const response = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(loginForm),
      });
      const payload = unwrapApiResponse(response);
      if (!payload?.token) {
        throw new Error("Login response missing token.");
      }
      localStorage.setItem("s2s_token", payload.token);
      localStorage.setItem(
        "s2s_user",
        JSON.stringify({ username: payload.username, role: payload.role }),
      );
      setAuthToken(payload.token);
      setAuthUser({ username: payload.username, role: payload.role });
      setAuthMessage("Login success.");
      setLoginForm({ username: "", password: "" });
    } catch (err: any) {
      setAuthMessage(err.message || "Login failed.");
    }
  };

  const handleRegister = async () => {
    setAuthMessage(null);
    try {
      const response = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(registerForm),
      });
      const payload = unwrapApiResponse(response);
      if (!payload?.token) {
        throw new Error("Register response missing token.");
      }
      localStorage.setItem("s2s_token", payload.token);
      localStorage.setItem(
        "s2s_user",
        JSON.stringify({ username: payload.username, role: payload.role }),
      );
      setAuthToken(payload.token);
      setAuthUser({ username: payload.username, role: payload.role });
      setAuthMessage("Register success.");
      setRegisterForm({ username: "", email: "", password: "" });
    } catch (err: any) {
      setAuthMessage(err.message || "Register failed.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("s2s_token");
    localStorage.removeItem("s2s_user");
    setAuthToken(null);
    setAuthUser(null);
    setAuthMessage("Logged out.");
  };

  const loadDictionary = async () => {
    setDictLoading(true);
    setDictError(null);
    try {
      const query = dictQuery.trim();
      const response = await apiRequest(
        `/api/dictionaries?q=${encodeURIComponent(query)}&page=0&size=30`,
      );
      const page = extractPageContent(response);
      setDictItems(page.content || []);
    } catch (err: any) {
      setDictError(err.message || "Failed to load dictionary.");
    } finally {
      setDictLoading(false);
    }
  };

  const loadHistories = async () => {
    if (!authToken) {
      setHistoryItems([]);
      return;
    }
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await apiRequest("/api/histories/me?page=0&size=20");
      const page = extractPageContent(response);
      setHistoryItems(page.content || []);
    } catch (err: any) {
      setHistoryError(err.message || "Failed to load histories.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadFeedbacks = async () => {
    if (!authToken) {
      setFeedbackItems([]);
      return;
    }
    setFeedbackLoading(true);
    setFeedbackError(null);
    try {
      const response = await apiRequest("/api/feedbacks/me?page=0&size=20");
      const page = extractPageContent(response);
      setFeedbackItems(page.content || []);
    } catch (err: any) {
      setFeedbackError(err.message || "Failed to load feedbacks.");
    } finally {
      setFeedbackLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (!authToken) {
      setFeedbackError("Login required.");
      return;
    }
    setFeedbackError(null);
    try {
      await apiRequest("/api/feedbacks/me", {
        method: "POST",
        body: JSON.stringify({
          historyId: Number(feedbackForm.historyId),
          rating: Number(feedbackForm.rating),
          comment: feedbackForm.comment,
        }),
      });
      setFeedbackForm({ historyId: "", rating: "5", comment: "" });
      void loadFeedbacks();
    } catch (err: any) {
      setFeedbackError(err.message || "Failed to submit feedback.");
    }
  };

  const loadProfile = async () => {
    if (!authToken) {
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    try {
      const response = await apiRequest("/api/users/me");
      const payload = unwrapApiResponse(response);
      setProfile(payload);
      setProfileForm({ email: payload?.email ?? "" });
    } catch (err: any) {
      setProfileError(err.message || "Failed to load profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const updateProfile = async () => {
    if (!authToken) {
      setProfileError("Login required.");
      return;
    }
    setProfileError(null);
    try {
      const response = await apiRequest("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ email: profileForm.email }),
      });
      const payload = unwrapApiResponse(response);
      setProfile(payload);
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile.");
    }
  };

  const updatePassword = async () => {
    if (!authToken) {
      setProfileError("Login required.");
      return;
    }
    setProfileError(null);
    try {
      await apiRequest("/api/users/me/password", {
        method: "PATCH",
        body: JSON.stringify(passwordForm),
      });
      setPasswordForm({ oldPassword: "", newPassword: "" });
      setProfileError("Password updated.");
    } catch (err: any) {
      setProfileError(err.message || "Failed to update password.");
    }
  };

  const tabButtonClass = (
    tab: "translate" | "dictionary" | "history" | "feedback" | "account",
  ) => {
    const isActive = activeTab === tab;
    return `flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-all ${
      isActive
        ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-200"
        : "border-slate-800 bg-slate-900 text-slate-400 hover:border-emerald-500/40 hover:text-emerald-300"
    }`;
  };

  const startTextTranslation = async (overrideText?: string) => {
    const text = (overrideText ?? inputText).trim();
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
      const result = await apiRequest("/api/translate/text", {
        method: "POST",
        body: JSON.stringify({
          text,
          spoken_lang: "en",
          signed_lang: "ase",
        }),
      });

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

  const replayHistory = (text?: string) => {
    if (!text) {
      return;
    }
    setInputText(text);
    setActiveTab("translate");
    void startTextTranslation(text);
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

      const result = await apiRequest(
        "/api/translate/audio?spoken=en&signed=ase",
        {
          method: "POST",
          body: formData,
        },
      );

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

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 shadow-lg">
          <div className="flex flex-wrap gap-2">
            <button
              className={tabButtonClass("translate")}
              onClick={() => setActiveTab("translate")}>
              <PlayCircle className="h-4 w-4" />
              Translate
            </button>
            <button
              className={tabButtonClass("dictionary")}
              onClick={() => setActiveTab("dictionary")}>
              <BookOpen className="h-4 w-4" />
              Dictionary
            </button>
            <button
              className={tabButtonClass("history")}
              onClick={() => setActiveTab("history")}>
              <History className="h-4 w-4" />
              History
            </button>
            <button
              className={tabButtonClass("feedback")}
              onClick={() => setActiveTab("feedback")}>
              <MessageSquare className="h-4 w-4" />
              Feedback
            </button>
            <button
              className={tabButtonClass("account")}
              onClick={() => setActiveTab("account")}>
              <UserCircle className="h-4 w-4" />
              Account
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            {authUser ? (
              <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-2">
                <UserCircle className="h-4 w-4 text-emerald-400" />
                <span className="text-slate-200">{authUser.username}</span>
                {authUser.role && (
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase text-emerald-300">
                    {authUser.role}
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="ml-2 flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] uppercase text-rose-200 transition hover:border-rose-500/60">
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-2">
                <UserCircle className="h-4 w-4 text-slate-500" />
                <span>Not logged in</span>
              </div>
            )}
          </div>
        </div>

        {activeTab === "translate" && (
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
                      onClick={() => startTextTranslation()}
                      disabled={isProcessing || !inputText.trim()}
                      className={`mt-3 flex w-full items-center justify-center rounded-lg py-2.5 font-medium text-white transition-all ${isProcessing || !inputText.trim() ? "cursor-not-allowed bg-slate-800 text-slate-500" : "bg-emerald-600 hover:bg-emerald-500"}`}>
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
                    className={`flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 transition-all ${audioFile && !audioFile.name.includes("recorded_audio") ? "border-emerald-500 bg-emerald-500/5" : "border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/50"}`}>
                    <div className="flex flex-col items-center justify-center px-4 pt-5 pb-6 text-center">
                      <UploadCloud
                        className={`mb-2 h-7 w-7 ${audioFile && !audioFile.name.includes("recorded_audio") ? "text-emerald-400" : "text-slate-400"}`}
                      />
                      {audioFile &&
                      !audioFile.name.includes("recorded_audio") ? (
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
                    className={`flex flex-col gap-4 rounded-xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${isRecording ? "border-rose-500/50 bg-rose-500/5" : audioFile && audioFile.name.includes("recorded_audio") ? "border-emerald-500 bg-emerald-500/5" : "border-slate-800 bg-slate-950/50"}`}>
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
                        className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700">
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
                    className={`flex w-full items-center justify-center rounded-xl py-3 font-medium text-white shadow-lg transition-all ${isProcessing || !audioFile || isRecording ? "cursor-not-allowed bg-slate-800 text-slate-500" : "bg-emerald-600 shadow-emerald-900/20 hover:bg-emerald-500"}`}>
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
        )}

        {activeTab === "dictionary" && (
          <div className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg xl:col-span-4">
              <h3 className="text-sm font-semibold text-slate-300">
                Dictionary Search
              </h3>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wide text-slate-500">
                  Keyword
                </label>
                <input
                  value={dictQuery}
                  onChange={(event) => setDictQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void loadDictionary();
                    }
                  }}
                  placeholder="Search gloss or phrase"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={loadDictionary}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-500">
                  <Search className="h-4 w-4" />
                  Search
                </button>
                <button
                  onClick={loadDictionary}
                  className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300 transition hover:border-emerald-500/40">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
              {dictError && (
                <div className="flex items-center rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-400">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  {dictError}
                </div>
              )}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
                Use search to pull cached signs and gloss phrases from the
                dictionary. Click any result to reuse in translation.
              </div>
            </div>

            <div className="flex min-h-[320px] flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg xl:col-span-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300">
                  Results
                </h3>
                <span className="text-xs text-slate-500">
                  {dictItems.length} items
                </span>
              </div>
              <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
                {dictLoading ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading dictionary...
                  </div>
                ) : dictItems.length > 0 ? (
                  dictItems.map((item) => (
                    <div
                      key={item.wordId}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-200">
                            {item.englishText}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {(item.entryType ?? "PHRASE").toString()}
                            {item.cacheSource ? ` - ${item.cacheSource}` : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setInputText(item.englishText);
                            setActiveTab("translate");
                            void startTextTranslation(item.englishText);
                          }}
                          className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase text-emerald-200 transition hover:border-emerald-500/80">
                          Use
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
                        <span className="rounded-full border border-slate-800 bg-slate-900 px-2 py-0.5">
                          {item.spokenLang ?? "en"}
                          {" -> "}
                          {item.signedLang ?? "ase"}
                        </span>
                        {item.poseFilePath && (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-200">
                            pose cached
                          </span>
                        )}
                        {item.normalizedText && (
                          <span className="rounded-full border border-slate-800 bg-slate-900 px-2 py-0.5">
                            normalized: {item.normalizedText}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No dictionary items found yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="flex min-h-[420px] flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-300">
                Translation History
              </h3>
              <button
                onClick={loadHistories}
                className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-[11px] uppercase text-slate-300 transition hover:border-emerald-500/40">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>

            {!authToken ? (
              <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-500">
                Login to view your personal translation history.
              </div>
            ) : historyLoading ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading histories...
              </div>
            ) : historyError ? (
              <div className="mt-6 flex items-center rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-400">
                <AlertCircle className="mr-2 h-4 w-4" />
                {historyError}
              </div>
            ) : historyItems.length > 0 ? (
              <div className="mt-4 space-y-3 overflow-y-auto">
                {historyItems.map((item) => (
                  <div
                    key={item.historyId}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-200">
                          {item.inputText || "Untitled"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(item.createdAt)}
                          {item.processingTimeMs
                            ? ` · ${item.processingTimeMs} ms`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => replayHistory(item.inputText)}
                          className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase text-emerald-200 transition hover:border-emerald-500/80">
                          Replay
                        </button>
                        <button
                          onClick={() => {
                            setFeedbackForm((prev) => ({
                              ...prev,
                              historyId: String(item.historyId),
                            }));
                            setActiveTab("feedback");
                          }}
                          className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] uppercase text-slate-300 transition hover:border-emerald-500/40">
                          Feedback
                        </button>
                      </div>
                    </div>
                    {item.poseFilePath && (
                      <p className="mt-3 text-xs text-slate-500">
                        Pose: {item.poseFilePath}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm text-slate-500">
                No history entries yet.
              </p>
            )}
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg xl:col-span-4">
              <h3 className="text-sm font-semibold text-slate-300">
                Submit Feedback
              </h3>
              {!authToken ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-500">
                  Login to submit feedback.
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-wide text-slate-500">
                      History ID
                    </label>
                    <input
                      value={feedbackForm.historyId}
                      onChange={(event) =>
                        setFeedbackForm((prev) => ({
                          ...prev,
                          historyId: event.target.value,
                        }))
                      }
                      placeholder="Example: 12"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-wide text-slate-500">
                      Rating
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={feedbackForm.rating}
                      onChange={(event) =>
                        setFeedbackForm((prev) => ({
                          ...prev,
                          rating: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-wide text-slate-500">
                      Comment
                    </label>
                    <textarea
                      value={feedbackForm.comment}
                      onChange={(event) =>
                        setFeedbackForm((prev) => ({
                          ...prev,
                          comment: event.target.value,
                        }))
                      }
                      placeholder="Your feedback..."
                      className="h-24 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    onClick={submitFeedback}
                    className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-500">
                    <MessageSquare className="h-4 w-4" />
                    Send Feedback
                  </button>
                  {feedbackError && (
                    <div className="flex items-center rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-400">
                      <AlertCircle className="mr-2 h-4 w-4" />
                      {feedbackError}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex min-h-[320px] flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg xl:col-span-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300">
                  Your Feedbacks
                </h3>
                <button
                  onClick={loadFeedbacks}
                  className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-[11px] uppercase text-slate-300 transition hover:border-emerald-500/40">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>
              <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
                {!authToken ? (
                  <p className="text-sm text-slate-500">
                    Login to view your feedbacks.
                  </p>
                ) : feedbackLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading feedbacks...
                  </div>
                ) : feedbackItems.length > 0 ? (
                  feedbackItems.map((item) => (
                    <div
                      key={item.feedbackId}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-200">
                          Rating: {item.rating ?? "-"}/5
                        </p>
                        <span className="text-xs text-slate-500">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      {item.comment && (
                        <p className="mt-2 text-sm text-slate-400">
                          {item.comment}
                        </p>
                      )}
                      {item.historyId && (
                        <p className="mt-2 text-xs text-slate-500">
                          History ID: {item.historyId}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No feedback submissions yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "account" && (
          <div className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-12">
            {!authToken ? (
              <>
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg xl:col-span-6">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                    <LogIn className="h-4 w-4" />
                    Login
                  </h3>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-wide text-slate-500">
                      Username
                    </label>
                    <input
                      value={loginForm.username}
                      onChange={(event) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          username: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-wide text-slate-500">
                      Password
                    </label>
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(event) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          password: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    onClick={handleLogin}
                    className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-500">
                    <LogIn className="h-4 w-4" />
                    Login
                  </button>
                </div>

                <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg xl:col-span-6">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                    <UserCircle className="h-4 w-4" />
                    Register
                  </h3>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-wide text-slate-500">
                      Username
                    </label>
                    <input
                      value={registerForm.username}
                      onChange={(event) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          username: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-wide text-slate-500">
                      Email
                    </label>
                    <input
                      type="email"
                      value={registerForm.email}
                      onChange={(event) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          email: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-wide text-slate-500">
                      Password
                    </label>
                    <input
                      type="password"
                      value={registerForm.password}
                      onChange={(event) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          password: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    onClick={handleRegister}
                    className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200 transition hover:border-emerald-500/80">
                    <UserCircle className="h-4 w-4" />
                    Create account
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg xl:col-span-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-300">
                      Profile
                    </h3>
                    <button
                      onClick={loadProfile}
                      className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-[11px] uppercase text-slate-300 transition hover:border-emerald-500/40">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Refresh
                    </button>
                  </div>
                  {profileLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading profile...
                    </div>
                  ) : profile ? (
                    <div className="space-y-2 text-sm text-slate-300">
                      <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
                        Username:{" "}
                        <span className="text-emerald-300">
                          {profile.username}
                        </span>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
                        Email:{" "}
                        <span className="text-emerald-300">
                          {profile.email ?? "-"}
                        </span>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
                        Roles:{" "}
                        <span className="text-emerald-300">
                          {Array.isArray(profile.roles)
                            ? profile.roles.join(", ")
                            : (profile.roles ?? "-")}
                        </span>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
                        Created:{" "}
                        <span className="text-emerald-300">
                          {formatDate(profile.createdAt)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No profile loaded.</p>
                  )}
                  {profileError && (
                    <div className="flex items-center rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-400">
                      <AlertCircle className="mr-2 h-4 w-4" />
                      {profileError}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg xl:col-span-7">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                    <UserCircle className="h-4 w-4" />
                    Update Account
                  </h3>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-wide text-slate-500">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(event) =>
                        setProfileForm({ email: event.target.value })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    onClick={updateProfile}
                    className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200 transition hover:border-emerald-500/80">
                    <UserCircle className="h-4 w-4" />
                    Save profile
                  </button>

                  <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <KeyRound className="h-4 w-4" />
                    Change Password
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-wide text-slate-500">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.oldPassword}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          oldPassword: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-wide text-slate-500">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          newPassword: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    onClick={updatePassword}
                    className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-500">
                    <KeyRound className="h-4 w-4" />
                    Update password
                  </button>
                </div>
              </>
            )}

            {authMessage && (
              <div className="xl:col-span-12">
                <div className="flex items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-200">
                  <UserCircle className="mr-2 h-4 w-4" />
                  {authMessage}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
