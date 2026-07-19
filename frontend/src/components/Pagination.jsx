import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

export default function Pagination({ page, totalPages, totalItems, onPageChange }) {
  if (totalItems === undefined || totalItems === null || totalItems === 0) return null;
  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between pt-4">
        <p className="text-sm text-muted-foreground">
          {totalItems} total &middot; Page {page} of {totalPages}
        </p>
      </div>
    );
  }

  const pages = buildPageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        {totalItems !== undefined && (
          <span>{totalItems} total &middot; </span>
        )}
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-1 text-muted-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="sm"
              className="min-w-[32px]"
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function buildPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = [];
  pages.push(1);

  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('...');

  pages.push(total);
  return pages;
}
