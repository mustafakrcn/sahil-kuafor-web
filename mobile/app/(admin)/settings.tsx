import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LogOut, User, Bell, Shield, ChevronRight } from 'lucide-react-native';

export default function AdminSettings() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ full_name: string; phone: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('profiles')
      .select('full_name, phone, role')
      .eq('id', user.id)
      .single();

    setProfile(data);
    setLoading(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Admin panelinden çıkmak istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const roleLabel: Record<string, string> = {
    admin: 'Yönetici',
    owner: 'İşletme Sahibi',
    staff: 'Personel',
    customer: 'Müşteri',
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#c0392b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Profil Kartı */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <User color="#c0392b" size={32} />
        </View>
        <View>
          <Text style={styles.profileName}>{profile?.full_name || 'İsimsiz'}</Text>
          <Text style={styles.profileRole}>
            {roleLabel[profile?.role ?? ''] ?? profile?.role ?? 'Admin'}
          </Text>
          {!!profile?.phone && (
            <Text style={styles.profilePhone}>{profile.phone}</Text>
          )}
        </View>
      </View>

      {/* Ayarlar Bölümü */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tercihler</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Bell color="#888" size={20} />
            <Text style={styles.settingLabel}>Randevu Bildirimleri</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#333', true: '#c0392b40' }}
            thumbColor={notificationsEnabled ? '#c0392b' : '#555'}
          />
        </View>

        <TouchableOpacity
          style={[styles.menuRow, { marginTop: 12 }]}
          onPress={async () => {
             try {
               const Notifications = await import('expo-notifications');
               const Constants = await import('expo-constants');
               
               const { status } = await Notifications.requestPermissionsAsync();
               if (status !== 'granted') {
                 Alert.alert('Hata', 'Telefon ayarlarından Sahil Kuaför için Bildirim izni vermelisiniz!');
                 return;
               }
               
               const projectId = Constants.default.expoConfig?.extra?.eas?.projectId ?? Constants.default.easConfig?.projectId;
               const token = await Notifications.getExpoPushTokenAsync({ projectId });
               
               const { data: { user } } = await supabase.auth.getUser();
               if (user) {
                 await supabase.from('profiles').update({ push_token: token.data }).eq('id', user.id);
                 Alert.alert('Başarılı', 'Bildirim tokeniniz başarıyla veritabanına kaydedildi! Artık bildirim alabilirsiniz.');
               } else {
                 Alert.alert('Hata', 'Kullanıcı bulunamadı.');
               }
             } catch(e: any) {
               Alert.alert('Sistem Hatası', e.message);
             }
          }}
        >
          <Bell color="#888" size={20} />
          <Text style={styles.settingLabel}>Bildirim Bağlantısını Onar</Text>
          <ChevronRight color="#555" size={18} style={styles.chevron} />
        </TouchableOpacity>
      </View>

      {/* Güvenlik */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Güvenlik</Text>

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() =>
            Alert.alert('Şifre Değiştir', 'Şifre sıfırlama e-postası gönderilsin mi?', [
              { text: 'İptal', style: 'cancel' },
              {
                text: 'Gönder',
                onPress: async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user?.email) {
                    await supabase.auth.resetPasswordForEmail(user.email);
                    Alert.alert('Gönderildi', 'E-posta adresinize şifre sıfırlama bağlantısı gönderildi.');
                  }
                },
              },
            ])
          }
        >
          <Shield color="#888" size={20} />
          <Text style={styles.settingLabel}>Şifre Değiştir</Text>
          <ChevronRight color="#555" size={18} style={styles.chevron} />
        </TouchableOpacity>
      </View>

      {/* Çıkış */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <LogOut color="#ef4444" size={20} />
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Sahil Kuaför Admin v1.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 20 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#1a1a1a', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 24,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(192,57,43,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  profileName: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 3 },
  profileRole: { color: '#c0392b', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  profilePhone: { color: '#888', fontSize: 13 },

  section: { marginBottom: 24 },
  sectionTitle: { color: '#555', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1a1a1a', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingLabel: { color: '#ddd', fontSize: 15 },

  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1a1a1a', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  chevron: { marginLeft: 'auto' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 14, backgroundColor: '#ef444414',
    borderWidth: 1, borderColor: '#ef444430', marginTop: 'auto',
  },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },

  versionText: { color: '#333', fontSize: 12, textAlign: 'center', marginTop: 16, marginBottom: 8 },
});
