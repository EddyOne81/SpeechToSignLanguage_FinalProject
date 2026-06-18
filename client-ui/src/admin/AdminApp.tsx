import { useState } from "react";
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
    <div className={`flex h-screen overflow-hidden bg-neutral-950 text-neutral-100${theme === "light" ? " theme-light" : ""}`}>
      <AdminSidebar
        activePage={activePage}
        setActivePage={setActivePage}
        authUser={authUser}
        theme={theme}
        onToggleTheme={toggleTheme}
        onGoToApp={onGoToApp}
        onLogout={onLogout}
      />
      <main className="flex-1 overflow-hidden p-6 flex flex-col">{renderPage()}</main>
    </div>
  );
}
