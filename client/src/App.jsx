import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import AdminLayout from './layouts/AdminLayout';
import AdminHome from './pages/admin/AdminHome';
import UserManagement from './pages/admin/UserManagement';

function homeFor(user) {
  if (user.mustChangePassword) return '/change-password';
  if (user.role === 'admin') return '/admin';
  return '/dashboard';
}

function ProtectedRoute({ children, adminOnly, allowPasswordChange }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (user.mustChangePassword && !allowPasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={homeFor(user)} replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute allowPasswordChange>
            <ChangePassword />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminHome />} />
        <Route path="users" element={<UserManagement />} />
      </Route>
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
