// /src/server/game/marbles-round-manager.js

const defaultSettingsStore = require('../settings');

const GAME_STATES = {
    LOBBY: 'LOBBY',
    COUNTDOWN: 'COUNTDOWN',
    PLAYING: 'PLAYING',
    ROUND_OVER: 'ROUND_OVER'
};

class MarblesRoundManager {
    constructor(settingsStore = defaultSettingsStore) {
        this.settingsStore = settingsStore;
        this.state = GAME_STATES.LOBBY;
        
        const settings = this.settingsStore.get();
        this.timeRemaining = Number(settings.marblesRoundDuration) || 120;
        this.countdownTime = Number(settings.marblesCountdownDuration) || 5;
        
        this.queuedPlayers = new Set();
        this.interval = null;
    }

    getStateSnapshot() {
        return {
            state: this.state,
            timeRemaining: this.timeRemaining,
            countdownTime: this.countdownTime,
            queuedCount: this.queuedPlayers.size
        };
    }

    startLoop(broadcastCallback, onRoundEndCallback) {
        if (this.interval) clearInterval(this.interval);

        this.interval = setInterval(() => {
            const settings = this.settingsStore.get();

            if (this.state === GAME_STATES.COUNTDOWN) {
                this.countdownTime -= 1;
                if (this.countdownTime <= 0) {
                    this.state = GAME_STATES.PLAYING;
                    // Toma el tiempo de juego guardado en la interfaz
                    this.timeRemaining = Number(settings.marblesRoundDuration) || 120;
                }
            } else if (this.state === GAME_STATES.PLAYING) {
                this.timeRemaining -= 1;
                if (this.timeRemaining <= 0) {
                    this.state = GAME_STATES.ROUND_OVER;
                    if (typeof onRoundEndCallback === 'function') {
                        onRoundEndCallback();
                    }
                }
            }

            if (typeof broadcastCallback === 'function') {
                broadcastCallback(this.getStateSnapshot());
            }
        }, 1000);
    }

    triggerStart() {
        if (this.state === GAME_STATES.LOBBY) {
            const settings = this.settingsStore.get();
            this.state = GAME_STATES.COUNTDOWN;
            // Toma la cuenta regresiva configurada en la interfaz
            this.countdownTime = Number(settings.marblesCountdownDuration) || 5;
        }
    }

    addQueuedPlayer(playerId) {
        if (playerId) this.queuedPlayers.add(String(playerId));
    }

    resetToLobby() {
        const settings = this.settingsStore.get();
        this.state = GAME_STATES.LOBBY;
        this.timeRemaining = Number(settings.marblesRoundDuration) || 120;
        this.countdownTime = Number(settings.marblesCountdownDuration) || 5;
        this.queuedPlayers.clear();
    }
}

module.exports = {
    MarblesRoundManager,
    GAME_STATES
};