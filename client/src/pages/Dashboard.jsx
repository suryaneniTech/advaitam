import { useAuth } from '../context/AuthContext';
import UserMenu from '../components/UserMenu';
import UserAvatar from '../components/UserAvatar';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="dashboard-layout">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-mark sm">A</span>
          <span>Advaitam</span>
        </div>
        <div className="topbar-spacer" aria-hidden="true" />
        <div className="topbar-actions">
          <UserMenu />
        </div>
      </header>

      <main className="dashboard-main centered">
        <div className="welcome-card">
          <UserAvatar user={user} size="lg" className="welcome-avatar" />
          <h1>Welcome, {user.email?.split('@')[0]}</h1>
          <p>You are signed in to Advaitam. More features coming soon.</p>
        </div>
      </main>
    </div>
  );
}
