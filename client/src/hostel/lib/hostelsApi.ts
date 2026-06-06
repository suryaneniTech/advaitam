import { api } from '@hostel/lib/api';

export interface College {
  id: string;
  name: string;
  code: string;
  address: string | null;
  _count?: { hostels: number; users: number };
}

export interface Room {
  id: string;
  hostelId: string;
  number: string;
  floor: number | null;
  capacity: number;
}

export interface Hostel {
  id: string;
  collegeId: string;
  name: string;
  building: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  allowedIps: string[];
  attendanceStart: string;
  attendanceEnd: string;
  timezone: string;
  rooms?: Room[];
  _count?: { rooms: number; students: number };
}

export interface CreateHostelInput {
  collegeId: string;
  name: string;
  building?: string;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  allowedIps?: string[];
  attendanceStart?: string;
  attendanceEnd?: string;
  timezone?: string;
}

export interface BulkRoomImportResult {
  created: number;
  skipped: Array<{ row: number; number: string; reason: string }>;
  errors: Array<{ row: number; message: string }>;
  rooms: Room[];
}

export const hostelsApi = {
  listColleges: () => api.get<College[]>('/api/hostels/colleges'),
  createCollege: (body: { name: string; code: string; address?: string }) =>
    api.post<College>('/api/hostels/colleges', body),

  listHostels: (collegeId?: string) =>
    api.get<Hostel[]>(`/api/hostels${collegeId ? `?collegeId=${collegeId}` : ''}`),
  getHostel: (id: string) => api.get<Hostel>(`/api/hostels/${id}`),
  createHostel: (body: CreateHostelInput) => api.post<Hostel>('/api/hostels', body),
  updateHostel: (id: string, body: Partial<Omit<CreateHostelInput, 'collegeId'>>) =>
    api.patch<Hostel>(`/api/hostels/${id}`, body),
  deleteHostel: (id: string) => api.del<{ ok: boolean }>(`/api/hostels/${id}`),

  createRoom: (body: { hostelId: string; number: string; floor?: number; capacity?: number }) =>
    api.post<Room>('/api/hostels/rooms', body),
  bulkUploadRooms: (hostelId: string, file: File) => {
    const formData = new FormData();
    formData.append('hostelId', hostelId);
    formData.append('file', file);
    return api.upload<BulkRoomImportResult>('/api/hostels/rooms/bulk', formData);
  },
  deleteRoom: (id: string) => api.del<{ ok: boolean }>(`/api/hostels/rooms/${id}`),
};
