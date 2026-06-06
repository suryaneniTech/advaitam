
/**
 * Student → Leave. Submit a new leave request and track its status through the
 * parent → warden pipeline. Pending requests can be cancelled.
 */
import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { RouteGuard } from '@hostel/components/RouteGuard';
import { DashboardShell } from '@hostel/components/DashboardShell';
import { Card } from '@hostel/components/ui/Card';
import { LeaveCard } from '@hostel/components/leave/LeaveCard';
import { leaveApi, type LeaveRequest } from '@hostel/lib/leaveApi';
import { ApiClientError } from '@hostel/lib/api';

export default function StudentLeavePage() {
  return (
    <RouteGuard allow={['STUDENT']}>
      <DashboardShell title="Leave">
        <StudentLeave />
      </DashboardShell>
    </RouteGuard>
  );
}

function StudentLeave() {
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await leaveApi.listMine());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function cancel(id: string) {
    if (!confirm('Cancel this leave request?')) return;
    await leaveApi.cancel(id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} request{items.length === 1 ? '' : 's'}</p>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" /> Request leave
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="text-center text-sm text-slate-500">No leave requests yet.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((l) => (
            <LeaveCard
              key={l.id}
              leave={l}
              actions={
                l.status === 'PENDING_PARENT' || l.status === 'PENDING_WARDEN' ? (
                  <button
                    onClick={() => cancel(l.id)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel request
                  </button>
                ) : null
              }
            />
          ))}
        </div>
      )}

      {open && <RequestModal onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function RequestModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [startDate, setStart] = useState('');
  const [endDate, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await leaveApi.submit({ startDate, endDate, reason });
      onDone();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to submit');
    } finally {
      setBusy(false);
    }
  }

  const cls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Request leave</h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">From</span>
            <input type="date" className={cls} value={startDate} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">To</span>
            <input type="date" className={cls} value={endDate} onChange={(e) => setEnd(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Reason</span>
            <textarea
              className={cls}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Going home for the weekend…"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !startDate || !endDate || reason.trim().length < 3}
            className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
