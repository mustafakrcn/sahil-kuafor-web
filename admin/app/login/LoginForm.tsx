'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '../../lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Başarılı giriş sonrası yönlendirme (Next.js router cache'ini temizle)
      router.refresh();
      router.push('/dashboard');
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}
      
      <div>
        <label className="block text-sm text-gray-400 mb-1">E-posta</label>
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" 
          placeholder="admin@example.com" 
        />
      </div>
      
      <div>
        <label className="block text-sm text-gray-400 mb-1">Şifre</label>
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" 
          placeholder="••••••••" 
        />
      </div>
      
      <button 
        type="submit" 
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600 text-white font-bold py-2.5 px-4 rounded-lg transition-colors mt-2"
      >
        {loading && <Loader2 size={18} className="animate-spin" />}
        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
      </button>
    </form>
  );
}
