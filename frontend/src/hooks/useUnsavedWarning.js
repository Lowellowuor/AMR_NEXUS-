import { useEffect } from 'react';

export function useUnsavedWarning(enabled) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled]);
}
