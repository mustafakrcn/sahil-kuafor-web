'use client';

import { useState, useCallback } from 'react';

export type NotificationToastData = {
  id: string;
  appointmentId: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  startAt: string;
  endAt: string;
  notes?: string;
  createdAt: number;
};

export function useNotifications() {
  const [pendingCount, setPendingCount] = useState(0);
  const [toasts, setToasts] = useState<NotificationToastData[]>([]);

  // Sayıyı doğrudan set et (fetch sonrası)
  const setPending = useCallback((count: number) => {
    setPendingCount(count);
  }, []);

  // Fonksiyonel updater (prev => prev + 1) için
  const incrementPending = useCallback(() => {
    setPendingCount((prev) => prev + 1);
  }, []);

  const addToast = useCallback((toast: NotificationToastData) => {
    setToasts((prev) => [toast, ...prev].slice(0, 5)); // max 5 toast
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const requestBrowserPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }, []);

  const sendBrowserNotification = useCallback(
    (title: string, body: string, tag?: string) => {
      if (typeof window === 'undefined') return;
      if (Notification.permission !== 'granted') return;
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: tag ?? 'appointment',
        badge: '/favicon.ico',
      });
    },
    []
  );

  return {
    pendingCount,
    setPending,
    incrementPending,
    toasts,
    addToast,
    removeToast,
    requestBrowserPermission,
    sendBrowserNotification,
  };
}
