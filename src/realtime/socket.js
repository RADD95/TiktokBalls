module.exports = function createSocketApi(
    io,
    gameState
) {
    let roundResetTimer = null;

    function broadcastState() {
        io.emit(
            'state:update',
            gameState.snapshot()
        );
    }

    function clearRoundResetTimer() {
        if (!roundResetTimer) {
            return;
        }

        clearTimeout(
            roundResetTimer
        );

        roundResetTimer = null;
    }

    function scheduleRoundReset() {
        clearRoundResetTimer();

        roundResetTimer = setTimeout(
            () => {
                gameState.reset();

                io.emit(
                    'game:round-reset'
                );

                broadcastState();

                roundResetTimer = null;
            },
            8000
        );
    }

    function emitTickResult(result) {
        if (!result) {
            broadcastState();

            return;
        }

for (
    const collision of result.eaten || []
) {
    if (
        collision.type ===
        'battle-hit'
    ) {
        io.emit(
            'game:battle-hit',
            collision
        );

        continue;
    }

    if (
        collision.type ===
        'battle-draw'
    ) {
        io.emit(
            'game:battle-draw',
            collision
        );

        continue;
    }

    io.emit(
        'game:eaten',
        collision
    );
}

        for (
            const winner of result.winners || []
        ) {
            io.emit(
                'game:win',
                {
                    winner,
                    state:
                        gameState.snapshot()
                }
            );

            scheduleRoundReset();
        }

        broadcastState();
    }

    function tick(deltaSeconds = 0.05) {
        const result =
            gameState.tick(
                deltaSeconds
            );

        emitTickResult(
            result
        );

        return result;
    }

    io.on(
        'connection',
        (socket) => {
            socket.emit(
                'state:init',
                gameState.snapshot()
            );

            socket.on(
                'game:eat',
                () => {
                    socket.emit(
                        'game:eat-rejected',
                        {
                            ok: false,
                            reason:
                                'server_authoritative'
                        }
                    );
                }
            );

            socket.on(
                'game:claim-win',
                () => {
                    socket.emit(
                        'game:win-rejected',
                        {
                            ok: false,
                            reason:
                                'server_authoritative'
                        }
                    );
                }
            );
        }
    );

    return {
        event(event) {
            io.emit(
                'game:event',
                event
            );
        },

        state() {
            broadcastState();
        },

        tick(deltaSeconds = 0.05) {
            return tick(
                deltaSeconds
            );
        },

        reset() {
            clearRoundResetTimer();

            io.emit(
                'game:reset'
            );
        },

        roundReset() {
            clearRoundResetTimer();

            gameState.reset();

            io.emit(
                'game:round-reset'
            );

            broadcastState();
        },

        scheduleRoundReset() {
            scheduleRoundReset();
        },

        clearRoundReset() {
            clearRoundResetTimer();
        }
    };
};