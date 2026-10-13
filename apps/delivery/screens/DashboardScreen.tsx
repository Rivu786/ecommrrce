import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { driverApi, type DriverJob } from '../lib/api';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen({ navigation }: Props) {
  const [online, setOnline] = useState(false);
  const [jobs, setJobs] = useState<DriverJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await driverApi.jobs();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable onPress={() => navigation.navigate('Earnings')}>
            <Text style={styles.link}>Earnings</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.link}>Profile</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation]);

  async function toggleOnline(next: boolean) {
    setOnline(next);
    setError(null);
    try {
      await driverApi.setOnline(next);
      if (next) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          await driverApi.updateLocation(loc.coords.latitude, loc.coords.longitude);
        }
      }
      await refresh();
    } catch (err) {
      setOnline(!next);
      setError(err instanceof Error ? err.message : 'Could not update status');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.onlineRow}>
        <View>
          <Text style={styles.title}>Available jobs</Text>
          <Text style={styles.muted}>{online ? 'You are online' : 'You are offline'}</Text>
        </View>
        <Switch
          value={online}
          onValueChange={(v) => void toggleOnline(v)}
          trackColor={{ false: '#334155', true: '#9A7A14' }}
          thumbColor={online ? '#C9A227' : '#94A3B8'}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color="#C9A227" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={() => void refresh()}
          contentContainerStyle={{ gap: 10, paddingVertical: 12 }}
          ListEmptyComponent={<Text style={styles.muted}>No jobs right now.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
            >
              <Text style={styles.cardTitle}>
                {item.order?.orderNumber || item.id.slice(0, 8)}
              </Text>
              <Text style={styles.muted}>Status: {item.status || 'AVAILABLE'}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  onlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { color: '#E8EDF7', fontSize: 22, fontWeight: '700' },
  muted: { color: '#9AA8C0', marginTop: 2 },
  link: { color: '#E0C56A', fontWeight: '600' },
  error: { color: '#D96B6B', marginTop: 8 },
  card: {
    backgroundColor: '#151E32',
    borderColor: 'rgba(201,162,39,0.22)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  cardTitle: { color: '#E8EDF7', fontSize: 16, fontWeight: '600' },
});
