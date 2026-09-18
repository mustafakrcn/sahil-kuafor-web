/* ════════════════════════════════════════════════════════════
   Sahil Kuaför — Web Sitesi Randevu Formu v4
   ✅ UTC+3 timezone-aware
   ✅ Duration-aware overlap detection
   ✅ Geçmiş saat engeli
   ✅ Servis değişiminde saat yeniden hesaplama
   ════════════════════════════════════════════════════════════ */

const API_BASE = 'https://admin-omega-eight-42.vercel.app';

const SUPABASE_URL = 'https://xdbsuikweiqarwaxrmwf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkYnN1aWt3ZWlxYXJ3YXhybXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNjYxMTAsImV4cCI6MjEwNDY0MjExMH0.J6-MZ-gYXxO2xAhA8GBs63t1-kEM73RjRyesCMYiotA';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* Hizmet süreleri (dakika) — sunucu ile aynı olmalı */
const DURATION_MAP = {
  'Saç Kesim & Bakım': 45,
  'Sakal Şekillendirme': 30,
  'Saç Boyama': 90,
  'Yüz Maskesi & Bakım': 30,
  'Fön & Şekillendirme': 30,
  'Profesyonel Masaj': 45,
  'Saç + Sakal Kombo': 60,
};

/* Tüm olası saat dilimleri */
const ALL_TIME_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];

/* ──── Form elementleri ──── */
const form = document.getElementById('appointmentForm');
const successBox = document.getElementById('formSuccess');
const submitBtn = document.getElementById('submitBtn');
const dateInput = document.getElementById('date');
const timeSelect = document.getElementById('time');
const serviceSelect = document.getElementById('service');
const timeHint = document.getElementById('timeHint');

/* ──── Min tarih: bugün ──── */
function setMinDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  dateInput.min = `${yyyy}-${mm}-${dd}`;
}
setMinDate();

/* ──── Slot listesini yeniden oluştur ──── */
function rebuildTimeSelect(slots) {
  /* Mevcut seçili değeri koru */
  const prevVal = timeSelect.value;

  /* Tüm seçenekleri temizle, sadece placeholder bırak */
  timeSelect.innerHTML = '<option value="">Saat Seçin</option>';

  if (!slots || slots.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Bu gün için müsait saat yok';
    opt.disabled = true;
    timeSelect.appendChild(opt);
    return;
  }

  slots.forEach(({ slot, available, reason }) => {
    const opt = document.createElement('option');
    opt.value = slot;
    if (available) {
      opt.textContent = slot;
    } else {
      opt.textContent = `${slot} — ${reason}`;
      opt.disabled = true;
      opt.style.color = '#6b7280';
    }
    timeSelect.appendChild(opt);
  });

  /* Önceki seçim hâlâ geçerliyse geri yükle */
  if (prevVal && slots.find(s => s.slot === prevVal && s.available)) {
    timeSelect.value = prevVal;
  }
}

/* ──── Ana slot hesaplama fonksiyonu ────
   UTC+3 awareness: Supabase UTC depoluyor.
   "2024-09-17T11:00:00Z" = Türkiye saati 14:00
   Sorguyu +03:00 offset ile yapıyoruz. */
async function loadAvailableSlots() {
  const selectedDate = dateInput.value;
  const selectedService = serviceSelect.value;

  if (!selectedDate || !selectedService) {
    timeSelect.innerHTML = '<option value="">Önce tarih ve hizmet seçin</option>';
    if (timeHint) timeHint.style.display = 'none';
    return;
  }

  if (timeHint) timeHint.style.display = 'block';

  /* Loading state */
  timeSelect.innerHTML = '<option value="">Saatler yükleniyor...</option>';
  timeSelect.disabled = true;

  const duration = DURATION_MAP[selectedService] || 60;

  try {
    /* UTC+3 ile o güne ait randevuları çek */
    const dayStart = `${selectedDate}T00:00:00+03:00`;
    const dayEnd = `${selectedDate}T23:59:59+03:00`;

    const { data: appts, error } = await supabaseClient
      .from('appointments')
      .select('start_at, end_at, status')
      .gte('start_at', new Date(dayStart).toISOString())
      .lte('start_at', new Date(dayEnd).toISOString())
      .not('status', 'in', '("cancelled","no_show")');

    if (error) {
      console.error('[Slot yükleme hatası]', error);
    }

    const bookedRanges = (appts || []).map(a => ({
      start: new Date(a.start_at),
      end: new Date(a.end_at),
    }));

    /* Şimdiki zaman */
    const now = new Date();

    /* Her slot için müsaitlik kontrol et */
    const slots = ALL_TIME_SLOTS.map(slot => {
      /* Slot başlangıç/bitiş zamanı (UTC+3 offset ile) */
      const slotStart = new Date(`${selectedDate}T${slot}:00+03:00`);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);

      /* Kapanış saati (19:00 Türkiye = işin bitiş saati, son randevu bitiş 20:00) */
      const closeTime = new Date(`${selectedDate}T20:00:00+03:00`);

      /* Geçmiş saat mi? */
      if (slotStart <= now) {
        return { slot, available: false, reason: 'Geçti' };
      }

      /* Hizmet kapanış saatini aşıyor mu? */
      if (slotEnd > closeTime) {
        return { slot, available: false, reason: 'Yetersiz süre' };
      }

      /* Mevcut randevularla çakışma var mı? */
      const hasConflict = bookedRanges.some(({ start, end }) =>
        slotStart < end && slotEnd > start
      );

      if (hasConflict) {
        return { slot, available: false, reason: 'Dolu' };
      }

      return { slot, available: true, reason: '' };
    });

    rebuildTimeSelect(slots);
  } catch (err) {
    console.error('[Slot yükleme hatası]', err);
    timeSelect.innerHTML = '<option value="">Saatler yüklenemedi</option>';
  } finally {
    timeSelect.disabled = false;
  }
}

/* Tarih veya servis değişince saatleri yeniden hesapla */
if (dateInput) {
  dateInput.addEventListener('change', loadAvailableSlots);
}
if (serviceSelect) {
  serviceSelect.addEventListener('change', () => {
    if (dateInput.value) loadAvailableSlots();
  });
}

/* ──── Submit handler ──── */
if (form) {
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    e.stopImmediatePropagation();

    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const date = dateInput.value;
    const time = timeSelect.value;
    const service = serviceSelect.value;
    const notes = document.getElementById('notes').value.trim();

    /* İstemci tarafı validasyon */
    if (!name || !phone || !date || !time || !service) {
      showErr('Lütfen tüm zorunlu alanları doldurun.'); return;
    }
    if (!/^[0-9\s\-\+\(\)]{10,}$/.test(phone)) {
      showErr('Geçerli bir telefon numarası girin (en az 10 rakam).'); return;
    }

    /* Geçmiş saat client kontrolü */
    const selectedDt = new Date(`${date}T${time}:00+03:00`);
    if (selectedDt <= new Date()) {
      showErr('Geçmiş bir tarih/saat için randevu oluşturamazsınız.');
      await loadAvailableSlots();
      return;
    }

    setSubmitLoading('Kontrol ediliyor...');

    /* ── İstemci tarafı overlap kontrolü (son savunma hattı API öncesi) ── */
    try {
      const duration = DURATION_MAP[service] || 60;
      const slotEnd = new Date(selectedDt.getTime() + duration * 60000);

      const { data: conflicting } = await supabaseClient
        .from('appointments')
        .select('id')
        .not('status', 'in', '("cancelled","no_show")')
        .lt('start_at', slotEnd.toISOString())
        .gt('end_at', selectedDt.toISOString())
        .limit(1);

      if (conflicting && conflicting.length > 0) {
        showErr('Seçtiğiniz saat az önce doldu. Lütfen farklı bir saat seçin.');
        resetSubmit();
        await loadAvailableSlots();
        return;
      }
    } catch (err) {
      console.warn('[Overlap kontrol hatası]', err);
    }

    setSubmitLoading('Kaydediliyor...');

    try {
      const res = await fetch(`${API_BASE}/api/web-appointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, date, time, service, notes }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('[Randevu API Hatası]', data);
        /* 409 = çakışma */
        if (res.status === 409) {
          showErr('Bu saat az önce doldu. Sayfadaki saatler güncelleniyor...');
          await loadAvailableSlots();
        } else {
          showErr(data.error || 'Sunucu hatası. Lütfen tekrar deneyin.');
        }
        resetSubmit();
        return;
      }

      console.log('[Randevu] ✅ Oluşturuldu!', data.appointment);

      /* Başarı */
      form.style.display = 'none';
      successBox.style.display = 'block';
      successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      form.reset();

    } catch (err) {
      console.error('[Randevu Hatası]', err);
      showErr('Randevu alınamadı. Lütfen tekrar deneyin veya telefonla arayın.');
      resetSubmit();
    }
  });
}

/* ──── Yardımcı fonksiyonlar ──── */
function setSubmitLoading(text) {
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
}

function resetSubmit() {
  submitBtn.disabled = false;
  submitBtn.innerHTML = '<i class="fas fa-calendar-check"></i> Randevu Oluştur';
}

function showErr(msg) {
  const old = form.querySelector('.form-error-msg');
  if (old) old.remove();
  const el = document.createElement('p');
  el.className = 'form-error-msg';
  el.textContent = msg;
  el.style.cssText = 'color:#e74c3c;font-size:.875rem;padding:.75rem 1rem;background:rgba(231,76,60,.12);border:1px solid rgba(231,76,60,.35);border-radius:8px;text-align:center;margin-bottom:1rem;';
  submitBtn.before(el);
  setTimeout(() => el.remove(), 6000);
}
