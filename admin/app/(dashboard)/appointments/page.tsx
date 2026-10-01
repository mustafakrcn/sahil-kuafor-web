'use client';

import dynamic from 'next/dynamic';
import { Bell, Calendar } from 'lucide-react';

const AppointmentCalendar = dynamic(
  () => import('../../../components/calendar/AppointmentCalendar'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-3">
        <div className="w-10 h-10 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
        <p className="text-sm font-medium">Takvim yükleniyor…</p>
      </div>
    ),
  }
);

export default function AppointmentsPage() {
  return (
    <div>
      {/* Sayfa Başlığı */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-red-500/15 rounded-xl flex items-center justify-center">
              <Calendar size={16} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Randevu Takvimi</h1>
          </div>
          <p className="text-gray-500 text-sm ml-10">
            Tüm randevuları takip edin, onaylayın ve yönetin. Gerçek zamanlı bildirimler aktif.
          </p>
        </div>

        {/* Bilgi Çipleri */}
        <div className="flex items-center gap-2 ml-10 sm:ml-0">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Canlı
          </div>
          <div className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 text-gray-400 px-3 py-1.5 rounded-xl text-xs font-medium">
            <Bell size={12} />
            Bildirimler açık
          </div>
        </div>
      </div>

      {/* Takvim Bileşeni */}
      <AppointmentCalendar />
    </div>
  );
}
