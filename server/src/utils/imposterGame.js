import { User } from '../models/User.js';
import { getInitial } from './user.js';
import { isGameHost } from './imposterHost.js';

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

export function isUserActive(user) {
  if (!user?.lastActiveAt) return false;
  return Date.now() - new Date(user.lastActiveAt).getTime() < ACTIVE_WINDOW_MS;
}

export function formatPlayer(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    initial: getInitial(user.email),
    profileImage: user.profileImage || null,
    active: isUserActive(user),
    role: user.role,
  };
}

export async function loadPlayers(userIds) {
  if (!userIds?.length) return [];
  const users = await User.find({ _id: { $in: userIds } }).select('email profileImage lastActiveAt role');
  const byId = new Map(users.map((u) => [u._id.toString(), u]));
  return userIds
    .map((id) => byId.get(id.toString()))
    .filter(Boolean)
    .map(formatPlayer);
}

export function idStr(id) {
  return id?.toString();
}

export function includesId(list, userId) {
  return list.some((id) => idStr(id) === idStr(userId));
}

export function tallyVotes(votes, round) {
  const counts = new Map();
  for (const vote of votes.filter((v) => v.round === round)) {
    const key = idStr(vote.targetUserId);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

export function getTopVoted(counts) {
  let topId = null;
  let topCount = 0;
  for (const [userId, count] of counts) {
    if (count > topCount) {
      topId = userId;
      topCount = count;
    }
  }
  return topId ? { userId: topId, count: topCount } : null;
}

export function resolvePlayerWord(game, viewerId, canSeeHostView) {
  const inPlay = ['word', 'hints', 'voting', 'elimination'].includes(game.status);
  if (!inPlay) {
    return { word: null, imposterWord: null, isImposter: false };
  }

  const isImposter = idStr(game.imposterUserId) === viewerId;

  if (canSeeHostView) {
    return {
      word: game.word,
      imposterWord: game.imposterWord,
      isImposter: false,
    };
  }

  if (isImposter) {
    return {
      word: null,
      imposterWord: game.imposterWord,
      isImposter: true,
    };
  }

  return {
    word: game.word,
    imposterWord: null,
    isImposter: false,
  };
}

export function formatGameForViewer(game, viewer) {
  const viewerId = idStr(viewer._id);
  const host = isGameHost(viewer, game);
  const isJoined = includesId(game.joinedUserIds, viewerId);
  const isActivePlayer = includesId(game.activePlayerIds, viewerId);
  const isInvited = includesId(game.invitedUserIds, viewerId);
  const isEliminated = game.eliminated.some((e) => idStr(e.userId) === viewerId);
  const showWord = isJoined && game.word && ['word', 'hints', 'voting', 'elimination'].includes(game.status);
  const wordView = showWord
    ? resolvePlayerWord(game, viewerId, false)
    : { word: null, imposterWord: null, isImposter: false };

  const roundHints = game.hints.filter((h) => h.round === game.round);
  const roundVotes = game.votes.filter((v) => v.round === game.round);
  const myHint = roundHints.find((h) => idStr(h.userId) === viewerId);
  const myVote = roundVotes.find((v) => idStr(v.userId) === viewerId);

  const voteCounts = tallyVotes(game.votes, game.round);
  const pendingEliminationId = idStr(game.pendingEliminationUserId);

  return {
    id: game._id.toString(),
    status: game.status,
    round: game.round,
    word: wordView.word,
    imposterWord: wordView.imposterWord,
    isImposter: wordView.isImposter,
    isHost: host,
    hostUserId: idStr(game.createdBy),
    invited: isInvited,
    joined: isJoined,
    activePlayer: isActivePlayer,
    eliminated: isEliminated,
    canJoin: game.status === 'lobby' && isInvited && !isJoined,
    myHint: myHint?.hint || null,
    myVote: myVote ? idStr(myVote.targetUserId) : null,
    hintSubmitted: Boolean(myHint),
    voteSubmitted: Boolean(myVote),
    pendingEliminationUserId: game.status === 'elimination' ? pendingEliminationId : null,
    mustConfirmElimination: game.status === 'elimination' && pendingEliminationId === viewerId,
    winner: game.status === 'ended' ? game.winner : null,
    imposterRevealed:
      game.status === 'ended' && host ? idStr(game.imposterUserId) : null,
    players: null,
    hints: null,
    votes: null,
    eliminatedPlayers: null,
    voteResults: null,
    imposterUserId: null,
    randomImposter: host ? game.randomImposter : undefined,
  };
}

export async function enrichGameView(base, game, viewer) {
  const host = isGameHost(viewer, game);
  const viewerId = idStr(viewer._id);
  const hostId = idStr(game.createdBy);
  const players = await loadPlayers(game.joinedUserIds);
  const activePlayers = players.filter((p) => includesId(game.activePlayerIds, p.id));
  const roundHints = game.hints.filter((h) => h.round === game.round);

  const hostUser = await User.findById(game.createdBy).select('email profileImage lastActiveAt role');
  if (hostUser) {
    base.host = formatPlayer(hostUser);
  }

  base.players = players;
  base.activePlayers = activePlayers;
  base.joinedPlayerCount = players.filter((p) => p.id !== hostId).length;
  base.minPlayersRequired = 3;

  const pendingInviteIds = game.invitedUserIds.filter(
    (id) => !includesId(game.joinedUserIds, id) && idStr(id) !== hostId
  );
  base.invitedPlayers = await loadPlayers(pendingInviteIds);
  base.hints = roundHints.map((h) => {
    const player = players.find((p) => p.id === idStr(h.userId));
    return {
      userId: idStr(h.userId),
      email: player?.email || 'Unknown',
      initial: player?.initial || '?',
      hint: h.hint,
    };
  });

  const hintsNeeded = activePlayers.filter(
    (p) => !roundHints.some((h) => idStr(h.userId) === p.id)
  );
  base.hintsRemaining = hintsNeeded.length;
  base.allHintsSubmitted = game.status === 'hints' && hintsNeeded.length === 0 && activePlayers.length > 0;

  if (game.status === 'voting' || game.status === 'elimination' || game.status === 'ended') {
    const roundVotes = game.votes.filter((v) => v.round === game.round);
    base.votes = roundVotes.map((v) => ({
      voterId: idStr(v.userId),
      targetUserId: idStr(v.targetUserId),
    }));
    const voteCounts = tallyVotes(game.votes, game.round);
    base.voteResults = activePlayers
      .map((p) => ({
        userId: p.id,
        email: p.email,
        votes: voteCounts.get(p.id) || 0,
      }))
      .sort((a, b) => b.votes - a.votes);

    const votersNeeded = activePlayers.filter(
      (p) => !roundVotes.some((v) => idStr(v.userId) === p.id)
    );
    base.votesRemaining = votersNeeded.length;
    base.allVotesSubmitted = game.status === 'voting' && votersNeeded.length === 0 && activePlayers.length > 0;
  }

  base.eliminatedPlayers = game.eliminated.map((e) => {
    const player = players.find((p) => p.id === idStr(e.userId));
    return {
      userId: idStr(e.userId),
      email: player?.email || 'Unknown',
      round: e.round,
      voteCount: e.voteCount,
      confirmedImposter: e.confirmedImposter,
    };
  });

  if (host) {
    base.imposterUserId = idStr(game.imposterUserId);
    base.randomImposter = game.randomImposter;
    base.word = game.word;
    base.imposterWord = game.imposterWord;
    base.isHost = true;
  }

  if (game.status === 'ended') {
    base.imposterRevealed = idStr(game.imposterUserId);
    base.word = game.word;
    base.imposterWord = game.imposterWord;
    base.isImposter = idStr(game.imposterUserId) === viewerId;
  }

  if (game.status === 'elimination' && idStr(game.pendingEliminationUserId) === viewerId) {
    const eliminatedIsImposter = idStr(game.imposterUserId) === viewerId;
    if (!eliminatedIsImposter) {
      base.word = game.word;
    } else {
      base.imposterWord = game.imposterWord;
    }
  }

  return base;
}
