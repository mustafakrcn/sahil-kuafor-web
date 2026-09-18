import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Check, X } from 'lucide-react-native';

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    const { data } = await supabase
      .from('appointments')
      .select(`
        *,
        service:services(name),
        customer:profiles!appointments_customer_id_fkey(full_name, phone)
      `)
      .order('created_at', { ascending: false });

    setAppointments(data || []);
    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      Alert.alert('Hata', 'İşlem başarısız oldu.');
    } else {
      fetchAppointments();
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#c0392b" />
      </View>
    );
  }

  const pendingAppts = appointments.filter(a => a.status === 'pending');
  const otherAppts = appointments.filter(a => a.status !== 'pending');

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#c0392b" />}
    >
      {pendingAppts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Onay Bekleyenler ({pendingAppts.length})</Text>
          {pendingAppts.map(appt => (
            <AdminAppointmentCard key={appt.id} appt={appt} onUpdate={updateStatus} isPending />
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diğer Randevular</Text>
        {otherAppts.length === 0 ? (
          <Text style={styles.emptyText}>Kayıt bulunamadı.</Text>
        ) : (
          otherAppts.map(appt => (
            <AdminAppointmentCard key={appt.id} appt={appt} onUpdate={updateStatus} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function AdminAppointmentCard({ appt, onUpdate, isPending = false }: { appt: any, onUpdate: (id: string, status: string) => void, isPending?: boolean }) {
  const start = parseISO(appt.start_at);
  let statusColor = '#888';
  let statusText = 'Bilinmiyor';

  if (appt.status === 'pending') { statusColor = '#eab308'; statusText = 'Bekliyor'; }
  if (appt.status === 'confirmed') { statusColor = '#22c55e'; statusText = 'Onaylı'; }
  if (appt.status === 'completed') { statusColor = '#3b82f6'; statusText = 'Tamamlandı'; }
  if (appt.status === 'cancelled') { statusColor = '#ef4444'; statusText = 'İptal'; }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.customerName}>{appt.customer?.full_name || 'Misafir'}</Text>
        <Text style={[styles.statusBadge, { color: statusColor }]}>{statusText}</Text>
      </View>

      <Text style={styles.serviceName}>{appt.service?.name}</Text>
      
      <View style={styles.dateTimeRow}>
        <Text style={styles.dateTimeText}>{format(start, 'd MMM EEEE, HH:mm', { locale: tr })}</Text>
        <Text style={styles.phoneText}>{appt.customer?.phone || '-'}</Text>
      </View>

      {isPending && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef444420', borderColor: '#ef4444' }]} onPress={() => onUpdate(appt.id, 'cancelled')}>
            <X color="#ef4444" size={20} />
            <Text style={[styles.actionText, { color: '#ef4444' }]}>Reddet</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#22c55e20', borderColor: '#22c55e' }]} onPress={() => onUpdate(appt.id, 'confirmed')}>
            <Check color="#22c55e" size={20} />
            <Text style={[styles.actionText, { color: '#22c55e' }]}>Onayla</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  serviceName: {
    color: '#c0392b',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  dateTimeText: {
    color: '#aaa',
    fontSize: 13,
  },
  phoneText: {
    color: '#aaa',
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionText: {
    fontWeight: '600',
    fontSize: 14,
  }
});
