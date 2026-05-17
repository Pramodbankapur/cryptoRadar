interface PaginationProps {
  onPageChange: (page: number) => void;
  page: number;
  totalPages: number;
}

export function Pagination({ onPageChange, page, totalPages }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination">
      <button
        className="ghost-button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        type="button"
      >
        Previous
      </button>
      <span className="muted-copy">
        Page {page} of {totalPages}
      </span>
      <button
        className="ghost-button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        type="button"
      >
        Next
      </button>
    </div>
  );
}
