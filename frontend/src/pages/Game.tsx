import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { sendMove, leaveMatch } from '../services/nakama';

export default function Game() {
  const { gameState, matchId, userId } = useGameStore();
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!gameState || !matchId) return null;

  const isMyTurn = gameState.currentTurn === userId;
  const me = gameState.players.find(p => p.userId === userId);
  const opponent = gameState.players.find(p => p.userId !== userId);

  const handleCellClick = (index: number) => {
    if (!isMyTurn || gameState.board[index] !== "") return;
    sendMove(matchId, index);
  };

  const handleLeave = async () => {
    if (window.confirm("Are you sure you want to leave?")) {
      await leaveMatch(matchId);
    }
  };

  const getTimeRemaining = () => {
    if (gameState.mode !== 'timed' || !gameState.moveDeadline) return null;
    const timeLeft = gameState.moveDeadline - now;
    return Math.max(0, timeLeft);
  };

  const timeRemaining = getTimeRemaining();

  return (
    <div className="d-flex flex-column h-100 p-4 align-items-center animate-fade-in" style={{color: '#fff'}}>
      
      {/* Top Players Header */}
      <div className="w-100 d-flex justify-content-center gap-5 mt-4 mb-4 text-center">
        <div style={{opacity: isMyTurn ? 1 : 0.6, transition: 'opacity 0.3s'}}>
          <div className="fw-bold" style={{fontSize: '18px', letterSpacing: '1px'}}>{me?.username?.toUpperCase() || 'P1'}</div>
          <div className="small" style={{color: 'rgba(255,255,255,0.7)'}}>(you)</div>
        </div>
        <div style={{opacity: !isMyTurn ? 1 : 0.6, transition: 'opacity 0.3s'}}>
          <div className="fw-bold" style={{fontSize: '18px', letterSpacing: '1px'}}>{opponent?.username?.toUpperCase() || 'P2'}</div>
          <div className="small" style={{color: 'rgba(255,255,255,0.7)'}}>(opp)</div>
        </div>
      </div>

      {/* Turn Indicator */}
      <div className="mb-5 d-flex align-items-center gap-2" style={{opacity: 0.9}}>
        <div style={{
          width: '24px', height: '24px', borderRadius: '50%', 
          border: '3px solid rgba(0,0,0,0.2)',
          backgroundColor: isMyTurn ? 'transparent' : 'rgba(0,0,0,0.1)'
        }} />
        <span className="fw-bold fs-4" style={{color: 'rgba(0,0,0,0.3)'}}>Turn</span>
        
        {timeRemaining !== null && (
          <span className="ms-3 badge bg-dark text-white rounded-pill px-3 py-2 animate-pulse">
            0:{timeRemaining.toString().padStart(2, '0')}
          </span>
        )}
      </div>

      {/* Board */}
      <div className="board-container w-100 mt-2 mb-auto">
        <div className="board">
          <div className="board-v1"></div>
          <div className="board-v2"></div>
          {gameState.board.map((cell, idx) => (
            <div
              key={idx}
              className={`cell ${cell.toLowerCase()}`}
              onClick={() => handleCellClick(idx)}
              style={(!isMyTurn || cell !== "") ? { cursor: 'default' } : {}}
            >
              {cell}
            </div>
          ))}
        </div>
      </div>

      {/* Leave Button Context */}
      <div className="mt-4 mb-3 w-100 text-center">
        <button 
          className="btn-outline px-4 py-2" 
          style={{borderRadius: '24px', fontSize: '13px', borderColor: 'rgba(0,0,0,0.2)', color: 'rgba(0,0,0,0.5)'}}
          onClick={handleLeave}
        >
          Leave room
        </button>
      </div>

    </div>
  );
}
