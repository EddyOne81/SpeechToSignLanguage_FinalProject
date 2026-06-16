import React, { useEffect, useRef, useState } from "react";
import AppSidebar from "./components/AppSidebar";
import AppFooter from "./components/AppFooter";
import PageHeader from "./components/PageHeader";
import TranslateTab from "./tabs/TranslateTab";
import DictionaryTab from "./tabs/DictionaryTab";
import HistoryTab from "./tabs/HistoryTab";
import FeedbackTab from "./tabs/FeedbackTab";
import AccountTab from "./tabs/AccountTab";
import AdminTab from "./tabs/AdminTab";
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

export default function SignLanguageUI() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const stored = localStorage.getItem("s2s_theme");
    return stored === "light" ? "light" : "dark";
  });
  const [activeTab, setActiveTab] = useState<TabType>("translate");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("s2s_sidebar_collapsed") === "true";
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
    if (!authToken) {
      setProfile(null);
      return;
    }
    void loadProfile();
    void loadHistories(0);
  }, [authToken]);

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

  const applyTranslationResult = (data: any) => {
    const {
      recognized_text_en,
      pose_coordinates,
      pose_source_url,
      fps,
      offline_mode,
    } = data;

    const offline = offline_mode === true || (!pose_source_url && (!pose_coordinates || pose_coordinates.length === 0));
    setIsOfflineMode(offline);
    setTranscript(recognized_text_en);

    if (!offline) {
      setPoseBuffer({
        frames: pose_coordinates,
        fps,
        sourceUrl: pose_source_url,
      });
      console.log(`[System] Received ${pose_coordinates.length} JSON animation frames.`);
    } else {
      setPoseBuffer(null);
      console.warn("[System] Offline mode: Sign-MT cloud unavailable, animation not available.");
    }
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
      <div className={`relative z-10 flex w-full min-h-screen flex-col lg:flex-row${isSidebarCollapsed ? " sidebar-is-collapsed" : ""}`}>
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

        <div className="app-content flex min-h-screen min-w-0 flex-1 flex-col">
          <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col px-4 pb-5 pt-4 sm:px-6 sm:pb-6 lg:px-8">
        <PageHeader activeTab={activeTab} />

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
            authToken={authToken}
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
            authToken={authToken}
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
            authToken={authToken}
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

        {activeTab === "admin" && (
          <AdminTab
            authToken={authToken}
            authUser={authUser}
          />
        )}

        {activeTab === "account" && (
          <AccountTab
            authToken={authToken}
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
