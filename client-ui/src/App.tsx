import { useEffect, useState } from "react";
import SignLanguageUI from "./SignLanguageUI";
import AdminApp from "./admin/AdminApp";
import {
  BACKEND_BASE_URL,
  setToken,
  clearToken,
  withAuthHeaders,
  UNAUTHORIZED_EVENT,
} from "./utils/api";

type AuthUser = { username?: string; role?: string } | null;
type VerifyToast = { success: boolean; message: string } | null;

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminViewMode, setAdminViewMode] = useState<"dashboard" | "app">("dashboard");
  const [verifyToast, setVerifyToast] = useState<VerifyToast>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailVerified = params.get("emailVerified");
    if (emailVerified !== null) {
      const success = emailVerified === "true";
      const reason = params.get("reason");
      setVerifyToast({
        success,
        message: success
          ? "Email verified successfully! You can now access all features."
          : `Verification failed: ${reason ? decodeURIComponent(reason) : "Invalid or expired link."}`,
      });
      params.delete("emailVerified");
      params.delete("reason");
      const newUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
      window.history.replaceState({}, "", newUrl);
      if (success) {
        const t = setTimeout(() => setVerifyToast(null), 6000);
        return () => clearTimeout(t);
      }
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get("oauth_token");
    if (oauthToken) {
      // Persist the OAuth2 token so subsequent requests authenticate via header
      // even if the cross-site session cookie is blocked by the browser.
      setToken(oauthToken);
      params.delete("oauth_token");
      const newUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
      window.history.replaceState({}, "", newUrl);
    }

    fetch(`${BACKEND_BASE_URL}/api/auth/me`, {
      credentials: "include",
      headers: withAuthHeaders(undefined),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.data?.username) {
          const authorities: { authority: string }[] = body.data.authorities ?? [];
          const role = authorities.find((a) => a.authority.startsWith("ROLE_"))?.authority ?? "ROLE_USER";
          setAuthUser({ username: body.data.username, role });
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  const handleAuthChange = (user: AuthUser) => {
    setAuthUser(user);
    if (user?.role === "ROLE_ADMIN") {
      setAdminViewMode("dashboard");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        keepalive: true,
      });
    } catch {}
    clearToken();
    setAuthUser(null);
    setAdminViewMode("dashboard");
  };

  // When any API call reports the session is no longer valid (401), drop the
  // cached login state so the UI prompts for re-login instead of appearing
  // logged-in while every protected action fails.
  useEffect(() => {
    const onUnauthorized = () => {
      setAuthUser(null);
      setAdminViewMode("dashboard");
      setVerifyToast({
        success: false,
        message: "Your session has expired. Please log in again.",
      });
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  const isAdmin = authUser?.role === "ROLE_ADMIN";

  if (isAdmin && adminViewMode === "dashboard") {
    return (
      <AdminApp
        authUser={authUser!}
        onGoToApp={() => setAdminViewMode("app")}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden">
      <SignLanguageUI
        onAuthChange={handleAuthChange}
        isAdminMode={isAdmin && adminViewMode === "app"}
        onBackToDashboard={() => setAdminViewMode("dashboard")}
        initialAuthUser={authUser}
        onLogout={handleLogout}
      />

      {verifyToast && (
        <div className={`fixed bottom-6 left-1/2 z-[9999] flex -translate-x-1/2 items-start gap-3 rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur-sm transition-all ${
          verifyToast.success
            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
            : "border-rose-500/40 bg-rose-500/15 text-rose-300"
        }`}
          style={{ maxWidth: "420px", width: "calc(100vw - 2rem)" }}
        >
          <span className="mt-0.5 text-lg">{verifyToast.success ? "✓" : "✕"}</span>
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {verifyToast.success ? "Email Verified" : "Verification Failed"}
            </p>
            <p className="mt-0.5 text-xs opacity-80">{verifyToast.message}</p>
          </div>
          <button
            onClick={() => setVerifyToast(null)}
            className="shrink-0 opacity-60 hover:opacity-100 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
