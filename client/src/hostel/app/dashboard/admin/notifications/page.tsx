
import { RouteGuard } from '@hostel/components/RouteGuard';
import { DashboardShell } from '@hostel/components/DashboardShell';
import { NotificationsView } from '@hostel/components/NotificationsView';

export default function NotificationsPage() {
  return (
    <RouteGuard allow={['SUPER_ADMIN']}>
      <DashboardShell title="Notifications">
        <NotificationsView />
      </DashboardShell>
    </RouteGuard>
  );
}
