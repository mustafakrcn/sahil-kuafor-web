import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Servis rolü keyi sadece server-side kullanılır (RLS bypass ve admin yetkileri için)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, full_name, title, bio } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Email, şifre ve isim zorunludur.' }, { status: 400 });
    }

    // 1. Auth tablosunda yeni kullanıcı oluştur
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Kullanıcı oluşturulamadı' }, { status: 500 });
    }

    const userId = authData.user.id;

    // Bekleme: Trigger'ın profile oluşturması için çok kısa bir süre tanıyoruz (Senkronizasyon gecikmesine karşı)
    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. Profilin rolünü 'staff' yap
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'staff' })
      .eq('id', userId);

    if (profileError) {
      console.error('Profil rolü güncellenemedi:', profileError);
    }

    // 3. Staff tablosuna kaydet
    const { data: staffData, error: staffError } = await supabaseAdmin
      .from('staff')
      .insert({
        profile_id: userId,
        title: title || 'Berber',
        bio: bio || '',
        is_active: true,
      })
      .select()
      .single();

    if (staffError) {
      return NextResponse.json({ error: staffError.message }, { status: 500 });
    }

    // 4. Standart çalışma saatlerini (Pzt-Cmt, 09:00-20:00, Pazar kapalı) oluştur
    const schedules = [];
    for (let day = 0; day <= 6; day++) {
      schedules.push({
        staff_id: staffData.id,
        day_of_week: day,
        start_time: '09:00',
        end_time: '20:00',
        is_off: day === 0, // 0 = Pazar (Pazar kapalı/izinli varsay)
      });
    }
    await supabaseAdmin.from('staff_schedules').insert(schedules);

    return NextResponse.json({ success: true, staff: staffData });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
