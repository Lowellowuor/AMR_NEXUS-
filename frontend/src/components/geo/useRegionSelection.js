import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useRegionSelection({ paramKey = 'region' } = {}) {
  const [params, setParams] = useSearchParams();

  const selectedKey = useMemo(() => params.get(paramKey) || null, [params, paramKey]);

  const select = useCallback((key) => {
    const next = new URLSearchParams(params);
    if (key == null || key === '') next.delete(paramKey);
    else next.set(paramKey, String(key));
    setParams(next, { replace: true });
  }, [params, setParams, paramKey]);

  const clear = useCallback(() => select(null), [select]);

  return { selectedKey, select, clear };
}