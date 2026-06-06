import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useHostelAuth } from '@hostel/hooks/useAuth';
import { getHostelBase } from '@hostel/lib/basePath';
import { api, ApiClientError } from '@hostel/lib/api';

export default function ChangePasswordPage() {
  const { user, loading, logout } = useHostelAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const base = getHostelBase(pathname);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!loading && !user) {
    navigate(base, { replace: true });
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) return setError('New password must be at least 8 characters');
    if (next !== confirm) return setError('Passwords do not match');

    setBusy(true);
    try {
      await api.post('/api/auth/change-password', { currentPassword: current, newPassword: next });
      setDone(true);
      await logout();
      setTimeout(() => navigate(base, { replace: true }), 1200);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to change password');
    } finally {
      setBusy(false);
    }
  }

  const cls =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400';

  return (
    <main className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Set a new password</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">
          {user?.mustChangePassword
            ? 'For security, please replace your temporary password.'
            : 'Update your account password.'}
        </p>

        {done ? (
          <p className="text-sm text-green-600">
            Password updated. Redirecting you to sign in again…
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              type="password"
              placeholder="Current (temporary) password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
              className={cls}
            />
            <input
              type="password"
              placeholder="New password (min 8 chars)"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              className={cls}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className={cls}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
