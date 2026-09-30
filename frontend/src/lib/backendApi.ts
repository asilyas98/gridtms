const configuredApiBase = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.NEXT_PUBLIC_API_BASE_URL ||
  ''
).trim();

// Default to the same Express server that serves the React app on localhost:3000.
// Set VITE_API_BASE_URL=http://localhost:8081 only if you intentionally run the separate FastAPI backend.
export const API_BASE_URL = configuredApiBase;

const TOKEN_KEY = 'gridtms_access_token';
const REFRESH_TOKEN_KEY = 'gridtms_refresh_token';
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

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveAuthSession(authResult: any) {
  const token = authResult?.access_token || authResult?.session?.access_token;
  const refreshToken = authResult?.refresh_token || authResult?.session?.refresh_token;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
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
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notifyAuthChanged();
}

async function refreshAuthSession(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.access_token) return null;
    saveAuthSession(result);
    return result.access_token;
  } catch {
    return null;
  }
}

export async function backendFetch(path: string, options: RequestInit = {}) {
  let token = getAccessToken();

  const send = (accessToken: string | null) => fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
  });

  let response: Response;
  try {
    response = await send(token);
  } catch (error) {
    throw new Error(`Backend offline: cannot reach the GridTMS API. If you are using the one-terminal demo, restart with npm run dev from the frontend folder. If using the Python backend, set VITE_API_BASE_URL=http://localhost:8081 and start Docker backend.`);
  }

  const isAuthRoute = path.startsWith('/auth/login') || path.startsWith('/auth/register') || path.startsWith('/auth/refresh') || path.startsWith('/business/verify');
  if (response.status === 401 && token && !isAuthRoute) {
    const refreshedToken = await refreshAuthSession();
    if (refreshedToken) {
      token = refreshedToken;
      response = await send(token);
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      // Keep auth/login routes from auto-clearing while the user is signing in.
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
