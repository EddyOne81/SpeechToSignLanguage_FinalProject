import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { adminFetch, unwrapPage } from "../utils";
import Pagination from "../Pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FeedbackEntry {
  feedbackId: number;
  userId?: number;
  username?: string;
  historyId?: number;
  rating?: number;
  comment?: string;
  createdAt?: string;
}

const SORT_OPTIONS = [
  { value: "createdAt,desc", label: "Newest first" },
  { value: "createdAt,asc", label: "Oldest first" },
  { value: "comment,asc", label: "A → Z" },
  { value: "comment,desc", label: "Z → A" },
];

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
  const [sort, setSort] = useState("createdAt,desc");

  const load = useCallback(
    async (p = 0) => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminFetch(
          `/api/feedbacks?page=${p}&size=15&sort=${sort}`
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
    [sort]
  );

  useEffect(() => { void load(0); }, [load]);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-100">All Feedback</h1>
          <p className="mt-1 text-sm text-neutral-500">{totalElements} feedback records total</p>
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className="rounded-md bg-rose-900/30 px-4 py-3 text-sm text-rose-400">{error}</p>
      )}

      <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
        <div className="flex-1 overflow-y-auto overflow-x-auto">
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

        <div className="shrink-0 px-4 pb-3 pt-1">
          <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onPage={load} />
        </div>
      </div>
    </div>
  );
}
