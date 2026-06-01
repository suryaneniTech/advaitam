const API_BASE = '/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('Unable to reach server', 0);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.message || 'Something went wrong', res.status);
  }

  return data;
}

export const api = {
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request('/auth/me'),

  getUsers: () => request('/users'),

  createUser: (email, password) =>
    request('/users', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  inviteUser: (email) =>
    request('/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resendInvite: (id) =>
    request(`/users/${id}/resend-invite`, { method: 'POST' }),

  testEmail: (email) =>
    request('/users/test-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  changePassword: (currentPassword, newPassword) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  uploadAvatar: async (file) => {
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('avatar', file);

    let res;
    try {
      res = await fetch(`${API_BASE}/auth/me/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
    } catch {
      throw new ApiError('Unable to reach server', 0);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(data.message || 'Upload failed', res.status);
    }
    return data;
  },

  removeAvatar: () =>
    request('/auth/me/avatar', { method: 'DELETE' }),

  deleteUser: (id) =>
    request(`/users/${id}`, { method: 'DELETE' }),
};
