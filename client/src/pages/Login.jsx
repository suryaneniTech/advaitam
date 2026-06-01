import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
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
          <h1 className="brand-title">Advaitam</h1>
          <p className="brand-tagline">Sign in to continue</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer">
          Admin accounts can invite users by email from the dashboard.
        </p>
      </div>
    </div>
  );
}
