interface PaginationProps {
  page: number;
  totalPages: number;
  totalElements: number;
  onPage: (page: number) => void;
}

export default function Pagination({ page, totalPages, totalElements, onPage }: PaginationProps) {
  if (totalPages <= 0) return null;
  return (
    <div className="flex items-center justify-between border-t border-neutral-800 pt-3 text-sm text-neutral-400">
      <span>{totalElements.toLocaleString()} total</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(0)}
          disabled={page === 0}
          className="rounded px-2 py-1 hover:bg-neutral-800 disabled:opacity-30 transition-colors"
        >
          «
        </button>
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 0}
          className="rounded px-2 py-1 hover:bg-neutral-800 disabled:opacity-30 transition-colors"
        >
          ‹
        </button>
        <span className="px-3">
          {page + 1} / {totalPages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages - 1}
          className="rounded px-2 py-1 hover:bg-neutral-800 disabled:opacity-30 transition-colors"
        >
          ›
        </button>
        <button
          onClick={() => onPage(totalPages - 1)}
          disabled={page >= totalPages - 1}
          className="rounded px-2 py-1 hover:bg-neutral-800 disabled:opacity-30 transition-colors"
        >
          »
        </button>
      </div>
    </div>
  );
}
