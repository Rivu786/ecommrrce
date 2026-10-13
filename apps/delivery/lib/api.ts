import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const TENANT_ID = process.env.EXPO_PUBLIC_TENANT_ID || 'demo';

const TOKEN_KEY = 'omni_driver_token';

export type DriverJob = {
  id: string;
  status?: string;
  order?: {
    orderNumber?: string;
    shippingAddressJson?: Record<string, unknown>;
    grandTotal?: number | string;
  };
  payoutAmount?: number | string;
  createdAt?: string;
};

export type EarningsSummary = {
  total?: number;
  currencyCode?: string;
  jobsCompleted?: number;
  items?: Array<{ id: string; amount: number; createdAt?: string }>;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (!token) await AsyncStorage.removeItem(TOKEN_KEY);
  else await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const token = options.token === undefined ? await getToken() : options.token;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Tenant-ID': TENANT_ID,
  };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    method: options.method || (options.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      typeof data === 'object' && data && 'message' in data
        ? String((data as { message: unknown }).message)
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}

export const driverApi = {
  login: (email: string, password: string) =>
    api<{
      accessToken: string;
      refreshToken?: string;
      user?: { id: string; email: string; fullName?: string };
    }>('/auth/login', { body: { email, password }, token: null }),
  setOnline: (isOnline: boolean) => api('/driver/online', { body: { isOnline } }),
  updateLocation: (lat: number, lng: number) =>
    api('/driver/location', { body: { lat, lng } }),
  jobs: (status?: string) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return api<DriverJob[]>(`/driver/jobs${qs}`);
  },
  accept: (id: string) => api(`/driver/jobs/${id}/accept`, { method: 'POST', body: {} }),
  advance: (id: string, status: 'ARRIVED' | 'PICKED_UP' | 'DELIVERED') =>
    api(`/driver/jobs/${id}/advance`, { body: { status } }),
  earnings: () => api<EarningsSummary>('/driver/earnings'),
};
