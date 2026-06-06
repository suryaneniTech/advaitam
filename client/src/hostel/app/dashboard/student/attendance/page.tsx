
/**
 * Student → Attendance. Shows today's status with a check-in button (enabled
 * only inside the hostel's time window), and a list of recent days. Approved
 * leave shows as "On leave" and needs no check-in.
 */
import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { RouteGuard } from '@hostel/components/RouteGuard';
import { DashboardShell } from '@hostel/components/DashboardShell';
import { Card } from '@hostel/components/ui/Card';
import { attendanceApi, ATT_STATUS_META, type MyAttendance } from '@hostel/lib/attendanceApi';
import { ApiClientError } from '@hostel/lib/api';

export default function StudentAttendancePage() {
  return (
    <RouteGuard allow={['STUDENT']}>
      <DashboardShell title="Attendance">
        <StudentAttendance />
      </DashboardShell>
    </RouteGuard>
  );
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function StudentAttendance() {
  const [data, setData] = useState<MyAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await attendanceApi.myStatus());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function checkIn() {
    setBusy(true);
    setError(null);
    try {
      await attendanceApi.checkIn();
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Check-in failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (!data) return null;

  const marked = data.today === 'PRESENT' || data.today === 'ON_LEAVE';

  return (
    <div className="space-y-6">
      {!data.hostel ? (
        <Card className="text-sm text-amber-700">
          You are not assigned to a hostel yet. Ask an admin to set this up before marking
          attendance.
        </Card>
      ) : (
        <Card>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm text-slate-500">Today</p>
              {data.today ? (
                <span
                  className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-medium ${ATT_STATUS_META[data.today].cls}`}
                >
                  {ATT_STATUS_META[data.today].label}
                </span>
              ) : (
                <p className="mt-1 text-lg font-semibold text-slate-900">Not marked yet</p>
              )}
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                Window {data.hostel.attendanceStart}–{data.hostel.attendanceEnd} ({data.hostel.timezone})
              </p>
            </div>

            {data.onLeaveToday ? (
              <span className="text-sm text-blue-600">You&apos;re on approved leave today.</span>
            ) : marked ? (
              <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                <CheckCircle2 className="h-5 w-5" /> Checked in
              </span>
            ) : (
              <button
                onClick={checkIn}
                disabled={busy || !data.windowOpen}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                title={data.windowOpen ? '' : 'Attendance window is closed'}
              >
                {busy ? 'Marking…' : data.windowOpen ? 'Check in now' : 'Window closed'}
              </button>
            )}
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Recent history</h2>
        {data.history.length === 0 ? (
          <Card className="text-center text-sm text-slate-500">No attendance records yet.</Card>
        ) : (
          <Card className="p-0">
            <div className="divide-y divide-slate-100">
              {data.history.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-slate-700">{fmt(r.date)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ATT_STATUS_META[r.status].cls}`}>
                    {ATT_STATUS_META[r.status].label}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
