import type { Role } from '@hostel/types/auth';

export const HOSTEL_BASE = '/hostel';

export function getHostelBase(_pathname?: string): string {
  return HOSTEL_BASE;
}

export function roleHome(role: Role, base: string = HOSTEL_BASE): string {
  const homes: Record<Role, string> = {
    STUDENT: `${base}/student`,
    PARENT: `${base}/parent`,
    WARDEN: `${base}/warden`,
    SUPER_ADMIN: `${base}/admin`,
  };
  return homes[role];
}
