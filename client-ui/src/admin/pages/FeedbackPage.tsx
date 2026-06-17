import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { adminFetch, unwrapPage } from "../utils";
import Pagination from "../Pagination";

interface FeedbackEntry {
  feedbackId: number;
  userId?: number;
  username?: string;
  historyId?: number;
  rating?: number;
  comment?: string;
  createdAt?: string;
}

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return <span className="text-neutral-500">—</span>;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating ? "fill-amber-400 text-amber-400" : "text-neutral-700 fill-neutral-700"
          }`}
        />
      ))}
      <span className="ml-1.5 text-xs text-neutral-400">{rating}/5</span>
    </div>
  );
}

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (p = 0) => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminFetch(
          `/api/feedbacks?page=${p}&size=15&sort=createdAt,desc`
        );
        const pg = unwrapPage(res);
        setFeedbacks(pg.content);
        setTotalPages(pg.totalPages);
        setTotalElements(pg.totalElements);
        setPage(p);
      } catch (err: any) {
        setError(err.message ?? "Failed to load feedbacks.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => { void load(0); }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">All Feedback</h1>
        <p className="mt-1 text-sm text-neutral-500">{totalElements} feedback records total</p>
      </div>

      {error && (
        <p className="rounded-md bg-rose-900/30 px-4 py-3 text-sm text-rose-400">{error}</p>
      )}

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">ID</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">User</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">History</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">Rating</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">Comment</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">Loading...</td>
                </tr>
              ) : feedbacks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">No feedback found.</td>
                </tr>
              ) : (
                feedbacks.map((f) => (
                  <tr key={f.feedbackId} className="border-b border-neutral-800/60 hover:bg-neutral-800/30">
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">{f.feedbackId}</td>
                    <td className="px-4 py-3 text-neutral-300 font-medium">
                      {f.username ?? (f.userId != null ? `#${f.userId}` : "—")}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                      {f.historyId != null ? `#${f.historyId}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StarRating rating={f.rating} />
                    </td>
                    <td className="px-4 py-3 text-neutral-400 max-w-xs">
                      <span className="line-clamp-2">{f.comment || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">
                      {f.createdAt ? new Date(f.createdAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 pb-3 pt-1">
          <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onPage={load} />
        </div>
      </div>
    </div>
  );
}
