import { ButtonLink } from "@/components/button";

export function parsePage(value: string | string[] | undefined): number {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

type PaginationProps = { basePath: string; page: number; hasPrevious: boolean; hasNext: boolean };

export function Pagination({ basePath, page, hasPrevious, hasNext }: PaginationProps) {
  if (!hasPrevious && !hasNext) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
      {hasPrevious ? (
        <ButtonLink href={`${basePath}?page=${page - 1}`} variant="secondary">
          Previous
        </ButtonLink>
      ) : (
        <span />
      )}
      <span className="text-muted">Page {page}</span>
      {hasNext ? (
        <ButtonLink href={`${basePath}?page=${page + 1}`} variant="secondary">
          Next
        </ButtonLink>
      ) : (
        <span />
      )}
    </nav>
  );
}
