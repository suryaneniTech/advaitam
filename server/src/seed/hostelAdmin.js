import { HostelUser } from '../models/hostel/index.js';
import { hashPassword, verifyPassword } from '../hostel/lib/security.js';

export async function seedHostelAdmin() {
  const email = (process.env.HOSTEL_ADMIN_EMAIL || 'admin@hostel.local').toLowerCase();
  const password = process.env.HOSTEL_ADMIN_PASSWORD || 'ChangeMe123!';
  const name = process.env.HOSTEL_ADMIN_NAME || 'Hostel Admin';

  const existing = await HostelUser.findOne({ role: 'SUPER_ADMIN' });
  if (existing) {
    let changed = false;
    if (existing.email !== email) {
      existing.email = email;
      changed = true;
    }
    if (existing.name !== name) {
      existing.name = name;
      changed = true;
    }
    if (!existing.passwordHash || !(await verifyPassword(password, existing.passwordHash))) {
      existing.passwordHash = await hashPassword(password);
      changed = true;
    }
    if (!existing.isActive) {
      existing.isActive = true;
      changed = true;
    }
    if (changed) {
      await existing.save();
      console.log(`Hostel admin credentials synced from env (${email})`);
    } else {
      console.log(`Hostel admin already exists: ${email}`);
    }
    return;
  }

  await HostelUser.create({
    email,
    name,
    role: 'SUPER_ADMIN',
    passwordHash: await hashPassword(password),
    isActive: true,
  });

  console.log(`Hostel admin seeded: ${email}`);
}
