import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Clock, ChevronRight } from 'lucide-react-native';

export default function AdminCalendarScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('appointments')
      .select('*, customer:profiles!appointments_customer_id_fkey(full_name, phone), service:services(name), staff:staff(profile:profiles(full_name))')
      .order('start_at', { ascending: false });

    if (data) {
      setAppointments(data);
    }
    setLoading(false);
  };

  if (loading && appointments.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#c0392b" />
      </View>
    );
  }

  // Gruplama
  const grouped = appointments.reduce((acc: any, appt: any) => {
    const dateKey = format(parseISO(appt.start_at), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(appt);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a)); // En yeni en üstte

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tüm Randevular</Text>
      
      {sortedDates.map(date => (
        <View key={date} style={styles.dateGroup}>
          <Text style={styles.dateTitle}>{format(parseISO(date), 'd MMMM yyyy, EEEE', { locale: tr })}</Text>
          {grouped[date].map((appt: any) => (
            <AdminAppointmentCard 
              key={appt.id} 
              appt={appt} 
              onPress={() => router.push(`/admin-booking/${appt.id}`)} 
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function AdminAppointmentCard({ appt, onPress }: { appt: any, onPress: () => void }) {
  const start = parseISO(appt.start_at);
  let statusColor = '#888';
  let statusText = 'Bilinmiyor';

  if (appt.status === 'pending') { statusColor = '#eab308'; statusText = 'Bekliyor'; }
  if (appt.status === 'confirmed') { statusColor = '#22c55e'; statusText = 'Onaylandı'; }
  if (appt.status === 'completed') { statusColor = '#3b82f6'; statusText = 'Tamamlandı'; }
  if (appt.status === 'cancelled') { statusColor = '#ef4444'; statusText = 'İptal'; }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.customerName}>{appt.customer?.full_name || 'İsimsiz'}</Text>
          <Text style={styles.serviceName}>{appt.service?.name}</Text>
        </View>
        <Text style={[styles.statusBadge, { color: statusColor }]}>{statusText}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Clock size={14} color="#666" />
          <Text style={styles.infoText}>{format(start, 'HH:mm')} - {appt.staff?.profile?.full_name}</Text>
        </View>
      </View>
      <ChevronRight size={20} color="#444" style={styles.chevron} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  
  dateGroup: { marginBottom: 24 },
  dateTitle: { color: '#c0392b', fontSize: 16, fontWeight: 'bold', marginBottom: 12, textTransform: 'capitalize' },
  
  card: { backgroundColor: '#111', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#222', position: 'relative' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, paddingRight: 24 },
  customerName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  serviceName: { color: '#aaa', fontSize: 14, marginTop: 2 },
  statusBadge: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  cardBody: { gap: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { color: '#888', fontSize: 13 },
  chevron: { position: 'absolute', right: 16, top: '50%', transform: [{ translateY: -10 }] }
});
