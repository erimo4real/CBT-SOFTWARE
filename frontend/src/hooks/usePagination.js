import { useState, useCallback, useRef } from 'react';

export default function usePagination({ initialPage = 1, pageSize = 20, debounceMs = 400 } = {}) {
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const debounceRef = useRef(null);

  const setFilter = useCallback((key, value) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value === '' || value === null || value === undefined) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearch('');
    setPage(1);
  }, []);

  const handleSearch = useCallback((value) => {
    setSearch(value);
    setPage(1);
  }, []);

  const goToPage = useCallback((p) => setPage(p), []);

  const params = {
    page,
    page_size: pageSize,
    ...filters,
    ...(search ? { search } : {}),
  };

  const totalPages = (count) => Math.max(1, Math.ceil(count / pageSize));

  return {
    page,
    search,
    filters,
    params,
    setPage: goToPage,
    setSearch: handleSearch,
    setFilter,
    clearFilters,
    totalPages,
  };
}
