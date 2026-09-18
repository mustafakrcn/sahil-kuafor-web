'use client';

import { useState, useEffect, useCallback } from 'react';
import { createSupabaseClient } from '../../../lib/supabase/client';
import { Users, Phone, Calendar, Search, ChevronDown, ChevronUp, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

type Customer = {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
  appointment_count: number;
};

type Appointment = {
  id: string;
  start_at: string;
  status: string;
  service: { name: string } | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Bekliyor',   color: 'text-yellow-400' },
  confirmed: { label: 'Onaylı',     color: 'text-green-400'  },
  completed: { label: 'Tamamlandı', color: 'text-blue-400'   },
  cancelled: { label: 'İptal',      color: 'text-red-400'    },
  no_show:   { label: 'Gelmedi',    color: 'text-gray-500'   },
};

export default function CustomersPage() {
  const supabase = createSupabaseClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailAppts, setDetailAppts] = useState<Appointment[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);

    // Müşterileri al + randevu sayısını count et
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, created_at')
      .eq('role', 'customer')
      .order('created_at', { ascending: false });

    if (error || !data) { setLoading(false); return; }

    // Her müşteri için randevu sayısı
    const enriched = await Promise.all(
      data.map(async (c) => {
        const { count } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', c.id);
        return { ...c, appointment_count: count ?? 0 };
      })
    );

    setCustomers(enriched);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const toggleExpand = async (customerId: string) => {
    if (expandedId === customerId) {
      setExpandedId(null);
      setDetailAppts([]);
      return;
    }

    setExpandedId(customerId);
    setDetailLoading(true);

    const { data } = await supabase
      .from('appointments')
      .select('id, start_at, status, service:services(name)')
      .eq('customer_id', customerId)
      .order('start_at', { ascending: false })
      .limit(10);

    setDetailAppts((data as any) ?? []);
    setDetailLoading(false);
  };

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  });

  return (
    <div>
      {/* Başlık */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users size={24} className="text-purple-400" /> Müşteriler
          </h1>
          <p className="text-gray-400 mt-1">
            {loading ? '...' : `${customers.length} kayıtlı müşteri`}
          </p>
        </div>
      </div>

      {/* Arama */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="İsim veya telefon ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-10 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Liste */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            {search ? 'Arama sonucu bulunamadı.' : 'Henüz kayıtlı müşteri yok.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filtered.map((customer) => {
              const isExpanded = expandedId === customer.id;
              return (
                <div key={customer.id}>
                  {/* Müşteri Satırı */}
                  <div
                    className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-800/40 transition"
                    onClick={() => toggleExpand(customer.id)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-purple-500/15 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-400 text-sm font-bold">
                          {customer.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{customer.full_name || 'İsimsiz'}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {customer.phone && (
                            <span className="text-gray-400 text-xs flex items-center gap-1">
                              <Phone size={10} /> {customer.phone}
                            </span>
                          )}
                          <span className="text-gray-500 text-xs flex items-center gap-1">
                            <Calendar size={10} />
                            {customer.appointment_count} randevu
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600 text-xs hidden sm:block">
                        {customer.created_at
                          ? format(parseISO(customer.created_at), 'd MMM yyyy', { locale: tr })
                          : '—'}
                      </span>
                      {isExpanded
                        ? <ChevronUp size={16} className="text-gray-400" />
                        : <ChevronDown size={16} className="text-gray-500" />
                      }
                    </div>
                  </div>

                  {/* Genişletilmiş Randevu Detayı */}
                  {isExpanded && (
                    <div className="bg-gray-950/60 border-t border-gray-800/50 px-5 py-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Son Randevular
                      </p>
                      {detailLoading ? (
                        <p className="text-gray-600 text-sm">Yükleniyor...</p>
                      ) : detailAppts.length === 0 ? (
                        <p className="text-gray-600 text-sm">Randevu kaydı yok.</p>
                      ) : (
                        <div className="space-y-2">
                          {detailAppts.map((appt) => {
                            const sc = STATUS_LABELS[appt.status] ?? STATUS_LABELS.pending;
                            return (
                              <div key={appt.id} className="flex items-center justify-between text-sm">
                                <div>
                                  <span className="text-white">{(appt.service as any)?.name ?? '—'}</span>
                                  <span className="text-gray-500 ml-2 text-xs">
                                    {appt.start_at
                                      ? format(parseISO(appt.start_at), 'd MMM yyyy, HH:mm', { locale: tr })
                                      : '—'}
                                  </span>
                                </div>
                                <span className={`text-xs font-medium ${sc.color}`}>{sc.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
