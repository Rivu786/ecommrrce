import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { driverApi, type EarningsSummary } from '../lib/api';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Earnings'>;

export default function EarningsScreen(_props: Props) {
  const [data, setData] = useState<EarningsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setData(await driverApi.earnings());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load earnings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#C9A227" />
      </View>
    );
  }

  const total = data?.total ?? 0;
  const currency = data?.currencyCode || 'INR';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Earnings</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.card}>
        <Text style={styles.label}>Total</Text>
        <Text style={styles.amount}>
          {currency} {Number(total).toFixed(2)}
        </Text>
        <Text style={styles.muted}>Jobs completed: {data?.jobsCompleted ?? '—'}</Text>
      </View>
      {(data?.items || []).map((item) => (
        <View key={item.id} style={styles.row}>
          <Text style={styles.rowText}>{item.id.slice(0, 8)}</Text>
          <Text style={styles.rowText}>{Number(item.amount).toFixed(2)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#E8EDF7', fontSize: 24, fontWeight: '700' },
  error: { color: '#D96B6B' },
  card: {
    backgroundColor: '#151E32',
    borderColor: 'rgba(201,162,39,0.22)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  label: { color: '#9AA8C0' },
  amount: { color: '#E0C56A', fontSize: 32, fontWeight: '700' },
  muted: { color: '#9AA8C0', marginTop: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(154,168,192,0.12)',
  },
  rowText: { color: '#E8EDF7' },
});
