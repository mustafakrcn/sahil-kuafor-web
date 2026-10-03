import { createSupabaseServer } from '../../../lib/supabase/server';
import { redirect } from 'next/navigation';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Calendar, Clock, Users, TrendingUp, CheckCircle, XCircle,
  AlertCircle, DollarSign, BarChart2, Bell, Scissors, Zap,
  Star, Target, Activity
} from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const today = new Date();
  const todayStart   = startOfDay(today).toISOString();
  const todayEnd     = endOfDay(today).toISOString();
  const weekStart    = startOfWeek(today, { weekStartsOn: 1 }).toISOString();
  const weekEnd      = endOfWeek(today, { weekStartsOn: 1 }).toISOString();
  const monthStart   = startOfMonth(today).toISOString();
  const monthEnd     = endOfMonth(today).toISOString();

  // Veri çekme
  const { data: todayAppts } = await supabase
    .from('appointments')
    .select('*, service:services(name, price), staff:staff(profile:profiles(full_name))')
    .gte('start_at', todayStart)
    .lte('start_at', todayEnd)
    .order('start_at');

  const { count: weekTotal } = await supabase.from('appointments')
    .select('*', { count: 'exact', head: true })
    .gte('start_at', weekStart).lte('start_at', weekEnd);

  const { count: pendingCount } = await supabase.from('appointments')
    .select('*', { count: 'exact', head: true }).eq('status', 'pending');

  const { count: confirmedToday } = await supabase.from('appointments')
    .select('*', { count: 'exact', head: true })
    .gte('start_at', todayStart).lte('start_at', todayEnd).eq('status', 'confirmed');

  const { count: totalCustomers } = await supabase.from('profiles')
    .select('*', { count: 'exact', head: true }).eq('role', 'customer');

  const { data: monthAppts } = await supabase.from('appointments')
    .select('service:services(price)')
    .eq('status', 'completed')
    .gte('start_at', monthStart).lte('start_at', monthEnd);

  const { data: weekAppts } = await supabase.from('appointments')
    .select('service:services(price)')
    .eq('status', 'completed')
    .gte('start_at', weekStart).lte('start_at', weekEnd);

  const { data: todayCompletedAppts } = await supabase.from('appointments')
    .select('service:services(price)').eq('status', 'completed')
    .gte('start_at', todayStart).lte('start_at', todayEnd);

  // Gelir hesaplama
  const todayRevenue = (todayCompletedAppts ?? []).reduce((s: number, a: any) => s + (a.service?.price ?? 0), 0);
  const weekRevenue  = (weekAppts ?? []).reduce((s: number, a: any) => s + (a.service?.price ?? 0), 0);
  const monthRevenue = (monthAppts ?? []).reduce((s: number, a: any) => s + (a.service?.price ?? 0), 0);

  const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
    pending:   { label: 'Bekliyor',    icon: Clock,        color: 'text-amber-400',  bg: 'bg-amber-400/10' },
    confirmed: { label: 'Onaylı',      icon: CheckCircle,  color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    completed: { label: 'Tamamlandı',  icon: CheckCircle,  color: 'text-blue-400',   bg: 'bg-blue-400/10' },
    cancelled: { label: 'İptal',       icon: XCircle,      color: 'text-red-400',    bg: 'bg-red-400/10' },
    no_show:   { label: 'Gelmedi',     icon: XCircle,      color: 'text-gray-500',   bg: 'bg-gray-500/10' },
  };

  return (
    <div className="space-y-8">

      {/* Başlık */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-amber-400/70 text-sm font-medium mb-1">Hoş geldin! 👋</p>
          <h1 className="text-3xl font-black text-white tracking-tight">Yönetici Paneli</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {format(today, "d MMMM yyyy, EEEE", { locale: tr })}
          </p>
        </div>
      </div>

      {/* Onay Bekleyen Uyarı */}
      {(pendingCount ?? 0) > 0 && (
        <a
          href="/dashboard/appointments"
          className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 hover:bg-red-500/15 transition-all group"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <Bell size={18} className="text-red-500 flex-shrink-0" />
          <span className="text-red-400 font-bold flex-1">
            {pendingCount} randevu onay bekliyor — Hemen işle!
          </span>
          <span className="text-red-500/70 group-hover:text-red-400 transition-colors text-sm font-medium">
            Randevulara Git →
          </span>
        </a>
      )}

      {/* Ana İstatistik Kartları */}
      <div>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4">📊 Genel Bakış</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Bugünkü Randevu', value: todayAppts?.length ?? 0,
              sub: `${confirmedToday ?? 0} onaylı`,
              icon: Calendar, color: 'text-indigo-400', bg: 'bg-indigo-500/10',
              border: 'border-indigo-500/10', href: '/dashboard/appointments',
            },
            {
              label: 'Onay Bekleyen', value: pendingCount ?? 0,
              sub: (pendingCount ?? 0) > 0 ? 'Hemen işle!' : 'Temiz 🎉',
              icon: AlertCircle,
              color: (pendingCount ?? 0) > 0 ? 'text-amber-400' : 'text-green-400',
              bg: (pendingCount ?? 0) > 0 ? 'bg-amber-500/10' : 'bg-green-500/10',
              border: (pendingCount ?? 0) > 0 ? 'border-amber-500/20' : 'border-green-500/10',
              href: '/dashboard/appointments',
            },
            {
              label: 'Toplam Müşteri', value: totalCustomers ?? 0,
              sub: 'kayıtlı müşteri',
              icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10',
              border: 'border-emerald-500/10', href: '/dashboard/customers',
            },
            {
              label: 'Bu Hafta Toplam', value: weekTotal ?? 0,
              sub: 'randevu',
              icon: BarChart2, color: 'text-purple-400', bg: 'bg-purple-500/10',
              border: 'border-purple-500/10', href: '/dashboard/appointments',
            },
          ].map(({ label, value, sub, icon: Icon, color, bg, border, href }) => (
            <a
              key={label}
              href={href}
              className={`bg-gray-900 rounded-2xl p-5 border ${border} hover:border-gray-600 transition-all group cursor-pointer`}
            >
              <div className={`inline-flex p-3 rounded-xl ${bg} mb-4 group-hover:scale-110 transition-transform`}>
                <Icon size={20} className={color} />
              </div>
              <p className={`text-3xl font-black ${color}`}>{value}</p>
              <p className="text-sm text-gray-400 mt-1 font-medium">{label}</p>
              <p className="text-xs text-gray-600 mt-1">{sub}</p>
            </a>
          ))}
        </div>
      </div>

      {/* Gelir Raporları */}
      <div>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4">💰 Gelir Raporu</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-red-950/40 to-gray-900 rounded-2xl p-6 border border-red-500/15 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-500/10 p-2.5 rounded-xl">
                <DollarSign size={18} className="text-red-500" />
              </div>
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Bugün</span>
            </div>
            <p className="text-4xl font-black text-red-500">₺{todayRevenue.toLocaleString('tr-TR')}</p>
            <p className="text-gray-500 text-sm mt-2">tamamlanan işlemler</p>
          </div>

          <div className="bg-gradient-to-br from-red-950/20 to-gray-900 rounded-2xl p-6 border border-red-500/15 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-500/10 p-2.5 rounded-xl">
                <TrendingUp size={18} className="text-red-400" />
              </div>
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Bu Hafta</span>
            </div>
            <p className="text-4xl font-black text-red-400">₺{weekRevenue.toLocaleString('tr-TR')}</p>
            <p className="text-gray-500 text-sm mt-2">toplam kazanç</p>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl p-6 border border-red-500/15 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-500/10 p-2.5 rounded-xl">
                <Activity size={18} className="text-red-300" />
              </div>
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Bu Ay</span>
            </div>
            <p className="text-4xl font-black text-red-300">₺{monthRevenue.toLocaleString('tr-TR')}</p>
            <p className="text-gray-500 text-sm mt-2">aylık toplam</p>
          </div>
        </div>
      </div>

      {/* İki kolon: Bugünkü randevular + Hızlı erişim */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Bugünkü Randevular — 2/3 */}
        <div className="lg:col-span-2">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4">📅 Bugünkü Randevular</p>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-bold text-white">Günün Programı</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{todayAppts?.length ?? 0} randevu</span>
                <a href="/dashboard/appointments" className="text-red-500 text-sm font-semibold hover:text-red-400 transition-colors">
                  Tümünü Gör →
                </a>
              </div>
            </div>

            {!todayAppts || todayAppts.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <Calendar size={48} className="text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Bugün randevu yok</p>
                <p className="text-gray-600 text-sm mt-1">Yeni randevu bekleniyor</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {todayAppts.map((appt: any) => {
                  const sc = statusConfig[appt.status] ?? statusConfig.pending;
                  const StatusIcon = sc.icon;
                  return (
                    <div key={appt.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-800/50 transition-colors">
                      {/* Saat */}
                      <div className="text-center min-w-[52px]">
                        <p className="text-white font-bold text-sm">
                          {format(new Date(appt.start_at), 'HH:mm')}
                        </p>
                        <p className="text-gray-600 text-xs">
                          {format(new Date(appt.end_at), 'HH:mm')}
                        </p>
                      </div>

                      {/* Renkli çizgi */}
                      <div className={`w-0.5 h-10 rounded-full ${sc.color.replace('text-', 'bg-')}`} />

                      {/* İçerik */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">
                          {appt.customer_name ?? 'Misafir'}
                        </p>
                        <p className="text-gray-400 text-xs mt-0.5 truncate">
                          {appt.service?.name ?? '—'} · {appt.staff?.profile?.full_name ?? '—'}
                        </p>
                      </div>

                      {/* Fiyat */}
                      {appt.service?.price > 0 && (
                        <p className="text-red-400 text-sm font-bold">₺{appt.service.price}</p>
                      )}

                      {/* Durum */}
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${sc.color} ${sc.bg} px-2.5 py-1 rounded-full`}>
                        <StatusIcon size={11} />
                        {sc.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sağ kolon: Hızlı erişim + Platform özellikleri */}
        <div className="space-y-6">

          {/* Hızlı Erişim */}
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4">⚡ Hızlı Erişim</p>
            <div className="space-y-3">
              {[
                { href: '/dashboard/appointments', icon: Calendar,  label: 'Randevular',       sub: `${pendingCount ?? 0} bekleyen`,   color: 'text-red-400',    bg: 'bg-red-500/10' },
                { href: '/dashboard/customers',    icon: Users,     label: 'Müşteriler',       sub: `${totalCustomers ?? 0} kayıtlı`, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { href: '/dashboard/services',     icon: Scissors,  label: 'Hizmetler',        sub: 'Fiyat & içerik',                 color: 'text-blue-400',   bg: 'bg-blue-500/10' },
                { href: '/dashboard/staff',        icon: Star,      label: 'Personel',         sub: 'Ekibinizi yönetin',              color: 'text-purple-400', bg: 'bg-purple-500/10' },
              ].map(({ href, icon: Icon, label, sub, color, bg }) => (
                <a
                  key={label}
                  href={href}
                  className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3.5 hover:border-gray-700 hover:bg-gray-800/50 transition-all group"
                >
                  <div className={`p-2 rounded-xl ${bg}`}>
                    <Icon size={18} className={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">{label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{sub}</p>
                  </div>
                  <span className="text-gray-600 group-hover:text-gray-400 transition-colors text-sm">→</span>
                </a>
              ))}
            </div>
          </div>



        </div>
      </div>

    </div>
  );
}
