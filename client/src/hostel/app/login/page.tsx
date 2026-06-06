import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useHostelAuth } from '@hostel/hooks/useAuth';
import { getHostelBase, roleHome } from '@hostel/lib/basePath';
import { ApiClientError } from '@hostel/lib/api';

export default function LoginPage() {
  const { login } = useHostelAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const base = getHostelBase(pathname);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(
        user.mustChangePassword ? `${base}/change-password` : roleHome(user.role, base),
        { replace: true },
      );
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Welcome back</h1>
        <p className="mb-6 text-sm text-slate-500">
          Sign in to your hostel account (separate from the main Advaitam login).
        </p>
        {import.meta.env.DEV && (
          <p className="mb-4 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
            Dev defaults: <span className="font-mono">admin@hostel.local</span> /{' '}
            <span className="font-mono">ChangeMe123!</span> (or your{' '}
            <span className="font-mono">HOSTEL_ADMIN_*</span> values in server/.env)
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
          <input
            type="email"
            name="hostel-email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
          <input
            type="password"
            name="hostel-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
