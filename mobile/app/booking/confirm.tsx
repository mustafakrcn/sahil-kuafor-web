import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { createAppointment } from '../../lib/api';
import { useBookingStore } from '../../store/bookingStore';
import { supabase } from '../../lib/supabase';

// Basit bir UUID v4 üretici
function generateUUID() {
  let d = new Date().getTime();
  let d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export default function ConfirmScreen() {
  const router = useRouter();
  const { selection, setNotes, reset } = useBookingStore();
  const [loading, setLoading] = useState(false);
  
  const [user, setUser] = useState<any>(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  const { service, slot, notes } = selection;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        supabase.from('profiles').select('full_name, phone').eq('id', data.user.id).single()
          .then(({ data: profile }) => {
            if (profile) {
              setGuestName(profile.full_name || '');
              setGuestPhone(profile.phone || '');
            }
          });
      }
    });
  }, []);

  if (!service || !slot) {
    router.replace('/booking/service');
    return null;
  }

  const startFormatted = format(parseISO(slot.slot_start), 'HH:mm', { locale: tr });
  const endFormatted   = format(parseISO(slot.slot_end),   'HH:mm', { locale: tr });
  const dateFormatted  = format(parseISO(slot.slot_start), 'd MMMM yyyy, EEEE', { locale: tr });

  const handleConfirm = async () => {
    if (!user && (!guestName.trim() || !guestPhone.trim())) {
      Alert.alert('Eksik Bilgi', 'Lütfen adınızı ve telefon numaranızı girin.');
      return;
    }

    setLoading(true);
    try {
      let customerId = user?.id;

      // Misafir Girişi: Profil yoksa telefonla bul veya yeni yarat
      if (!customerId) {
        const { data: existingProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', guestPhone.trim())
          .limit(1);

        if (existingProfiles && existingProfiles.length > 0) {
          customerId = existingProfiles[0].id;
        } else {
          customerId = generateUUID();
          const { error: profileErr } = await supabase.from('profiles').insert({
            id: customerId,
            full_name: guestName.trim(),
            phone: guestPhone.trim(),
            role: 'customer'
          });
          if (profileErr) throw profileErr;
        }
      }

      // Randevuyu Pending olarak oluştur
      await createAppointment({
        customerId: customerId,
        serviceId: service.id,
        startAt: slot.slot_start,
        endAt: slot.slot_end,
        notes,
      });

      // Push Bildirimi Gönder (Admin ve Staff'a)
      const { data: admins } = await supabase
        .from('profiles')
        .select('push_token')
        .in('role', ['admin', 'staff'])
        .not('push_token', 'is', null);

      if (admins && admins.length > 0) {
        const messages = admins.map(admin => ({
          to: admin.push_token,
          sound: 'default',
          title: 'YENİ RANDEVU! 🔔',
          body: `${guestName || user?.user_metadata?.full_name || 'Bir müşteri'} yeni bir randevu oluşturdu (${service.name}).`,
          data: { type: 'new_appointment' },
        }));

        fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        }).catch(err => console.error("Push API Hatası:", err));
      }

      Alert.alert('BAŞARILI', 'Randevunuz oluşturuldu, bizi tercih ettiğiniz için çok teşekkür ederiz. Kayıtlı cep telefonu numaranızdan size hatırlatma yapacağız.');
      router.replace('/booking/success');
    } catch (err: any) {
      if (err?.code === '23P01') {
        Alert.alert(
          'Saat Doldu',
          'Seçtiğiniz saat az önce başkası tarafından alındı. Lütfen başka bir saat seçin.',
          [{ text: 'Saat Seç', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Hata', err.message || 'Randevu oluşturulamadı.');
      }
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BookingProgress step={3} />

      <Text style={styles.heading}>Randevu Özeti</Text>
      <Text style={styles.subheading}>Bilgileri kontrol edip randevunuzu tamamlayın</Text>

      <View style={styles.summaryCard}>
        <SummaryRow icon="✂️" label="Hizmet"   value={service.name} />
        <Divider />
        <SummaryRow icon="📅" label="Tarih"    value={dateFormatted} />
        <Divider />
        <SummaryRow icon="⏰" label="Saat"     value={`${startFormatted} – ${endFormatted}`} />
        <Divider />
        <SummaryRow icon="⏱" label="Süre"     value={`${service.duration_min} dakika`} />
        <Divider />
        <SummaryRow
          icon="💳"
          label="Toplam"
          value={`₺${service.price_with_vat.toFixed(2)}`}
          valueStyle={{ color: '#e74c3c', fontWeight: '700', fontSize: 16 }}
        />
      </View>

      <Text style={styles.notesLabel}>İletişim Bilgileriniz</Text>
      <TextInput
        style={styles.guestInput}
        placeholder="Adınız Soyadınız"
        placeholderTextColor="#555"
        value={guestName}
        onChangeText={setGuestName}
        editable={!user}
      />
      <TextInput
        style={styles.guestInput}
        placeholder="Telefon Numaranız (Örn: 0555...)"
        placeholderTextColor="#555"
        keyboardType="phone-pad"
        value={guestPhone}
        onChangeText={setGuestPhone}
        editable={!user}
      />

      <Text style={styles.notesLabel}>Not ekle (opsiyonel)</Text>
      <TextInput
        style={styles.notesInput}
        placeholder="Özel isteğinizi yazın..."
        placeholderTextColor="#555"
        multiline
        value={notes}
        onChangeText={setNotes}
        maxLength={300}
      />

      <TouchableOpacity
        style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
        onPress={handleConfirm}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.confirmText}>Randevuyu Onayla (Salonda Öde)</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} disabled={loading}>
        <Text style={styles.backText}>← Saat Değiştir</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function SummaryRow({
  icon, label, value, valueStyle
}: {
  icon: string; label: string; value: string; valueStyle?: object;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, valueStyle]}>{value}</Text>
      </View>
    </View>
  );
}

const Divider = () => <View style={styles.divider} />;

function BookingProgress({ step }: { step: number }) {
  return (
    <View style={styles.progress}>
      {[1, 2, 3].map((n, i) => (
        <View key={n} style={styles.progressStep}>
          <View style={[styles.progressDot, n <= step && styles.progressDotActive]}>
            <Text style={[styles.progressNum, n <= step && styles.progressNumActive]}>{n}</Text>
          </View>
          {i < 2 && (
            <View style={[styles.progressLine, n < step && styles.progressLineActive]} />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0a0a0a' },
  content:      { padding: 20, paddingBottom: 60 },
  heading:      { fontSize: 26, fontWeight: '700', color: '#fff', marginTop: 20 },
  subheading:   { fontSize: 14, color: '#999', marginTop: 4, marginBottom: 24 },

  summaryCard: {
    backgroundColor: '#1a1a1a', borderRadius: 20,
    padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  row:         { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12 },
  rowIcon:     { fontSize: 20, marginRight: 14, marginTop: 2 },
  rowContent:  { flex: 1 },
  rowLabel:    { fontSize: 12, color: '#888', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowValue:    { fontSize: 14, color: '#fff', fontWeight: '500' },
  divider:     { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },

  notesLabel:  { fontSize: 13, color: '#ccc', marginBottom: 8, fontWeight: '600' },
  guestInput: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 14,
    color: '#fff', fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 16,
  },
  notesInput: {
    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 14,
    color: '#fff', fontSize: 14, minHeight: 80, textAlignVertical: 'top',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 28,
  },

  confirmBtn: {
    backgroundColor: '#c0392b', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginBottom: 12,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },

  backBtn:  { alignItems: 'center', paddingVertical: 12 },
  backText: { color: '#888', fontSize: 14 },

  progress:          { flexDirection: 'row', alignItems: 'center', paddingTop: 8, marginBottom: 4 },
  progressStep:      { flexDirection: 'row', alignItems: 'center', flex: 1 },
  progressDot:       { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1a1a1a',
                       borderWidth: 2, borderColor: '#333', justifyContent: 'center', alignItems: 'center' },
  progressDotActive: { backgroundColor: '#c0392b', borderColor: '#c0392b' },
  progressNum:       { fontSize: 12, fontWeight: '700', color: '#555' },
  progressNumActive: { color: '#fff' },
  progressLine:      { flex: 1, height: 2, backgroundColor: '#333', marginHorizontal: 4 },
  progressLineActive:{ backgroundColor: '#c0392b' },
});
