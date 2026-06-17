import { useCallback, useEffect, useState } from "react";
import { adminFetch, unwrapPage } from "../utils";
import Pagination from "../Pagination";

interface HistoryEntry {
  historyId: number;
  userId?: number;
  username?: string;
  inputText?: string;
  processingTimeMs?: number;
  createdAt?: string;
}

export default function HistoriesPage() {
  const [histories, setHistories] = useState<HistoryEntry[]>([]);
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
          `/api/histories?page=${p}&size=20&sort=createdAt,desc`
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
    []
  );

  useEffect(() => { void load(0); }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">All Histories</h1>
        <p className="mt-1 text-sm text-neutral-500">{totalElements} translation records total</p>
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

        <div className="px-4 pb-3 pt-1">
          <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onPage={load} />
        </div>
      </div>
    </div>
  );
}
