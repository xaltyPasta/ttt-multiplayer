import { Client, Session } from "@heroiclabs/nakama-js";
import type { Socket, MatchData } from "@heroiclabs/nakama-js";
import { useGameStore } from "../store/gameStore";

let client: Client;
let session: Session;
let socket: Socket;

const OPCODES = {
    MATCH_INFO: 1,
    MOVE: 2,
    ERROR: 3
};

export const initNakama = async (username?: string) => {
    const host = import.meta.env.VITE_NAKAMA_HOST || "127.0.0.1";
    const port = import.meta.env.VITE_NAKAMA_PORT || "7350";
    const serverKey = import.meta.env.VITE_NAKAMA_KEY || "defaultkey";
    const useSSL = import.meta.env.VITE_NAKAMA_SSL === "true";

    client = new Client(serverKey, host, port, useSSL);
    
    const deviceId = localStorage.getItem("deviceId") || crypto.randomUUID();
    localStorage.setItem("deviceId", deviceId);
    
    session = await client.authenticateDevice(deviceId, true);
    socket = client.createSocket(useSSL, false);
    await socket.connect(session, true);

    if (username) {
        await client.updateAccount(session, {
            display_name: username,
            username: username
        });
    }

    const account = await client.getAccount(session);
    useGameStore.getState().setUserInfo(session.user_id!, account.user?.username || session.username!);

    socket.onmatchdata = (matchstate: MatchData) => {
        if (matchstate.op_code === OPCODES.MATCH_INFO) {
            const data = JSON.parse(new TextDecoder().decode(matchstate.data));
            useGameStore.getState().setGameState(data);
        } else if (matchstate.op_code === OPCODES.ERROR) {
            const err = new TextDecoder().decode(matchstate.data);
            console.error("Server Error: ", err);
        }
    };
    
    return session;
};

export const createMatch = async (mode: "classic" | "timed") => {
    const response = await client.rpc(session, "create_match", { mode });
    if (response.payload) {
        const { matchId } = JSON.parse(response.payload as any);
        await socket.joinMatch(matchId);
        useGameStore.getState().setMatchId(matchId);
        return matchId;
    }
};

export const joinMatch = async (matchId: string) => {
    await socket.joinMatch(matchId);
    useGameStore.getState().setMatchId(matchId);
};

export const leaveMatch = async (matchId: string) => {
    await socket.leaveMatch(matchId);
    useGameStore.getState().reset();
};

export const findMatch = async (mode: "classic" | "timed") => {
    const query = `properties.mode:${mode}`;
    await socket.addMatchmaker(query, 2, 2, { mode: mode });
    
    return new Promise<string>((resolve, reject) => {
        socket.onmatchmakermatched = async (matched) => {
            try {
                const match = await socket.joinMatch(matched.match_id);
                useGameStore.getState().setMatchId(match.match_id);
                resolve(match.match_id);
            } catch (err) {
                reject(err);
            }
        };
    });
};

export const listMatches = async (mode?: "classic" | "timed") => {
    const payload = mode ? { mode } : {};
    const res = await client.rpc(session, "list_matches", payload);
    if (res.payload) {
        return JSON.parse(res.payload as any).matches || [];
    }
    return [];
};

export const sendMove = async (matchId: string, position: number) => {
    const moveId = crypto.randomUUID();
    const payload = JSON.stringify({ position, moveId });
    await socket.sendMatchState(matchId, OPCODES.MOVE, payload);
};

export const getLeaderboard = async () => {
    const res = await client.rpc(session, "get_leaderboard", {});
    if (res.payload) {
        return JSON.parse(res.payload as any);
    }
    return [];
};
