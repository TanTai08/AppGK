import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
export type Product = { id: number; name: string; sku: string; price: number; quantity: number };
type User = { id: number; name: string; email: string };
const API = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001');
function useAppStore() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  async function clearSession() { setToken(null); setUser(null); setProducts([]); await AsyncStorage.removeItem('session'); }
  async function request(path: string, method = 'GET', body?: unknown, session = token) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${API}/api${path}`, { method, signal: controller.signal, headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const data = response.status === 204 ? null : await response.json();
      if (!response.ok) { if (response.status === 401 && session) await clearSession(); throw new Error(data?.error || 'Yêu cầu không thành công.'); }
      return data;
    } catch (e) { if (e instanceof Error && (e.name === 'AbortError' || e.message === 'Failed to fetch' || e.message === 'Network request failed')) throw new Error('Không kết nối được máy chủ. Kiểm tra mạng và địa chỉ API.'); throw e; }
    finally { clearTimeout(timeout); }
  }
  async function restore() {
    setLoading(true); setLoadError('');
    try {
      const saved = await AsyncStorage.getItem('session');
      if (saved) {
        const me = await request('/auth/me', 'GET', undefined, saved);
        const list = await request('/products', 'GET', undefined, saved);
        setToken(saved); setUser(me); setProducts(list);
      }
    } catch (e) { setLoadError((e as Error).message); } finally { setLoading(false); }
  }
  useEffect(() => { void restore(); }, []);
  async function authenticate(mode: 'login' | 'register', values: { email: string; password: string; name: string }) {
    const data = await request(`/auth/${mode}`, 'POST', values, null);
    await AsyncStorage.setItem('session', data.token);
    setToken(data.token); setUser(data.user); setProducts([]);
    try { setProducts(await request('/products', 'GET', undefined, data.token)); setLoadError(''); }
    catch (e) { setLoadError((e as Error).message); }
  }
  async function save(values: Omit<Product, 'id'>, id?: number) {
    const product = await request(id ? `/products/${id}` : '/products', id ? 'PUT' : 'POST', values);
    setProducts(list => id ? list.map(p => p.id === id ? product : p) : [product, ...list]);
  }
  async function remove(id: number) { await request(`/products/${id}`, 'DELETE'); setProducts(list => list.filter(p => p.id !== id)); }
  async function logout() { await request('/auth/logout', 'POST'); await clearSession(); }
  return { user, products, loading, loadError, authenticate, restore, save, remove, logout };
}
const Store = createContext<ReturnType<typeof useAppStore> | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) { const value = useAppStore(); return <Store.Provider value={value}>{children}</Store.Provider>; }
export function useStore() { return useContext(Store)!; }
