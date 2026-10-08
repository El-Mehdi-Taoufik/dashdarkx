const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem('dashdarkx_token');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message ?? 'Request failed');
  return data as T;
};

export const api = {
  login: (body: { email: string; password: string }) => request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  signup: (body: { name: string; email: string; password: string }) => request<{ token: string; user: User }>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request<{ user: User }>('/auth/me'),
  products: () => request<{ products: Product[] }>('/products'),
  orders: (search = '') => request<{ orders: Order[] }>(`/orders?search=${encodeURIComponent(search)}`),
  updateOrder: (id: number, body: Partial<Pick<Order, 'status' | 'country' | 'total'>>) => request<{ order: Order }>(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteOrder: (id: number) => request<void>(`/orders/${id}`, { method: 'DELETE' }),
  summary: () => request<{ stats: DashboardStats }>('/dashboard/summary'),
};

export interface User { id: number; name: string; email: string; role: 'ADMIN' | 'USER'; }
export interface Product { id: number; name: string; price: number; inStock: number; imageUrl?: string | null; }
export interface Order { id: number; client: { id: number; name: string; email: string }; date: string; status: 'delivered' | 'pending' | 'canceled'; country: string; total: number; }
export interface DashboardStats { stockProducts: number; orders: number; deliveredOrders: number; customers: number; revenue: number; }
