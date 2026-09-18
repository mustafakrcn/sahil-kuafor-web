'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Check, XCircle, Bell, User, Scissors, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { createSupabaseClient } from '../../lib/supabase/client';
import type { NotificationToastData } from '../../hooks/useNotifications';

type Props = {
  toast: NotificationToastData;
  onRemove: (id: string) => void;
};

export default function NotificationToast({ toast, onRemove }: Props) {
  const supabase = createSupabaseClient();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [loading, setLoading] = useState<'confirm' | 'reject' | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slide-in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    timerRef.current = setTimeout(() => handleClose(), 12000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    setLeaving(true);
    setTimeout(() => onRemove(toast.id), 350);
  };

  const updateStatus = async (newStatus: 'confirmed' | 'cancelled') => {
    setLoading(newStatus === 'confirmed' ? 'confirm' : 'reject');
    if (timerRef.current) clearTimeout(timerRef.current);
    await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', toast.appointmentId);
    handleClose();
  };

  let startFormatted = '';
  let endFormatted = '';
  try {
    startFormatted = format(parseISO(toast.startAt), 'HH:mm', { locale: tr });
    endFormatted = format(parseISO(toast.endAt), 'HH:mm', { locale: tr });
  } catch {}

  return (
    <div
      style={{
        transform: visible && !leaving ? 'translateX(0)' : 'translateX(110%)',
        opacity: leaving ? 0 : 1,
        transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
      }}
      className="w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-red-700/20 to-red-900/10 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell size={16} className="text-red-400" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </div>
          <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
            Yeni Randevu
          </span>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-200">
          <User size={13} className="text-gray-500 shrink-0" />
          <span className="font-semibold text-white truncate">{toast.customerName}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Scissors size={13} className="text-gray-500 shrink-0" />
          <span className="truncate">{toast.serviceName}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Clock size={13} className="text-gray-500 shrink-0" />
          <span>{startFormatted} – {endFormatted}</span>
        </div>
        {toast.staffName && (
          <div className="text-xs text-gray-500">
            Berber: <span className="text-gray-300">{toast.staffName}</span>
          </div>
        )}
        {toast.notes && (
          <div className="mt-1 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-200">
            Not: {toast.notes}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-gray-800">
        <div
          className="h-full bg-red-600"
          style={{ animation: 'toast-drain 12s linear forwards' }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 py-3 bg-gray-950/60">
        <button
          onClick={() => updateStatus('confirmed')}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white text-xs font-semibold py-2 rounded-lg transition-all active:scale-95"
        >
          {loading === 'confirm' ? (
            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <Check size={13} />
          )}
          Onayla
        </button>
        <button
          onClick={() => updateStatus('cancelled')}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-red-900/40 border border-gray-700 hover:border-red-500/40 disabled:opacity-60 text-red-400 text-xs font-semibold py-2 rounded-lg transition-all active:scale-95"
        >
          {loading === 'reject' ? (
            <span className="w-3 h-3 border-2 border-red-400/40 border-t-red-400 rounded-full animate-spin" />
          ) : (
            <XCircle size={13} />
          )}
          Reddet
        </button>
      </div>
    </div>
  );
}
