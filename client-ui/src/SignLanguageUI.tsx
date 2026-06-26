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
import FeedbackModal from "./components/FeedbackModal";
import {
  BACKEND_BASE_URL,
  extractErrorMessage,
  extractPageContent,
  extractPayloadFromApiResponse,
  unwrapApiResponse,
  withAuthHeaders,
  notifyUnauthorized,
  setToken,
} from "./utils/api";
import { recordedBlobToWav } from "./utils/audio";
import type {
  DictionaryItem,
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
  // Tabs already loaded this session — avoid re-fetching (and re-spinning) on
  // every tab switch, which is slow because each call is a cross-region DB hit.
  const loadedTabsRef = useRef<Set<string>>(new Set());

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
  const [dictSort, setDictSort] = useState<"az" | "za">("az");

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyPage, setHistoryPage] = useState(0);
  const [historySize] = useState(8);
  const [historyTotalPages, setHistoryTotalPages] = useState(0);
  const [historyTotalElements, setHistoryTotalElements] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historySort, setHistorySort] = useState<"latest" | "oldest">("latest");

  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [feedbackPage, setFeedbackPage] = useState(0);
  const [feedbackSize] = useState(10);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(0);
  const [feedbackTotalElements, setFeedbackTotalElements] = useState(0);
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [feedbackSort, setFeedbackSort] = useState<FeedbackSortType>("latest");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  // Feedback is now created/edited through a modal opened from a history item
  // (or the feedback list's Edit button), not an inline form.
  const [feedbackModal, setFeedbackModal] = useState<{
    historyId: number;
    historyText?: string;
    rating: number;
    comment: string;
  } | null>(null);

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
    // Reset per-tab load cache so a different user never sees the previous
    // user's data; history is (re)loaded fresh just below.
    loadedTabsRef.current = new Set(["history"]);
    if (!authUser) {
      setProfile(null);
      return;
    }
    void loadProfile();
    void loadHistories(0);
  }, [authUser?.username]);

  useEffect(() => {
    // Only auto-load a tab the first time it is opened this session. Returning
    // to it shows the already-fetched data instantly; explicit actions (search,
    // pagination, post-translation reload) still fetch fresh data.
    if (activeTab === "dictionary") {
      if (loadedTabsRef.current.has("dictionary")) return;
      loadedTabsRef.current.add("dictionary");
      void loadDictionary();
    }
    if (activeTab === "history") {
      if (skipHistoryAutoLoadRef.current) {
        skipHistoryAutoLoadRef.current = false;
        return;
      }
      if (loadedTabsRef.current.has("history")) return;
      loadedTabsRef.current.add("history");
      void loadHistories();
    }
    if (activeTab === "feedback") {
      if (loadedTabsRef.current.has("feedback")) return;
      loadedTabsRef.current.add("feedback");
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

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const recordedType = mediaRecorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: recordedType });

        if (audioBlob.size === 0) {
          setErrorMsg("No audio was captured. Please try recording again.");
          return;
        }

        // Re-encode to a clean WAV so Whisper transcribes reliably — the raw
        // MediaRecorder webm often decodes as silence and yields garbage like "You".
        try {
          const wavBlob = await recordedBlobToWav(audioBlob);
          setAudioFile(new File([wavBlob], "recorded_audio.wav", { type: "audio/wav" }));
        } catch (err) {
          if ((err as Error)?.message === "SILENT_AUDIO") {
            // Capture was (near) silent — translating it would just return a
            // hallucinated "You". Tell the user to fix their mic instead.
            setAudioFile(null);
            setErrorMsg(
              "No speech was detected. Check that the right microphone is selected and not muted, then record again.",
            );
            return;
          }
          console.warn("[System] WAV conversion failed, sending original recording.", err);
          const ext = recordedType.includes("mp4") ? "m4a" : "webm";
          setAudioFile(new File([audioBlob], `recorded_audio.${ext}`, { type: recordedType }));
        }
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

    const hasData = !!pose_source_url;
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
      setPoseBuffer({ frames: pose_coordinates ?? [], fps: fps ?? 25, sourceUrl: blobUrl });
    } catch {
      console.warn("[System] Pose binary unavailable for this phrase — animation disabled.");
      setIsOfflineMode(true);
      setPoseBuffer(null);
    }
  };

  const apiRequest = async (path: string, options: RequestInit = {}) => {
    const headers = withAuthHeaders(options.headers as HeadersInit | undefined);
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

    // 401 on a non-login request means our session/token is no longer valid.
    // Don't trip this on the login/register calls themselves (bad credentials).
    if (response.status === 401 && !path.startsWith("/api/auth/")) {
      notifyUnauthorized();
      throw new Error("Your session has expired. Please log in again.");
    }

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
      if (payload.token) setToken(payload.token);
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
      if (payload.token) setToken(payload.token);
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

  const loadDictionary = async (
    targetPage = dictPage,
    overrideQuery?: string,
    overrideSort?: "az" | "za",
  ) => {
    setDictLoading(true);
    setDictError(null);
    try {
      const query = (overrideQuery ?? dictQuery).trim();
      const sort = (overrideSort ?? dictSort) === "za" ? "englishText,desc" : "englishText,asc";
      const response = await apiRequest(
        `/api/dictionaries?q=${encodeURIComponent(query)}&page=${targetPage}&size=${dictSize}&sort=${sort}`,
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

  const loadHistories = async (
    targetPage = historyPage,
    overrideQuery?: string,
    overrideSort?: "latest" | "oldest",
  ) => {
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
        const sort = (overrideSort ?? historySort) === "oldest" ? "createdAt,asc" : "createdAt,desc";
        const response = await apiRequest(
          `/api/histories/me?page=${targetPage}&size=${historySize}${qParam}&sort=${sort}`,
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
    overrideQuery?: string,
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
      const searchQuery = (overrideQuery ?? feedbackSearch).trim();
      const sort = overrideSort ?? feedbackSort;
      const sortQuery =
        sort === "latest"
          ? "createdAt,desc"
          : sort === "oldest"
            ? "createdAt,asc"
            : sort === "rating_high"
              ? "rating,desc"
              : "rating,asc";
      const searchFilter = searchQuery
        ? `&q=${encodeURIComponent(searchQuery)}`
        : "";
      const response = await apiRequest(
        `/api/feedbacks/me?page=${targetPage}&size=${feedbackSize}&sort=${sortQuery}${searchFilter}`,
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

  const openFeedbackModal = async (payload: {
    historyId: number;
    historyText?: string;
    rating?: number;
    comment?: string;
  }) => {
    let rating = payload.rating;
    let comment = payload.comment;
    // Opened from a history item (no values passed): prefill with the existing
    // feedback for that history if there is one, so re-rating shows what they
    // gave before instead of silently overwriting it with defaults.
    if (rating === undefined && authUser) {
      try {
        const res = await apiRequest(
          `/api/feedbacks/me?page=0&size=1&historyId=${payload.historyId}`,
        );
        const page = extractPageContent(res);
        const existing = (page.content || []).find(
          (item: FeedbackItem) => Number(item.historyId) === payload.historyId,
        );
        if (existing) {
          rating = existing.rating;
          comment = existing.comment;
        }
      } catch {
        // ignore — fall back to defaults
      }
    }
    setFeedbackModal({
      historyId: payload.historyId,
      historyText: payload.historyText,
      rating: rating ?? 5,
      comment: comment ?? "",
    });
  };

  // Create the feedback for a history, or update it if one already exists.
  // Throws on failure so the modal can surface the error inline.
  const upsertFeedback = async (
    historyId: number,
    rating: number,
    comment: string,
  ) => {
    if (!authUser) {
      throw new Error("Login required.");
    }
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
      body: JSON.stringify({ historyId, rating, comment }),
    });
    void loadFeedbacks(0);
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
        headers: withAuthHeaders(undefined),
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
      className={`app-shell ${theme === "dark" ? "theme-dark" : "theme-light"} relative h-dvh w-full overflow-hidden`}>
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
          <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1600px] flex-none flex-col px-4 pb-5 pt-4 sm:px-6 sm:pb-6 lg:px-8 xl:flex-1">
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
            dictSort={dictSort}
            setDictSort={setDictSort}
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
            historySort={historySort}
            setHistorySort={setHistorySort}
            loadHistories={loadHistories}
            deleteHistory={deleteHistory}
            deleteAllHistories={deleteAllHistories}
            replayHistory={replayHistory}
            openFeedbackModal={openFeedbackModal}
          />
        )}

        {activeTab === "feedback" && (
          <FeedbackTab
            isLoggedIn={!!authUser}
            feedbackItems={feedbackItems}
            feedbackPage={feedbackPage}
            feedbackTotalPages={feedbackTotalPages}
            feedbackTotalElements={feedbackTotalElements}
            feedbackSearch={feedbackSearch}
            setFeedbackSearch={setFeedbackSearch}
            feedbackSort={feedbackSort}
            setFeedbackSort={setFeedbackSort}
            feedbackLoading={feedbackLoading}
            feedbackError={feedbackError}
            loadFeedbacks={loadFeedbacks}
            deleteFeedback={deleteFeedback}
            openHistoryFromFeedback={openHistoryFromFeedback}
            openFeedbackModal={openFeedbackModal}
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

      <FeedbackModal
        open={feedbackModal !== null}
        historyText={feedbackModal?.historyText}
        initialRating={feedbackModal?.rating ?? 5}
        initialComment={feedbackModal?.comment ?? ""}
        onClose={() => setFeedbackModal(null)}
        onSubmit={(rating, comment) =>
          upsertFeedback(feedbackModal!.historyId, rating, comment)
        }
      />
    </div>
  );
}
