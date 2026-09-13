import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/api$/, '');

export function useAlertStream({ onAlert } = {}) {
  const socketRef = useRef(null);
  const callbackRef = useRef(onAlert);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    callbackRef.current = onAlert;
  }, [onAlert]);

  useEffect(() => {
    let cancelled = false;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 15000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (!cancelled) setConnected(true);
    });
    socket.on('disconnect', () => {
      if (!cancelled) setConnected(false);
    });
    socket.on('connect_error', () => {
      if (!cancelled) setConnected(false);
    });

    const handler = (payload) => {
      callbackRef.current?.(payload);
    };

    socket.on('dashboard_notification_push', handler);
    socket.on('prediction_complete', handler);

    return () => {
      cancelled = true;
      socket.off('dashboard_notification_push', handler);
      socket.off('prediction_complete', handler);
      socket.disconnect();
    };
  }, []);

  return { connected };
}
