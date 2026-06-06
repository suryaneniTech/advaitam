
/**
 * NotificationsView — shared notification center for any role. Lists the user's
 * notifications, shows unread state, and supports mark-read / mark-all-read.
 */
import { useEffect, useState, useCallback } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Card } from '@hostel/components/ui/Card';
import { notificationsApi, type Notification } from '@hostel/lib/notificationsApi';

function timeAgo(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function NotificationsView() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await notificationsApi.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function readOne(id: string) {
    await notificationsApi.markRead(id);
    load();
  }
  async function readAll() {
    await notificationsApi.markAllRead();
    load();
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {items.length} notification{items.length === 1 ? '' : 's'}
          {unread > 0 && <span className="ml-2 font-medium text-slate-900">· {unread} unread</span>}
        </p>
        {unread > 0 && (
          <button
            onClick={readAll}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center py-10 text-center text-sm text-slate-500">
          <Bell className="mb-2 h-8 w-8 text-slate-300" />
          No notifications yet.
        </Card>
      ) : (
        <Card className="p-0">
          <div className="divide-y divide-slate-100">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.readAt && readOne(n.id)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left ${n.readAt ? '' : 'bg-slate-50'}`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-blue-500'}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{n.title}</p>
                  <p className="text-sm text-slate-600">{n.body}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
