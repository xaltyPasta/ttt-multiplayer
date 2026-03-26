# ⚔️ Tic-Tac-Toe Multiplayer (Server-Authoritative)

A production-ready, real-time multiplayer Tic-Tac-Toe game engineered with a **server-authoritative architecture**. Built using [Nakama](https://heroiclabs.com/nakama/) for the backend game logic and [React/Vite](https://vitejs.dev/) for the frontend. The system ensures fair play by validating every move on the server and synchronizing state across clients via WebSockets.

### 🔗 Live Demo: [Frontend (Vercel)](https://ttt-multiplayer-v1.vercel.app) | [Backend (Render)](https://ttt-multiplayer-5myz.onrender.com)

### 📸 Screenshots
![Lobby](https://github.com/user-attachments/assets/placeholder-lobby)
![Game](https://github.com/user-attachments/assets/placeholder-game)

---

## ✨ Features

🎮 **Gameplay & Real-Time Sync**
- **Server-Authoritative Logic:** The server is the single source of truth. Prevents cheating and out-of-sync states.
- **WebSocket Synchronization:** Instant sync using WebSockets via Nakama's Match API.
- **Timer Mode:** Optional 30-second turn limit. Opponent wins automatically if time runs out.
- **Reconnect Support:** A 15-second grace period allows players to reconnect without losing progress.

🏢 **Lobby & Matchmaking**
- **Match Discovery:** List open matches and join with a single click.
- **Private Matches:** Create matches and share the Match ID for private play.
- **Auto-Matchmaking:** Quickly find an opponent based on your preferred game mode (Classic or Timed).

📊 **Progression & Stats**
- **Global Leaderboard:** Track wins and streaks. Wins grant 10 points, streaks add multipliers.
- **Player Profiles:** Persistent statistics (wins, losses, streaks) stored in Nakama's storage engine.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React, Vite, TypeScript, TailwindCSS, Zustand |
| **Backend** | Nakama (Heroic Labs), TypeScript Runtime |
| **Database** | PostgreSQL (Managed via Nakama) |
| **Communication** | WebSockets (Nakama Socket API) |
| **DevOps** | Docker, Docker Compose |
| **Deployment** | Vercel (Frontend), Render (Backend) |

---

## 📁 Project Structure

```text
tic-tac-toe-multiplayer/
│
├── frontend/                # React/Vite Client
│   ├── src/
│   │   ├── components/      # UI components (Grid, Board, Lobby UI)
│   │   ├── pages/           # Main views (Lobby, GamePage)
│   │   ├── services/        # Nakama-JS client initialization & RPC calls
│   │   └── store/           # Zustand state management (GameStore)
│   ├── .env                 # Frontend environment variables (Nakama Host/Key)
│   └── package.json
│
├── nakama/                  # Nakama Backend Logic (TypeScript)
│   ├── src/
│   │   ├── main.ts          # Core Match Handler, RPCs, & Global Logic
│   │   └── global.d.ts      # Nakama runtime type definitions
│   ├── build/               # Compiled JS modules for Nakama runtime
│   ├── data/                # Nakama configuration & modules storage
│   ├── tsconfig.json        # TS build config (ES5 output for Nakama)
│   └── package.json         # Build scripts (npm run build)
│
├── docker-compose.yml       # Local dev environment orchestration
└── README.md
```

---

## 🏗️ System Architecture

```text
      Player A (Client)                 Player B (Client)
             │                                 │
      WebSocket (JSON)                  WebSocket (JSON)
             ▼                                 ▼
    ┌───────────────────────────────────────────────────┐
    │                  Nakama Server                    │
    │  ┌─────────────────────────────────────────────┐  │
    │  │           Match Handler (TS Logic)          │  │
    │  │  - Validates Moves (Position/Turn)          │  │
    │  │  - Manages Turn Timers (30s limit)          │  │
    │  │  - Detects Win/Draw (8 Patterns)            │  │
    │  └──────────────────────┬──────────────────────┘  │
    │                         │                         │
    │               PostgreSQL Database                 │
    │        (Leaderboards, Accounts, Storage)          │
    └───────────────────────────────────────────────────┘
```

---

## 🖥️ Frontend Details

### Key Modules
- **GameStore (Zustand)**: Manages the global `GameState`, `matchId`, and user info. It listens to WebSocket updates and triggers UI re-renders.
- **Nakama Service**: Wrapper around `@heroiclabs/nakama-js`. Handles authentication, socket connection, and RPC invocation.
- **Lobby Page**: Handles match creation, joining via Match ID, and listing open matches.

### Communication Interfacing (`frontend/src/services/nakama.ts`)
- **`initNakama()`**: Authenticates the device and connects the WebSocket.
- **`createMatch(mode)`**: Invokes the `create_match` RPC on the server.
- **`sendMove(matchId, position)`**: Sends a `MOVE` opcode (2) with the selected board position.

---

## ⚙️ Backend Details (Nakama TS)

### Match Handler Logic
The match handler (`nakama/src/main.ts`) implements the following lifecycle:
1. **`matchInit`**: Initializes the 3x3 board and game state.
2. **`matchJoinAttempt`**: Ensures only 2 players can join a match.
3. **`matchLoop`**: Processes player moves, validates turns, checks for win/draw, and manages timers.
4. **`matchLeave`**: Handles player disconnects and starts the 15s grace period.

### Core RPCs
| RPC Name | Responsibility | Payload Example |
|---|---|---|
| `create_match` | Creates a new authoritative match on the server. | `{"mode": "classic"}` |
| `list_matches` | Filters and returns matches waiting for a 2nd player. | `{"mode": "timed"}` |
| `get_leaderboard` | Retrieves top rankings from the `ttt_global` leaderboard. | `{}` |

### Match Opcodes
- `1` (**MATCH_INFO**): Server broadcasts full `GameState` (board, turn, status).
- `2` (**MOVE**): Client sends `{position, moveId}` for validation.
- `3` (**ERROR**): Server broadcasts error messages (e.g., "Invalid move").

---

## 🗄️ Game State Representation

The server maintains the following state for every match:

```typescript
interface GameState {
    board: string[];                // ["X", "O", "", ...]
    players: Player[];              // [{userId, username, symbol}, ...]
    currentTurn: string;            // userId of the active player
    status: "WAITING" | "PLAYING" | "FINISHED";
    winner: string | null;          // userId, "DRAW", or null
    mode: "classic" | "timed";
    moveDeadline: number | null;    // Unix timestamp for turn expiry
    lastMoveId: string | null;      // Prevents duplicate move processing
    disconnects: Record<string, number>; // Reconnect grace period tracking
}
```

---

## 🔁 Gameplay Logical Flow

1. **Authentication**: Client calls `authenticateDevice` -> Nakama returns a session token.
2. **Matchmaking**: 
   - User clicks "Auto-Match" -> Client calls `list_matches`.
   - If a match is found with 1 player, join it via `socket.joinMatch`.
   - If not, call `create_match` RPC -> Server creates a match and returns `matchId`.
3. **Gameplay**:
   - Player A clicks a cell -> Client sends `OPCODE 2` with `position`.
   - Server receives move -> Validates turn and board state -> Updates `board` -> Broadcasts `OPCODE 1` (New State).
4. **Win Detection**: Server checks for 3-in-a-row -> If found, updates `status` to `FINISHED`, sets `winner`, and broadcasts final state.
5. **Stats**: Server updates the `ttt_global` leaderboard and player's storage objects.

---

## 🚀 Local Setup

### 1. Prerequisites
- **Node.js**: v18+
- **Docker & Docker Compose**: For running Nakama and Postgres.
- **curl**: For testing API endpoints via command line.

### 2. Build Nakama Modules
Compile the TypeScript logic into the `build/` folder:
```bash
cd nakama
npm install
npm run build
```

### 3. Start Backend
Run this from the project root:
```bash
docker-compose up -d
```
Nakama is now live at `http://127.0.0.1:7350`. Console: `http://127.0.0.1:7351`.

### 4. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Authentication & API Testing (curl)

### 1. Generate Auth Token
```bash
curl -X POST "http://127.0.0.1:7350/v2/account/authenticate/device?create=true&username=player1" \
     -H "Content-Type: application/json" \
     -H "Authorization: Basic $(echo -n 'defaultkey:' | base64)" \
     -d '{"id": "device_id_123"}'
```
**Output**: `{"token": "eyJhbG...", ...}`

### 2. Call an RPC (List Matches)
```bash
curl -X POST "http://127.0.0.1:7350/v2/rpc/list_matches?http_key=defaultkey" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <TOKEN_FROM_STEP_1>" \
     -d '{"mode": "classic"}'
```

---

## ☁️ Deployment

| Layer | Platform | Env Vars |
|---|---|---|
| **Frontend** | Vercel | `VITE_NAKAMA_HOST`, `VITE_NAKAMA_PORT`, `VITE_NAKAMA_KEY`, `VITE_NAKAMA_SSL` |
| **Backend** | Render | `DATABASE_URL`, `PORT`, `CORS_ORIGIN` |

---

## 🔮 Future Roadmap
- **Social Integration**: Friend lists and direct match invites.
- **Customization**: unlockable themes and icons via global points.
- **AI Opponent**: Single-player mode against a minimax-based bot.
