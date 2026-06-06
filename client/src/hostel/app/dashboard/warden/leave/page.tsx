
import { RouteGuard } from '@hostel/components/RouteGuard';
import { DashboardShell } from '@hostel/components/DashboardShell';
import { ApproverLeaveView } from '@hostel/components/leave/ApproverLeaveView';

export default function WardenLeavePage() {
  return (
    <RouteGuard allow={['WARDEN']}>
      <DashboardShell title="Leave Requests">
        <ApproverLeaveView role="WARDEN" />
      </DashboardShell>
    </RouteGuard>
  );
}
