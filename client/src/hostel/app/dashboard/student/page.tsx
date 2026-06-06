
/**
 * Student overview. Uses the DashboardShell so the student gets the sidebar
 * (Overview / Attendance / Leave) like the other roles. Replaces the original
 * bare placeholder that had no navigation.
 */
import { Link, useLocation } from 'react-router-dom';
import { CalendarCheck, FileText, ArrowRight } from 'lucide-react';
import { RouteGuard } from '@hostel/components/RouteGuard';
import { DashboardShell } from '@hostel/components/DashboardShell';
import { Card } from '@hostel/components/ui/Card';
import { useHostelAuth } from '@hostel/hooks/useAuth';
import { getHostelBase } from '@hostel/lib/basePath';

export default function StudentDashboard() {
  return (
    <RouteGuard allow={['STUDENT']}>
      <DashboardShell title="Overview">
        <Inner />
      </DashboardShell>
    </RouteGuard>
  );
}

function Inner() {
  const { user } = useHostelAuth();
  const base = getHostelBase(useLocation().pathname);
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Welcome, {user?.name}</h2>
        <p className="mt-2 text-sm text-slate-600">
          Request leave and track its approval from here. Attendance check-in arrives in the next
          milestone.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link to={`${base}/student/leave`}>
          <Card className="flex items-center justify-between transition-colors hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Leave</p>
                <p className="text-xs text-slate-500">Request & track leave</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Card>
        </Link>

        <Card className="flex items-center justify-between opacity-60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Attendance</p>
              <p className="text-xs text-slate-500">Coming soon</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
