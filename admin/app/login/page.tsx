import { createSupabaseServer } from '../../lib/supabase/server';
import { redirect } from 'next/navigation';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
      <div className="bg-gray-900 p-8 rounded-xl border border-gray-800 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Admin Girişi</h1>
        <p className="text-gray-400 text-center mb-6 text-sm">
          Lütfen Supabase projenizden admin yetkisine sahip bir kullanıcı oluşturun ve giriş yapın.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
