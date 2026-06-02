import { idStr } from './imposterGame.js';

export function isGameHost(user, game) {
  if (!user || !game) return false;
  if (user.role === 'admin') return true;
  return idStr(game.createdBy) === idStr(user._id);
}

export function isGameHostOnly(user, game) {
  return Boolean(user && game && idStr(game.createdBy) === idStr(user._id));
}
