import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function ChangePassword() {
  const { user, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user && !user.mustChangePassword) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>
      <div className="auth-bg" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="auth-card">
        <header className="auth-header">
          <span className="brand-mark">A</span>
          <h1 className="brand-title">Set new password</h1>
          <p className="brand-tagline">Replace your temporary password to continue</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <label className="field">
            <span>Current (temporary) password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <label className="field">
            <span>New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          <label className="field">
            <span>Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
