import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, RefreshControl, Animated, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Calendar, Scissors, ChevronRight, LogOut, Settings,
  Users, Bell, TrendingUp, DollarSign, Clock,
  AlertCircle, BarChart2,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const RED      = '#c0392b';
const RED_DARK = '#96281b';
const RED_DIM  = '#7f1d1d';

interface Stats {
  pending: number;
  todayTotal: number;
  confirmedToday: number;
  totalCustomers: number;
  weekTotal: number;
  todayRevenue: number;
  weekRevenue: number;
}

interface TodayAppointment {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  customer_name?: string;
  service_name?: string;
  service_price?: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    pending: 0, todayTotal: 0, confirmedToday: 0,
    totalCustomers: 0, weekTotal: 0, todayRevenue: 0, weekRevenue: 0,
  });
  const [todayAppts, setTodayAppts] = useState<TodayAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel('admin-dash-v3')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointments' }, () => fetchAll())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointments' }, () => fetchAll())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAll = async () => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const weekStart  = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const [pendingRes, todayRes, confirmedRes, customersRes, weekRes, todayApptData, weekApptData] =
      await Promise.all([
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('appointments').select('*', { count: 'exact', head: true })
          .gte('start_at', todayStart.toISOString()).lte('start_at', todayEnd.toISOString()),
        supabase.from('appointments').select('*', { count: 'exact', head: true })
          .gte('start_at', todayStart.toISOString()).lte('start_at', todayEnd.toISOString()).eq('status', 'confirmed'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
        supabase.from('appointments').select('*', { count: 'exact', head: true })
          .gte('start_at', weekStart.toISOString()).lte('start_at', weekEnd.toISOString()),
        supabase.from('appointments')
          .select('id, start_at, end_at, status, customer_name, service:services(name, price)')
          .gte('start_at', todayStart.toISOString()).lte('start_at', todayEnd.toISOString())
          .order('start_at').limit(10),
        supabase.from('appointments')
          .select('service:services(price)').eq('status', 'completed')
          .gte('start_at', weekStart.toISOString()).lte('start_at', weekEnd.toISOString()),
      ]);

    const todayCompleted = (todayApptData.data ?? []).filter((a: any) => a.status === 'completed');
    const todayRev = todayCompleted.reduce((s: number, a: any) => s + (a.service?.price ?? 0), 0);
    const weekRev  = (weekApptData.data ?? []).reduce((s: number, a: any) => s + (a.service?.price ?? 0), 0);

    const appts: TodayAppointment[] = (todayApptData.data ?? []).map((a: any) => ({
      id: a.id,
      start_at: a.start_at,
      end_at: a.end_at,
      status: a.status,
      customer_name: a.customer_name ?? 'Misafir',
      service_name: a.service?.name ?? '—',
      service_price: a.service?.price ?? 0,
    }));

    setStats({
      pending: pendingRes.count ?? 0,
      todayTotal: todayRes.count ?? 0,
      confirmedToday: confirmedRes.count ?? 0,
      totalCustomers: customersRes.count ?? 0,
      weekTotal: weekRes.count ?? 0,
      todayRevenue: todayRev,
      weekRevenue: weekRev,
    });
    setTodayAppts(appts);
    setLoading(false);
    setRefreshing(false);

    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 14, useNativeDriver: true }),
    ]).start();
  };

  const handleRefresh = () => { setRefreshing(true); fetchAll(); };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    pending:   { label: 'Bekliyor',    color: '#eab308' },
    confirmed: { label: 'Onaylı',      color: '#22c55e' },
    completed: { label: 'Tamamlandı',  color: '#3b82f6' },
    cancelled: { label: 'İptal',       color: RED },
    no_show:   { label: 'Gelmedi',     color: '#6b7280' },
  };

  if (loading) {
    return (
      <LinearGradient colors={['#0a0a0a', '#0d0d0d']} style={styles.loadingContainer}>
        <View style={styles.loadingInner}>
          <View style={styles.loadingIcon}>
            <Scissors color={RED} size={30} />
          </View>
          <ActivityIndicator size="large" color={RED} style={{ marginTop: 20 }} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={RED} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <LinearGradient colors={['#1a0808', '#0a0a0a']} style={styles.header}>
          <View>
            <Text style={styles.headerEyebrow}>Yönetici Paneli</Text>
            <Text style={styles.headerTitle}>Merhaba! 👋</Text>
            <Text style={styles.headerDate}>
              {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/(admin)/settings')}>
            <Settings color={RED} size={20} />
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      {/* Onay Bekleyen Uyarı */}
      {stats.pending > 0 && (
        <Animated.View style={{ opacity: fadeAnim }}>
          <TouchableOpacity
            onPress={() => router.push('/(admin)/appointments')}
            activeOpacity={0.85}
            style={styles.urgentWrap}
          >
            <LinearGradient colors={['#3d0a0a', '#1a0505']} style={styles.urgentBanner}>
              <View style={styles.urgentDot} />
              <Bell color={RED} size={18} />
              <Text style={styles.urgentText}>{stats.pending} randevu onay bekliyor</Text>
              <ChevronRight color={RED} size={18} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Stat Kartları — 2×2 grid */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <Text style={styles.sectionLabel}>GENEL BAKIŞ</Text>
        <View style={styles.statsGrid}>

          <TouchableOpacity style={styles.statCardWrap} onPress={() => router.push('/(admin)/appointments')} activeOpacity={0.8}>
            <LinearGradient colors={['#1a1a1a', '#111']} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(192,57,43,0.15)' }]}>
                <Calendar color={RED} size={20} />
              </View>
              <Text style={styles.statValue}>{stats.todayTotal}</Text>
              <Text style={styles.statLabel}>Bugünkü{'\n'}Randevu</Text>
              <Text style={styles.statSub}>{stats.confirmedToday} onaylı</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCardWrap} onPress={() => router.push('/(admin)/appointments')} activeOpacity={0.8}>
            <LinearGradient
              colors={stats.pending > 0 ? ['#3d0a0a', '#1a0505'] : ['#1a1a1a', '#111']}
              style={styles.statCard}
            >
              <View style={[styles.statIcon, { backgroundColor: 'rgba(192,57,43,0.15)' }]}>
                <AlertCircle color={stats.pending > 0 ? RED : '#555'} size={20} />
              </View>
              <Text style={[styles.statValue, stats.pending > 0 && { color: RED }]}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Onay{'\n'}Bekleyen</Text>
              {stats.pending > 0 && <Text style={[styles.statSub, { color: RED_DARK }]}>İşlem gerekli</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCardWrap} onPress={() => router.push('/(admin)/appointments')} activeOpacity={0.8}>
            <LinearGradient colors={['#1a1a1a', '#111']} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
                <Users color="#6366f1" size={20} />
              </View>
              <Text style={[styles.statValue, { color: '#6366f1' }]}>{stats.totalCustomers}</Text>
              <Text style={styles.statLabel}>Toplam{'\n'}Müşteri</Text>
              <Text style={styles.statSub}>kayıtlı</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCardWrap} onPress={() => router.push('/(admin)/calendar')} activeOpacity={0.8}>
            <LinearGradient colors={['#1a1a1a', '#111']} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
                <BarChart2 color="#6366f1" size={20} />
              </View>
              <Text style={[styles.statValue, { color: '#6366f1' }]}>{stats.weekTotal}</Text>
              <Text style={styles.statLabel}>Bu Hafta{'\n'}Toplam</Text>
              <Text style={styles.statSub}>randevu</Text>
            </LinearGradient>
          </TouchableOpacity>

        </View>
      </Animated.View>

      {/* Gelir Kartları */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.sectionLabel}>GELİR RAPORU</Text>
        <View style={styles.revenueRow}>
          <LinearGradient colors={['#1a0808', '#0d0505']} style={styles.revenueCard}>
            <View style={styles.revenueHeader}>
              <View style={[styles.revenueIconWrap, { backgroundColor: 'rgba(192,57,43,0.12)' }]}>
                <DollarSign color={RED} size={18} />
              </View>
              <Text style={styles.revenueTitle}>BUGÜN</Text>
            </View>
            <Text style={[styles.revenueAmount, { color: RED }]}>
              ₺{stats.todayRevenue.toLocaleString('tr-TR')}
            </Text>
            <Text style={styles.revenueNote}>tamamlanan</Text>
          </LinearGradient>

          <LinearGradient colors={['#0a0f1a', '#050a0d']} style={styles.revenueCard}>
            <View style={styles.revenueHeader}>
              <View style={[styles.revenueIconWrap, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
                <TrendingUp color="#6366f1" size={18} />
              </View>
              <Text style={styles.revenueTitle}>BU HAFTA</Text>
            </View>
            <Text style={[styles.revenueAmount, { color: '#6366f1' }]}>
              ₺{stats.weekRevenue.toLocaleString('tr-TR')}
            </Text>
            <Text style={styles.revenueNote}>toplam kazanç</Text>
          </LinearGradient>
        </View>
      </Animated.View>

      {/* Bugünkü Randevular */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>BUGÜNKÜ RANDEVULAR</Text>
          <TouchableOpacity onPress={() => router.push('/(admin)/appointments')}>
            <Text style={styles.seeAll}>Tümü →</Text>
          </TouchableOpacity>
        </View>

        {todayAppts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Calendar color="#333" size={40} />
            <Text style={styles.emptyText}>Bugün randevu yok</Text>
          </View>
        ) : (
          <View style={styles.apptList}>
            {todayAppts.map((appt) => {
              const s = statusMap[appt.status] ?? statusMap.pending;
              return (
                <TouchableOpacity
                  key={appt.id}
                  style={styles.apptCard}
                  onPress={() => router.push('/(admin)/appointments')}
                  activeOpacity={0.8}
                >
                  <View style={styles.apptTime}>
                    <Text style={styles.apptTimeMain}>{formatTime(appt.start_at)}</Text>
                    <Text style={styles.apptTimeEnd}>{formatTime(appt.end_at)}</Text>
                  </View>
                  <View style={[styles.apptBar, { backgroundColor: s.color }]} />
                  <View style={styles.apptContent}>
                    <Text style={styles.apptName}>{appt.customer_name}</Text>
                    <Text style={styles.apptService}>{appt.service_name}</Text>
                  </View>
                  <View style={styles.apptRight}>
                    <Text style={[styles.apptStatus, { color: s.color }]}>{s.label}</Text>
                    {(appt.service_price ?? 0) > 0 && (
                      <Text style={styles.apptPrice}>₺{appt.service_price}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </Animated.View>

      {/* Hızlı Erişim Menüsü */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.sectionLabel}>HIZLI ERİŞİM</Text>
        <View style={styles.menuGrid}>

          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(admin)/appointments')} activeOpacity={0.85}>
            <LinearGradient colors={['#1a0808', '#111']} style={styles.menuInner}>
              <View style={[styles.menuIcon, { backgroundColor: 'rgba(192,57,43,0.15)' }]}>
                <Calendar color={RED} size={26} />
              </View>
              <Text style={styles.menuTitle}>Randevular</Text>
              <Text style={styles.menuSub}>Randevuları yönet</Text>
              {stats.pending > 0 && (
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>{stats.pending}</Text>
                </View>
              )}
              <ChevronRight color="#333" size={16} style={styles.menuArrow} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(admin)/calendar')} activeOpacity={0.85}>
            <LinearGradient colors={['#1a1a1a', '#111']} style={styles.menuInner}>
              <View style={[styles.menuIcon, { backgroundColor: 'rgba(192,57,43,0.12)' }]}>
                <Clock color={RED} size={26} />
              </View>
              <Text style={styles.menuTitle}>Takvim</Text>
              <Text style={styles.menuSub}>Gün/hafta görünümü</Text>
              <ChevronRight color="#333" size={16} style={styles.menuArrow} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(admin)/services')} activeOpacity={0.85}>
            <LinearGradient colors={['#1a1a1a', '#111']} style={styles.menuInner}>
              <View style={[styles.menuIcon, { backgroundColor: 'rgba(192,57,43,0.12)' }]}>
                <Scissors color={RED} size={26} />
              </View>
              <Text style={styles.menuTitle}>Hizmetler</Text>
              <Text style={styles.menuSub}>Fiyat & içerik</Text>
              <ChevronRight color="#333" size={16} style={styles.menuArrow} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(admin)/settings')} activeOpacity={0.85}>
            <LinearGradient colors={['#1a1a1a', '#111']} style={styles.menuInner}>
              <View style={[styles.menuIcon, { backgroundColor: 'rgba(192,57,43,0.12)' }]}>
                <Settings color={RED} size={26} />
              </View>
              <Text style={styles.menuTitle}>Ayarlar</Text>
              <Text style={styles.menuSub}>Profil & tercihler</Text>
              <ChevronRight color="#333" size={16} style={styles.menuArrow} />
            </LinearGradient>
          </TouchableOpacity>

        </View>
      </Animated.View>

      {/* Çıkış */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <LogOut color={RED} size={20} />
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { paddingBottom: 60 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingInner: { alignItems: 'center' },
  loadingIcon: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(192,57,43,0.1)', borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.25)', justifyContent: 'center', alignItems: 'center',
  },
  loadingText: { color: '#555', marginTop: 12, fontSize: 13 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 24,
    borderBottomWidth: 1, borderBottomColor: 'rgba(192,57,43,0.1)',
  },
  headerEyebrow: { color: RED_DARK, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  headerTitle:   { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  headerDate:    { color: '#444', fontSize: 12, marginTop: 4 },
  headerBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(192,57,43,0.1)', borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.2)', justifyContent: 'center', alignItems: 'center',
  },

  // Urgent banner
  urgentWrap: { marginHorizontal: 16, marginTop: 16, borderRadius: 14, overflow: 'hidden' },
  urgentBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 13,
    borderWidth: 1, borderColor: 'rgba(192,57,43,0.3)', borderRadius: 14,
  },
  urgentDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: RED },
  urgentText: { color: RED, fontSize: 13, fontWeight: '700', flex: 1 },

  // Sections
  sectionLabel: {
    color: '#444', fontSize: 11, fontWeight: '800',
    letterSpacing: 1, textTransform: 'uppercase',
    marginHorizontal: 20, marginTop: 28, marginBottom: 12,
  },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  seeAll: { color: RED_DARK, fontSize: 12, fontWeight: '700', marginRight: 20, marginTop: 28 },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  statCardWrap: { width: (width - 42) / 2 },
  statCard: {
    borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', minHeight: 126,
  },
  statIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { color: '#fff', fontSize: 28, fontWeight: '900', lineHeight: 32 },
  statLabel: { color: '#555', fontSize: 11, lineHeight: 15, marginTop: 4 },
  statSub:   { color: '#333', fontSize: 10, marginTop: 4 },

  // Revenue
  revenueRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  revenueCard: {
    flex: 1, borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  revenueHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  revenueIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  revenueTitle:    { color: '#444', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  revenueAmount:   { fontSize: 20, fontWeight: '900' },
  revenueNote:     { color: '#333', fontSize: 10, marginTop: 4 },

  // Appointments
  emptyCard: {
    marginHorizontal: 16, backgroundColor: '#111', borderRadius: 18,
    paddingVertical: 36, alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  emptyText: { color: '#333', fontSize: 13 },
  apptList: { paddingHorizontal: 16, gap: 8 },
  apptCard: {
    backgroundColor: '#111', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  apptTime:     { alignItems: 'center', minWidth: 42 },
  apptTimeMain: { color: '#fff', fontSize: 13, fontWeight: '700' },
  apptTimeEnd:  { color: '#444', fontSize: 10, marginTop: 2 },
  apptBar:      { width: 2, height: 36, borderRadius: 2 },
  apptContent:  { flex: 1 },
  apptName:     { color: '#fff', fontSize: 13, fontWeight: '600' },
  apptService:  { color: '#555', fontSize: 11, marginTop: 2 },
  apptRight:    { alignItems: 'flex-end' },
  apptStatus:   { fontSize: 10, fontWeight: '700' },
  apptPrice:    { color: RED, fontSize: 12, fontWeight: '700', marginTop: 4 },

  // Menu grid
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  menuCard: { width: (width - 42) / 2 },
  menuInner: {
    borderRadius: 18, padding: 18, minHeight: 116,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', position: 'relative',
  },
  menuIcon:  { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  menuTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  menuSub:   { color: '#555', fontSize: 10 },
  menuBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: RED, borderRadius: 10, minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  menuBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  menuArrow: { position: 'absolute', bottom: 12, right: 12 },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 28, paddingVertical: 14, borderRadius: 14,
    backgroundColor: 'rgba(192,57,43,0.08)', borderWidth: 1, borderColor: 'rgba(192,57,43,0.2)',
  },
  logoutText: { color: RED, fontSize: 15, fontWeight: '700' },
});
