import { useImposterGame } from '../hooks/useImposterGame';
import ImposterGameHost from './ImposterGameHost';
import ImposterPlayerView from './ImposterPlayerView';

export default function ImposterTab() {
  const { game, loading } = useImposterGame();

  if (loading && !game) {
    return (
      <div className="panel">
        <p className="muted">Loading game…</p>
      </div>
    );
  }

  if (!game || game.isHost) {
    return <ImposterGameHost embedded />;
  }

  return <ImposterPlayerView />;
}
