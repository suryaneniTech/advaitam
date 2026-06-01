import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminHome() {
  const { user } = useAuth();

  return (
    <>
      <header className="page-header">
        <h1>Welcome, {user.email?.split('@')[0]}</h1>
        <p>Manage your workspace from the sidebar.</p>
      </header>

      <section className="panel">
        <h2>Quick links</h2>
        <div className="quick-links">
          <Link to="/admin/users" className="quick-link-card">
            <strong>User management</strong>
            <span className="muted">Create and manage login credentials</span>
          </Link>
        </div>
      </section>
    </>
  );
}
