import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useHostelAuth } from '@hostel/hooks/useAuth';
import { getHostelBase, roleHome, HOSTEL_BASE } from '@hostel/lib/basePath';
import LoginPage from '@hostel/app/login/page';
import ChangePasswordPage from '@hostel/app/change-password/page';
import StudentDashboard from '@hostel/app/dashboard/student/page';
import StudentAttendancePage from '@hostel/app/dashboard/student/attendance/page';
import StudentLeavePage from '@hostel/app/dashboard/student/leave/page';
import StudentNotificationsPage from '@hostel/app/dashboard/student/notifications/page';
import ParentDashboard from '@hostel/app/dashboard/parent/page';
import ParentLeavePage from '@hostel/app/dashboard/parent/leave/page';
import ParentNotificationsPage from '@hostel/app/dashboard/parent/notifications/page';
import WardenDashboard from '@hostel/app/dashboard/warden/page';
import WardenAttendancePage from '@hostel/app/dashboard/warden/attendance/page';
import WardenStudentsPage from '@hostel/app/dashboard/warden/students/page';
import WardenLeavePage from '@hostel/app/dashboard/warden/leave/page';
import WardenNotificationsPage from '@hostel/app/dashboard/warden/notifications/page';
import WardenNotificationLogPage from '@hostel/app/dashboard/warden/notification-log/page';
import AdminDashboard from '@hostel/app/dashboard/admin/page';
import AdminUsersPage from '@hostel/app/dashboard/admin/users/page';
import AdminHostelsPage from '@hostel/app/dashboard/admin/hostels/page';
import AdminNotificationsPage from '@hostel/app/dashboard/admin/notifications/page';

function HostelIndex() {
  const { user, loading } = useHostelAuth();
  const { pathname } = useLocation();
  const base = getHostelBase(pathname);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (user.mustChangePassword) {
    return <Navigate to={`${base}/change-password`} replace />;
  }

  return <Navigate to={roleHome(user.role, base)} replace />;
}

export default function HostelRoutes() {
  return (
    <Routes>
      <Route index element={<HostelIndex />} />
      <Route path="login" element={<Navigate to={HOSTEL_BASE} replace />} />
      <Route path="change-password" element={<ChangePasswordPage />} />
      <Route path="student" element={<StudentDashboard />} />
      <Route path="student/attendance" element={<StudentAttendancePage />} />
      <Route path="student/leave" element={<StudentLeavePage />} />
      <Route path="student/notifications" element={<StudentNotificationsPage />} />
      <Route path="parent" element={<ParentDashboard />} />
      <Route path="parent/leave" element={<ParentLeavePage />} />
      <Route path="parent/notifications" element={<ParentNotificationsPage />} />
      <Route path="warden" element={<WardenDashboard />} />
      <Route path="warden/attendance" element={<WardenAttendancePage />} />
      <Route path="warden/students" element={<WardenStudentsPage />} />
      <Route path="warden/leave" element={<WardenLeavePage />} />
      <Route path="warden/notifications" element={<WardenNotificationsPage />} />
      <Route path="warden/notification-log" element={<WardenNotificationLogPage />} />
      <Route path="admin" element={<AdminDashboard />} />
      <Route path="admin/users" element={<AdminUsersPage />} />
      <Route path="admin/hostels" element={<AdminHostelsPage />} />
      <Route path="admin/notifications" element={<AdminNotificationsPage />} />
      <Route path="*" element={<HostelIndex />} />
    </Routes>
  );
}
