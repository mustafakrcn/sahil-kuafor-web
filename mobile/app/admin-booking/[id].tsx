import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ArrowLeft, User, Phone, MessageCircle, Clock, Calendar as CalendarIcon, CheckCircle, XCircle } from 'lucide-react-native';

export default function AdminBookingDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [appt, setAppt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('appointments')
      .select('*, customer:profiles!appointments_customer_id_fkey(full_name, phone), service:services(name, price), staff:staff(profile:profiles(full_name))')
      .eq('id', id)
      .single();

    if (data) {
      setAppt(data);
    }
    setLoading(false);
  };

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      Alert.alert('Hata', 'Durum güncellenirken bir hata oluştu.');
    } else {
      Alert.alert('Başarılı', 'Randevu durumu güncellendi.');
      fetchDetail();
    }
    setUpdating(false);
  };

  const openWhatsApp = () => {
    if (!appt?.customer?.phone) {
      Alert.alert('Hata', 'Müşterinin telefon numarası kayıtlı değil.');
      return;
    }
    const phone = appt.customer.phone.replace(/[^0-9]/g, '');
    Linking.openURL(`whatsapp://send?phone=${phone}&text=Merhaba, randevunuz hakkında bilgi vermek istiyoruz.`);
  };

  const openSMS = () => {
    if (!appt?.customer?.phone) {
      Alert.alert('Hata', 'Müşterinin telefon numarası kayıtlı değil.');
      return;
    }
    const phone = appt.customer.phone;
    const url = Platform.OS === 'ios' ? `sms:${phone}` : `sms:${phone}?body=Merhaba, randevunuz hakkında bilgi vermek istiyoruz.`;
    Linking.openURL(url);
  };

  const callPhone = () => {
    if (!appt?.customer?.phone) {
      Alert.alert('Hata', 'Müşterinin telefon numarası kayıtlı değil.');
      return;
    }
    Linking.openURL(`tel:${appt.customer.phone}`);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#c0392b" />
      </View>
    );
  }

  if (!appt) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Randevu bulunamadı.</Text>
      </View>
    );
  }

  const start = parseISO(appt.start_at);
  let statusColor = '#888';
  let statusText = 'Bilinmiyor';
  if (appt.status === 'pending') { statusColor = '#eab308'; statusText = 'Onay Bekliyor'; }
  if (appt.status === 'confirmed') { statusColor = '#22c55e'; statusText = 'Onaylandı'; }
  if (appt.status === 'completed') { statusColor = '#3b82f6'; statusText = 'Tamamlandı'; }
  if (appt.status === 'cancelled') { statusColor = '#ef4444'; statusText = 'İptal Edildi'; }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Randevu Detayı</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadgeFull, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
            <Text style={[styles.statusTextFull, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Müşteri Bilgileri</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <User size={20} color="#888" />
              <Text style={styles.infoValue}>{appt.customer?.full_name || 'İsimsiz'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Phone size={20} color="#888" />
              <Text style={styles.infoValue}>{appt.customer?.phone || 'Telefon Yok'}</Text>
            </View>
            
            {/* Communication Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#25D366' }]} onPress={openWhatsApp}>
                <MessageCircle color="#fff" size={18} />
                <Text style={styles.actionBtnText}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]} onPress={openSMS}>
                <MessageCircle color="#fff" size={18} />
                <Text style={styles.actionBtnText}>SMS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#c0392b' }]} onPress={callPhone}>
                <Phone color="#fff" size={18} />
                <Text style={styles.actionBtnText}>Ara</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Appointment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Randevu Bilgileri</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <CalendarIcon size={20} color="#888" />
              <Text style={styles.infoValue}>{format(start, 'd MMMM yyyy, EEEE', { locale: tr })}</Text>
            </View>
            <View style={styles.infoRow}>
              <Clock size={20} color="#888" />
              <Text style={styles.infoValue}>{format(start, 'HH:mm')} - {format(parseISO(appt.end_at), 'HH:mm')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Hizmet:</Text>
              <Text style={styles.infoValue}>{appt.service?.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fiyat:</Text>
              <Text style={styles.infoValue}>₺{appt.service?.price}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Personel:</Text>
              <Text style={styles.infoValue}>{appt.staff?.profile?.full_name}</Text>
            </View>
          </View>
        </View>

        {/* Update Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Durum Güncelle</Text>
          <View style={styles.statusButtons}>
            <TouchableOpacity 
              style={[styles.statusBtn, { borderColor: '#22c55e', opacity: updating ? 0.5 : 1 }]} 
              onPress={() => updateStatus('confirmed')}
              disabled={updating}
            >
              <CheckCircle color="#22c55e" size={20} />
              <Text style={[styles.statusBtnText, { color: '#22c55e' }]}>Onayla</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.statusBtn, { borderColor: '#ef4444', opacity: updating ? 0.5 : 1 }]} 
              onPress={() => updateStatus('cancelled')}
              disabled={updating}
            >
              <XCircle color="#ef4444" size={20} />
              <Text style={[styles.statusBtnText, { color: '#ef4444' }]}>İptal Et</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.statusBtn, { borderColor: '#3b82f6', opacity: updating ? 0.5 : 1 }]} 
              onPress={() => updateStatus('completed')}
              disabled={updating}
            >
              <CheckCircle color="#3b82f6" size={20} />
              <Text style={[styles.statusBtnText, { color: '#3b82f6' }]}>Tamamlandı</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: { marginRight: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  
  content: { padding: 20, paddingBottom: 40 },
  errorText: { color: '#fff', textAlign: 'center', marginTop: 100 },
  
  statusContainer: { alignItems: 'center', marginBottom: 24 },
  statusBadgeFull: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  statusTextFull: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
  
  section: { marginBottom: 24 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  
  infoCard: { backgroundColor: '#111', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#222', gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoLabel: { color: '#888', fontSize: 15, width: 70 },
  infoValue: { color: '#fff', fontSize: 16, fontWeight: '500', flex: 1 },
  
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#222' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  
  statusButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statusBtn: { flexBasis: '47%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, backgroundColor: '#111' },
  statusBtnText: { fontSize: 15, fontWeight: '600' }
});
