import React, { useEffect, useRef, useState } from "react";
import { Loader2, MailWarning, Send, X } from "lucide-react";
import AppSidebar from "./components/AppSidebar";
import AppFooter from "./components/AppFooter";
import PageHeader from "./components/PageHeader";
import TranslateTab from "./tabs/TranslateTab";
import DictionaryTab from "./tabs/DictionaryTab";
import HistoryTab from "./tabs/HistoryTab";
import FeedbackTab from "./tabs/FeedbackTab";
import AccountTab from "./tabs/AccountTab";
import {
  BACKEND_BASE_URL,
  extractErrorMessage,
  extractPageContent,
  extractPayloadFromApiResponse,
  unwrapApiResponse,
} from "./utils/api";
import type {
  DictionaryItem,
  FeedbackFormData,
  FeedbackItem,
  FeedbackSortType,
  HistoryItem,
  InputModeType,
  LangType,
  PoseBuffer,
  TabType,
  UserProfile,
} from "./types";

interface SignLanguageUIProps {
  onAuthChange?: (user: { username?: string; role?: string } | null) => void;
  onLogout?: () => void;
  isAdminMode?: boolean;
  onBackToDashboard?: () => void;
  initialAuthUser?: { username?: string; role?: string } | null;
}

export default function SignLanguageUI({
  onAuthChange,
  onLogout,
  isAdminMode = false,
  onBackToDashboard,
  initialAuthUser = null,
}: SignLanguageUIProps = {}) {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const stored = localStorage.getItem("s2s_theme");
    return stored === "light" ? "light" : "dark";
  });
  const [activeTab, setActiveTab] = useState<TabType>("translate");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("s2s_sidebar_collapsed") === "true";
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [authUser, setAuthUser] = useState<{
    username?: string;
    role?: string;
  } | null>(initialAuthUser);

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<InputModeType>("text");
  const [inputText, setInputText] = useState<string>("Hello");
  const [inputLang, setInputLang] = useState<LangType>("en");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const skipHistoryAutoLoadRef = useRef(false);

  const [transcript, setTranscript] = useState<string>("");
  const [poseBuffer, setPoseBuffer] = useState<PoseBuffer | null>(null);
  const prevBlobUrlRef = useRef<string | null>(null);

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
  const [historySize] = useState(8);
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
  const [feedbackSort, setFeedbackSort] = useState<FeedbackSortType>("latest");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackForm, setFeedbackForm] = useState<FeedbackFormData>({
    historyId: "",
    rating: "5",
    comment: "",
  });

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({ email: "" });

  const [emailBannerDismissed, setEmailBannerDismissed] = useState(false);
  const [resendVerifyLoading, setResendVerifyLoading] = useState(false);
  const [resendVerifyMsg, setResendVerifyMsg] = useState<string | null>(null);
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
    localStorage.setItem("s2s_sidebar_collapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setEmailBannerDismissed(false);
    if (!authUser) {
      setProfile(null);
      return;
    }
    void loadProfile();
    void loadHistories(0);
  }, [authUser?.username]);

  useEffect(() => {
    if (activeTab === "dictionary") {
      void loadDictionary();
    }
    if (activeTab === "history") {
      if (skipHistoryAutoLoadRef.current) {
        skipHistoryAutoLoadRef.current = false;
        return;
      }
      void loadHistories();
    }
    if (activeTab === "feedback") {
      void loadFeedbacks();
    }
  }, [activeTab]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("File too large. Maximum size is 10 MB.");
      event.target.value = "";
      return;
    }

    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.addEventListener("loadedmetadata", () => {
      URL.revokeObjectURL(url);
      if (audio.duration > 60) {
        setErrorMsg("Audio too long. Maximum duration is 60 seconds.");
        event.target.value = "";
        return;
      }
      setAudioFile(file);
      setErrorMsg(null);
    });
    audio.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      setAudioFile(file);
      setErrorMsg(null);
    });
    audio.src = url;
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
        "Cannot access microphone. Please allow microphone access in your browser settings.",
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

  const applyTranslationResult = async (data: any) => {
    const {
      recognized_text_en,
      pose_coordinates,
      pose_source_url,
      fps,
      offline_mode,
    } = data;

    setTranscript(recognized_text_en);
    console.log(`[System] Received ${pose_coordinates?.length ?? 0} JSON animation frames.`);

    const hasData = pose_source_url && pose_coordinates?.length > 0;
    if (offline_mode === true || !hasData) {
      setIsOfflineMode(true);
      setPoseBuffer(null);
      console.warn("[System] Offline mode: animation not available.");
      return;
    }

    // Resolve to a backend-relative path and prepend BACKEND_BASE_URL so the
    // request goes to Railway (Spring Boot), not the Netlify frontend origin.
    const posePath = (() => {
      try {
        const { pathname, search } = new URL(pose_source_url);
        return pathname + search;
      } catch {
        return pose_source_url as string;
      }
    })();

    try {
      const res = await fetch(`${BACKEND_BASE_URL}${posePath}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
      }
      const blobUrl = URL.createObjectURL(blob);
      prevBlobUrlRef.current = blobUrl;
      setIsOfflineMode(false);
      setPoseBuffer({ frames: pose_coordinates, fps, sourceUrl: blobUrl });
    } catch {
      console.warn("[System] Pose binary unavailable for this phrase — animation disabled.");
      setIsOfflineMode(true);
      setPoseBuffer(null);
    }
  };

  const apiRequest = async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (
      !headers.has("Content-Type") &&
      options.body &&
      !(options.body instanceof FormData)
    ) {
      headers.set("Content-Type", "application/json");
    }
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(extractErrorMessage(body));
    }
    return body;
  };

  const handleLogin = async () => {
    setAuthMessage(null);
    try {
      const response = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(loginForm),
      });
      const payload = unwrapApiResponse(response);
      if (!payload?.username) {
        throw new Error("Login response missing user info.");
      }
      const user = { username: payload.username, role: payload.role };
      setAuthUser(user);
      onAuthChange?.(user);
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
      if (!payload?.username) {
        throw new Error("Register response missing user info.");
      }
      const user = { username: payload.username, role: payload.role };
      setAuthUser(user);
      onAuthChange?.(user);
      setAuthMessage(payload.emailVerified ? "Account created!" : "Account created! Check your email to verify.");
      setRegisterForm({ username: "", email: "", password: "" });
    } catch (err: any) {
      setAuthMessage(err.message || "Register failed.");
    }
  };

  const handleLogout = () => {
    setAuthUser(null);
    onAuthChange?.(null);
    setAuthMessage("");
    onLogout?.();
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
    if (!authUser) {
      setHistoryItems([]);
      setHistoryTotalPages(0);
      setHistoryTotalElements(0);
      return;
    }
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const query = (overrideQuery ?? historyQuery).trim();
      const numericId =
        query !== "" && /^\d+$/.test(query) && Number(query) > 0
          ? Number(query)
          : null;

      if (numericId !== null) {
        const response = await apiRequest(`/api/histories/me/${numericId}`);
        const payload = unwrapApiResponse(response);
        setHistoryItems(payload ? [payload] : []);
        setHistoryTotalElements(payload ? 1 : 0);
        setHistoryTotalPages(payload ? 1 : 0);
        setHistoryPage(0);
      } else {
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
      }
    } catch (err: any) {
      setHistoryError(err.message || "Failed to load histories.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadFeedbacks = async (
    targetPage = feedbackPage,
    overrideHistoryId?: string,
    overrideSort?: FeedbackSortType,
  ) => {
    if (!authUser) {
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
          ? "createdAt,desc"
          : sort === "oldest"
            ? "createdAt,asc"
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
    if (!authUser) {
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
    if (!authUser) return;
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
    if (!authUser) return;
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
    if (!authUser) {
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
    if (!historyId || !authUser) {
      return;
    }
    try {
      const response = await apiRequest(`/api/histories/me/${historyId}`);
      const payload = unwrapApiResponse(response);
      skipHistoryAutoLoadRef.current = true;
      setHistoryQuery(String(historyId));
      setHistoryItems(payload ? [payload] : []);
      setHistoryTotalElements(payload ? 1 : 0);
      setHistoryTotalPages(payload ? 1 : 0);
      setHistoryPage(0);
      setActiveTab("history");
    } catch {
      setHistoryQuery("");
      setActiveTab("history");
    }
  };

  const handleResendVerification = async () => {
    setResendVerifyLoading(true);
    setResendVerifyMsg(null);
    try {
      await fetch(`${BACKEND_BASE_URL}/api/auth/resend-verification`, {
        method: "POST",
        credentials: "include",
      });
      setResendVerifyMsg("Verification email sent! Check your inbox.");
    } catch {
      setResendVerifyMsg("Failed to send email. Please try again.");
    } finally {
      setResendVerifyLoading(false);
    }
  };

  const loadProfile = async () => {
    if (!authUser) {
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
    if (!authUser) {
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
    if (!authUser) {
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

  const startTextTranslation = async (overrideText?: string) => {
    const text = (overrideText ?? inputText).trim();
    if (!text) {
      setErrorMsg("Please enter text before translating.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setTranscript("");
    setPoseBuffer(null);
    setIsOfflineMode(false);

    try {
      const result = await apiRequest("/api/translate/text", {
        method: "POST",
        body: JSON.stringify({
          text,
          spoken_lang: inputLang,
          signed_lang: "ase",
        }),
      });

      const payload = extractPayloadFromApiResponse(result);
      if (!payload) {
        throw new Error("Unexpected response payload from backend.");
      }

      await applyTranslationResult(payload);
      void loadHistories(0);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred.");
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
      setErrorMsg("Please upload an audio file or record directly.");
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

      await applyTranslationResult(payload);
      void loadHistories(0);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className={`app-shell ${theme === "dark" ? "theme-dark" : "theme-light"} relative h-screen w-full overflow-hidden`}>
      <div className={`relative z-10 flex w-full h-full flex-col lg:flex-row${isSidebarCollapsed ? " sidebar-is-collapsed" : ""}`}>
        <AppSidebar
          theme={theme}
          setTheme={setTheme}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          authUser={authUser}
          handleLogout={handleLogout}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          setIsMobileOpen={setIsMobileSidebarOpen}
        />

        <div className="app-content flex h-full min-w-0 flex-1 flex-col overflow-y-auto xl:overflow-hidden">
          {isAdminMode && (
            <div className="flex items-center justify-between gap-3 bg-indigo-600 px-4 py-2 text-sm text-white">
              <span className="font-medium">Viewing as user (Admin mode)</span>
              <button
                onClick={onBackToDashboard}
                className="flex items-center gap-1.5 rounded-md bg-white/20 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/30"
              >
                ← Back to Dashboard
              </button>
            </div>
          )}
          <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col px-4 pb-5 pt-4 sm:px-6 sm:pb-6 lg:px-8">
        <PageHeader activeTab={activeTab} />

        {authUser && profile?.emailVerified === false && !emailBannerDismissed && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-300">Email not verified</p>
              {resendVerifyMsg ? (
                <p className="mt-0.5 text-xs text-emerald-400">{resendVerifyMsg}</p>
              ) : (
                <p className="mt-0.5 text-xs text-amber-300/80">
                  Some features are locked until you verify your email.{" "}
                  <button
                    onClick={handleResendVerification}
                    disabled={resendVerifyLoading}
                    className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-amber-200 disabled:opacity-50"
                  >
                    {resendVerifyLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    Resend verification email
                  </button>
                </p>
              )}
            </div>
            <button
              onClick={() => setEmailBannerDismissed(true)}
              className="shrink-0 rounded p-0.5 text-amber-400/60 hover:text-amber-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {activeTab === "translate" && (
          <TranslateTab
            inputMode={inputMode}
            setInputMode={setInputMode}
            inputText={inputText}
            setInputText={setInputText}
            inputLang={inputLang}
            setInputLang={setInputLang}
            audioFile={audioFile}
            isProcessing={isProcessing}
            errorMsg={errorMsg}
            isRecording={isRecording}
            recordingTime={recordingTime}
            poseBuffer={poseBuffer}
            transcript={transcript}
            isOfflineMode={isOfflineMode}
            handleFileChange={handleFileChange}
            startRecording={startRecording}
            stopRecording={stopRecording}
            startTextTranslation={startTextTranslation}
            startTranslation={startTranslation}
            isLoggedIn={!!authUser}
            recentItems={historyItems.slice(0, 3)}
            setActiveTab={setActiveTab}
            replayHistory={replayHistory}
          />
        )}

        {activeTab === "dictionary" && (
          <DictionaryTab
            dictQuery={dictQuery}
            setDictQuery={setDictQuery}
            dictItems={dictItems}
            dictPage={dictPage}
            dictTotalPages={dictTotalPages}
            dictTotalElements={dictTotalElements}
            dictLoading={dictLoading}
            dictError={dictError}
            loadDictionary={loadDictionary}
            setInputText={setInputText}
            setActiveTab={setActiveTab}
            startTextTranslation={startTextTranslation}
          />
        )}

        {activeTab === "history" && (
          <HistoryTab
            isLoggedIn={!!authUser}
            historyItems={historyItems}
            historyQuery={historyQuery}
            setHistoryQuery={setHistoryQuery}
            historyPage={historyPage}
            historyTotalPages={historyTotalPages}
            historyTotalElements={historyTotalElements}
            historyLoading={historyLoading}
            historyError={historyError}
            loadHistories={loadHistories}
            deleteHistory={deleteHistory}
            deleteAllHistories={deleteAllHistories}
            replayHistory={replayHistory}
            setFeedbackForm={setFeedbackForm}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === "feedback" && (
          <FeedbackTab
            isLoggedIn={!!authUser}
            feedbackItems={feedbackItems}
            feedbackPage={feedbackPage}
            feedbackTotalPages={feedbackTotalPages}
            feedbackTotalElements={feedbackTotalElements}
            feedbackHistoryIdSearch={feedbackHistoryIdSearch}
            setFeedbackHistoryIdSearch={setFeedbackHistoryIdSearch}
            feedbackSort={feedbackSort}
            setFeedbackSort={setFeedbackSort}
            feedbackLoading={feedbackLoading}
            feedbackSubmitting={feedbackSubmitting}
            feedbackError={feedbackError}
            feedbackForm={feedbackForm}
            setFeedbackForm={setFeedbackForm}
            loadFeedbacks={loadFeedbacks}
            submitFeedback={submitFeedback}
            deleteFeedback={deleteFeedback}
            openHistoryFromFeedback={openHistoryFromFeedback}
          />
        )}

        {activeTab === "account" && (
          <AccountTab
            isLoggedIn={!!authUser}
            authUser={authUser}
            authMessage={authMessage}
            profile={profile}
            profileLoading={profileLoading}
            profileError={profileError}
            loginForm={loginForm}
            setLoginForm={setLoginForm}
            registerForm={registerForm}
            setRegisterForm={setRegisterForm}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            passwordForm={passwordForm}
            setPasswordForm={setPasswordForm}
            showOldPassword={showOldPassword}
            setShowOldPassword={setShowOldPassword}
            showNewPassword={showNewPassword}
            setShowNewPassword={setShowNewPassword}
            handleLogin={handleLogin}
            handleRegister={handleRegister}
            handleLogout={handleLogout}
            loadProfile={loadProfile}
            updateProfile={updateProfile}
            updatePassword={updatePassword}
          />
        )}
      </main>

          <AppFooter />
        </div>
      </div>
    </div>
  );
}
