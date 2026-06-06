
/**
 * ProfileLinkModal — admin tool to wire up the relationships leave/attendance
 * need. For a STUDENT: set roll number, hostel, room, and link a parent. For a
 * WARDEN: assign a hostel. Opened from the Users table "Manage" action.
 */
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { profileApi } from '@hostel/lib/leaveApi';
import { hostelsApi, type Hostel } from '@hostel/lib/hostelsApi';
import { usersApi } from '@hostel/lib/usersApi';
import type { AuthUser } from '@hostel/types/auth';
import { ApiClientError } from '@hostel/lib/api';

const cls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400';

export function ProfileLinkModal({ user, onClose }: { user: AuthUser; onClose: () => void }) {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [parents, setParents] = useState<AuthUser[]>([]);
  const [rooms, setRooms] = useState<{ id: string; number: string }[]>([]);
  const [form, setForm] = useState({ rollNumber: '', hostelId: '', roomId: '', parentUserId: '' });
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const hs = await hostelsApi.listHostels();
      setHostels(hs);
      if (user.role === 'STUDENT') {
        const [pl, prof] = await Promise.all([
          usersApi.list({ role: 'PARENT' }),
          profileApi.getStudent(user.id).catch(() => null),
        ]);
        setParents(pl.items);
        if (prof) {
          setForm({
            rollNumber: prof.rollNumber?.startsWith('TEMP-') ? '' : prof.rollNumber ?? '',
            hostelId: prof.hostelId ?? '',
            roomId: prof.roomId ?? '',
            parentUserId: prof.parent?.user.id ?? '',
          });
          if (prof.hostelId) {
            const full = await hostelsApi.getHostel(prof.hostelId);
            setRooms(full.rooms ?? []);
          }
        }
      }
    })().catch(() => setError('Failed to load options'));
  }, [user.id, user.role]);

  async function onHostelChange(hostelId: string) {
    setForm((f) => ({ ...f, hostelId, roomId: '' }));
    if (hostelId) {
      const full = await hostelsApi.getHostel(hostelId);
      setRooms(full.rooms ?? []);
    } else {
      setRooms([]);
    }
  }

  async function save() {
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      if (user.role === 'STUDENT') {
        await profileApi.updateStudent(user.id, {
          rollNumber: form.rollNumber || undefined,
          hostelId: form.hostelId || null,
          roomId: form.roomId || null,
          parentUserId: form.parentUserId || null,
        });
      } else if (user.role === 'WARDEN') {
        await profileApi.assignWardenHostel(user.id, form.hostelId || null);
      }
      setMsg('Saved.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  const isStudent = user.role === 'STUDENT';
  const isWarden = user.role === 'WARDEN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{user.name}</h2>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isStudent && !isWarden ? (
          <p className="text-sm text-slate-500">
            No profile settings for {user.role.toLowerCase()} accounts.
          </p>
        ) : (
          <div className="space-y-3">
            {isStudent && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Roll number</span>
                <input
                  className={cls}
                  value={form.rollNumber}
                  onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
                  placeholder="e.g. 21CS045"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Hostel</span>
              <select className={cls} value={form.hostelId} onChange={(e) => onHostelChange(e.target.value)}>
                <option value="">— none —</option>
                {hostels.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </label>

            {isStudent && form.hostelId && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Room</span>
                <select className={cls} value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
                  <option value="">— none —</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>Room {r.number}</option>
                  ))}
                </select>
              </label>
            )}

            {isStudent && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Parent</span>
                <select className={cls} value={form.parentUserId} onChange={(e) => setForm({ ...form, parentUserId: e.target.value })}>
                  <option value="">— none —</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                  ))}
                </select>
                {parents.length === 0 && (
                  <span className="mt-1 block text-xs text-amber-600">
                    No parent accounts yet — create one in Users first.
                  </span>
                )}
              </label>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            {msg && <p className="text-sm text-green-600">{msg}</p>}
          </div>
        )}

        {(isStudent || isWarden) && (
          <div className="mt-5 flex gap-2">
            <button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">
              Close
            </button>
            <button onClick={save} disabled={busy} className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-50">
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
