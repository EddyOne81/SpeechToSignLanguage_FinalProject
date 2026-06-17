import { useEffect, useState } from "react";
import SignLanguageUI from "./SignLanguageUI";
import AdminApp from "./admin/AdminApp";
import { BACKEND_BASE_URL } from "./utils/api";

type AuthUser = { username?: string; role?: string } | null;

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminViewMode, setAdminViewMode] = useState<"dashboard" | "app">("dashboard");

  useEffect(() => {
    fetch(`${BACKEND_BASE_URL}/api/auth/me`, { credentials: "include" })
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
    setAuthUser(null);
    setAdminViewMode("dashboard");
  };

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
    <div className="w-full min-h-screen">
      <SignLanguageUI
        onAuthChange={handleAuthChange}
        isAdminMode={isAdmin && adminViewMode === "app"}
        onBackToDashboard={() => setAdminViewMode("dashboard")}
        initialAuthUser={authUser}
        onLogout={handleLogout}
      />
    </div>
  );
}
