import { User } from '../models/User.js';

export async function migrateUsers() {
  const legacy = await User.find({
    $or: [{ email: { $exists: false } }, { email: null }, { email: '' }],
  });

  for (const user of legacy) {
    if (user.username && user.username.includes('@')) {
      user.email = user.username.toLowerCase();
      user.username = undefined;
      await user.save();
    }
  }

  const result = await User.updateMany(
    {
      $or: [
        { inviteStatus: { $exists: false } },
        { mustChangePassword: { $exists: false } },
      ],
    },
    {
      $set: {
        inviteStatus: 'none',
        mustChangePassword: false,
      },
    }
  );

  if (result.modifiedCount > 0) {
    console.log(`Migrated ${result.modifiedCount} existing user(s) with invite defaults`);
  }
}
