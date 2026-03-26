import { create } from 'zustand';

export type GameMode = "classic" | "timed";

export interface Player {
    userId: string;
    sessionId: string;
    username: string;
    symbol: "X" | "O";
}

export interface GameState {
    board: string[];
    players: Player[];
    currentTurn: string;
    status: "WAITING" | "PLAYING" | "FINISHED";
    winner: string | null;
    mode: GameMode;
    moveDeadline: number | null;
    lastMoveId: string | null;
    disconnects: Record<string, number>;
}

interface StoreState {
    gameState: GameState | null;
    matchId: string | null;
    userId: string;
    username: string;
    setGameState: (state: GameState) => void;
    setMatchId: (id: string | null) => void;
    setUserInfo: (id: string, name: string) => void;
    reset: () => void;
}

export const useGameStore = create<StoreState>((set) => ({
    gameState: null,
    matchId: null,
    userId: "",
    username: "",
    setGameState: (state: GameState) => set({ gameState: state }),
    setMatchId: (id: string | null) => set({ matchId: id }),
    setUserInfo: (id: string, name: string) => set({ userId: id, username: name }),
    reset: () => set({ gameState: null, matchId: null })
}));
