
/**
 * Admin → Users. List + search + role filter, create users (showing the
 * one-time temp password), and deactivate. All calls hit /api/users, which is
 * gated to SUPER_ADMIN on the server.
 */
import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, UserX, Copy, Check, SlidersHorizontal, KeyRound } from 'lucide-react';
import { RouteGuard } from '@hostel/components/RouteGuard';
import { DashboardShell } from '@hostel/components/DashboardShell';
import { Card } from '@hostel/components/ui/Card';
import { ProfileLinkModal } from '@hostel/components/admin/ProfileLinkModal';
import { usersApi, type CreateUserResponse } from '@hostel/lib/usersApi';
import { ROLE_LABEL } from '@hostel/lib/nav';
import type { AuthUser, Role } from '@hostel/types/auth';
import { ApiClientError } from '@hostel/lib/api';

const ROLES: Role[] = ['STUDENT', 'PARENT', 'WARDEN', 'SUPER_ADMIN'];

export default function UsersPage() {
  return (
    <RouteGuard allow={['SUPER_ADMIN']}>
      <DashboardShell title="Users">
        <UsersManager />
      </DashboardShell>
    </RouteGuard>
  );
}

function UsersManager() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [manageUser, setManageUser] = useState<AuthUser | null>(null);
  const [resetResult, setResetResult] = useState<{ name: string; tempPassword: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list({
        search: search || undefined,
        role: roleFilter || undefined,
      });
      setUsers(res.items);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce search
    return () => clearTimeout(t);
  }, [load]);

  async function deactivate(id: string) {
    if (!confirm('Deactivate this user? They will be signed out and unable to log in.')) return;
    await usersApi.deactivate(id);
    load();
  }

  async function resetPassword(u: AuthUser) {
    if (!confirm(`Reset ${u.name}'s password? Their current password and sessions will stop working.`))
      return;
    const { tempPassword } = await usersApi.resetPassword(u.id);
    setResetResult({ name: u.name, tempPassword });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role | '')}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" /> Add user
        </button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3 text-slate-600">{ROLE_LABEL[u.role]}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          u.isActive
                            ? 'rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700'
                            : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500'
                        }
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(u.role === 'STUDENT' || u.role === 'WARDEN') && (
                        <button
                          onClick={() => setManageUser(u)}
                          title="Manage profile / links"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                        </button>
                      )}
                      {u.isActive && (
                        <button
                          onClick={() => resetPassword(u)}
                          title="Reset password"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                      )}
                      {u.isActive && (
                        <button
                          onClick={() => deactivate(u.id)}
                          title="Deactivate"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      {manageUser && <ProfileLinkModal user={manageUser} onClose={() => setManageUser(null)} />}

      {resetResult && (
        <ResetResultDialog result={resetResult} onClose={() => setResetResult(null)} />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'STUDENT' as Role, phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CreateUserResponse | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await usersApi.create({
        name: form.name,
        email: form.email,
        role: form.role,
        phone: form.phone || undefined,
      });
      setResult(res); // show temp password screen
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to create user');
    } finally {
      setBusy(false);
    }
  }

  function copyTemp() {
    if (result?.tempPassword) {
      navigator.clipboard.writeText(result.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        {result ? (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">User created</h2>
            <p className="mt-1 text-sm text-slate-600">
              Share these credentials with {result.user.name}. The temporary password is shown only
              once.
            </p>
            <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
              <div>
                <span className="text-slate-500">Email: </span>
                <span className="font-medium text-slate-900">{result.user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>
                  <span className="text-slate-500">Temp password: </span>
                  <span className="font-mono font-medium text-slate-900">
                    {result.tempPassword}
                  </span>
                </span>
                <button
                  onClick={copyTemp}
                  className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <button
              onClick={onCreated}
              className="mt-4 w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Add user</h2>
            <div className="mt-4 space-y-3">
              <input
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <input
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={busy || !form.name || !form.email}
                className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResetResultDialog({
  result,
  onClose,
}: {
  result: { name: string; tempPassword: string };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(result.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Password reset</h2>
        <p className="mt-1 text-sm text-slate-600">
          Share this temporary password with {result.name}. It is shown only once; they&apos;ll be
          asked to set a new one at next login.
        </p>
        <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
          <span className="font-mono font-medium text-slate-900">{result.tempPassword}</span>
          <button
            onClick={copy}
            className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white"
        >
          Done
        </button>
      </div>
    </div>
  );
}
