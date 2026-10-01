import { useState, useEffect, useMemo } from 'react';
import { debounce } from 'lodash';
import api from '../api/client';

export function useSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const performSearch = useMemo(
    () =>
      debounce(async (term) => {
        if (!term.trim()) {
          setResults([]);
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          const data = await api.search(term, 20);
          setResults(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error('Search failed:', err);
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 300),
    [],
  );

  useEffect(() => () => performSearch.cancel(), [performSearch]);

  return { results, loading, performSearch };
}
