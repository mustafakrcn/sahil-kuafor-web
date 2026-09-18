import { useState, useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

/* ─── Expo Go tespiti ────────────────────────────────────────────
   SDK 53+ ile Expo Go'da Android push bildirimleri tamamen kaldırıldı.
   Bu yüzden Expo Go'da tüm expo-notifications kodunu bypass ediyoruz.
   Development build veya üretim APK/IPA'da tam özellik çalışır.
──────────────────────────────────────────────────────────────── */
const IS_EXPO_GO =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === 'storeClient';

if (!IS_EXPO_GO) {
  import('expo-notifications').then(Notifications => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        // expo-notifications v57+ requires these additional fields
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  });
}

export interface PushNotificationState {
  expoPushToken?: any;
  notification?: any;
}

/* ─── Yerel bildirim gönder (sadece dev build / production) ─── */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  if (IS_EXPO_GO) {
    // Expo Go'da bildirim yerine Alert kullan
    console.log(`[Bildirim] ${title}: ${body}`);
    return;
  }

  try {
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data ?? {},
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'appointments' } : {}),
      },
      trigger: null, // Anında
    });
  } catch (err) {
    console.warn('[Bildirim] Gönderilemedi:', err);
  }
}

/* ─── Ana hook ──────────────────────────────────────────────── */
export const usePushNotifications = (): PushNotificationState => {
  const [expoPushToken, setExpoPushToken] = useState<any>();
  const [notification, setNotification] = useState<any>();

  useEffect(() => {
    if (IS_EXPO_GO) {
      console.log('[Push] Expo Go tespit edildi — push bildirimleri devre dışı. Yerel bildirim sistemi kullanılıyor.');
      return;
    }

    // Sadece dev build / production APK'da çalışır
    (async () => {
      try {
        const Device = await import('expo-device');
        const Notifications = await import('expo-notifications');

        if (!Device.default.isDevice) return;

        // Android bildirim kanalı
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('appointments', {
            name: 'Randevu Bildirimleri',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#c0392b',
            sound: 'default',
          });
        }

        // İzin al
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        // Push token
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        const token = await Notifications.getExpoPushTokenAsync({ projectId });
        setExpoPushToken(token);

        // Supabase'e kaydet
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({ push_token: token.data }).eq('id', user.id);
          console.log('[Push] Token kaydedildi.');
        }

        // Dinleyiciler
        const notifListener = Notifications.addNotificationReceivedListener((n) => setNotification(n));
        const responseListener = Notifications.addNotificationResponseReceivedListener((r) => {
          console.log('[Push] Bildirime tıklandı:', r.notification.request.content.data);
        });

        return () => {
          notifListener.remove();
          responseListener.remove();
        };
      } catch (err) {
        console.warn('[Push] Bildirim sistemi başlatılamadı:', err);
      }
    })();
  }, []);

  return { expoPushToken, notification };
};

/* ─── Admin için Realtime randevu bildirim hook'u ──────────────
   Expo Go dahil her ortamda çalışır:
   - Dev build / APK: Sistem bildirimi gösterir
   - Expo Go: Alert.alert() ile bildirim gösterir
──────────────────────────────────────────────────────────────── */
export function useAdminAppointmentNotifications() {
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin =
        profile?.role === 'admin' ||
        profile?.role === 'owner' ||
        profile?.role === 'staff';
      if (!isAdmin) return;

      console.log('[AdminNotif] Randevu dinlemesi başlatıldı. Expo Go:', IS_EXPO_GO);

      channel = supabase
        .channel('admin-new-appointments')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'appointments' },
          async (payload) => {
            if (payload.new?.status !== 'pending') return;

            // Randevu detaylarını çek
            const { data: appt } = await supabase
              .from('appointments')
              .select(`
                id, start_at, notes,
                customer:profiles!appointments_customer_id_fkey(full_name, phone),
                service:services(name)
              `)
              .eq('id', payload.new.id)
              .single();

            const customerName = (appt?.customer as any)?.full_name ?? 'Misafir';
            const serviceName = (appt?.service as any)?.name ?? 'Hizmet';
            const phone = (appt?.customer as any)?.phone ?? '';

            const title = '💈 Yeni Randevu Talebi!';
            const body = `${customerName} — ${serviceName}${phone ? '\n📞 ' + phone : ''}`;

            if (IS_EXPO_GO) {
              // Expo Go'da in-app Alert ile göster
              Alert.alert(title, body, [{ text: 'Tamam' }]);
            } else {
              // Dev build / APK'da sistem bildirimi
              await sendLocalNotification(title, body, { appointmentId: payload.new.id });
            }
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);
}
