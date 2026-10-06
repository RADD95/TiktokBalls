// src/realtime/socket.js

module.exports = function createSocketApi(
    io,
    gameState,
    marblesManager,
    workspaceId = null
) {
    let roundResetTimer = null;

    function emit(event, data) {
        if (workspaceId) {
            io.to(workspaceId).emit(event, data);
            return;
        }

        io.emit(event, data);
    }

    function broadcastState() {
        emit(
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

function finishMarblesRound() {
        const players = gameState.list ? gameState.list() : [];
        if (!players.length) return;

        // 1. Obtener al jugador con mayor puntaje de la carrera
        const winner = [...players].sort((a, b) => (b.points || 0) - (a.points || 0))[0];

        if (winner) {
            // 2. Guardar explícitamente en el podio mediante el método del podio
            const podium = require('../server/podium');
            const savedWinner = podium.registerWinner('marbles', winner);

            // 3. Emitir el evento de victoria con la información actualizada del podio
            emit('game:win', {
                winner: savedWinner || winner,
                state: gameState.snapshot()
            });
        }

        // 4. Programar el reinicio automático tras 8 segundos
        scheduleRoundReset();
    }

function scheduleRoundReset() {
        clearRoundResetTimer();

        roundResetTimer = setTimeout(
            () => {
                gameState.reset();

                if (marblesManager && typeof marblesManager.resetToLobby === 'function') {
                    marblesManager.resetToLobby();
                }

                emit(
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
        emit(
            'game:battle-hit',
            collision
        );

        continue;
    }

    if (
        collision.type ===
        'battle-draw'
    ) {
        emit(
            'game:battle-draw',
            collision
        );

        continue;
    }

    emit(
        'game:eaten',
        collision
    );
}

        for (
            const winner of result.winners || []
        ) {
            emit(
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
        const result = gameState.tick(deltaSeconds, marblesManager.state);

        emitTickResult(result);

        return result;
    }

    io.on(
        'connection',
        (socket) => {
            if (
                workspaceId &&
                socket.data.workspaceId !== workspaceId
            ) {
                return;
            }

            if (workspaceId) {
                socket.join(workspaceId);
            }

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
        finishMarblesRound() {
            finishMarblesRound();
        },
        event(event) {
            emit(
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

            emit(
                'game:reset'
            );
        },

        roundReset() {
            clearRoundResetTimer();

            gameState.reset();

            emit(
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