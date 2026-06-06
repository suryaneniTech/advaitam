export type Role = 'STUDENT' | 'PARENT' | 'WARDEN' | 'SUPER_ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  collegeId: string | null;
  avatarUrl: string | null;
  phone: string | null;
  mustChangePassword: boolean;
  isActive: boolean;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}
