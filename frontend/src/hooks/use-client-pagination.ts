import { useCallback, useEffect, useMemo, useState } from "react";

export function useClientPagination<T>(items: T[], initialPageSize: number) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(() =>
    Math.max(1, Math.floor(initialPageSize)),
  );
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, pages));
  }, [pages]);

  const records = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const resetPage = useCallback(() => setPage(1), []);
  const setPageSize = useCallback((next: number) => {
    setPageSizeState(Math.max(1, Math.floor(next)));
    setPage(1);
  }, []);

  return {
    page,
    pages,
    total,
    pageSize,
    records,
    setPage,
    setPageSize,
    resetPage,
  };
}
