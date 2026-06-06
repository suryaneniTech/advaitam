
/**
 * Admin → Hostels. Manages the College -> Hostel -> Room tree.
 *
 * Flow: if no college exists yet, prompt to create one (the tenant root).
 * Then list hostels as cards showing geofence + attendance window, with a
 * "New hostel" form and a detail panel to add/remove rooms. The geofence and
 * time-window fields configured here are what the Phase 2 attendance pipeline
 * will read — nothing here marks attendance yet.
 */
import { useEffect, useState, useCallback } from 'react';
import { Plus, Building2, MapPin, Clock, Trash2, DoorOpen, X } from 'lucide-react';
import { RouteGuard } from '@hostel/components/RouteGuard';
import { DashboardShell } from '@hostel/components/DashboardShell';
import { Card } from '@hostel/components/ui/Card';
import { hostelsApi, type College, type Hostel } from '@hostel/lib/hostelsApi';
import { ApiClientError } from '@hostel/lib/api';

export default function HostelsPage() {
  return (
    <RouteGuard allow={['SUPER_ADMIN']}>
      <DashboardShell title="Hostels">
        <HostelsManager />
      </DashboardShell>
    </RouteGuard>
  );
}

function HostelsManager() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCollege, setShowCollege] = useState(false);
  const [showHostel, setShowHostel] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editHostel, setEditHostel] = useState<Hostel | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cs, hs] = await Promise.all([hostelsApi.listColleges(), hostelsApi.listHostels()]);
      setColleges(cs);
      setHostels(hs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  // No college yet → guide the admin to create the tenant root first.
  if (colleges.length === 0) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <Building2 className="mx-auto h-10 w-10 text-slate-300" />
        <h2 className="mt-3 text-base font-semibold text-slate-900">Create your first college</h2>
        <p className="mt-1 text-sm text-slate-600">
          Hostels belong to a college. Add one to get started.
        </p>
        <button
          onClick={() => setShowCollege(true)}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Add college
        </button>
        {showCollege && (
          <CollegeModal
            onClose={() => setShowCollege(false)}
            onCreated={() => {
              setShowCollege(false);
              load();
            }}
          />
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {hostels.length} hostel{hostels.length === 1 ? '' : 's'} ·{' '}
          {colleges.length} college{colleges.length === 1 ? '' : 's'}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCollege(true)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
          >
            Add college
          </button>
          <button
            onClick={() => setShowHostel(true)}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" /> New hostel
          </button>
        </div>
      </div>

      {hostels.length === 0 ? (
        <Card className="text-center text-sm text-slate-500">
          No hostels yet. Click “New hostel” to add one.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hostels.map((h) => (
            <Card key={h.id} className="flex flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{h.name}</h3>
                  {h.building && <p className="text-xs text-slate-500">{h.building}</p>}
                </div>
                <Building2 className="h-5 w-5 text-slate-300" />
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)} · {h.radiusMeters}m
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {h.attendanceStart}–{h.attendanceEnd} ({h.timezone})
                </p>
                <p className="flex items-center gap-1.5">
                  <DoorOpen className="h-3.5 w-3.5 text-slate-400" />
                  {h._count?.rooms ?? 0} rooms · {h._count?.students ?? 0} students
                </p>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setEditHostel(h)}
                  className="flex-1 rounded-lg border border-slate-200 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDetailId(h.id)}
                  className="flex-1 rounded-lg border border-slate-200 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Manage rooms
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCollege && (
        <CollegeModal onClose={() => setShowCollege(false)} onCreated={() => { setShowCollege(false); load(); }} />
      )}
      {showHostel && (
        <HostelModal
          colleges={colleges}
          onClose={() => setShowHostel(false)}
          onCreated={() => { setShowHostel(false); load(); }}
        />
      )}
      {detailId && (
        <RoomDrawer hostelId={detailId} onClose={() => { setDetailId(null); load(); }} />
      )}
      {editHostel && (
        <EditHostelModal
          hostel={editHostel}
          onClose={() => setEditHostel(null)}
          onSaved={() => { setEditHostel(null); load(); }}
        />
      )}
    </div>
  );
}

function CollegeModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', code: '', address: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await hostelsApi.createCollege({
        name: form.name,
        code: form.code,
        address: form.address || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to create college');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Add college" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name">
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sunrise Institute of Technology" />
        </Field>
        <Field label="Code" hint="Short slug, e.g. SIT (letters, numbers, - or _)">
          <input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SIT" />
        </Field>
        <Field label="Address (optional)">
          <input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <ModalActions onClose={onClose} onSubmit={submit} busy={busy} disabled={!form.name || form.code.length < 2} />
    </Modal>
  );
}

function HostelModal({
  colleges,
  onClose,
  onCreated,
}: {
  colleges: College[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    collegeId: colleges[0]?.id ?? '',
    name: '',
    building: '',
    latitude: '',
    longitude: '',
    radiusMeters: '100',
    attendanceStart: '21:00',
    attendanceEnd: '23:00',
    timezone: 'Asia/Kolkata',
    allowedIps: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await hostelsApi.createHostel({
        collegeId: form.collegeId,
        name: form.name,
        building: form.building || undefined,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radiusMeters: parseInt(form.radiusMeters, 10),
        attendanceStart: form.attendanceStart,
        attendanceEnd: form.attendanceEnd,
        timezone: form.timezone,
        allowedIps: form.allowedIps
          ? form.allowedIps.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to create hostel');
    } finally {
      setBusy(false);
    }
  }

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) =>
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        })),
      () => setError('Could not get location (permission denied or unavailable)'),
    );
  };

  return (
    <Modal title="New hostel" onClose={onClose} wide>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="College">
          <select className={inputCls} value={form.collegeId} onChange={(e) => setForm({ ...form, collegeId: e.target.value })}>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Hostel name">
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Block A" />
        </Field>
        <Field label="Building (optional)">
          <input className={inputCls} value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} />
        </Field>
        <Field label="Geofence radius (m)">
          <input className={inputCls} type="number" value={form.radiusMeters} onChange={(e) => setForm({ ...form, radiusMeters: e.target.value })} />
        </Field>
        <Field label="Latitude">
          <input className={inputCls} value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="17.3850" />
        </Field>
        <Field label="Longitude">
          <input className={inputCls} value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="78.4867" />
        </Field>
        <div className="sm:col-span-2">
          <button onClick={useMyLocation} type="button" className="text-xs font-medium text-slate-700 underline">
            Use my current location
          </button>
        </div>
        <Field label="Attendance start">
          <input className={inputCls} type="time" value={form.attendanceStart} onChange={(e) => setForm({ ...form, attendanceStart: e.target.value })} />
        </Field>
        <Field label="Attendance end">
          <input className={inputCls} type="time" value={form.attendanceEnd} onChange={(e) => setForm({ ...form, attendanceEnd: e.target.value })} />
        </Field>
        <Field label="Timezone">
          <input className={inputCls} value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
        </Field>
        <Field label="Allowed IPs (optional, comma-separated)" hint="Phase 2 Wi-Fi check">
          <input className={inputCls} value={form.allowedIps} onChange={(e) => setForm({ ...form, allowedIps: e.target.value })} placeholder="203.0.113.5, 203.0.113.6" />
        </Field>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <ModalActions
        onClose={onClose}
        onSubmit={submit}
        busy={busy}
        disabled={!form.name || !form.latitude || !form.longitude || !form.collegeId}
      />
    </Modal>
  );
}

function RoomDrawer({ hostelId, onClose }: { hostelId: string; onClose: () => void }) {
  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [number, setNumber] = useState('');
  const [capacity, setCapacity] = useState('2');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setHostel(await hostelsApi.getHostel(hostelId));
  }, [hostelId]);

  useEffect(() => {
    load();
  }, [load]);

  const [error, setError] = useState<string | null>(null);

  async function addRoom() {
    const trimmed = number.trim();
    if (!trimmed) return;
    // Capacity must be a valid 1–20 integer; fall back to 2 if the box is blank/bad.
    const cap = parseInt(capacity, 10);
    const safeCap = Number.isFinite(cap) ? Math.min(20, Math.max(1, cap)) : 2;
    setError(null);
    setBusy(true);
    try {
      await hostelsApi.createRoom({ hostelId, number: trimmed, capacity: safeCap });
      setNumber('');
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to add room');
    } finally {
      setBusy(false);
    }
  }

  async function removeRoom(id: string) {
    await hostelsApi.deleteRoom(id);
    await load();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{hostel?.name ?? 'Rooms'}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <input className={inputCls} placeholder="Room no." value={number} onChange={(e) => setNumber(e.target.value)} />
          <input className={`${inputCls} w-20`} type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} title="Capacity" />
          <button onClick={addRoom} disabled={busy || !number.trim()} className="rounded-lg bg-slate-900 px-3 text-sm font-medium text-white disabled:opacity-50">
            Add
          </button>
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {!hostel?.rooms?.length ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">No rooms yet.</p>
          ) : (
            hostel.rooms.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-slate-900">
                  Room {r.number}
                  <span className="ml-2 text-xs text-slate-400">cap {r.capacity}</span>
                </span>
                <button onClick={() => removeRoom(r.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ---- edit hostel modal -----------------------------------------------------

function EditHostelModal({
  hostel,
  onClose,
  onSaved,
}: {
  hostel: Hostel;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: hostel.name,
    building: hostel.building ?? '',
    radiusMeters: String(hostel.radiusMeters),
    attendanceStart: hostel.attendanceStart,
    attendanceEnd: hostel.attendanceEnd,
    timezone: hostel.timezone,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await hostelsApi.updateHostel(hostel.id, {
        name: form.name,
        building: form.building || undefined,
        radiusMeters: parseInt(form.radiusMeters, 10),
        attendanceStart: form.attendanceStart,
        attendanceEnd: form.attendanceEnd,
        timezone: form.timezone,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to update hostel');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Edit ${hostel.name}`} onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Hostel name">
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Building (optional)">
          <input className={inputCls} value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} />
        </Field>
        <Field label="Geofence radius (m)">
          <input className={inputCls} type="number" value={form.radiusMeters} onChange={(e) => setForm({ ...form, radiusMeters: e.target.value })} />
        </Field>
        <Field label="Timezone">
          <input className={inputCls} value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
        </Field>
        <Field label="Attendance start">
          <input className={inputCls} type="time" value={form.attendanceStart} onChange={(e) => setForm({ ...form, attendanceStart: e.target.value })} />
        </Field>
        <Field label="Attendance end">
          <input className={inputCls} type="time" value={form.attendanceEnd} onChange={(e) => setForm({ ...form, attendanceEnd: e.target.value })} />
        </Field>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <ModalActions onClose={onClose} onSubmit={submit} busy={busy} disabled={!form.name} />
    </Modal>
  );
}

// ---- small shared modal primitives ----------------------------------------

const inputCls =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`w-full ${wide ? 'max-w-lg' : 'max-w-md'} rounded-2xl bg-white p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onClose, onSubmit, busy, disabled }: { onClose: () => void; onSubmit: () => void; busy: boolean; disabled: boolean }) {
  return (
    <div className="mt-5 flex gap-2">
      <button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">
        Cancel
      </button>
      <button onClick={onSubmit} disabled={busy || disabled} className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-50">
        {busy ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}
