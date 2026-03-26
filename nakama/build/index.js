var TICK_RATE = 5;
var TURN_TIMEOUT_SEC = 30;
var DISCONNECT_GRACE_SEC = 15;
var WIN_PATTERNS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];
var OPCODES = {
    MATCH_INFO: 1,
    MOVE: 2,
    ERROR: 3
};
function rpcCreateMatch(context, logger, nk, payload) {
    var mode = "classic";
    if (payload) {
        try {
            var parsed = JSON.parse(payload);
            if (parsed.mode === "timed")
                mode = "timed";
        }
        catch (e) {
            logger.error("Failed to parse create_match payload.");
        }
    }
    var matchId = nk.matchCreate("tic_tac_toe", { mode: mode });
    return JSON.stringify({ matchId: matchId });
}
function rpcJoinMatch(context, logger, nk, payload) {
    if (!payload) {
        throw new Error("Payload required");
    }
    var data;
    try {
        data = JSON.parse(payload);
    }
    catch (e) {
        throw new Error("Invalid payload JSON");
    }
    var matchId = data.matchId;
    if (!matchId) {
        throw new Error("matchId is required");
    }
    return JSON.stringify({
        matchId: matchId,
        message: "Use socket.joinMatch(matchId) to actually join"
    });
}
function rpcAutoMatch(context, logger, nk, payload) {
    var mode = "classic";
    if (payload) {
        try {
            var parsed = JSON.parse(payload);
            if (parsed.mode === "timed") {
                mode = "timed";
            }
        }
        catch (e) {
            logger.error("Invalid payload in auto_match");
        }
    }
    var matches = nk.matchList(10, true, "label.mode:".concat(mode), 0, 1, "");
    if (matches.length > 0) {
        return JSON.stringify({
            matchId: matches[0].matchId,
            created: false
        });
    }
    var matchId = nk.matchCreate("tic_tac_toe", { mode: mode });
    return JSON.stringify({
        matchId: matchId,
        created: true
    });
}
function rpcListMatches(context, logger, nk, payload) {
    var limit = 10;
    var isAuthoritative = true;
    var minSize = 0;
    var maxSize = 1;
    var modeFilter = "";
    if (payload) {
        try {
            var data = JSON.parse(payload);
            if (data.mode) {
                modeFilter = "label.mode:" + data.mode;
            }
        }
        catch (e) { }
    }
    var matches = nk.matchList(limit, isAuthoritative, modeFilter, minSize, maxSize, "");
    return JSON.stringify({ matches: matches });
}
function updateLeaderboard(nk, logger, userId, username, isWinner, isDraw) {
    var LEADERBOARD_ID = "ttt_global";
    var LEADERBOARD_AUTHORITATIVE = true;
    var LEADERBOARD_SORT_ORDER = nkruntime.SortOrder.DESCENDING;
    var LEADERBOARD_OPERATOR = nkruntime.Operator.INCREMENT;
    var LEADERBOARD_RESET = "0 0 * * 1";
    try {
        nk.leaderboardCreate(LEADERBOARD_ID, LEADERBOARD_AUTHORITATIVE, LEADERBOARD_SORT_ORDER, LEADERBOARD_OPERATOR, LEADERBOARD_RESET);
    }
    catch (e) {
    }
    var objIds = [{ collection: "stats", key: "profile", userId: userId }];
    var objects = nk.storageRead(objIds);
    var stats = { wins: 0, losses: 0, streak: 0 };
    if (objects && objects.length > 0) {
        stats = objects[0].value;
    }
    if (isWinner) {
        stats.wins++;
        stats.streak++;
    }
    else if (!isDraw) {
        stats.losses++;
        stats.streak = 0;
    }
    var score = (stats.wins * 10) + (stats.streak * 5);
    var writeReq = {
        collection: "stats",
        key: "profile",
        userId: userId,
        value: stats,
        permissionRead: 2,
        permissionWrite: 0
    };
    nk.storageWrite([writeReq]);
    nk.leaderboardRecordWrite(LEADERBOARD_ID, userId, username, score, 0, stats);
}
function rpcGetLeaderboard(context, logger, nk, payload) {
    var limit = 10;
    var records = nk.leaderboardRecordsList("ttt_global", [], limit, undefined);
    return JSON.stringify(records);
}
function matchInit(ctx, logger, nk, params) {
    logger.debug("Match created with params: " + JSON.stringify(params));
    var mode = (params.mode === "timed") ? "timed" : "classic";
    var state = {
        board: ["", "", "", "", "", "", "", "", ""],
        players: [],
        currentTurn: "",
        status: "WAITING",
        winner: null,
        mode: mode,
        moveDeadline: null,
        lastMoveId: null,
        disconnects: {}
    };
    return {
        state: state,
        tickRate: TICK_RATE,
        label: JSON.stringify({ mode: state.mode, open: 1 })
    };
}
function getExistingPlayer(players, userId) {
    for (var i = 0; i < players.length; i++) {
        if (players[i].userId === userId)
            return players[i];
    }
    return undefined;
}
function matchJoinAttempt(ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
    var s = state;
    if (s.players.length >= 2) {
        var existing = getExistingPlayer(s.players, presence.userId);
        if (existing) {
            return { state: s, accept: true };
        }
        return { state: s, accept: false, rejectReason: "Match is full" };
    }
    return { state: s, accept: true };
}
function matchJoin(ctx, logger, nk, dispatcher, tick, state, presences) {
    var s = state;
    var stateChanged = false;
    for (var i = 0; i < presences.length; i++) {
        var presence = presences[i];
        var existing = getExistingPlayer(s.players, presence.userId);
        if (existing) {
            existing.sessionId = presence.sessionId;
            delete s.disconnects[presence.userId];
            logger.debug("Player reconnected: " + presence.userId);
            stateChanged = true;
        }
        else if (s.players.length < 2) {
            var isX = s.players.length === 0 || s.players[0].symbol === "O";
            var symbol = isX ? "X" : "O";
            s.players.push({
                userId: presence.userId,
                sessionId: presence.sessionId,
                username: presence.username,
                symbol: symbol
            });
            logger.debug("Player joined: " + presence.userId + " as " + symbol);
            stateChanged = true;
        }
    }
    if (s.players.length === 2 && s.status === "WAITING") {
        s.status = "PLAYING";
        s.currentTurn = s.players[0].symbol === "X" ? s.players[0].userId : s.players[1].userId;
        if (s.mode === "timed") {
            s.moveDeadline = Math.floor(Date.now() / 1000) + TURN_TIMEOUT_SEC;
        }
        dispatcher.matchLabelUpdate(JSON.stringify({ mode: s.mode, open: 0 }));
        stateChanged = true;
    }
    if (stateChanged) {
        broadcastState(dispatcher, s);
    }
    return { state: s };
}
function matchLoop(ctx, logger, nk, dispatcher, tick, state, messages) {
    var s = state;
    var stateChanged = false;
    var now = Math.floor(Date.now() / 1000);
    for (var i = 0; i < messages.length; i++) {
        var message = messages[i];
        if (s.status === "PLAYING" && message.opCode === OPCODES.MOVE) {
            try {
                var data = JSON.parse(nk.binaryToString(message.data));
                var position = data.position;
                var moveId = data.moveId;
                if (message.sender.userId !== s.currentTurn) {
                    dispatcher.broadcastMessage(OPCODES.ERROR, nk.stringToBinary("Not your turn"), [message.sender]);
                    continue;
                }
                if (moveId === s.lastMoveId) {
                    continue;
                }
                if (position < 0 || position > 8 || s.board[position] !== "") {
                    dispatcher.broadcastMessage(OPCODES.ERROR, nk.stringToBinary("Invalid move"), [message.sender]);
                    continue;
                }
                var player = getExistingPlayer(s.players, message.sender.userId);
                if (!player)
                    continue;
                s.board[position] = player.symbol;
                s.lastMoveId = moveId;
                checkWinOrDraw(s);
                if (s.status === "PLAYING") {
                    var opponentId = "";
                    for (var j = 0; j < s.players.length; j++) {
                        if (s.players[j].userId !== player.userId)
                            opponentId = s.players[j].userId;
                    }
                    s.currentTurn = opponentId;
                    if (s.mode === "timed") {
                        s.moveDeadline = now + TURN_TIMEOUT_SEC;
                    }
                }
                stateChanged = true;
            }
            catch (e) {
                logger.error("Error processing move: " + e.message);
            }
        }
    }
    if (s.status === "PLAYING" && s.mode === "timed" && s.moveDeadline !== null) {
        if (now > s.moveDeadline) {
            var opponentId = "";
            for (var j = 0; j < s.players.length; j++) {
                if (s.players[j].userId !== s.currentTurn)
                    opponentId = s.players[j].userId;
            }
            if (opponentId !== "") {
                s.winner = opponentId;
                s.status = "FINISHED";
                stateChanged = true;
                handleMatchEnd(nk, logger, s);
            }
        }
    }
    for (var userId in s.disconnects) {
        var dTime = s.disconnects[userId];
        if (now - dTime > DISCONNECT_GRACE_SEC) {
            var opponentId = "";
            for (var j = 0; j < s.players.length; j++) {
                if (s.players[j].userId !== userId)
                    opponentId = s.players[j].userId;
            }
            if (opponentId !== "" && s.status === "PLAYING") {
                s.winner = opponentId;
                s.status = "FINISHED";
                stateChanged = true;
                logger.debug("Player " + userId + " disconnect timeout, " + opponentId + " wins");
                handleMatchEnd(nk, logger, s);
            }
        }
    }
    if (stateChanged) {
        broadcastState(dispatcher, s);
    }
    if (s.status === "FINISHED") {
        return null;
    }
    return { state: s };
}
function matchLeave(ctx, logger, nk, dispatcher, tick, state, presences) {
    var s = state;
    var now = Math.floor(Date.now() / 1000);
    for (var i = 0; i < presences.length; i++) {
        var presence = presences[i];
        s.disconnects[presence.userId] = now;
        logger.debug("Player disconnected: " + presence.userId);
    }
    broadcastState(dispatcher, s);
    return { state: s };
}
function matchTerminate(ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
    return { state: state };
}
function matchSignal(ctx, logger, nk, dispatcher, tick, state, data) {
    return { state: state, data: data };
}
function broadcastState(dispatcher, state) {
    dispatcher.broadcastMessage(OPCODES.MATCH_INFO, JSON.stringify(state));
}
function checkWinOrDraw(s) {
    for (var i = 0; i < WIN_PATTERNS.length; i++) {
        var pat = WIN_PATTERNS[i];
        var a = pat[0];
        var b = pat[1];
        var c = pat[2];
        if (s.board[a] !== "" && s.board[a] === s.board[b] && s.board[a] === s.board[c]) {
            var winnerSymbol = s.board[a];
            var winnerPlayerId = null;
            for (var j = 0; j < s.players.length; j++) {
                if (s.players[j].symbol === winnerSymbol)
                    winnerPlayerId = s.players[j].userId;
            }
            s.winner = winnerPlayerId;
            s.status = "FINISHED";
            return;
        }
    }
    var allFilled = true;
    for (var i = 0; i < s.board.length; i++) {
        if (s.board[i] === "")
            allFilled = false;
    }
    if (allFilled) {
        s.winner = "DRAW";
        s.status = "FINISHED";
        return;
    }
}
function handleMatchEnd(nk, logger, s) {
    for (var i = 0; i < s.players.length; i++) {
        var p = s.players[i];
        if (s.winner === "DRAW") {
            updateLeaderboard(nk, logger, p.userId, p.username, false, true);
        }
        else {
            var isWinner = (p.userId === s.winner);
            updateLeaderboard(nk, logger, p.userId, p.username, isWinner, false);
        }
    }
}
function InitModule(ctx, logger, nk, initializer) {
    logger.info("Initializing Tic-Tac-Toe Nakama Server...");
    initializer.registerMatch("tic_tac_toe", {
        matchInit: matchInit,
        matchJoinAttempt: matchJoinAttempt,
        matchJoin: matchJoin,
        matchLoop: matchLoop,
        matchLeave: matchLeave,
        matchTerminate: matchTerminate,
        matchSignal: matchSignal
    });
    initializer.registerRpc("create_match", rpcCreateMatch);
    initializer.registerRpc("join_match", rpcJoinMatch);
    initializer.registerRpc("auto_match", rpcAutoMatch);
    initializer.registerRpc("list_matches", rpcListMatches);
    initializer.registerRpc("get_leaderboard", rpcGetLeaderboard);
}
