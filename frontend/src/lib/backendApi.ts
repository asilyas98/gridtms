// Optional backend API helper for wiring the original GridTMS UI to the secure FastAPI backend.
// Existing frontend files are intentionally not rewritten. Use these helpers inside DataContext.tsx
// when you are ready to route creates/updates through the backend instead of direct Supabase calls.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

export async function backendFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('gridtms_access_token');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || data.message || 'Backend request failed');
  }
  return data as T;
}

export async function registerCarrierAccount(payload: {
  email: string;
  password: string;
  full_name: string;
  company_name: string;
  phone: string;
  dot_number: string;
  mc_number: string;
}) {
  return backendFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginCarrierAccount(email: string, password: string) {
  const result: any = await backendFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const accessToken = result?.session?.access_token || result?.access_token;
  if (accessToken) localStorage.setItem('gridtms_access_token', accessToken);
  return result;
}

export function logoutCarrierAccount() {
  localStorage.removeItem('gridtms_access_token');
}
