'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, api, asList } from '@/lib/api';

type UseApiListResult<T> = {
  rows: T[];
  raw: unknown;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useApiList<T = Record<string, any>>(
  path: string | null,
  map?: (data: unknown) => T[],
): UseApiListResult<T> {
  const [raw, setRaw] = useState<unknown>(null);
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api(path)
      .then((data) => {
        if (cancelled) return;
        setRaw(data);
        setRows(map ? map(data) : asList<T>(data));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : err instanceof Error && err.message ? err.message : 'Failed to load data';
        setError(message);
        setRows([]);
        setRaw(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, tick, map]);

  return { rows, raw, loading, error, reload };
}

export function useApiData<T = unknown>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api<T>(path)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : err instanceof Error && err.message ? err.message : 'Failed to load data');
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  return { data, loading, error, reload };
}
