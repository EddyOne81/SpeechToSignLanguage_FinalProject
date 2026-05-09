import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Eye,
  EyeOff,
  History,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  MessageSquare,
  Mic,
  Moon,
  PlayCircle,
  RefreshCw,
  Search,
  Square,
  Sun,
  Trash2,
  UploadCloud,
  UserCircle,
} from "lucide-react";
import PoseViewer from "./PoseViewer";

type PoseBuffer = {
  frames: number[][][];
  fps: number;
  sourceUrl?: string;
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
  updatedAt?: string;
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
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const stored = localStorage.getItem("s2s_theme");
    return stored === "light" ? "light" : "dark";
  });
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
  const [inputMode, setInputMode] = useState<"text" | "upload" | "record">(
    "text",
  );
  const [inputText, setInputText] = useState<string>("Hello");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  const [transcript, setTranscript] = useState<string>("");
  const [poseBuffer, setPoseBuffer] = useState<PoseBuffer | null>(null);

  const [dictQuery, setDictQuery] = useState("");
  const [dictItems, setDictItems] = useState<DictionaryItem[]>([]);
  const [dictPage, setDictPage] = useState(0);
  const [dictSize] = useState(12);
  const [dictTotalPages, setDictTotalPages] = useState(0);
  const [dictTotalElements, setDictTotalElements] = useState(0);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictError, setDictError] = useState<string | null>(null);

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyPage, setHistoryPage] = useState(0);
  const [historySize] = useState(12);
  const [historyTotalPages, setHistoryTotalPages] = useState(0);
  const [historyTotalElements, setHistoryTotalElements] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [feedbackPage, setFeedbackPage] = useState(0);
  const [feedbackSize] = useState(10);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(0);
  const [feedbackTotalElements, setFeedbackTotalElements] = useState(0);
  const [feedbackHistoryIdSearch, setFeedbackHistoryIdSearch] = useState("");
  const [feedbackSort, setFeedbackSort] = useState<
    "latest" | "oldest" | "rating_high" | "rating_low"
  >("latest");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
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
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    localStorage.setItem("s2s_theme", theme);
  }, [theme]);

  useEffect(() => {
    const onScroll = () => {
      setIsHeaderCompact(window.scrollY > 18);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      pose_coordinates,
      pose_source_url,
      fps,
    } = data;

    setTranscript(recognized_text_en);
    setPoseBuffer({
      frames: pose_coordinates,
      fps,
      sourceUrl: pose_source_url,
    });

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

  const loadDictionary = async (targetPage = dictPage, overrideQuery?: string) => {
    setDictLoading(true);
    setDictError(null);
    try {
      const query = (overrideQuery ?? dictQuery).trim();
      const response = await apiRequest(
        `/api/dictionaries?q=${encodeURIComponent(query)}&page=${targetPage}&size=${dictSize}`,
      );
      const pageData = extractPageContent(response);
      const content = pageData.content || [];
      const totalPages = Number(pageData.totalPages ?? 0);
      const totalElements = Number(
        pageData.totalElements ?? pageData.numberOfElements ?? content.length ?? 0,
      );
      const currentPage = Number(
        pageData.number ?? pageData.page ?? pageData.index ?? targetPage,
      );

      setDictItems(content);
      setDictTotalPages(totalPages);
      setDictTotalElements(totalElements);
      setDictPage(Number.isNaN(currentPage) ? 0 : currentPage);
    } catch (err: any) {
      setDictError(err.message || "Failed to load dictionary.");
    } finally {
      setDictLoading(false);
    }
  };

  const loadHistories = async (targetPage = historyPage, overrideQuery?: string) => {
    if (!authToken) {
      setHistoryItems([]);
      setHistoryTotalPages(0);
      setHistoryTotalElements(0);
      return;
    }
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const query = (overrideQuery ?? historyQuery).trim();
      const qParam = query ? `&q=${encodeURIComponent(query)}` : "";
      const response = await apiRequest(
        `/api/histories/me?page=${targetPage}&size=${historySize}${qParam}`,
      );
      const pageData = extractPageContent(response);
      const content = pageData.content || [];
      const totalPages = Number(pageData.totalPages ?? 0);
      const totalElements = Number(
        pageData.totalElements ?? pageData.numberOfElements ?? content.length ?? 0,
      );
      const currentPage = Number(
        pageData.number ?? pageData.page ?? pageData.index ?? targetPage,
      );

      setHistoryItems(content);
      setHistoryTotalPages(totalPages);
      setHistoryTotalElements(totalElements);
      setHistoryPage(Number.isNaN(currentPage) ? 0 : currentPage);
    } catch (err: any) {
      setHistoryError(err.message || "Failed to load histories.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadFeedbacks = async (
    targetPage = feedbackPage,
    overrideHistoryId?: string,
    overrideSort?: "latest" | "oldest" | "rating_high" | "rating_low"
  ) => {
    if (!authToken) {
      setFeedbackItems([]);
      setFeedbackTotalPages(0);
      setFeedbackTotalElements(0);
      return;
    }
    setFeedbackLoading(true);
    setFeedbackError(null);
    try {
      const searchHistoryId = (overrideHistoryId ?? feedbackHistoryIdSearch).trim();
      const sort = overrideSort ?? feedbackSort;
      const sortQuery =
        sort === "latest"
          ? "updatedAt,desc"
          : sort === "oldest"
            ? "updatedAt,asc"
            : sort === "rating_high"
              ? "rating,desc"
              : "rating,asc";
      const historyFilter =
        searchHistoryId && Number.isInteger(Number(searchHistoryId))
          ? `&historyId=${Number(searchHistoryId)}`
          : "";
      const response = await apiRequest(
        `/api/feedbacks/me?page=${targetPage}&size=${feedbackSize}&sort=${sortQuery}${historyFilter}`,
      );
      const pageData = extractPageContent(response);
      const content = pageData.content || [];
      const totalPages = Number(pageData.totalPages ?? 0);
      const totalElements = Number(
        pageData.totalElements ?? pageData.numberOfElements ?? content.length ?? 0,
      );
      const currentPage = Number(
        pageData.number ?? pageData.page ?? pageData.index ?? targetPage,
      );

      setFeedbackItems(content);
      setFeedbackTotalPages(totalPages);
      setFeedbackTotalElements(totalElements);
      setFeedbackPage(Number.isNaN(currentPage) ? 0 : currentPage);
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
    const historyId = Number(feedbackForm.historyId);
    const rating = Number(feedbackForm.rating);

    if (!Number.isInteger(historyId) || historyId <= 0) {
      setFeedbackError("History ID must be a positive integer.");
      return;
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      setFeedbackError("Rating must be between 1 and 5.");
      return;
    }

    setFeedbackSubmitting(true);
    setFeedbackError(null);
    try {
      await apiRequest(`/api/histories/me/${historyId}`);

      const existingResponse = await apiRequest(
        `/api/feedbacks/me?page=0&size=1&historyId=${historyId}`,
      );
      const existingPage = extractPageContent(existingResponse);
      const existingItem = (existingPage.content || []).find(
        (item: FeedbackItem) => Number(item.historyId) === historyId,
      );

      const method = existingItem ? "PUT" : "POST";
      const path = existingItem
        ? `/api/feedbacks/me/${existingItem.feedbackId}`
        : "/api/feedbacks/me";

      await apiRequest(path, {
        method,
        body: JSON.stringify({
          historyId,
          rating,
          comment: feedbackForm.comment,
        }),
      });
      setFeedbackForm({ historyId: "", rating: "5", comment: "" });
      void loadFeedbacks(0);
    } catch (err: any) {
      setFeedbackError(err.message || "Failed to submit feedback.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const deleteHistory = async (historyId: number) => {
    if (!authToken) return;
    setHistoryError(null);
    try {
      await apiRequest(`/api/histories/me/${historyId}`, { method: "DELETE" });
      const targetPage =
        historyItems.length === 1 && historyPage > 0
          ? historyPage - 1
          : historyPage;
      void loadHistories(targetPage);
    } catch (err: any) {
      setHistoryError(err.message || "Failed to delete history.");
    }
  };

  const deleteAllHistories = async () => {
    if (!authToken) return;
    if (!window.confirm("Delete ALL your translation history? Associated feedbacks will also be removed. This cannot be undone.")) return;
    setHistoryError(null);
    try {
      await apiRequest("/api/histories/me", { method: "DELETE" });
      setHistoryQuery("");
      void loadHistories(0, "");
    } catch (err: any) {
      setHistoryError(err.message || "Failed to delete all histories.");
    }
  };

  const deleteFeedback = async (feedbackId: number) => {
    if (!authToken) {
      setFeedbackError("Login required.");
      return;
    }
    setFeedbackError(null);
    try {
      await apiRequest(`/api/feedbacks/me/${feedbackId}`, {
        method: "DELETE",
      });
      const targetPage =
        feedbackItems.length === 1 && feedbackPage > 0
          ? feedbackPage - 1
          : feedbackPage;
      void loadFeedbacks(targetPage);
    } catch (err: any) {
      setFeedbackError(err.message || "Failed to delete feedback.");
    }
  };

  const openHistoryFromFeedback = async (historyId?: number | null) => {
    if (!historyId || !authToken) {
      return;
    }
    try {
      const response = await apiRequest(`/api/histories/me/${historyId}`);
      const payload = unwrapApiResponse(response);
      setHistoryQuery(String(historyId));
      setHistoryItems(payload ? [payload] : []);
      setHistoryTotalElements(payload ? 1 : 0);
      setHistoryTotalPages(payload ? 1 : 0);
      setHistoryPage(0);
      setActiveTab("history");
    } catch {
      setHistoryQuery(String(historyId));
      setActiveTab("history");
      void loadHistories(0);
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
    return `flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] transition-all ${
      isActive
        ? "ui-tab-active"
        : "ui-tab-idle"
    }`;
  };

  const filteredHistoryItems = historyItems;

  const startTextTranslation = async (overrideText?: string) => {
    const text = (overrideText ?? inputText).trim();
    if (!text) {
      setErrorMsg("Vui long nhap text truoc khi dich.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setTranscript("");
    setPoseBuffer(null);

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
    setPoseBuffer(null);

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
    <div
      className={`app-shell ${theme === "dark" ? "theme-dark" : "theme-light"} relative min-h-screen w-full overflow-x-hidden`}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 left-[8%] h-80 w-80 rounded-full bg-pink-400/8 blur-3xl" />
        <div className="absolute top-[18%] -right-28 h-96 w-96 rounded-full bg-rose-400/8 blur-3xl" />
      </div>
      <header className={`app-header-shell ${isHeaderCompact ? "compact" : ""}`}>
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div
            className={`transition-all duration-300 ${isHeaderCompact ? "py-2" : "py-2.5 sm:py-3"}`}>
          <div className="flex flex-nowrap items-center justify-between gap-2">
            <div className="min-w-0 shrink-0">
              <h1
                className={`truncate font-bold tracking-tight transition-all duration-300 ${isHeaderCompact ? "text-base" : "text-lg"}`}>
                S2S - Speech 2 Sign
              </h1>
            </div>
            <div className="mx-2 flex min-w-0 flex-1 flex-nowrap justify-center gap-2 overflow-x-auto">
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
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() =>
                  setTheme((prev) => (prev === "dark" ? "light" : "dark"))
                }
                className="ui-btn-secondary flex items-center rounded-full px-2.5 py-1.5 text-sm">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              {authUser ? (
                <div className="glass-inset flex items-center gap-2 rounded-full px-2 py-1 text-xs">
                  <UserCircle className="h-4 w-4 text-violet-200" />
                  <span>{authUser.username}</span>
                  <button
                    onClick={handleLogout}
                    className="ml-2 flex items-center gap-1 rounded-full border border-rose-400/35 bg-rose-400/15 px-2 py-1 text-[10px] uppercase text-rose-100 transition hover:border-rose-300/75">
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setActiveTab("account")}
                  className="glass-inset flex items-center gap-2 rounded-full px-2 py-1 text-xs transition hover:border-violet-400/40">
                  <UserCircle className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-400">Log in</span>
                </button>
              )}
            </div>
          </div>
          </div>
        </div>
      </header>

      <main className={`app-main-offset ${isHeaderCompact ? "compact" : ""} relative z-10 mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col px-4 pb-5 sm:px-6 sm:pb-6 lg:px-8`}>

        {activeTab === "translate" && (
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
                      <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                        Quick Text Input
                      </p>
                      <textarea
                        value={inputText}
                        onChange={(event) => setInputText(event.target.value)}
                        placeholder="Type English text. Example: Hello"
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
                  <div className="glass-inset relative flex min-h-[320px] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-black/65 p-2">
                    {poseBuffer ? (
                      <PoseViewer buffer={poseBuffer} />
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
        )}

        {activeTab === "dictionary" && (
          <div className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="flex flex-col gap-4 glass-panel rounded-2xl p-5 shadow-lg xl:col-span-4">
              <h3 className="text-sm font-semibold ">
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
                      void loadDictionary(0);
                    }
                  }}
                  placeholder="Search gloss or phrase"
                  className="ui-input w-full rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void loadDictionary(0)}
                  className="ui-btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide transition">
                  <Search className="h-4 w-4" />
                  Search
                </button>
                <button
                  onClick={() => {
                    setDictQuery("");
                    void loadDictionary(0, "");
                  }}
                  className="ui-btn-secondary flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide transition">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
              {dictError && (
                <div className="ui-alert-error flex items-center rounded-lg p-2 text-xs">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  {dictError}
                </div>
              )}
              <div className="glass-inset rounded-xl p-4 text-xs text-slate-400">
                Use search to pull cached signs and gloss phrases from the
                dictionary. Click any result to reuse in translation.
              </div>
            </div>

            <div className="flex min-h-[320px] flex-col glass-panel rounded-2xl p-5 shadow-lg xl:col-span-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold ">
                  Results
                </h3>
                <span className="text-xs text-slate-500">
                  {dictTotalElements} items
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
                      className="glass-inset rounded-xl p-4">
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
                          className="rounded-full border border-violet-300/40 bg-violet-300/12 px-3 py-1 text-[11px] uppercase text-violet-100 transition hover:border-violet-300/80">
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
                          <span className="rounded-full border border-violet-300/35 bg-violet-300/12 px-2 py-0.5 text-violet-100">
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
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/40 pt-3">
                <div className="text-xs text-slate-400">
                  Page {dictTotalPages > 0 ? dictPage + 1 : 0} /{" "}
                  {dictTotalPages || 0}
                </div>
                <div className="flex items-center gap-2">
                  {dictTotalPages > 1 && dictPage > 0 && (
                    <button
                      onClick={() => void loadDictionary(0)}
                      disabled={dictLoading}
                      className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                      First
                    </button>
                  )}
                  <button
                    onClick={() => void loadDictionary(Math.max(0, dictPage - 1))}
                    disabled={dictLoading || dictPage <= 0}
                    className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                    Prev
                  </button>
                  <select
                    value={dictTotalPages > 0 ? dictPage : 0}
                    onChange={(event) => void loadDictionary(Number(event.target.value))}
                    disabled={dictLoading || dictTotalPages <= 0}
                    className="ui-input rounded-md px-2 py-1.5 text-xs">
                    {Array.from({ length: dictTotalPages || 1 }, (_, idx) => (
                      <option key={idx} value={idx}>
                        Page {idx + 1}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      void loadDictionary(
                        Math.min(
                          Math.max(dictTotalPages - 1, 0),
                          dictPage + 1,
                        ),
                      )
                    }
                    disabled={
                      dictLoading ||
                      dictTotalPages <= 0 ||
                      dictPage >= dictTotalPages - 1
                    }
                    className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                    Next
                  </button>
                  {dictTotalPages > 1 && dictPage < dictTotalPages - 1 && (
                    <button
                      onClick={() => void loadDictionary(Math.max(dictTotalPages - 1, 0))}
                      disabled={dictLoading}
                      className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                      Last
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="flex min-h-[420px] flex-1 flex-col glass-panel rounded-2xl p-5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold ">
                Translation History
              </h3>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={historyQuery}
                  onChange={(event) => setHistoryQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void loadHistories(0);
                    }
                  }}
                  placeholder="Search by text..."
                  className="ui-input min-w-[260px] flex-1 rounded-lg px-3 py-2 text-sm md:max-w-md"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void loadHistories(0)}
                    className="ui-btn-primary flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] uppercase transition">
                    <Search className="h-3.5 w-3.5" />
                    Search
                  </button>
                  <button
                    onClick={() => {
                      setHistoryQuery("");
                      void loadHistories(0, "");
                    }}
                    className="flex items-center gap-2 ui-btn-secondary rounded-lg px-3 py-1.5 text-[11px] uppercase transition">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </button>
                  {authToken && historyTotalElements > 0 && (
                    <button
                      onClick={() => void deleteAllHistories()}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-400/35 bg-rose-400/10 px-3 py-1.5 text-[11px] uppercase text-rose-300 transition hover:border-rose-400/60 hover:bg-rose-400/20">
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete All
                    </button>
                  )}
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                {historyTotalElements} total · {filteredHistoryItems.length} on this page
              </div>
            </div>

            {!authToken ? (
              <div className="mt-6 glass-inset rounded-xl p-4 text-sm text-slate-500">
                Login to view your personal translation history.
              </div>
            ) : historyLoading ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading histories...
              </div>
            ) : historyError ? (
              <div className="mt-6 ui-alert-error flex items-center rounded-lg p-2 text-xs">
                <AlertCircle className="mr-2 h-4 w-4" />
                {historyError}
              </div>
            ) : filteredHistoryItems.length > 0 ? (
              <div className="mt-4 space-y-3 overflow-y-auto">
                {filteredHistoryItems.map((item) => (
                  <div
                    key={item.historyId}
                    className="glass-inset rounded-xl p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-200">
                          {item.inputText || "Untitled"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(item.createdAt)}
                          {item.processingTimeMs
                            ? ` Â· ${item.processingTimeMs} ms`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => replayHistory(item.inputText)}
                          className="rounded-full border border-pink-300/40 bg-pink-300/12 px-3 py-1 text-[11px] uppercase text-pink-100 transition hover:border-pink-300/80">
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
                          className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] uppercase transition hover:border-pink-300/45">
                          Feedback
                        </button>
                        <button
                          onClick={() => void deleteHistory(item.historyId)}
                          className="rounded-full border border-rose-400/35 bg-rose-400/10 px-3 py-1 text-[11px] uppercase text-rose-300 transition hover:border-rose-400/60 hover:bg-rose-400/20">
                          <Trash2 className="inline h-3 w-3 mr-1" />
                          Delete
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
                {historyQuery.trim()
                  ? "No matching entries found."
                  : "No history entries yet."}
              </p>
            )}
            {authToken && !historyError && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/40 pt-3">
                <div className="text-xs text-slate-400">
                  Page {historyTotalPages > 0 ? historyPage + 1 : 0} /{" "}
                  {historyTotalPages || 0}
                </div>
                <div className="flex items-center gap-2">
                  {historyTotalPages > 1 && historyPage > 0 && (
                    <button
                      onClick={() => void loadHistories(0)}
                      disabled={historyLoading}
                      className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                      First
                    </button>
                  )}
                  <button
                    onClick={() => void loadHistories(Math.max(0, historyPage - 1))}
                    disabled={historyLoading || historyPage <= 0}
                    className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                    Prev
                  </button>
                  <select
                    value={historyTotalPages > 0 ? historyPage : 0}
                    onChange={(event) => void loadHistories(Number(event.target.value))}
                    disabled={historyLoading || historyTotalPages <= 0}
                    className="ui-input rounded-md px-2 py-1.5 text-xs">
                    {Array.from({ length: historyTotalPages || 1 }, (_, idx) => (
                      <option key={idx} value={idx}>
                        Page {idx + 1}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      void loadHistories(
                        Math.min(
                          Math.max(historyTotalPages - 1, 0),
                          historyPage + 1,
                        ),
                      )
                    }
                    disabled={
                      historyLoading ||
                      historyTotalPages <= 0 ||
                      historyPage >= historyTotalPages - 1
                    }
                    className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                    Next
                  </button>
                  {historyTotalPages > 1 && historyPage < historyTotalPages - 1 && (
                    <button
                      onClick={() =>
                        void loadHistories(Math.max(historyTotalPages - 1, 0))
                      }
                      disabled={historyLoading}
                      className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                      Last
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="flex flex-col gap-4 glass-panel rounded-2xl p-5 shadow-lg xl:col-span-4">
              <h3 className="text-sm font-semibold ">
                Submit Feedback
              </h3>
              <p className="text-xs text-slate-500">
                Link your feedback to a history item to improve traceability.
              </p>
              {!authToken ? (
                <div className="glass-inset rounded-xl p-4 text-sm text-slate-500">
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
                      className="ui-input w-full rounded-lg px-3 py-2 text-sm"
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
                      className="ui-input w-full rounded-lg px-3 py-2 text-sm"
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
                      className="ui-input h-24 w-full rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    onClick={submitFeedback}
                    disabled={feedbackSubmitting}
                    className="ui-btn-primary flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60">
                    <MessageSquare className="h-4 w-4" />
                    {feedbackSubmitting ? "Saving..." : "Send Feedback"}
                  </button>
                  {feedbackError && (
                    <div className="ui-alert-error flex items-center rounded-lg p-2 text-xs">
                      <AlertCircle className="mr-2 h-4 w-4" />
                      {feedbackError}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex min-h-[320px] flex-col glass-panel rounded-2xl p-5 shadow-lg xl:col-span-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold ">
                  Your Feedbacks
                </h3>
                <button
                  onClick={() => {
                    setFeedbackHistoryIdSearch("");
                    setFeedbackSort("latest");
                    void loadFeedbacks(0, "", "latest");
                  }}
                  className="flex items-center gap-2 ui-btn-secondary rounded-full px-3 py-1 text-[11px] uppercase transition">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={feedbackHistoryIdSearch}
                  onChange={(event) =>
                    setFeedbackHistoryIdSearch(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void loadFeedbacks(0);
                    }
                  }}
                  placeholder="Search by History ID"
                  className="ui-input min-w-[150px] flex-1 rounded-lg px-3 py-2 text-sm"
                />
                <select
                  value={feedbackSort}
                  onChange={(event) =>
                    setFeedbackSort(
                      event.target.value as
                        | "latest"
                        | "oldest"
                        | "rating_high"
                        | "rating_low",
                    )
                  }
                  className="ui-input min-w-[140px] flex-1 rounded-lg px-3 py-2 text-sm">
                  <option value="latest">Latest</option>
                  <option value="oldest">Oldest</option>
                  <option value="rating_high">Rating Highest</option>
                  <option value="rating_low">Rating Lowest</option>
                </select>
                <button
                  onClick={() => void loadFeedbacks(0)}
                  className="ui-btn-primary flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">
                  Apply
                </button>
              </div>
              <div className="mt-2 text-right text-xs text-slate-500">
                {feedbackTotalElements} total
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
                      className="glass-inset rounded-xl p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-200">
                            Rating: {item.rating ?? "-"}/5
                          </p>
                          {item.comment && (
                            <p className="text-sm text-slate-400">
                              {item.comment}
                            </p>
                          )}
                          {item.historyId && (
                            <p className="text-xs text-slate-500">
                              History ID: {item.historyId}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-slate-500">
                            {formatDate(item.updatedAt ?? item.createdAt)}
                          </span>
                          {item.historyId && (
                            <button
                              onClick={() =>
                                void openHistoryFromFeedback(item.historyId)
                              }
                              className="rounded-full border border-violet-300/40 bg-violet-300/12 px-3 py-1 text-[11px] uppercase text-violet-100 transition hover:border-violet-300/80">
                              View History
                            </button>
                          )}
                          <button
                            onClick={() => void deleteFeedback(item.feedbackId)}
                            className="rounded-full border border-rose-300/35 bg-rose-300/12 px-3 py-1 text-[11px] uppercase text-rose-100 transition hover:border-rose-300/70">
                            Delete
                          </button>
                          {item.historyId && (
                            <button
                              onClick={() =>
                                setFeedbackForm((prev) => ({
                                  ...prev,
                                  historyId: String(item.historyId ?? ""),
                                  rating: String(item.rating ?? "5"),
                                  comment: item.comment ?? "",
                                }))
                              }
                              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] uppercase text-slate-200 transition hover:border-violet-300/45">
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No feedback submissions yet.
                  </p>
                )}
              </div>
              {authToken && !feedbackError && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/40 pt-3">
                  <div className="text-xs text-slate-400">
                    Page {feedbackTotalPages > 0 ? feedbackPage + 1 : 0} /{" "}
                    {feedbackTotalPages || 0}
                  </div>
                  <div className="flex items-center gap-2">
                    {feedbackTotalPages > 1 && feedbackPage > 0 && (
                      <button
                        onClick={() => void loadFeedbacks(0)}
                        disabled={feedbackLoading}
                        className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                        First
                      </button>
                    )}
                    <button
                      onClick={() =>
                        void loadFeedbacks(Math.max(0, feedbackPage - 1))
                      }
                      disabled={feedbackLoading || feedbackPage <= 0}
                      className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                      Prev
                    </button>
                    <select
                      value={feedbackTotalPages > 0 ? feedbackPage : 0}
                      onChange={(event) =>
                        void loadFeedbacks(Number(event.target.value))
                      }
                      disabled={feedbackLoading || feedbackTotalPages <= 0}
                      className="ui-input rounded-md px-2 py-1.5 text-xs">
                      {Array.from(
                        { length: feedbackTotalPages || 1 },
                        (_, idx) => (
                          <option key={idx} value={idx}>
                            Page {idx + 1}
                          </option>
                        ),
                      )}
                    </select>
                    <button
                      onClick={() =>
                        void loadFeedbacks(
                          Math.min(
                            Math.max(feedbackTotalPages - 1, 0),
                            feedbackPage + 1,
                          ),
                        )
                      }
                      disabled={
                        feedbackLoading ||
                        feedbackTotalPages <= 0 ||
                        feedbackPage >= feedbackTotalPages - 1
                      }
                      className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                      Next
                    </button>
                    {feedbackTotalPages > 1 &&
                      feedbackPage < feedbackTotalPages - 1 && (
                        <button
                          onClick={() =>
                            void loadFeedbacks(
                              Math.max(feedbackTotalPages - 1, 0),
                            )
                          }
                          disabled={feedbackLoading}
                          className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                          Last
                        </button>
                      )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "account" && (
          <div className="grid flex-1 grid-cols-1 items-start gap-6 xl:grid-cols-12">
            {!authToken ? (
              <>
                {/* Login */}
                <div className="flex flex-col gap-5 glass-panel rounded-2xl p-6 shadow-lg xl:col-span-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/20">
                      <LogIn className="h-4 w-4 text-violet-300" />
                    </div>
                    <h3 className="text-sm font-semibold">Login</h3>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs uppercase tracking-wide text-slate-500">Username</label>
                      <input
                        value={loginForm.username}
                        onChange={(event) => setLoginForm((prev) => ({ ...prev, username: event.target.value }))}
                        onKeyDown={(event) => { if (event.key === "Enter") void handleLogin(); }}
                        placeholder="Your username"
                        className="ui-input w-full rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs uppercase tracking-wide text-slate-500">Password</label>
                      <input
                        type="password"
                        value={loginForm.password}
                        onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                        onKeyDown={(event) => { if (event.key === "Enter") void handleLogin(); }}
                        placeholder="Your password"
                        className="ui-input w-full rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleLogin}
                    className="ui-btn-primary flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide transition">
                    <LogIn className="h-3.5 w-3.5" />
                    Login
                  </button>
                </div>

                {/* Register */}
                <div className="flex flex-col gap-5 glass-panel rounded-2xl p-6 shadow-lg xl:col-span-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-500/20">
                      <UserCircle className="h-4 w-4 text-pink-300" />
                    </div>
                    <h3 className="text-sm font-semibold">Create Account</h3>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs uppercase tracking-wide text-slate-500">Username</label>
                      <input
                        value={registerForm.username}
                        onChange={(event) => setRegisterForm((prev) => ({ ...prev, username: event.target.value }))}
                        placeholder="Choose a username"
                        className="ui-input w-full rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs uppercase tracking-wide text-slate-500">Email</label>
                      <input
                        type="email"
                        value={registerForm.email}
                        onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
                        placeholder="your@email.com"
                        className="ui-input w-full rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs uppercase tracking-wide text-slate-500">Password</label>
                      <input
                        type="password"
                        value={registerForm.password}
                        onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
                        placeholder="Create a password"
                        className="ui-input w-full rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleRegister}
                    className="flex items-center justify-center gap-2 rounded-lg border border-pink-300/40 bg-pink-300/12 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-pink-100 transition hover:border-pink-300/80">
                    <UserCircle className="h-3.5 w-3.5" />
                    Create Account
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Profile Card */}
                <div className="flex flex-col gap-4 glass-panel rounded-2xl p-5 shadow-lg xl:col-span-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Profile</h3>
                    <button
                      onClick={loadProfile}
                      disabled={profileLoading}
                      className="flex items-center gap-1.5 ui-btn-secondary rounded-full px-3 py-1 text-[11px] uppercase transition disabled:opacity-50">
                      {profileLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Refresh
                    </button>
                  </div>

                  {/* Avatar + Name */}
                  <div className="flex flex-col items-center gap-3 py-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-2xl font-bold text-white shadow-lg shadow-violet-900/30">
                      {(profile?.username ?? authUser?.username ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="text-center">
                      <p className="text-base font-semibold text-slate-100">
                        {profile?.username ?? authUser?.username ?? "—"}
                      </p>
                      <span className={`mt-1.5 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        authUser?.role === "ROLE_ADMIN"
                          ? "border-rose-400/40 bg-rose-400/15 text-rose-300"
                          : "border-violet-400/40 bg-violet-400/15 text-violet-300"
                      }`}>
                        {authUser?.role === "ROLE_ADMIN" ? "Admin" : "Member"}
                      </span>
                    </div>
                  </div>

                  {/* Info rows */}
                  {profileLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </div>
                  ) : profile ? (
                    <div className="space-y-2">
                      <div className="glass-inset flex items-center justify-between rounded-xl px-3 py-2.5 text-xs">
                        <span className="text-slate-400">Email</span>
                        <span className="ml-4 max-w-[60%] truncate text-right font-medium text-slate-200">{profile.email ?? "—"}</span>
                      </div>
                      <div className="glass-inset flex items-center justify-between rounded-xl px-3 py-2.5 text-xs">
                        <span className="text-slate-400">Joined</span>
                        <span className="text-right font-medium text-slate-200">{formatDate(profile.createdAt)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No profile loaded.</p>
                  )}

                  {profileError && (
                    <div className={`flex items-center rounded-lg p-2 text-xs ${
                      profileError === "Password updated."
                        ? "border border-violet-400/30 bg-violet-400/12 text-violet-200"
                        : "ui-alert-error"
                    }`}>
                      <AlertCircle className="mr-2 h-4 w-4 shrink-0" />
                      {profileError}
                    </div>
                  )}

                  <div className="mt-auto border-t border-slate-700/40 pt-4">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-rose-200 transition hover:border-rose-400/60 hover:bg-rose-400/20">
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>

                {/* Actions Column */}
                <div className="flex flex-col gap-4 xl:col-span-7">
                  {/* Update Email */}
                  <div className="flex flex-col gap-4 glass-panel rounded-2xl p-5 shadow-lg">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <UserCircle className="h-4 w-4 text-violet-300" />
                      Update Email
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(event) => setProfileForm({ email: event.target.value })}
                        onKeyDown={(event) => { if (event.key === "Enter") void updateProfile(); }}
                        placeholder="New email address"
                        className="ui-input min-w-[200px] flex-1 rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        onClick={updateProfile}
                        className="ui-btn-primary flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide transition">
                        <UserCircle className="h-3.5 w-3.5" />
                        Save
                      </button>
                    </div>
                  </div>

                  {/* Change Password */}
                  <div className="flex flex-col gap-4 glass-panel rounded-2xl p-5 shadow-lg">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <KeyRound className="h-4 w-4 text-violet-300" />
                      Change Password
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs uppercase tracking-wide text-slate-500">Current Password</label>
                        <div className="relative">
                          <input
                            type={showOldPassword ? "text" : "password"}
                            value={passwordForm.oldPassword}
                            onChange={(event) => setPasswordForm((prev) => ({ ...prev, oldPassword: event.target.value }))}
                            placeholder="Current password"
                            className="ui-input w-full rounded-lg px-3 py-2 pr-10 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOldPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200">
                            {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs uppercase tracking-wide text-slate-500">New Password</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={passwordForm.newPassword}
                            onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                            placeholder="New password"
                            className="ui-input w-full rounded-lg px-3 py-2 pr-10 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200">
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={updatePassword}
                        className="ui-btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide transition">
                        <KeyRound className="h-3.5 w-3.5" />
                        Update Password
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {authMessage && (
              <div className="xl:col-span-12">
                <div className="flex items-center rounded-lg border border-violet-300/35 bg-violet-300/12 p-2 text-xs text-violet-100">
                  <UserCircle className="mr-2 h-4 w-4" />
                  {authMessage}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="app-footer-shell relative z-10 mt-0">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-[clamp(2px,0.45vh,5px)] text-[clamp(9.5px,0.64vw,10.5px)] leading-[1.15] sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 whitespace-nowrap">
            <span>S2S Platform · Real-time Speech-to-Sign Translation</span>
            <span className="text-violet-200/90">
              Secure by design · Production-ready UX · Accessibility-first
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}









