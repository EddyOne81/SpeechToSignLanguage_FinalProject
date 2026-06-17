import { useEffect, useState } from "react";
import { BarChart3, BookOpen, History, MessageSquare, Users } from "lucide-react";
import { adminFetch, unwrapPage } from "../utils";

interface Stats {
  users: number;
  dictEntries: number;
  histories: number;
  feedbacks: number;
}

const STAT_CARDS = [
  { key: "users" as const, label: "Total Users", icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
  { key: "dictEntries" as const, label: "Dictionary Entries", icon: BookOpen, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { key: "histories" as const, label: "Translations Made", icon: History, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  { key: "feedbacks" as const, label: "Feedbacks Received", icon: MessageSquare, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [usersRes, dictRes, histRes, feedRes] = await Promise.all([
          adminFetch("/api/users?page=0&size=1"),
          adminFetch("/api/dictionaries?page=0&size=1"),
          adminFetch("/api/histories?page=0&size=1"),
          adminFetch("/api/feedbacks?page=0&size=1"),
        ]);
        setStats({
          users: unwrapPage(usersRes).totalElements,
          dictEntries: unwrapPage(dictRes).totalElements,
          histories: unwrapPage(histRes).totalElements,
          feedbacks: unwrapPage(feedRes).totalElements,
        });
      } catch (err: any) {
        setError(err.message ?? "Failed to load stats.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">System overview</p>
      </div>

      {error && (
        <p className="rounded-md bg-rose-900/30 px-4 py-3 text-sm text-rose-400">{error}</p>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STAT_CARDS.map(({ key }) => (
            <div key={key} className="h-28 animate-pulse rounded-xl border border-neutral-800 bg-neutral-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
            <div key={key} className={`rounded-xl border p-5 ${bg}`}>
              <div className="mb-3">
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
              <p className={`mt-1 text-3xl font-bold ${color}`}>
                {(stats?.[key] ?? 0).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-neutral-300">System Notes</h2>
        </div>
        <ul className="space-y-2 text-sm text-neutral-400">
          <li>• All user data and translations are stored in PostgreSQL.</li>
          <li>• Dictionary entries with <span className="text-sky-400 font-medium">AUTO_CACHED</span> are generated automatically after successful Sign-MT translations.</li>
          <li>• <span className="text-amber-400 font-medium">SEED</span> entries are loaded from the initial dataset. <span className="text-emerald-400 font-medium">MANUAL</span> entries are added by admins.</li>
          <li>• Pose files are cached on disk at <code className="rounded bg-neutral-800 px-1.5 py-0.5 text-indigo-300 text-xs">data/pose_cache/</code> on the AI service.</li>
        </ul>
      </div>
    </div>
  );
}
