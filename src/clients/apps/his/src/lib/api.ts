// src/clients/apps/his/src/lib/api.ts
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

function authHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('his_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  return undefined as unknown as T;
}

export const api = {
  get: <T>(path: string) =>
    fetch(`${BASE}${path}`, { headers: authHeaders() }).then((r) =>
      handleResponse<T>(r)
    ),

  post: <T>(path: string, body?: unknown) =>
    fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: authHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then((r) => handleResponse<T>(r)),

  patch: <T>(path: string, body?: unknown) =>
    fetch(`${BASE}${path}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then((r) => handleResponse<T>(r)),

  delete: (path: string) =>
    fetch(`${BASE}${path}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then((r) => handleResponse<void>(r)),
};
