import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedValue } from './useDebouncedValue';

export function useAuditFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      search: searchParams.get('search') || '',
      actor: searchParams.get('actor') || '',
      action: searchParams.get('action') || 'all',
      resource: searchParams.get('resource') || 'all',
      result: searchParams.get('result') || 'all',
      start_date: searchParams.get('start_date') || '',
      end_date: searchParams.get('end_date') || '',
      page: parseInt(searchParams.get('page') || '0', 10),
    }),
    [searchParams],
  );

  const [searchInput, setSearchInput] = useState(filters.search);
  const debounced = useDebouncedValue(searchInput, 400);

  useEffect(() => {
    if (debounced !== filters.search) updateFilter({ search: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    setSearchInput(filters.search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  const updateFilter = useCallback(
    (patch, resetPage = true) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === '' || v === null || v === undefined || v === 'all') next.delete(k);
        else next.set(k, String(v));
      });
      if (resetPage) next.set('page', '0');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.search) p.set('search', filters.search);
    if (filters.actor) p.set('actor', filters.actor);
    if (filters.action !== 'all') p.set('action', filters.action);
    if (filters.resource !== 'all') p.set('resource', filters.resource);
    if (filters.result !== 'all') p.set('result', filters.result);
    if (filters.start_date) p.set('start_date', filters.start_date);
    if (filters.end_date) p.set('end_date', filters.end_date);
    return p.toString();
  }, [filters]);

  const hasActiveFilters =
    !!filters.search ||
    !!filters.actor ||
    filters.action !== 'all' ||
    filters.resource !== 'all' ||
    filters.result !== 'all' ||
    !!filters.start_date ||
    !!filters.end_date;

  return { filters, searchInput, setSearchInput, updateFilter, resetFilters, queryParams, hasActiveFilters };
}
