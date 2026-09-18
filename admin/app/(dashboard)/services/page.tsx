'use client';

import { useState, useEffect, useCallback } from 'react';
import { createSupabaseClient } from '../../../lib/supabase/client';
import { Plus, Edit2, Trash2, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

// Supabase client bileşen dışında bir kez oluşturuluyor — her render'da yeni instance sorununu önler
const supabase = createSupabaseClient();

type Service = {
  id: string;
  name: string;
  description: string;
  duration_min: number;
  price: number;
  price_with_vat: number;
  is_active: boolean;
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_min: '30',
    price: '',
    is_active: true,
  });

  const fetchServices = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('services').select('*').order('sort_order', { ascending: true });
    if (!error && data) setServices(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description || '',
        duration_min: service.duration_min.toString(),
        price: service.price.toString(),
        is_active: service.is_active,
      });
    } else {
      setEditingService(null);
      setFormData({ name: '', description: '', duration_min: '30', price: '', is_active: true });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceVal = parseFloat(formData.price);
    const payload = {
      name: formData.name,
      description: formData.description,
      duration_min: parseInt(formData.duration_min),
      price: priceVal,
      // KDV %20 otomatik hesapla — DB trigger yoksa frontend hesaplar
      price_with_vat: parseFloat((priceVal * 1.2).toFixed(2)),
      is_active: formData.is_active,
    };

    if (editingService) {
      await supabase.from('services').update(payload).eq('id', editingService.id);
    } else {
      await supabase.from('services').insert(payload);
    }

    setIsModalOpen(false);
    fetchServices();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await supabase.from('services').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    fetchServices();
  };

  const vatPreview = formData.price ? (parseFloat(formData.price) * 1.2).toFixed(2) : '—';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Hizmetler</h1>
          <p className="text-gray-400 mt-1">Müşterilerinize sunduğunuz hizmetleri ve fiyatları yönetin.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition"
        >
          <Plus size={18} /> Yeni Ekle
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="animate-spin text-red-500" size={32} />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-950/50 border-b border-gray-800">
                <th className="p-4 text-sm font-semibold text-gray-400">HİZMET ADI</th>
                <th className="p-4 text-sm font-semibold text-gray-400">SÜRE (DK)</th>
                <th className="p-4 text-sm font-semibold text-gray-400">FİYAT (KDV HARİÇ)</th>
                <th className="p-4 text-sm font-semibold text-gray-400">FİYAT (KDV DAHİL)</th>
                <th className="p-4 text-sm font-semibold text-gray-400">DURUM</th>
                <th className="p-4 text-sm font-semibold text-gray-400 text-right">İŞLEMLER</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                  <td className="p-4">
                    <div className="font-medium text-white">{service.name}</div>
                    <div className="text-xs text-gray-500 mt-1 line-clamp-1">{service.description}</div>
                  </td>
                  <td className="p-4 text-gray-300">{service.duration_min} dk</td>
                  <td className="p-4 text-gray-300">₺{service.price}</td>
                  <td className="p-4 text-white font-medium">₺{service.price_with_vat}</td>
                  <td className="p-4">
                    {service.is_active ? (
                      <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                        <CheckCircle size={14} /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
                        <XCircle size={14} /> Pasif
                      </span>
                    )}
                  </td>
                  <td className="p-4 flex items-center justify-end gap-2">
                    <button onClick={() => handleOpenModal(service)} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => setDeleteTarget(service)} className="p-2 text-red-400 hover:text-red-300 bg-red-950/30 rounded-lg hover:bg-red-900/50 transition">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">Henüz hiçbir hizmet eklenmemiş.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* DÜZENLEME / EKLEME MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl w-full max-w-lg border border-gray-700 overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">{editingService ? 'Hizmeti Düzenle' : 'Yeni Hizmet Ekle'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition"><XCircle size={24} /></button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Hizmet Adı</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-red-500 outline-none"
                  placeholder="Örn: Saç Kesimi"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-red-500 outline-none min-h-[80px]"
                  placeholder="Hizmet detayları..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Süre (Dakika)</label>
                  <select
                    value={formData.duration_min}
                    onChange={e => setFormData({ ...formData, duration_min: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white outline-none"
                  >
                    <option value="15">15 Dk</option>
                    <option value="30">30 Dk</option>
                    <option value="45">45 Dk</option>
                    <option value="60">60 Dk</option>
                    <option value="90">90 Dk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Fiyat (₺ KDV Hariç)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-red-500 outline-none"
                    placeholder="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">KDV (%20) dahil fiyat: <span className="text-green-400 font-medium">₺{vatPreview}</span></p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 accent-red-600 rounded"
                />
                <label htmlFor="isActive" className="text-sm text-gray-300">Bu hizmet müşterilere gösterilsin (Aktif)</label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-800 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-800 text-white py-2.5 rounded-lg font-medium hover:bg-gray-700 transition">İptal</button>
                <button type="submit" className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 transition">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SİLME ONAY MODAL — native confirm() yerine */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl w-full max-w-sm border border-gray-700 shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-white font-bold">Hizmeti Sil</h3>
                <p className="text-gray-400 text-sm mt-0.5">Bu işlem geri alınamaz.</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-6">
              <span className="font-semibold text-white">"{deleteTarget.name}"</span> hizmetini kalıcı olarak silmek istediğinize emin misiniz?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 bg-gray-800 text-white py-2.5 rounded-lg font-medium hover:bg-gray-700 transition">İptal</button>
              <button onClick={handleDeleteConfirm} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 transition">Evet, Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
