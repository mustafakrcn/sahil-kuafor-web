import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Clock } from 'lucide-react-native';

const DAYS = [
  { id: 1, name: 'Pazartesi' },
  { id: 2, name: 'Salı' },
  { id: 3, name: 'Çarşamba' },
  { id: 4, name: 'Perşembe' },
  { id: 5, name: 'Cuma' },
  { id: 6, name: 'Cumartesi' },
  { id: 7, name: 'Pazar' }
];

export default function AdminStaffScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [hours, setHours] = useState<any>({});

  useEffect(() => {
    fetchStaffAndHours();
  }, []);

  const fetchStaffAndHours = async () => {
    setLoading(true);
    
    // İşletme sahibinin (Admin) profiline bağlı staff kaydını bul
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: staffData } = await supabase.from('staff').select('id').eq('profile_id', user.id).single();
    
    if (staffData) {
      setStaffId(staffData.id);
      
      const { data: whData } = await supabase.from('working_hours').select('*').eq('staff_id', staffData.id);
      
      const newHours: any = {};
      // Initialize with defaults (08:00 - 22:00, inactive)
      DAYS.forEach(d => {
        newHours[d.id] = { start_time: '08:00', end_time: '22:00', is_active: false };
      });

      // Override with DB data
      if (whData) {
        whData.forEach(wh => {
          // Format times strictly as HH:mm
          const st = wh.start_time ? wh.start_time.substring(0, 5) : '08:00';
          const et = wh.end_time ? wh.end_time.substring(0, 5) : '22:00';
          newHours[wh.day_of_week] = { start_time: st, end_time: et, is_active: wh.is_active };
        });
      }
      
      setHours(newHours);
    }
    
    setLoading(false);
  };

  const toggleDay = (dayId: number) => {
    setHours({
      ...hours,
      [dayId]: { ...hours[dayId], is_active: !hours[dayId].is_active }
    });
  };

  const updateTime = (dayId: number, field: 'start_time' | 'end_time', value: string) => {
    setHours({
      ...hours,
      [dayId]: { ...hours[dayId], [field]: value }
    });
  };

  const handleSave = async () => {
    if (!staffId) {
      Alert.alert('Hata', 'Personel kaydı bulunamadı.');
      return;
    }

    setSaving(true);
    try {
      // Mevcut saatleri temizle
      await supabase.from('working_hours').delete().eq('staff_id', staffId);

      // Yeni saatleri ekle
      const inserts = DAYS.map(d => ({
        staff_id: staffId,
        day_of_week: d.id,
        start_time: hours[d.id].start_time,
        end_time: hours[d.id].end_time,
        is_active: hours[d.id].is_active
      }));

      const { error } = await supabase.from('working_hours').insert(inserts);
      
      if (error) throw error;
      Alert.alert('Başarılı', 'Çalışma saatleriniz güncellendi.');
    } catch (err: any) {
      Alert.alert('Hata', 'Kaydedilirken bir sorun oluştu.');
      console.log(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#c0392b" />
      </View>
    );
  }

  if (!staffId) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#fff' }}>Yetkisiz veya personel kaydı eksik.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Çalışma Saatleri</Text>
        <TouchableOpacity style={styles.saveTopBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveTopText}>Kaydet</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>İşletmenizin açık olduğu günleri ve saatleri (Örn: 08:00 - 22:00) ayarlayın.</Text>

        {DAYS.map(day => {
          const isActive = hours[day.id]?.is_active;
          return (
            <View key={day.id} style={[styles.dayCard, !isActive && { opacity: 0.6 }]}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayName}>{day.name}</Text>
                <TouchableOpacity style={styles.toggleBtn} onPress={() => toggleDay(day.id)}>
                  <View style={[styles.dot, isActive ? { backgroundColor: '#10b981' } : { backgroundColor: '#555' }]} />
                  <Text style={styles.toggleText}>{isActive ? 'Açık' : 'Kapalı'}</Text>
                </TouchableOpacity>
              </View>

              {isActive && (
                <View style={styles.timeRow}>
                  <View style={styles.timeInputWrap}>
                    <Text style={styles.timeLabel}>Açılış</Text>
                    <TextInput 
                      style={styles.timeInput}
                      value={hours[day.id]?.start_time}
                      onChangeText={(val) => updateTime(day.id, 'start_time', val)}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                  <Text style={styles.timeDivider}>—</Text>
                  <View style={styles.timeInputWrap}>
                    <Text style={styles.timeLabel}>Kapanış</Text>
                    <TextInput 
                      style={styles.timeInput}
                      value={hours[day.id]?.end_time}
                      onChangeText={(val) => updateTime(day.id, 'end_time', val)}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, paddingBottom: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700' },
  saveTopBtn: { backgroundColor: '#c0392b', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  saveTopText: { color: '#fff', fontWeight: '700' },
  
  content: { padding: 20, paddingTop: 0, gap: 16 },
  hint: { color: '#888', fontSize: 13, marginBottom: 8 },

  dayCard: { backgroundColor: '#151515', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#222' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  toggleText: { color: '#ccc', fontSize: 13 },

  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 },
  timeInputWrap: { flex: 1 },
  timeLabel: { color: '#888', fontSize: 12, marginBottom: 6 },
  timeInput: { backgroundColor: '#222', borderRadius: 8, padding: 12, color: '#fff', fontSize: 16, textAlign: 'center' },
  timeDivider: { color: '#666', fontSize: 20, marginTop: 18 }
});
