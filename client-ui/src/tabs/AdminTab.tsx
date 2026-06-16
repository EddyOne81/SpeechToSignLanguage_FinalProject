import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Star,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { BACKEND_BASE_URL, extractPageContent } from "../utils/api";
import { formatDate } from "../utils/format";

type AdminSection = "overview" | "users" | "dictionary" | "feedback";

interface AdminUser {
  userId: number;
  username: string;
  email?: string;
  roles?: string[];
  createdAt?: string;
}

interface AdminDictEntry {
  wordId: number;
  englishText: string;
  normalizedText?: string;
  spokenLang?: string;
  signedLang?: string;
  isVerified?: boolean;
  cacheSource?: string;
  entryType?: string;
}

interface AdminFeedback {
  feedbackId: number;
  userId?: number;
  historyId?: number;
  rating?: number;
  comment?: string;
  createdAt?: string;
}

interface AdminTabProps {
  authToken: string | null;
  authUser: { username?: string; role?: string } | null;
}

const PAGE_SIZE = 10;

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="glass-panel rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}
        >
          {icon}
        </div>
      </div>
      <p className="text-[11px] font-bold uppercase tracking-widest opacity-60">
        {label}
      </p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-50">{sub}</p>}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-xs opacity-50">
        Page {page + 1} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={page === 0}
          className="ui-btn-secondary flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs disabled:opacity-30"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </button>
        <button
          onClick={onNext}
          disabled={page >= totalPages - 1}
          className="ui-btn-secondary flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs disabled:opacity-30"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function AdminTab({ authToken, authUser }: AdminTabProps) {
  const [section, setSection] = useState<AdminSection>("overview");

  // Users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersPage, setUsersPage] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(0);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  // Dictionary
  const [dictEntries, setDictEntries] = useState<AdminDictEntry[]>([]);
  const [dictPage, setDictPage] = useState(0);
  const [dictTotalPages, setDictTotalPages] = useState(0);
  const [dictTotal, setDictTotal] = useState(0);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictError, setDictError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  // Feedback
  const [feedbacks, setFeedbacks] = useState<AdminFeedback[]>([]);
  const [feedbackPage, setFeedbackPage] = useState(0);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(0);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
  };

  const loadUsers = async (page = 0) => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await fetch(
        `${BACKEND_BASE_URL}/api/users?page=${page}&size=${PAGE_SIZE}&sort=userId,desc`,
        { headers: authHeaders }
      );
      const body = await res.json();
      const pg = extractPageContent(body);
      setUsers(pg.content ?? []);
      setUsersTotalPages(pg.totalPages ?? 0);
      setUsersTotal(pg.totalElements ?? 0);
      setUsersPage(page);
    } catch {
      setUsersError("Failed to load users.");
    } finally {
      setUsersLoading(false);
    }
  };

  const deleteUser = async (userId: number) => {
    if (!window.confirm(`Delete user #${userId}? This cannot be undone.`)) return;
    setDeletingUserId(userId);
    try {
      await fetch(`${BACKEND_BASE_URL}/api/users/${userId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      await loadUsers(usersPage);
    } catch {
      setUsersError("Failed to delete user.");
    } finally {
      setDeletingUserId(null);
    }
  };

  const loadDictionary = async (page = 0) => {
    setDictLoading(true);
    setDictError(null);
    try {
      const res = await fetch(
        `${BACKEND_BASE_URL}/api/dictionaries?page=${page}&size=${PAGE_SIZE}&sort=wordId,desc`,
        { headers: authHeaders }
      );
      const body = await res.json();
      const pg = extractPageContent(body);
      setDictEntries(pg.content ?? []);
      setDictTotalPages(pg.totalPages ?? 0);
      setDictTotal(pg.totalElements ?? 0);
      setDictPage(page);
    } catch {
      setDictError("Failed to load dictionary.");
    } finally {
      setDictLoading(false);
    }
  };

  const toggleVerify = async (entry: AdminDictEntry) => {
    setVerifyingId(entry.wordId);
    try {
      await fetch(`${BACKEND_BASE_URL}/api/dictionaries/${entry.wordId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          englishText: entry.englishText,
          normalizedText: entry.normalizedText,
          spokenLang: entry.spokenLang,
          signedLang: entry.signedLang,
          cacheSource: entry.cacheSource,
          entryType: entry.entryType,
          isVerified: !entry.isVerified,
        }),
      });
      setDictEntries((prev) =>
        prev.map((e) =>
          e.wordId === entry.wordId ? { ...e, isVerified: !e.isVerified } : e
        )
      );
    } catch {
      setDictError("Failed to update entry.");
    } finally {
      setVerifyingId(null);
    }
  };

  const loadFeedbacks = async (page = 0) => {
    setFeedbackLoading(true);
    setFeedbackError(null);
    try {
      const res = await fetch(
        `${BACKEND_BASE_URL}/api/feedbacks?page=${page}&size=${PAGE_SIZE}&sort=createdAt,desc`,
        { headers: authHeaders }
      );
      const body = await res.json();
      const pg = extractPageContent(body);
      setFeedbacks(pg.content ?? []);
      setFeedbackTotalPages(pg.totalPages ?? 0);
      setFeedbackTotal(pg.totalElements ?? 0);
      setFeedbackPage(page);
    } catch {
      setFeedbackError("Failed to load feedback.");
    } finally {
      setFeedbackLoading(false);
    }
  };

  useEffect(() => {
    if (section === "users") loadUsers(0);
    else if (section === "dictionary") loadDictionary(0);
    else if (section === "feedback") loadFeedbacks(0);
    else if (section === "overview") {
      loadUsers(0);
      loadDictionary(0);
      loadFeedbacks(0);
    }
  }, [section]);

  if (!authUser || authUser.role !== "ROLE_ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-60">
        <ShieldCheck className="h-12 w-12" />
        <p className="text-lg font-semibold">Admin access required</p>
      </div>
    );
  }

  const sectionBtnClass = (s: AdminSection) =>
    `flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] transition-all ${
      section === s ? "ui-tab-active" : "ui-tab-idle"
    }`;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6" style={{ color: "var(--accent)" }} />
          <div>
            <h2 className="text-xl font-bold">Admin Portal</h2>
            <p className="text-xs opacity-50">System management — logged in as {authUser.username}</p>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button className={sectionBtnClass("overview")} onClick={() => setSection("overview")}>
          <ShieldCheck className="h-3.5 w-3.5" /> Overview
        </button>
        <button className={sectionBtnClass("users")} onClick={() => setSection("users")}>
          <Users className="h-3.5 w-3.5" /> Users
        </button>
        <button className={sectionBtnClass("dictionary")} onClick={() => setSection("dictionary")}>
          <BookOpen className="h-3.5 w-3.5" /> Dictionary
        </button>
        <button className={sectionBtnClass("feedback")} onClick={() => setSection("feedback")}>
          <MessageSquare className="h-3.5 w-3.5" /> Feedback
        </button>
      </div>

      {/* ── OVERVIEW ── */}
      {section === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              icon={<Users className="h-5 w-5 text-white" />}
              label="Total Users"
              value={usersLoading ? "…" : usersTotal}
              color="bg-blue-600"
            />
            <StatCard
              icon={<BookOpen className="h-5 w-5 text-white" />}
              label="Dictionary Entries"
              value={dictLoading ? "…" : dictTotal}
              color="bg-indigo-600"
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5 text-white" />}
              label="Verified Signs"
              value={dictLoading ? "…" : dictEntries.filter((e) => e.isVerified).length}
              sub="on this page"
              color="bg-emerald-600"
            />
            <StatCard
              icon={<MessageSquare className="h-5 w-5 text-white" />}
              label="Total Feedback"
              value={feedbackLoading ? "…" : feedbackTotal}
              color="bg-amber-600"
            />
          </div>

          {/* Recent users */}
          <div className="glass-panel rounded-xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Recent Users</h3>
              <button
                onClick={() => setSection("users")}
                className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: "var(--accent)" }}
              >
                View all →
              </button>
            </div>
            {usersLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin opacity-50" />
              </div>
            ) : (
              <div className="space-y-2">
                {users.slice(0, 5).map((u) => (
                  <div
                    key={u.userId}
                    className="glass-inset flex items-center justify-between rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: "var(--accent-strong)" }}
                      >
                        {(u.username ?? "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{u.username}</p>
                        <p className="text-[10px] opacity-50">{u.email ?? "—"}</p>
                      </div>
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={{
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                      }}
                    >
                      {Array.isArray(u.roles) ? u.roles[0]?.replace("ROLE_", "") : "MEMBER"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent feedback */}
          <div className="glass-panel rounded-xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Recent Feedback</h3>
              <button
                onClick={() => setSection("feedback")}
                className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: "var(--accent)" }}
              >
                View all →
              </button>
            </div>
            {feedbackLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin opacity-50" />
              </div>
            ) : feedbacks.length === 0 ? (
              <p className="text-xs opacity-40 py-4 text-center">No feedback yet.</p>
            ) : (
              <div className="space-y-2">
                {feedbacks.slice(0, 5).map((fb) => (
                  <div
                    key={fb.feedbackId}
                    className="glass-inset flex items-start justify-between gap-3 rounded-lg px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold">User #{fb.userId}</span>
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                          {Array.from({ length: fb.rating ?? 0 }).map((_, i) => (
                            <Star key={i} className="h-2.5 w-2.5 fill-current" />
                          ))}
                        </span>
                      </div>
                      <p className="text-xs opacity-60 truncate">{fb.comment || "—"}</p>
                    </div>
                    <p className="text-[10px] opacity-40 shrink-0">{formatDate(fb.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── USERS ── */}
      {section === "users" && (
        <div className="glass-panel rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">
              All Users{" "}
              <span className="ml-1 text-xs opacity-50">({usersTotal} total)</span>
            </h3>
            <button
              onClick={() => loadUsers(usersPage)}
              className="ui-btn-secondary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          {usersError && (
            <div className="ui-alert-error mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" /> {usersError}
            </div>
          )}

          {usersLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin opacity-50" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-sm opacity-40">No users found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-[10px] uppercase tracking-widest opacity-50"
                      style={{ borderColor: "var(--glass-soft-border)" }}>
                      <th className="pb-2 pr-4">ID</th>
                      <th className="pb-2 pr-4">Username</th>
                      <th className="pb-2 pr-4">Email</th>
                      <th className="pb-2 pr-4">Role</th>
                      <th className="pb-2 pr-4">Created</th>
                      <th className="pb-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y"
                    style={{ borderColor: "color-mix(in oklab, var(--glass-soft-border) 40%, transparent)" }}>
                    {users.map((u) => (
                      <tr key={u.userId} className="group">
                        <td className="py-2.5 pr-4 text-xs opacity-40">#{u.userId}</td>
                        <td className="py-2.5 pr-4 font-medium">
                          <div className="flex items-center gap-2">
                            <div
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                              style={{ background: "var(--accent)" }}
                            >
                              {(u.username ?? "?")[0].toUpperCase()}
                            </div>
                            {u.username}
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-xs opacity-60">{u.email ?? "—"}</td>
                        <td className="py-2.5 pr-4">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                            style={{
                              background:
                                (Array.isArray(u.roles) ? u.roles[0] : "") === "ROLE_ADMIN"
                                  ? "color-mix(in oklab, var(--accent) 18%, transparent)"
                                  : "color-mix(in oklab, var(--glass-soft-border) 60%, transparent)",
                              color:
                                (Array.isArray(u.roles) ? u.roles[0] : "") === "ROLE_ADMIN"
                                  ? "var(--accent)"
                                  : "inherit",
                            }}
                          >
                            {Array.isArray(u.roles)
                              ? u.roles[0]?.replace("ROLE_", "")
                              : "MEMBER"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-xs opacity-50">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="py-2.5 text-right">
                          {(Array.isArray(u.roles) ? u.roles[0] : "") !== "ROLE_ADMIN" && (
                            <button
                              onClick={() => deleteUser(u.userId)}
                              disabled={deletingUserId === u.userId}
                              className="flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-400/10 px-2.5 py-1 text-[10px] font-semibold text-rose-400 opacity-0 transition hover:border-rose-400/60 hover:bg-rose-400/20 group-hover:opacity-100 disabled:opacity-50 ml-auto"
                            >
                              {deletingUserId === u.userId ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={usersPage}
                totalPages={usersTotalPages}
                onPrev={() => loadUsers(usersPage - 1)}
                onNext={() => loadUsers(usersPage + 1)}
              />
            </>
          )}
        </div>
      )}

      {/* ── DICTIONARY ── */}
      {section === "dictionary" && (
        <div className="glass-panel rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">
              Sign Dictionary{" "}
              <span className="ml-1 text-xs opacity-50">({dictTotal} entries)</span>
            </h3>
            <button
              onClick={() => loadDictionary(dictPage)}
              className="ui-btn-secondary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          {dictError && (
            <div className="ui-alert-error mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" /> {dictError}
            </div>
          )}

          {dictLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin opacity-50" />
            </div>
          ) : dictEntries.length === 0 ? (
            <p className="py-8 text-center text-sm opacity-40">No dictionary entries.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-[10px] uppercase tracking-widest opacity-50"
                      style={{ borderColor: "var(--glass-soft-border)" }}>
                      <th className="pb-2 pr-4">ID</th>
                      <th className="pb-2 pr-4">English Text</th>
                      <th className="pb-2 pr-4">Type</th>
                      <th className="pb-2 pr-4">Source</th>
                      <th className="pb-2 pr-4">Lang</th>
                      <th className="pb-2 text-right">Verified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y"
                    style={{ borderColor: "color-mix(in oklab, var(--glass-soft-border) 40%, transparent)" }}>
                    {dictEntries.map((entry) => (
                      <tr key={entry.wordId} className="group">
                        <td className="py-2.5 pr-4 text-xs opacity-40">#{entry.wordId}</td>
                        <td className="py-2.5 pr-4 font-medium max-w-[220px] truncate">
                          {entry.englishText}
                        </td>
                        <td className="py-2.5 pr-4 text-xs opacity-60">
                          {entry.entryType ?? "—"}
                        </td>
                        <td className="py-2.5 pr-4 text-xs opacity-60">
                          {entry.cacheSource ?? "—"}
                        </td>
                        <td className="py-2.5 pr-4 text-xs opacity-60">
                          {entry.spokenLang ?? "—"} → {entry.signedLang ?? "—"}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => toggleVerify(entry)}
                            disabled={verifyingId === entry.wordId}
                            className="ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all"
                            style={{
                              background: entry.isVerified
                                ? "rgba(16,185,129,0.15)"
                                : "color-mix(in oklab, var(--glass-soft-border) 50%, transparent)",
                              color: entry.isVerified ? "#10b981" : "inherit",
                              border: `1px solid ${entry.isVerified ? "rgba(16,185,129,0.3)" : "var(--glass-soft-border)"}`,
                            }}
                          >
                            {verifyingId === entry.wordId ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : entry.isVerified ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {entry.isVerified ? "Verified" : "Unverified"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={dictPage}
                totalPages={dictTotalPages}
                onPrev={() => loadDictionary(dictPage - 1)}
                onNext={() => loadDictionary(dictPage + 1)}
              />
            </>
          )}
        </div>
      )}

      {/* ── FEEDBACK ── */}
      {section === "feedback" && (
        <div className="glass-panel rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">
              All Feedback{" "}
              <span className="ml-1 text-xs opacity-50">({feedbackTotal} total)</span>
            </h3>
            <button
              onClick={() => loadFeedbacks(feedbackPage)}
              className="ui-btn-secondary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          {feedbackError && (
            <div className="ui-alert-error mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" /> {feedbackError}
            </div>
          )}

          {feedbackLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin opacity-50" />
            </div>
          ) : feedbacks.length === 0 ? (
            <p className="py-8 text-center text-sm opacity-40">No feedback yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-[10px] uppercase tracking-widest opacity-50"
                      style={{ borderColor: "var(--glass-soft-border)" }}>
                      <th className="pb-2 pr-4">ID</th>
                      <th className="pb-2 pr-4">User</th>
                      <th className="pb-2 pr-4">History</th>
                      <th className="pb-2 pr-4">Rating</th>
                      <th className="pb-2 pr-4">Comment</th>
                      <th className="pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y"
                    style={{ borderColor: "color-mix(in oklab, var(--glass-soft-border) 40%, transparent)" }}>
                    {feedbacks.map((fb) => (
                      <tr key={fb.feedbackId}>
                        <td className="py-2.5 pr-4 text-xs opacity-40">#{fb.feedbackId}</td>
                        <td className="py-2.5 pr-4 text-xs">User #{fb.userId}</td>
                        <td className="py-2.5 pr-4 text-xs opacity-60">
                          {fb.historyId ? `#${fb.historyId}` : "—"}
                        </td>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-0.5 text-amber-400">
                            {Array.from({ length: fb.rating ?? 0 }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-current" />
                            ))}
                            {Array.from({ length: 5 - (fb.rating ?? 0) }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 opacity-20" />
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-xs opacity-70 max-w-[260px] truncate">
                          {fb.comment || "—"}
                        </td>
                        <td className="py-2.5 text-xs opacity-50">
                          {formatDate(fb.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={feedbackPage}
                totalPages={feedbackTotalPages}
                onPrev={() => loadFeedbacks(feedbackPage - 1)}
                onNext={() => loadFeedbacks(feedbackPage + 1)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
