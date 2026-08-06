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

    function scheduleRoundReset() {
        if (roundResetTimer) {
            clearTimeout(roundResetTimer);
        }

        roundResetTimer = setTimeout(() => {
            gameState.reset();

            io.emit('game:round-reset');

            broadcastState();

            roundResetTimer = null;
        }, 8000);
    }

    io.on('connection', (socket) => {
        socket.emit(
            'state:init',
            gameState.snapshot()
        );

        socket.on('game:eat', (payload = {}) => {
            const result = gameState.consume(
                payload.eaterId,
                payload.targetId
            );

            if (!result.ok) {
                socket.emit(
                    'game:eat-rejected',
                    result
                );

                return;
            }

            io.emit(
                'game:eaten',
                result
            );

            broadcastState();

            if (result.winner) {
                io.emit(
                    'game:win',
                    {
                        winner: result.winner,
                        state: result.state
                    }
                );

                scheduleRoundReset();
            }
        });

        socket.on(
            'game:claim-win',
            (payload = {}) => {
                const result =
                    gameState.claimWinner(
                        payload.playerId,
                        payload.viewportMin,
                        payload.radius
                    );

                if (!result.ok) {
                    socket.emit(
                        'game:win-rejected',
                        result
                    );

                    return;
                }

                io.emit(
                    'game:win',
                    {
                        winner: result.winner,
                        state: result.state
                    }
                );

                broadcastState();
                scheduleRoundReset();
            }
        );
    });

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

        reset() {
            if (roundResetTimer) {
                clearTimeout(roundResetTimer);
                roundResetTimer = null;
            }

            io.emit('game:reset');
        },

        roundReset() {
            gameState.reset();

            io.emit('game:round-reset');

            broadcastState();
        }
    };
};