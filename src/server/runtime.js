// src/server/runtime.js

'use strict';

const { MarblesRoundManager } = require('./game/marbles-round-manager');
const createSocketApi = require('../realtime/socket');
const settingsStore = require('./settings');
const playerColorsStore = require('./player-colors');
const podiumStore = require('./podium');
const pointsStore = require('./points');
const gameStateFactory = require('./game-state').create;
const tiktokFactory = require('./tiktok').create;

function createRuntime(io, workspaceId) {
    const scopedSettings = settingsStore.forWorkspace(workspaceId);
    const scopedColors = playerColorsStore.forWorkspace(workspaceId);
    const scopedPodium = podiumStore.forWorkspace(workspaceId);
    const scopedPoints = pointsStore.create({
        settings: scopedSettings,
        playerColors: scopedColors
    });
    const gameState = gameStateFactory({
        settings: scopedSettings,
        playerColors: scopedColors,
        podium: scopedPodium
    });
    const marblesManager = new MarblesRoundManager(scopedSettings);
    const realtime = createSocketApi(
        io,
        gameState,
        marblesManager,
        workspaceId
    );
    const tiktok = tiktokFactory({
        settings: scopedSettings,
        points: scopedPoints,
        gameState
    });

    // 🔑 VINCULACIÓN CRÍTICA: Inicializamos el módulo TikTok con la API realtime de este workspace
    tiktok.init(realtime);

    marblesManager.startLoop(
        roundData => {
            io.to(workspaceId).emit('marbles:round-tick', roundData);
        },
        () => realtime.finishMarblesRound()
    );

    return {
        workspaceId,
        settings: scopedSettings,
        colors: scopedColors,
        podium: scopedPodium,
        points: scopedPoints,
        gameState,
        marblesManager,
        realtime,
        tiktok
    };
}

module.exports = {
    createRuntime
};