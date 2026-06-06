
/**
 * Warden → Notification Log. A record of every missed-attendance notification
 * sent to students in the warden's hostel and to their parents — who was
 * notified, the message, and when.
 */
import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { RouteGuard } from '@hostel/components/RouteGuard';
import { DashboardShell } from '@hostel/components/DashboardShell';
import { Card } from '@hostel/components/ui/Card';
import { notificationsApi, type WardenLogEntry } from '@hostel/lib/notificationsApi';

export default function WardenNotificationLogPage() {
  return (
    <RouteGuard allow={['WARDEN']}>
      <DashboardShell title="Notification Log">
        <Log />
      </DashboardShell>
    </RouteGuard>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Log() {
  const [items, setItems] = useState<WardenLogEntry[] | null>(null);

  useEffect(() => {
    notificationsApi.wardenLog().then(setItems).catch(() => setItems([]));
  }, []);

  if (items === null) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {items.length} missed-attendance notification{items.length === 1 ? '' : 's'} sent
      </p>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center py-10 text-center text-sm text-slate-500">
          <FileText className="mb-2 h-8 w-8 text-slate-300" />
          No notifications have been sent yet. Run an end-of-day sweep to generate them.
        </Card>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Recipient</th>
                  <th className="px-4 py-3 font-medium">Message</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{n.recipient}</td>
                    <td className="px-4 py-3 text-slate-600">{n.body}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        {n.status === 'READ' ? 'Read' : 'Sent'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{fmt(n.sentAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
