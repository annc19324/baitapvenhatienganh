/**
 * Lightweight API client for the EngWork backend.
 * Normalizes VITE_API_URL (strips trailing slashes and trailing /api)
 * so paths like '/api/engwork/...' never double up as '/api/api/...'.
 * Uses 45s timeout to accommodate Render free-tier cold starts.
 */

function resolveApiRoot(): string {
  const raw = (import.meta.env.VITE_API_URL || '').trim();
  if (raw) {
    return raw.replace(/\/+$/, '').replace(/\/api$/i, '');
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5000';
  }
  return 'https://smartdoc-backend.onrender.com';
}

export const API_ROOT = resolveApiRoot();
const ADMIN_KEY = 'annc19324:Zeanokai@1'; // matches ENGWORK_ADMIN_KEY in backend
const DEFAULT_TIMEOUT_MS = 45000;

export async function apiGet<T = any>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_ROOT}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as T;
  } catch {
    return null;
  }
}

export async function apiGetRaw<T = any>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_ROOT}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function apiPut<T = any>(path: string, body: any, admin = false): Promise<T | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (admin) headers['x-admin-key'] = ADMIN_KEY;
    const res = await fetch(`${API_ROOT}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? json) as T;
  } catch {
    return null;
  }
}

export async function apiDelete(path: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_ROOT}${path}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiPost<T = any>(path: string, body: any, admin = false): Promise<T | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (admin) headers['x-admin-key'] = ADMIN_KEY;
    const res = await fetch(`${API_ROOT}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? json) as T;
  } catch {
    return null;
  }
}

/** Returns true if the backend is reachable */
export async function checkBackendOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${API_ROOT}/api/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
