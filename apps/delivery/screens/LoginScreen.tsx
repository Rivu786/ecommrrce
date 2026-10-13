import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { driverApi, setToken } from '../lib/api';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'> & {
  onLoggedIn: () => void;
};

export default function LoginScreen({ onLoggedIn }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await driverApi.login(email.trim(), password);
      await setToken(res.accessToken);
      onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>OmniCommerce</Text>
      <Text style={styles.sub}>Driver</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor="#9AA8C0"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        secureTextEntry
        placeholder="Password"
        placeholderTextColor="#9AA8C0"
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.btn} onPress={() => void submit()} disabled={busy}>
        {busy ? <ActivityIndicator color="#1A1405" /> : <Text style={styles.btnText}>Sign in</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  brand: {
    color: '#E8EDF7',
    fontSize: 32,
    fontWeight: '700',
  },
  sub: {
    color: '#C9A227',
    fontSize: 18,
    marginBottom: 16,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#151E32',
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.22)',
    borderRadius: 10,
    color: '#E8EDF7',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  btn: {
    marginTop: 8,
    backgroundColor: '#C9A227',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: {
    color: '#1A1405',
    fontWeight: '700',
  },
  error: {
    color: '#D96B6B',
  },
});
