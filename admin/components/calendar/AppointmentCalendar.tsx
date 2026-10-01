'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import trLocale from '@fullcalendar/core/locales/tr';
import { createSupabaseClient } from '../../lib/supabase/client';
import {
  Loader2, X, Check, Clock, User, Scissors, Calendar as CalendarIcon,
  Phone, FileText, Bell, BellRing, RefreshCw, TrendingUp, Users, CheckCircle2,
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useSearchParams, useRouter } from 'next/navigation';

// ─── Tipler ──────────────────────────────────────────────────────────────────
type AppointmentInfo = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    status: string;
    customerName: string;
    customerPhone: string;
    staffName: string;
    serviceName: string;
    notes: string;
    rawStart: string;
    rawEnd: string;
  };
};

type ToastItem = {
  id: string;
  title: string;
  message: string;
  type: 'new' | 'update';
  timestamp: Date;
  appointmentId: string;
};

// ─── Sabitler ────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bgClass: string; dotClass: string }> = {
  pending:   { label: 'Onay Bekliyor', color: '#f59e0b', bgClass: 'bg-amber-500/10 border-amber-500/30 text-amber-400',  dotClass: 'bg-amber-400' },
  confirmed: { label: 'Onaylandı',    color: '#10b981', bgClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', dotClass: 'bg-emerald-400' },
  completed: { label: 'Tamamlandı',   color: '#3b82f6', bgClass: 'bg-blue-500/10 border-blue-500/30 text-blue-400',      dotClass: 'bg-blue-400' },
  cancelled: { label: 'İptal Edildi', color: '#ef4444', bgClass: 'bg-red-500/10 border-red-500/30 text-red-400',         dotClass: 'bg-red-400' },
  no_show:   { label: 'Gelmedi',      color: '#6b7280', bgClass: 'bg-gray-500/10 border-gray-500/30 text-gray-400',      dotClass: 'bg-gray-400' },
};

// ─── Yardımcı Bileşen: Durum Rozeti ─────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bgClass: 'bg-gray-500/10 border-gray-500/30 text-gray-400', dotClass: 'bg-gray-400', color: '#888' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.bgClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
      {cfg.label}
    </span>
  );
}

// ─── Yardımcı Bileşen: Stat Kartı ────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, subtext }: {
  label: string; value: number; icon: React.ElementType; color: string; subtext?: string;
}) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4 group hover:border-gray-700 transition-all`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0`} style={{ backgroundColor: color + '20' }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <div className="text-2xl font-black text-white">{value}</div>
        <div className="text-xs text-gray-500 font-medium">{label}</div>
        {subtext && <div className="text-xs mt-0.5" style={{ color }}>{subtext}</div>}
      </div>
    </div>
  );
}

// ─── Yardımcı Bileşen: Toast Bildirimi ───────────────────────────────────────
function ToastNotification({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const timeAgo = formatDistanceToNow(toast.timestamp, { locale: tr, addSuffix: true });
  return (
    <div className="bg-gray-900 border border-amber-500/30 rounded-2xl p-4 shadow-2xl shadow-black/50 flex items-start gap-3 animate-slide-in-right">
      <div className="w-9 h-9 bg-amber-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
        <BellRing size={18} className="text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white text-sm mb-0.5">{toast.title}</div>
        <div className="text-gray-400 text-xs leading-relaxed">{toast.message}</div>
        <div className="text-gray-600 text-xs mt-1">{timeAgo}</div>
      </div>
      <button onClick={() => onDismiss(toast.id)} className="text-gray-600 hover:text-gray-400 transition-colors mt-0.5">
        <X size={16} />
      </button>
    </div>
  );
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────
export default function AppointmentCalendar() {
  const supabase = createSupabaseClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const filter = searchParams.get('filter');

  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<AppointmentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AppointmentInfo | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [stats, setStats] = useState({ pending: 0, confirmed: 0, today: 0, completed: 0 });
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ─── Veri Çekme ──────────────────────────────────────────────────
  const fetchAppointments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    let query = supabase
      .from('appointments')
      .select(`
        *,
        customer:profiles!appointments_customer_id_fkey(full_name, phone),
        staff(profiles(full_name)),
        services(name)
      `);

    if (filter === 'pending') {
      query = query.eq('status', 'pending');
    } else {
      query = query.neq('status', 'cancelled').neq('status', 'no_show');
    }

    const { data, error } = await query.order('start_at', { ascending: true });
    if (error) { console.error('[Calendar] Veri çekme hatası:', error); setLoading(false); setRefreshing(false); return; }

    // İstatistikler
    const allData = await supabase.from('appointments').select('status, start_at');
    if (allData.data) {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      setStats({
        pending:   allData.data.filter((a) => a.status === 'pending').length,
        confirmed: allData.data.filter((a) => a.status === 'confirmed').length,
        today:     allData.data.filter((a) => a.start_at?.startsWith(todayStr)).length,
        completed: allData.data.filter((a) => a.status === 'completed').length,
      });
    }

    const formattedEvents: AppointmentInfo[] = (data ?? []).map((appt) => {
      const cfg = STATUS_CONFIG[appt.status];
      const color = cfg?.color ?? '#6b7280';
      return {
        id: appt.id,
        title: `${appt.customer?.full_name || 'Bilinmiyor'} — ${appt.services?.name || ''}`,
        start: new Date(appt.start_at),
        end: new Date(appt.end_at ?? appt.start_at),
        backgroundColor: color + 'CC',
        borderColor: color,
        extendedProps: {
          status: appt.status,
          customerName: appt.customer?.full_name || 'Bilinmiyor',
          customerPhone: appt.customer?.phone || '',
          staffName: appt.staff?.profiles?.full_name || 'Bilinmiyor',
          serviceName: appt.services?.name || '',
          notes: appt.notes || '',
          rawStart: appt.start_at,
          rawEnd: appt.end_at ?? appt.start_at,
        },
      };
    });

    setEvents(formattedEvents);
    setLoading(false);
    setRefreshing(false);
  }, [filter, supabase]);

  // ─── Toast Ekle ──────────────────────────────────────────────────
  const addToast = useCallback((title: string, message: string, type: 'new' | 'update', appointmentId: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [{ id, title, message, type, timestamp: new Date(), appointmentId }, ...prev.slice(0, 4)]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 8000);
  }, []);

  // ─── Realtime ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchAppointments();

    const channel = supabase
      .channel('calendar-realtime-v2')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointments' }, async (payload) => {
        fetchAppointments(true);
        if (payload.new?.status === 'pending') {
          // Detay çek
          const { data: appt } = await supabase
            .from('appointments')
            .select('customer:profiles!appointments_customer_id_fkey(full_name, phone), services(name)')
            .eq('id', payload.new.id)
            .single();
          const name = (appt?.customer as any)?.full_name ?? 'Müşteri';
          const service = (appt?.services as any)?.name ?? 'Hizmet';
          addToast('💈 Yeni Randevu!', `${name} • ${service}`, 'new', payload.new.id);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointments' }, (payload) => {
        fetchAppointments(true);
        if (payload.new?.status !== payload.old?.status) {
          const statusLabel = STATUS_CONFIG[payload.new?.status]?.label ?? payload.new?.status;
          addToast('🔄 Randevu Güncellendi', `Durum değişti → ${statusLabel}`, 'update', payload.new?.id);
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'appointments' }, () => fetchAppointments(true))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAppointments, addToast, supabase]);

  // ─── Durum Güncelle ───────────────────────────────────────────────
  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setSelectedEvent(null);
      fetchAppointments(true);
    }
    setUpdatingId(null);
  };

  // ─── Yaklaşan Label ───────────────────────────────────────────────
  const getUrgencyLabel = (startStr: string) => {
    try {
      const d = parseISO(startStr);
      if (isPast(d)) return null;
      if (isToday(d)) return { text: 'Bugün', cls: 'text-amber-400 bg-amber-400/10' };
      if (isTomorrow(d)) return { text: 'Yarın', cls: 'text-blue-400 bg-blue-400/10' };
    } catch {}
    return null;
  };

  // ─── Pending Liste Görünümü ───────────────────────────────────────
  if (filter === 'pending') {
    return (
      <div className="relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 z-10 bg-gray-950/60 flex items-center justify-center rounded-2xl backdrop-blur-sm">
            <Loader2 className="animate-spin text-red-500" size={36} />
          </div>
        )}

        {/* Başlık */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center">
              <Clock size={20} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Onay Bekleyen Randevular</h2>
              <p className="text-sm text-gray-500">{events.length} randevu onay bekliyor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAppointments(true)}
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-xl text-sm font-medium transition border border-gray-700"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Yenile
            </button>
            <button
              onClick={() => router.push('/appointments')}
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-xl text-sm font-medium transition border border-gray-700"
            >
              <CalendarIcon size={14} />
              Takvime Dön
            </button>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4">
              <CheckCircle2 size={28} className="text-emerald-400" />
            </div>
            <p className="text-gray-300 font-semibold text-lg mb-2">Harika! Onay bekleyen randevu yok</p>
            <p className="text-gray-600 text-sm">Tüm randevular işlendi.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {events.map((ev) => {
              const urgency = getUrgencyLabel(ev.extendedProps.rawStart);
              return (
                <div key={ev.id} className="bg-gray-950 rounded-2xl p-5 border border-amber-500/20 relative overflow-hidden group hover:border-amber-500/40 transition-all">
                  {/* Sol çizgi */}
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-2xl" />

                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight">{ev.extendedProps.customerName}</h3>
                      {urgency && (
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold mt-1 ${urgency.cls}`}>
                          {urgency.text}
                        </span>
                      )}
                    </div>
                    <StatusBadge status={ev.extendedProps.status} />
                  </div>

                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Scissors size={13} className="text-gray-600 flex-shrink-0" />
                      <span>{ev.extendedProps.serviceName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <CalendarIcon size={13} className="text-gray-600 flex-shrink-0" />
                      <span>{format(ev.start, 'dd MMM yyyy', { locale: tr })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock size={13} className="text-gray-600 flex-shrink-0" />
                      <span>{format(ev.start, 'HH:mm')} – {format(ev.end, 'HH:mm')}</span>
                    </div>
                    {ev.extendedProps.customerPhone && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Phone size={13} className="text-gray-600 flex-shrink-0" />
                        <span>{ev.extendedProps.customerPhone}</span>
                      </div>
                    )}
                    {ev.extendedProps.notes && (
                      <div className="mt-2 p-2.5 bg-amber-500/5 border border-amber-500/15 rounded-xl text-xs text-amber-200/70 italic leading-relaxed">
                        "{ev.extendedProps.notes}"
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-gray-800">
                    <button
                      onClick={() => updateStatus(ev.id, 'confirmed')}
                      disabled={updatingId === ev.id}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold text-sm flex justify-center items-center gap-1.5 transition-all"
                    >
                      {updatingId === ev.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Onayla
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Bu randevuyu iptal etmek istediğinize emin misiniz?')) {
                          updateStatus(ev.id, 'cancelled');
                        }
                      }}
                      disabled={updatingId === ev.id}
                      className="flex-1 bg-red-900/20 hover:bg-red-600/30 disabled:opacity-50 text-red-400 hover:text-red-300 border border-red-900/30 hover:border-red-500/40 py-2.5 rounded-xl font-semibold text-sm transition-all"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── TAKVİM GÖRÜNÜMÜ ─────────────────────────────────────────────
  return (
    <div className="relative space-y-4">
      {/* Yükleme */}
      {loading && (
        <div className="absolute inset-0 z-20 bg-gray-950/70 flex items-center justify-center rounded-2xl backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-red-500" size={40} />
            <p className="text-gray-400 text-sm">Randevular yükleniyor…</p>
          </div>
        </div>
      )}

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Onay Bekliyor" value={stats.pending} icon={Clock} color="#f59e0b" subtext={stats.pending > 0 ? 'İşlem gerekiyor' : 'Temiz 🎉'} />
        <StatCard label="Onaylandı" value={stats.confirmed} icon={CheckCircle2} color="#10b981" />
        <StatCard label="Bugün Toplam" value={stats.today} icon={CalendarIcon} color="#3b82f6" />
        <StatCard label="Tamamlandı" value={stats.completed} icon={TrendingUp} color="#8b5cf6" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-900 rounded-2xl border border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-gray-400 font-medium">Canlı güncellemeler aktif</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Renk Açıklaması */}
          <div className="hidden sm:flex items-center gap-3 mr-2">
            {(['pending', 'confirmed', 'completed'] as const).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_CONFIG[s].color }} />
                <span className="text-xs text-gray-500">{STATUS_CONFIG[s].label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => fetchAppointments(true)}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-xl text-sm font-medium transition border border-gray-700"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Yenile
          </button>

          {stats.pending > 0 && (
            <button
              onClick={() => router.push('/appointments?filter=pending')}
              className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-xl text-sm font-bold transition"
            >
              <Bell size={13} />
              {stats.pending} bekliyor
            </button>
          )}
        </div>
      </div>

      {/* Takvim */}
      <div className="calendar-wrapper bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden p-3">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          locale={trLocale}
          events={events}
          eventClick={(info) => {
            setSelectedEvent({
              id: info.event.id,
              title: info.event.title,
              start: info.event.start!,
              end: info.event.end ?? info.event.start!,
              backgroundColor: info.event.backgroundColor,
              borderColor: info.event.borderColor,
              extendedProps: info.event.extendedProps as any,
            });
          }}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          height="auto"
          nowIndicator={true}
          slotDuration="00:30:00"
          eventContent={(eventInfo) => (
            <div className="fc-event-custom px-1 py-0.5 overflow-hidden">
              <div className="font-semibold text-xs leading-tight truncate">{eventInfo.event.title}</div>
              <div className="text-xs opacity-80">
                {format(eventInfo.event.start!, 'HH:mm')}
              </div>
            </div>
          )}
        />
      </div>

      {/* Detay Modalı */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
          <div
            className="bg-gray-900 rounded-3xl w-full max-w-md border border-gray-700 overflow-hidden shadow-2xl shadow-black"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'modal-pop 0.2s ease-out' }}
          >
            {/* Modal Başlık */}
            <div className="flex justify-between items-start p-6 border-b border-gray-800">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Randevu Detayı</h3>
                <StatusBadge status={selectedEvent.extendedProps.status} />
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-500 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal İçerik */}
            <div className="p-6 space-y-4">
              <ModalInfoRow icon={User} label="Müşteri" value={selectedEvent.extendedProps.customerName} />
              <ModalInfoRow icon={Scissors} label="Hizmet" value={selectedEvent.extendedProps.serviceName} />
              <ModalInfoRow
                icon={CalendarIcon}
                label="Tarih"
                value={format(selectedEvent.start, 'dd MMMM yyyy, EEEE', { locale: tr })}
              />
              <ModalInfoRow
                icon={Clock}
                label="Saat"
                value={`${format(selectedEvent.start, 'HH:mm')} – ${format(selectedEvent.end, 'HH:mm')}`}
              />
              {selectedEvent.extendedProps.customerPhone && (
                <ModalInfoRow icon={Phone} label="Telefon" value={selectedEvent.extendedProps.customerPhone} />
              )}
              {selectedEvent.extendedProps.staffName && selectedEvent.extendedProps.staffName !== 'Bilinmiyor' && (
                <ModalInfoRow icon={Users} label="Berber" value={selectedEvent.extendedProps.staffName} />
              )}

              {selectedEvent.extendedProps.notes && (
                <div className="p-4 bg-amber-500/8 border border-amber-500/20 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={14} className="text-amber-400" />
                    <span className="text-amber-400 text-xs font-bold uppercase tracking-wide">Müşteri Notu</span>
                  </div>
                  <p className="text-amber-100/70 text-sm leading-relaxed italic">
                    "{selectedEvent.extendedProps.notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Modal Aksiyonlar */}
            <div className="p-6 pt-0 flex flex-wrap gap-2">
              {selectedEvent.extendedProps.status === 'pending' && (
                <button
                  onClick={() => updateStatus(selectedEvent.id, 'confirmed')}
                  disabled={!!updatingId}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-2xl font-semibold flex justify-center items-center gap-2 transition-all min-w-[120px]"
                >
                  {updatingId ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Onayla
                </button>
              )}
              {selectedEvent.extendedProps.status === 'confirmed' && (
                <button
                  onClick={() => updateStatus(selectedEvent.id, 'completed')}
                  disabled={!!updatingId}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-2xl font-semibold flex justify-center items-center gap-2 transition-all min-w-[120px]"
                >
                  {updatingId ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Tamamlandı
                </button>
              )}
              {(selectedEvent.extendedProps.status === 'pending' || selectedEvent.extendedProps.status === 'confirmed') && (
                <button
                  onClick={() => {
                    if (confirm('Randevuyu iptal etmek istediğinize emin misiniz?')) {
                      updateStatus(selectedEvent.id, 'cancelled');
                    }
                  }}
                  disabled={!!updatingId}
                  className="flex-1 bg-gray-800 hover:bg-red-600/20 disabled:opacity-50 text-red-400 hover:text-red-300 border border-gray-700 hover:border-red-500/50 py-3 rounded-2xl font-semibold transition-all min-w-[120px]"
                >
                  İptal Et
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Bildirimleri */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full">
          {toasts.map((toast) => (
            <ToastNotification
              key={toast.id}
              toast={toast}
              onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modal Bilgi Satırı ───────────────────────────────────────────────────────
function ModalInfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-gray-500" />
      </div>
      <div>
        <div className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-0.5">{label}</div>
        <div className="text-white font-semibold text-sm">{value}</div>
      </div>
    </div>
  );
}
