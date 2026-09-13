import { useCallback, useEffect, useState } from 'react';

const KEY = 'amr-notif-prefs';

const DEFAULT = {
  email: 'critical',
  desktop: true,
  sms: false,
  phone: '',
};

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
    } catch {
      return DEFAULT;
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  }, [prefs]);

  const update = useCallback((patch) => {
    setPrefs((p) => ({ ...p, ...patch }));
  }, []);

  return { prefs, update };
}
