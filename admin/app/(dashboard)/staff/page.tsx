'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '../../../lib/supabase/client';
import { Plus, Edit2, Trash2, Loader2, CheckCircle, XCircle, User } from 'lucide-react';

type Staff = {
  id: string;
  profile_id: string;
  title: string;
  bio: string;
  is_active: boolean;
  profile: {
    full_name: string;
    email?: string;
  };
};

export default function StaffPage() {
  const supabase = createSupabaseClient();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    title: '',
    bio: '',
  });

  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('staff')
      .select('*, profile:profiles(full_name)')
      .order('sort_order', { ascending: true });
      
    if (!error && data) {
      setStaffList(data as unknown as Staff[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, [supabase]);

  const handleOpenModal = () => {
    setFormData({ email: '', password: '', full_name: '', title: '', bio: '' });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Personel eklenirken hata oluştu');
      }

      setIsModalOpen(false);
      fetchStaff();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, profile_id: string) => {
    if (confirm('Bu personeli silmek istediğinize emin misiniz? (Bağlı randevular kalıcı olarak etkilenebilir)')) {
      // Şimdilik sadece is_active false yapıyoruz soft-delete mantığıyla
      await supabase.from('staff').update({ is_active: false }).eq('id', id);
      fetchStaff();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Personel Yönetimi</h1>
          <p className="text-gray-400 mt-1">Berberlerinizi ve uzmanlık alanlarını yönetin.</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition"
        >
          <Plus size={18} /> Yeni Personel
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
                <th className="p-4 text-sm font-semibold text-gray-400">PERSONEL</th>
                <th className="p-4 text-sm font-semibold text-gray-400">UNVAN</th>
                <th className="p-4 text-sm font-semibold text-gray-400">BİOGRAFİ</th>
                <th className="p-4 text-sm font-semibold text-gray-400">DURUM</th>
                <th className="p-4 text-sm font-semibold text-gray-400 text-right">İŞLEMLER</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => (
                <tr key={staff.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 border border-gray-700">
                      <User size={20} />
                    </div>
                    <div className="font-medium text-white">{staff.profile?.full_name || 'İsimsiz'}</div>
                  </td>
                  <td className="p-4 text-gray-300">{staff.title}</td>
                  <td className="p-4 text-gray-400 text-sm max-w-xs truncate">{staff.bio || '-'}</td>
                  <td className="p-4">
                    {staff.is_active ? (
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
                    <button onClick={() => handleDelete(staff.id, staff.profile_id)} className="p-2 text-red-400 hover:text-red-300 bg-red-950/30 rounded-lg hover:bg-red-900/50 transition">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {staffList.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">Henüz hiçbir personel eklenmemiş.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl w-full max-w-lg border border-gray-700 overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Yeni Personel Ekle</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><XCircle size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg mb-4">
                  {errorMsg}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Ad Soyad</label>
                  <input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-red-500 outline-none" placeholder="Örn: Ahmet Yılmaz" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Unvan</label>
                  <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-red-500 outline-none" placeholder="Örn: Baş Berber" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Giriş E-postası</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-red-500 outline-none" placeholder="ahmet@sahilkuafor.com" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Giriş Şifresi</label>
                  <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-red-500 outline-none" placeholder="••••••••" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Kısa Biyografi (Opsiyonel)</label>
                <textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-red-500 outline-none min-h-[80px]" placeholder="Kendinizden veya uzmanlık alanlarınızdan bahsedin..." />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-800 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-800 text-white py-2.5 rounded-lg font-medium hover:bg-gray-700 transition">İptal</button>
                <button type="submit" disabled={submitting} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 transition flex items-center justify-center gap-2">
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {submitting ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
