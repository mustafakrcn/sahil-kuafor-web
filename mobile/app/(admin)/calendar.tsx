import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Clock, ChevronRight } from 'lucide-react-native';
import { Agenda, LocaleConfig } from 'react-native-calendars';

// Türkçe Takvim Ayarları
LocaleConfig.locales['tr'] = {
  monthNames: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  monthNamesShort: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
  dayNames: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  dayNamesShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
  today: 'Bugün'
};
LocaleConfig.defaultLocale = 'tr';

export default function AdminCalendarScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('appointments')
      .select('*, customer:profiles!appointments_customer_id_fkey(full_name, phone), service:services(name), staff:staff(profile:profiles(full_name))')
      .order('start_at', { ascending: true }); // Takvimde saat sırasına göre göstermek daha mantıklı

    if (data) {
      // Agenda objesi formatına dönüştür: { '2026-09-18': [{appt1}, {appt2}] }
      const formattedItems: any = {};
      
      data.forEach((appt) => {
        try {
          if (!appt || !appt.start_at) return;
          const parsed = parseISO(appt.start_at);
          // Check if date is valid
          if (isNaN(parsed.getTime())) return;
          
          const dateKey = format(parsed, 'yyyy-MM-dd');
          if (!formattedItems[dateKey]) {
            formattedItems[dateKey] = [];
          }
          formattedItems[dateKey].push(appt);
        } catch (e) {
          console.log('Date parsing error', e);
        }
      });

      setItems(formattedItems);
    }
    setLoading(false);
  };

  const renderItem = (appt: any) => {
    if (!appt) return <View />;
    
    let startStr = 'Bilinmeyen Zaman';
    let statusColor = '#888';
    let statusText = 'Bilinmiyor';

    try {
      if (appt.start_at) {
        const parsed = parseISO(appt.start_at);
        if (!isNaN(parsed.getTime())) {
          startStr = format(parsed, 'HH:mm');
        }
      }
    } catch(e) {}

    if (appt.status === 'pending') { statusColor = '#eab308'; statusText = 'Bekliyor'; }
    if (appt.status === 'confirmed') { statusColor = '#22c55e'; statusText = 'Onaylı'; }
    if (appt.status === 'completed') { statusColor = '#3b82f6'; statusText = 'Tamamlandı'; }
    if (appt.status === 'cancelled') { statusColor = '#ef4444'; statusText = 'İptal'; }

    return (
      <TouchableOpacity 
        style={styles.itemCard} 
        onPress={() => router.push(`/admin-booking/${appt.id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.timeText}>{startStr}</Text>
          <Text style={[styles.statusBadge, { color: statusColor, borderColor: statusColor + '40' }]}>
            {statusText}
          </Text>
        </View>

        <Text style={styles.customerName}>{appt.customer?.full_name || 'İsimsiz'}</Text>
        <Text style={styles.serviceName}>{appt.service?.name}</Text>
        
        {appt.notes && (
          <Text style={styles.notesText} numberOfLines={2}>
            Not: {appt.notes}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyDate = () => {
    return (
      <View style={styles.emptyDate}>
        <Text style={styles.emptyText}>Bu gün için randevu yok</Text>
      </View>
    );
  };

  if (loading && Object.keys(items).length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#c0392b" />
      </View>
    );
  }

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Randevu Takvimi</Text>
      </View>
      
      <Agenda
        items={items}
        loadItemsForMonth={(month) => {
          // Dinamik yükleme şimdilik gerekmiyor, tümünü çekiyoruz
        }}
        selected={today}
        renderItem={renderItem}
        renderEmptyDate={renderEmptyDate}
        rowHasChanged={(r1: any, r2: any) => r1.id !== r2.id}
        showClosingKnob={true}
        theme={{
          backgroundColor: '#0a0a0a',
          calendarBackground: '#111111',
          textSectionTitleColor: '#c0392b',
          selectedDayBackgroundColor: '#c0392b',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#eab308',
          dayTextColor: '#ffffff',
          textDisabledColor: '#333333',
          dotColor: '#c0392b',
          selectedDotColor: '#ffffff',
          arrowColor: '#c0392b',
          monthTextColor: '#ffffff',
          indicatorColor: '#c0392b',
          agendaDayTextColor: '#aaaaaa',
          agendaDayNumColor: '#ffffff',
          agendaTodayColor: '#c0392b',
          agendaKnobColor: '#333333',
        }}
        style={{ flex: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0a0a0a' 
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  title: { 
    color: '#fff', 
    fontSize: 22, 
    fontWeight: 'bold' 
  },
  itemCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginRight: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    color: '#c0392b',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderRadius: 10,
  },
  customerName: { 
    color: '#ffffff', 
    fontSize: 16, 
    fontWeight: 'bold',
    marginBottom: 4,
  },
  serviceName: { 
    color: '#aaaaaa', 
    fontSize: 14 
  },
  notesText: {
    color: '#888888',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 8,
  },
  emptyDate: {
    height: 100,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30,
  },
  emptyText: {
    color: '#555555',
    fontStyle: 'italic',
  }
});
