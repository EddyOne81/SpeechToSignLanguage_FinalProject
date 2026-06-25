import { useState } from "react";
import { Menu } from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import RolesPage from "./pages/RolesPage";
import DictionaryPage from "./pages/DictionaryPage";
import HistoriesPage from "./pages/HistoriesPage";
import FeedbackPage from "./pages/FeedbackPage";

export type AdminPage =
  | "dashboard"
  | "users"
  | "roles"
  | "dictionary"
  | "histories"
  | "feedback";

interface AdminAppProps {
  authUser: { username?: string; role?: string };
  onGoToApp: () => void;
  onLogout: () => void;
}

export default function AdminApp({ authUser, onGoToApp, onLogout }: AdminAppProps) {
  const [activePage, setActivePage] = useState<AdminPage>("dashboard");
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (localStorage.getItem("s2s_admin_theme") === "light" ? "light" : "dark")
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("s2s_admin_theme", next);
  };

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <DashboardPage />;
      case "users":
        return <UsersPage />;
      case "roles":
        return <RolesPage />;
      case "dictionary":
        return <DictionaryPage />;
      case "histories":
        return <HistoriesPage />;
      case "feedback":
        return <FeedbackPage />;
    }
  };

  return (
    <div className={`admin-panel flex h-dvh overflow-hidden bg-neutral-950 text-neutral-100${theme === "light" ? " theme-light" : ""}`}>
      {/* Mobile overlay backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <AdminSidebar
        activePage={activePage}
        setActivePage={setActivePage}
        authUser={authUser}
        theme={theme}
        onToggleTheme={toggleTheme}
        onGoToApp={onGoToApp}
        onLogout={onLogout}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Mobile topbar with hamburger */}
        <div className="flex items-center gap-3 border-b border-neutral-800 px-4 py-3 lg:hidden">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-neutral-100">Admin Panel</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
