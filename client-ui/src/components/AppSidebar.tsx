import React from "react";
import {
  BookOpen,
  History,
  LogOut,
  type LucideIcon,
  Menu,
  MessageSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PlayCircle,
  Sun,
  UserCircle,
  X,
} from "lucide-react";
import type { TabType } from "../types";

interface AppSidebarProps {
  theme: "dark" | "light";
  setTheme: React.Dispatch<React.SetStateAction<"dark" | "light">>;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  authUser: { username?: string; role?: string } | null;
  handleLogout: () => void;
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileOpen: boolean;
  setIsMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const NAV_ITEMS: { tab: TabType; label: string; icon: LucideIcon }[] = [
  { tab: "translate", label: "Translate", icon: PlayCircle },
  { tab: "dictionary", label: "Dictionary", icon: BookOpen },
  { tab: "history", label: "History", icon: History },
  { tab: "feedback", label: "Feedback", icon: MessageSquare },
  { tab: "account", label: "Account", icon: UserCircle },
];

export default function AppSidebar({
  theme,
  setTheme,
  activeTab,
  setActiveTab,
  authUser,
  handleLogout,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}: AppSidebarProps) {
  const navItems = NAV_ITEMS;

  const handleNavClick = (tab: TabType) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <>
      <header className="app-mobile-topbar flex items-center justify-between gap-3 px-3.5 py-2.5 lg:hidden">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="ui-btn-secondary flex items-center justify-center rounded-full p-2"
          aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <span className="truncate text-sm font-bold tracking-tight">S2S - Speech 2 Sign</span>
        <button
          onClick={toggleTheme}
          className="ui-btn-secondary flex items-center justify-center rounded-full p-2"
          aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      {isMobileOpen && (
        <div
          className="sidebar-overlay lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`app-sidebar ${isCollapsed ? "collapsed" : ""} ${isMobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          {!isCollapsed && (
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="sidebar-logo shrink-0">S2S</div>
              <span className="truncate text-sm font-bold tracking-tight">
                S2S - Speech 2 Sign
              </span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="sidebar-collapse-btn hidden items-center justify-center lg:flex"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar">
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="sidebar-collapse-btn flex items-center justify-center lg:hidden"
            aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ tab, label, icon: Icon }) => (
            <button
              key={tab}
              onClick={() => handleNavClick(tab)}
              className={`sidebar-nav-item ${activeTab === tab ? "active" : ""}`}
              title={isCollapsed ? label : undefined}>
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!isCollapsed && <span className="truncate">{label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={toggleTheme}
            className="sidebar-nav-item"
            title={isCollapsed ? "Toggle theme" : undefined}>
            {theme === "dark" ? (
              <Sun className="h-[18px] w-[18px] shrink-0" />
            ) : (
              <Moon className="h-[18px] w-[18px] shrink-0" />
            )}
            {!isCollapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
          </button>

          {authUser ? (
            <div className="sidebar-user">
              <div className="sidebar-user-avatar shrink-0">
                <UserCircle className="h-[18px] w-[18px]" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{authUser.username}</p>
                  <button
                    onClick={handleLogout}
                    className="mt-0.5 flex items-center gap-1 text-[11px] uppercase tracking-wide text-rose-400 transition hover:text-rose-300">
                    <LogOut className="h-3 w-3" />
                    Logout
                  </button>
                </div>
              )}
              {isCollapsed && (
                <button
                  onClick={handleLogout}
                  className="text-rose-400 transition hover:text-rose-300"
                  title="Logout"
                  aria-label="Logout">
                  <LogOut className="h-[18px] w-[18px]" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => handleNavClick("account")}
              className="sidebar-nav-item"
              title={isCollapsed ? "Log in" : undefined}>
              <UserCircle className="h-[18px] w-[18px] shrink-0" />
              {!isCollapsed && <span>Log in</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
