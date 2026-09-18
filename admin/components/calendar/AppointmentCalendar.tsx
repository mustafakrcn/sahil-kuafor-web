'use client';

import React, { useEffect, useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import trLocale from '@fullcalendar/core/locales/tr';
import { createSupabaseClient } from '../../lib/supabase/client';
import { Loader2, X, Check, Clock, User, Scissors, Calendar as CalendarIcon, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { useSearchParams, useRouter } from 'next/navigation';

type AppointmentInfo = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  extendedProps: {
    status: string;
    customerName: string;
    customerPhone: string;
    staffName: string;
    serviceName: string;
    notes: string;
  };
};

export default function AppointmentCalendar() {
  const supabase = createSupabaseClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const filter = searchParams.get('filter'); // ?filter=pending

  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<AppointmentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [selectedEvent, setSelectedEvent] = useState<AppointmentInfo | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
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

    const { data, error } = await query;

    if (error) {
      console.error('Randevular çekilemedi Detay:', JSON.stringify(error, null, 2));
      setLoading(false);
      return;
    }

    const formattedEvents = data.map((appt) => {
      // Renk belirleme
      let color = '#3b82f6'; // Mavi (completed)
      if (appt.status === 'pending') color = '#eab308'; // Sarı
      if (appt.status === 'confirmed') color = '#22c55e'; // Yeşil

      return {
        id: appt.id,
        title: `${appt.customer?.full_name || 'Bilinmiyor'} - ${appt.services?.name || ''}`,
        start: new Date(appt.start_at),
        end: new Date(appt.end_at),
        backgroundColor: color,
        borderColor: color,
        extendedProps: {
          status: appt.status,
          customerName: appt.customer?.full_name || 'Bilinmiyor',
          customerPhone: appt.customer?.phone || '',
          staffName: appt.staff?.profiles?.full_name || 'Bilinmiyor',
          serviceName: appt.services?.name || '',
          notes: appt.notes || '',
        }
      };
    });

    setEvents(formattedEvents);
    setLoading(false);
  };

  useEffect(() => {
    fetchAppointments();

    const channel = supabase
      .channel('calendar-appointments-channel')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointments' }, () => {
        fetchAppointments();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'appointments' }, () => {
        fetchAppointments();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointments' }, () => {
        fetchAppointments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, filter]); // Reload if filter changes


  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id);
      
    if (!error) {
      setSelectedEvent(null);
      fetchAppointments();
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 relative">
      {loading && (
        <div className="absolute inset-0 z-10 bg-gray-900/50 flex items-center justify-center rounded-xl backdrop-blur-sm">
          <Loader2 className="animate-spin text-red-500" size={40} />
        </div>
      )}

      {/* Eğer filter=pending ise Özel Liste Görünümü */}
      {filter === 'pending' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
            <h2 className="text-xl font-bold text-yellow-500 flex items-center gap-2">
              <Clock size={24} /> Onay Bekleyen Randevular ({events.length})
            </h2>
            <button 
              onClick={() => router.push('/appointments')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Takvime Dön
            </button>
          </div>
          
          {events.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              Şu an onay bekleyen randevu bulunmuyor.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {events.map(ev => (
                <div key={ev.id} className="bg-gray-900 rounded-xl p-5 border border-yellow-500/30 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
                  
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-white">{ev.extendedProps.customerName}</h3>
                    <span className="bg-yellow-500/10 text-yellow-500 text-xs px-2 py-1 rounded-md font-bold border border-yellow-500/20">
                      Bekliyor
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Scissors size={14} className="text-gray-500" /> {ev.extendedProps.serviceName}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <CalendarIcon size={14} className="text-gray-500" /> {format(ev.start, 'dd MMM yyyy')}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Clock size={14} className="text-gray-500" /> {format(ev.start, 'HH:mm')} - {format(ev.end, 'HH:mm')}
                    </div>
                    {ev.extendedProps.customerPhone && (
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Phone size={14} className="text-gray-500" /> {ev.extendedProps.customerPhone}
                      </div>
                    )}
                    {ev.extendedProps.notes && (
                      <div className="mt-2 p-2 bg-gray-800 rounded text-xs text-gray-400 italic">
                        "{ev.extendedProps.notes}"
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
                    <button
                      onClick={() => updateStatus(ev.id, 'confirmed')}
                      className="flex-1 bg-green-600/20 hover:bg-green-600 text-green-500 hover:text-white border border-green-600/30 py-2 rounded-lg font-medium text-sm flex justify-center items-center gap-1 transition"
                    >
                      <Check size={16} /> Onayla
                    </button>
                    <button
                      onClick={() => {
                        if(confirm('İptal etmek istediğinize emin misiniz?')) {
                          updateStatus(ev.id, 'cancelled');
                        }
                      }}
                      className="flex-1 bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-900/30 py-2 rounded-lg font-medium text-sm transition"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* TAKVİM GÖRÜNÜMÜ */
        <div className="calendar-wrapper">
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            locale={trLocale}
            events={events}
            eventClick={(info) => {
              setSelectedEvent({
                id: info.event.id,
                title: info.event.title,
                start: info.event.start!,
                end: info.event.end!,
                extendedProps: info.event.extendedProps as any
              });
            }}
            slotMinTime="08:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            height="auto"
            nowIndicator={true}
            slotDuration="00:30:00"
          />
        </div>
      )}

      {/* DETAY MODALI (Sadece takvimden tıklanınca) */}
      {selectedEvent && filter !== 'pending' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-md border border-gray-700 overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">Randevu Detayı</h3>
              <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-white transition">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 text-gray-300">
                <User className="text-gray-500" size={20} />
                <span className="font-medium text-white">{selectedEvent.extendedProps.customerName}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Scissors className="text-gray-500" size={20} />
                <span>{selectedEvent.extendedProps.serviceName}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Clock className="text-gray-500" size={20} />
                <span>
                  {format(selectedEvent.start, 'dd MMM yyyy, HH:mm')} - {format(selectedEvent.end, 'HH:mm')}
                </span>
              </div>
              
              <div className="mt-4 p-4 bg-gray-800 rounded-xl border border-gray-700">
                <div className="text-sm text-gray-400 mb-1">Berber</div>
                <div className="text-white font-medium">{selectedEvent.extendedProps.staffName}</div>
              </div>

              {selectedEvent.extendedProps.notes && (
                <div className="mt-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <div className="text-sm text-yellow-500 mb-1">Müşteri Notu:</div>
                  <div className="text-yellow-100 text-sm">{selectedEvent.extendedProps.notes}</div>
                </div>
              )}
            </div>

            <div className="p-5 bg-gray-950 border-t border-gray-800 flex gap-3">
              {selectedEvent.extendedProps.status === 'pending' && (
                <button
                  onClick={() => updateStatus(selectedEvent.id, 'confirmed')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium flex justify-center items-center gap-2 transition"
                >
                  <Check size={18} /> Onayla
                </button>
              )}
              {selectedEvent.extendedProps.status === 'confirmed' && (
                <button
                  onClick={() => updateStatus(selectedEvent.id, 'completed')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium flex justify-center items-center gap-2 transition"
                >
                  <Check size={18} /> Tamamlandı Yap
                </button>
              )}
              <button
                onClick={() => {
                  if(confirm('Randevuyu iptal etmek istediğinize emin misiniz?')) {
                    updateStatus(selectedEvent.id, 'cancelled');
                  }
                }}
                className="flex-1 bg-gray-800 hover:bg-red-600/20 text-red-400 hover:text-red-300 border border-gray-700 hover:border-red-500/50 py-2.5 rounded-lg font-medium transition"
              >
                İptal Et
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
