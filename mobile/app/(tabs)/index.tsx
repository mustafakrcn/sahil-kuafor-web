import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { Scissors, Calendar as CalendarIcon, ArrowRight } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import AppointmentStatusBanner from '../../components/AppointmentStatusBanner';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
  const router = useRouter();
  const [upcomingAppt, setUpcomingAppt] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchUpcoming = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);

    const { data } = await supabase
      .from('appointments')
      .select('*, service:services(name)')
      .eq('customer_id', user.id)
      .in('status', ['pending', 'confirmed'])
      .gte('start_at', new Date().toISOString())
      .order('start_at', { ascending: true })
      .limit(1)
      .single();

    setUpcomingAppt(data || null);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUpcoming();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchUpcoming();

    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      channel = supabase
        .channel(`home-upcoming-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'appointments',
            filter: `customer_id=eq.${user.id}`,
          },
          () => {
            fetchUpcoming();
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    pending:   { label: 'Onay Bekleniyor', color: '#f59e0b', bg: '#f59e0b15' },
    confirmed: { label: 'Onaylandı ✓',     color: '#10b981', bg: '#10b98115' },
  };

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" />
      <AppointmentStatusBanner customerId={userId} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#c0392b"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Merhaba,</Text>
          <Text style={styles.title}>Sahil Kuaför'e{'\n'}Hoş Geldiniz</Text>
        </View>

        {/* Premium Hero Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/booking/service')}
        >
          <LinearGradient
            colors={['#c0392b', '#96281b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Tarzınızı Yenileyin</Text>
              <Text style={styles.heroSubtitle}>
                Sıra beklemeden uzman berberlerimizden hemen randevu alın.
              </Text>
              <View style={styles.heroBtn}>
                <Text style={styles.heroBtnText}>Hemen Randevu Al</Text>
                <ArrowRight color="#fff" size={16} />
              </View>
            </View>
            <View style={styles.heroIconBg}>
              <Scissors color="#fff" size={64} opacity={0.15} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Upcoming Appointment */}
        {upcomingAppt && (
          <View style={styles.upcomingSection}>
            <Text style={styles.sectionTitle}>Yaklaşan Randevunuz</Text>
            <LinearGradient
              colors={['rgba(30, 30, 36, 0.8)', 'rgba(20, 20, 24, 0.9)']}
              style={styles.upcomingCard}
            >
              <View style={styles.upcomingIcon}>
                <CalendarIcon color="#c0392b" size={24} />
              </View>
              <View style={styles.upcomingDetails}>
                <Text style={styles.upcomingService}>
                  {upcomingAppt.service?.name}
                </Text>
                <Text style={styles.upcomingDate}>
                  {format(
                    parseISO(upcomingAppt.start_at),
                    'd MMMM yyyy, EEEE',
                    { locale: tr }
                  )}
                </Text>
                <Text style={styles.upcomingTime}>
                  Saat:{' '}
                  {format(parseISO(upcomingAppt.start_at), 'HH:mm')}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: statusConfig[upcomingAppt.status]?.bg ?? '#1a1a1a',
                    borderColor: statusConfig[upcomingAppt.status]?.color ?? '#333',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: statusConfig[upcomingAppt.status]?.color ?? '#888' },
                  ]}
                >
                  {statusConfig[upcomingAppt.status]?.label ?? upcomingAppt.status}
                </Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Popular Services */}
        <Text style={styles.sectionTitle}>Öne Çıkan Hizmetler</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.servicesScroll}
        >
          <LinearGradient colors={['#1a1a1a', '#111111']} style={styles.serviceBox}>
            <Text style={styles.serviceBoxTitle}>Saç & Sakal</Text>
            <Text style={styles.serviceBoxPrice}>En çok tercih edilen</Text>
          </LinearGradient>
          <LinearGradient colors={['#1a1a1a', '#111111']} style={styles.serviceBox}>
            <Text style={styles.serviceBoxTitle}>Cilt Bakımı</Text>
            <Text style={styles.serviceBoxPrice}>Ferahlatıcı Etki</Text>
          </LinearGradient>
          <LinearGradient colors={['#1a1a1a', '#111111']} style={styles.serviceBox}>
            <Text style={styles.serviceBoxTitle}>Keratin Bakım</Text>
            <Text style={styles.serviceBoxPrice}>Canlı Görünüm</Text>
          </LinearGradient>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:    { flex: 1, backgroundColor: '#0a0a0a' }, // Web sitesi arka planı
  container:  { flex: 1 },
  content:    { padding: 20, paddingTop: 60, paddingBottom: 40 },
  header:     { marginBottom: 30 },
  greeting:   { color: '#a1a1aa', fontSize: 16, marginBottom: 4, letterSpacing: 0.5 },
  title:      { color: '#ffffff', fontSize: 32, fontWeight: '800', lineHeight: 40, letterSpacing: -0.5 },

  heroCard: {
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 35,
    shadowColor: '#c0392b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  heroContent:  { position: 'relative', zIndex: 2 },
  heroTitle:    { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8, letterSpacing: -0.5 },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: '85%',
  },
  heroBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  heroIconBg:   {
    position: 'absolute',
    right: -20,
    bottom: -20,
    transform: [{ rotate: '-15deg' }],
  },

  sectionTitle: {
    color: '#f4f4f5',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },

  upcomingSection: { marginBottom: 35 },
  upcomingCard: {
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  upcomingIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(192, 57, 43, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  upcomingDetails: { flex: 1 },
  upcomingService: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  upcomingDate:  { color: '#a1a1aa', fontSize: 13, marginBottom: 4 },
  upcomingTime:  { color: '#c0392b', fontSize: 14, fontWeight: '700' },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  servicesScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  serviceBox: {
    padding: 22,
    borderRadius: 20,
    marginRight: 16,
    width: 150,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  serviceBoxTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  serviceBoxPrice: { color: '#a1a1aa', fontSize: 13, fontWeight: '500' },
});
