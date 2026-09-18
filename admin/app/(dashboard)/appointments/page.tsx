'use client';

import dynamic from 'next/dynamic';

const AppointmentCalendar = dynamic(
  () => import('../../../components/calendar/AppointmentCalendar'),
  { ssr: false, loading: () => <div className="text-white p-4">Takvim Yükleniyor...</div> }
);

export default function AppointmentsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Randevu Takvimi</h1>
        <p className="text-gray-400 mt-1">Tüm randevuları yönetin ve durumlarını güncelleyin.</p>
      </div>

      <div className="bg-gray-900 rounded-xl">
        <AppointmentCalendar />
      </div>
    </div>
  );
}
