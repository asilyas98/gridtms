const configuredApiBase = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.NEXT_PUBLIC_API_BASE_URL ||
  ''
).trim();

// Default to the same Express server that serves the React app on localhost:3000.
// Set VITE_API_BASE_URL=http://localhost:8081 only if you intentionally run the separate FastAPI backend.
export const API_BASE_URL = configuredApiBase;

const TOKEN_KEY = 'gridtms_access_token';
const USER_KEY = 'gridtms_user';
const AUTH_EVENT = 'gridtms-auth-change';

export function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function onAuthChanged(callback: () => void) {
  window.addEventListener(AUTH_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(AUTH_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveAuthSession(authResult: any) {
  const token = authResult?.access_token || authResult?.session?.access_token;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (authResult?.user) localStorage.setItem(USER_KEY, JSON.stringify(authResult.user));
  notifyAuthChanged();
}

export function getSavedUser(): any | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notifyAuthChanged();
}

export async function backendFetch(path: string, options: RequestInit = {}) {
  const token = getAccessToken();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    throw new Error(`Backend offline: cannot reach the GridTMS API. If you are using the one-terminal demo, restart with npm run dev from the frontend folder. If using the Python backend, set VITE_API_BASE_URL=http://localhost:8081 and start Docker backend.`);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      // Keep auth/login routes from auto-clearing while the user is signing in.
      const isAuthRoute = path.startsWith('/auth/login') || path.startsWith('/auth/register') || path.startsWith('/business/verify');
      if (!isAuthRoute && token) clearAuthSession();
    }
    const detail = data?.detail;
    const message = typeof detail === 'string'
      ? detail
      : detail?.message || data?.message || `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return data;
}
