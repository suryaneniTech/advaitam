import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';

export default function UserHome() {
  const { user } = useAuth();

  return (
    <div className="centered">
      <div className="welcome-card">
        <UserAvatar user={user} size="lg" className="welcome-avatar" />
        <h1>Welcome, {user.email?.split('@')[0]}</h1>
        <p>You are signed in to Advaitam.</p>
      </div>
    </div>
  );
}
