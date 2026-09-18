import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { usePushNotifications } from '../hooks/usePushNotifications';

export default function RootLayout() {
  const { expoPushToken } = usePushNotifications();
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // ── Session ve Rol yönetimi ──────────────────────────────────
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        setRole(data?.role || 'customer');
      }
      setIsReady(true);
    };
    
    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
          const userRole = data?.role || 'customer';
          setRole(userRole);
          
          if (userRole === 'admin' || userRole === 'owner' || userRole === 'staff') {
             router.replace('/(admin)/');
          } else {
             router.replace('/(tabs)/');
          }
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Push Token Kayıt Efekti
  useEffect(() => {
    if (session?.user && expoPushToken?.data) {
      supabase.from('profiles').update({ push_token: expoPushToken.data }).eq('id', session.user.id).then();
    }
  }, [expoPushToken, session]);

  // Yönlendirme Efekti
  useEffect(() => {
    if (!isReady) return;

    const inAdminGroup = segments[0] === '(admin)';
    const inTabsGroup  = segments[0] === '(tabs)';
    const isAdmin = role === 'admin' || role === 'owner' || role === 'staff';

    if (session && isAdmin && !inAdminGroup) {
      router.replace('/(admin)/');
    } else if (session && !isAdmin && !inTabsGroup && !inAdminGroup) {
      router.replace('/(tabs)/');
    }
  }, [isReady, session, role, segments, router]);

  if (!isReady) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a0a' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        <Stack.Screen
          name="booking"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="admin-booking/[id]"
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack>
    </>
  );
}
