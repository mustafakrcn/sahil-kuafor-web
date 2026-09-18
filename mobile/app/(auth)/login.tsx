import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen e-posta ve şifrenizi girin.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      Alert.alert('Giriş Başarısız', error.message);
    }
    // _layout.tsx içindeki auth listener otomatik olarak yönlendirme yapacak
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Giriş Yap</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>E-posta</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="E-posta adresiniz"
          placeholderTextColor="#666"
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Şifre</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Şifreniz"
          placeholderTextColor="#666"
          secureTextEntry
        />
      </View>

      <TouchableOpacity 
        style={styles.loginBtn} 
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginBtnText}>Giriş Yap</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.guestBtn} 
        onPress={() => router.replace('/(tabs)/')}
      >
        <Text style={styles.guestBtnText}>Giriş Yapmadan Devam Et</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 40, textAlign: 'center' },
  inputContainer: { marginBottom: 20 },
  label: { color: '#aaa', marginBottom: 8, fontSize: 14 },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16
  },
  loginBtn: {
    backgroundColor: '#c0392b',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  guestBtn: {
    padding: 16,
    alignItems: 'center',
    marginTop: 12
  },
  guestBtnText: {
    color: '#aaa',
    fontSize: 16,
    textDecorationLine: 'underline'
  }
});
