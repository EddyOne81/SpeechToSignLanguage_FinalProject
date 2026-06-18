import React from "react";
import { AlertCircle, Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import { formatDate } from "../utils/format";
import type { FeedbackFormData, HistoryItem, TabType } from "../types";

interface HistoryTabProps {
  isLoggedIn: boolean;
  historyItems: HistoryItem[];
  historyQuery: string;
  setHistoryQuery: (q: string) => void;
  historyPage: number;
  historyTotalPages: number;
  historyTotalElements: number;
  historyLoading: boolean;
  historyError: string | null;
  loadHistories: (targetPage?: number, overrideQuery?: string) => Promise<void>;
  deleteHistory: (historyId: number) => Promise<void>;
  deleteAllHistories: () => Promise<void>;
  replayHistory: (text?: string) => void;
  setFeedbackForm: React.Dispatch<React.SetStateAction<FeedbackFormData>>;
  setActiveTab: (tab: TabType) => void;
}

export default function HistoryTab({
  isLoggedIn,
  historyItems,
  historyQuery,
  setHistoryQuery,
  historyPage,
  historyTotalPages,
  historyTotalElements,
  historyLoading,
  historyError,
  loadHistories,
  deleteHistory,
  deleteAllHistories,
  replayHistory,
  setFeedbackForm,
  setActiveTab,
}: HistoryTabProps) {
  return (
    <div className="flex min-h-[420px] flex-1 flex-col glass-panel rounded-2xl p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold ">
          Translation History
        </h3>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={historyQuery}
            onChange={(event) => setHistoryQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void loadHistories(0);
              }
            }}
            placeholder="Search by ID or text..."
            className="ui-input min-w-[260px] flex-1 rounded-lg px-3 py-2 text-sm md:max-w-md"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadHistories(0)}
              className="ui-btn-primary flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] uppercase transition">
              <Search className="h-3.5 w-3.5" />
              Search
            </button>
            <button
              onClick={() => {
                setHistoryQuery("");
                void loadHistories(0, "");
              }}
              className="flex items-center gap-2 ui-btn-secondary rounded-lg px-3 py-1.5 text-[11px] uppercase transition">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            {isLoggedIn && historyTotalElements > 0 && (
              <button
                onClick={() => void deleteAllHistories()}
                className="ui-pill-danger flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] uppercase transition">
                <Trash2 className="h-3.5 w-3.5" />
                Delete All
              </button>
            )}
          </div>
        </div>
        <div className="text-right text-xs text-slate-500">
          {historyTotalElements} total · {historyItems.length} on this page
        </div>
      </div>

      <div className="mt-4 flex-1 min-h-0 overflow-y-auto">
      {!isLoggedIn ? (
        <div className="glass-inset rounded-xl p-4 text-sm text-slate-500">
          Login to view your personal translation history.
        </div>
      ) : historyLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading histories...
        </div>
      ) : historyError ? (
        <div className="ui-alert-error flex items-center rounded-lg p-2 text-xs">
          <AlertCircle className="mr-2 h-4 w-4" />
          {historyError}
        </div>
      ) : historyItems.length > 0 ? (
        <div className="space-y-3">
          {historyItems.map((item) => (
            <div
              key={item.historyId}
              className="glass-inset rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    {item.inputText || "Untitled"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(item.createdAt)}
                    {item.processingTimeMs
                      ? ` · ${item.processingTimeMs} ms`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => replayHistory(item.inputText)}
                    className="ui-pill-accent rounded-full px-3 py-1 text-[11px] uppercase transition">
                    Replay
                  </button>
                  <button
                    onClick={() => {
                      setFeedbackForm((prev) => ({
                        ...prev,
                        historyId: String(item.historyId),
                      }));
                      setActiveTab("feedback");
                    }}
                    className="ui-pill-neutral rounded-full px-3 py-1 text-[11px] uppercase transition">
                    Feedback
                  </button>
                  <button
                    onClick={() => void deleteHistory(item.historyId)}
                    className="ui-pill-danger rounded-full px-3 py-1 text-[11px] uppercase transition">
                    <Trash2 className="inline h-3 w-3 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          {historyQuery.trim()
            ? "No matching entries found."
            : "No history entries yet."}
        </p>
      )}
      </div>
      {isLoggedIn && !historyError && (
        <div className="ui-divider-top mt-4 flex flex-wrap items-center justify-between gap-3 pt-3">
          <div className="text-xs text-slate-400">
            Page {historyTotalPages > 0 ? historyPage + 1 : 0} /{" "}
            {historyTotalPages || 0}
          </div>
          <div className="flex items-center gap-2">
            {historyTotalPages > 1 && historyPage > 0 && (
              <button
                onClick={() => void loadHistories(0)}
                disabled={historyLoading}
                className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                First
              </button>
            )}
            <button
              onClick={() => void loadHistories(Math.max(0, historyPage - 1))}
              disabled={historyLoading || historyPage <= 0}
              className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
              Prev
            </button>
            <select
              value={historyTotalPages > 0 ? historyPage : 0}
              onChange={(event) => void loadHistories(Number(event.target.value))}
              disabled={historyLoading || historyTotalPages <= 0}
              className="ui-input rounded-md px-2 py-1.5 text-xs">
              {Array.from({ length: historyTotalPages || 1 }, (_, idx) => (
                <option key={idx} value={idx}>
                  Page {idx + 1}
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                void loadHistories(
                  Math.min(
                    Math.max(historyTotalPages - 1, 0),
                    historyPage + 1,
                  ),
                )
              }
              disabled={
                historyLoading ||
                historyTotalPages <= 0 ||
                historyPage >= historyTotalPages - 1
              }
              className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
              Next
            </button>
            {historyTotalPages > 1 && historyPage < historyTotalPages - 1 && (
              <button
                onClick={() =>
                  void loadHistories(Math.max(historyTotalPages - 1, 0))
                }
                disabled={historyLoading}
                className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                Last
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
