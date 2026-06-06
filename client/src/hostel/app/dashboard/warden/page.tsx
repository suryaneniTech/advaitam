
import { RouteGuard } from '@hostel/components/RouteGuard';
import { DashboardShell } from '@hostel/components/DashboardShell';
import { Card } from '@hostel/components/ui/Card';
import { useHostelAuth } from '@hostel/hooks/useAuth';

export default function WardenOverview() {
  return (
    <RouteGuard allow={['WARDEN']}>
      <DashboardShell title="Overview">
        <Inner />
      </DashboardShell>
    </RouteGuard>
  );
}

function Inner() {
  const { user } = useHostelAuth();
  return (
    <Card>
      <h2 className="text-sm font-semibold text-slate-900">Welcome, {user?.name}</h2>
      <p className="mt-2 text-sm text-slate-600">
        Use the <span className="font-medium">Leave Requests</span> section to review requests from
        students in your hostel. Attendance monitoring arrives in a later milestone.
      </p>
    </Card>
  );
}
