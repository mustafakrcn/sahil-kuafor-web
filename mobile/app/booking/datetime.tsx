import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { format, addDays, isBefore, startOfDay, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { fetchAvailableSlots } from '../../lib/api';
import { useBookingStore } from '../../store/bookingStore';
import type { TimeSlot } from '../../types';

const DAYS_AHEAD = 14; // Kaç gün ileri gösterilsin

export default function DateTimeScreen() {
  const router = useRouter();
  const { selection, setDate, setSlot, setStaff } = useBookingStore();
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Takvim günleri listesi
  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const d = addDays(new Date(), i);
    return { iso: format(d, 'yyyy-MM-dd'), d };
  });

  const loadSlots = useCallback(async (date: string) => {
    if (!selection.service) return;
    setLoadingSlots(true);
    setSlots([]);
    try {
      const result = await fetchAvailableSlots(
        null,
        selection.service.id,
        date
      );
      setSlots(result);
    } catch {
      Alert.alert('Hata', 'Saatler yüklenemedi.');
    } finally {
      setLoadingSlots(false);
    }
  }, [selection.service]);

  useEffect(() => {
    loadSlots(selectedDate);
  }, [selectedDate, loadSlots]);

  const handleDayPress = (iso: string) => {
    setSelectedDate(iso);
    setDate(iso);
  };

  const handleSlotPress = (slot: TimeSlot) => {
    setSlot(slot);
    router.push('/booking/confirm');
  };

  return (
    <ScrollView style={styles.container} stickyHeaderIndices={[1]}>
      <View>
        <BookingProgress step={2} />
        <Text style={styles.heading}>Tarih & Saat</Text>
        <Text style={styles.subheading}>Müsait bir gün ve saat seçin</Text>
      </View>

      {/* Yatay gün seçici */}
      <View style={styles.dayScrollWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayScroll}>
          {days.map(({ iso, d }) => {
            const isPast = isBefore(startOfDay(d), startOfDay(new Date()));
            const isSelected = iso === selectedDate;
            return (
              <TouchableOpacity
                key={iso}
                disabled={isPast}
                onPress={() => handleDayPress(iso)}
                style={[styles.dayCard, isSelected && styles.dayCardSelected, isPast && styles.dayCardPast]}
              >
                <Text style={[styles.dayWeek, isSelected && styles.dayTextSelected]}>
                  {format(d, 'EEE', { locale: tr }).toUpperCase()}
                </Text>
                <Text style={[styles.dayNum, isSelected && styles.dayTextSelected]}>
                  {format(d, 'd')}
                </Text>
                <Text style={[styles.dayMonth, isSelected && styles.dayTextSelected]}>
                  {format(d, 'MMM', { locale: tr })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Slot ızgarası */}
      <View style={styles.slotsWrap}>
        <Text style={styles.slotsTitle}>
          {format(parseISO(selectedDate), 'd MMMM yyyy', { locale: tr })} — Müsait Saatler
        </Text>

        {loadingSlots ? (
          <ActivityIndicator color="#c0392b" style={{ marginTop: 40 }} />
        ) : slots.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🗓</Text>
            <Text style={styles.emptyText}>Bu gün müsait saat yok</Text>
            <Text style={styles.emptyHint}>Başka bir gün deneyin</Text>
          </View>
        ) : (
          <View style={styles.slotGrid}>
            {slots.map((slot) => {
              const time = format(parseISO(slot.slot_start), 'HH:mm');
              const isSelected = selection.slot?.slot_start === slot.slot_start;
              return (
                <TouchableOpacity
                  key={slot.slot_start}
                  onPress={() => handleSlotPress(slot)}
                  style={[styles.slotBtn, isSelected && styles.slotBtnSelected]}
                >
                  <Text style={[styles.slotText, isSelected && styles.slotTextSelected]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function BookingProgress({ step }: { step: number }) {
  return (
    <View style={styles.progress}>
      {[1, 2, 3].map((n, i) => (
        <View key={n} style={styles.progressStep}>
          <View style={[styles.progressDot, n <= step && styles.progressDotActive]}>
            <Text style={[styles.progressNum, n <= step && styles.progressNumActive]}>{n}</Text>
          </View>
          {i < 2 && (
            <View style={[styles.progressLine, n < step && styles.progressLineActive]} />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0a0a0a' },
  heading:      { fontSize: 26, fontWeight: '700', color: '#fff', paddingHorizontal: 20, marginTop: 20 },
  subheading:   { fontSize: 14, color: '#999', paddingHorizontal: 20, marginTop: 4, marginBottom: 8 },

  dayScrollWrap:{ backgroundColor: '#0a0a0a', paddingVertical: 12 },
  dayScroll:    { paddingHorizontal: 16, gap: 10 },
  dayCard: {
    alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: '#1a1a1a', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    minWidth: 58,
  },
  dayCardSelected: { backgroundColor: '#c0392b', borderColor: '#c0392b' },
  dayCardPast:     { opacity: 0.3 },
  dayWeek:         { fontSize: 11, color: '#888', fontWeight: '600', marginBottom: 4 },
  dayNum:          { fontSize: 20, color: '#fff', fontWeight: '700' },
  dayMonth:        { fontSize: 11, color: '#888', marginTop: 2 },
  dayTextSelected: { color: '#fff' },

  slotsWrap:   { padding: 20 },
  slotsTitle:  { fontSize: 14, color: '#888', marginBottom: 16 },
  slotGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotBtn: {
    paddingVertical: 12, paddingHorizontal: 20,
    backgroundColor: '#1a1a1a', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  slotBtnSelected: { backgroundColor: '#c0392b', borderColor: '#c0392b' },
  slotText:        { fontSize: 15, color: '#ccc', fontWeight: '600' },
  slotTextSelected:{ color: '#fff' },

  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  emptyHint: { fontSize: 13, color: '#888', marginTop: 6 },

  progress:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  progressStep:      { flexDirection: 'row', alignItems: 'center', flex: 1 },
  progressDot:       { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1a1a1a',
                       borderWidth: 2, borderColor: '#333', justifyContent: 'center', alignItems: 'center' },
  progressDotActive: { backgroundColor: '#c0392b', borderColor: '#c0392b' },
  progressNum:       { fontSize: 12, fontWeight: '700', color: '#555' },
  progressNumActive: { color: '#fff' },
  progressLine:      { flex: 1, height: 2, backgroundColor: '#333', marginHorizontal: 4 },
  progressLineActive:{ backgroundColor: '#c0392b' },
});
