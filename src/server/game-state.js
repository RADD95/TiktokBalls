const crypto = require('crypto');
const { get } = require('./settings');
const { key } = require('./points');

const players = new Map();
const eliminatedPlayers = new Set();
const wins = new Map();
const roundParticipants = new Set();

let roundNumber = 1;
let roundStatus = 'playing';
let currentWinner = null;

const colors = [
  '#00ffff', // Cyan neón
  '#ff00ff', // Magenta neón
  '#ffff00', // Amarillo neón
  '#00ff00', // Verde neón
  '#ff8c00', // Naranja neón
  '#ff1493', // Rosa brillante
  '#00bfff', // Azul claro neón
  '#7cfc00', // Verde lima neón
  '#ffd700', // Dorado neón
  '#dc143c', // Rojo carmesí neón
  '#8a2be2', // Violeta neón
  '#00ff7f', // Verde primavera neón
  '#ff69b4', // Rosa fuerte neón
  '#40e0d0', // Turquesa neón
  '#ff4500', // Naranja rojizo neón
  '#9400d3', // Violeta oscuro neón
];

function getColor(id) {
    const hash = crypto
        .createHash('md5')
        .update(String(id))
        .digest()[0];

    return colors[hash % colors.length];
}

function calculateRadius(points, settings) {
    const baseRadius =
        Number(settings.baseRadius) || 24;

    const pointsPerRadius =
        Number(settings.pointsPerRadius) || 4;

    return Math.max(
        baseRadius,
        baseRadius +
        Math.sqrt(Math.max(0, points)) *
        pointsPerRadius
    );
}

function getMessageFromEvent(event) {
    if (event.type === 'comment') {
        return event.message || event.comment || '';
    }

    if (event.type === 'gift') {
        const giftName =
            event.giftName ||
            event.giftname ||
            'Gift';

        const repeatCount =
            Number(
                event.repeatCount ||
                event.repeatcount ||
                1
            );

        return `🎁 ${giftName} x${repeatCount}`;
    }

    return '';
}

function getDisplayName(player) {
    return (
        player.nickname ||
        player.username ||
        player.uniqueId ||
        'viewer'
    );
}

function add(event, earnedPoints) {
    if (roundStatus !== 'playing') {
        return null;
    }

    const playerId = key(event);

if (eliminatedPlayers.has(playerId)) {
    eliminatedPlayers.delete(playerId);
}

    const settings = get();

    let player = players.get(playerId);

    if (!player) {
        player = {
            id: playerId,

            username:
                event.username ||
                event.uniqueId ||
                'viewer',

            nickname:
                event.nickname ||
                event.username ||
                event.uniqueId ||
                'viewer',

            avatar: event.avatar || '',

            points: 0,

            radius:
                Number(settings.baseRadius) || 24,

            color: getColor(playerId),

            x: 0.12 + Math.random() * 0.76,
            y: 0.12 + Math.random() * 0.76,

            vx:
                (Math.random() > 0.5 ? 1 : -1) *
                (0.07 + Math.random() * 0.12),

            vy:
                (Math.random() > 0.5 ? 1 : -1) *
                (0.07 + Math.random() * 0.12),

            message: '',
            messageUpdatedAt: 0,
            lastEventType: null,
            lastGiftName: ''
        };

        players.set(playerId, player);
        roundParticipants.add(playerId);
    }

    player.points += Number(earnedPoints) || 0;

    player.username =
        event.username ||
        event.uniqueId ||
        player.username;

    player.nickname =
        event.nickname ||
        player.nickname ||
        player.username;

    if (event.avatar) {
        player.avatar = event.avatar;
    }

    const message = getMessageFromEvent(event);

    if (message) {
        player.message = message;
        player.messageUpdatedAt = Date.now();
    }

    player.lastEventType = event.type;

    if (event.type === 'gift') {
        player.lastGiftName =
            event.giftName ||
            event.giftname ||
            'Gift';
    }

const calculatedRadius =
    calculateRadius(
        player.points,
        settings
    );

const currentRadius =
    Number(player.radius) ||
    Number(settings.baseRadius) ||
    24;

player.radius =
    Math.max(
        currentRadius,
        calculatedRadius
    );

    return player;
}

function list() {
    return [...players.values()]
        .sort((a, b) => b.points - a.points);
}

function getPodium() {
    return [...wins.entries()]
        .map(([id, data]) => ({
            id,
            username: data.username,
            nickname: data.nickname,
            avatar: data.avatar,
            wins: data.wins
        }))
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 10);
}

function registerWinner(player) {
    const playerId = String(player.id);

    const previous = wins.get(playerId) || {
        username: player.username,
        nickname: player.nickname,
        avatar: player.avatar || '',
        wins: 0
    };

    previous.username = player.username;
    previous.nickname = player.nickname;
    previous.avatar =
        player.avatar || previous.avatar;

    previous.wins += 1;

    wins.set(playerId, previous);

    currentWinner = {
        id: playerId,
        username: player.username,
        nickname: getDisplayName(player),
        avatar: player.avatar || '',
        points: player.points,
        wins: previous.wins
    };

    roundStatus = 'finished';

    return currentWinner;
}

function consume(eaterId, targetId) {
    if (roundStatus !== 'playing') {
        return {
            ok: false,
            reason: 'round_finished'
        };
    }

    const eater = players.get(String(eaterId));
    const target = players.get(String(targetId));

    if (!eater || !target) {
        return {
            ok: false,
            reason: 'player_not_found'
        };
    }

    if (eater.id === target.id) {
        return {
            ok: false,
            reason: 'same_player'
        };
    }

    const eaterRadius =
        Number(eater.radius) || 24;

    const targetRadius =
        Number(target.radius) || 24;

    if (eaterRadius < targetRadius * 1.15) {
        return {
            ok: false,
            reason: 'not_large_enough'
        };
    }

    const currentRadius = eaterRadius;
    const eatenRadius = targetRadius;

    const targetPoints =
        Number(target.points) || 0;

    eater.radius = Math.sqrt(
        (currentRadius * currentRadius) +
        (eatenRadius * eatenRadius)
    );

    eater.points += targetPoints;

    eater.message =
        `💥 Comió a ${getDisplayName(target)}`;

    eater.messageUpdatedAt = Date.now();
    eater.lastEventType = 'eat';

    players.delete(target.id);
    eliminatedPlayers.add(target.id);

    let winner = null;

    if (
        players.size === 1 &&
        roundParticipants.size >= 2
    ) {
        winner = registerWinner(eater);
    }

    return {
        ok: true,

        eater: {
            ...eater
        },

        eaten: {
            id: target.id,
            username: target.username,
            nickname: target.nickname,
            points: target.points
        },

        winner,
        state: snapshot()
    };
}

function claimWinner(
    playerId,
    viewportMin,
    clientRadius
) {
    if (roundStatus !== 'playing') {
        return {
            ok: false,
            reason: 'round_finished'
        };
    }

    const player =
        players.get(String(playerId));

    if (!player) {
        return {
            ok: false,
            reason: 'player_not_found'
        };
    }

    if (roundParticipants.size < 2) {
        return {
            ok: false,
            reason: 'not_enough_players'
        };
    }

    const minDimension =
        Number(viewportMin) || 0;

    const radius =
        Number(clientRadius) ||
        Number(player.radius) ||
        24;

    if (
        minDimension <= 0 ||
        radius < minDimension * 0.42
    ) {
        return {
            ok: false,
            reason: 'not_large_enough'
        };
    }

    const winner = registerWinner(player);

    return {
        ok: true,
        winner,
        state: snapshot()
    };
}

function reset() {
    players.clear();
    eliminatedPlayers.clear();
    roundParticipants.clear();

    roundNumber += 1;
    roundStatus = 'playing';
    currentWinner = null;
}

function snapshot() {
    return {
        players: list(),

        settings: get(),

        game: {
            roundNumber,
            status: roundStatus,
            winner: currentWinner,
            podium: getPodium(),
            eliminatedPlayers: [
                ...eliminatedPlayers
            ]
        }
    };
}

module.exports = {
    add,
    list,
    consume,
    claimWinner,
    reset,
    snapshot
};