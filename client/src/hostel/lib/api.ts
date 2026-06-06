/**
 * Hostel API client — uses /hostel-api proxy to avoid clashing with Advaitam /api routes.
 */
const API_PREFIX = '/hostel-api';

let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
export const getAccessToken = () => accessToken;

interface RequestOptions extends RequestInit {
  skipRetry?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipRetry, headers, ...rest } = options;

  const res = await fetch(`${API_PREFIX}${path.replace(/^\/api/, '')}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  const isAuthAttempt =
    path.endsWith('/auth/login') ||
    path.endsWith('/auth/logout') ||
    path.endsWith('/auth/refresh');

  if (res.status === 401 && !skipRetry && !isAuthAttempt) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, { ...options, skipRetry: true });
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiClientError(res.status, body.error ?? res.statusText, body.details);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const data = await request<{ accessToken: string }>('/api/auth/refresh', {
      method: 'POST',
      skipRetry: true,
    });
    setAccessToken(data.accessToken);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const res = await fetch(`${API_PREFIX}${path.replace(/^\/api/, '')}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });

    if (res.status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) return api.upload<T>(path, formData);
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiClientError(res.status, body.error ?? res.statusText, body.details);
    }

    return res.json() as Promise<T>;
  },
  refresh: tryRefresh,
};
