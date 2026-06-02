import { User } from '../models/User.js';

export async function migrateUsers() {
  const indexes = await User.collection.indexes();
  const legacyUsernameIndex = indexes.find(
    (idx) => idx.key?.username === 1 || idx.name === 'username_1'
  );

  if (legacyUsernameIndex) {
    try {
      await User.collection.dropIndex(legacyUsernameIndex.name);
      console.log(`Dropped legacy index "${legacyUsernameIndex.name}" on users.username`);
    } catch (err) {
      console.warn(`Could not drop legacy username index: ${err.message}`);
    }
  }

  await User.updateMany({ username: { $exists: true } }, { $unset: { username: '' } });

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
