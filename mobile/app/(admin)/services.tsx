import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, RefreshControl,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Settings, X, Save, Plus, Trash2, Eye, EyeOff } from 'lucide-react-native';

type Service = {
  id: string;
  name: string;
  description: string;
  duration_min: number;
  price_with_vat: number;
  is_active: boolean;
  sort_order: number;
};

const EMPTY_FORM = {
  name: '',
  description: '',
  price_with_vat: '',
  duration_min: '30',
};

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { fetchServices(); }, []);

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .order('sort_order');
    setServices(data || []);
    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchServices();
  };

  // ─── Yeni hizmet veya düzenleme modalını aç
  const openNew = () => {
    setEditingService(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (svc: Service) => {
    setEditingService(svc);
    setForm({
      name: svc.name,
      description: svc.description || '',
      price_with_vat: svc.price_with_vat.toString(),
      duration_min: svc.duration_min.toString(),
    });
    setModalVisible(true);
  };

  // ─── Kaydet (ekle veya güncelle)
  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Hata', 'Hizmet adı zorunludur.'); return;
    }
    if (!form.price_with_vat || isNaN(parseFloat(form.price_with_vat))) {
      Alert.alert('Hata', 'Geçerli bir fiyat giriniz.'); return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price_with_vat: parseFloat(form.price_with_vat),
      duration_min: parseInt(form.duration_min) || 30,
    };

    if (editingService) {
      const { error } = await supabase
        .from('services')
        .update(payload)
        .eq('id', editingService.id);
      if (error) { Alert.alert('Hata', 'Güncellenemedi: ' + error.message); }
    } else {
      // Yeni hizmet — sort_order olarak en yüksek + 1 ata
      const maxOrder = services.reduce((m, s) => Math.max(m, s.sort_order), 0);
      const { error } = await supabase
        .from('services')
        .insert({ ...payload, is_active: true, sort_order: maxOrder + 1 });
      if (error) { Alert.alert('Hata', 'Eklenemedi: ' + error.message); }
    }

    setSaving(false);
    setModalVisible(false);
    fetchServices();
  };

  // ─── Sil
  const handleDelete = (svc: Service) => {
    Alert.alert(
      'Hizmeti Sil',
      `"${svc.name}" hizmetini silmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('services').delete().eq('id', svc.id);
            if (error) { Alert.alert('Hata', 'Silinemedi.'); }
            else { fetchServices(); }
          },
        },
      ]
    );
  };

  // ─── Aktif/Pasif toggle
  const toggleStatus = async (svc: Service) => {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !svc.is_active })
      .eq('id', svc.id);
    if (error) { Alert.alert('Hata', 'Durum güncellenemedi.'); }
    else { fetchServices(); }
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
      {/* Üst başlık + Ekle butonu */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>{services.length} Hizmet</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew} activeOpacity={0.8}>
          <Plus color="#fff" size={20} />
          <Text style={styles.addBtnText}>Yeni Ekle</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#c0392b" />}
      >
        {services.map((svc) => (
          <View key={svc.id} style={[styles.card, !svc.is_active && styles.cardInactive]}>
            {/* Üst satır: İsim + durum */}
            <View style={styles.cardRow}>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, !svc.is_active && { color: '#666' }]}>{svc.name}</Text>
                {!!svc.description && (
                  <Text style={styles.cardDesc} numberOfLines={2}>{svc.description}</Text>
                )}
                <Text style={styles.cardMeta}>{svc.duration_min} dk • ₺{svc.price_with_vat}</Text>
              </View>

              {/* Sağ aksiyonlar */}
              <View style={styles.cardActions}>
                {/* Aktif/Pasif */}
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: svc.is_active ? '#22c55e18' : '#3f3f46' }]}
                  onPress={() => toggleStatus(svc)}
                >
                  {svc.is_active
                    ? <Eye color="#22c55e" size={18} />
                    : <EyeOff color="#666" size={18} />
                  }
                </TouchableOpacity>

                {/* Düzenle */}
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: '#3b82f618' }]}
                  onPress={() => openEdit(svc)}
                >
                  <Settings color="#3b82f6" size={18} />
                </TouchableOpacity>

                {/* Sil */}
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: '#ef444418' }]}
                  onPress={() => handleDelete(svc)}
                >
                  <Trash2 color="#ef4444" size={18} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Durum etiketi */}
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: svc.is_active ? '#22c55e' : '#555' }]} />
              <Text style={[styles.statusLabel, { color: svc.is_active ? '#22c55e' : '#666' }]}>
                {svc.is_active ? 'Aktif' : 'Pasif'}
              </Text>
            </View>
          </View>
        ))}

        {services.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Henüz hizmet eklenmemiş.</Text>
            <TouchableOpacity style={styles.addBtn} onPress={openNew}>
              <Plus color="#fff" size={18} />
              <Text style={styles.addBtnText}>İlk Hizmeti Ekle</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ─── Ekle / Düzenle Modalı ─── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            {/* Modal başlık */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingService ? 'Hizmeti Düzenle' : 'Yeni Hizmet Ekle'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              {/* Hizmet Adı */}
              <Text style={styles.label}>Hizmet Adı *</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                placeholder="Örn: Saç Kesimi"
                placeholderTextColor="#555"
                autoFocus
              />

              {/* Açıklama */}
              <Text style={styles.label}>Açıklama</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={form.description}
                onChangeText={(v) => setForm({ ...form, description: v })}
                placeholder="Hizmet detayları..."
                placeholderTextColor="#555"
                multiline
                numberOfLines={3}
              />

              {/* Fiyat + Süre */}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Fiyat (₺ KDV dahil) *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.price_with_vat}
                    onChangeText={(v) => setForm({ ...form, price_with_vat: v })}
                    keyboardType="numeric"
                    placeholder="150"
                    placeholderTextColor="#555"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Süre (Dakika)</Text>
                  <View style={styles.durationRow}>
                    {['15', '30', '45', '60', '90'].map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.durationChip,
                          form.duration_min === d && styles.durationChipActive,
                        ]}
                        onPress={() => setForm({ ...form, duration_min: d })}
                      >
                        <Text style={[
                          styles.durationChipText,
                          form.duration_min === d && styles.durationChipTextActive,
                        ]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Kaydet */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Save color="#fff" size={20} />
                }
                <Text style={styles.saveBtnText}>
                  {saving ? 'Kaydediliyor...' : (editingService ? 'Güncelle' : 'Ekle')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  topBarTitle: { color: '#888', fontSize: 14 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#c0392b', paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  list: { flex: 1 },

  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardInactive: { opacity: 0.55 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: 12 },
  cardName: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardDesc: { color: '#888', fontSize: 13, lineHeight: 18, marginBottom: 6 },
  cardMeta: { color: '#c0392b', fontSize: 13, fontWeight: '600' },

  cardActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 20 },
  emptyText: { color: '#555', fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  label: { color: '#aaa', fontSize: 13, marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: '#1a1a1a', color: '#fff',
    borderRadius: 12, padding: 14, fontSize: 15,
    borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 16,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },

  row: { flexDirection: 'row' },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  durationChip: {
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333',
  },
  durationChipActive: { backgroundColor: '#c0392b', borderColor: '#c0392b' },
  durationChipText: { color: '#888', fontSize: 13, fontWeight: '600' },
  durationChipTextActive: { color: '#fff' },

  saveBtn: {
    backgroundColor: '#c0392b',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 16, borderRadius: 12, marginTop: 8, marginBottom: 16,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
