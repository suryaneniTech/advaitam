import { HostelUser } from '../models/hostel/index.js';
import { hashPassword } from '../hostel/lib/security.js';

export async function seedHostelAdmin() {
  const email = (process.env.HOSTEL_ADMIN_EMAIL || 'admin@hostel.local').toLowerCase();
  const password = process.env.HOSTEL_ADMIN_PASSWORD || 'ChangeMe123!';
  const name = process.env.HOSTEL_ADMIN_NAME || 'Hostel Admin';

  const existing = await HostelUser.findOne({ email });
  if (existing) {
    console.log(`Hostel admin already exists: ${email}`);
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
