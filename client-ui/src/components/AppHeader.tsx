import React from "react";
import {
  BookOpen,
  History,
  LogOut,
  MessageSquare,
  Moon,
  PlayCircle,
  Sun,
  UserCircle,
} from "lucide-react";
import type { TabType } from "../types";

interface AppHeaderProps {
  isHeaderCompact: boolean;
  theme: "dark" | "light";
  setTheme: React.Dispatch<React.SetStateAction<"dark" | "light">>;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  authUser: { username?: string; role?: string } | null;
  handleLogout: () => void;
}

const tabButtonClass = (activeTab: TabType, tab: TabType) => {
  const isActive = activeTab === tab;
  return `flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] transition-all ${
    isActive ? "ui-tab-active" : "ui-tab-idle"
  }`;
};

export default function AppHeader({
  isHeaderCompact,
  theme,
  setTheme,
  activeTab,
  setActiveTab,
  authUser,
  handleLogout,
}: AppHeaderProps) {
  return (
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
              className={tabButtonClass(activeTab, "translate")}
              onClick={() => setActiveTab("translate")}>
              <PlayCircle className="h-4 w-4" />
              Translate
            </button>
            <button
              className={tabButtonClass(activeTab, "dictionary")}
              onClick={() => setActiveTab("dictionary")}>
              <BookOpen className="h-4 w-4" />
              Dictionary
            </button>
            <button
              className={tabButtonClass(activeTab, "history")}
              onClick={() => setActiveTab("history")}>
              <History className="h-4 w-4" />
              History
            </button>
            <button
              className={tabButtonClass(activeTab, "feedback")}
              onClick={() => setActiveTab("feedback")}>
              <MessageSquare className="h-4 w-4" />
              Feedback
            </button>
            <button
              className={tabButtonClass(activeTab, "account")}
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
  );
}
