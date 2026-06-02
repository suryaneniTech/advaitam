import { User } from '../models/User.js';
import { generatePassword } from '../utils/user.js';
import { inviteExpiresAtFromNow } from '../utils/invite.js';
import { includesId, idStr } from '../utils/imposterGame.js';
import { isValidEmail } from '../utils/emailParse.js';
import { sendImposterGameInviteEmail } from './mailer.js';

export async function inviteEmailToImposterGame(game, email, hostUser) {
  if (!isValidEmail(email)) {
    throw new Error('Invalid email address');
  }

  if (idStr(hostUser._id) && email === hostUser.email?.toLowerCase()) {
    throw new Error('You cannot invite yourself');
  }

  let user = await User.findOne({ email });
  let isNew = false;
  let tempPassword = null;

  if (!user) {
    tempPassword = generatePassword();
    const inviteExpiresAt = inviteExpiresAtFromNow();
    user = await User.create({
      email,
      password: tempPassword,
      role: 'user',
      mustChangePassword: true,
      inviteStatus: 'sent',
      invitedAt: new Date(),
      inviteExpiresAt,
      createdBy: hostUser._id,
    });
    isNew = true;
  }

  if (!includesId(game.invitedUserIds, user._id)) {
    game.invitedUserIds.push(user._id);
  }

  try {
    await sendImposterGameInviteEmail({
      to: email,
      tempPassword: isNew ? tempPassword : null,
      expiresAt: isNew ? user.inviteExpiresAt : null,
      hostEmail: hostUser.email,
    });
  } catch (err) {
    if (isNew) {
      await user.deleteOne();
      game.invitedUserIds = game.invitedUserIds.filter((id) => idStr(id) !== idStr(user._id));
    }
    throw err;
  }

  return { isNew, userId: user._id.toString() };
}
