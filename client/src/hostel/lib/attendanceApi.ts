import { api } from '@hostel/lib/api';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'ON_LEAVE' | 'REJECTED';

export interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  markedAt: string;
}

export interface MyAttendance {
  hostel: {
    name: string;
    attendanceStart: string;
    attendanceEnd: string;
    timezone: string;
  } | null;
  today: AttendanceStatus | null;
  onLeaveToday: boolean;
  windowOpen: boolean;
  history: AttendanceRecord[];
}

export interface RosterRow {
  studentId: string;
  name: string;
  rollNumber: string;
  room: string | null;
  status: AttendanceStatus | null;
}

export interface Roster {
  date: string;
  students: RosterRow[];
}

export interface WardenHostelWindow {
  id: string;
  name: string;
  attendanceStart: string;
  attendanceEnd: string;
  timezone: string;
}

export interface HostelStudentsResponse {
  rooms: { id: string; number: string; capacity: number }[];
  students: {
    studentId: string;
    userId: string;
    name: string;
    email: string;
    phone: string | null;
    rollNumber: string;
    roomId: string | null;
    roomNumber: string | null;
  }[];
}

export const attendanceApi = {
  myStatus: () => api.get<MyAttendance>('/api/attendance/me'),
  checkIn: () => api.post<AttendanceRecord>('/api/attendance/check-in'),
  roster: (date?: string) =>
    api.get<Roster>(`/api/attendance/roster${date ? `?date=${date}` : ''}`),
  mark: (studentId: string, status: AttendanceStatus, date?: string) =>
    api.post('/api/attendance/mark', { studentId, status, date }),
  clear: (studentId: string, date?: string) =>
    api.post('/api/attendance/clear', { studentId, date }),
  myHostel: () => api.get<WardenHostelWindow | null>('/api/attendance/my-hostel'),
  updateWindow: (body: { attendanceStart?: string; attendanceEnd?: string; timezone?: string }) =>
    api.patch<WardenHostelWindow>('/api/attendance/my-hostel/window', body),
  students: () => api.get<HostelStudentsResponse>('/api/attendance/students'),
  assignRoom: (studentId: string, roomId: string | null) =>
    api.post('/api/attendance/assign-room', { studentId, roomId }),
  assignableStudents: () =>
    api.get<{ studentId: string; name: string; email: string; rollNumber: string }[]>(
      '/api/attendance/assignable-students',
    ),
  addStudent: (studentId: string) => api.post('/api/attendance/add-student', { studentId }),
  runSweep: (date?: string) =>
    api.post<{ date: string; absentMarked: number; notificationsSent: number; totalStudents: number }>(
      '/api/attendance/run-sweep',
      { date },
    ),
};

export const ATT_STATUS_META: Record<AttendanceStatus, { label: string; cls: string }> = {
  PRESENT: { label: 'Present', cls: 'bg-green-50 text-green-700' },
  ABSENT: { label: 'Absent', cls: 'bg-red-50 text-red-700' },
  ON_LEAVE: { label: 'On leave', cls: 'bg-blue-50 text-blue-700' },
  REJECTED: { label: 'Rejected', cls: 'bg-amber-50 text-amber-700' },
};
