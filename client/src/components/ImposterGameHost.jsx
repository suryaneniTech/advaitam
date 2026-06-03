import { useEffect, useState } from 'react';
import UserAvatar from './UserAvatar';
import { useImposterGame, gameStatusLabel } from '../hooks/useImposterGame';
import { api } from '../api/client';

export default function ImposterGameHost({ embedded = false }) {
  const { game, loading, error, refresh, setError } = useImposterGame();
  const [inviteEmails, setInviteEmails] = useState('');
  const [word, setWord] = useState('');
  const [randomImposter, setRandomImposter] = useState(false);
  const [imposterUserId, setImposterUserId] = useState('');
  const [generateRandomWord, setGenerateRandomWord] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  const minPlayers = game?.minPlayersRequired ?? 3;
  const hostId = game?.hostUserId;
  const joinedPlayers = (game?.players || []).filter((p) => p.id !== hostId);
  const invitedPlayers = game?.invitedPlayers || [];
  const joinedCount = game?.joinedPlayerCount ?? joinedPlayers.length;
  const canStart = joinedCount >= minPlayers;
  const canManage = !game || game.isHost;

  useEffect(() => {
    if (game?.imposterUserId) {
      setImposterUserId(game.imposterUserId);
    }
  }, [game?.imposterUserId]);

  const runAction = async (action, successMsg) => {
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const result = await action();
      if (successMsg) setSuccess(successMsg);
      else if (result?.message) setSuccess(result.message);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuggestWord = async () => {
    setError('');
    try {
      const { word: suggested } = await api.suggestImposterWord();
      setWord(suggested);
      setGenerateRandomWord(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleInvite = (e) => {
    e.preventDefault();
    runAction(async () => {
      const result = await api.inviteToImposter(inviteEmails);
      setInviteEmails('');
      return result;
    });
  };

  if (!canManage) {
    return null;
  }

  const content = (
    <>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-info">{success}</div>}

      <section className="panel">
        <h2>{game ? 'Invite players' : 'Host a game'}</h2>
        <p className="muted">
          Enter email addresses to invite. New users receive a temporary password by email.
          You need at least {minPlayers} players to start (host does not play).
        </p>

        <form className="game-invite-form" onSubmit={handleInvite}>
          <label className="field">
            <span>Email addresses</span>
            <textarea
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              placeholder="player@example.com, friend@example.com"
              rows={3}
              required
            />
          </label>
          <p className="auth-hint">Separate multiple emails with commas, spaces, or new lines.</p>
          <button type="submit" className="btn btn-primary" disabled={submitting || !inviteEmails.trim()}>
            {submitting ? 'Sending invites…' : game ? 'Send invites' : 'Host game & send invites'}
          </button>
        </form>

        {(invitedPlayers.length > 0 || joinedPlayers.length > 0) && (
          <div className="game-roster">
            {invitedPlayers.length > 0 && (
              <div>
                <h3>Invited — waiting to join</h3>
                <ul className="game-player-list">
                  {invitedPlayers.map((p) => (
                    <li key={p.id} className="game-player-row">
                      <UserAvatar user={p} size="sm" />
                      <span className="game-player-email">{p.email}</span>
                      <span className="game-badge">Invited</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {joinedPlayers.length > 0 && (
              <div>
                <h3>Joined</h3>
                <ul className="game-player-list">
                  {joinedPlayers.map((p) => (
                    <li key={p.id} className="game-player-row">
                      <UserAvatar user={p} size="sm" />
                      <span className="game-player-email">{p.email}</span>
                      <span className="game-badge">Joined</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {game && (
        <section className="panel">
          <div className="panel-header-row">
            <h2>Your game</h2>
            <span className="game-status-pill">{gameStatusLabel(game.status)}</span>
          </div>

          {game.status === 'lobby' && (
            <>
              <p className="muted">
                {joinedCount} / {minPlayers} player{minPlayers !== 1 ? 's' : ''} joined
                {!canStart && ` — need ${minPlayers - joinedCount} more`}
              </p>

              <div className="game-setup">
                <label className="field">
                  <span>Secret word</span>
                  <div className="input-row">
                    <input
                      value={word}
                      onChange={(e) => {
                        setWord(e.target.value);
                        setGenerateRandomWord(false);
                      }}
                      placeholder="Enter a word"
                      disabled={generateRandomWord}
                    />
                    <button type="button" className="btn btn-secondary" onClick={handleSuggestWord}>
                      Suggest
                    </button>
                  </div>
                </label>

                <label className="field-checkbox">
                  <input
                    type="checkbox"
                    checked={generateRandomWord}
                    onChange={(e) => setGenerateRandomWord(e.target.checked)}
                  />
                  <span>Generate random word on start</span>
                </label>

                <label className="field-checkbox">
                  <input
                    type="checkbox"
                    checked={randomImposter}
                    onChange={(e) => {
                      setRandomImposter(e.target.checked);
                      if (e.target.checked) setImposterUserId('');
                    }}
                  />
                  <span>Pick imposter randomly</span>
                </label>

                {!randomImposter && joinedPlayers.length > 0 && (
                  <label className="field">
                    <span>Imposter</span>
                    <select
                      value={imposterUserId}
                      onChange={(e) => setImposterUserId(e.target.value)}
                    >
                      <option value="">Select player…</option>
                      {joinedPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.email}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={submitting || !canStart}
                  onClick={() =>
                    runAction(
                      () =>
                        api.startImposterGame({
                          word,
                          randomImposter,
                          imposterUserId: imposterUserId || undefined,
                          generateRandomWord,
                        }),
                      'Game started'
                    )
                  }
                >
                  Start game
                </button>
              </div>
            </>
          )}

          {game.status === 'word' && (
            <div className="game-action-block">
              <div className="game-word-card">
                <p>Secret word: <strong>{game.word}</strong></p>
                {game.imposterWord && (
                  <p>Imposter decoy word: <strong>{game.imposterWord}</strong></p>
                )}
                {game.imposterUserId && (
                  <p className="muted">
                    Imposter:{' '}
                    {joinedPlayers.find((p) => p.id === game.imposterUserId)?.email || 'Unknown'}
                  </p>
                )}
              </div>
              <p className="muted">Players see the secret word. The imposter sees only the decoy word.</p>
              <button
                type="button"
                className="btn btn-primary"
                disabled={submitting}
                onClick={() => runAction(() => api.beginImposterHints(), 'Hint round started')}
              >
                Start hint round
              </button>
            </div>
          )}

          {(game.status === 'hints' || game.status === 'voting' || game.status === 'elimination') && (
            <div className="game-live-state">
              <p><strong>Secret word:</strong> {game.word}</p>
              {game.imposterWord && <p><strong>Imposter decoy:</strong> {game.imposterWord}</p>}
              <p><strong>Round:</strong> {game.round}</p>
              {game.imposterUserId && (
                <p className="muted">
                  Imposter: {joinedPlayers.find((p) => p.id === game.imposterUserId)?.email}
                </p>
              )}

              {game.status === 'hints' && (
                <p className="muted">
                  Hints: {game.hints?.length || 0} / {game.activePlayers?.length || 0}
                  {game.allHintsSubmitted && ' — all submitted, voting opens automatically'}
                </p>
              )}

              {game.hints?.length > 0 && (
                <ul className="game-hints-list">
                  {game.hints.map((h) => (
                    <li key={h.userId}>
                      <strong>{h.email.split('@')[0]}:</strong> {h.hint}
                    </li>
                  ))}
                </ul>
              )}

              {game.status === 'voting' && (
                <p className="muted">
                  Votes: {(game.votes?.length || 0)} / {game.activePlayers?.length || 0}
                </p>
              )}

              {game.voteResults?.length > 0 && (
                <ul>
                  {game.voteResults.map((r) => (
                    <li key={r.userId}>
                      {r.email.split('@')[0]} — {r.votes} vote{r.votes !== 1 ? 's' : ''}
                    </li>
                  ))}
                </ul>
              )}

              {game.status === 'elimination' && game.pendingEliminationUserId && (
                <p>
                  Waiting for{' '}
                  <strong>
                    {joinedPlayers.find((p) => p.id === game.pendingEliminationUserId)?.email}
                  </strong>{' '}
                  to confirm if they are the imposter…
                </p>
              )}
            </div>
          )}

          {game.status === 'ended' && (
            <div className="game-ended">
              <p>{game.winner === 'players' ? 'Players win!' : 'Imposter wins!'}</p>
              <p>Word: <strong>{game.word}</strong></p>
              <p>
                Imposter:{' '}
                <strong>
                  {joinedPlayers.find((p) => p.id === game.imposterRevealed)?.email}
                </strong>
              </p>
            </div>
          )}

          {game.status !== 'lobby' && (
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={submitting}
                onClick={() => runAction(() => api.resetImposterGame(), 'Game reset')}
              >
                Reset game
              </button>
              {game.status !== 'ended' && (
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={submitting}
                  onClick={() => runAction(() => api.endImposterGame(), 'Game ended')}
                >
                  End game
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {!game && !loading && (
        <section className="panel">
          <p className="muted">Enter emails above to create a lobby and send invites.</p>
        </section>
      )}
    </>
  );

  if (embedded) {
    return <div className="imposter-host embedded">{content}</div>;
  }

  return (
    <div className="page-content">
      <header className="page-header">
        <h1>Mithya / Imposter</h1>
        <p className="page-subtitle">
          Invite players by email, then run the game. The host does not play.
        </p>
      </header>
      {content}
    </div>
  );
}
