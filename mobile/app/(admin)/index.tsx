import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, Scissors, ChevronRight, LogOut, Settings, Users, Bell } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ pending: 0, todayTotal: 0, totalCustomers: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();

    // Realtime: Yeni randevu veya güncelleme olunca sayacı tazele
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointments' }, () => fetchStats())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointments' }, () => fetchStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchStats = async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [pendingRes, todayRes, customersRes] = await Promise.all([
      supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('appointments').select('*', { count: 'exact', head: true })
        .gte('start_at', todayStart.toISOString())
        .lte('start_at', todayEnd.toISOString()),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    ]);

    setStats({
      pending: pendingRes.count ?? 0,
      todayTotal: todayRes.count ?? 0,
      totalCustomers: customersRes.count ?? 0,
    });
    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = () => { setRefreshing(true); fetchStats(); };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#c0392b" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#c0392b" />}
    >
      <Text style={styles.title}>Yönetici Paneli</Text>
      <Text style={styles.subtitle}>İşletmenizi buradan yönetin.</Text>

      {/* İstatistik Kartları */}
      <View style={styles.statsRow}>
        <LinearGradient colors={['#1a1a1a', '#111']} style={styles.statCard}>
          <Text style={styles.statValue}>{stats.todayTotal}</Text>
          <Text style={styles.statLabel}>Bugünkü{'\n'}Randevu</Text>
        </LinearGradient>
        <LinearGradient colors={stats.pending > 0 ? ['#3d1a1a', '#2a0e0e'] : ['#1a1a1a', '#111']} style={styles.statCard}>
          <Text style={[styles.statValue, stats.pending > 0 && { color: '#ef4444' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Onay{'\n'}Bekleyen</Text>
        </LinearGradient>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/(admin)/calendar')} activeOpacity={0.8}>
          <LinearGradient colors={['#1a1a1a', '#111']} style={[styles.statCard, { width: '100%', height: '100%' }]}>
            <Calendar color="#c0392b" size={26} style={{ marginBottom: 6 }} />
            <Text style={styles.statLabel}>Takvimi{'\n'}İncele</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Onay Bekleyen Uyarı Bandı */}
      {stats.pending > 0 && (
        <TouchableOpacity
          style={styles.pendingBanner}
          onPress={() => router.push('/(admin)/appointments')}
          activeOpacity={0.8}
        >
          <View style={styles.pendingDot} />
          <Bell color="#ef4444" size={18} />
          <Text style={styles.pendingText}>{stats.pending} randevu onay bekliyor</Text>
          <ChevronRight color="#ef4444" size={18} />
        </TouchableOpacity>
      )}

      {/* Ana Menü */}
      <View style={styles.grid}>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(admin)/appointments')} activeOpacity={0.8}>
          <View style={[styles.cardIcon, { backgroundColor: 'rgba(192,57,43,0.15)' }]}>
            <Calendar color="#c0392b" size={28} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Randevular</Text>
            {stats.pending > 0
              ? <Text style={styles.badge}>{stats.pending} onay bekleyen</Text>
              : <Text style={styles.cardSub}>Tüm randevuları yönet</Text>
            }
          </View>
          <ChevronRight color="#c0392b" size={22} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/(admin)/services')} activeOpacity={0.8}>
          <View style={[styles.cardIcon, { backgroundColor: 'rgba(52,152,219,0.15)' }]}>
            <Scissors color="#3498db" size={28} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Hizmetler & Fiyatlar</Text>
            <Text style={styles.cardSub}>İçerik ve fiyat yönetimi</Text>
          </View>
          <ChevronRight color="#c0392b" size={22} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/(admin)/settings')} activeOpacity={0.8}>
          <View style={[styles.cardIcon, { backgroundColor: 'rgba(168,85,247,0.15)' }]}>
            <Settings color="#a855f7" size={28} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Ayarlar</Text>
            <Text style={styles.cardSub}>Profil ve tercihler</Text>
          </View>
          <ChevronRight color="#c0392b" size={22} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <LogOut color="#ff4444" size={20} />
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingBottom: 40 },

  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 10, marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 28 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, borderRadius: 16, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  statValue: { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 4 },
  statLabel: { color: '#666', fontSize: 11, textAlign: 'center', lineHeight: 15 },

  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#ef444410', borderWidth: 1, borderColor: '#ef444430',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20,
  },
  pendingDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444',
  },
  pendingText: { color: '#ef4444', fontSize: 14, fontWeight: '600', flex: 1 },

  grid: { gap: 12, marginBottom: 32 },
  card: {
    backgroundColor: '#1a1a1a', borderRadius: 20, padding: 18,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  cardIcon: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 3 },
  cardSub: { fontSize: 13, color: '#888' },
  badge: { fontSize: 13, color: '#eab308', fontWeight: '600' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 15, borderRadius: 14, backgroundColor: '#ff444414',
    borderWidth: 1, borderColor: '#ff444430',
  },
  logoutText: { color: '#ff4444', fontSize: 16, fontWeight: '600' },
});
