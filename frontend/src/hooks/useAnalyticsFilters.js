import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useAnalyticsFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(() => ({
    tab: params.get('tab') || 'summary',
    start_date: params.get('start_date') || '',
    end_date: params.get('end_date') || '',
    county: params.get('county') || '',
    pathogen: params.get('pathogen') || '',
    sector: params.get('sector') || '',
    preset: params.get('preset') || '90d',
  }), [params]);

  const update = useCallback((patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === '' || v === null || v === undefined) next.delete(k);
      else next.set(k, String(v));
    });
    setParams(next, { replace: true });
  }, [params, setParams]);

  const reset = useCallback(() => {
    setParams(new URLSearchParams(), { replace: true });
  }, [setParams]);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.start_date) p.set('start_date', filters.start_date);
    if (filters.end_date) p.set('end_date', filters.end_date);
    if (filters.county) p.set('county', filters.county);
    if (filters.pathogen) p.set('pathogen', filters.pathogen);
    if (filters.sector) p.set('sector', filters.sector);
    return p.toString();
  }, [filters]);

  return { filters, update, reset, queryParams };
}
