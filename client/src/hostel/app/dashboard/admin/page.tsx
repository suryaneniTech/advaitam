
/**
 * Admin overview. This is the SUPER_ADMIN landing page (fixes the post-login
 * 404). It pulls live counts from the users API to show real data rather than
 * placeholders. Hostel/attendance/leave stats arrive as those modules ship.
 */
import { useEffect, useState } from 'react';
import { Users, GraduationCap, Shield, Bell } from 'lucide-react';
import { RouteGuard } from '@hostel/components/RouteGuard';
import { DashboardShell } from '@hostel/components/DashboardShell';
import { StatCard, Card } from '@hostel/components/ui/Card';
import { usersApi } from '@hostel/lib/usersApi';

export default function AdminOverviewPage() {
  return (
    <RouteGuard allow={['SUPER_ADMIN']}>
      <DashboardShell title="Overview">
        <Overview />
      </DashboardShell>
    </RouteGuard>
  );
}

function Overview() {
  const [counts, setCounts] = useState<{ total: number; students: number; wardens: number } | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      // Cheap counts: ask for page 1 of each role and read `total`.
      const [all, students, wardens] = await Promise.all([
        usersApi.list({ page: 1 }),
        usersApi.list({ role: 'STUDENT', page: 1 }),
        usersApi.list({ role: 'WARDEN', page: 1 }),
      ]);
      setCounts({ total: all.total, students: students.total, wardens: wardens.total });
    })().catch(() => setCounts({ total: 0, students: 0, wardens: 0 }));
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={counts?.total ?? '—'} icon={Users} />
        <StatCard label="Students" value={counts?.students ?? '—'} icon={GraduationCap} />
        <StatCard label="Wardens" value={counts?.wardens ?? '—'} icon={Shield} />
        <StatCard label="Notifications" value="—" icon={Bell} hint="Coming soon" />
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Getting started</h2>
        <p className="mt-2 text-sm text-slate-600">
          Use the <span className="font-medium">Users</span> section to create wardens, students and
          parents. Hostel setup, attendance and leave management arrive in the next milestones.
        </p>
      </Card>
    </div>
  );
}
