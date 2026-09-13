import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedValue } from './useDebouncedValue';

export function useHistoryFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      search: searchParams.get('search') || '',
      mdr: searchParams.get('mdr') || 'all',
      anomaly: searchParams.get('anomaly') || 'all',
      pathogen: searchParams.get('pathogen') || '',
      county: searchParams.get('county') || '',
      sector: searchParams.get('sector') || '',
      start_date: searchParams.get('start_date') || '',
      end_date: searchParams.get('end_date') || '',
      sort_by: searchParams.get('sort_by') || 'created_at',
      sort_dir: searchParams.get('sort_dir') || 'desc',
      page: parseInt(searchParams.get('page') || '0', 10),
    }),
    [searchParams],
  );

  const updateFilter = useCallback(
    (patch, resetPage = true) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === '' || v === null || v === undefined || v === 'all') {
          next.delete(k);
        } else {
          next.set(k, String(v));
        }
      });
      if (resetPage) next.set('page', '0');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

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

  const filterParams = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.search) p.set('search', filters.search);
    if (filters.mdr !== 'all') p.set('mdr', filters.mdr);
    if (filters.anomaly !== 'all') p.set('anomaly', filters.anomaly);
    if (filters.pathogen) p.set('pathogen', filters.pathogen);
    if (filters.county) p.set('county', filters.county);
    if (filters.sector) p.set('sector', filters.sector);
    if (filters.start_date) p.set('start_date', filters.start_date);
    if (filters.end_date) p.set('end_date', filters.end_date);
    p.set('sort_by', filters.sort_by);
    p.set('sort_dir', filters.sort_dir);
    return p.toString();
  }, [filters]);

  const hasActiveFilters =
    !!filters.search ||
    filters.mdr !== 'all' ||
    filters.anomaly !== 'all' ||
    !!filters.pathogen ||
    !!filters.county ||
    !!filters.sector ||
    !!filters.start_date ||
    !!filters.end_date;

  const toggleSort = useCallback(
    (column) => {
      if (filters.sort_by === column) {
        updateFilter({ sort_dir: filters.sort_dir === 'desc' ? 'asc' : 'desc' });
      } else {
        updateFilter({ sort_by: column, sort_dir: 'desc' });
      }
    },
    [filters.sort_by, filters.sort_dir, updateFilter],
  );

  return {
    filters,
    searchInput,
    setSearchInput,
    updateFilter,
    resetFilters,
    filterParams,
    hasActiveFilters,
    toggleSort,
  };
}
