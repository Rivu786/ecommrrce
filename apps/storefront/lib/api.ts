const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'demo';

export type ApiOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
};

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Tenant-ID': TENANT_ID,
    ...options.headers,
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    method: options.method || (options.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
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
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  const key = 'omni_session_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('omni_access_token');
}

export function setAuthTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem('omni_access_token', accessToken);
  if (refreshToken) localStorage.setItem('omni_refresh_token', refreshToken);
}

export function clearAuthTokens() {
  localStorage.removeItem('omni_access_token');
  localStorage.removeItem('omni_refresh_token');
}

export type HomepageSection = {
  id: string;
  type: string;
  title?: string | null;
  sortOrder?: number;
  configJson?: Record<string, unknown>;
};

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  brand?: string | null;
  status?: string;
  variants?: Array<{
    id: string;
    sku: string;
    price: number | string;
    compareAtPrice?: number | string | null;
  }>;
  media?: Array<{ url: string; alt?: string | null }>;
};

export type ProductDetail = ProductListItem & {
  description?: string | null;
  categories?: Array<{ id: string; name: string; slug: string }>;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor?: string | null;
};

export type Cart = {
  id: string;
  subtotal: number;
  currencyCode: string;
  couponCode?: string | null;
  items: Array<{
    id: string;
    variantId: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    variant?: {
      id: string;
      sku: string;
      name?: string;
      product?: { id: string; name: string; slug: string };
    };
  }>;
};

export type CheckoutResult = {
  id: string;
  orderNumber: string;
  grandTotal: number;
  currencyCode: string;
  payment?: {
    orderPaymentReference: string;
    qrCodeUrl?: string | null;
    qrPayload?: string | null;
    amount: number;
    status: string;
  };
};

export type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
  user?: { id: string; email: string; fullName?: string };
};

export const storeApi = {
  homepage: () => api<HomepageSection[]>('/homepage'),
  products: (params?: { cursor?: string; take?: number; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.cursor) qs.set('cursor', params.cursor);
    if (params?.take) qs.set('take', String(params.take));
    if (params?.q) qs.set('q', params.q);
    const query = qs.toString();
    return api<CursorPage<ProductListItem> | ProductListItem[]>(
      `/products${query ? `?${query}` : ''}`,
    );
  },
  product: (slug: string) => api<ProductDetail>(`/products/${encodeURIComponent(slug)}`),
  getCart: (sessionId: string, token?: string | null) =>
    api<Cart>(`/cart?sessionId=${encodeURIComponent(sessionId)}`, { token }),
  addToCart: (cartId: string, variantId: string, quantity = 1) =>
    api<Cart>(`/cart/${cartId}/items`, { body: { variantId, quantity } }),
  updateCartItem: (cartId: string, itemId: string, quantity: number) =>
    api<Cart>(`/cart/${cartId}/items/${itemId}`, {
      method: 'PATCH',
      body: { quantity },
    }),
  removeCartItem: (cartId: string, itemId: string) =>
    api<Cart>(`/cart/${cartId}/items/${itemId}`, { method: 'DELETE' }),
  checkout: (
    body: {
      cartId: string;
      fulfillmentMode?: string;
      shippingAddressJson?: object;
      guestJson?: object;
      notes?: string;
    },
    token?: string | null,
  ) => api<CheckoutResult>('/orders/checkout', { body, token }),
  verifyPayment: (body: {
    orderPaymentReference: string;
    utr: string;
    senderAccount?: string;
  }) => api('/payments/verify-submit', { body }),
  login: (email: string, password: string) =>
    api<AuthResponse>('/auth/login', { body: { email, password } }),
  register: (body: { email: string; password: string; fullName: string; phone?: string }) =>
    api<AuthResponse>('/auth/register', { body }),
  myOrders: (token: string) => api<unknown[]>('/orders/mine', { token }),
};
