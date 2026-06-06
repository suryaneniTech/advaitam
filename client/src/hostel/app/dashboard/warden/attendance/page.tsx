
/**
 * Warden → Attendance. Daily roster with summary counts, an editable attendance
 * time window for the warden's own hostel, and per-student mark buttons that
 * TOGGLE: clicking the active status again clears it (back to "not marked").
 */
import { useEffect, useState, useCallback } from 'react';
import { RouteGuard } from '@hostel/components/RouteGuard';
import { DashboardShell } from '@hostel/components/DashboardShell';
import { StatCard, Card } from '@hostel/components/ui/Card';
import { CheckCircle2, XCircle, CalendarClock, Clock } from 'lucide-react';
import {
  attendanceApi,
  ATT_STATUS_META,
  type Roster,
  type WardenHostelWindow,
} from '@hostel/lib/attendanceApi';
import { ApiClientError } from '@hostel/lib/api';

export default function WardenAttendancePage() {
  return (
    <RouteGuard allow={['WARDEN']}>
      <DashboardShell title="Attendance">
        <WardenAttendance />
      </DashboardShell>
    </RouteGuard>
  );
}

function WardenAttendance() {
  const [roster, setRoster] = useState<Roster | null>(null);
  const [hostel, setHostel] = useState<WardenHostelWindow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [sweeping, setSweeping] = useState(false);
  const [sweepMsg, setSweepMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, h] = await Promise.all([attendanceApi.roster(), attendanceApi.myHostel()]);
      setRoster(r);
      setHostel(h);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Toggle: if the student already has this status, clear it; else set it.
  async function toggle(studentId: string, status: 'PRESENT' | 'ABSENT', current: string | null) {
    setActing(studentId);
    setError(null);
    try {
      if (current === status) {
        await attendanceApi.clear(studentId);
      } else {
        await attendanceApi.mark(studentId, status);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to update');
    } finally {
      setActing(null);
    }
  }

  async function runSweep() {
    if (
      !confirm(
        'Mark all not-yet-marked students absent for today and notify them and their parents? This is the end-of-day sweep.',
      )
    )
      return;
    setSweeping(true);
    setSweepMsg(null);
    try {
      const r = await attendanceApi.runSweep();
      setSweepMsg(`Marked ${r.absentMarked} absent · ${r.notificationsSent} notifications sent.`);
      await load();
    } catch (err) {
      setSweepMsg(err instanceof ApiClientError ? err.message : 'Sweep failed');
    } finally {
      setSweeping(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (error && !roster) return <Card className="text-sm text-amber-700">{error}</Card>;
  if (!roster) return null;

  const present = roster.students.filter((s) => s.status === 'PRESENT').length;
  const onLeave = roster.students.filter((s) => s.status === 'ON_LEAVE').length;
  const pending = roster.students.filter((s) => s.status === null).length;

  return (
    <div className="space-y-6">
      {hostel && <WindowEditor hostel={hostel} onSaved={load} />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total" value={roster.students.length} icon={CalendarClock} />
        <StatCard label="Present" value={present} icon={CheckCircle2} />
        <StatCard label="On leave" value={onLeave} icon={CalendarClock} />
        <StatCard label="Not marked" value={pending} icon={XCircle} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-900">Today&apos;s roster</p>
        <div className="flex items-center gap-3">
          {sweepMsg && <span className="text-sm text-slate-600">{sweepMsg}</span>}
          <button
            onClick={runSweep}
            disabled={sweeping}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {sweeping ? 'Running…' : 'Run end-of-day'}
          </button>
        </div>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Room</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Mark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roster.students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    No students assigned to your hostel yet.
                  </td>
                </tr>
              ) : (
                roster.students.map((s) => {
                  const isPresent = s.status === 'PRESENT';
                  const isAbsent = s.status === 'ABSENT';
                  return (
                    <tr key={s.studentId} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">{s.name}</span>
                        <span className="ml-2 text-xs text-slate-400">{s.rollNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.room ?? '—'}</td>
                      <td className="px-4 py-3">
                        {s.status ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ATT_STATUS_META[s.status].cls}`}>
                            {ATT_STATUS_META[s.status].label}
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                            Not marked
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => toggle(s.studentId, 'PRESENT', s.status)}
                            disabled={acting === s.studentId || s.status === 'ON_LEAVE'}
                            className={`rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-50 ${
                              isPresent
                                ? 'border-green-600 bg-green-600 text-white'
                                : 'border-slate-200 text-green-700 hover:bg-green-50'
                            }`}
                            title={isPresent ? 'Click to clear' : 'Mark present'}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => toggle(s.studentId, 'ABSENT', s.status)}
                            disabled={acting === s.studentId || s.status === 'ON_LEAVE'}
                            className={`rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-50 ${
                              isAbsent
                                ? 'border-red-600 bg-red-600 text-white'
                                : 'border-slate-200 text-red-700 hover:bg-red-50'
                            }`}
                            title={isAbsent ? 'Click to clear' : 'Mark absent'}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function WindowEditor({ hostel, onSaved }: { hostel: WardenHostelWindow; onSaved: () => void }) {
  const [start, setStart] = useState(hostel.attendanceStart);
  const [end, setEnd] = useState(hostel.attendanceEnd);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = start !== hostel.attendanceStart || end !== hostel.attendanceEnd;

  async function save() {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      await attendanceApi.updateWindow({ attendanceStart: start, attendanceEnd: end });
      setMsg('Window updated.');
      onSaved();
      setTimeout(() => setMsg(null), 1500);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to update window');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Clock className="h-4 w-4 text-slate-400" /> Attendance window — {hostel.name}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Students can check in only between these times ({hostel.timezone}).
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Start</span>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">End</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </label>
          <button
            onClick={save}
            disabled={busy || !dirty}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      {msg && <p className="mt-2 text-sm text-green-600">{msg}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
