import { useCallback, useEffect, useState } from 'react';

const PROMPT_KEY = 'amr-notif-prompt-shown';

export function useBrowserNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  );
  const [promptDismissed, setPromptDismissed] = useState(
    () => sessionStorage.getItem(PROMPT_KEY) === '1',
  );

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    const check = () => setPermission(Notification.permission);
    check();
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, []);

  const requestPermission = useCallback(async () => {
    sessionStorage.setItem(PROMPT_KEY, '1');
    setPromptDismissed(true);
    if (typeof Notification === 'undefined') return 'unsupported';
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const dismissPrompt = useCallback(() => {
    sessionStorage.setItem(PROMPT_KEY, '1');
    setPromptDismissed(true);
  }, []);

  const notify = useCallback(
    (title, options = {}) => {
      if (typeof Notification === 'undefined') return;
      if (Notification.permission !== 'granted') return;
      if (document.hasFocus()) return;
      try {
        const n = new Notification(title, {
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: options.tag || 'amr-alert',
          requireInteraction: options.requireInteraction ?? false,
          ...options,
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch {
        // silent
      }
    },
    [],
  );

  const showPrompt = permission === 'default' && !promptDismissed;

  return { permission, requestPermission, dismissPrompt, notify, showPrompt };
}
