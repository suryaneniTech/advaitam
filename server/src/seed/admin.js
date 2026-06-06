import { User } from '../models/User.js';

export async function seedAdmin() {
  const adminEmail = (process.env.ADMIN_EMAIL || process.env.ADMIN_USERNAME || '').trim().toLowerCase();
  const { ADMIN_PASSWORD } = process.env;

  if (!adminEmail || !ADMIN_PASSWORD) {
    console.warn('ADMIN_EMAIL and ADMIN_PASSWORD are required — skipping admin seed');
    return;
  }

  if (!adminEmail.includes('@')) {
    console.warn('ADMIN_EMAIL must be a valid email address — skipping admin seed');
    return;
  }

  const existing = await User.findOne({ role: 'admin' });
  if (existing) {
    let changed = false;
    if (!existing.email || existing.email !== adminEmail) {
      existing.email = adminEmail;
      changed = true;
    }
    if (!(await existing.comparePassword(ADMIN_PASSWORD))) {
      existing.password = ADMIN_PASSWORD;
      changed = true;
    }
    if (changed) {
      await existing.save();
      console.log(`Admin credentials synced from env (${adminEmail})`);
    }
    return;
  }

  await User.create({
    email: adminEmail,
    password: ADMIN_PASSWORD,
    role: 'admin',
  });

  console.log(`Admin user "${adminEmail}" created`);
}
