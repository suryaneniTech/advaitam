
import { type ReactNode } from 'react';
import { LEAVE_STATUS_META, type LeaveRequest } from '@hostel/lib/leaveApi';
import { Card } from '@hostel/components/ui/Card';

export function StatusBadge({ status }: { status: LeaveRequest['status'] }) {
  const meta = LEAVE_STATUS_META[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>{meta.label}</span>
  );
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * One leave request card. Pass `actions` to render approve/reject or cancel
 * buttons under the details (parent/warden/student views supply their own).
 */
export function LeaveCard({
  leave,
  showStudent,
  actions,
}: {
  leave: LeaveRequest;
  showStudent?: boolean;
  actions?: ReactNode;
}) {
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          {showStudent && leave.student && (
            <p className="text-sm font-semibold text-slate-900">
              {leave.student.user.name}
              <span className="ml-2 text-xs font-normal text-slate-400">
                {leave.student.rollNumber}
              </span>
            </p>
          )}
          <p className="text-sm text-slate-700">
            {fmt(leave.startDate)} → {fmt(leave.endDate)}
          </p>
        </div>
        <StatusBadge status={leave.status} />
      </div>

      <p className="text-sm text-slate-600">{leave.reason}</p>

      {leave.approvals && leave.approvals.length > 0 && (
        <div className="space-y-1 border-t border-slate-100 pt-2">
          {leave.approvals.map((a) => (
            <p key={a.id} className="text-xs text-slate-500">
              {a.stage === 'PARENT' ? 'Parent' : 'Warden'}{' '}
              {a.decision === 'APPROVED' ? 'approved' : 'rejected'}
              {a.comment ? ` — “${a.comment}”` : ''}
            </p>
          ))}
        </div>
      )}

      {actions && <div className="flex gap-2 pt-1">{actions}</div>}
    </Card>
  );
}
