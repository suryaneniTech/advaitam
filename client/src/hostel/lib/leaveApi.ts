import { api } from '@hostel/lib/api';
import type { AuthUser } from '@hostel/types/auth';

export type LeaveStatus =
  | 'PENDING_PARENT'
  | 'PENDING_WARDEN'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface LeaveApproval {
  id: string;
  stage: 'PARENT' | 'WARDEN';
  decision: 'APPROVED' | 'REJECTED';
  comment: string | null;
  decidedAt: string;
}

export interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
  approvals?: LeaveApproval[];
  student?: { user: AuthUser; rollNumber: string };
}

export const leaveApi = {
  // student
  listMine: () => api.get<LeaveRequest[]>('/api/leave/mine'),
  submit: (body: { startDate: string; endDate: string; reason: string }) =>
    api.post<LeaveRequest>('/api/leave', body),
  cancel: (id: string) => api.post<LeaveRequest>(`/api/leave/${id}/cancel`),
  // parent / warden
  listForParent: () => api.get<LeaveRequest[]>('/api/leave/parent'),
  listForWarden: () => api.get<LeaveRequest[]>('/api/leave/warden'),
  decide: (id: string, decision: 'APPROVED' | 'REJECTED', comment?: string) =>
    api.post<LeaveRequest>(`/api/leave/${id}/decision`, { decision, comment }),
};

// Human-friendly status labels + colors used across the leave UIs.
export const LEAVE_STATUS_META: Record<LeaveStatus, { label: string; cls: string }> = {
  PENDING_PARENT: { label: 'Awaiting parent', cls: 'bg-amber-50 text-amber-700' },
  PENDING_WARDEN: { label: 'Awaiting warden', cls: 'bg-blue-50 text-blue-700' },
  APPROVED: { label: 'Approved', cls: 'bg-green-50 text-green-700' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-50 text-red-700' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500' },
};

// ---- profile linking (admin) ----------------------------------------------

export interface StudentProfile {
  id: string;
  rollNumber: string;
  hostelId: string | null;
  roomId: string | null;
  user: AuthUser;
  hostel: { id: string; name: string } | null;
  room: { id: string; number: string } | null;
  parent: { user: AuthUser } | null;
}

export const profileApi = {
  getStudent: (userId: string) => api.get<StudentProfile>(`/api/users/${userId}/student-profile`),
  updateStudent: (
    userId: string,
    body: Partial<{ rollNumber: string; hostelId: string | null; roomId: string | null; parentUserId: string | null }>,
  ) => api.patch<StudentProfile>(`/api/users/${userId}/student-profile`, body),
  assignWardenHostel: (userId: string, hostelId: string | null) =>
    api.patch(`/api/users/${userId}/warden-hostel`, { hostelId }),
};
