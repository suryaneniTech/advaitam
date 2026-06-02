import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { ImposterGame, getActiveGame } from '../models/ImposterGame.js';
import { generateWord, generateDecoyWord, isValidWord, normalizeWord } from '../utils/words.js';
import {
  formatGameForViewer,
  enrichGameView,
  formatPlayer,
  includesId,
  idStr,
  getTopVoted,
  tallyVotes,
} from '../utils/imposterGame.js';
import { isGameHost } from '../utils/imposterHost.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { parseInviteEmails } from '../utils/emailParse.js';
import { inviteEmailToImposterGame } from '../services/imposterInvite.js';

const router = Router();
const ACTIVE_WINDOW_MS = 5 * 60 * 1000;
const MIN_PLAYERS = 3;
const inviteLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 40 });

async function countJoinedPlayers(game) {
  const hostId = idStr(game.createdBy);
  return game.joinedUserIds.filter((id) => idStr(id) !== hostId).length;
}

async function requireActiveGameHost(req, res, next) {
  const game = await getActiveGame();
  if (!game) {
    return res.status(400).json({ message: 'No active game' });
  }
  if (!isGameHost(req.user, game)) {
    return res.status(403).json({ message: 'Only the game host can do this' });
  }
  req.game = game;
  next();
}

router.use(auth());

async function buildGameResponse(game, viewer) {
  const base = formatGameForViewer(game, viewer);
  return enrichGameView(base, game, viewer);
}

async function advanceToVotingIfReady(game) {
  if (game.status !== 'hints') return game;

  const activeIds = game.activePlayerIds.map(idStr);
  const roundHints = game.hints.filter((h) => h.round === game.round);
  const allSubmitted = activeIds.every((id) =>
    roundHints.some((h) => idStr(h.userId) === id)
  );

  if (!allSubmitted || activeIds.length === 0) return game;

  game.status = 'voting';
  await game.save();
  return game;
}

async function advanceToEliminationIfReady(game) {
  if (game.status !== 'voting') return game;

  const activeIds = game.activePlayerIds.map(idStr);
  const roundVotes = game.votes.filter((v) => v.round === game.round);
  const allVoted = activeIds.every((id) =>
    roundVotes.some((v) => idStr(v.userId) === id)
  );

  if (!allVoted || activeIds.length === 0) return game;

  const top = getTopVoted(tallyVotes(game.votes, game.round));
  if (!top) return game;

  game.status = 'elimination';
  game.pendingEliminationUserId = top.userId;
  await game.save();
  return game;
}

router.get('/active-users', async (req, res) => {
  const since = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const users = await User.find({
    _id: { $ne: req.user._id },
    lastActiveAt: { $gte: since },
  })
    .select('email profileImage lastActiveAt role')
    .sort({ lastActiveAt: -1 });

  res.json({ users: users.map(formatPlayer), minPlayers: MIN_PLAYERS });
});

router.get('/word/suggest', (_req, res) => {
  res.json({ word: generateWord() });
});

router.get('/game', async (req, res) => {
  const game = await getActiveGame();
  if (!game) {
    return res.json({ game: null });
  }
  res.json({ game: await buildGameResponse(game, req.user) });
});

router.post('/invite', inviteLimiter, async (req, res) => {
  const emails = parseInviteEmails(req.body?.emails ?? req.body?.email);

  if (emails.length === 0) {
    return res.status(400).json({ message: 'Enter at least one email address' });
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return res.status(503).json({
      message: 'Email invites require Gmail. Configure GMAIL_USER and GMAIL_APP_PASSWORD in server/.env',
    });
  }

  let game = await getActiveGame();
  if (game && !isGameHost(req.user, game)) {
    return res.status(403).json({ message: 'Another user is already hosting a game' });
  }

  if (!game) {
    game = await ImposterGame.create({
      status: 'lobby',
      invitedUserIds: [],
      joinedUserIds: [],
      activePlayerIds: [],
      createdBy: req.user._id,
    });
  }

  const results = [];

  for (const email of emails) {
    try {
      const outcome = await inviteEmailToImposterGame(game, email, req.user);
      results.push({ email, ok: true, isNew: outcome.isNew });
    } catch (err) {
      results.push({ email, ok: false, message: err.message });
    }
  }

  await game.save();

  const sent = results.filter((r) => r.ok).length;
  if (sent === 0) {
    return res.status(400).json({
      message: results[0]?.message || 'Could not send invites',
      results,
      game: await buildGameResponse(game, req.user),
    });
  }

  const created = results.filter((r) => r.ok && r.isNew).length;
  const message =
    created > 0
      ? `Sent ${sent} invite(s) (${created} new account${created !== 1 ? 's' : ''} with temporary password)`
      : `Sent ${sent} invite(s)`;

  res.json({
    message,
    results,
    game: await buildGameResponse(game, req.user),
  });
});

router.post('/join', async (req, res) => {
  const game = await getActiveGame();
  if (!game || game.status !== 'lobby') {
    return res.status(400).json({ message: 'No game lobby is open' });
  }

  const userId = req.user._id;
  if (idStr(game.createdBy) === idStr(userId)) {
    return res.status(403).json({ message: 'You are hosting this game and cannot join as a player' });
  }
  if (!includesId(game.invitedUserIds, userId)) {
    return res.status(403).json({ message: 'You were not invited to this game' });
  }
  if (includesId(game.joinedUserIds, userId)) {
    return res.json({ game: await buildGameResponse(game, req.user) });
  }

  game.joinedUserIds.push(userId);
  await game.save();

  res.json({ game: await buildGameResponse(game, req.user) });
});

router.post('/start', requireActiveGameHost, async (req, res) => {
  const { word, randomImposter, imposterUserId, generateRandomWord } = req.body;
  const game = req.game;

  if (game.status !== 'lobby') {
    return res.status(400).json({ message: 'Start a lobby and wait for players to join first' });
  }

  const playerCount = await countJoinedPlayers(game);
  if (playerCount < MIN_PLAYERS) {
    return res.status(400).json({
      message: `At least ${MIN_PLAYERS} players must join before starting (the host does not count)`,
    });
  }

  let finalWord = generateRandomWord ? generateWord() : normalizeWord(word);
  if (!isValidWord(finalWord)) {
    return res.status(400).json({ message: 'Enter a valid word or use generate random word' });
  }

  let imposterId = imposterUserId || null;
  const useRandom = Boolean(randomImposter);
  const joinedUsers = await User.find({
    _id: { $in: game.joinedUserIds, $ne: game.createdBy },
  }).select('_id');
  const playerIds = joinedUsers.map((u) => u._id);

  if (useRandom) {
    imposterId = playerIds[Math.floor(Math.random() * playerIds.length)];
  } else if (!imposterId || !playerIds.some((id) => idStr(id) === idStr(imposterId))) {
    return res.status(400).json({ message: 'Select an imposter from joined players or use random' });
  }

  game.word = finalWord;
  game.imposterWord = generateDecoyWord(finalWord);
  game.imposterUserId = imposterId;
  game.randomImposter = useRandom;
  game.activePlayerIds = playerIds;
  game.status = 'word';
  game.round = 1;
  game.hints = [];
  game.votes = [];
  game.eliminated = [];
  game.pendingEliminationUserId = null;
  game.winner = null;
  await game.save();

  res.json({
    message: 'Game started',
    game: await buildGameResponse(game, req.user),
  });
});

router.post('/begin-hints', requireActiveGameHost, async (req, res) => {
  const game = req.game;
  if (game.status !== 'word') {
    return res.status(400).json({ message: 'Game is not in the word phase' });
  }

  game.status = 'hints';
  await game.save();

  res.json({ game: await buildGameResponse(game, req.user) });
});

router.post('/hint', async (req, res) => {
  const { hint } = req.body;
  const trimmed = String(hint || '').trim();

  if (!trimmed || trimmed.length > 80) {
    return res.status(400).json({ message: 'Enter a hint (max 80 characters)' });
  }

  let game = await getActiveGame();
  if (!game || game.status !== 'hints') {
    return res.status(400).json({ message: 'Hints are not being collected right now' });
  }

  const userId = req.user._id;
  if (!includesId(game.activePlayerIds, userId)) {
    return res.status(403).json({ message: 'You are not an active player' });
  }

  const existing = game.hints.find(
    (h) => h.round === game.round && idStr(h.userId) === idStr(userId)
  );
  if (existing) {
    return res.status(400).json({ message: 'You already submitted a hint this round' });
  }

  game.hints.push({ userId, round: game.round, hint: trimmed });
  await game.save();

  game = await advanceToVotingIfReady(game);
  res.json({ game: await buildGameResponse(game, req.user) });
});

router.post('/vote', async (req, res) => {
  const { targetUserId } = req.body;
  if (!targetUserId) {
    return res.status(400).json({ message: 'Select a player to vote for' });
  }

  let game = await getActiveGame();
  if (!game || game.status !== 'voting') {
    return res.status(400).json({ message: 'Voting is not open right now' });
  }

  const userId = req.user._id;
  if (!includesId(game.activePlayerIds, userId)) {
    return res.status(403).json({ message: 'You are not an active player' });
  }

  if (!includesId(game.activePlayerIds, targetUserId)) {
    return res.status(400).json({ message: 'Invalid vote target' });
  }

  if (idStr(targetUserId) === idStr(userId)) {
    return res.status(400).json({ message: 'You cannot vote for yourself' });
  }

  const existing = game.votes.find(
    (v) => v.round === game.round && idStr(v.userId) === idStr(userId)
  );
  if (existing) {
    return res.status(400).json({ message: 'You already voted this round' });
  }

  game.votes.push({ userId, targetUserId, round: game.round });
  await game.save();

  game = await advanceToEliminationIfReady(game);
  res.json({ game: await buildGameResponse(game, req.user) });
});

router.post('/confirm-imposter', async (req, res) => {
  const { isImposter } = req.body;
  if (typeof isImposter !== 'boolean') {
    return res.status(400).json({ message: 'Confirm whether you are the imposter' });
  }

  const game = await getActiveGame();
  if (!game || game.status !== 'elimination') {
    return res.status(400).json({ message: 'No elimination to confirm' });
  }

  const userId = req.user._id;
  if (idStr(game.pendingEliminationUserId) !== idStr(userId)) {
    return res.status(403).json({ message: 'Only the eliminated player can confirm' });
  }

  const top = getTopVoted(tallyVotes(game.votes, game.round));
  game.eliminated.push({
    userId,
    round: game.round,
    voteCount: top?.count || 0,
    confirmedImposter: isImposter,
    confirmedAt: new Date(),
  });

  if (isImposter) {
    game.status = 'ended';
    game.winner = 'players';
    game.pendingEliminationUserId = null;
    await game.save();
    return res.json({ game: await buildGameResponse(game, req.user) });
  }

  game.activePlayerIds = game.activePlayerIds.filter(
    (id) => idStr(id) !== idStr(userId)
  );
  game.pendingEliminationUserId = null;
  game.round += 1;
  game.status = 'hints';
  await game.save();

  res.json({ game: await buildGameResponse(game, req.user) });
});

router.post('/end', requireActiveGameHost, async (req, res) => {
  const game = req.game;

  game.status = 'ended';
  game.winner = game.winner || 'imposter';
  game.pendingEliminationUserId = null;
  await game.save();

  res.json({ game: await buildGameResponse(game, req.user) });
});

router.post('/reset', requireActiveGameHost, async (req, res) => {
  const game = req.game;
  game.status = 'ended';
  game.winner = null;
  await game.save();
  res.json({ message: 'Game reset' });
});

export default router;
