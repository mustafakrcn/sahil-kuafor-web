// ─────────────────────────────────────────
// Uygulama geneli TypeScript tipleri
// ─────────────────────────────────────────

export type UserRole = 'customer' | 'staff' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  no_show_count: number;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  profile_id: string;
  title: string;
  bio: string | null;
  avatar_url: string | null;
  is_active: boolean;
  sort_order: number;
  // join ile gelen
  profile?: Pick<Profile, 'full_name' | 'phone'>;
}

export interface StaffSchedule {
  id: string;
  staff_id: string;
  day_of_week: number; // 0=Pazar … 6=Cumartesi
  start_time: string;  // "09:00"
  end_time: string;    // "20:00"
  is_off: boolean;
}

export interface StaffBlock {
  id: string;
  staff_id: string;
  start_at: string;
  end_at: string;
  reason: 'lunch' | 'leave' | 'personal' | 'other';
  note: string | null;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_min: number;
  price: number;
  price_with_vat: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'failed';

export interface Appointment {
  id: string;
  customer_id: string;
  staff_id: string;
  service_id: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  notes: string | null;
  payment_status: PaymentStatus;
  amount_paid: number | null;
  created_at: string;
  updated_at: string;
  // join ile gelen
  customer?: Pick<Profile, 'full_name' | 'phone'>;
  staff?: Pick<Staff, 'title'> & { profile?: Pick<Profile, 'full_name'> };
  service?: Pick<Service, 'name' | 'duration_min' | 'price_with_vat'>;
}

export interface TimeSlot {
  slot_start: string;
  slot_end: string;
}

export interface Campaign {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cta_label: string;
  cta_href: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

// ─────────────────────────────────────────
// Booking Flow — Adım adım seçim tipi
// ─────────────────────────────────────────
export interface BookingSelection {
  service: Service | null;
  staff: Staff | null;
  date: string | null;       // ISO: "2024-09-15"
  slot: TimeSlot | null;
  notes: string;
}
