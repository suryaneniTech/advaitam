
/**
 * ApproverLeaveView — shared by the parent and warden leave pages. Lists
 * requests, separating those awaiting *this* approver's action from the rest,
 * and provides approve/reject with an optional comment.
 */
import { useEffect, useState, useCallback } from 'react';
import { Card } from '@hostel/components/ui/Card';
import { LeaveCard } from '@hostel/components/leave/LeaveCard';
import { leaveApi, type LeaveRequest, type LeaveStatus } from '@hostel/lib/leaveApi';
import { ApiClientError } from '@hostel/lib/api';

export function ApproverLeaveView({ role }: { role: 'PARENT' | 'WARDEN' }) {
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The status this approver acts on.
  const actionable: LeaveStatus = role === 'PARENT' ? 'PENDING_PARENT' : 'PENDING_WARDEN';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(role === 'PARENT' ? await leaveApi.listForParent() : await leaveApi.listForWarden());
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, decision: 'APPROVED' | 'REJECTED') {
    const comment = decision === 'REJECTED' ? prompt('Reason for rejection (optional):') ?? undefined : undefined;
    setActing(id);
    setError(null);
    try {
      await leaveApi.decide(id, decision, comment);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Action failed');
    } finally {
      setActing(null);
    }
  }

  const pending = items.filter((l) => l.status === actionable);
  const rest = items.filter((l) => l.status !== actionable);

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Awaiting your decision ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <Card className="text-center text-sm text-slate-500">Nothing waiting on you.</Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {pending.map((l) => (
              <LeaveCard
                key={l.id}
                leave={l}
                showStudent
                actions={
                  <>
                    <button
                      onClick={() => decide(l.id, 'APPROVED')}
                      disabled={acting === l.id}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => decide(l.id, 'REJECTED')}
                      disabled={acting === l.id}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>

      {rest.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">History ({rest.length})</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {rest.map((l) => (
              <LeaveCard key={l.id} leave={l} showStudent />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
