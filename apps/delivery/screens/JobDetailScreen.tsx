import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { driverApi, type DriverJob } from '../lib/api';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'JobDetail'>;

const NEXT: Record<string, 'ARRIVED' | 'PICKED_UP' | 'DELIVERED' | null> = {
  ASSIGNED: 'ARRIVED',
  ACCEPTED: 'ARRIVED',
  ARRIVED: 'PICKED_UP',
  PICKED_UP: 'DELIVERED',
  DELIVERED: null,
};

export default function JobDetailScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const [job, setJob] = useState<DriverJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const jobs = await driverApi.jobs();
      const found = (Array.isArray(jobs) ? jobs : []).find((j) => j.id === jobId) || null;
      setJob(found);
      if (!found) setError('Job not found in current feed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job');
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      await driverApi.accept(jobId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Accept failed');
    } finally {
      setBusy(false);
    }
  }

  async function advance(status: 'ARRIVED' | 'PICKED_UP' | 'DELIVERED') {
    setBusy(true);
    setError(null);
    try {
      await driverApi.advance(jobId, status);
      await load();
      if (status === 'DELIVERED') navigation.navigate('Dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  if (!job && !error) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#C9A227" />
      </View>
    );
  }

  const status = (job?.status || 'AVAILABLE').toUpperCase();
  const next = NEXT[status];
  const address = job?.order?.shippingAddressJson;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{job?.order?.orderNumber || jobId}</Text>
      <Text style={styles.muted}>Status: {status}</Text>
      {address ? (
        <Text style={styles.body}>
          {typeof address.line1 === 'string' ? address.line1 : JSON.stringify(address)}
        </Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        {(status === 'AVAILABLE' || status === 'PENDING' || status === 'OPEN') && (
          <Pressable style={styles.btn} disabled={busy} onPress={() => void accept()}>
            <Text style={styles.btnText}>{busy ? '…' : 'Accept'}</Text>
          </Pressable>
        )}
        {next && (
          <Pressable style={styles.btn} disabled={busy} onPress={() => void advance(next)}>
            <Text style={styles.btnText}>
              {busy ? '…' : next === 'ARRIVED' ? 'Arrived' : next === 'PICKED_UP' ? 'Picked up' : 'Delivered'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#E8EDF7', fontSize: 24, fontWeight: '700' },
  muted: { color: '#9AA8C0' },
  body: { color: '#E8EDF7', marginTop: 8, lineHeight: 22 },
  error: { color: '#D96B6B' },
  actions: { marginTop: 16, gap: 10 },
  btn: {
    backgroundColor: '#C9A227',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#1A1405', fontWeight: '700' },
});
