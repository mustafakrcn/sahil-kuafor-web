import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/* Service Role key ile bağlan — RLS'i tamamen bypass eder. */
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const isRealServiceKey = serviceKey && !serviceKey.startsWith('dummy');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  isRealServiceKey ? serviceKey! : anonKey,
  isRealServiceKey
    ? { auth: { autoRefreshToken: false, persistSession: false } }
    : {}
);

/* CORS: Public randevu API'si tüm origin'lerden erişilebilir olmalı.
   ALLOWED_ORIGIN env ile kısıtlanabilir, yoksa * (herkese açık) */
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/* ────────────────────────────────────────────────────────────
   POST /api/web-appointment
   Web sitesinden (anonim) randevu kaydı.
   RLS engelini Service Role ile aşar.
──────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, date, time, service, notes } = body;

    /* 1. Validasyon */
    if (!name || !phone || !date || !time || !service) {
      return NextResponse.json(
        { error: 'Zorunlu alanlar eksik: name, phone, date, time, service' },
        { status: 400, headers: corsHeaders }
      );
    }

    /* 2. ✅ TIMEZONE-AWARE tarih/saat hesabı
       Vercel UTC'de çalışır — kullanıcı "14:00" seçtiğinde bu Türkiye yerel saatidir (UTC+3).
       "+03:00" suffix ile parse edince ISO string doğru UTC değerine dönüşür.
       Örn: "2024-09-17T14:00:00+03:00" → "2024-09-17T11:00:00.000Z" (doğru UTC) */
    const startAt = new Date(`${date}T${time}:00+03:00`);
    if (isNaN(startAt.getTime())) {
      return NextResponse.json({ error: 'Geçersiz tarih/saat formatı' }, { status: 400, headers: corsHeaders });
    }

    /* 2a. Geçmiş tarih/saat kontrolü */
    const nowUtc = new Date();
    if (startAt <= nowUtc) {
      return NextResponse.json(
        { error: 'Geçmiş bir tarih/saat için randevu oluşturamazsınız.' },
        { status: 400, headers: corsHeaders }
      );
    }

    /* 2b. İş saatleri kontrolü (Türkiye saati 09:00 - 19:00) */
    const hour = parseInt(time.split(':')[0], 10);
    if (hour < 9 || hour >= 19) {
      return NextResponse.json(
        { error: 'Randevu saati 09:00–19:00 arasında olmalıdır.' },
        { status: 400, headers: corsHeaders }
      );
    }

    /* 2c. Hizmet süresi ve bitiş saati */
    const durationMap: Record<string, number> = {
      'Saç Kesim & Bakım':    45,
      'Sakal Şekillendirme':  30,
      'Saç Boyama':           90,
      'Yüz Maskesi & Bakım':  30,
      'Fön & Şekillendirme':  30,
      'Profesyonel Masaj':    45,
      'Saç + Sakal Kombo':    60,
    };
    const durationMin = durationMap[service] ?? 60;
    const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);

    /* 2d. Bitiş saati 20:00'ı geçiyor mu? */
    const closeTime = new Date(`${date}T20:00:00+03:00`);
    if (endAt > closeTime) {
      return NextResponse.json(
        { error: `Bu saatte "${service}" hizmeti (${durationMin} dk) iş saatleri dışına taşmaktadır. Lütfen daha erken bir saat seçin.` },
        { status: 400, headers: corsHeaders }
      );
    }

    /* 3. ✅ SERVER-SIDE OVERLAP KONTROLÜ — Çifte rezervasyon önleme
       Sadece exact match değil, süre çakışması da kontrol ediliyor:
       mevcut.start_at < yeni.end_at  AND  mevcut.end_at > yeni.start_at → çakışma */
    const { data: conflicting } = await supabaseAdmin
      .from('appointments')
      .select('id, start_at, end_at')
      .not('status', 'in', '("cancelled","no_show")')
      .lt('start_at', endAt.toISOString())
      .gt('end_at', startAt.toISOString())
      .limit(1);

    if (conflicting && conflicting.length > 0) {
      return NextResponse.json(
        { error: 'Bu saat dilimi zaten dolu. Lütfen farklı bir saat seçin.' },
        { status: 409, headers: corsHeaders }
      );
    }

    /* 4. Müşteri profilini bul veya oluştur (Service Role ile) */
    let customerId: string | null = null;

    const { data: existingProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .limit(1);

    if (existingProfiles && existingProfiles.length > 0) {
      customerId = existingProfiles[0].id;
    } else {
      const newId = crypto.randomUUID();
      const { data: newProfile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: newId,
          full_name: name,
          phone: phone,
          role: 'customer',
        })
        .select('id')
        .single();

      if (profileErr) {
        console.error('[web-appointment] Profil hatası:', profileErr);
        return NextResponse.json({ error: 'Profil oluşturulamadı: ' + profileErr.message }, { status: 500, headers: corsHeaders });
      }
      customerId = newProfile.id;
    }

    /* 5. Service ID'yi bul */
    let serviceId: string | null = null;
    const { data: svcRow } = await supabaseAdmin
      .from('services')
      .select('id')
      .ilike('name', service)
      .limit(1)
      .maybeSingle();
    if (svcRow) serviceId = svcRow.id;

    /* 6. Randevuyu kaydet */
    const apptId = crypto.randomUUID();
    const apptPayload: Record<string, unknown> = {
      id: apptId,
      customer_id: customerId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: 'pending',
      notes: `[WEB] ${service} | ${name} | ${phone}${notes ? ' | ' + notes : ''}`,
    };
    if (serviceId) apptPayload.service_id = serviceId;

    const { error: apptErr } = await supabaseAdmin
      .from('appointments')
      .insert(apptPayload);

    if (apptErr) {
      console.error('[web-appointment] Randevu hatası:', apptErr);
      // Unique constraint ihlali (23P01 / 23505)
      if (apptErr.code === '23P01' || apptErr.code === '23505') {
        return NextResponse.json(
          { error: 'Bu saat dilimi zaten dolu. Lütfen farklı bir saat seçin.' },
          { status: 409, headers: corsHeaders }
        );
      }
      return NextResponse.json({ error: apptErr.message }, { status: 500, headers: corsHeaders });
    }

    console.log('[web-appointment] ✅ Randevu oluşturuldu:', apptId, '| UTC:', startAt.toISOString());

    /* 7. Adminlere Push Bildirimi Gönder (Expo Push API) */
    try {
      const { data: admins } = await supabaseAdmin
        .from('profiles')
        .select('push_token')
        .in('role', ['admin', 'owner', 'staff'])
        .not('push_token', 'is', null);

      if (admins && admins.length > 0) {
        const messages = admins.map(admin => ({
          to: admin.push_token,
          sound: 'default',
          title: '💈 Yeni Randevu Talebi!',
          body: `${name} — ${service}${phone ? '\n📞 ' + phone : ''}`,
          data: { appointmentId: apptId },
          channelId: 'appointments',
        }));

        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        });
        console.log(`[web-appointment] ✅ ${admins.length} admine Push Bildirimi gönderildi.`);
      }
    } catch (pushErr) {
      console.error('[web-appointment] Push bildirim hatası:', pushErr);
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: apptId,
        status: 'pending',
        start_at: startAt.toISOString(),
      },
    }, { headers: corsHeaders });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
    console.error('[web-appointment] Hata:', message);
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}
