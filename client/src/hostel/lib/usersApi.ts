import { api } from '@hostel/lib/api';
import type { AuthUser, Role } from '@hostel/types/auth';

export interface UserListResponse {
  items: AuthUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateUserResponse {
  user: AuthUser;
  tempPassword?: string;
}

export const usersApi = {
  list: (params: { role?: Role; search?: string; page?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.role) q.set('role', params.role);
    if (params.search) q.set('search', params.search);
    if (params.page) q.set('page', String(params.page));
    return api.get<UserListResponse>(`/api/users?${q.toString()}`);
  },
  create: (body: { email: string; name: string; role: Role; phone?: string; password?: string }) =>
    api.post<CreateUserResponse>('/api/users', body),
  update: (id: string, body: Partial<{ name: string; role: Role; isActive: boolean }>) =>
    api.patch<AuthUser>(`/api/users/${id}`, body),
  deactivate: (id: string) => api.del<AuthUser>(`/api/users/${id}`),
  resetPassword: (id: string) => api.post<{ tempPassword: string }>(`/api/users/${id}/reset-password`),
};
