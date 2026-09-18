import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { LogOut, User as UserIcon, Calendar as CalendarIcon, Clock, ChevronRight, ShieldAlert } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    // Profil çek
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setProfile(profileData);

    // Randevuları çek
    const { data: appts } = await supabase
      .from('appointments')
      .select('*, service:services(name), staff:staff(profile:profiles(full_name))')
      .eq('customer_id', user.id)
      .order('start_at', { ascending: false });

    if (appts) {
      setAppointments(appts);
    }
    
    setLoading(false);
  };

  const handleLogout = async () => {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut();
        router.replace('/(auth)/login');
      }}
    ]);
  };

  const activeAppts = appointments.filter(a => ['pending', 'confirmed'].includes(a.status));
  const pastAppts = appointments.filter(a => !['pending', 'confirmed'].includes(a.status));

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#c0392b" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <UserIcon color="#c0392b" size={40} />
        </View>
        <Text style={styles.name}>{profile?.full_name || 'Kullanıcı'}</Text>
        <Text style={styles.phone}>{profile?.phone || 'Telefon eklenmemiş'}</Text>
      </View>

      {(profile?.role === 'admin' || profile?.role === 'staff') && (
        <TouchableOpacity style={styles.adminCard} onPress={() => router.push('/(admin)/')}>
          <View style={styles.adminCardLeft}>
            <ShieldAlert color="#c0392b" size={24} />
            <View>
              <Text style={styles.adminCardTitle}>Yönetici Paneli</Text>
              <Text style={styles.adminCardSub}>Randevu ve İçerik Yönetimi</Text>
            </View>
          </View>
          <ChevronRight color="#c0392b" size={20} />
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Aktif Randevular ({activeAppts.length})</Text>
      {activeAppts.length === 0 ? (
        <Text style={styles.emptyText}>Bekleyen veya onaylanmış randevunuz bulunmuyor.</Text>
      ) : (
        activeAppts.map(appt => (
          <AppointmentCard key={appt.id} appt={appt} isActive />
        ))
      )}

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Geçmiş İşlemler</Text>
      {pastAppts.length === 0 ? (
        <Text style={styles.emptyText}>Geçmiş randevu kaydınız yok.</Text>
      ) : (
        pastAppts.slice(0, 5).map(appt => (
          <AppointmentCard key={appt.id} appt={appt} isActive={false} />
        ))
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut color="#ff4444" size={20} />
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function AppointmentCard({ appt, isActive }: { appt: any, isActive: boolean }) {
  const start = parseISO(appt.start_at);
  let statusColor = '#888';
  let statusText = 'Bilinmiyor';

  if (appt.status === 'pending') { statusColor = '#eab308'; statusText = 'Onay Bekliyor'; }
  if (appt.status === 'confirmed') { statusColor = '#22c55e'; statusText = 'Onaylandı'; }
  if (appt.status === 'completed') { statusColor = '#3b82f6'; statusText = 'Tamamlandı'; }
  if (appt.status === 'cancelled') { statusColor = '#ef4444'; statusText = 'İptal Edildi'; }

  return (
    <View style={[styles.card, !isActive && { opacity: 0.7 }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.serviceName}>{appt.service?.name}</Text>
        <Text style={[styles.statusBadge, { color: statusColor }]}>{statusText}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <CalendarIcon size={14} color="#666" />
          <Text style={styles.infoText}>{format(start, 'd MMMM yyyy, EEEE', { locale: tr })}</Text>
        </View>
        <View style={styles.infoRow}>
          <Clock size={14} color="#666" />
          <Text style={styles.infoText}>{format(start, 'HH:mm')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 40 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1a1a1a', borderWidth: 2, borderColor: '#333', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  name: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  phone: { color: '#888', fontSize: 14 },
  
  adminCard: {
    backgroundColor: 'rgba(192, 57, 43, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192, 57, 43, 0.3)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  adminCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminCardTitle: {
    color: '#c0392b',
    fontSize: 16,
    fontWeight: '700',
  },
  adminCardSub: {
    color: '#c0392b',
    opacity: 0.7,
    fontSize: 12,
    marginTop: 2,
  },
  
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  emptyText: { color: '#666', fontSize: 14, fontStyle: 'italic', marginBottom: 20 },
  
  card: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  serviceName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  statusBadge: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  cardBody: { gap: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { color: '#aaa', fontSize: 13 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginTop: 40, paddingVertical: 16, borderRadius: 12, backgroundColor: '#ff444415'
  },
  logoutText: { color: '#ff4444', fontSize: 16, fontWeight: '600' }
});
