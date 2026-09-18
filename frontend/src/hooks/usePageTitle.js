import { useEffect } from 'react';

const BASE = 'AMR Nexus';

export function usePageTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title}  -  ${BASE}` : BASE;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
