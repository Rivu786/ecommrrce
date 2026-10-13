const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const DEFAULT_TENANT = process.env.NEXT_PUBLIC_TENANT_SLUG || 'demo';

const TOKEN_KEY = 'oc_admin_token';
const TENANT_KEY = 'oc_admin_tenant';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export function getApiBaseUrl() {
  return API_URL.replace(/\/$/, '');
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredTenant(): string {
  if (typeof window === 'undefined') return DEFAULT_TENANT;
  return localStorage.getItem(TENANT_KEY) || DEFAULT_TENANT;
}

export function setStoredTenant(tenant: string) {
  localStorage.setItem(TENANT_KEY, tenant);
}

export function clearAuth() {
  clearStoredToken();
}

type ApiOptions = RequestInit & {
  tenant?: string;
  token?: string | null;
  skipAuth?: boolean;
};

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { tenant, token, skipAuth, headers, ...rest } = options;
  const resolvedTenant = tenant === undefined ? getStoredTenant() : tenant;
  const resolvedToken = skipAuth ? null : token === undefined ? getStoredToken() : token;

  const finalHeaders = new Headers(headers);
  if (!finalHeaders.has('Content-Type') && rest.body && !(rest.body instanceof FormData)) {
    finalHeaders.set('Content-Type', 'application/json');
  }
  if (resolvedTenant && !path.startsWith('/admin/platform')) {
    finalHeaders.set('X-Tenant-ID', resolvedTenant);
  }
  if (resolvedToken) {
    finalHeaders.set('Authorization', `Bearer ${resolvedToken}`);
  }

  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, { ...rest, headers: finalHeaders });

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
    if (res.status === 401 && typeof window !== 'undefined' && !skipAuth) {
      clearStoredToken();
    }
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
};

export async function login(email: string, password: string, tenant?: string) {
  return api<LoginResponse>('/auth/login', {
    method: 'POST',
    skipAuth: true,
    tenant: tenant?.trim() || '',
    body: JSON.stringify({ email, password }),
  });
}

/** Normalize list payloads from varied API shapes. */
export function asList<T = Record<string, unknown>>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['items', 'data', 'results', 'rows', 'jobs', 'pages', 'coupons', 'vendors', 'companies']) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

export function cell(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    if (value instanceof Date) return value.toISOString();
    if ('name' in (value as object)) return String((value as { name: unknown }).name);
    if ('email' in (value as object)) return String((value as { email: unknown }).email);
    return JSON.stringify(value);
  }
  return String(value);
}

export function formatMoney(value: unknown): string {
  const n = Number(value);
  if (Number.isNaN(n)) return cell(value);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}
