import { supabase } from '../lib/supabase';
import type { Staff, Service, TimeSlot } from '../types';

// ─── Hizmetleri getir ────────────────────
export async function fetchServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
}

// ─── Aktif personeli getir ───────────────
export async function fetchStaff(): Promise<Staff[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('*, profile:profiles(full_name, phone)')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
}

// ─── Müsait slotları getir (Manuel Hesaplama) ─
export async function fetchAvailableSlots(
  staffId: string | null,
  serviceId: string,
  date: string          // "2024-09-15"
): Promise<TimeSlot[]> {
  // 1. Get service duration
  const { data: service } = await supabase.from('services').select('duration_min').eq('id', serviceId).single();
  const duration = service?.duration_min || 30;

  // 2. Get appointments for the date (UTC-aware: sorgu aralığı gün boyunca)
  // Türkiye UTC+3 — gün sınırlarını UTC olarak güvenli hesapla
  const dayStartUtc = new Date(`${date}T00:00:00+03:00`).toISOString();
  const dayEndUtc   = new Date(`${date}T23:59:59+03:00`).toISOString();

  const { data: appts } = await supabase
    .from('appointments')
    .select('start_at, end_at')
    .in('status', ['pending', 'confirmed'])
    .gte('start_at', dayStartUtc)
    .lte('start_at', dayEndUtc);

  // 3. Generate slots between 09:00 and 19:00 Turkey local time (UTC+3)
  //    Date objeleri için yerel zaman yerine UTC+3 offsetli string kullan
  const slots: TimeSlot[] = [];
  const openTime  = new Date(`${date}T09:00:00+03:00`);
  const closeTime = new Date(`${date}T19:00:00+03:00`);

  let current = openTime;
  const now = new Date();

  while (current < closeTime) {
    const slotEnd = new Date(current.getTime() + duration * 60000);
    // Slot kapanış saatini aşmamalı ve geçmiş saatler gösterilmemeli
    if (slotEnd <= closeTime && current > now) {
      const overlap = appts?.some(a => {
        const aStart = new Date(a.start_at);
        const aEnd   = new Date(a.end_at);
        return current < aEnd && slotEnd > aStart;
      });

      if (!overlap) {
        slots.push({
          slot_start: current.toISOString(),
          slot_end:   slotEnd.toISOString(),
        });
      }
    }
    current = new Date(current.getTime() + 30 * 60000); // 30 dk aralık
  }
  return slots;
}

// ─── Randevu oluştur ────────────────────
export async function createAppointment(params: {
  customerId: string;
  staffId?: string | null;
  serviceId: string;
  startAt: string;
  endAt: string;
  notes?: string;
}) {
  const payload: any = {
    customer_id: params.customerId,
    service_id: params.serviceId,
    start_at: params.startAt,
    end_at: params.endAt,
    notes: params.notes ?? '',
    status: 'pending',
  };
  if (params.staffId) {
    payload.staff_id = params.staffId;
  }
  
  const { error } = await supabase
    .from('appointments')
    .insert(payload);
  if (error) throw error;
  return true;
}

// ─── Müşterinin randevularını getir ─────
export async function fetchMyAppointments(customerId: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      staff:staff(title, profile:profiles(full_name)),
      service:services(name, duration_min, price_with_vat)
    `)
    .eq('customer_id', customerId)
    .order('start_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Randevu iptal et ───────────────────
export async function cancelAppointment(appointmentId: string) {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId);
  if (error) throw error;
}
