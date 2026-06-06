
import { RouteGuard } from '@hostel/components/RouteGuard';
import { DashboardShell } from '@hostel/components/DashboardShell';
import { ApproverLeaveView } from '@hostel/components/leave/ApproverLeaveView';

export default function ParentLeavePage() {
  return (
    <RouteGuard allow={['PARENT']}>
      <DashboardShell title="Leave Requests">
        <ApproverLeaveView role="PARENT" />
      </DashboardShell>
    </RouteGuard>
  );
}
