import {
  BarChart3,
  BookOpen,
  ExternalLink,
  History,
  LogOut,
  MessageSquare,
  Moon,
  Shield,
  ShieldCheck,
  Sun,
  X,
  type LucideIcon,
  Users,
} from "lucide-react";
import type { AdminPage } from "./AdminApp";

const NAV_ITEMS: { page: AdminPage; label: string; icon: LucideIcon }[] = [
  { page: "dashboard", label: "Dashboard", icon: BarChart3 },
  { page: "users", label: "User Management", icon: Users },
  { page: "roles", label: "Roles & Permissions", icon: Shield },
  { page: "dictionary", label: "Dictionary", icon: BookOpen },
  { page: "histories", label: "All Histories", icon: History },
  { page: "feedback", label: "All Feedback", icon: MessageSquare },
];

interface AdminSidebarProps {
  activePage: AdminPage;
  setActivePage: (page: AdminPage) => void;
  authUser: { username?: string; role?: string };
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onGoToApp: () => void;
  onLogout: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export default function AdminSidebar({
  activePage,
  setActivePage,
  authUser,
  theme,
  onToggleTheme,
  onGoToApp,
  onLogout,
  isMobileOpen,
  onMobileClose,
}: AdminSidebarProps) {
  return (
    <aside
      className={[
        "flex w-60 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900",
        "fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out",
        "lg:relative lg:translate-x-0 lg:transition-none",
        isMobileOpen ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
    >
      <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 shrink-0 text-indigo-400" />
          <span className="text-sm font-bold tracking-tight text-neutral-100">Admin Panel</span>
        </div>
        <button
          onClick={onMobileClose}
          className="rounded-md p-1 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-200 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 p-2 pt-3">
        {NAV_ITEMS.map(({ page, label, icon: Icon }) => (
          <button
            key={page}
            onClick={() => {
              setActivePage(page);
              onMobileClose();
            }}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
              activePage === page
                ? "bg-indigo-600 text-white"
                : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      <div className="border-t border-neutral-800 p-2 space-y-1">
        <button
          onClick={onToggleTheme}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
        >
          {theme === "dark" ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
        <button
          onClick={onGoToApp}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-emerald-400 transition-colors hover:bg-neutral-800 hover:text-emerald-300"
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          Go to App
        </button>

        <div className="flex items-center gap-2.5 rounded-md px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            {(authUser.username ?? "A").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-neutral-200">{authUser.username}</p>
            <button
              onClick={onLogout}
              className="mt-0.5 flex items-center gap-1 text-[11px] uppercase tracking-wide text-rose-400 transition-colors hover:text-rose-300"
            >
              <LogOut className="h-3 w-3" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
