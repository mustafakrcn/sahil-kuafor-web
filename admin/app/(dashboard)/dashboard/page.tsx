import { createSupabaseServer } from '../../../lib/supabase/server';
import { redirect } from 'next/navigation';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Calendar, Clock, Users, TrendingUp, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const todayEnd   = endOfDay(today).toISOString();
  const weekStart  = startOfWeek(today, { weekStartsOn: 1 }).toISOString();
  const weekEnd    = endOfWeek(today, { weekStartsOn: 1 }).toISOString();

  // Bugünkü randevular
  const { data: todayAppts } = await supabase
    .from('appointments')
    .select('*, service:services(name), staff:staff(profile:profiles(full_name))')
    .gte('start_at', todayStart)
    .lte('start_at', todayEnd)
    .order('start_at');

  // İstatistikler
  const { count: weekTotal }    = await supabase.from('appointments')
    .select('*', { count: 'exact', head: true })
    .gte('start_at', weekStart).lte('start_at', weekEnd);

  const { count: pendingCount } = await supabase.from('appointments')
    .select('*', { count: 'exact', head: true }).eq('status', 'pending');

  const { count: totalCustomers } = await supabase.from('profiles')
    .select('*', { count: 'exact', head: true }).eq('role', 'customer');

  const stats = [
    { label: 'Bugünkü Randevu',   value: todayAppts?.length ?? 0, icon: Calendar,    color: 'text-blue-400',   bg: 'bg-blue-500/10' },
    { label: 'Bu Hafta Toplam',   value: weekTotal ?? 0,          icon: TrendingUp,   color: 'text-green-400',  bg: 'bg-green-500/10' },
    { label: 'Onay Bekleyen',     value: pendingCount ?? 0,       icon: AlertCircle,  color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Toplam Müşteri',    value: totalCustomers ?? 0,     icon: Users,        color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    pending:   { label: 'Bekliyor',   icon: Clock,        color: 'text-yellow-400' },
    confirmed: { label: 'Onaylı',     icon: CheckCircle,  color: 'text-green-400' },
    completed: { label: 'Tamamlandı', icon: CheckCircle,  color: 'text-blue-400' },
    cancelled: { label: 'İptal',      icon: XCircle,      color: 'text-red-400' },
    no_show:   { label: 'Gelmedi',    icon: XCircle,      color: 'text-gray-500' },
  };

  return (
    <div>
      {/* Başlık */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          {format(today, 'd MMMM yyyy, EEEE', { locale: tr })}
        </p>
      </div>

      {/* Stat Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className={`inline-flex p-2.5 rounded-lg ${bg} mb-3`}>
              <Icon size={20} className={color} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-sm text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Bugünkü Randevular */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-white">Bugünkü Randevular</h2>
          <span className="text-sm text-gray-400">{todayAppts?.length ?? 0} randevu</span>
        </div>

        {!todayAppts || todayAppts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Calendar size={40} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Bugün randevu yok</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {todayAppts.map((appt: any) => {
              const sc = statusConfig[appt.status] ?? statusConfig.pending;
              const StatusIcon = sc.icon;
              return (
                <div key={appt.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[48px]">
                      <p className="text-white font-bold text-sm">
                        {format(new Date(appt.start_at), 'HH:mm')}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {format(new Date(appt.end_at), 'HH:mm')}
                      </p>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">
                        {appt.service?.name ?? '—'}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {appt.staff?.profile?.full_name ?? '—'}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${sc.color}`}>
                    <StatusIcon size={14} />
                    {sc.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
