import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useBookingStore } from '../../store/bookingStore';
import { CheckCircle, Calendar, Home, MessageCircle } from 'lucide-react-native';

export default function SuccessScreen() {
  const router = useRouter();
  const { reset, selection } = useBookingStore();

  // Animasyonlar
  const scaleAnim  = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    // Ard arda gelen animasyon sekansı
    Animated.sequence([
      // 1) İkon pop-in
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 7,
      }),
      // 2) İçerik fade + slide-up
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
      ]),
    ]).start();
  }, []);

  const handleGoHome = () => {
    reset();
    router.replace('/(tabs)/');
  };

  const handleViewAppointments = () => {
    reset();
    router.replace('/(tabs)/profile');
  };

  const handleWhatsApp = () => {
    // WhatsApp ile berberle iletişim — gerçek numara ile güncellenebilir
    router.push('https://wa.me/905001234567');
  };

  return (
    <View style={styles.container}>
      {/* Arkaplan dekor */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {/* Başarı ikonu */}
      <Animated.View style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.iconOuter}>
          <View style={styles.iconInner}>
            <CheckCircle color="#22c55e" size={56} strokeWidth={1.5} />
          </View>
        </View>
      </Animated.View>

      {/* İçerik */}
      <Animated.View
        style={[
          styles.content,
          { opacity: opacityAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.title}>Randevunuz Alındı!</Text>
        <Text style={styles.subtitle}>Teşekkürler, sizi bekliyoruz 💈</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Calendar size={16} color="#c0392b" />
            <Text style={styles.infoText}>
              Randevunuz <Text style={styles.infoHighlight}>onay bekliyor</Text> durumundadır.
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <MessageCircle size={16} color="#c0392b" />
            <Text style={styles.infoText}>
              Berberiniz en kısa sürede sizi telefonla arayarak onaylayacaktır.
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <CheckCircle size={16} color="#c0392b" />
            <Text style={styles.infoText}>
              Ödeme <Text style={styles.infoHighlight}>salonda nakit</Text> olarak yapılmaktadır.
            </Text>
          </View>
        </View>

        {/* Aksiyonlar */}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleGoHome} activeOpacity={0.85}>
          <Home color="#fff" size={18} />
          <Text style={styles.primaryBtnText}>Ana Sayfaya Dön</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleViewAppointments} activeOpacity={0.85}>
          <Calendar color="#c0392b" size={18} />
          <Text style={styles.secondaryBtnText}>Randevularımı Gör</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp} activeOpacity={0.85}>
          <Text style={styles.whatsappIcon}>📞</Text>
          <Text style={styles.whatsappBtnText}>WhatsApp ile İletişim</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    overflow: 'hidden',
  },

  // Arkaplan dekor daireleri
  bgCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(34, 197, 94, 0.03)',
    top: -80,
    right: -80,
  },
  bgCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(192, 57, 43, 0.04)',
    bottom: 40,
    left: -60,
  },

  // İkon
  iconWrap: { marginBottom: 32 },
  iconOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  iconInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // İçerik
  content: { width: '100%', alignItems: 'center' },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 28,
  },

  // Bilgi kartı
  infoCard: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 20,
  },
  infoHighlight: {
    color: '#fff',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  // Butonlar
  primaryBtn: {
    width: '100%',
    backgroundColor: '#c0392b',
    borderRadius: 14,
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
    shadowColor: '#c0392b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  secondaryBtn: {
    width: '100%',
    backgroundColor: 'rgba(192, 57, 43, 0.1)',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(192, 57, 43, 0.25)',
  },
  secondaryBtnText: {
    color: '#c0392b',
    fontSize: 16,
    fontWeight: '700',
  },

  whatsappBtn: {
    width: '100%',
    backgroundColor: 'rgba(37, 211, 102, 0.08)',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.2)',
  },
  whatsappIcon: { fontSize: 18 },
  whatsappBtnText: {
    color: '#25d366',
    fontSize: 15,
    fontWeight: '600',
  },
});
