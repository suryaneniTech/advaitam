import type { Role } from '@hostel/types/auth';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarCheck,
  FileText,
  Bell,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export function navForRole(role: Role, base: string): NavItem[] {
  const NAV: Record<Role, NavItem[]> = {
    SUPER_ADMIN: [
      { label: 'Overview', href: `${base}/admin`, icon: LayoutDashboard },
      { label: 'Users', href: `${base}/admin/users`, icon: Users },
      { label: 'Hostels', href: `${base}/admin/hostels`, icon: Building2 },
      { label: 'Notifications', href: `${base}/admin/notifications`, icon: Bell },
    ],
    WARDEN: [
      { label: 'Overview', href: `${base}/warden`, icon: LayoutDashboard },
      { label: 'Attendance', href: `${base}/warden/attendance`, icon: CalendarCheck },
      { label: 'Students', href: `${base}/warden/students`, icon: Users },
      { label: 'Leave Requests', href: `${base}/warden/leave`, icon: FileText },
      { label: 'Notifications', href: `${base}/warden/notifications`, icon: Bell },
      { label: 'Notification Log', href: `${base}/warden/notification-log`, icon: FileText },
    ],
    PARENT: [
      { label: 'Overview', href: `${base}/parent`, icon: LayoutDashboard },
      { label: 'Leave Requests', href: `${base}/parent/leave`, icon: FileText },
      { label: 'Notifications', href: `${base}/parent/notifications`, icon: Bell },
    ],
    STUDENT: [
      { label: 'Overview', href: `${base}/student`, icon: LayoutDashboard },
      { label: 'Attendance', href: `${base}/student/attendance`, icon: CalendarCheck },
      { label: 'Leave', href: `${base}/student/leave`, icon: FileText },
      { label: 'Notifications', href: `${base}/student/notifications`, icon: Bell },
    ],
  };
  return NAV[role];
}

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Administrator',
  WARDEN: 'Warden',
  PARENT: 'Parent',
  STUDENT: 'Student',
};
