import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { initNakama } from './services/nakama';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import Result from './pages/Result';

function App() {
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [needsNickname, setNeedsNickname] = useState(false);
  const gameState = useGameStore(state => state.gameState);

  useEffect(() => {
    const savedName = localStorage.getItem("nickname");
    if (!savedName) {
      setNeedsNickname(true);
      setLoading(false);
    } else {
      connectToNakama(savedName);
    }
  }, []);

  const connectToNakama = async (name: string) => {
    setLoading(true);
    try {
      await initNakama(name);
      localStorage.setItem("nickname", name);
      setNeedsNickname(false);
    } catch (err) {
      console.error(err);
      alert("Failed to connect to game server. Is it running?");
    } finally {
      setLoading(false);
    }
  };

  const handleNicknameSubmit = () => {
    if (nickname.trim().length > 0) {
      connectToNakama(nickname.trim());
    }
  };

  if (loading) {
    return (
      <div className="App d-flex align-items-center justify-content-center">
        <div className="spinner-border text-teal" style={{color: 'var(--accent-green)'}} role="status" />
      </div>
    );
  }

  return (
    <div className={`App ${gameState && gameState.status !== 'FINISHED' ? 'bg-teal-theme' : 'bg-dark-theme'}`}>
      
      {/* Modal for Username Overlay */}
      {needsNickname && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in p-0">
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom" style={{borderColor: 'rgba(255,255,255,0.05)'}}>
              <h6 className="m-0 fw-semibold">Who are you?</h6>
              {/* Optional close button if they want to stay anonymous, but here we enforce it */}
            </div>
            <div className="p-4" style={{background: '#111827'}}>
              <input 
                type="text"
                autoFocus
                maxLength={12}
                placeholder="Nickname"
                className="input-minimal w-100 mb-3"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNicknameSubmit()}
                style={{background: '#1f2937', textAlign: 'left', padding: '12px 16px'}}
              />
            </div>
            <div className="p-3 d-flex justify-content-end border-top" style={{borderColor: 'rgba(255,255,255,0.05)'}}>
              <button 
                className="btn-primary py-2 px-3"
                style={{fontSize: '13px'}}
                onClick={handleNicknameSubmit}
                disabled={!nickname.trim()}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {!needsNickname && !gameState && <Lobby />}
      {gameState?.status === 'FINISHED' && <Result />}
      {gameState?.status !== 'FINISHED' && gameState && <Game />}
    </div>
  );
}

export default App;
