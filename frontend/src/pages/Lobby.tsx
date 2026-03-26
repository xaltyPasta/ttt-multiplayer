import { useState, useEffect } from 'react';
import { findMatch } from '../services/nakama';
import type { GameMode } from '../store/gameStore';

export default function Lobby() {
  const [finding, setFinding] = useState(false);
  const [mode, setMode] = useState<GameMode>("classic");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: any;
    if (finding) {
      interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [finding]);

  const handleFindRandom = async () => {
    setFinding(true);
    try {
      await findMatch(mode);
    } catch {
      alert("Matchmaking failed or was cancelled.");
      setFinding(false);
    }
  };

  const handleCancel = () => {
    setFinding(false);
    // Ideally socket.removeMatchmaker, but reloading or disconnecting simple state is easier for sample.
    window.location.reload(); 
  };

  if (finding) {
    return (
      <div className="d-flex flex-column h-100 p-4 align-items-center justify-content-center text-center animate-fade-in">
        <h3 className="fw-semibold mb-3">Finding a random player...</h3>
        <p className="text-muted mb-5">It usually takes 26 seconds.</p>
        <p className="text-muted small mb-4">Elapsed: {elapsed}s</p>
        <button className="btn-outline px-4 py-2" style={{fontSize: '14px', borderRadius: '4px'}} onClick={handleCancel}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column h-100 p-4 justify-content-center align-items-center text-center animate-fade-in">
      <div className="mb-5">
        <h1 className="fw-bold mb-2">Tic-Tac-Toe</h1>
        <p className="text-muted">Multiplayer server-authoritative</p>
      </div>

      <div className="w-100" style={{maxWidth: '280px'}}>
        <label className="fw-semibold mb-3 text-muted" style={{fontSize: "0.9rem"}}>Choose Mode</label>
        <div className="d-flex gap-2 mb-4">
          <button 
            className={`btn-outline flex-fill ${mode === 'classic' ? 'bg-light text-dark border-light' : ''}`}
            onClick={() => setMode('classic')}
            style={mode === 'classic' ? {fontWeight: 600} : {}}
          >
            Classic
          </button>
          <button 
            className={`btn-outline flex-fill ${mode === 'timed' ? 'bg-light text-dark border-light' : ''}`}
            onClick={() => setMode('timed')}
            style={mode === 'timed' ? {fontWeight: 600} : {}}
          >
            Timed
          </button>
        </div>
        <button className="btn-primary w-100 py-3" style={{fontSize: '16px'}} onClick={handleFindRandom}>
          Find Random Player
        </button>
      </div>
    </div>
  );
}
