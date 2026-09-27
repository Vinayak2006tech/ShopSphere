import { Product, Order, User, SystemHealthResponse, NotificationLog } from './types';

export const BASE_URL = (import.meta.env.VITE_GATEWAY_URL || '').replace(/\/$/, '');

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('shopsphere_access_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// 1. Auth API
export async function registerUser(payload: { email: string; password: string; name: string }) {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  return data.data;
}

export async function loginUser(payload: { email: string; password: string }) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data.data;
}

export async function verifyToken(token: string) {
  const res = await fetch(`${BASE_URL}/api/auth/verify-token`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Token verification failed');
  return data.data;
}

// 2. Product API
export async function fetchProducts(params?: { category?: string; search?: string; sort?: string }): Promise<Product[]> {
  const base = BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const url = new URL(`${base}/api/products`);
  if (params?.category && params.category !== 'All') {
    url.searchParams.append('category', params.category);
  }
  if (params?.search) {
    url.searchParams.append('search', params.search);
  }
  if (params?.sort) {
    url.searchParams.append('sort', params.sort);
  }

  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load products');
  return data.data.products;
}

export async function fetchCategories(): Promise<{ name: string; count: number }[]> {
  const res = await fetch(`${BASE_URL}/api/categories`);
  const data = await res.json();
  if (!res.ok) return [];
  return data.data || [];
}

export async function fetchProductById(id: string): Promise<Product> {
  const res = await fetch(`${BASE_URL}/api/products/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load product');
  return data.data;
}

// 3. Order API
export async function createOrder(payload: {
  items: { productId: string; productName: string; price: number; quantity: number; imageUrl?: string }[];
  shippingAddress: { street: string; city: string; state: string; postalCode: string; country: string };
  customerName?: string;
  customerEmail?: string;
}): Promise<Order> {
  const res = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Order creation failed');
  return data.data;
}

export async function fetchUserOrders(): Promise<Order[]> {
  const res = await fetch(`${BASE_URL}/api/orders`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch orders');
  return data.data || [];
}

// 4. Notifications API (for demo previewing)
export async function fetchNotificationLogs(): Promise<NotificationLog[]> {
  const res = await fetch(`${BASE_URL}/api/notifications`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) return [];
  return data.data || [];
}

// 5. System Health API
export async function fetchSystemHealth(): Promise<SystemHealthResponse> {
  const res = await fetch(`${BASE_URL}/health`);
  return await res.json();
}
