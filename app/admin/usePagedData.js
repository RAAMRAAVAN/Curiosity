'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Server-side paged list state: page/pageSize/search are sent to the API and results are never sliced locally.
export default function usePagedData({ endpoint, enabled = true, params = {}, initialPageSize = 25, debounceMs = 350 }) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const latest = useRef(0);

  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), debounceMs);
    return () => clearTimeout(timer);
  }, [search, debounceMs]);

  useEffect(() => { setPage(0); }, [debouncedSearch, paramsKey, pageSize]);

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    const requestId = latest.current + 1;
    latest.current = requestId;

    (async () => {
      try {
        setLoading(true);
        setError('');
        const query = new URLSearchParams({ page: String(page + 1), pageSize: String(pageSize) });
        if (debouncedSearch) query.set('search', debouncedSearch);
        Object.entries(JSON.parse(paramsKey)).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
        });
        const response = await fetch(`${endpoint}?${query}`, { credentials: 'include', signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load data.');
        if (latest.current !== requestId) return;

        const meta = result.pagination || {};
        // The last page may disappear after a delete; step back instead of showing an empty table.
        if (meta.totalPages && page + 1 > meta.totalPages) {
          setPage(meta.totalPages - 1);
          return;
        }
        setRows(Array.isArray(result.data) ? result.data : []);
        setTotal(meta.total ?? 0);
        setMeta(meta);
      } catch (err) {
        if (err.name === 'AbortError') return;
        if (latest.current === requestId) {
          setError(err.message || 'Unable to load data.');
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (latest.current === requestId) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [endpoint, enabled, page, pageSize, debouncedSearch, paramsKey, reloadToken]);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  const paginationProps = useMemo(() => ({
    component: 'div',
    count: total,
    page,
    onPageChange: (_event, next) => setPage(next),
    rowsPerPage: pageSize,
    onRowsPerPageChange: (event) => setPageSize(Number(event.target.value)),
    rowsPerPageOptions: [10, 25, 50, 100],
  }), [total, page, pageSize]);

  return { rows, total, meta, loading, error, search, setSearch, page, setPage, pageSize, setPageSize, reload, paginationProps };
}

// Fetches every page for a filtered list (exports, label sheets) without loading it all into the table.
export async function fetchAllPages(endpoint, params = {}, { pageSize = 200, limit = 5000 } = {}) {
  const all = [];
  for (let page = 1; all.length < limit; page += 1) {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
    });
    const response = await fetch(`${endpoint}?${query}`, { credentials: 'include' });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load data.');
    all.push(...(result.data || []));
    if (page >= (result.pagination?.totalPages || 1)) break;
  }
  return all.slice(0, limit);
}
