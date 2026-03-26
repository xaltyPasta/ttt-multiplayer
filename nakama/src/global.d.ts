declare namespace nkruntime {
    type Context = any;
    type Logger = any;
    type Nakama = any;
    type MatchDispatcher = any;
    type MatchMessage = any;
    type Presence = any;
    type Initializer = any;
    type MatchInitFunction = any;
    type MatchJoinAttemptFunction = any;
    type MatchJoinFunction = any;
    type MatchLoopFunction = any;
    type MatchLeaveFunction = any;
    type MatchTerminateFunction = any;
    type MatchSignalFunction = any;
    type StorageReadRequest = any;
    type StorageWriteRequest = any;
    
    enum SortOrder {
        ASCENDING = "asc",
        DESCENDING = "desc"
    }

    enum Operator {
        BEST = "best",
        SET = "set",
        INCREMENT = "increment",
        DECREMENT = "decrement"
    }
}
