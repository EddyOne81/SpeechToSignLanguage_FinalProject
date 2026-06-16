import React from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  UserCircle,
} from "lucide-react";
import { formatDate } from "../utils/format";
import type { UserProfile } from "../types";

interface AccountTabProps {
  authToken: string | null;
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

export default function AccountTab({
  authToken,
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
  return (
    <div className="grid flex-1 grid-cols-1 items-start gap-6 xl:grid-cols-12">
      {!authToken ? (
        <>
          {/* Login */}
          <div className="flex flex-col gap-5 glass-panel rounded-2xl p-6 shadow-lg xl:col-span-6">
            <div className="flex items-center gap-3">
              <div className="ui-icon-circle h-9 w-9">
                <LogIn className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold">Login</h3>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wide text-slate-500">Username</label>
                <input
                  value={loginForm.username}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, username: event.target.value }))}
                  onKeyDown={(event) => { if (event.key === "Enter") void handleLogin(); }}
                  placeholder="Your username"
                  className="ui-input w-full rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wide text-slate-500">Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                  onKeyDown={(event) => { if (event.key === "Enter") void handleLogin(); }}
                  placeholder="Your password"
                  className="ui-input w-full rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={handleLogin}
              className="ui-btn-primary flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide transition">
              <LogIn className="h-3.5 w-3.5" />
              Login
            </button>
          </div>

          {/* Register */}
          <div className="flex flex-col gap-5 glass-panel rounded-2xl p-6 shadow-lg xl:col-span-6">
            <div className="flex items-center gap-3">
              <div className="ui-icon-circle h-9 w-9">
                <UserCircle className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold">Create Account</h3>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wide text-slate-500">Username</label>
                <input
                  value={registerForm.username}
                  onChange={(event) => setRegisterForm((prev) => ({ ...prev, username: event.target.value }))}
                  placeholder="Choose a username"
                  className="ui-input w-full rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wide text-slate-500">Email</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="your@email.com"
                  className="ui-input w-full rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wide text-slate-500">Password</label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Create a password"
                  className="ui-input w-full rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={handleRegister}
              className="ui-btn-secondary flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide transition">
              <UserCircle className="h-3.5 w-3.5" />
              Create Account
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Profile Card */}
          <div className="flex flex-col gap-4 glass-panel rounded-2xl p-5 shadow-lg xl:col-span-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Profile</h3>
              <button
                onClick={loadProfile}
                disabled={profileLoading}
                className="flex items-center gap-1.5 ui-btn-secondary rounded-full px-3 py-1 text-[11px] uppercase transition disabled:opacity-50">
                {profileLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Refresh
              </button>
            </div>

            {/* Avatar + Name */}
            <div className="flex flex-col items-center gap-3 py-3">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold shadow-lg"
                style={{ background: "var(--accent-strong)", color: "#fff" }}>
                {(profile?.username ?? authUser?.username ?? "?")[0].toUpperCase()}
              </div>
              <div className="text-center">
                <p className="text-base font-semibold" style={{ color: "var(--text-main)" }}>
                  {profile?.username ?? authUser?.username ?? "—"}
                </p>
                <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  authUser?.role === "ROLE_ADMIN" ? "ui-pill-danger" : "ui-pill-accent"
                }`}>
                  {authUser?.role === "ROLE_ADMIN" ? "Admin" : "Member"}
                </span>
              </div>
            </div>

            {/* Info rows */}
            {profileLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : profile ? (
              <div className="space-y-2">
                <div className="glass-inset flex items-center justify-between rounded-xl px-3 py-2.5 text-xs">
                  <span className="text-slate-400">Email</span>
                  <span className="ml-4 max-w-[60%] truncate text-right font-medium" style={{ color: "var(--text-main)" }}>{profile.email ?? "—"}</span>
                </div>
                <div className="glass-inset flex items-center justify-between rounded-xl px-3 py-2.5 text-xs">
                  <span className="text-slate-400">Joined</span>
                  <span className="text-right font-medium" style={{ color: "var(--text-main)" }}>{formatDate(profile.createdAt)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No profile loaded.</p>
            )}

            {profileError && (
              <div className={`flex items-center rounded-lg p-2 text-xs ${
                profileError === "Password updated."
                  ? "ui-alert-info"
                  : "ui-alert-error"
              }`}>
                <AlertCircle className="mr-2 h-4 w-4 shrink-0" />
                {profileError}
              </div>
            )}

            <div className="ui-divider-top mt-auto pt-4">
              <button
                onClick={handleLogout}
                className="ui-pill-danger flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition">
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Actions Column */}
          <div className="flex flex-col gap-4 xl:col-span-7">
            {/* Update Email */}
            <div className="flex flex-col gap-4 glass-panel rounded-2xl p-5 shadow-lg">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <UserCircle className="h-4 w-4" style={{ color: "var(--accent)" }} />
                Update Email
              </h3>
              <div className="flex flex-wrap gap-2">
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(event) => setProfileForm({ email: event.target.value })}
                  onKeyDown={(event) => { if (event.key === "Enter") void updateProfile(); }}
                  placeholder="New email address"
                  className="ui-input min-w-[200px] flex-1 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={updateProfile}
                  className="ui-btn-primary flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide transition">
                  <UserCircle className="h-3.5 w-3.5" />
                  Save
                </button>
              </div>
            </div>

            {/* Change Password */}
            <div className="flex flex-col gap-4 glass-panel rounded-2xl p-5 shadow-lg">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound className="h-4 w-4" style={{ color: "var(--accent)" }} />
                Change Password
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wide text-slate-500">Current Password</label>
                  <div className="relative">
                    <input
                      type={showOldPassword ? "text" : "password"}
                      value={passwordForm.oldPassword}
                      onChange={(event) => setPasswordForm((prev) => ({ ...prev, oldPassword: event.target.value }))}
                      placeholder="Current password"
                      className="ui-input w-full rounded-lg px-3 py-2 pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:opacity-100">
                      {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wide text-slate-500">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                      placeholder="New password"
                      className="ui-input w-full rounded-lg px-3 py-2 pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:opacity-100">
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={updatePassword}
                  className="ui-btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide transition">
                  <KeyRound className="h-3.5 w-3.5" />
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {authMessage && (
        <div className="xl:col-span-12">
          <div className="ui-alert-info flex items-center rounded-lg p-2 text-xs">
            <UserCircle className="mr-2 h-4 w-4" />
            {authMessage}
          </div>
        </div>
      )}
    </div>
  );
}
