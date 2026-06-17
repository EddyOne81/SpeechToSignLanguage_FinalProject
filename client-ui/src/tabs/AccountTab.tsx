import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  UserCircle,
  UserPlus,
} from "lucide-react";
import { formatDate } from "../utils/format";
import { BACKEND_BASE_URL } from "../utils/api";
import type { UserProfile } from "../types";

interface AccountTabProps {
  isLoggedIn: boolean;
  authUser: { username?: string; role?: string } | null;
  authMessage: string | null;
  profile: UserProfile | null;
  profileLoading: boolean;
  profileError: string | null;
  loginForm: { username: string; password: string };
  setLoginForm: React.Dispatch<
    React.SetStateAction<{ username: string; password: string }>
  >;
  registerForm: { username: string; email: string; password: string };
  setRegisterForm: React.Dispatch<
    React.SetStateAction<{ username: string; email: string; password: string }>
  >;
  profileForm: { email: string };
  setProfileForm: React.Dispatch<React.SetStateAction<{ email: string }>>;
  passwordForm: { oldPassword: string; newPassword: string };
  setPasswordForm: React.Dispatch<
    React.SetStateAction<{ oldPassword: string; newPassword: string }>
  >;
  showOldPassword: boolean;
  setShowOldPassword: React.Dispatch<React.SetStateAction<boolean>>;
  showNewPassword: boolean;
  setShowNewPassword: React.Dispatch<React.SetStateAction<boolean>>;
  handleLogin: () => Promise<void>;
  handleRegister: () => Promise<void>;
  handleLogout: () => void;
  loadProfile: () => Promise<void>;
  updateProfile: () => Promise<void>;
  updatePassword: () => Promise<void>;
}

function PasswordStrength({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (!password) return null;

  const labels = ["Weak", "Fair", "Good", "Strong"];
  const colors = ["bg-rose-500", "bg-amber-500", "bg-yellow-400", "bg-emerald-500"];

  return (
    <div className="mt-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              i < score ? colors[score - 1] : "bg-slate-700"
            }`}
          />
        ))}
      </div>
      <p className={`mt-1 text-[11px] ${
        score <= 1 ? "text-rose-400" : score === 2 ? "text-amber-400" : score === 3 ? "text-yellow-400" : "text-emerald-400"
      }`}>
        {labels[score - 1] ?? "Too short"}
      </p>
    </div>
  );
}

export default function AccountTab({
  isLoggedIn,
  authUser,
  authMessage,
  profile,
  profileLoading,
  profileError,
  loginForm,
  setLoginForm,
  registerForm,
  setRegisterForm,
  profileForm,
  setProfileForm,
  passwordForm,
  setPasswordForm,
  showOldPassword,
  setShowOldPassword,
  showNewPassword,
  setShowNewPassword,
  handleLogin,
  handleRegister,
  handleLogout,
  loadProfile,
  updateProfile,
  updatePassword,
}: AccountTabProps) {
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendMsg(null);
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/auth/resend-verification`, {
        method: "POST",
        credentials: "include",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message ?? "Failed to resend.");
      setResendMsg("Verification email sent — check your inbox.");
    } catch (err: any) {
      setResendMsg(err.message ?? "Failed to send.");
    } finally {
      setResendLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex flex-1 items-start justify-center pt-6 xl:pt-10">
        <div className="w-full max-w-md">
          {/* Tab switcher */}
          <div className="mb-6 flex rounded-xl border border-slate-700/60 bg-slate-800/40 p-1">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setAuthTab(t)}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                  authTab === t
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {authTab === "login" ? (
            <div className="glass-panel rounded-2xl p-6 shadow-xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 ring-1 ring-indigo-500/30">
                  <UserCircle className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: "var(--text-main)" }}>
                    Welcome back
                  </h3>
                  <p className="text-xs text-slate-500">Sign in to your account</p>
                </div>
              </div>

              {/* Google Sign-in */}
              <a
                href={`${BACKEND_BASE_URL}/oauth2/authorization/google`}
                className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-600/60 bg-slate-800/60 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700/60 hover:border-slate-500"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </a>

              <div className="relative mb-4 flex items-center">
                <div className="flex-1 border-t border-slate-700/60" />
                <span className="mx-3 text-xs text-slate-500">or sign in with username</span>
                <div className="flex-1 border-t border-slate-700/60" />
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Username</label>
                  <input
                    value={loginForm.username}
                    onChange={(e) => setLoginForm((p) => ({ ...p, username: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleLogin(); }}
                    placeholder="Enter your username"
                    autoComplete="username"
                    className="ui-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Password</label>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") void handleLogin(); }}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="ui-input w-full rounded-xl px-3.5 py-2.5 pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogin}
                className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98]"
              >
                Sign In
              </button>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-6 shadow-xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 ring-1 ring-violet-500/30">
                  <UserPlus className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: "var(--text-main)" }}>
                    Create account
                  </h3>
                  <p className="text-xs text-slate-500">Sign up to save your history</p>
                </div>
              </div>

              {/* Google Sign-up */}
              <a
                href={`${BACKEND_BASE_URL}/oauth2/authorization/google`}
                className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-600/60 bg-slate-800/60 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700/60 hover:border-slate-500"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </a>

              <div className="relative mb-4 flex items-center">
                <div className="flex-1 border-t border-slate-700/60" />
                <span className="mx-3 text-xs text-slate-500">or create with email</span>
                <div className="flex-1 border-t border-slate-700/60" />
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Username</label>
                  <input
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, username: e.target.value }))}
                    placeholder="Choose a username (4–50 chars)"
                    autoComplete="username"
                    className="ui-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</label>
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className="ui-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Password</label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? "text" : "password"}
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      className="ui-input w-full rounded-xl px-3.5 py-2.5 pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                    >
                      {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordStrength password={registerForm.password} />
                </div>
              </div>

              <button
                onClick={handleRegister}
                className="mt-4 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 active:scale-[0.98]"
              >
                Create Account
              </button>

              <p className="mt-3 text-center text-[11px] text-slate-500">
                A verification email will be sent to confirm your address.
              </p>
            </div>
          )}

          {authMessage && (
            <div className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-sm ${
              authMessage.includes("success") || authMessage.includes("created") || authMessage.includes("Check your")
                ? "bg-emerald-900/30 text-emerald-400 ring-1 ring-emerald-500/30"
                : "bg-rose-900/30 text-rose-400 ring-1 ring-rose-500/30"
            }`}>
              {authMessage.includes("success") || authMessage.includes("created")
                ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                : <AlertCircle className="h-4 w-4 shrink-0" />
              }
              {authMessage}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Logged-in view ── */
  return (
    <div className="grid flex-1 grid-cols-1 items-start gap-5 xl:grid-cols-12">

      {/* Profile Card */}
      <div className="flex flex-col gap-4 glass-panel rounded-2xl p-5 shadow-lg xl:col-span-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>Profile</h3>
          <button
            onClick={loadProfile}
            disabled={profileLoading}
            className="flex items-center gap-1.5 ui-btn-secondary rounded-full px-3 py-1 text-[11px] uppercase transition disabled:opacity-50"
          >
            {profileLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Refresh
          </button>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div
            className="relative flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold shadow-xl ring-4 ring-offset-2"
            style={{
              background: "linear-gradient(135deg, var(--accent-strong), #8b5cf6)",
              color: "#fff",
              ringColor: "var(--accent)",
              ringOffsetColor: "var(--bg-main)",
            }}
          >
            {(profile?.username ?? authUser?.username ?? "?")[0].toUpperCase()}
          </div>
          <div className="text-center">
            <p className="text-lg font-bold" style={{ color: "var(--text-main)" }}>
              {profile?.username ?? authUser?.username ?? "—"}
            </p>
            <div className="mt-1.5 flex items-center justify-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                authUser?.role === "ROLE_ADMIN" ? "ui-pill-danger" : "ui-pill-accent"
              }`}>
                {authUser?.role === "ROLE_ADMIN" ? "Admin" : "Member"}
              </span>
              {profile?.emailVerified === false && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400 ring-1 ring-amber-500/30">
                  <Mail className="h-2.5 w-2.5" />
                  Unverified
                </span>
              )}
              {profile?.emailVerified === true && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-emerald-500/30">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info rows */}
        {profileLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : profile ? (
          <div className="space-y-2">
            <div className="glass-inset flex items-center justify-between rounded-xl px-3 py-2.5 text-xs">
              <span className="text-slate-400">Email</span>
              <span className="ml-4 max-w-[55%] truncate text-right font-medium" style={{ color: "var(--text-main)" }}>
                {profile.email ?? "—"}
              </span>
            </div>
            <div className="glass-inset flex items-center justify-between rounded-xl px-3 py-2.5 text-xs">
              <span className="text-slate-400">Joined</span>
              <span className="text-right font-medium" style={{ color: "var(--text-main)" }}>
                {formatDate(profile.createdAt)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No profile loaded.</p>
        )}

        {/* Email verification banner */}
        {profile?.emailVerified === false && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="mb-2 text-xs text-amber-300 font-medium">
              Verify your email to unlock all features.
            </p>
            {resendMsg ? (
              <p className="text-xs text-emerald-400">{resendMsg}</p>
            ) : (
              <button
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="flex items-center gap-1.5 rounded-lg bg-amber-600/30 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-600/50 disabled:opacity-50"
              >
                {resendLoading
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Send className="h-3 w-3" />
                }
                Resend verification email
              </button>
            )}
          </div>
        )}

        {profileError && (
          <div className={`flex items-center gap-2 rounded-xl p-2 text-xs ${
            profileError === "Password updated."
              ? "ui-alert-info"
              : "ui-alert-error"
          }`}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            {profileError}
          </div>
        )}

        <div className="ui-divider-top mt-auto pt-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-xs font-semibold text-rose-400 transition hover:bg-rose-500/20 uppercase tracking-wide"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Actions Column */}
      <div className="flex flex-col gap-4 xl:col-span-8">

        {/* Update Email */}
        <div className="flex flex-col gap-4 glass-panel rounded-2xl p-5 shadow-lg">
          <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20">
              <UserCircle className="h-4 w-4 text-indigo-400" />
            </div>
            Update Email
          </h3>
          <div className="flex flex-wrap gap-2">
            <input
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ email: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") void updateProfile(); }}
              placeholder="New email address"
              className="ui-input min-w-[200px] flex-1 rounded-xl px-3.5 py-2.5 text-sm"
            />
            <button
              onClick={updateProfile}
              className="ui-btn-primary flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition"
            >
              <UserCircle className="h-3.5 w-3.5" />
              Save
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="flex flex-col gap-4 glass-panel rounded-2xl p-5 shadow-lg">
          <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20">
              <KeyRound className="h-4 w-4 text-violet-400" />
            </div>
            Change Password
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Current Password</label>
              <div className="relative">
                <input
                  type={showOldPassword ? "text" : "password"}
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, oldPassword: e.target.value }))}
                  placeholder="Current password"
                  className="ui-input w-full rounded-xl px-3.5 py-2.5 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200"
                >
                  {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                  placeholder="New password"
                  className="ui-input w-full rounded-xl px-3.5 py-2.5 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={passwordForm.newPassword} />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={updatePassword}
              className="ui-btn-primary flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Update Password
            </button>
          </div>
        </div>
      </div>

      {authMessage && (
        <div className="xl:col-span-12">
          <div className="flex items-center gap-2 rounded-xl bg-indigo-900/30 p-3 text-xs text-indigo-300 ring-1 ring-indigo-500/30">
            <UserCircle className="h-4 w-4 shrink-0" />
            {authMessage}
          </div>
        </div>
      )}
    </div>
  );
}
