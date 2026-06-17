import { useCallback, useEffect, useState } from "react";
import { CheckCircle, Plus, Trash2, XCircle } from "lucide-react";
import { adminFetch, unwrapPage } from "../utils";
import Pagination from "../Pagination";

interface DictEntry {
  wordId: number;
  englishText: string;
  entryType?: string;
  spokenLang?: string;
  signedLang?: string;
  cacheSource?: string;
  isVerified?: boolean;
}

const SOURCE_BADGE: Record<string, string> = {
  SEED: "bg-amber-500/20 text-amber-300",
  AUTO_CACHED: "bg-sky-500/20 text-sky-300",
  MANUAL: "bg-emerald-500/20 text-emerald-300",
};

export default function DictionaryPage() {
  const [entries, setEntries] = useState<DictEntry[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    englishText: "",
    entryType: "GLOSS",
    spokenLang: "en",
    signedLang: "ase",
  });
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState<Record<number, boolean>>({});
  const [deleting, setDeleting] = useState<Record<number, boolean>>({});
  const [filterSource, setFilterSource] = useState("");
  const [filterVerified, setFilterVerified] = useState("");

  const load = useCallback(
    async (p = 0) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(p), size: "15", sort: "wordId,desc" });
        if (filterSource) params.set("cacheSource", filterSource);
        if (filterVerified !== "") params.set("isVerified", filterVerified);
        const res = await adminFetch(`/api/dictionaries?${params}`);
        const pg = unwrapPage(res);
        setEntries(pg.content);
        setTotalPages(pg.totalPages);
        setTotalElements(pg.totalElements);
        setPage(p);
      } catch (err: any) {
        setError(err.message ?? "Failed to load entries.");
      } finally {
        setLoading(false);
      }
    },
    [filterSource, filterVerified]
  );

  useEffect(() => { void load(0); }, [load]);

  const handleAdd = async () => {
    if (!addForm.englishText.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await adminFetch("/api/dictionaries", {
        method: "POST",
        body: JSON.stringify(addForm),
      });
      setShowAdd(false);
      setAddForm({ englishText: "", entryType: "GLOSS", spokenLang: "en", signedLang: "ase" });
      await load(page);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleVerifyToggle = async (entry: DictEntry) => {
    setToggling((prev) => ({ ...prev, [entry.wordId]: true }));
    try {
      await adminFetch(`/api/dictionaries/${entry.wordId}`, {
        method: "PUT",
        body: JSON.stringify({ isVerified: !entry.isVerified }),
      });
      await load(page);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setToggling((prev) => ({ ...prev, [entry.wordId]: false }));
    }
  };

  const handleDelete = async (wordId: number) => {
    if (!window.confirm("Delete this dictionary entry?")) return;
    setDeleting((prev) => ({ ...prev, [wordId]: true }));
    try {
      await adminFetch(`/api/dictionaries/${wordId}`, { method: "DELETE" });
      await load(page);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting((prev) => ({ ...prev, [wordId]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-100">Dictionary Management</h1>
          <p className="mt-1 text-sm text-neutral-500">{totalElements} entries total</p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 focus:outline-none"
        >
          <option value="">All sources</option>
          <option value="SEED">SEED</option>
          <option value="AUTO_CACHED">AUTO_CACHED</option>
          <option value="MANUAL">MANUAL</option>
        </select>
        <select
          value={filterVerified}
          onChange={(e) => setFilterVerified(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 focus:outline-none"
        >
          <option value="">All verified status</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-indigo-800/40 bg-indigo-950/30 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-indigo-300">New Dictionary Entry</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={addForm.englishText}
              onChange={(e) => setAddForm((f) => ({ ...f, englishText: e.target.value }))}
              placeholder="English text"
              className="sm:col-span-2 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
            />
            <select
              value={addForm.entryType}
              onChange={(e) => setAddForm((f) => ({ ...f, entryType: e.target.value }))}
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-300 focus:outline-none"
            >
              <option value="GLOSS">GLOSS</option>
              <option value="PHRASE">PHRASE</option>
            </select>
            <input
              value={addForm.spokenLang}
              onChange={(e) => setAddForm((f) => ({ ...f, spokenLang: e.target.value }))}
              placeholder="Spoken lang (e.g. en)"
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void handleAdd()}
              disabled={adding || !addForm.englishText.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {adding ? "Adding..." : "Add Entry"}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="rounded-lg px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-rose-900/30 px-4 py-3 text-sm text-rose-400">{error}</p>
      )}

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">ID</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">Text</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">Type</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">Source</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">Verified</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">Loading...</td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">No entries found.</td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.wordId} className="border-b border-neutral-800/60 hover:bg-neutral-800/30">
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">{e.wordId}</td>
                    <td className="px-4 py-3 font-medium text-neutral-200 max-w-xs truncate">{e.englishText}</td>
                    <td className="px-4 py-3 text-xs text-neutral-400">{e.entryType ?? "—"}</td>
                    <td className="px-4 py-3">
                      {e.cacheSource ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_BADGE[e.cacheSource] ?? "bg-neutral-700 text-neutral-300"}`}>
                          {e.cacheSource}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void handleVerifyToggle(e)}
                        disabled={toggling[e.wordId]}
                        title={e.isVerified ? "Click to unverify" : "Click to verify"}
                        className="flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors hover:bg-neutral-700 disabled:opacity-50"
                      >
                        {e.isVerified ? (
                          <>
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Verified</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5 text-neutral-500" />
                            <span className="text-neutral-500">Unverified</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void handleDelete(e.wordId)}
                        disabled={deleting[e.wordId]}
                        className="rounded p-1.5 text-rose-400 hover:bg-rose-900/30 hover:text-rose-300 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
