import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedValue } from './useDebouncedValue';

export function useAlertsFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      search: searchParams.get('search') || '',
      severity: searchParams.get('severity') || 'all',
      type: searchParams.get('type') || 'all',
      status: searchParams.get('status') || 'unacknowledged',
      county: searchParams.get('county') || '',
      start_date: searchParams.get('start_date') || '',
      end_date: searchParams.get('end_date') || '',
      sort_by: searchParams.get('sort_by') || 'timestamp',
      sort_dir: searchParams.get('sort_dir') || 'desc',
    }),
    [searchParams],
  );

  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      updateFilter({ search: debouncedSearch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    setSearchInput(filters.search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  const updateFilter = useCallback(
    (patch) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === '' || v === null || v === undefined || v === 'all') {
          next.delete(k);
        } else {
          next.set(k, String(v));
        }
      });
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
    if (filters.severity !== 'all') p.set('severity', filters.severity);
    if (filters.type !== 'all') p.set('type', filters.type);
    if (filters.status && filters.status !== 'all') p.set('status', filters.status);
    if (filters.county) p.set('county', filters.county);
    p.set('limit', '500');
    return p.toString();
  }, [filters]);

  const hasActiveFilters =
    !!filters.search ||
    filters.severity !== 'all' ||
    filters.type !== 'all' ||
    !!filters.county ||
    !!filters.start_date ||
    !!filters.end_date ||
    filters.status !== 'unacknowledged';

  return {
    filters,
    searchInput,
    setSearchInput,
    updateFilter,
    resetFilters,
    queryParams,
    hasActiveFilters,
  };
}
