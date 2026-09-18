import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Easing,
} from 'react-native';
import { supabase } from '../lib/supabase';

type BannerData = {
  message: string;
  subMessage?: string;
  type: 'success' | 'info' | 'warning';
};

type Props = {
  customerId: string | null;
};

const TYPE_COLORS = {
  success: { bg: '#14532d', border: '#22c55e', text: '#86efac', icon: '✅' },
  info:    { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd', icon: 'ℹ️' },
  warning: { bg: '#713f12', border: '#eab308', text: '#fde047', icon: '⚠️' },
};

export default function AppointmentStatusBanner({ customerId }: Props) {
  const [banner, setBanner] = useState<BannerData | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = (data: BannerData) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setBanner(data);

    // Slide-down animasyonu
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
    ]).start();

    // 5 saniye sonra kapat
    timerRef.current = setTimeout(() => hideBanner(), 5000);
  };

  const hideBanner = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.in(Easing.quad),
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setBanner(null));
  };

  useEffect(() => {
    if (!customerId) return;

    // Müşterinin bekleyen ve onaylı randevularını dinle
    const channel = supabase
      .channel(`customer-appointments-${customerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          const newStatus = payload.new?.status;
          const oldStatus = payload.old?.status;

          if (oldStatus === newStatus) return;

          if (newStatus === 'confirmed' && oldStatus === 'pending') {
            showBanner({
              type: 'success',
              message: 'Randevunuz Onaylandı! 🎉',
              subMessage: 'Berberiniz sizi bekliyor.',
            });
          } else if (newStatus === 'cancelled') {
            showBanner({
              type: 'warning',
              message: 'Randevunuz İptal Edildi',
              subMessage: 'Yeni bir randevu alabilirsiniz.',
            });
          } else if (newStatus === 'completed') {
            showBanner({
              type: 'info',
              message: 'Randevunuz Tamamlandı ✓',
              subMessage: 'Bizi tercih ettiğiniz için teşekkürler!',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  if (!banner) return null;

  const colors = TYPE_COLORS[banner.type];

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.iconWrapper}>
        <Text style={styles.iconText}>{colors.icon}</Text>
      </View>
      <View style={styles.textWrapper}>
        <Text style={[styles.message, { color: colors.text }]}>{banner.message}</Text>
        {banner.subMessage && (
          <Text style={styles.subMessage}>{banner.subMessage}</Text>
        )}
      </View>
      <TouchableOpacity onPress={hideBanner} style={styles.closeBtn}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 18 },
  textWrapper: { flex: 1 },
  message: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  subMessage: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  closeBtn: { padding: 6 },
  closeText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
});
