import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { fetchServices } from '../../lib/api';
import { useBookingStore } from '../../store/bookingStore';
import type { Service } from '../../types';

export default function ServiceSelectScreen() {
  const router = useRouter();
  const { selection, setService } = useBookingStore();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices()
      .then(setServices)
      .catch(() => Alert.alert('Hata', 'Hizmetler yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (service: Service) => {
    setService(service);
    router.push('/booking/datetime');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c0392b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Adım göstergesi */}
      <BookingProgress step={1} />

      <Text style={styles.heading}>Hangi hizmet?</Text>
      <Text style={styles.subheading}>İstediğiniz hizmeti seçin</Text>

      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              selection.service?.id === item.id && styles.cardSelected,
            ]}
            onPress={() => handleSelect(item)}
            activeOpacity={0.8}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.cardName}>{item.name}</Text>
              {item.description && (
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
              <Text style={styles.cardDuration}>⏱ {item.duration_min} dakika</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.cardPrice}>₺{item.price_with_vat.toFixed(0)}</Text>
              <Text style={styles.cardVat}>KDV dahil</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function BookingProgress({ step }: { step: number }) {
  const steps = ['Hizmet', 'Tarih/Saat', 'Onay'];
  return (
    <View style={styles.progress}>
      {steps.map((label, i) => (
        <View key={i} style={styles.progressStep}>
          <View style={[styles.progressDot, i + 1 <= step && styles.progressDotActive]}>
            <Text style={[styles.progressNum, i + 1 <= step && styles.progressNumActive]}>
              {i + 1}
            </Text>
          </View>
          {i < steps.length - 1 && (
            <View style={[styles.progressLine, i + 1 < step && styles.progressLineActive]} />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', paddingTop: 16 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
  heading:   { fontSize: 26, fontWeight: '700', color: '#fff', paddingHorizontal: 20, marginTop: 20 },
  subheading:{ fontSize: 14, color: '#999', paddingHorizontal: 20, marginTop: 4, marginBottom: 16 },
  list:      { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardSelected: {
    borderColor: '#c0392b',
    backgroundColor: 'rgba(192,57,43,0.12)',
  },
  cardLeft:    { flex: 1, marginRight: 12 },
  cardName:    { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  cardDesc:    { fontSize: 13, color: '#888', lineHeight: 18, marginBottom: 6 },
  cardDuration:{ fontSize: 12, color: '#c0392b', fontWeight: '500' },
  cardRight:   { alignItems: 'flex-end' },
  cardPrice:   { fontSize: 22, fontWeight: '700', color: '#e74c3c' },
  cardVat:     { fontSize: 11, color: '#666', marginTop: 2 },

  // Progress bar
  progress:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  progressStep:     { flexDirection: 'row', alignItems: 'center', flex: 1 },
  progressDot:      { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1a1a1a',
                      borderWidth: 2, borderColor: '#333', justifyContent: 'center', alignItems: 'center' },
  progressDotActive:{ backgroundColor: '#c0392b', borderColor: '#c0392b' },
  progressNum:      { fontSize: 12, fontWeight: '700', color: '#555' },
  progressNumActive:{ color: '#fff' },
  progressLine:     { flex: 1, height: 2, backgroundColor: '#333', marginHorizontal: 4 },
  progressLineActive:{ backgroundColor: '#c0392b' },
});
