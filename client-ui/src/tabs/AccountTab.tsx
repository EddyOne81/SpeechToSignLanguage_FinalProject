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
import { BACKEND_BASE_URL, withAuthHeaders } from "../utils/api";
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
        headers: withAuthHeaders(undefined),
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
  const username = profile?.username ?? authUser?.username ?? "?";
  const initials = username[0].toUpperCase();
  const isAdmin = authUser?.role === "ROLE_ADMIN";
  const isVerified = profile?.emailVerified === true;

  return (
    <div className="flex flex-1 flex-col gap-6">

      {/* ══ PROFILE HERO ══ */}
      <div className="glass-panel relative overflow-hidden rounded-2xl shadow-xl">
        {/* Subtle gradient accent strip */}
        <div className="absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, #6366f1 40%, #8b5cf6 60%, transparent)" }} />
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #6366f1, transparent 70%)" }} />

        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:gap-6">
          {/* Avatar */}
          <div className="relative shrink-0 self-center sm:self-auto">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-black shadow-2xl"
              style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #a855f7 100%)" }}>
              <span className="text-white">{initials}</span>
            </div>
            {isVerified && (
              <div className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 shadow-lg ring-2 ring-slate-900">
                <ShieldCheck className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-1 flex-col gap-2 sm:min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-main)" }}>
                {username}
              </h2>
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                isAdmin
                  ? "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/25"
                  : "bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/25"
              }`}>
                {isAdmin ? "Admin" : "Member"}
              </span>
              {isVerified
                ? <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
                    <ShieldCheck className="h-2.5 w-2.5" /> Verified
                  </span>
                : profile && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 ring-1 ring-amber-500/20">
                    <Mail className="h-2.5 w-2.5" /> Unverified
                  </span>
                )
              }
            </div>

            {profileLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                {profile?.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    {profile.email}
                  </span>
                )}
                {profile?.createdAt && (
                  <span className="flex items-center gap-1.5">
                    <UserCircle className="h-3.5 w-3.5 text-slate-500" />
                    Joined {formatDate(profile.createdAt)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Refresh btn */}
          <button
            onClick={loadProfile}
            disabled={profileLoading}
            className="ui-btn-secondary flex shrink-0 items-center gap-1.5 self-start rounded-xl px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 sm:self-center"
          >
            {profileLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </button>
        </div>
      </div>

      {/* ══ EMAIL NOT VERIFIED ALERT ══ */}
      {profile?.emailVerified === false && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
              <Mail className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-300">Verify your email address</p>
              <p className="mt-0.5 text-xs text-amber-300/60">
                Check your inbox for a verification link. Some features are restricted until verified.
              </p>
              {resendMsg && <p className="mt-1.5 text-xs text-emerald-400">{resendMsg}</p>}
            </div>
          </div>
          {!resendMsg && (
            <button
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/25 disabled:opacity-50 sm:self-center"
            >
              {resendLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Resend email
            </button>
          )}
        </div>
      )}

      {/* ══ SETTINGS GRID ══ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Email */}
        <div className="glass-panel flex flex-col rounded-2xl shadow-lg">
          <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 ring-1 ring-indigo-500/20">
              <Mail className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>Email Address</p>
              <p className="text-[11px] text-slate-500">Change the email linked to your account</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 p-5">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Email
              </label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ email: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") void updateProfile(); }}
                placeholder="your@email.com"
                className="ui-input w-full rounded-xl px-3.5 py-2.5 text-sm"
              />
            </div>
            <button
              onClick={updateProfile}
              className="ui-btn-primary flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wide transition active:scale-[0.98]"
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* Password */}
        <div className="glass-panel flex flex-col rounded-2xl shadow-lg">
          <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 ring-1 ring-violet-500/20">
              <KeyRound className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>Password</p>
              <p className="text-[11px] text-slate-500">Use a strong password with mixed characters</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 p-5">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showOldPassword ? "text" : "password"}
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, oldPassword: e.target.value }))}
                  placeholder="Enter current password"
                  className="ui-input w-full rounded-xl px-3.5 py-2.5 pr-10 text-sm"
                />
                <button type="button" onClick={() => setShowOldPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200">
                  {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  className="ui-input w-full rounded-xl px-3.5 py-2.5 pr-10 text-sm"
                />
                <button type="button" onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200">
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={passwordForm.newPassword} />
            </div>
            <button
              onClick={updatePassword}
              className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-violet-500 active:scale-[0.98]"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Update Password
            </button>
          </div>
        </div>
      </div>

      {/* ══ FEEDBACK ══ */}
      {(profileError || authMessage) && (
        <div className={`flex items-center gap-2.5 rounded-xl p-3.5 text-sm ${
          profileError === "Password updated." || authMessage
            ? "ui-alert-info"
            : "ui-alert-error"
        }`}>
          {profileError === "Password updated." || authMessage
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <AlertCircle className="h-4 w-4 shrink-0" />
          }
          {profileError || authMessage}
        </div>
      )}

      {/* ══ DANGER ZONE ══ */}
      <div className="mt-auto rounded-2xl border border-rose-500/15 bg-rose-500/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-rose-400">Sign out</p>
            <p className="mt-0.5 text-xs text-slate-500">
              You will be signed out of your account on this device.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-rose-400 transition hover:bg-rose-500/20 hover:border-rose-400/50 active:scale-[0.98] sm:self-center"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>

    </div>
  );
}
