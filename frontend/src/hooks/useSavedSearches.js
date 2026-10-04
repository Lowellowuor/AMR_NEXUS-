import { useCallback, useState } from 'react';

const STORAGE_KEY = 'amr-history-saved-searches';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // storage full or unavailable — fail silently
  }
}

export function useSavedSearches() {
  const [searches, setSearches] = useState(() => load());

  const save = useCallback((name, filters) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed,
      filters,
      savedAt: new Date().toISOString(),
    };
    setSearches((prev) => {
      const next = [...prev.filter((s) => s.name !== trimmed), entry];
      persist(next);
      return next;
    });
    return entry;
  }, []);

  const remove = useCallback((id) => {
    setSearches((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persist(next);
      return next;
    });
  }, []);

  const rename = useCallback((id, newName) => {
    const trimmed = (newName || '').trim();
    if (!trimmed) return;
    setSearches((prev) => {
      const next = prev.map((s) =>
        s.id === id ? { ...s, name: trimmed } : s,
      );
      persist(next);
      return next;
    });
  }, []);

  return { searches, save, remove, rename };
}