import { useCallback, useEffect, useState } from "react";
import { adminFetch, unwrapPage } from "../utils";
import Pagination from "../Pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HistoryEntry {
  historyId: number;
  userId?: number;
  username?: string;
  inputText?: string;
  processingTimeMs?: number;
  createdAt?: string;
}

const SORT_OPTIONS = [
  { value: "createdAt,desc", label: "Newest first" },
  { value: "createdAt,asc", label: "Oldest first" },
  { value: "inputText,asc", label: "A → Z" },
  { value: "inputText,desc", label: "Z → A" },
];

export default function HistoriesPage() {
  const [histories, setHistories] = useState<HistoryEntry[]>([]);
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
          `/api/histories?page=${p}&size=20&sort=${sort}`
        );
        const pg = unwrapPage(res);
        setHistories(pg.content);
        setTotalPages(pg.totalPages);
        setTotalElements(pg.totalElements);
        setPage(p);
      } catch (err: any) {
        setError(err.message ?? "Failed to load histories.");
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
          <h1 className="text-xl font-bold text-neutral-100">All Histories</h1>
          <p className="mt-1 text-sm text-neutral-500">{totalElements} translation records total</p>
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
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">Input Text</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">Time (ms)</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">Loading...</td>
                </tr>
              ) : histories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">No history records found.</td>
                </tr>
              ) : (
                histories.map((h) => (
                  <tr key={h.historyId} className="border-b border-neutral-800/60 hover:bg-neutral-800/30">
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">{h.historyId}</td>
                    <td className="px-4 py-3 text-neutral-400">
                      {h.username ?? (h.userId != null ? `#${h.userId}` : "—")}
                    </td>
                    <td className="px-4 py-3 text-neutral-200 max-w-xs">
                      <span className="line-clamp-1">{h.inputText || "—"}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-400">
                      {h.processingTimeMs != null ? `${h.processingTimeMs}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">
                      {h.createdAt ? new Date(h.createdAt).toLocaleString() : "—"}
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
