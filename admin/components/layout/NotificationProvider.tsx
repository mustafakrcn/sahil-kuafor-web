'use client';

import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { createSupabaseClient } from '../../lib/supabase/client';
import { useNotifications, type NotificationToastData } from '../../hooks/useNotifications';
import NotificationToast from '../ui/NotificationToast';

/* ─── Context ─────────────────────────────────────────────── */
type NotificationContextValue = {
  pendingCount: number;
};

const NotificationContext = createContext<NotificationContextValue>({
  pendingCount: 0,
});

export function useNotificationContext() {
  return useContext(NotificationContext);
}

/* ─── Provider ────────────────────────────────────────────── */
export default function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseClient();
  const [isMounted, setIsMounted] = useState(false);
  const {
    pendingCount,
    setPending,
    incrementPending,
    toasts,
    addToast,
    removeToast,
    requestBrowserPermission,
    sendBrowserNotification,
  } = useNotifications();

  useEffect(() => { setIsMounted(true); }, []);

  /* İlk yüklemede bekleyen randevu sayısını çek */
  const fetchPendingCount = useCallback(async () => {
    const { count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    setPending(count ?? 0);
  }, [supabase, setPending]);

  /* Yeni randevu gelince toast verisi oluştur */
  const buildToast = useCallback(
    async (appointmentId: string): Promise<NotificationToastData | null> => {
      const { data, error } = await supabase
        .from('appointments')
        .select(
          `id, start_at, end_at, notes, status,
           customer:profiles!appointments_customer_id_fkey(full_name),
           staff(profiles(full_name)),
           services(name)`
        )
        .eq('id', appointmentId)
        .single();

      if (error || !data) return null;

      return {
        id: crypto.randomUUID(),
        appointmentId: data.id,
        customerName: (data.customer as any)?.full_name ?? 'Bilinmiyor',
        serviceName: (data.services as any)?.name ?? '',
        staffName: (data.staff as any)?.profiles?.full_name ?? '',
        startAt: data.start_at,
        endAt: data.end_at,
        notes: data.notes ?? '',
        createdAt: Date.now(),
      };
    },
    [supabase]
  );

  useEffect(() => {
    /* Tarayıcı bildirim izni iste */
    requestBrowserPermission();

    /* İlk sayımı al */
    fetchPendingCount();

    /* Realtime subscription */
    const channel = supabase
      .channel('notification-provider-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'appointments' },
        async (payload) => {
          if (payload.new?.status !== 'pending') return;

          /* Pending sayısını artır */
          incrementPending();

          /* Toast verisi oluştur */
          const toast = await buildToast(payload.new.id);
          if (toast) {
            addToast(toast);
            /* Browser native notification */
            sendBrowserNotification(
              '💈 Yeni Randevu!',
              `${toast.customerName} — ${toast.serviceName}`,
              toast.appointmentId
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'appointments' },
        () => {
          /* Güncelleme olunca pending sayısını yenile */
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    supabase,
    fetchPendingCount,
    buildToast,
    addToast,
    incrementPending,
    setPending,
    requestBrowserPermission,
    sendBrowserNotification,
  ]);

  return (
    <NotificationContext.Provider value={{ pendingCount }}>
      {children}

      {/* Toast portal — sağ alt köşe (hydration-safe) */}
      {isMounted &&
        createPortal(
          <div
            className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end pointer-events-none"
            aria-live="polite"
          >
            {toasts.map((toast) => (
              <div key={toast.id} className="pointer-events-auto">
                <NotificationToast toast={toast} onRemove={removeToast} />
              </div>
            ))}
          </div>,
          document.body
        )}
    </NotificationContext.Provider>
  );
}
