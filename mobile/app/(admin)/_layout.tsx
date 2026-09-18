import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useAdminAppointmentNotifications } from '../../hooks/usePushNotifications';

export default function AdminLayout() {
  const router = useRouter();

  // Admin paneli açıkken yeni randevuları dinle ve bildirim gönder
  useAdminAppointmentNotifications();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0a0a0a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: '#0a0a0a' },
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.replace('/(tabs)/')} style={{ marginLeft: 8 }}>
            <ChevronLeft color="#fff" size={28} />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Yönetici Paneli',
        }}
      />
      <Stack.Screen
        name="appointments"
        options={{
          title: 'Randevu Yönetimi',
        }}
      />
      <Stack.Screen
        name="services"
        options={{
          title: 'Hizmetler',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
        }}
      />
    </Stack>
  );
}
