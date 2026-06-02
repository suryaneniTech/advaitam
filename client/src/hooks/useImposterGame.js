import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

export function useImposterGame(intervalMs = 3000) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const { game: current } = await api.getImposterGame();
      setGame(current);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  return { game, loading, error, refresh, setError };
}

export function gameStatusLabel(status) {
  switch (status) {
    case 'lobby':
      return 'Lobby — waiting for players';
    case 'word':
      return 'Word revealed — prepare hints';
    case 'hints':
      return 'Collecting hints';
    case 'voting':
      return 'Voting';
    case 'elimination':
      return 'Elimination';
    case 'ended':
      return 'Game ended';
    default:
      return status;
  }
}
