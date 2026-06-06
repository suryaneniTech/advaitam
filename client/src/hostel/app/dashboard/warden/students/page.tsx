
/**
 * Warden → Students. Full list of students in the warden's hostel with their
 * details, and a dropdown per student to assign/change their room.
 */
import { useEffect, useState, useCallback } from 'react';
import { UserPlus, X } from 'lucide-react';
import { RouteGuard } from '@hostel/components/RouteGuard';
import { DashboardShell } from '@hostel/components/DashboardShell';
import { Card } from '@hostel/components/ui/Card';
import { attendanceApi, type HostelStudentsResponse } from '@hostel/lib/attendanceApi';
import { ApiClientError } from '@hostel/lib/api';

export default function WardenStudentsPage() {
  return (
    <RouteGuard allow={['WARDEN']}>
      <DashboardShell title="Students">
        <WardenStudents />
      </DashboardShell>
    </RouteGuard>
  );
}

function WardenStudents() {
  const [data, setData] = useState<HostelStudentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await attendanceApi.students());
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function assign(studentId: string, roomId: string) {
    setSaving(studentId);
    setError(null);
    try {
      await attendanceApi.assignRoom(studentId, roomId || null);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to assign room');
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (error && !data) return <Card className="text-sm text-amber-700">{error}</Card>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {data.students.length} student{data.students.length === 1 ? '' : 's'} · {data.rooms.length}{' '}
          room{data.rooms.length === 1 ? '' : 's'}
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          <UserPlus className="h-4 w-4" /> Add student
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Roll no.</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Room</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    No students assigned to your hostel yet.
                  </td>
                </tr>
              ) : (
                data.students.map((s) => (
                  <tr key={s.studentId} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{s.name}</span>
                      <div className="text-xs text-slate-400">{s.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.rollNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{s.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={s.roomId ?? ''}
                        disabled={saving === s.studentId}
                        onChange={(e) => assign(s.studentId, e.target.value)}
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400 disabled:opacity-50"
                      >
                        <option value="">— unassigned —</option>
                        {data.rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            Room {r.number} (cap {r.capacity})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showAdd && (
        <AddStudentModal
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function AddStudentModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [list, setList] = useState<{ studentId: string; name: string; email: string; rollNumber: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    attendanceApi
      .assignableStudents()
      .then(setList)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : 'Failed to load'));
  }, []);

  async function add(studentId: string) {
    setAdding(studentId);
    setError(null);
    try {
      await attendanceApi.addStudent(studentId);
      onAdded();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to add student');
      setAdding(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Add student to hostel</h2>
            <p className="text-xs text-slate-500">Students in your college not yet in a hostel.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

        {list === null ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : list.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No unassigned students available. Ask an admin to create student accounts first.
          </p>
        ) : (
          <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
            {list.map((s) => (
              <div key={s.studentId} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-900">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.email}</p>
                </div>
                <button
                  onClick={() => add(s.studentId)}
                  disabled={adding === s.studentId}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {adding === s.studentId ? 'Adding…' : 'Add'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
