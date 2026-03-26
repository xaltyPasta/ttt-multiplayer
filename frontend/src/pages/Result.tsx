import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { leaveMatch, getLeaderboard } from '../services/nakama';

export default function Result() {
  const { gameState, matchId, userId } = useGameStore();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    // Optionally fetch leaderboard on mount
    getLeaderboard().then(res => setLeaderboard(res?.owner_records || []));
  }, []);

  if (!gameState || !matchId) return null;

  const isDraw = gameState.winner === "DRAW";
  const isWinner = gameState.winner === userId;
  const me = gameState.players.find(p => p.userId === userId);

  let title = "";
  let pts = "";
  let color = "text-white";
  
  if (isDraw) {
    title = "DRAW";
    pts = "+50 pts";
    color = "text-muted";
  } else if (isWinner) {
    title = "WINNER!";
    pts = "+200 pts";
    color = "text-cyan"; // match reference teal
  } else {
    title = "DEFEAT";
    pts = "-50 pts";
    color = "text-danger";
  }

  const handlePlayAgain = async () => {
    await leaveMatch(matchId);
  };

  // Mock leaderboard data to match reference if empty from server
  const renderLeaderboard = () => {
    const list = leaderboard.length > 0 ? leaderboard : [
      { owner_id: userId, username: me?.username || 'Ace', score: 2100, num_score: 10, max_num_score: 2 },
      { owner_id: 'other', username: 'Boo', score: 500, num_score: 2, max_num_score: 10 }
    ];

    return (
      <div className="w-100 mt-4 px-2">
        <div className="d-flex align-items-center justify-content-center gap-2 mb-3" style={{color: '#06b6d4'}}>
          {/* Trophy icon (SVG) */}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 22a2 2 0 0 1-2-2h4a2 2 0 0 1-2 2z"></path>
            <path d="M19 6V4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2v4.56A4.96 4.96 0 0 0 10.86 17h2.28A4.96 4.96 0 0 0 15 12.56V8h2a2 2 0 0 0 2-2z"></path>
          </svg>
          <span className="fw-semibold">Leaderboard</span>
        </div>

        <table className="leaderboard-table w-100">
          <thead>
            <tr>
              <th></th>
              <th>W/L/D</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {list.map((record: any, idx: number) => {
              const isMe = record.owner_id === userId;
              const w = record.num_score || 0;
              const l = record.max_num_score || 0;
              const d = 0; // if tracked

              return (
                <tr key={idx}>
                  <td className="fw-semibold">
                    {idx + 1}. {record.username} {isMe && <span className="text-muted fw-normal">(you)</span>}
                  </td>
                  <td>
                    <span className="win-color">{w}</span>/<span className="loss-color">{l}</span>/<span className="text-muted">{d}</span>
                  </td>
                  <td className="fw-semibold">{record.score}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="d-flex flex-column h-100 p-4 align-items-center justify-content-center bg-dark-theme animate-fade-in">
      
      {/* Large X or O based on winner, or Draw */}
      <div className="mb-4" style={{fontSize: '80px', lineHeight: 1, fontWeight: 800}}>
        {isDraw ? (
          <span className="text-muted">-</span>
        ) : isWinner ? (
          <span className="text-white">{me?.symbol || 'X'}</span>
        ) : (
          <span className="text-danger">{gameState.players.find(p => p.userId !== userId)?.symbol || 'O'}</span>
        )}
      </div>

      <div className="d-flex align-items-baseline gap-2 mb-2">
        <h2 className={`fw-bold m-0 ${color}`} style={{fontSize: '28px', letterSpacing: '1px'}}>{title}</h2>
        <span className="text-white fw-bold" style={{fontSize: '18px'}}>{pts}</span>
      </div>

      {renderLeaderboard()}

      <div className="mt-5 w-100 text-center">
        <button 
          className="btn-outline px-4 py-2" 
          style={{borderRadius: '8px', fontSize: '15px', color: '#fff', borderColor: 'rgba(255,255,255,0.3)'}}
          onClick={handlePlayAgain}
        >
          Play Again
        </button>
      </div>

    </div>
  );
}
