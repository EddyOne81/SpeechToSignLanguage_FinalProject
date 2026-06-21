import React from "react";
import { AlertCircle, Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { formatDate } from "../utils/format";
import type {
  FeedbackFormData,
  FeedbackItem,
  FeedbackSortType,
} from "../types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FeedbackTabProps {
  isLoggedIn: boolean;
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
  isLoggedIn,
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
    <div className="grid flex-1 min-h-0 grid-cols-1 gap-6 xl:grid-cols-12 xl:grid-rows-1">
      <div className="flex flex-col gap-4 glass-panel rounded-2xl p-5 shadow-lg xl:col-span-4">
        <h3 className="text-sm font-semibold ">
          Submit Feedback
        </h3>
        <p className="text-xs text-slate-500">
          Link your feedback to a history item to improve traceability.
        </p>
        {!isLoggedIn ? (
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

      <div className="flex min-h-0 flex-col overflow-hidden glass-panel rounded-2xl p-5 shadow-lg xl:col-span-8">
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
          <Select
            variant="ui"
            value={feedbackSort}
            onValueChange={(v) => {
              const sort = v as FeedbackSortType;
              setFeedbackSort(sort);
              void loadFeedbacks(0, feedbackHistoryIdSearch, sort);
            }}
          >
            <SelectTrigger className="min-w-[150px] flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="rating_high">Rating Highest</SelectItem>
              <SelectItem value="rating_low">Rating Lowest</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => void loadFeedbacks(0)}
            className="ui-btn-primary flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">
            Apply
          </button>
        </div>
        <div className="mt-2 text-right text-xs text-slate-500">
          {feedbackTotalElements} total
        </div>
        <div className="mt-4 flex-1 min-h-0 space-y-3 overflow-y-auto">
          {!isLoggedIn ? (
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
                        className="ui-pill-accent rounded-full px-3 py-1 text-[11px] uppercase transition">
                        View History
                      </button>
                    )}
                    <button
                      onClick={() => void deleteFeedback(item.feedbackId)}
                      className="ui-pill-danger rounded-full px-3 py-1 text-[11px] uppercase transition">
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
                        className="ui-pill-neutral rounded-full px-3 py-1 text-[11px] uppercase transition">
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
        {isLoggedIn && !feedbackError && (
          <div className="ui-divider-top mt-4 shrink-0 flex flex-wrap items-center justify-between gap-3 pt-3">
            <div className="text-xs text-slate-400">
              Page {feedbackTotalPages > 0 ? feedbackPage + 1 : 0} /{" "}
              {feedbackTotalPages || 0}
            </div>
            <div className="flex items-center gap-2">
              {feedbackTotalPages > 1 && feedbackPage > 0 && (
                <button
                  onClick={() => void loadFeedbacks(0)}
                  disabled={feedbackLoading}
                  className="ui-btn-secondary h-9 flex items-center rounded-md px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                  First
                </button>
              )}
              <button
                onClick={() =>
                  void loadFeedbacks(Math.max(0, feedbackPage - 1))
                }
                disabled={feedbackLoading || feedbackPage <= 0}
                className="ui-btn-secondary h-9 flex items-center rounded-md px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
                Prev
              </button>
              <Select
                variant="ui"
                value={String(feedbackTotalPages > 0 ? feedbackPage : 0)}
                onValueChange={(v) => void loadFeedbacks(Number(v))}
                disabled={feedbackLoading || feedbackTotalPages <= 0}
              >
                <SelectTrigger className="w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: feedbackTotalPages || 1 }, (_, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      Page {idx + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                className="ui-btn-secondary h-9 flex items-center rounded-md px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
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
                    className="ui-btn-secondary h-9 flex items-center rounded-md px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">
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
