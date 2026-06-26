import { useEffect, useState } from "react";
import { AlertCircle, Loader2, MessageSquare, Star, X } from "lucide-react";

interface FeedbackModalProps {
  open: boolean;
  historyText?: string;
  initialRating?: number;
  initialComment?: string;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}

export default function FeedbackModal({
  open,
  historyText,
  initialRating = 5,
  initialComment = "",
  onClose,
  onSubmit,
}: FeedbackModalProps) {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(initialComment);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form each time the modal is (re)opened for a new item.
  useEffect(() => {
    if (open) {
      setRating(initialRating);
      setComment(initialComment);
      setHoverRating(0);
      setError(null);
      setSubmitting(false);
    }
  }, [open, initialRating, initialComment]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      setError("Please choose a rating from 1 to 5 stars.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(rating, comment.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{ background: "rgba(4, 6, 16, 0.6)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 ui-text-accent" />
            <h3 className="text-base font-semibold">Rate this translation</h3>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-slate-400 transition hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {historyText && (
          <div className="glass-inset mt-4 rounded-xl px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Translation</p>
            <p className="mt-1 line-clamp-3 text-sm text-slate-200">{historyText}</p>
          </div>
        )}

        <div className="mt-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Your rating</p>
          <div className="mt-2 flex items-center gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => {
              const value = i + 1;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoverRating(value)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="rounded p-0.5 transition-transform hover:scale-110"
                  aria-label={`${value} star${value > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`h-7 w-7 ${
                      value <= activeRating
                        ? "fill-amber-400 text-amber-400"
                        : "fill-transparent text-slate-500"
                    }`}
                  />
                </button>
              );
            })}
            <span className="ml-2 text-sm font-medium text-slate-400">{rating}/5</span>
          </div>
        </div>

        <div className="mt-5">
          <label className="text-xs uppercase tracking-wide text-slate-500">Comment</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share what was good or what could be improved (optional)…"
            className="ui-input mt-2 h-28 w-full rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {error && (
          <div className="ui-alert-error mt-4 flex items-center rounded-lg p-2.5 text-xs">
            <AlertCircle className="mr-2 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="ui-btn-secondary rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide transition disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="ui-btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4" />
                Send Feedback
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
