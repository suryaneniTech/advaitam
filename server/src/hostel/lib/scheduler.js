import { HostelBuilding } from '../../models/hostel/index.js';
import { attendanceService } from '../services/attendance.js';
import { dayKey, nowHHmmInTz } from './datetime.js';

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const lastSweptByHostel = new Map();

async function tick() {
  try {
    const hostels = await HostelBuilding.find().select('attendanceEnd timezone');
    const todayKey = dayKey();
    const todayStr = todayKey.toISOString().slice(0, 10);

    for (const h of hostels) {
      const nowHHmm = nowHHmmInTz(h.timezone);
      if (nowHHmm >= h.attendanceEnd && lastSweptByHostel.get(h.id) !== todayStr) {
        const summary = await attendanceService.runAbsentSweep(h._id, todayKey);
        lastSweptByHostel.set(h.id, todayStr);
        console.log(
          `[hostel-sweep] hostel=${h.id} ${todayStr}: absent=${summary.absentMarked} notified=${summary.notificationsSent}`,
        );
      }
    }
  } catch (err) {
    console.error('[hostel-sweep] tick failed:', err);
  }
}

export function startHostelAttendanceScheduler() {
  setTimeout(tick, 10_000);
  setInterval(tick, SWEEP_INTERVAL_MS);
  console.log('Hostel attendance auto-sweep scheduler started (5-min interval).');
}
