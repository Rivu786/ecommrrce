import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { setToken } from '../lib/api';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  async function signOut() {
    await setToken(null);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver profile</Text>
      <Text style={styles.muted}>
        Authenticated against the OmniCommerce API with tenant header and bearer token.
      </Text>
      <Pressable style={styles.btn} onPress={() => void signOut()}>
        <Text style={styles.btnText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { color: '#E8EDF7', fontSize: 24, fontWeight: '700' },
  muted: { color: '#9AA8C0', lineHeight: 22 },
  btn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.35)',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#E0C56A', fontWeight: '700' },
});
