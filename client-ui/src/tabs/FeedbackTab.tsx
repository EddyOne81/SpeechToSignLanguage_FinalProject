import React from "react";
import { AlertCircle, Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { formatDate } from "../utils/format";
import type {
  FeedbackFormData,
  FeedbackItem,
  FeedbackSortType,
} from "../types";

interface FeedbackTabProps {
  authToken: string | null;
  feedbackItems: FeedbackItem[];
  feedbackPage: number;
  feedbackTotalPages: number;
  feedbackTotalElements: number;
  feedbackHistoryIdSearch: string;
  setFeedbackHistoryIdSearch: (v: string) => void;
  feedbackSort: FeedbackSortType;
  setFeedbackSort: (v: FeedbackSortType) => void;
  feedbackLoading: boolean;
  feedbackSubmitting: boolean;
  feedbackError: string | null;
  feedbackForm: FeedbackFormData;
  setFeedbackForm: React.Dispatch<React.SetStateAction<FeedbackFormData>>;
  loadFeedbacks: (
    targetPage?: number,
    overrideHistoryId?: string,
    overrideSort?: FeedbackSortType,
  ) => Promise<void>;
  submitFeedback: () => Promise<void>;
  deleteFeedback: (feedbackId: number) => Promise<void>;
  openHistoryFromFeedback: (historyId?: number | null) => Promise<void>;
}

export default function FeedbackTab({
  authToken,
  feedbackItems,
  feedbackPage,
  feedbackTotalPages,
  feedbackTotalElements,
  feedbackHistoryIdSearch,
  setFeedbackHistoryIdSearch,
  feedbackSort,
  setFeedbackSort,
  feedbackLoading,
  feedbackSubmitting,
  feedbackError,
  feedbackForm,
  setFeedbackForm,
  loadFeedbacks,
  submitFeedback,
  deleteFeedback,
  openHistoryFromFeedback,
}: FeedbackTabProps) {
  return (
    <div className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="flex flex-col gap-4 glass-panel rounded-2xl p-5 shadow-lg xl:col-span-4">
        <h3 className="text-sm font-semibold ">
          Submit Feedback
        </h3>
        <p className="text-xs text-slate-500">
          Link your feedback to a history item to improve traceability.
        </p>
        {!authToken ? (
          <div className="glass-inset rounded-xl p-4 text-sm text-slate-500">
            Login to submit feedback.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-wide text-slate-500">
                History ID
              </label>
              <input
                value={feedbackForm.historyId}
                onChange={(event) =>
                  setFeedbackForm((prev) => ({
                    ...prev,
                    historyId: event.target.value,
                  }))
                }
                placeholder="Example: 12"
                className="ui-input w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-wide text-slate-500">
                Rating
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={feedbackForm.rating}
                onChange={(event) =>
                  setFeedbackForm((prev) => ({
                    ...prev,
                    rating: event.target.value,
                  }))
                }
                className="ui-input w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-wide text-slate-500">
                Comment
              </label>
              <textarea
                value={feedbackForm.comment}
                onChange={(event) =>
                  setFeedbackForm((prev) => ({
                    ...prev,
                    comment: event.target.value,
                  }))
                }
                placeholder="Your feedback..."
                className="ui-input h-24 w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={submitFeedback}
              disabled={feedbackSubmitting}
              className="ui-btn-primary flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60">
              <MessageSquare className="h-4 w-4" />
              {feedbackSubmitting ? "Saving..." : "Send Feedback"}
            </button>
            {feedbackError && (
              <div className="ui-alert-error flex items-center rounded-lg p-2 text-xs">
                <AlertCircle className="mr-2 h-4 w-4" />
                {feedbackError}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex min-h-[320px] flex-col glass-panel rounded-2xl p-5 shadow-lg xl:col-span-8">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold ">
            Your Feedbacks
          </h3>
          <button
            onClick={() => {
              setFeedbackHistoryIdSearch("");
              setFeedbackSort("latest");
              void loadFeedbacks(0, "", "latest");
            }}
            className="flex items-center gap-2 ui-btn-secondary rounded-full px-3 py-1 text-[11px] uppercase transition">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={feedbackHistoryIdSearch}
            onChange={(event) =>
              setFeedbackHistoryIdSearch(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void loadFeedbacks(0);
              }
            }}
            placeholder="Search by History ID"
            className="ui-input min-w-[150px] flex-1 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={feedbackSort}
            onChange={(event) =>
              setFeedbackSort(event.target.value as FeedbackSortType)
            }
            className="ui-input min-w-[140px] flex-1 rounded-lg px-3 py-2 text-sm">
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="rating_high">Rating Highest</option>
            <option value="rating_low">Rating Lowest</option>
          </select>
          <button
            onClick={() => void loadFeedbacks(0)}
            className="ui-btn-primary flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">
            Apply
          </button>
        </div>
        <div className="mt-2 text-right text-xs text-slate-500">
          {feedbackTotalElements} total
        </div>
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
          {!authToken ? (
            <p className="text-sm text-slate-500">
              Login to view your feedbacks.
            </p>
          ) : feedbackLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading feedbacks...
            </div>
          ) : feedbackItems.length > 0 ? (
            feedbackItems.map((item) => (
              <div
                key={item.feedbackId}
                className="glass-inset rounded-xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-200">
                      Rating: {item.rating ?? "-"}/5
                    </p>
                    {item.comment && (
                      <p className="text-sm text-slate-400">
                        {item.comment}
                      </p>
                    )}
                    {item.historyId && (
                      <p className="text-xs text-slate-500">
                        History ID: {item.historyId}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs text-slate-500">
                      {formatDate(item.updatedAt ?? item.createdAt)}
                    </span>
                    {item.historyId && (
                      <button
                        onClick={() =>
                          void openHistoryFromFeedback(item.historyId)
                        }
                        className="rounded-full border border-violet-300/40 bg-violet-300/12 px-3 py-1 text-[11px] uppercase text-violet-100 transition hover:border-violet-300/80">
                        View History
                      </button>
                    )}
                    <button
                      onClick={() => void deleteFeedback(item.feedbackId)}
                      className="rounded-full border border-rose-300/35 bg-rose-300/12 px-3 py-1 text-[11px] uppercase text-rose-100 transition hover:border-rose-300/70">
                      Delete
                    </button>
                    {item.historyId && (
                      <button
                        onClick={() =>
                          setFeedbackForm((prev) => ({
                            ...prev,
                            historyId: String(item.historyId ?? ""),
                            rating: String(item.rating ?? "5"),
                            comment: item.comment ?? "",
                          }))
                        }
                        className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] uppercase text-slate-200 transition hover:border-violet-300/45">
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              No feedback submissions yet.
            </p>
          )}
        </div>
        {authToken && !feedbackError && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/40 pt-3">
            <div className="text-xs text-slate-400">
              Page {feedbackTotalPages > 0 ? feedbackPage + 1 : 0} /{" "}
              {feedbackTotalPages || 0}
            </div>
            <div className="flex items-center gap-2">
              {feedbackTotalPages > 1 && feedbackPage > 0 && (
                <button
                  onClick={() => void loadFeedbacks(0)}
                  disabled={feedbackLoading}
                  className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                  First
                </button>
              )}
              <button
                onClick={() =>
                  void loadFeedbacks(Math.max(0, feedbackPage - 1))
                }
                disabled={feedbackLoading || feedbackPage <= 0}
                className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                Prev
              </button>
              <select
                value={feedbackTotalPages > 0 ? feedbackPage : 0}
                onChange={(event) =>
                  void loadFeedbacks(Number(event.target.value))
                }
                disabled={feedbackLoading || feedbackTotalPages <= 0}
                className="ui-input rounded-md px-2 py-1.5 text-xs">
                {Array.from(
                  { length: feedbackTotalPages || 1 },
                  (_, idx) => (
                    <option key={idx} value={idx}>
                      Page {idx + 1}
                    </option>
                  ),
                )}
              </select>
              <button
                onClick={() =>
                  void loadFeedbacks(
                    Math.min(
                      Math.max(feedbackTotalPages - 1, 0),
                      feedbackPage + 1,
                    ),
                  )
                }
                disabled={
                  feedbackLoading ||
                  feedbackTotalPages <= 0 ||
                  feedbackPage >= feedbackTotalPages - 1
                }
                className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                Next
              </button>
              {feedbackTotalPages > 1 &&
                feedbackPage < feedbackTotalPages - 1 && (
                  <button
                    onClick={() =>
                      void loadFeedbacks(
                        Math.max(feedbackTotalPages - 1, 0),
                      )
                    }
                    disabled={feedbackLoading}
                    className="ui-btn-secondary rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                    Last
                  </button>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
