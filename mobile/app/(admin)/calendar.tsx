import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Modal,
  Alert,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { format, parseISO, addDays, subDays, startOfWeek, isSameDay, isToday, isPast } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Scissors,
  Phone,
  FileText,
  Check,
  X,
  CalendarDays,
  Bell,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Durum Konfigürasyonu ─────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: '⏳ Bekliyor',    color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  confirmed: { label: '✅ Onaylandı',   color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  completed: { label: '🏁 Tamamlandı',  color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  cancelled: { label: '❌ İptal',       color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  no_show:   { label: '👻 Gelmedi',     color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
};

const FILTERS = ['Tümü', 'Bekliyor', 'Onaylandı', 'Tamamlandı', 'İptal'] as const;
type FilterType = typeof FILTERS[number];

const filterToStatus: Record<FilterType, string | null> = {
  'Tümü':       null,
  'Bekliyor':   'pending',
  'Onaylandı':  'confirmed',
  'Tamamlandı': 'completed',
  'İptal':      'cancelled',
};

// ─── Ana Ekran ───────────────────────────────────────────────────────────────
export default function AdminCalendarScreen() {
  const router = useRouter();

  const [selectedDate, setSelectedDate]   = useState(new Date());
  const [weekStart, setWeekStart]         = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [appointments, setAppointments]   = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [selectedAppt, setSelectedAppt]   = useState<any | null>(null);
  const [activeFilter, setActiveFilter]   = useState<FilterType>('Tümü');
  const [pendingCount, setPendingCount]   = useState(0);
  const [updatingId, setUpdatingId]       = useState<string | null>(null);

  // ─── Veri Çekme ──────────────────────────────────────────────────────────
  const fetchAppointments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:profiles!appointments_customer_id_fkey(full_name, phone),
          service:services(name),
          staff:staff(profile:profiles(full_name))
        `)
        .order('start_at', { ascending: true });

      if (error) {
        console.error('[Takvim] Veri hatası:', error.message);
        return;
      }

      const list = data ?? [];
      setAppointments(list);
      setPendingCount(list.filter((a) => a.status === 'pending').length);
    } catch (err) {
      console.error('[Takvim] Beklenmeyen hata:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ─── Realtime ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAppointments();

    const channel = supabase
      .channel('admin-calendar-v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchAppointments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAppointments]);

  // ─── Hafta Navigasyonu ────────────────────────────────────────────────────
  const goWeek = (dir: 1 | -1) => {
    const next = dir === 1 ? addDays(weekStart, 7) : subDays(weekStart, 7);
    setWeekStart(next);
    setSelectedDate(next);
  };

  const goToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
  };

  // ─── Hafta Günleri ────────────────────────────────────────────────────────
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // ─── Günün randevuları ────────────────────────────────────────────────────
  const dayAppointments = appointments.filter((a) => {
    if (!a.start_at) return false;
    try {
      const sameDay = isSameDay(parseISO(a.start_at), selectedDate);
      const statusOk = !filterToStatus[activeFilter] || a.status === filterToStatus[activeFilter];
      return sameDay && statusOk;
    } catch {
      return false;
    }
  });

  // ─── Gündeki dot sayısı ───────────────────────────────────────────────────
  const dotsForDay = (date: Date) =>
    appointments.filter((a) => {
      try { return isSameDay(parseISO(a.start_at), date); } catch { return false; }
    }).length;

  // ─── Durumu güncelle ──────────────────────────────────────────────────────
  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      Alert.alert('Hata', 'İşlem başarısız oldu: ' + error.message);
    } else {
      setSelectedAppt(null);
      fetchAppointments();
    }
    setUpdatingId(null);
  };

  // ─── Yükleniyor ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#c0392b" />
        <Text style={styles.loadingText}>Takvim yükleniyor…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <LinearGradient colors={['#111111', '#0a0a0a']} style={styles.header}>
        {/* Başlık Satırı */}
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Randevu Takvimi</Text>
            <Text style={styles.headerSub}>
              {format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
            </Text>
          </View>
          {pendingCount > 0 && (
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => router.push('/(admin)/appointments')}
              activeOpacity={0.8}
            >
              <Bell color="#f59e0b" size={20} />
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{pendingCount}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Haftalık Strip */}
        <View style={styles.weekRow}>
          <TouchableOpacity onPress={() => goWeek(-1)} style={styles.arrowBtn}>
            <ChevronLeft color="#666" size={22} />
          </TouchableOpacity>

          <View style={styles.weekStrip}>
            {weekDays.map((day) => {
              const sel     = isSameDay(day, selectedDate);
              const todayDay = isToday(day);
              const dots    = dotsForDay(day);
              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  style={styles.dayCell}
                  onPress={() => setSelectedDate(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayName, todayDay && { color: '#c0392b' }]}>
                    {format(day, 'EEE', { locale: tr })}
                  </Text>
                  <View style={[
                    styles.dayNum,
                    sel && styles.dayNumSelected,
                    todayDay && !sel && styles.dayNumToday,
                  ]}>
                    <Text style={[
                      styles.dayNumText,
                      sel && { color: '#fff' },
                      todayDay && !sel && { color: '#c0392b' },
                    ]}>
                      {format(day, 'd')}
                    </Text>
                  </View>
                  {dots > 0
                    ? <View style={[styles.dot, sel && { backgroundColor: '#fff' }]} />
                    : <View style={styles.dotEmpty} />
                  }
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity onPress={() => goWeek(1)} style={styles.arrowBtn}>
            <ChevronRight color="#666" size={22} />
          </TouchableOpacity>
        </View>

        {/* Bugüne Dön */}
        {!isToday(selectedDate) && (
          <TouchableOpacity style={styles.todayBtn} onPress={goToday} activeOpacity={0.8}>
            <CalendarDays color="#c0392b" size={13} />
            <Text style={styles.todayBtnText}>Bugüne Dön</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* ── Filtre Çubuğu ──────────────────────────────────────────────── */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setActiveFilter(f)}
              style={[styles.chip, activeFilter === f && styles.chipActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Liste ──────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchAppointments(); }}
            tintColor="#c0392b"
          />
        }
      >
        <View style={styles.daySummaryRow}>
          <Text style={styles.daySummaryTitle}>
            {isToday(selectedDate) ? 'Bugün' : format(selectedDate, 'd MMMM', { locale: tr })}
          </Text>
          <View style={styles.daySummaryBadge}>
            <Text style={styles.daySummaryCount}>{dayAppointments.length} randevu</Text>
          </View>
        </View>

        {dayAppointments.length === 0 ? (
          <View style={styles.empty}>
            <CalendarDays color="#2a2a2a" size={52} />
            <Text style={styles.emptyTitle}>Bu gün için randevu yok</Text>
            <Text style={styles.emptySub}>
              {activeFilter !== 'Tümü' ? `"${activeFilter}" filtresini kaldırmayı deneyin` : 'Farklı bir gün seçin'}
            </Text>
          </View>
        ) : (
          dayAppointments.map((appt) => (
            <ApptCard
              key={appt.id}
              appt={appt}
              onPress={() => setSelectedAppt(appt)}
              onQuickConfirm={() => updateStatus(appt.id, 'confirmed')}
            />
          ))
        )}
      </ScrollView>

      {/* ── Detay Modalı ───────────────────────────────────────────────── */}
      <Modal
        visible={!!selectedAppt}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedAppt(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSelectedAppt(null)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalCard}>
                {selectedAppt && (
                  <ApptModal
                    appt={selectedAppt}
                    updatingId={updatingId}
                    onClose={() => setSelectedAppt(null)}
                    onUpdate={updateStatus}
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// ─── Randevu Kartı ────────────────────────────────────────────────────────────
function ApptCard({ appt, onPress, onQuickConfirm }: {
  appt: any;
  onPress: () => void;
  onQuickConfirm: () => void;
}) {
  let timeStr = '--:--';
  try { timeStr = format(parseISO(appt.start_at), 'HH:mm'); } catch {}

  const cfg = STATUS_CONFIG[appt.status] ?? { color: '#888', bg: '#1a1a1a', label: appt.status };

  // Countdown hesapla
  let countdown: string | null = null;
  try {
    const apptDate = parseISO(appt.start_at);
    if (!isPast(apptDate) && (appt.status === 'pending' || appt.status === 'confirmed')) {
      const diff = apptDate.getTime() - Date.now();
      const hours = Math.floor(diff / 3_600_000);
      const mins  = Math.floor((diff % 3_600_000) / 60_000);
      if (hours === 0) countdown = `${mins} dk kaldı`;
      else if (hours < 24) countdown = `${hours}s ${mins}dk`;
    }
  } catch {}

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.cardAccent, { backgroundColor: cfg.color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={styles.timeRow}>
            <Clock color={cfg.color} size={13} />
            <Text style={[styles.timeText, { color: cfg.color }]}>{timeStr}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.color + '60' }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        <Text style={styles.customerText}>{appt.customer?.full_name ?? 'İsimsiz Müşteri'}</Text>
        <Text style={styles.serviceText}>{appt.service?.name ?? '—'}</Text>

        {(appt.customer?.phone || countdown) ? (
          <View style={styles.cardFooter}>
            {appt.customer?.phone ? (
              <View style={styles.infoRow}>
                <Phone color="#555" size={11} />
                <Text style={styles.infoText}>{appt.customer.phone}</Text>
              </View>
            ) : <View />}
            {countdown ? (
              <View style={styles.countdownBadge}>
                <Text style={styles.countdownText}>⏱ {countdown}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {appt.status === 'pending' && (
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={onQuickConfirm}
            activeOpacity={0.8}
          >
            <Check color="#10b981" size={13} />
            <Text style={styles.quickBtnText}>Hızlı Onayla</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Modal İçeriği ─────────────────────────────────────────────────────────────
function ApptModal({ appt, updatingId, onClose, onUpdate }: {
  appt: any;
  updatingId: string | null;
  onClose: () => void;
  onUpdate: (id: string, status: string) => void;
}) {
  let startStr = '--:--', endStr = '--:--', dateStr = '—';
  try {
    startStr = format(parseISO(appt.start_at), 'HH:mm');
    endStr   = appt.end_at ? format(parseISO(appt.end_at), 'HH:mm') : '--:--';
    dateStr  = format(parseISO(appt.start_at), 'd MMMM yyyy, EEEE', { locale: tr });
  } catch {}

  const cfg = STATUS_CONFIG[appt.status] ?? { color: '#888', bg: '#1a1a1a', label: appt.status };

  const handleCancel = () => {
    Alert.alert('Randevuyu İptal Et', 'Emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'İptal Et', style: 'destructive', onPress: () => onUpdate(appt.id, 'cancelled') },
    ]);
  };

  return (
    <View>
      {/* Başlık */}
      <View style={styles.modalHeader}>
        <View>
          <Text style={styles.modalTitle}>Randevu Detayı</Text>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.color + '60', marginTop: 6 }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
          <X color="#666" size={22} />
        </TouchableOpacity>
      </View>

      {/* Bilgi */}
      <View style={styles.modalBody}>
        <InfoRow icon={<User color="#555" size={16} />} label="Müşteri" value={appt.customer?.full_name ?? 'İsimsiz'} />
        <InfoRow icon={<Scissors color="#555" size={16} />} label="Hizmet" value={appt.service?.name ?? '—'} />
        <InfoRow icon={<CalendarDays color="#555" size={16} />} label="Tarih" value={dateStr} />
        <InfoRow icon={<Clock color="#555" size={16} />} label="Saat" value={`${startStr} – ${endStr}`} />
        {appt.customer?.phone ? (
          <InfoRow icon={<Phone color="#555" size={16} />} label="Telefon" value={appt.customer.phone} />
        ) : null}
        {appt.notes ? (
          <View style={styles.notesBox}>
            <View style={styles.notesHeaderRow}>
              <FileText color="#f59e0b" size={14} />
              <Text style={styles.notesLabel}>Müşteri Notu</Text>
            </View>
            <Text style={styles.notesText}>{appt.notes}</Text>
          </View>
        ) : null}
      </View>

      {/* Aksiyonlar */}
      <View style={styles.modalActions}>
        {appt.status === 'pending' && (
          <TouchableOpacity
            style={styles.btnConfirm}
            onPress={() => onUpdate(appt.id, 'confirmed')}
            activeOpacity={0.8}
            disabled={!!updatingId}
          >
            <Check color="#fff" size={16} />
            <Text style={styles.btnText}>Onayla</Text>
          </TouchableOpacity>
        )}
        {appt.status === 'confirmed' && (
          <TouchableOpacity
            style={styles.btnComplete}
            onPress={() => onUpdate(appt.id, 'completed')}
            activeOpacity={0.8}
            disabled={!!updatingId}
          >
            <Check color="#fff" size={16} />
            <Text style={styles.btnText}>Tamamlandı</Text>
          </TouchableOpacity>
        )}
        {(appt.status === 'pending' || appt.status === 'confirmed') && (
          <TouchableOpacity
            style={styles.btnCancel}
            onPress={handleCancel}
            activeOpacity={0.8}
            disabled={!!updatingId}
          >
            <X color="#ef4444" size={16} />
            <Text style={[styles.btnText, { color: '#ef4444' }]}>İptal Et</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.infoRowBig}>
      <View style={styles.infoIconBox}>{icon}</View>
      <View>
        <Text style={styles.infoLabelText}>{label}</Text>
        <Text style={styles.infoValueText}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Stiller ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0a0a0a' },
  loadingContainer:{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  loadingText:     { color: '#555', marginTop: 12, fontSize: 14 },

  // Header
  header:      { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  headerTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub:   { color: '#555', fontSize: 13, marginTop: 2 },
  bellBtn:     { padding: 10, backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', position: 'relative' },
  bellBadge:   { position: 'absolute', top: 4, right: 4, backgroundColor: '#ef4444', borderRadius: 7, width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  // Haftalık strip
  weekRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  arrowBtn:  { padding: 6 },
  weekStrip: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  dayCell:   { alignItems: 'center', flex: 1 },
  dayName:   { color: '#444', fontSize: 9, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  dayNum:    { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayNumSelected: { backgroundColor: '#c0392b' },
  dayNumToday:    { borderWidth: 1, borderColor: '#c0392b', backgroundColor: 'rgba(192,57,43,0.1)' },
  dayNumText:     { color: '#777', fontSize: 14, fontWeight: '700' },
  dot:       { width: 4, height: 4, borderRadius: 2, backgroundColor: '#c0392b', marginTop: 4 },
  dotEmpty:  { width: 4, height: 4, marginTop: 4 },

  todayBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', marginTop: 10, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: 'rgba(192,57,43,0.1)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(192,57,43,0.2)' },
  todayBtnText: { color: '#c0392b', fontSize: 11, fontWeight: '700' },

  // Filtre
  filterBar:    { borderBottomWidth: 1, borderBottomColor: '#1a1a1a', backgroundColor: '#0d0d0d' },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#252525' },
  chipActive:   { backgroundColor: 'rgba(192,57,43,0.12)', borderColor: '#c0392b' },
  chipText:     { color: '#666', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#c0392b' },

  // Liste
  list:         { flex: 1 },
  listContent:  { padding: 16, paddingBottom: 40 },
  daySummaryRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  daySummaryTitle:  { color: '#fff', fontSize: 17, fontWeight: '700' },
  daySummaryBadge:  { backgroundColor: '#1a1a1a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#252525' },
  daySummaryCount:  { color: '#666', fontSize: 12, fontWeight: '600' },

  empty:      { alignItems: 'center', paddingTop: 56 },
  emptyTitle: { color: '#333', fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  emptySub:   { color: '#2a2a2a', fontSize: 13 },

  // Kart
  card:       { backgroundColor: '#141414', borderRadius: 16, marginBottom: 10, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: '#1e1e1e' },
  cardAccent: { width: 4 },
  cardBody:   { flex: 1, padding: 14 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  timeRow:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timeText:   { fontSize: 15, fontWeight: '800' },
  statusBadge:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  customerText: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  serviceText:  { color: '#777', fontSize: 13, marginBottom: 8 },
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText:     { color: '#444', fontSize: 12 },
  countdownBadge: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#1a1a1a', borderRadius: 8, borderWidth: 1, borderColor: '#252525' },
  countdownText:  { color: '#666', fontSize: 11, fontWeight: '600' },
  quickBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', alignSelf: 'flex-start' },
  quickBtnText: { color: '#10b981', fontSize: 12, fontWeight: '700' },

  // Modal
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  modalCard:   { backgroundColor: '#111', borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  modalTitle:  { color: '#fff', fontSize: 18, fontWeight: '800' },
  closeBtn:    { padding: 4 },
  modalBody:   { padding: 20 },
  modalActions:{ flexDirection: 'row', gap: 10, padding: 20, paddingBottom: 44, borderTopWidth: 1, borderTopColor: '#1a1a1a' },

  btnConfirm:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 14 },
  btnComplete: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 14 },
  btnCancel:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', paddingVertical: 14, borderRadius: 14 },
  btnText:     { color: '#fff', fontSize: 14, fontWeight: '700' },

  infoRowBig:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  infoIconBox: { width: 32, height: 32, backgroundColor: '#1a1a1a', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  infoLabelText: { color: '#444', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginBottom: 1 },
  infoValueText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  notesBox:    { marginTop: 12, padding: 12, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.18)' },
  notesHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  notesLabel:  { color: '#f59e0b', fontSize: 12, fontWeight: '700' },
  notesText:   { color: '#c9a14a', fontSize: 13, lineHeight: 18 },
});
