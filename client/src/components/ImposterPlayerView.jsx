import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import { useImposterGame, gameStatusLabel } from '../hooks/useImposterGame';
import { api } from '../api/client';

function PlayerRow({ player, badge }) {
  return (
    <li className="game-player-row">
      <UserAvatar user={player} size="sm" />
      <div className="game-player-info">
        <span className="game-player-email">{player.email}</span>
        {badge && <span className="game-badge">{badge}</span>}
      </div>
      {player.active && <span className="game-active-dot" title="Online">Online</span>}
    </li>
  );
}

export default function ImposterPlayerView() {
  const { user } = useAuth();
  const { game, loading, error, refresh, setError } = useImposterGame();
  const [wordHidden, setWordHidden] = useState(true);
  const [hint, setHint] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [info, setInfo] = useState('');

  const runAction = async (action) => {
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !game) {
    return <div className="panel"><p className="muted">Loading game…</p></div>;
  }

  if (!game) {
    return (
      <div className="panel">
        <h2>Mithya / Imposter</h2>
        <p className="muted">No game in progress. Host a game from the Host tab above or wait for an invite.</p>
      </div>
    );
  }

  return (
    <div className="imposter-player">
      {error && <div className="alert alert-error">{error}</div>}
      {info && <div className="alert alert-info">{info}</div>}

      <div className="panel">
        <div className="panel-header-row">
          <h2>Mithya / Imposter</h2>
          <span className="game-status-pill">{gameStatusLabel(game.status)}</span>
        </div>
        {game.round > 1 && <p className="muted">Round {game.round}</p>}

        {game.status === 'lobby' && !game.invited && (
          <p className="muted">
            {game.host
              ? `${game.host.email} is hosting this game. Wait for an invite or ask them to invite you.`
              : 'You weren\'t invited to this game.'}
          </p>
        )}

        {game.status === 'lobby' && game.canJoin && (
          <div className="game-action-block">
            <p>You&apos;ve been invited to play!</p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={submitting}
              onClick={() => runAction(() => api.joinImposterGame())}
            >
              Join game
            </button>
          </div>
        )}

        {game.status === 'lobby' && game.invited && !game.joined && !game.canJoin && (
          <p className="muted">Waiting to join…</p>
        )}

        {game.status === 'lobby' && game.joined && (
          <p className="muted">You joined. Waiting for the admin to start the game…</p>
        )}

        {game.isImposter && game.status !== 'lobby' && game.status !== 'ended' && (
          <div className="game-word-card game-word-card-imposter">
            <div className="game-word-header">
              <span>You are the imposter</span>
              {game.imposterWord && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setWordHidden((v) => !v)}
                >
                  {wordHidden ? 'Show decoy word' : 'Hide decoy word'}
                </button>
              )}
            </div>
            {game.imposterWord ? (
              <>
                <p className="muted game-imposter-note">
                  You do not know the secret word. This decoy word is different from what others see.
                </p>
                <p className={`game-word${wordHidden ? ' hidden' : ''}`}>
                  {wordHidden ? '••••••••' : game.imposterWord}
                </p>
              </>
            ) : (
              <p className="game-word hidden">No word assigned</p>
            )}
            <p className="game-word-hint muted">Tap hide before showing your screen to others.</p>
          </div>
        )}

        {!game.isImposter && game.word && game.status !== 'lobby' && game.status !== 'ended' && (
          <div className="game-word-card">
            <div className="game-word-header">
              <span>Secret word</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setWordHidden((v) => !v)}
              >
                {wordHidden ? 'Show word' : 'Hide word'}
              </button>
            </div>
            <p className={`game-word${wordHidden ? ' hidden' : ''}`}>
              {wordHidden ? '••••••••' : game.word}
            </p>
            <p className="game-word-hint muted">Tap hide before showing your screen to others.</p>
          </div>
        )}

        {game.status === 'hints' && game.activePlayer && !game.hintSubmitted && (
          <form
            className="game-action-block"
            onSubmit={(e) => {
              e.preventDefault();
              runAction(async () => {
                await api.submitImposterHint(hint);
                setHint('');
                setInfo('Hint submitted');
              });
            }}
          >
            <label className="field">
              <span>Your hint for the word</span>
              <input
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="Give a clue without saying the word"
                maxLength={80}
                required
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={submitting || !hint.trim()}>
              Submit hint
            </button>
          </form>
        )}

        {game.status === 'hints' && game.hintSubmitted && (
          <p className="muted">Hint submitted. Waiting for other players… ({game.hintsRemaining} left)</p>
        )}

        {game.status === 'hints' && game.hints?.length > 0 && (
          <div className="game-hints-list">
            <h3>Hints this round</h3>
            <ul>
              {game.hints.map((h) => (
                <li key={h.userId}>
                  <strong>{h.email.split('@')[0]}:</strong> {h.hint}
                </li>
              ))}
            </ul>
          </div>
        )}

        {game.status === 'voting' && game.activePlayer && !game.voteSubmitted && (
          <div className="game-action-block">
            <h3>Vote for the imposter</h3>
            <div className="game-vote-grid">
              {game.activePlayers
                ?.filter((p) => p.id !== user.id)
                .map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    className="btn btn-secondary game-vote-btn"
                    disabled={submitting}
                    onClick={() =>
                      runAction(async () => {
                        await api.submitImposterVote(player.id);
                        setInfo('Vote submitted');
                      })
                    }
                  >
                    <UserAvatar user={player} size="sm" />
                    <span>{player.email.split('@')[0]}</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {game.status === 'voting' && game.voteSubmitted && (
          <p className="muted">Vote submitted. Waiting for others… ({game.votesRemaining} left)</p>
        )}

        {game.status === 'elimination' && game.mustConfirmElimination && (
          <div className="game-action-block">
            <h3>You were voted out!</h3>
            <p>Were you the imposter?</p>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={submitting}
                onClick={() => runAction(() => api.confirmImposterElimination(true))}
              >
                Yes, I&apos;m the imposter
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={submitting}
                onClick={() => runAction(() => api.confirmImposterElimination(false))}
              >
                No, I&apos;m not
              </button>
            </div>
          </div>
        )}

        {game.status === 'elimination' && !game.mustConfirmElimination && (
          <p className="muted">
            Waiting for eliminated player to confirm…
          </p>
        )}

        {game.status === 'elimination' && game.voteResults?.length > 0 && (
          <div className="game-vote-results">
            <h3>Vote results</h3>
            <ul>
              {game.voteResults.map((r) => (
                <li key={r.userId}>
                  {r.email.split('@')[0]} — {r.votes} vote{r.votes !== 1 ? 's' : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {game.status === 'ended' && (
          <div className="game-ended">
            <h3>
              {game.winner === 'players' ? 'Players win!' : 'Imposter wins!'}
            </h3>
            {game.word && <p>The word was: <strong>{game.word}</strong></p>}
            {game.imposterRevealed && game.players && (
              <p>
                Imposter:{' '}
                <strong>
                  {game.players.find((p) => p.id === game.imposterRevealed)?.email || 'Unknown'}
                </strong>
              </p>
            )}
          </div>
        )}

        {game.eliminated && !game.activePlayer && game.status !== 'ended' && (
          <p className="muted">You were eliminated. Watch the game unfold.</p>
        )}
      </div>

      {game.players?.length > 0 && (
        <div className="panel">
          <h3>Players</h3>
          <ul className="game-player-list">
            {game.players.map((player) => {
              const eliminated = game.eliminatedPlayers?.some((e) => e.userId === player.id);
              const isActive = game.activePlayers?.some((p) => p.id === player.id);
              let badge = 'Joined';
              if (eliminated) badge = 'Out';
              else if (isActive && game.status !== 'lobby') badge = 'Playing';
              return <PlayerRow key={player.id} player={player} badge={badge} />;
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
