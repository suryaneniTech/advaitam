import { api } from '@hostel/lib/api';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  readAt: string | null;
}

export interface WardenLogEntry {
  id: string;
  recipient: string;
  title: string;
  body: string;
  status: string;
  sentAt: string;
}

export const notificationsApi = {
  list: () => api.get<Notification[]>('/api/notifications'),
  unreadCount: () => api.get<{ count: number }>('/api/notifications/unread-count'),
  markRead: (id: string) => api.post(`/api/notifications/${id}/read`),
  markAllRead: () => api.post('/api/notifications/read-all'),
  wardenLog: () => api.get<WardenLogEntry[]>('/api/notifications/warden-log'),
};
